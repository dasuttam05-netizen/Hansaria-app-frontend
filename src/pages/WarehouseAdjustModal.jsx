import React from "react";

function WarehouseAdjustModal({
  title,
  subtitle,
  summaryItems,
  actionButton,
  tableCard,
  reportHeaderRowStyle,
  th,
  td,
  rows,
  columns,
  emptyText,
  onClose,
  onClear,
  onConfirm,
  confirmDisabled,
}) {
  return (
    <div style={tableCard}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <div>
          <h3 style={{ margin: 0 }}>{title}</h3>
          <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>{subtitle}</div>
        </div>
        <button type="button" onClick={onClose} style={{ ...actionButton, background: "#64748b" }}>
          Close
        </button>
      </div>

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 14, fontSize: 13 }}>
        {summaryItems}
      </div>

      <div style={{ marginTop: 14, maxHeight: "55vh", overflow: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={reportHeaderRowStyle}>
              {columns.map((col) => (
                <th key={col.key} style={th}>{col.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key}>
                {columns.map((col) => (
                  <td key={col.key} style={td}>{col.render(row)}</td>
                ))}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={columns.length} style={{ ...td, textAlign: "center", padding: 20 }}>
                  {emptyText}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 14 }}>
        <button type="button" onClick={onClear} style={{ ...actionButton, background: "#64748b" }}>
          Clear
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={confirmDisabled}
          style={{
            ...actionButton,
            background: "#2563eb",
            opacity: confirmDisabled ? 0.55 : 1,
            cursor: confirmDisabled ? "not-allowed" : "pointer",
          }}
        >
          Confirm
        </button>
      </div>
    </div>
  );
}

export default React.memo(WarehouseAdjustModal);
