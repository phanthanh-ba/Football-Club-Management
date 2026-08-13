import fs from "node:fs"

const file = "src/App.tsx"
let lines = fs.readFileSync(file, "utf8").split("\n")

// Find the count line
const countLine = lines.findIndex((l) =>
  l.includes("{fundTransactions.length} giao dịch"),
)
if (countLine < 0) {
  console.error("Could not find count line")
  process.exit(1)
}

// Insert button BEFORE the count span (before line countLine - 1 which is `<span`)
const btn = `                 <button
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
`
const insertAt = countLine - 1 // before the <span> of count
lines = [...lines.slice(0, insertAt), btn, ...lines.slice(insertAt)]

// Now find the table div (background: #111620) and insert FundTxForm before it
const tableDiv = lines.findIndex((l) => l.includes('background: "#111620"'))
if (tableDiv < 0) {
  console.error("Could not find table div")
  process.exit(1)
}

const formCall = `              {showAddTx && (
                <FundTxForm
                  txDate={txDate}
                  setTxDate={setTxDate}
                  txType={txType}
                  setTxType={setTxType}
                  txMember={txMember}
                  setTxMember={setTxMember}
                  txDesc={txDesc}
                  setTxDesc={setTxDesc}
                  txAmount={txAmount}
                  setTxAmount={setTxAmount}
                  onAdd={addTransaction}
                  onCancel={() => setShowAddTx(false)}
                />
              )}
`

lines = [...lines.slice(0, tableDiv), formCall, ...lines.slice(tableDiv)]

fs.writeFileSync(file, lines.join("\n"), "utf8")
console.log("Done. Lines:", lines.length)