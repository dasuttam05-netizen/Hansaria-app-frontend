import React from "react";

function WarehouseVoucherTable({
  activeVoucherType,
  filteredVoucherList,
  th,
  td,
  reportHeaderRowStyle,
  getWarehouseName,
  getAccountName,
  getFarmerName,
  getBuyerName,
  getProductName,
  formatLedgerDate,
  formatDecimal4,
  formatMoney,
  consignees,
  companies,
  selectedPaymentId,
  onEditVoucher,
  onDeleteVoucher,
  onSelectPayment,
  onGeneratePDF,
}) {
  return (
    <div className={activeVoucherType === "purchase" || activeVoucherType === "sale" ? "purchase-mobile-table-source" : ""} style={{ overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: 10, background: "#fff" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={reportHeaderRowStyle}>
            <th style={th}>S.L No</th>
            <th style={th}>Date</th>
            <th style={th}>Voucher No</th>
            {activeVoucherType === "sale" && <th style={th}>P.O No</th>}
            {activeVoucherType === "sale" && <th style={th}>Due Date</th>}
            <th style={th}>Warehouse</th>
            <th style={th}>Account</th>
            {(activeVoucherType === "purchase" || activeVoucherType === "payment") && <th style={th}>Farmer</th>}
            {(activeVoucherType === "sale" || activeVoucherType === "receipt") && <th style={th}>{activeVoucherType === "sale" ? "Buyer" : "Company"}</th>}
            {activeVoucherType === "sale" && <th style={th}>Consignee</th>}
            {activeVoucherType === "sale" && <th style={th}>Against Purchase</th>}
            {(activeVoucherType === "purchase" || activeVoucherType === "sale") && <th style={th}>Product</th>}
            {(activeVoucherType === "purchase" || activeVoucherType === "sale") && <th style={th}>{activeVoucherType === "sale" ? "Dispatch Qty" : "Qty"}</th>}
            {activeVoucherType === "sale" && <th style={th}>Un. Date</th>}
            {activeVoucherType === "sale" && <th style={th}>U. Qty</th>}
            {(activeVoucherType === "purchase" || activeVoucherType === "sale") && <th style={th}>Rate</th>}
            <th style={th}>Amount</th>
            {activeVoucherType === "sale" && <th style={th}>Shortage Amount</th>}
            {activeVoucherType === "sale" && <th style={th}>Total Deduction</th>}
            {activeVoucherType === "sale" && <th style={th}>N. Receivable</th>}
            <th style={th}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredVoucherList.map((item, i) => {
            const isSelectedRow = activeVoucherType === "payment" && String(item.id || item._id) === String(selectedPaymentId);
            const saleShortageValue = Number(item.claim_amount || 0);
            const saleTotalDeductionValue = saleShortageValue + Number(item.other_deduction || 0) + Number(item.cd_amount || 0) + Number(item.adjustment_amount || 0) + Number(item.tds_amount || 0);
            return (
              <tr key={item.id || i} style={{ background: isSelectedRow ? "#e0f2fe" : i % 2 ? "#f8fafc" : "#fff" }}>
                <td style={td}>{i + 1}</td>
                <td style={td}>{item.date}</td>
                <td style={td}>{item.voucher_no}</td>
                {activeVoucherType === "sale" && <td style={td}>{item.po_no || "-"}</td>}
                {activeVoucherType === "sale" && <td style={td}>{formatLedgerDate(item.due_date)}</td>}
                <td style={td}>{getWarehouseName(item)}</td>
                <td style={td}>{getAccountName(item)}</td>
                {(activeVoucherType === "purchase" || activeVoucherType === "payment") && <td style={td}>{getFarmerName(item)}</td>}
                {(activeVoucherType === "sale" || activeVoucherType === "receipt") && <td style={td}>{activeVoucherType === "sale" ? getBuyerName(item) : (companies.find((c) => String(c.id || c._id) === String(item.company_id))?.name || "-")}</td>}
                {activeVoucherType === "sale" && <td style={td}>{item.consignee_name || consignees.find((c) => String(c.id || c._id) === String(item.consignee_id))?.name || "-"}</td>}
                {activeVoucherType === "sale" && <td style={td}>{item.against_purchase_enabled ? `${item.against_purchase_links?.length || 0} bill` : "-"}</td>}
                {(activeVoucherType === "purchase" || activeVoucherType === "sale") && (
                  <>
                    <td style={td}>{getProductName(item)}</td>
                    <td style={td}>{formatDecimal4(activeVoucherType === "purchase" ? item.total_qty || item.net_weight || item.quantity || 0 : item.quantity || item.total_quantity || 0)}</td>
                    {activeVoucherType === "sale" && <td style={td}>{formatLedgerDate(item.unloading_date)}</td>}
                    {activeVoucherType === "sale" && <td style={td}>{formatDecimal4(item.unloading_qty || 0)}</td>}
                    <td style={td}>{item.rate || 0}</td>
                  </>
                )}
                <td style={td}>{formatMoney(activeVoucherType === "purchase" ? item.net_amount_payable || item.amount || 0 : item.amount || item.total_amount || 0)}</td>
                {activeVoucherType === "sale" && <td style={td}>{formatMoney(saleShortageValue)}</td>}
                {activeVoucherType === "sale" && <td style={td}>{formatMoney(saleTotalDeductionValue)}</td>}
                {activeVoucherType === "sale" && <td style={td}>{formatMoney(item.net_receivable_amount || item.net_amount || item.amount || 0)}</td>}
                <td style={td}>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <button onClick={() => onEditVoucher(item.id || item._id)} style={{ background: "#2563eb", color: "#fff", border: "none", padding: "6px 10px", borderRadius: 4, cursor: "pointer", fontWeight: 500, fontSize: 12 }} title="Edit">Edit</button>
                    <button onClick={() => onDeleteVoucher(item.id || item._id)} style={{ background: "#dc2626", color: "#fff", border: "none", padding: "6px 10px", borderRadius: 4, cursor: "pointer", fontWeight: 500, fontSize: 12 }} title="Delete">Delete</button>
                    {activeVoucherType === "payment" && (
                      <button type="button" onClick={() => onSelectPayment(item.id || item._id)} style={{ background: "#2563eb", color: "#fff", border: "none", padding: "6px 10px", borderRadius: 4, cursor: "pointer", fontWeight: 500, fontSize: 12 }} title="Show Details">
                        {isSelectedRow ? "Selected" : "Details"}
                      </button>
                    )}
                    {activeVoucherType === "sale" && (
                      <button onClick={() => onGeneratePDF(item.id || item._id)} style={{ background: "#ea580c", color: "#fff", border: "none", padding: "6px 10px", borderRadius: 4, cursor: "pointer", fontWeight: 500, fontSize: 12 }} title="Download PDF">PDF</button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default React.memo(WarehouseVoucherTable);
