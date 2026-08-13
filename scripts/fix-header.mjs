import fs from "node:fs"

const file = "src/App.tsx"
let lines = fs.readFileSync(file, "utf8").split("\n")

// Find the corrupted header block in fund tab:
// Starts at `justifyContent: "space-between"` (the header div) and ends at the first `</div>` after the count span
const headerStart = lines.findIndex(
  (l, i) =>
    l.trim() === "justifyContent: " && lines[i]?.includes("space-between"),
)
// Actually find by "Lịch sử giao dịch" then go up to the wrapping div
const titleLine = lines.findIndex((l) => l.includes("Lịch sử giao dịch"))
// The header div starts a few lines before titleLine
let divStart = -1
for (let i = titleLine; i >= titleLine - 8; i--) {
  if (lines[i].trim() === ">") {
    divStart = i
    break
  }
}
console.log("titleLine", titleLine + 1, "divStart", divStart + 1)

// Find the end: the `</div>` that closes the header (first </div> after the count span's </span>)
// The count span contains "{fundTransactions.length} giao dịch"
let countLine = -1
for (let i = divStart; i < divStart + 60; i++) {
  if (lines[i].includes("{fundTransactions.length} giao dịch")) {
    countLine = i
    break
  }
}
// After countLine: </span> then </div>
let divEnd = -1
for (let i = countLine; i < countLine + 8; i++) {
  if (lines[i].trim() === "</div>") {
    divEnd = i
    break
  }
}
console.log("countLine", countLine + 1, "divEnd", divEnd + 1)

const newHeader = `              <div
                style={{
                  padding: "14px 20px",
                  borderBottom: "1px solid #1f2a3c",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span
                  style={{
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontWeight: 700,
                    fontSize: "16px",
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color: "#e2e8f0",
                  }}
                >
                  Lịch sử giao dịch
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <button
                    onClick={() => setShowAddTx((v) => !v)}
                    style={{
                      background: showAddTx ? "#f87171" : "#a3e635",
                      border: "none",
                      borderRadius: "5px",
                      padding: "6px 14px",
                      fontFamily: "'Barlow Condensed', sans-serif",
                      fontWeight: 700,
                      fontSize: "12px",
                      letterSpacing: "0.06em",
                      color: showAddTx ? "#fff" : "#0b0e14",
                      cursor: "pointer",
                    }}
                  >
                    {showAddTx ? "Đóng" : "+ Giao dịch"}
                  </button>
                  <span
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: "10px",
                      color: "#6b7fa0",
                    }}
                  >
                    {fundTransactions.length} giao dịch
                  </span>
                </div>
              </div>
`

const before = lines.slice(0, divStart)
const after = lines.slice(divEnd + 1)
fs.writeFileSync(file, [...before, newHeader, ...after].join("\n"), "utf8")
console.log("Fixed header. Lines:", [...before, newHeader, ...after].length)