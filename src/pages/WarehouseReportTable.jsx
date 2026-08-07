import React from "react";

function WarehouseReportTable({
  activeReport,
  activeReportColumns,
  filteredReportData,
  tableCard,
  reportHeaderRowStyle,
  th,
  td,
  onSaleRowClick,
}) {
  const isLedgerReport =
    activeReport === "purchase-party-ledger" ||
    activeReport === "sale-party-ledger" ||
    activeReport === "sale-followup" ||
    activeReport === "sale-journey";

  const isClickableSaleTable = activeReport === "sale";
  const isPurchaseOrSaleTable = activeReport === "purchase" || activeReport === "sale";
  const tableClassName = activeReport === "purchase" || activeReport === "sale" ? "purchase-mobile-table-source" : "";

  if (isLedgerReport) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div className={activeReport === "purchase-party-ledger" || activeReport === "sale-party-ledger" ? "purchase-mobile-table-source" : ""} style={tableCard}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={reportHeaderRowStyle}>
                {activeReportColumns.map(([key, label]) => (
                  <th key={key} style={th}>{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredReportData.map((item, i) => {
                const statusKey = String(item.followup_status || "").toLowerCase();
                const followupBg =
                  activeReport === "sale-followup"
                    ? (statusKey === "payment_done" ? "#ecfdf5" : statusKey === "unloading_pending" ? "#fffbeb" : statusKey === "overdue" ? "#fef2f2" : "#eff6ff")
                    : null;
                return (
                  <tr
                    key={item.id || `${item.voucher_type || item.row_type}-${item.voucher_no || i}-${i}`}
                    style={{
                      background: item.row_type === "closing" ? "#eef6ff" : followupBg || (i % 2 ? "#f8fafc" : "#fff"),
                      fontWeight: item.row_type === "closing" ? 700 : 400,
                    }}
                  >
                    {activeReportColumns.map(([key, _label, render]) => (
                      <td key={key} style={td}>{render(item, i)}</td>
                    ))}
                  </tr>
                );
              })}
              {filteredReportData.length === 0 && (
                <tr><td colSpan={activeReportColumns.length} style={{ ...td, textAlign: "center", padding: 20 }}>No data available.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  const isReportTable = !isLedgerReport;

  if (isPurchaseOrSaleTable || isReportTable) {
    return (
      <div>
        <div className={tableClassName} style={tableCard}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={reportHeaderRowStyle}>
                {activeReportColumns.map(([key, label]) => (
                  <th key={key} style={th}>{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredReportData.map((item, i) => (
                <tr
                  key={item.id || item._id || i}
                  style={{ background: i % 2 ? "#f8fafc" : "#fff", cursor: activeReport === "sale" ? "pointer" : "default" }}
                  onClick={activeReport === "sale" ? () => onSaleRowClick?.(item) : undefined}
                >
                  {activeReportColumns.map(([key, _label, render]) => (
                    <td key={key} style={td}>{render(item, i)}</td>
                  ))}
                </tr>
              ))}
              {filteredReportData.length === 0 && (
                <tr><td colSpan={activeReportColumns.length} style={{ ...td, textAlign: "center", padding: 20 }}>No data available.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return null;
}

export default React.memo(WarehouseReportTable);
