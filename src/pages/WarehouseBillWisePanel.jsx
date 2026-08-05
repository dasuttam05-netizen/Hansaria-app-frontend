import React from "react";

function WarehouseBillWisePanel({
  title,
  onRefresh,
  btnAction,
  tableCard,
  billWisePanelStyle,
  reportHeaderRowStyle,
  th,
  td,
  rows,
  selectedRow,
  onSelectRow,
  rowColumns,
  detailTitle,
  detailSubtitle,
  detailEmptyText,
  detailRows,
  detailRenderer,
  footerNode,
  showJourney = false,
  journeySummary = null,
  journeyRows = [],
  journeyEmptyText = "No journey entries found for this bill.",
  smartInfoBoxStyle,
  formatMoney,
  formatDecimal4,
  formatLedgerDate,
}) {
  return (
    <div style={billWisePanelStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", marginBottom: 10 }}>
        <strong>{title}</strong>
        <button type="button" onClick={onRefresh} style={{ ...btnAction, background: "#0f766e" }}>F5 Refresh</button>
      </div>
      <div style={{ ...tableCard, maxHeight: 330 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={reportHeaderRowStyle}>
              {rowColumns.map((col) => (
                <th key={col.key} style={th}>{col.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const rowKey = String(row.key);
              const isSelected = selectedRow && rowKey === String(selectedRow.key);
              return (
                <tr key={rowKey} style={{ background: isSelected ? "#e0f2fe" : "#fff" }}>
                  {rowColumns.map((col) => (
                    <td key={col.key} style={td}>
                      {col.render(row, rowKey, onSelectRow, formatMoney)}
                    </td>
                  ))}
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr><td colSpan={rowColumns.length} style={{ ...td, textAlign: "center", padding: 18 }}>{detailEmptyText}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div style={detailRenderer.paymentDetailBoxStyle}>
        <strong>{detailTitle}</strong>
        <div style={{ color: "#64748b", fontSize: 12, margin: "4px 0 8px" }}>{detailSubtitle}</div>
        {detailRows.length > 0 ? detailRows.map((detail, index) => detailRenderer.renderDetail(detail, index)) : (
          <div style={{ color: "#64748b", fontSize: 13 }}>{detailEmptyText}</div>
        )}
      </div>

      {footerNode}

      {showJourney && (
        <div style={{ ...detailRenderer.paymentDetailBoxStyle, marginTop: 12 }}>
          <strong>Journey Details</strong>
          <div style={{ color: "#64748b", fontSize: 12, margin: "4px 0 8px" }}>
            Same journey token wise full leg summary
          </div>
          {journeySummary}
          {journeyRows.length > 0 ? (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={reportHeaderRowStyle}>
                    <th style={th}>Bill No</th>
                    <th style={th}>Bill Date</th>
                    <th style={th}>Consignee</th>
                    <th style={th}>Qty</th>
                    <th style={th}>Rate</th>
                    <th style={th}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {journeyRows.map((row, index) => (
                    <tr key={`${row.voucher_no || row.sale_id || index}-${index}`} style={{ background: index % 2 ? "#f8fafc" : "#fff" }}>
                      <td style={td}>{row.voucher_no || "-"}</td>
                      <td style={td}>{formatLedgerDate(row.date || "")}</td>
                      <td style={td}>{row.consignee_name || row.party_name || row.company_name || "-"}</td>
                      <td style={td}>{formatDecimal4(row.quantity || row.total_quantity || row.unloading_qty || 0)}</td>
                      <td style={td}>{formatMoney(row.rate || 0)}</td>
                      <td style={td}>{formatMoney(row.amount || row.total_amount || row.net_receivable_amount || 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ color: "#64748b", fontSize: 13 }}>{journeyEmptyText}</div>
          )}
        </div>
      )}
    </div>
  );
}

export default React.memo(WarehouseBillWisePanel);
