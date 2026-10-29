import React from "react";

export default function WarehouseTradingHeader({
  activeTab,
  activeTabStyle,
  globalSearch,
  onGlobalSearchChange,
  showMobileTradingTabs,
  onToggleTradingTabs,
  onShowVouchers,
  onShowReports,
  subtitleStyle,
  tabRow,
  tabStyle,
  titleStyle,
}) {
  return (
    <header className="warehouse-trading-main-header" style={headerStyle}>
      <div className="warehouse-trading-title-block" style={titleBlockStyle}>
        <h1 style={titleStyle}>Warehouse Trading</h1>
        <p style={subtitleStyle}>Purchase, sale, payment, receipt and reports</p>
      </div>

      <div className="warehouse-trading-control-block" style={controlBlockStyle}>
        <input
          className="warehouse-trading-search"
          type="search"
          value={globalSearch}
          onChange={(event) => onGlobalSearchChange(event.target.value)}
          placeholder="Search vouchers and reports"
          aria-label="Search vouchers and reports"
        />
        <button
          type="button"
          className="trading-tabs-toggle"
          style={toggleStyle}
          onClick={onToggleTradingTabs}
          aria-expanded={Boolean(showMobileTradingTabs)}
        >
          {showMobileTradingTabs ? "Hide sections" : "Show sections"}
        </button>
        <nav
          className={`warehouse-trading-tabs${showMobileTradingTabs ? " is-mobile-visible" : ""}`}
          style={tabRow}
          aria-label="Warehouse Trading sections"
        >
          <button type="button" style={activeTab === "vouchers" ? activeTabStyle : tabStyle} onClick={onShowVouchers}>
            Vouchers
          </button>
          <button type="button" style={activeTab === "reports" ? activeTabStyle : tabStyle} onClick={onShowReports}>
            Reports
          </button>
        </nav>
      </div>
    </header>
  );
}

const headerStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 18,
  flexWrap: "wrap",
  marginBottom: 16,
  padding: "8px 0 14px",
  borderBottom: "1px solid #e2e8f0",
};

const titleBlockStyle = { display: "grid", gap: 4 };
const controlBlockStyle = { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" };
const toggleStyle = {
  display: "none",
  border: "1px solid #9bc9c4",
  borderRadius: 8,
  padding: "9px 12px",
  color: "#0f766e",
  background: "#e6f6f4",
  fontWeight: 700,
  cursor: "pointer",
};
