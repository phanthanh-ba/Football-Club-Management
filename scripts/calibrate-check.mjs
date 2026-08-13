import data from "../data/calibration-sample.json" with { type: "json" }

const POS_GROUP = { GK: "GK", CB: "DEF", LB: "DEF" }

function calcRating(stats, m) {
  const g = POS_GROUP[stats.position] ?? "MID"
  const s = stats
  const accPct =
    (s.passesAttempted ?? 0) > 0
      ? (s.passesSuccess / (s.passesAttempted ?? 0)) * 100
      : null
  const accBonus =
    accPct == null
      ? 0
      : accPct >= 85
        ? 0.2
        : accPct >= 75
          ? 0.1
          : accPct >= 60
            ? 0
            : -0.2
  const goalW = { GK: 1.4, DEF: 1.4, MID: 1.0, ATT: 0.6 }[g]
  const assistW = { GK: 1.2, DEF: 1.2, MID: 0.8, ATT: 0.55 }[g]
  const cleanSheetW = { GK: 0.5, DEF: 0.35, MID: 0.15, ATT: 0.1 }[g]
  const contrib =
    s.minutesPlayed * 0.002 +
    s.goals * goalW +
    s.assists * assistW +
    s.shotsOnTarget * 0.07 +
    s.tackles * 0.06 +
    s.interceptions * 0.06 +
    s.saves * 0.06 +
    s.passesSuccess * 0.0025 +
    (s.keyPasses ?? 0) * 0.1 +
    (s.dribbles ?? 0) * 0.1 +
    (s.clearances ?? 0) * 0.025 +
    (s.ballRecoveries ?? 0) * 0.025 +
    (s.penaltySaved ?? 0) * 1.0
  const minFactor = 0.4 + 0.6 * Math.min(1, s.minutesPlayed / 90)
  let total = 5.9 + contrib * minFactor + accBonus
  if (m.them === 0) total += cleanSheetW
  if ((g === "GK" || g === "DEF") && m.them >= 3) total -= 0.25 * (m.them - 2)
  if (m.us > m.them) total += 0.1
  if (m.us < m.them) total -= 0.15
  total -= (s.yellowCard ? 1 : 0) * 0.35
  total -= (s.redCard ? 1 : 0) * 1.2
  total -= (s.penaltyMissed ?? 0) * 0.8
  total -= (s.ownGoal ?? 0) * 2.0
  return Math.min(10, Math.max(1, Math.round(total * 10) / 10))
}

let sumErr = 0
let n = 0
for (const me of data.matches) {
  console.log(`\n=== ${me.homeTeam} ${me.homeScore}-${me.awayScore} ${me.awayTeam} ===`)
  for (const st of me.stats) {
    const pred = calcRating(st, { us: me.homeScore, them: me.awayScore })
    const ref = st.rating ?? 0
    const err = pred - ref
    sumErr += err * err
    n++
    const flag = Math.abs(err) >= 0.5 ? "  <-- bias" : ""
    console.log(
      `${st.player.padEnd(24)} pred=${pred.toFixed(1)} ref=${ref.toFixed(1)} err=${err > 0 ? "+" : ""}${err.toFixed(1)}${flag}`,
    )
  }
}
console.log(`\nMAE=${(Math.sqrt(sumErr / n)).toFixed(2)} over ${n} rows`)