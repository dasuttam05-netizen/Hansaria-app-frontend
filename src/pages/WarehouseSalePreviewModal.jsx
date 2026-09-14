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
  formData,
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
          const purchaseGrossAmount = toNumber(summary?.direct_purchase_amount ?? preview.directPurchaseAmount);
          const purchaseDeductionTotal = toNumber(summary?.purchase_deduction_total ?? purchaseLinks.reduce((sum, item) => sum + toNumber(item.total_deduction), 0));
          const purchaseNetValue = Math.max(purchaseGrossAmount - purchaseDeductionTotal, 0);
          const purchaseShortage = purchaseLinks.reduce((sum, item) => sum + toNumber(item.shortage_amount), 0);
          const purchaseClaim = purchaseLinks.reduce((sum, item) => sum + toNumber(item.claim_amount || item.bags_claim), 0);
          const purchaseFreight = purchaseLinks.reduce((sum, item) => sum + toNumber(item.transport_charge), 0);
          const purchaseOthers = purchaseLinks.reduce((sum, item) => sum + toNumber(item.other_deduction || item.others), 0);
          const purchaseLabour = purchaseLinks.reduce((sum, item) => sum + toNumber(item.labour), 0);
          const transportChargeAuto = toNumber(salePreviewSummary?.transport_charge || salePreviewSummary?.summary?.transport_charge || 0);
          const saleShortage = toNumber(salePreviewSummary?.sale?.shortage_amount || 0);
          const saleClaim = toNumber(salePreviewSummary?.sale?.claim_amount || 0);
          const saleOthers = toNumber(salePreviewSummary?.sale?.other_deduction || 0);
          const saleCd = toNumber(salePreviewSummary?.sale?.cd_amount || 0);
          const saleAdjustment = toNumber(salePreviewSummary?.sale?.adjustment_amount || 0);
          const saleTds = toNumber(salePreviewSummary?.sale?.tds_amount || 0);
          const saleTotalDeduction = saleShortage + saleClaim + transportChargeAuto + saleOthers + saleCd + saleAdjustment + saleTds;
          const farmerName = formData?.farmer_id
            ? (salePreviewSummary?.sale?.farmer_name || preview.farmer || String(formData.farmer_id))
            : (purchaseLinks.find((item) => item?.farmer_name)?.farmer_name || preview.farmer || "-");
          const transportCharge = saleTransportMode === "manual" ? toNumber(saleTransportManualAmount) : transportChargeAuto;
          const grossAmount = toNumber(summary?.gross_amount ?? preview.grossAmount);
          const baseTotalDeduction = toNumber(summary?.total_deduction ?? preview.totalDeduction);
          const storedTransportCharge = toNumber(salePreviewSummary?.sale?.transport_charge || 0);
          const adjustedTotalDeduction = Math.max(baseTotalDeduction - storedTransportCharge + transportCharge, 0);
          const netPayable = Math.max(grossAmount - adjustedTotalDeduction + toNumber(summary?.round_off ?? salePreviewSummary?.sale?.round_off ?? preview.roundOff), 0);
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
              await axios.put(`/api/wh-vouchers/sale/${saleId}`, payload);
              const updated = await axios.get(`/api/wh-vouchers/sale/${saleId}/summary`);
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
              <div style={{ marginTop: 14, border: "1px solid #cbd5e1", borderRadius: 10, overflow: "hidden", background: "#fff" }}>
                <div style={{ padding: "12px 14px", background: "#e2e8f0", borderBottom: "1px solid #cbd5e1", fontWeight: 900, color: "#0f172a", fontSize: 18 }}>Sale Summary</div>
                <div style={{ padding: 14 }}>
                  <div style={{ marginBottom: 14, padding: "10px 12px", border: "1px solid #e2e8f0", borderRadius: 8, background: "#f8fafc" }}><strong>Farmer Name:</strong> {farmerName}</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 14 }}>
                    <div style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: 12 }}>
                      <div style={{ fontWeight: 900, marginBottom: 8 }}>Purchase</div>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}><tbody>
                        <tr><td style={td}>Purchase Qty × Rate</td><td style={td}>{formatDecimal4(summary?.direct_purchase_qty ?? preview.directPurchaseQty)} × {formatMoney(summary?.direct_purchase_rate ?? preview.directPurchaseRate)}</td></tr>
                        <tr><td style={td}>Purchase Amount</td><td style={td}>{formatMoney(purchaseGrossAmount)}</td></tr>
                        <tr><td style={{ ...td, fontWeight: 800 }}>Purchase Deduction</td><td style={td}></td></tr>
                        <tr><td style={td}>Shortage</td><td style={td}>{formatMoney(purchaseShortage)}</td></tr>
                        <tr><td style={td}>Claim</td><td style={td}>{formatMoney(purchaseClaim)}</td></tr>
                        <tr><td style={td}>Freight / Transport</td><td style={td}>{formatMoney(purchaseFreight)}</td></tr>
                        <tr><td style={td}>Others</td><td style={td}>{formatMoney(purchaseOthers)}</td></tr>
                        <tr><td style={td}>Labour / Quality</td><td style={td}>{formatMoney(purchaseLabour)}</td></tr>
                        <tr><td style={{ ...td, fontWeight: 800 }}>Total Purchase Deduction</td><td style={{ ...td, fontWeight: 800 }}>{formatMoney(purchaseDeductionTotal)}</td></tr>
                        <tr><td style={{ ...td, fontWeight: 900 }}>Net Purchase Value</td><td style={{ ...td, fontWeight: 900 }}>{formatMoney(purchaseNetValue)}</td></tr>
                      </tbody></table>
                    </div>
                    <div style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: 12 }}>
                      <div style={{ fontWeight: 900, marginBottom: 8 }}>Sale</div>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}><tbody>
                        <tr><td style={td}>Sale Qty × Rate</td><td style={td}>{formatDecimal4(preview.quantity)} × {formatMoney(preview.rate)}</td></tr>
                        <tr><td style={td}>Sale Amount</td><td style={td}>{formatMoney(grossAmount)}</td></tr>
                        <tr><td style={{ ...td, fontWeight: 800 }}>Sale Deduction</td><td style={td}></td></tr>
                        <tr><td style={td}>Shortage</td><td style={td}>{formatMoney(saleShortage)}</td></tr>
                        <tr><td style={td}>Claim</td><td style={td}>{formatMoney(saleClaim)}</td></tr>
                        <tr><td style={td}>Freight</td><td style={td}>{formatMoney(transportChargeAuto)}</td></tr>
                        <tr><td style={td}>Others</td><td style={td}>{formatMoney(saleOthers)}</td></tr>
                        <tr><td style={td}>CD / Adjustment / TDS</td><td style={td}>{formatMoney(saleCd + saleAdjustment + saleTds)}</td></tr>
                        <tr><td style={{ ...td, fontWeight: 800 }}>Total Sale Deduction</td><td style={{ ...td, fontWeight: 800 }}>{formatMoney(saleTotalDeduction)}</td></tr>
                        <tr><td style={td}>Round Off</td><td style={td}>{formatMoney(summary?.round_off ?? salePreviewSummary?.sale?.round_off ?? preview.roundOff)}</td></tr>
                        <tr><td style={{ ...td, fontWeight: 900 }}>Net Sale Value</td><td style={{ ...td, fontWeight: 900 }}>{formatMoney(netPayable)}</td></tr>
                      </tbody></table>
                    </div>
                  </div>
                  <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10 }}>
                    <div style={{ padding: 12, borderRadius: 8, background: "#f8fafc", border: "1px solid #e2e8f0" }}><div style={{ fontSize: 11, color: "#64748b" }}>Net Sale</div><strong>{formatMoney(netPayable)}</strong></div>
                    <div style={{ padding: 12, borderRadius: 8, background: "#f8fafc", border: "1px solid #e2e8f0" }}><div style={{ fontSize: 11, color: "#64748b" }}>Net Purchase</div><strong>{formatMoney(purchaseNetValue)}</strong></div>
                    <div style={{ padding: 12, borderRadius: 8, background: "#f8fafc", border: "1px solid #e2e8f0" }}><div style={{ fontSize: 11, color: "#64748b" }}>Profit / Loss</div><strong>{formatMoney(netPayable - purchaseNetValue)}</strong></div>
                  </div>
                </div>
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
