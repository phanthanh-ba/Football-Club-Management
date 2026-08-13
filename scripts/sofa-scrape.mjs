#!/usr/bin/env node
// Scrape real match player stats from SofaScore for calibrating the rating formula.
// Usage: node scripts/sofa-scrape.mjs <eventId> [<eventId> ...]
// Output: data/sofascore-<eventId>.json (one normalized stat row per player)

const BASE = "https://www.sofascore.com/api/v1"

const POS_MAP = {
  G: "GK",
  D: "DEF",
  M: "MID",
  F: "ATT",
}

function playerPos(p) {
  const row = p.player?.position || ""
  return POS_MAP[row] ?? POS_MAP[row[0]] ?? "MID"
}

async function getJson(url) {
  const res = await fetch(url, {
    headers: {
      accept: "application/json",
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
  return res.json()
}

function normalize(ev, stats) {
  return {
    eventId: ev.id,
    homeTeam: ev.homeTeam?.name,
    awayTeam: ev.awayTeam?.name,
    homeScore: ev.homeScore?.current ?? 0,
    awayScore: ev.awayScore?.current ?? 0,
    stats: stats.map((s) => {
      const st = s.statistics ?? {}
      const acc =
        st.passesTotal > 0 ? Math.round((st.passesAccurate / st.passesTotal) * 100) : 0
      return {
        player: s.player?.name ?? "?",
        position: playerPos(s),
        minutesPlayed: st.minutesPlayed ?? 0,
        rating: st.rating ?? null,
        goals: st.goals ?? 0,
        assists: st.assists ?? 0,
        passesSuccess: st.passesAccurate ?? 0,
        passesAttempted: st.passesTotal ?? 0,
        passAccPct: acc,
        tackles: st.tackleWon ?? 0,
        interceptions: st.interceptions ?? 0,
        shotsOnTarget: st.shotsOnTarget ?? 0,
        keyPasses: st.keyPasses ?? 0,
        dribbles: st.dribbleSucc ?? 0,
        clearances: st.clearances ?? 0,
        ballRecoveries: st.ballRecoveries ?? 0,
        saves: st.saves ?? 0,
        penaltySaved: st.penaltySave ?? 0,
        penaltyMissed: st.penaltyMiss ?? 0,
        ownGoal: st.ownGoal ?? 0,
        yellowCard: !!st.yellowCards,
        redCard: !!st.redCards,
      }
    }),
  }
}

async function scrape(id) {
  const ev = await getJson(`${BASE}/event/${id}`).then((j) => j.event)
  const agg = await getJson(`${BASE}/event/${id}/player-statistics/aggregate`)
  const rows = [...(agg.statistics ?? [])]
    .sort((a, b) => (b.statistics?.rating ?? 0) - (a.statistics?.rating ?? 0))
  const data = normalize(ev, rows)

  const { mkdir, writeFile } = await import("node:fs/promises")
  await mkdir("data", { recursive: true })
  const file = `data/sofascore-${id}.json`
  await writeFile(file, JSON.stringify(data, null, 2))

  console.log(`${ev.homeTeam?.name} ${data.homeScore}-${data.awayScore} ${ev.awayTeam?.name} | ${rows.length} players`)
  for (const r of rows) {
    const st = r.statistics ?? {}
    console.log(
      `  ${String((st.rating ?? 0).toFixed(1)).padStart(4)}  ${(r.player?.name ?? "?").padEnd(28)} ${playerPos(r).padStart(3)}  ` +
        `G${st.goals ?? 0} A${st.assists ?? 0} KP${st.keyPasses ?? 0} D${st.dribbleSucc ?? 0} T${st.tackleWon ?? 0} ` +
        `CL${st.clearances ?? 0} RC${st.ballRecoveries ?? 0} Acc${st.passesTotal ? Math.round((st.passesAccurate / st.passesTotal) * 100) : 0}%`,
    )
  }
  return file
}

const ids = process.argv.slice(2).map(Number).filter(Boolean)
if (ids.length === 0) {
  console.error("Usage: node scripts/sofa-scrape.mjs <eventId> [<eventId> ...]")
  process.exit(1)
}
const files = []
for (const id of ids) {
  try {
    files.push(await scrape(id))
  } catch (e) {
    console.error(`event ${id} failed: ${e.message}`)
  }
}
console.log("\nSaved:", files.join(", "))