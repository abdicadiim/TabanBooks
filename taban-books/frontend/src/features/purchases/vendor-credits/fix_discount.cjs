const fs = require('fs');

const path = 'c:/Users/Taban-pc/Downloads/TabanBooks/taban-books/frontend/src/features/purchases/vendor-credits/NewVendorCredit.tsx';
let content = fs.readFileSync(path, 'utf8');
const lines = content.split('\n');

const correctCode = `                    {!showTransactionDiscount && (
                      <td style={{ ...styles.tableCell, width: "12%", verticalAlign: "top" }}>
                        <div style={{ display: "flex", alignItems: "center" }}>
                          <input
                            style={{ width: "100%", border: "none", backgroundColor: "transparent", textAlign: "right", fontSize: "13px", color: "#111827", outline: "none", padding: "8px 0", borderRadius: "4px 0 0 4px", boxSizing: "border-box" }}
                            value={item.discount?.replace(/[^\\d.]/g, '') || "0"}
                            onChange={(e) => {
                              const val = e.target.value;
                              const type = item.discount?.includes("%") ? "%" : formData.currency;
                              handleItemChange(index, "discount", \`\${val} \${type}\`);
                            }}
                          />
                          <div 
                            style={{ height: "36px", padding: "0 8px", border: "1px solid #d1d5db", borderRadius: "0 4px 4px 0", backgroundColor: "#f9fafb", fontSize: "13px", cursor: "pointer", display: "flex", alignItems: "center", gap: "2px", boxSizing: "border-box" }}
                            onClick={() => {
                              const currentType = item.discount?.includes("%") ? "%" : formData.currency;
                              const val = item.discount?.replace(/[^\\d.]/g, '') || "0";
                              const nextType = currentType === "%" ? formData.currency : "%";
                              handleItemChange(index, "discount", \`\${val} \${nextType}\`);
                            }}
                          >
                            {item.discount?.includes("%") ? "%" : formData.currency}
                            <ChevronDown size={12} />
                          </div>
                        </div>
                      </td>
                    )}`;

lines.splice(2101, 10, ...correctCode.split('\n'));
fs.writeFileSync(path, lines.join('\n'));
