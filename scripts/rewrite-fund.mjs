import fs from "node:fs"

const file = "src/App.tsx"
const lines = fs.readFileSync(file, "utf8").split("\n")

const fundStart = lines.findIndex((l) => l.includes('activeTab === "fund"'))
// Find the closing `)}` of the fund tab — the line before the thongke comment
const thongkeComment = lines.findIndex((l) =>
  l.includes("THONGKE TAB") || l.includes("thongke"),
)
// fund tab ends a few lines before thongkeComment
let fundEnd = thongkeComment - 1
while (fundEnd > fundStart && lines[fundEnd].trim() === "") fundEnd--
console.log("Fund tab lines:", fundStart + 1, "-", fundEnd + 1)

const newFundTab = `        {activeTab === "fund" && (
          <div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "12px",
                marginBottom: "28px",
              }}
            >
              {[
                {
                  label: "Tổng thu",
                  value: formatCurrency(totalIn),
                  color: "#a3e635",
                  icon: "↑",
                },
                {
                  label: "Tổng chi",
                  value: formatCurrency(totalOut),
                  color: "#f87171",
                  icon: "↓",
                },
                {
                  label: "Số dư hiện tại",
                  value: formatCurrency(balance),
                  color: balance >= TEAM_FUND ? "#a3e635" : "#f87171",
                  icon: "=",
                },
              ].map((item) => (
                <div
                  key={item.label}
                  style={{
                    background: "#111620",
                    border: "1px solid #1f2a3c",
                    borderRadius: "8px",
                    padding: "18px 20px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      marginBottom: "8px",
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontWeight: 500,
                        fontSize: "16px",
                        color: item.color,
                      }}
                    >
                      {item.icon}
                    </span>
                    <span
                      style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: "10px",
                        color: "#6b7fa0",
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                      }}
                    >
                      {item.label}
                    </span>
                  </div>
                  <div
                    style={{
                      fontFamily: "'Barlow Condensed', sans-serif",
                      fontWeight: 800,
                      fontSize: "24px",
                      color: item.color,
                    }}
                  >
                    {item.value}
                  </div>
                </div>
              ))}
            </div>

            {showAddTx && (
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

            <div
              style={{
                background: "#111620",
                border: "1px solid #1f2a3c",
                borderRadius: "8px",
                overflow: "hidden",
              }}
            >
              <div
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
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#0d1119" }}>
                      {["Ngày", "Loại", "Mô tả", "Thành viên", "Số tiền", ""].map(
                        (h) => (
                          <th
                            key={h}
                            style={{
                              padding: "10px 16px",
                              fontFamily: "'JetBrains Mono', monospace",
                              fontSize: "10px",
                              color: "#6b7fa0",
                              letterSpacing: "0.1em",
                              textTransform: "uppercase",
                              textAlign: h === "Số tiền" ? "right" : "left",
                              fontWeight: 500,
                              whiteSpace: "nowrap",
                              borderBottom: "1px solid #1f2a3c",
                            }}
                          >
                            {h}
                          </th>
                        ),
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {fundTransactions
                      .slice()
                      .sort((a, b) => b.id - a.id)
                      .map((tx, i) => (
                        <tr
                          key={tx.id}
                          style={{
                            borderBottom:
                              i < fundTransactions.length - 1
                                ? "1px solid #161c2a"
                                : "none",
                          }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.background = "#161c2a")
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.background = "transparent")
                          }
                        >
                          <td
                            style={{
                              padding: "11px 16px",
                              fontFamily: "'JetBrains Mono', monospace",
                              fontSize: "11px",
                              color: "#6b7fa0",
                            }}
                          >
                            {tx.date}
                          </td>
                          <td
                            style={{
                              padding: "11px 16px",
                              fontFamily: "'JetBrains Mono', monospace",
                              fontSize: "10px",
                              fontWeight: 600,
                              color: tx.type === "in" ? "#a3e635" : "#f87171",
                              letterSpacing: "0.08em",
                              textTransform: "uppercase",
                            }}
                          >
                            {tx.type === "in" ? "Thu" : "Chi"}
                          </td>
                          <td
                            style={{
                              padding: "11px 16px",
                              fontFamily: "'Inter', sans-serif",
                              fontSize: "13px",
                              color: "#cbd5e1",
                            }}
                          >
                            {tx.desc}
                          </td>
                          <td
                            style={{
                              padding: "11px 16px",
                              fontFamily: "'Inter', sans-serif",
                              fontSize: "12px",
                              color: tx.member ? "#94a3b8" : "#3a4a62",
                            }}
                          >
                            {tx.member || "—"}
                          </td>
                          <td
                            style={{
                              padding: "11px 16px",
                              textAlign: "right",
                              fontFamily: "'Barlow Condensed', sans-serif",
                              fontWeight: 700,
                              fontSize: "14px",
                              color: tx.type === "in" ? "#a3e635" : "#f87171",
                            }}
                          >
                            {tx.type === "in" ? "+" : ""}
                            {formatCurrency(tx.amount)}
                          </td>
                          <td
                            style={{
                              padding: "11px 16px",
                              textAlign: "center",
                            }}
                          >
                            <button
                              onClick={() => removeTransaction(tx.id)}
                              title="Xóa"
                              style={{
                                background: "transparent",
                                border: "1px solid #2a3a52",
                                borderRadius: "4px",
                                padding: "3px 8px",
                                fontFamily: "'JetBrains Mono', monospace",
                                fontSize: "10px",
                                color: "#f87171",
                                cursor: "pointer",
                              }}
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
`

const before = lines.slice(0, fundStart)
const after = lines.slice(fundEnd + 1)
fs.writeFileSync(file, [...before, newFundTab, ...after].join("\n"), "utf8")
console.log("Fund tab rewritten. Total lines:", [...before, newFundTab, ...after].length)