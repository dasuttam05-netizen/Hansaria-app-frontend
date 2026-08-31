import React from "react";

function WarehouseSalePreviewModal({
  modalOverlayStyle,
  paymentAdjustModalStyle,
  btnAction,
  btnPrimary,
  reportHeaderRowStyle,
  th,
  td,
  salePreviewRow,
  salePreviewSummary,
  saleTransportMode,
  saleTransportManualAmount,
  setSaleTransportMode,
  setSaleTransportManualAmount,
  setShowSalePreview,
  setSalePreviewRow,
  setSalePreviewSummary,
  setLoading,
  loading,
  activeTab,
  loadReport,
  loadVouchers,
  formatMoney,
  formatDecimal4,
  toNumber,
  getSalePreviewDataForRow,
  axios,
}) {
  if (!salePreviewRow) return null;
  return (
    <div className="purchase-preview-overlay" style={modalOverlayStyle}>
      <div className="purchase-preview-modal" style={{ ...paymentAdjustModalStyle, width: "min(1220px, 98vw)", background: "#f8fafc" }}>
        {(() => {
          const previewSource = salePreviewSummary?.sale || salePreviewRow;
          const preview = getSalePreviewDataForRow(previewSource);
          const summary = salePreviewSummary?.summary || null;
          const purchaseLinks = Array.isArray(salePreviewSummary?.purchase_links) ? salePreviewSummary.purchase_links : preview.purchaseLinks;
          const transportChargeAuto = toNumber(salePreviewSummary?.transport_charge || salePreviewSummary?.summary?.transport_charge || 0);
          const transportCharge = saleTransportMode === "manual" ? toNumber(saleTransportManualAmount) : transportChargeAuto;
          const grossAmount = toNumber(summary?.gross_amount ?? preview.grossAmount);
          const baseTotalDeduction = toNumber(summary?.total_deduction ?? preview.totalDeduction);
          const adjustedTotalDeduction = baseTotalDeduction + transportCharge;
          const netPayable = Math.max(grossAmount - adjustedTotalDeduction, 0);
          const profitLoss = netPayable - toNumber(summary?.direct_purchase_amount ?? preview.directPurchaseAmount);
          const handleTransportReset = () => {
            setSaleTransportMode("auto");
            setSaleTransportManualAmount(formatMoney(transportChargeAuto));
          };
          const handleTransportSave = async () => {
            const saleId = salePreviewRow?.id || salePreviewRow?._id;
            if (!saleId) {
              alert("Sale voucher not selected for save");
              return;
            }
            setLoading(true);
            try {
              const saleQty = toNumber(salePreviewRow?.quantity || salePreviewRow?.unloading_qty || 0);
              const unloadingQtyValue = toNumber(salePreviewRow?.unloading_qty || salePreviewRow?.quantity || 0);
              const shortageQty = Math.max(saleQty - unloadingQtyValue, 0);
              const shortageAmount = toNumber(salePreviewRow?.shortage_amount || salePreviewRow?.claim_amount || 0);
              const transportChargeValue = transportCharge;
              const claimValue = toNumber(salePreviewRow?.claim_amount || shortageAmount);
              const otherDeductionValue = toNumber(salePreviewRow?.other_deduction);
              const cdAmountValue = toNumber(salePreviewRow?.cd_amount);
              const adjustmentValue = toNumber(salePreviewRow?.adjustment_amount);
              const tdsValue = toNumber(salePreviewRow?.tds_amount);
              const roundOffValue = toNumber(salePreviewRow?.round_off);
              const payload = { deduction_only: true, sale_type: salePreviewRow?.sale_type || "direct", unloading_date: salePreviewRow?.unloading_date || salePreviewRow?.date || "", unloading_qty: unloadingQtyValue, shortage_quantity: shortageQty, shortage_amount: shortageAmount, claim_amount: claimValue, other_deduction: otherDeductionValue, cd_percent: toNumber(salePreviewRow?.cd_percent), cd_amount: cdAmountValue, adjustment_amount: adjustmentValue, tds_amount: tdsValue, transport_charge: transportChargeValue, round_off: roundOffValue, total_deduction: toNumber(salePreviewSummary?.summary?.total_deduction) || toNumber(salePreviewRow?.total_deduction) || claimValue + otherDeductionValue + cdAmountValue + adjustmentValue + tdsValue };
              await axios.put(`/api/warehouse-trading/sale/${saleId}`, payload);
              const updated = await axios.get(`/api/warehouse-trading/sale/${saleId}/summary`);
              setSalePreviewSummary(updated.data || salePreviewSummary);
              setSalePreviewRow(updated.data?.sale || salePreviewRow);
              alert("Direct sale report saved successfully");
              if (activeTab === "reports") await loadReport();
              if (activeTab === "vouchers") await loadVouchers();
            } finally {
              setLoading(false);
            }
          };
          return (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", marginBottom: 14, borderBottom: "1px solid #d1d5db", paddingBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 12, letterSpacing: 1.1, fontWeight: 800, color: "#6b7280" }}>DIRECT SALE BILL REPORT</div>
                  <h3 style={{ margin: "4px 0 0", fontSize: 24, color: "#111827" }}>Sale first, purchase below, deductions and profit in one view</h3>
                  <div style={{ marginTop: 4, fontSize: 13, color: "#4b5563" }}>This layout is meant for direct farmer loading sales with linked auto purchase details.</div>
                </div>
                <button type="button" onClick={() => { setShowSalePreview(false); setSalePreviewRow(null); }} style={{ ...btnAction, background: "#64748b" }}>Close</button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
                {[
                  { label: "Voucher No", value: preview.voucherNo },
                  { label: "Sale Type", value: preview.saleType },
                  { label: "Date", value: preview.date },
                  { label: "Location", value: preview.location },
                ].map((item) => (
                  <div key={item.label} style={{ border: "1px solid #d1d5db", borderRadius: 10, padding: 14, background: "#fff" }}>
                    <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 0.7, color: "#6b7280", marginBottom: 4 }}>{item.label}</div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: "#111827" }}>{item.value}</div>
                  </div>
                ))}
              </div>
              {!salePreviewSummary && purchaseLinks.length === 0 && <div style={{ marginTop: 12, padding: 12, border: "1px solid #dbe4ef", borderRadius: 10, background: "#fff", color: "#64748b" }}>Purchase details were not linked on this bill.</div>}
              <div style={{ marginTop: 14, border: "1px solid #d1d5db", borderRadius: 10, overflow: "hidden", background: "#fff" }}>
                <div style={{ padding: "10px 12px", background: "#f3f4f6", borderBottom: "1px solid #d1d5db", fontWeight: 800, color: "#111827" }}>Sale Details</div>
                <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}><tbody><tr><td style={td}>Farmer</td><td style={td}>{preview.farmer}</td><td style={td}>Buyer / Account</td><td style={td}>{preview.account}</td></tr></tbody></table></div>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
                <button type="button" onClick={handleTransportReset} style={{ ...btnPrimary, background: "#94a3b8" }}>Reset</button>
                <button type="button" onClick={handleTransportSave} disabled={loading} style={btnPrimary}>{loading ? "Saving..." : "Save"}</button>
                <button type="button" onClick={() => { setShowSalePreview(false); setSalePreviewRow(null); }} style={{ ...btnPrimary, background: "#64748b" }}>Close</button>
              </div>
            </>
          );
        })()}
      </div>
    </div>
  );
}

export default React.memo(WarehouseSalePreviewModal);
