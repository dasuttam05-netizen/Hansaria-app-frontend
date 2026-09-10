import React from "react";

function WarehouseTradingHeader({
  activeTab,
  activeTabStyle,
  activeVoucherStyle,
  globalSearch,
  onGlobalSearchChange,
  showMobileTradingTabs,
  onToggleTradingTabs,
  onShowVouchers,
  onShowReports,
  titleStyle,
  subtitleStyle,
  tabRow,
  tabStyle,
}) {
  return (
    <div className="warehouse-trading-main-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, marginBottom: 18, flexWrap: "wrap", position: "sticky", top: 0, zIndex: 30, background: "#fff", padding: "16px 0" }}>
      <div className="warehouse-trading-title-block">
        <h2 style={titleStyle}>Warehouse Trading</h2>
        <p style={subtitleStyle}>Manage trading vouchers and view reports</p>
      </div>
      <div className="warehouse-trading-control-block" style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <input
          className="warehouse-trading-search"
          value={globalSearch}
          onChange={(event) => onGlobalSearchChange(event.target.value)}
          placeholder="Search all tabs..."
          style={{ width: 280, padding: "10px 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 14, boxSizing: "border-box", background: "#fff" }}
        />
        <button
          type="button"
          className="mobile-section-toggle trading-tabs-toggle"
          onClick={onToggleTradingTabs}
          style={{ background: "#2563eb", color: "#fff", border: "none", padding: "10px 14px", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}
        >
          {showMobileTradingTabs ? "Hide Voucher / Report" : "Show Voucher / Report"}
        </button>
        <div className={`warehouse-trading-tabs ${showMobileTradingTabs ? "is-mobile-visible" : ""}`} style={tabRow}>
          <button onClick={onShowVouchers} style={activeTab === "vouchers" ? activeTabStyle : tabStyle}>Vouchers</button>
          <button onClick={onShowReports} style={activeTab === "reports" ? activeTabStyle : tabStyle}>Reports</button>
        </div>
      </div>
    </div>
  );
}

export default React.memo(WarehouseTradingHeader);
