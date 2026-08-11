import React from "react";

function WarehouseAdjustModal({
  title,
  subtitle,
  summaryItems,
  controls,
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
  onAutoAdjust,
  autoAdjustLabel = "Auto Adjust",
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

      {controls}
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: controls ? 10 : 14, fontSize: 13 }}>
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

      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 8 }}>
          {onAutoAdjust && (
            <button type="button" onClick={onAutoAdjust} style={{ ...actionButton, background: "#0f766e" }}>
              {autoAdjustLabel}
            </button>
          )}
          <button type="button" onClick={onClear} style={{ ...actionButton, background: "#64748b" }}>
          Clear
          </button>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
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
    </div>
  );
}

export default React.memo(WarehouseAdjustModal);
