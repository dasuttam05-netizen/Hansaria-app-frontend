import React from "react";

const cell = {
  padding: "8px 9px",
  borderBottom: "1px solid #e2e8f0",
  textAlign: "left",
  whiteSpace: "nowrap",
  fontSize: 12,
  verticalAlign: "middle",
};

const selectStyle = {
  minWidth: 150,
  width: "100%",
  padding: "7px 8px",
  border: "1px solid #cbd5e1",
  borderRadius: 6,
  background: "#fff",
  color: "#0f172a",
  fontSize: 12,
};

const inputStyle = {
  ...selectStyle,
  minWidth: 115,
  textAlign: "right",
};

function getId(item) {
  return String(item?.id || item?._id || "");
}

function SaleExcelImportReviewModal({
  review,
  saving,
  onChangeSaleType,
  onChangeField,
  products = [],
  farmers = [],
  consignees = [],
  companyAccounts = [],
  onConfirm,
  onClose,
}) {
  if (!review) return null;
  const rows = Array.isArray(review.preview) ? review.preview : [];
  const errors = Array.isArray(review.errors) ? review.errors : [];
  const saveErrors = Array.isArray(review.saveErrors) ? review.saveErrors : [];
  const options = review.options || {};
  const productOptions = Array.isArray(products) && products.length
    ? products
    : (Array.isArray(options.products) ? options.products : []);
  const farmerOptions = Array.isArray(farmers) ? farmers : [];
  const consigneeOptions = Array.isArray(consignees) ? consignees : [];
  const companyAccountRows = Array.isArray(companyAccounts) ? companyAccounts : [];

  const directRowsMissingFields = rows.filter((row) =>
    row.sale_type === "direct" && (
      !row.data?.farmer_id ||
      !row.data?.consignee_id ||
      !(Number(row.data?.direct_purchase_rate) > 0)
    )
  );
  const mappingRowsMissingFields = rows.filter((row) =>
    !row.data?.company_account_id || !row.data?.product_id
  );
  const allRowsReady = rows.length > 0 && rows.every((row) =>
    Boolean(row.data?.company_account_id) &&
    Boolean(row.data?.product_id) &&
    ["warehouse", "direct"].includes(row.sale_type) &&
    (row.sale_type !== "direct" || (
      Boolean(row.data?.farmer_id) &&
      Boolean(row.data?.consignee_id) &&
      Number(row.data?.direct_purchase_rate) > 0
    ))
  );
  const totalAmount = rows.reduce((sum, row) => sum + (Number(row.display?.amount) || 0), 0);
  const handleField = (rowNo, field, value) => onChangeField?.(rowNo, field, value);

  return (
    <div
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) onClose();
      }}
      style={{
        position: "fixed", inset: 0, zIndex: 1200, background: "rgba(15,23,42,.58)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 14,
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label="Review Sale Excel Import"
        style={{
          width: "min(1800px, 100%)", maxHeight: "94vh", display: "flex", flexDirection: "column",
          background: "#fff", borderRadius: 12, boxShadow: "0 24px 70px rgba(0,0,0,.28)", overflow: "hidden",
        }}
      >
        <header style={{ padding: "16px 20px", background: "#0f766e", color: "#fff", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 19 }}>Sale Excel Import — Review</h2>
            <div style={{ fontSize: 12, marginTop: 4, opacity: .92 }}>প্রতিটি Bill-এর তথ্য যাচাই করুন, Sale Type নির্বাচন করুন, তারপর Final Save করুন।</div>
          </div>
          <button type="button" onClick={onClose} disabled={saving} style={{ border: 0, borderRadius: 7, padding: "7px 11px", background: "rgba(255,255,255,.18)", color: "#fff", cursor: saving ? "not-allowed" : "pointer" }}>Close ✕</button>
        </header>

        <div style={{ padding: "12px 18px", borderBottom: "1px solid #e2e8f0", display: "flex", flexWrap: "wrap", gap: 16, color: "#334155", fontSize: 13 }}>
          <strong>Total Excel Rows: {Number(review.total) || rows.length + errors.length}</strong>
          <span style={{ color: "#047857", fontWeight: 700 }}>Valid: {rows.length}</span>
          <span style={{ color: errors.length ? "#b91c1c" : "#64748b", fontWeight: 700 }}>Errors: {errors.length}</span>
          <span style={{ fontWeight: 700 }}>Valid Amount Total: {totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>

        <div style={{ overflow: "auto", padding: 14, flex: 1, minHeight: 120 }}>
          {rows.length > 0 && (
            <>
              <div style={{ margin: "0 0 9px", fontSize: 13, color: "#334155" }}>
                Warehouse Name, Employee Name এবং Location Name Excel থেকে নেওয়া হয়েছে। Company Account/Product না মিললে এখানে বেছে নিন। Direct Loading হলে Farmer, Consignee ও Direct Purchase Rate দিন।
              </div>
              <div style={{ border: "1px solid #dbe3ea", borderRadius: 8, overflow: "auto" }}>
                <table style={{ width: "100%", minWidth: 2250, borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#e8f3f1", color: "#164e48" }}>
                      {["Excel Row", "Date / Voucher", "Warehouse", "Employee", "Location", "Buyer", "Company Account *", "Product *", "Farmer (Direct)", "Consignee (Direct)", "Qty", "Sale Amount", "Additional", "Direct Purchase Rate", "Sale Type *"].map((heading) => (
                        <th key={heading} style={{ ...cell, position: "sticky", top: 0, background: "#e8f3f1", zIndex: 1, fontWeight: 800 }}>{heading}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => {
                      const display = row.display || {};
                      const data = row.data || {};
                      const linkedAccounts = companyAccountRows
                        .filter((item) => String(item.company_id || "") === String(data.buyer_id || ""))
                        .map((item) => ({ id: getId(item), name: item.account_name || item.name || "" }));
                      const accountOptions = (Array.isArray(display.account_options) && display.account_options.length)
                        ? display.account_options
                        : linkedAccounts;
                      const chosenProduct = productOptions.find((item) => getId(item) === String(data.product_id || ""));
                      const chosenFarmer = farmerOptions.find((item) => getId(item) === String(data.farmer_id || ""));
                      const chosenConsignee = consigneeOptions.find((item) => getId(item) === String(data.consignee_id || ""));
                      return (
                        <tr key={row.row}>
                          <td style={cell}>{row.row}</td>
                          <td style={cell}>{display.date || "—"}<br /><span style={{ color: "#64748b" }}>{display.voucher_no || "Auto Voucher No"}</span></td>
                          <td style={cell}>{display.warehouse_name || "—"}</td>
                          <td style={cell}>{display.employee_name || "—"}</td>
                          <td style={cell}>{display.location_name || "—"}</td>
                          <td style={cell}>{display.buyer_name || "—"}</td>
                          <td style={{ ...cell, minWidth: 190 }}>
                            <select
                              aria-label={`Company Account for Excel row ${row.row}`}
                              value={data.company_account_id || ""}
                              onChange={(event) => handleField(row.row, "company_account_id", event.target.value)}
                              style={{ ...selectStyle, borderColor: data.company_account_id ? "#0f766e" : "#f59e0b", background: data.company_account_id ? "#f0fdfa" : "#fffbeb" }}
                            >
                              <option value="">{accountOptions.length ? "Select Account" : "No linked Account"}</option>
                              {accountOptions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                            </select>
                          </td>
                          <td style={{ ...cell, minWidth: 165 }}>
                            <select
                              aria-label={`Product for Excel row ${row.row}`}
                              value={data.product_id || ""}
                              onChange={(event) => handleField(row.row, "product_id", event.target.value)}
                              style={{ ...selectStyle, borderColor: data.product_id ? "#0f766e" : "#f59e0b", background: data.product_id ? "#f0fdfa" : "#fffbeb" }}
                            >
                              <option value="">{display.product_guess ? `Select (${display.product_guess})` : "Select Product"}</option>
                              {productOptions.map((item) => <option key={getId(item)} value={getId(item)}>{item.name || "Unnamed Product"}</option>)}
                            </select>
                            {chosenProduct && <span style={{ display: "block", color: "#64748b", fontSize: 10, marginTop: 3 }}>{chosenProduct.name}</span>}
                          </td>
                          <td style={{ ...cell, minWidth: 165 }}>
                            {row.sale_type === "direct" ? (
                              <select
                                aria-label={`Farmer for Excel row ${row.row}`}
                                value={data.farmer_id || ""}
                                onChange={(event) => handleField(row.row, "farmer_id", event.target.value)}
                                style={{ ...selectStyle, borderColor: data.farmer_id ? "#0f766e" : "#f59e0b" }}
                              >
                                <option value="">Select Farmer</option>
                                {farmerOptions.map((item) => <option key={getId(item)} value={getId(item)}>{item.name || "Unnamed Farmer"}</option>)}
                              </select>
                            ) : <span style={{ color: "#94a3b8" }}>—</span>}
                            {chosenFarmer && <span style={{ display: "block", color: "#64748b", fontSize: 10, marginTop: 3 }}>{chosenFarmer.name}</span>}
                          </td>
                          <td style={{ ...cell, minWidth: 165 }}>
                            {row.sale_type === "direct" ? (
                              <select
                                aria-label={`Consignee for Excel row ${row.row}`}
                                value={data.consignee_id || ""}
                                onChange={(event) => handleField(row.row, "consignee_id", event.target.value)}
                                style={{ ...selectStyle, borderColor: data.consignee_id ? "#0f766e" : "#f59e0b" }}
                              >
                                <option value="">Select Consignee</option>
                                {consigneeOptions.map((item) => <option key={getId(item)} value={getId(item)}>{item.name || "Unnamed Consignee"}</option>)}
                              </select>
                            ) : <span>{display.consignee_name || "—"}</span>}
                            {chosenConsignee && <span style={{ display: "block", color: "#64748b", fontSize: 10, marginTop: 3 }}>{chosenConsignee.name}</span>}
                          </td>
                          <td style={{ ...cell, textAlign: "right" }}>{Number(display.quantity || 0).toLocaleString("en-IN", { maximumFractionDigits: 4 })}</td>
                          <td style={{ ...cell, textAlign: "right" }}>{Number(display.amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          <td style={{ ...cell, textAlign: "right" }}>{Number(display.additional_amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          <td style={{ ...cell, minWidth: 145 }}>
                            {row.sale_type === "direct" ? (
                              <input
                                aria-label={`Direct Purchase Rate for Excel row ${row.row}`}
                                type="number"
                                min="0"
                                step="0.01"
                                value={data.direct_purchase_rate ?? ""}
                                onChange={(event) => handleField(row.row, "direct_purchase_rate", event.target.value)}
                                style={inputStyle}
                              />
                            ) : <span style={{ color: "#94a3b8" }}>—</span>}
                          </td>
                          <td style={{ ...cell, minWidth: 180 }}>
                            <select
                              aria-label={`Sale Type for Excel row ${row.row}`}
                              value={row.sale_type || ""}
                              onChange={(event) => onChangeSaleType(row.row, event.target.value)}
                              style={{ ...selectStyle, borderColor: row.sale_type ? "#0f766e" : "#f59e0b", background: row.sale_type ? "#f0fdfa" : "#fffbeb" }}
                            >
                              <option value="">Select Sale Type</option>
                              <option value="warehouse">Warehouse Loading</option>
                              <option value="direct">Direct Loading</option>
                            </select>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {mappingRowsMissingFields.length > 0 && (
                <div style={{ marginTop: 8, color: "#92400e", background: "#fffbeb", border: "1px solid #fcd34d", borderRadius: 7, padding: "8px 10px", fontSize: 12 }}>
                  Company Account বা Product নির্বাচন বাকি আছে: {mappingRowsMissingFields.map((row) => `#${row.row}`).join(", ")}।
                </div>
              )}
              {directRowsMissingFields.length > 0 && (
                <div style={{ marginTop: 8, color: "#92400e", background: "#fffbeb", border: "1px solid #fcd34d", borderRadius: 7, padding: "8px 10px", fontSize: 12 }}>
                  Direct Loading-এর Farmer, Consignee অথবা Direct Purchase Rate বাকি আছে: {directRowsMissingFields.map((row) => `#${row.row}`).join(", ")}।
                </div>
              )}
            </>
          )}

          {errors.length > 0 && (
            <div style={{ marginTop: 14, border: "1px solid #fecaca", background: "#fff7f7", borderRadius: 8, padding: 12 }}>
              <div style={{ color: "#991b1b", fontWeight: 800, fontSize: 13, marginBottom: 7 }}>Rows not ready — these will not be saved</div>
              <div style={{ maxHeight: 180, overflow: "auto" }}>
                {errors.map((item, index) => (
                  <div key={`${item.row}-${index}`} style={{ padding: "4px 0", color: "#7f1d1d", fontSize: 12 }}>
                    <strong>Row {item.row}:</strong> {item.error}
                  </div>
                ))}
              </div>
            </div>
          )}

          {review.saveMessage && (
            <div style={{ marginTop: 14, border: "1px solid #f59e0b", background: "#fffbeb", borderRadius: 8, padding: 12 }}>
              <div style={{ color: "#92400e", fontWeight: 800, fontSize: 13, marginBottom: 5 }}>{review.saveMessage}</div>
              {saveErrors.length > 0 && (
                <div style={{ maxHeight: 220, overflow: "auto" }}>
                  {saveErrors.map((item, index) => (
                    <div key={`save-${item.row}-${index}`} style={{ padding: "4px 0", color: "#7c2d12", fontSize: 12 }}>
                      <strong>Row {item.row}:</strong> {item.error}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {rows.length === 0 && errors.length === 0 && saveErrors.length === 0 && (
            <div style={{ color: "#64748b", textAlign: "center", padding: 28 }}>No rows found in the Excel file.</div>
          )}
        </div>

        <footer style={{ padding: "12px 18px", borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div style={{ color: "#64748b", fontSize: 12 }}>
            {rows.length ? (allRowsReady ? "সব Valid Row-এর mapping, Sale Type এবং প্রয়োজনীয় তথ্য ঠিক আছে।" : "প্রতিটি Bill-এর Account, Product ও Sale Type ঠিক করুন। Direct Loading হলে Farmer, Consignee ও Purchase Rate দিন।") : "কোনও Valid Row নেই — Excel-এর Error ঠিক করে আবার Upload করুন।"}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" onClick={onClose} disabled={saving} style={{ padding: "9px 14px", border: "1px solid #cbd5e1", borderRadius: 7, background: "#fff", color: "#334155", cursor: saving ? "not-allowed" : "pointer" }}>Cancel</button>
            <button type="button" onClick={onConfirm} disabled={!allRowsReady || saving} style={{ padding: "9px 16px", border: 0, borderRadius: 7, background: !allRowsReady || saving ? "#94a3b8" : "#0f766e", color: "#fff", fontWeight: 800, cursor: !allRowsReady || saving ? "not-allowed" : "pointer" }}>
              {saving ? "Saving Vouchers..." : `Final Save ${rows.length} Bill${rows.length === 1 ? "" : "s"}`}
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}

export default React.memo(SaleExcelImportReviewModal);
