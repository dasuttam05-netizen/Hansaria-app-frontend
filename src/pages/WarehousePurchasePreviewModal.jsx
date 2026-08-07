import React from "react";

function WarehousePurchasePreviewModal({
  modalOverlayStyle,
  paymentAdjustModalStyle,
  btnAction,
  btnPrimary,
  reportHeaderRowStyle,
  th,
  td,
  purchasePreviewRow,
  purchasePreviewLoading,
  purchaseReportRows,
  currentPurchasePreviewIndex,
  navigatePurchasePreview,
  handleEditPurchaseReport,
  handleDownloadPurchasePdf,
  setShowPurchasePreview,
  setPurchasePreviewRow,
  setPurchasePreviewOpenedFromLedger,
  loading,
  saveVoucher,
  getPurchasePreviewData,
  getPurchasePreviewDataForRow,
  formData,
  formatMoney,
}) {
  if (!purchasePreviewRow && !purchasePreviewLoading) return null;
  const preview = purchasePreviewRow ? getPurchasePreviewDataForRow(purchasePreviewRow) : getPurchasePreviewData();
  const topSummary = [
    { label: "Voucher No", value: preview.voucherNo },
    { label: "Date", value: preview.date },
    { label: "Party", value: preview.party },
    { label: "Warehouse", value: preview.warehouse },
  ];
  const accountingSummary = [
    { label: "Account", value: preview.account },
    { label: "Product", value: preview.product },
    { label: "Rate", value: preview.rate },
    { label: "Net Qty", value: preview.netQty },
  ];
  return (
    <div className="purchase-preview-overlay" style={modalOverlayStyle}>
      <div className="purchase-preview-modal" style={{ ...paymentAdjustModalStyle, width: "min(1180px, 98vw)", background: "#fafafa" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", marginBottom: 14, borderBottom: "1px solid #d1d5db", paddingBottom: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 12, letterSpacing: 1.1, fontWeight: 800, color: "#6b7280" }}>PURCHASE VOUCHER PREVIEW</div>
            <h3 style={{ margin: "4px 0 0", fontSize: 24, color: "#111827" }}>
              {purchasePreviewRow ? "Full purchase report view" : "Please verify every entry before saving"}
            </h3>
            <div style={{ marginTop: 4, fontSize: 13, color: "#4b5563" }}>This preview follows a clean report layout for easy checking.</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <button type="button" onClick={() => navigatePurchasePreview(-1)} disabled={currentPurchasePreviewIndex <= 0} style={{ ...btnAction, background: currentPurchasePreviewIndex <= 0 ? "#cbd5e1" : "#64748b" }}>
              Previous
            </button>
            <button type="button" onClick={() => navigatePurchasePreview(1)} disabled={currentPurchasePreviewIndex < 0 || currentPurchasePreviewIndex >= purchaseReportRows.length - 1} style={{ ...btnAction, background: currentPurchasePreviewIndex < 0 || currentPurchasePreviewIndex >= purchaseReportRows.length - 1 ? "#cbd5e1" : "#64748b" }}>
              Next
            </button>
            {purchasePreviewRow && (
              <button type="button" onClick={() => handleEditPurchaseReport(purchasePreviewRow)} style={{ ...btnAction, background: "#0f766e" }}>
                Edit
              </button>
            )}
            {purchasePreviewRow && (
              <button type="button" onClick={handleDownloadPurchasePdf} style={{ ...btnAction, background: "#ea580c" }}>
                PDF
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setShowPurchasePreview(false);
                setPurchasePreviewRow(null);
                if (setPurchasePreviewOpenedFromLedger) {
                  setPurchasePreviewOpenedFromLedger(false);
                }
              }}
              style={{ ...btnAction, background: "#64748b" }}
            >
              Close
            </button>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
          {topSummary.map((item) => (
            <div key={item.label} style={{ border: "1px solid #d1d5db", borderRadius: 10, padding: 14, background: "#fff" }}>
              <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 0.7, color: "#6b7280", marginBottom: 4 }}>{item.label}</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: "#111827" }}>{item.value}</div>
            </div>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1.35fr 0.65fr", gap: 14, marginTop: 14 }}>
          <div style={{ border: "1px solid #d1d5db", borderRadius: 10, overflow: "hidden", background: "#fff" }}>
            <div style={{ padding: "10px 12px", background: "#f3f4f6", borderBottom: "1px solid #d1d5db", fontWeight: 800, color: "#111827" }}>Purchase Details</div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead><tr style={reportHeaderRowStyle}><th style={th}>Particulars</th><th style={th}>Value</th><th style={th}>Particulars</th><th style={th}>Value</th></tr></thead>
                <tbody>
                  <tr><td style={td}>Packet</td><td style={td}>{preview.packet}</td><td style={td}>Gross Weight</td><td style={td}>{preview.grossWeight}</td></tr>
                  <tr><td style={td}>Tare Weight</td><td style={td}>{preview.tareWeight}</td><td style={td}>New Weight</td><td style={td}>{preview.newWeight}</td></tr>
                  <tr><td style={td}>Net Qty</td><td style={td}>{preview.netQty}</td><td style={td}>Rate</td><td style={td}>{preview.rate}</td></tr>
                  <tr><td style={td}>Gross Amount</td><td style={td}>{preview.grossAmount}</td><td style={td}>Net Payable</td><td style={td}>{preview.netPayable}</td></tr>
                </tbody>
              </table>
            </div>
          </div>
          <div style={{ border: "1px solid #d1d5db", borderRadius: 10, overflow: "hidden", background: "#fff" }}>
            <div style={{ padding: "10px 12px", background: "#f3f4f6", borderBottom: "1px solid #d1d5db", fontWeight: 800, color: "#111827" }}>Account Summary</div>
            <div style={{ display: "grid", gap: 10, padding: 12 }}>
              {accountingSummary.map((item) => (
                <div key={item.label} style={{ paddingBottom: 10, borderBottom: "1px dashed #d1d5db" }}>
                  <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 0.7, color: "#6b7280", marginBottom: 4 }}>{item.label}</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: "#111827" }}>{item.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div style={{ marginTop: 14, border: "1px solid #d1d5db", borderRadius: 10, overflow: "hidden", background: "#fff" }}>
          <div style={{ padding: "10px 12px", background: "#f3f4f6", borderBottom: "1px solid #d1d5db", fontWeight: 800, color: "#111827" }}>Deduction Breakdown</div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead><tr style={reportHeaderRowStyle}><th style={th}>Particulars</th><th style={th}>Value</th><th style={th}>Particulars</th><th style={th}>Value</th></tr></thead>
              <tbody>
                <tr><td style={td}>Less Bags Weight</td><td style={td}>{purchasePreviewRow ? preview.lessBagsWeight : formatMoney(formData.less_bags_weight)}</td><td style={td}>Moisture</td><td style={td}>{purchasePreviewRow ? preview.moisture : formatMoney(formData.moisture)}</td></tr>
                <tr><td style={td}>Dunki</td><td style={td}>{purchasePreviewRow ? preview.dunki : formatMoney(formData.dunki)}</td><td style={td}>Fungus</td><td style={td}>{purchasePreviewRow ? preview.fungus : formatMoney(formData.fungus)}</td></tr>
                <tr><td style={td}>Discolour</td><td style={td}>{purchasePreviewRow ? preview.discolour : formatMoney(formData.discolour)}</td><td style={td}>Others</td><td style={td}>{purchasePreviewRow ? preview.others : formatMoney(formData.others)}</td></tr>
                <tr><td style={td}>Bags Claim</td><td style={td}>{purchasePreviewRow ? preview.bagsClaim : formatMoney(formData.bags_claim)}</td><td style={td}>Labour</td><td style={td}>{purchasePreviewRow ? preview.labour : formatMoney(formData.labour)}</td></tr>
              </tbody>
            </table>
          </div>
        </div>
        <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 10 }}>
          <div style={{ border: "1px solid #d1d5db", borderRadius: 10, padding: 12, background: "#fff" }}>
            <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 0.7, color: "#6b7280", marginBottom: 4 }}>Total Deduction</div>
            <div style={{ fontSize: 16, fontWeight: 900, color: "#111827" }}>{preview.totalDeduction}</div>
          </div>
          <div style={{ border: "1px solid #111827", borderRadius: 10, padding: 12, background: "#111827" }}>
            <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 0.7, color: "#d1d5db", marginBottom: 4 }}>Net Payable</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: "#fff" }}>{preview.netPayable}</div>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
          {purchasePreviewRow && (
            <button type="button" onClick={() => handleEditPurchaseReport(purchasePreviewRow)} style={{ ...btnPrimary, background: "#0f766e" }}>
              Edit
            </button>
          )}
          {purchasePreviewRow && (
            <button type="button" onClick={handleDownloadPurchasePdf} style={{ ...btnPrimary, background: "#ea580c" }}>
              PDF
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setShowPurchasePreview(false);
              setPurchasePreviewRow(null);
              if (setPurchasePreviewOpenedFromLedger) {
                setPurchasePreviewOpenedFromLedger(false);
              }
            }}
            style={{ ...btnPrimary, background: "#64748b" }}
          >
            {purchasePreviewRow ? "Close" : "Back to Edit"}
          </button>
          {!purchasePreviewRow && (
            <button type="button" onClick={async () => { setShowPurchasePreview(false); await saveVoucher(); }} disabled={loading} style={btnPrimary}>
              {loading ? "Saving..." : "Confirm Save"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default React.memo(WarehousePurchasePreviewModal);
