import fs from "node:fs"

const data = JSON.parse(
  fs.readFileSync("data/calibration-sample.json", "utf8"),
)

const POS_GROUP = { GK: "GK", CB: "DEF", LB: "DEF" }

function calc(stats, m, t) {
  const g = POS_GROUP[stats.position] ?? "MID"
  const s = stats
  const acc =
    (s.passesAttempted ?? 0) > 0
      ? (s.passesSuccess / (s.passesAttempted ?? 0)) * 100
      : null
  const ab =
    acc == null ? 0 : acc >= 85 ? 0.2 : acc >= 75 ? 0.1 : acc >= 60 ? 0 : -0.2
  const contrib =
    s.minutesPlayed * t.min +
    s.goals * t.goalW[g] +
    s.assists * t.assistW[g] +
    s.shotsOnTarget * t.soT +
    s.tackles * t.x +
    s.interceptions * t.x +
    s.saves * t.x +
    s.passesSuccess * t.pass +
    (s.keyPasses ?? 0) * t.kp +
    (s.dribbles ?? 0) * t.dr +
    (s.clearances ?? 0) * t.cl +
    (s.ballRecoveries ?? 0) * t.cl +
    (s.penaltySaved ?? 0) * t.ps
  const mf = 0.4 + 0.6 * Math.min(1, s.minutesPlayed / 90)
  let total = t.base + contrib * mf + ab
  if (m.them === 0) total += t.cleanSheetW[g]
  if ((g === "GK" || g === "DEF") && m.them >= 3)
    total -= t.blow * (m.them - 2)
  total += m.us > m.them ? t.win : m.us < m.them ? -t.lose : 0
  total -= (s.yellowCard ? 1 : 0) * t.yel
  total -= (s.redCard ? 1 : 0) * t.red
  total -= (s.penaltyMissed ?? 0) * t.pm
  total -= (s.ownGoal ?? 0) * t.og
  return Math.min(10, Math.max(1, Math.round(total * 10) / 10))
}

function mae(t) {
  let se = 0
  let n = 0
  for (const me of data.matches) {
    for (const st of me.stats) {
      const p = calc(st, { us: me.homeScore, them: me.awayScore }, t)
      const e = p - (st.rating ?? 0)
      se += e * e
      n++
    }
  }
  return { mae: Math.sqrt(se / n), raw: se / n }
}

const base = {
  base: 6.4,
  min: 0.0025,
  goalW: { GK: 1.6, DEF: 1.6, MID: 1.2, ATT: 0.8 },
  assistW: { GK: 1.4, DEF: 1.4, MID: 1.0, ATT: 0.7 },
  cleanSheetW: { GK: 0.7, DEF: 0.5, MID: 0.25, ATT: 0.15 },
  soT: 0.08,
  x: 0.08,
  pass: 0.003,
  kp: 0.12,
  dr: 0.12,
  cl: 0.03,
  ps: 1.2,
  blow: 0.3,
  win: 0.15,
  lose: 0.15,
  yel: 0.4,
  red: 1.3,
  pm: 1.0,
  og: 2.5,
}

const variants = [
  { name: "current", t: base },
  {
    name: "base6.0",
    t: { ...base, base: 6.0 },
  },
  {
    name: "base6.0-lite",
    t: {
      ...base,
      base: 6.0,
      min: 0.002,
      goalW: { GK: 1.5, DEF: 1.5, MID: 1.1, ATT: 0.7 },
      assistW: { GK: 1.3, DEF: 1.3, MID: 0.9, ATT: 0.6 },
      cleanSheetW: { GK: 0.6, DEF: 0.4, MID: 0.2, ATT: 0.1 },
      soT: 0.07,
      x: 0.07,
      pass: 0.0025,
      kp: 0.1,
      dr: 0.1,
      cl: 0.025,
      ps: 1.0,
      blow: 0.25,
      win: 0.1,
      lose: 0.15,
      yel: 0.35,
      red: 1.2,
      pm: 0.8,
      og: 2.0,
    },
  },
  {
    name: "base6.0-lite2",
    t: {
      ...base,
      base: 6.0,
      min: 0.002,
      goalW: { GK: 1.4, DEF: 1.4, MID: 1.0, ATT: 0.6 },
      assistW: { GK: 1.2, DEF: 1.2, MID: 0.8, ATT: 0.55 },
      cleanSheetW: { GK: 0.5, DEF: 0.35, MID: 0.15, ATT: 0.1 },
      soT: 0.07,
      x: 0.06,
      pass: 0.0025,
      kp: 0.1,
      dr: 0.1,
      cl: 0.025,
      ps: 1.0,
      blow: 0.25,
      win: 0.1,
      lose: 0.15,
      yel: 0.35,
      red: 1.2,
      pm: 0.8,
      og: 2.0,
    },
  },
  {
    name: "base5.9-lite2",
    t: {
      ...base,
      base: 5.9,
      min: 0.002,
      goalW: { GK: 1.4, DEF: 1.4, MID: 1.0, ATT: 0.6 },
      assistW: { GK: 1.2, DEF: 1.2, MID: 0.8, ATT: 0.55 },
      cleanSheetW: { GK: 0.5, DEF: 0.35, MID: 0.15, ATT: 0.1 },
      soT: 0.07,
      x: 0.06,
      pass: 0.0025,
      kp: 0.1,
      dr: 0.1,
      cl: 0.025,
      ps: 1.0,
      blow: 0.25,
      win: 0.1,
      lose: 0.15,
      yel: 0.35,
      red: 1.2,
      pm: 0.8,
      og: 2.0,
    },
  },
]

for (const v of variants) {
  const r = mae(v.t)
  console.log(`${v.name.padEnd(16)} MAE=${r.mae.toFixed(3)}`)
}