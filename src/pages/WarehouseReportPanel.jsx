import React from "react";
import { FaFilePdf, FaWhatsapp } from "react-icons/fa";

function WarehouseReportPanel({
  activeReport,
  activeVoucherButtonStyle,
  voucherButtonStyle,
  voucherTypeRow,
  card,
  btnAction,
  reportLabels,
  showMobileReportHeader,
  onToggleReportHeader,
  onSetActiveReport,
  allowedReports,
  onDownloadPurchaseLedgerPdf,
  onDownloadSaleLedgerPdf,
  onSharePurchaseLedgerWhatsapp,
  onShareSaleLedgerWhatsapp,
  children,
}) {
  return (
    <div>
      <div style={voucherTypeRow}>
        {allowedReports.map((type) => (
          <button
            key={type}
            onClick={() => onSetActiveReport(type)}
            style={activeReport === type ? activeVoucherButtonStyle : voucherButtonStyle}
          >
            {reportLabels[type] || type}
          </button>
        ))}
      </div>
      <div style={card}>
        <div className={`mobile-collapsible-header ${showMobileReportHeader ? "" : "is-mobile-hidden"}`} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <h3 style={{ marginTop: 0, marginBottom: 0 }}>{reportLabels[activeReport] || activeReport}</h3>
          {(activeReport === "purchase-party-ledger" || activeReport === "sale-party-ledger") && (
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                onClick={activeReport === "sale-party-ledger" ? onDownloadSaleLedgerPdf : onDownloadPurchaseLedgerPdf}
                style={{ ...btnAction, background: "#b45309", display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                <FaFilePdf /> PDF
              </button>
              <button
                type="button"
                onClick={activeReport === "sale-party-ledger" ? onShareSaleLedgerWhatsapp : onSharePurchaseLedgerWhatsapp}
                style={{ ...btnAction, background: "#15803d", display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                <FaWhatsapp /> WhatsApp
              </button>
            </div>
          )}
        </div>
        <button type="button" className="mobile-section-toggle" onClick={onToggleReportHeader}>
          {showMobileReportHeader ? "Hide Report Header" : "Show Report Header"}
        </button>
        {children}
      </div>
    </div>
  );
}

export default React.memo(WarehouseReportPanel);
