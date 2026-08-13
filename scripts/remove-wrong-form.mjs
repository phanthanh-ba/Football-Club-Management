import fs from "node:fs"

const file = "src/App.tsx"
const lines = fs.readFileSync(file, "utf8").split("\n")

// Remove lines 2466-2481 (0-indexed: 2465-2480) — the wrongly placed form
const before = lines.slice(0, 2465)
const after = lines.slice(2481)
fs.writeFileSync(file, [...before, ...after].join("\n"), "utf8")
console.log("Removed wrong form block. Lines:", [...before, ...after].length)