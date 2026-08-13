import fs from "node:fs"

const file = "src/App.tsx"
let lines = fs.readFileSync(file, "utf8").split("\n")

// 1. Remove wrongly-inserted form block (the {showAddTx && (...)} that appears before a `background: "#111620"` line)
// Find it: a line containing "showAddTx &&" followed by FundTxForm
let wrongStart = -1
let wrongEnd = -1
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("showAddTx &&") && lines[i].includes("(")) {
    // Check if next line has FundTxForm
    if (lines[i + 1]?.includes("FundTxForm")) {
      // Find the closing `)}` of this block
      for (let j = i; j < i + 3; j++) {
        if (lines[j].trim() === ")}") {
          wrongStart = i
          wrongEnd = j
          break
        }
      }
      break
    }
  }
}
if (wrongStart >= 0 && wrongEnd >= 0) {
  console.log("Removing wrong form block at lines", wrongStart + 1, "-", wrongEnd + 1)
  lines = [...lines.slice(0, wrongStart), ...lines.slice(wrongEnd + 1)]
} else {
  console.log("No wrong block found, continuing...")
}

// 2. Find the fund tab table div: in the fund tab, the transactions table has `background: "#111620"` right after the header div containing "Lịch sử giao dịch"
// Strategy: find the count line `{fundTransactions.length} giao dịch` — the table div is a few lines after the `</div>` that closes the header
const countLine = lines.findIndex((l) =>
  l.includes("{fundTransactions.length} giao dịch"),
)
if (countLine < 0) {
  console.error("Could not find count line")
  process.exit(1)
}

// After countLine there is `</span>` then `</div>` (header close) then `<div style={{ overflowX` ... then the table wrapper div with background #111620
// Find the `</div>` right after countLine (the header close)
let headerClose = -1
for (let i = countLine; i < countLine + 6; i++) {
  if (lines[i].trim() === "</div>") {
    headerClose = i
    break
  }
}
// Next non-empty line should be the table wrapper div
let tableWrapper = -1
for (let i = headerClose + 1; i < headerClose + 4; i++) {
  if (lines[i].trim().startsWith("<div")) {
    tableWrapper = i
    break
  }
}
console.log("Inserting form before line", tableWrapper + 1)

const formCall = `            {showAddTx && (
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

lines = [...lines.slice(0, tableWrapper), formCall, ...lines.slice(tableWrapper)]

fs.writeFileSync(file, lines.join("\n"), "utf8")
console.log("Done. Total lines:", lines.length)