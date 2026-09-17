import React, { useEffect, useMemo, useState } from "react";
import { loadSession } from "../utils/auth";

function WarehouseSalePreviewModal({
  modalOverlayStyle,
  paymentAdjustModalStyle,
  btnAction,
  btnPrimary,
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
  onOpenPurchaseTagging,
}) {
  const session = loadSession() || {};
  const currentUser = session.user || session || {};
  const isAdmin = Boolean(currentUser?.isAdmin) || String(currentUser?.role || currentUser?.user_role || "").toLowerCase() === "admin";
  const [manualMode, setManualMode] = useState({
    shortage: false,
    claim: false,
    freight: false,
    other: false,
  });
  const [manualValues, setManualValues] = useState({
    shortage: "",
    claim: "",
    freight: "",
    other: "",
  });

  useEffect(() => {
    if (!salePreviewRow) return;
    const saleQty = toNumber(salePreviewRow?.quantity || salePreviewRow?.dispatch_qty || salePreviewRow?.unloading_qty || 0);
    const unloadingQty = toNumber(salePreviewRow?.unloading_qty || salePreviewRow?.quantity || 0);
    const shortageQty = Math.max(saleQty - unloadingQty, 0);
    const rate = toNumber(salePreviewRow?.rate);
    const shortageAuto = toNumber(salePreviewRow?.shortage_amount) || shortageQty * rate;
    const claimAuto = toNumber(salePreviewRow?.claim_amount) || 0;
    const freightAuto = toNumber(
      salePreviewSummary?.transport_charge ??
      salePreviewSummary?.summary?.transport_charge ??
      salePreviewRow?.transport_charge ??
      salePreviewRow?.freight ??
      0
    );
    const otherAuto = toNumber(salePreviewRow?.other_deduction);
    setManualValues({
      shortage: shortageAuto.toFixed(2),
      claim: claimAuto.toFixed(2),
      freight: freightAuto.toFixed(2),
      other: otherAuto.toFixed(2),
    });
    setManualMode((prev) => ({
      shortage: Boolean(prev.shortage),
      claim: Boolean(prev.claim),
      freight: saleTransportMode === "manual" || Boolean(prev.freight),
      other: Boolean(prev.other),
    }));
  }, [salePreviewRow, salePreviewSummary, saleTransportMode, toNumber]);

  if (!salePreviewRow) return null;

  const previewSource = salePreviewSummary?.sale || salePreviewRow;
  const preview = getSalePreviewDataForRow(previewSource);
  const purchaseLinks = Array.isArray(salePreviewSummary?.purchase_links)
    ? salePreviewSummary.purchase_links
    : preview.purchaseLinks;
  const summary = salePreviewSummary?.summary || null;

  const saleQty = toNumber(salePreviewRow?.quantity || salePreviewRow?.dispatch_qty || salePreviewRow?.unloading_qty || 0);
  const unloadingQty = toNumber(salePreviewRow?.unloading_qty || salePreviewRow?.quantity || 0);
  const shortageQtyAuto = Math.max(saleQty - unloadingQty, 0);
  const saleRate = toNumber(salePreviewRow?.rate || previewSource?.rate);
  const saleAmount = toNumber(summary?.gross_amount ?? preview.grossAmount ?? saleQty * saleRate);

  const purchaseQty = purchaseLinks.reduce((sum, item) => sum + toNumber(item.quantity ?? item.weight), 0);
  const purchaseAmount = purchaseLinks.reduce((sum, item) => sum + toNumber(item.amount ?? (toNumber(item.quantity ?? item.weight) * toNumber(item.rate))), 0);
  const purchaseDeductionTotals = useMemo(() => {
    return purchaseLinks.reduce((acc, item) => {
      const purchase = item?.purchase_details || item || {};
      acc.claim += toNumber(purchase.claim_amount ?? purchase.bags_claim);
      acc.labour += toNumber(purchase.labour);
      acc.freight += toNumber(purchase.transport_charge);
      acc.cashDiscount += toNumber(purchase.cd_amount);
      acc.tds += toNumber(purchase.tds_amount);
      acc.other += toNumber(purchase.other_deduction);
      acc.adjustment += toNumber(purchase.adjustment_amount);
      acc.roundOff += toNumber(purchase.round_off);
      acc.total += toNumber(purchase.total_deduction ?? (
        toNumber(purchase.claim_amount ?? purchase.bags_claim) +
        toNumber(purchase.labour) +
        toNumber(purchase.transport_charge) +
        toNumber(purchase.cd_amount) +
        toNumber(purchase.tds_amount) +
        toNumber(purchase.other_deduction) +
        toNumber(purchase.adjustment_amount)
      ));
      return acc;
    }, { claim: 0, labour: 0, freight: 0, cashDiscount: 0, tds: 0, other: 0, adjustment: 0, roundOff: 0, total: 0 });
  }, [purchaseLinks, toNumber]);
  const purchaseNetAfterDeduction = purchaseAmount - purchaseDeductionTotals.total + purchaseDeductionTotals.roundOff;

  const shortageAutoAmount = toNumber(salePreviewRow?.shortage_amount) || shortageQtyAuto * saleRate;
  const claimAutoAmount = toNumber(salePreviewRow?.claim_amount);
  const freightAutoAmount = toNumber(
    salePreviewSummary?.transport_charge ??
    salePreviewSummary?.summary?.transport_charge ??
    salePreviewRow?.transport_charge ??
    salePreviewRow?.freight ??
    0
  );
  const otherAutoAmount = toNumber(salePreviewRow?.other_deduction);

  const shortageAmount = manualMode.shortage ? toNumber(manualValues.shortage) : shortageAutoAmount;
  const claimAmount = manualMode.claim ? toNumber(manualValues.claim) : claimAutoAmount;
  const freightAmount = manualMode.freight ? toNumber(manualValues.freight) : freightAutoAmount;
  const otherAmount = manualMode.other ? toNumber(manualValues.other) : otherAutoAmount;
  const cdAmount = toNumber(salePreviewRow?.cd_amount);
  const adjustmentAmount = toNumber(salePreviewRow?.adjustment_amount);
  const tdsAmount = toNumber(salePreviewRow?.tds_amount);
  const roundOff = toNumber(salePreviewRow?.round_off);

  const totalDeduction = shortageAmount + claimAmount + freightAmount + otherAmount + cdAmount + adjustmentAmount + tdsAmount;
  const netSale = saleAmount - totalDeduction + roundOff;
  const netPurchase = purchaseAmount;
  const profitLoss = netSale - netPurchase;

  const setModeValue = (key, checked) => {
    setManualMode((prev) => ({ ...prev, [key]: checked }));
    if (!checked) {
      const autoValue = {
        shortage: shortageAutoAmount,
        claim: claimAutoAmount,
        freight: freightAutoAmount,
        other: otherAutoAmount,
      }[key];
      setManualValues((prev) => ({ ...prev, [key]: Number(autoValue || 0).toFixed(2) }));
    }
  };

  const handleReset = () => {
    setManualMode({ shortage: false, claim: false, freight: false, other: false });
    setManualValues({
      shortage: shortageAutoAmount.toFixed(2),
      claim: claimAutoAmount.toFixed(2),
      freight: freightAutoAmount.toFixed(2),
      other: otherAutoAmount.toFixed(2),
    });
    setSaleTransportMode("auto");
    setSaleTransportManualAmount(freightAutoAmount.toFixed(2));
  };

  const handleSave = async () => {
    const saleId = salePreviewRow?.id || salePreviewRow?._id;
    if (!saleId) {
      alert("Sale voucher not selected for save");
      return;
    }
    setLoading(true);
    try {
      const currentShortageQty = manualMode.shortage
        ? Math.min(Math.max(toNumber(manualValues.shortage) / Math.max(saleRate, 0.000001), 0), saleQty)
        : shortageQtyAuto;
      const payload = {
        deduction_only: true,
        sale_type: salePreviewRow?.sale_type || "direct",
        unloading_date: salePreviewRow?.unloading_date || salePreviewRow?.date || "",
        unloading_qty: unloadingQty,
        shortage_quantity: currentShortageQty,
        shortage_amount: shortageAmount,
        claim_amount: claimAmount,
        other_deduction: otherAmount,
        cd_percent: toNumber(salePreviewRow?.cd_percent),
        cd_amount: cdAmount,
        adjustment_amount: adjustmentAmount,
        tds_amount: tdsAmount,
        transport_charge: freightAmount,
        round_off: roundOff,
        total_deduction: totalDeduction,
      };
      await axios.put(`/api/wh-vouchers/sale/${saleId}`, payload);
      const updated = await axios.get(`/api/wh-vouchers/sale/${saleId}/summary`);
      setSalePreviewSummary(updated.data || salePreviewSummary);
      setSalePreviewRow(updated.data?.sale || salePreviewRow);
      alert("Sale Summary saved successfully");
      if (activeTab === "reports") await loadReport();
      if (activeTab === "vouchers") await loadVouchers();
    } catch (err) {
      alert(err?.response?.data?.error || err?.message || "Sale Summary save failed");
    } finally {
      setLoading(false);
    }
  };

  const deductionRows = useMemo(
    () => [
      { key: "shortage", label: `Shortage (${formatDecimal4(shortageQtyAuto)} Qty)`, auto: shortageAutoAmount, value: shortageAmount },
      { key: "claim", label: "Claim", auto: claimAutoAmount, value: claimAmount },
      { key: "freight", label: "Freight", auto: freightAutoAmount, value: freightAmount },
      { key: "other", label: "Others", auto: otherAutoAmount, value: otherAmount },
    ],
    [formatDecimal4, shortageQtyAuto, shortageAutoAmount, claimAutoAmount, freightAutoAmount, otherAutoAmount, shortageAmount, claimAmount, freightAmount, otherAmount]
  );

  return (
    <div className="purchase-preview-overlay" style={modalOverlayStyle}>
      <div className="purchase-preview-modal" style={{ ...paymentAdjustModalStyle, width: "min(1280px, 98vw)", maxHeight: "94vh", overflowY: "auto", background: "#f8fafc" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", marginBottom: 14, borderBottom: "1px solid #d1d5db", paddingBottom: 12 }}>
          <div>
            <div style={{ fontSize: 12, letterSpacing: 1.1, fontWeight: 800, color: "#6b7280" }}>SALE SUMMARY</div>
            <h3 style={{ margin: "4px 0 0", fontSize: 24, color: "#111827" }}>Purchase + Sale + Deduction + Profit / Loss</h3>
            <div style={{ marginTop: 4, fontSize: 13, color: "#4b5563" }}>F10 Purchase Tagging is available for this sale. Auto values can be reset or overridden manually.</div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" onClick={onOpenPurchaseTagging} style={{ ...btnAction, background: "#0f766e" }}>F10 Purchase Tag</button>
            <button type="button" onClick={handleReset} style={{ ...btnAction, background: "#64748b" }}>Reset</button>
            <button type="button" onClick={() => { setShowSalePreview(false); setSalePreviewRow(null); }} style={{ ...btnAction, background: "#64748b" }}>Close</button>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
          {[
            { label: "Voucher No", value: preview.voucherNo },
            { label: "Sale Type", value: preview.saleType },
            { label: "Date", value: preview.date },
            { label: "Location", value: preview.location },
            { label: "Consignee", value: preview.consignee },
            { label: "Buyer / Account", value: preview.account },
          ].map((item) => (
            <div key={item.label} style={{ border: "1px solid #d1d5db", borderRadius: 10, padding: 12, background: "#fff" }}>
              <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 0.7, color: "#6b7280", marginBottom: 4 }}>{item.label}</div>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#111827" }}>{item.value || "-"}</div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div style={{ border: "1px solid #d1d5db", borderRadius: 10, overflow: "hidden", background: "#fff" }}>
            <div style={{ padding: "10px 12px", background: "#e8f6f3", fontWeight: 800, color: "#115e59" }}>Purchase Details</div>
            <div style={{ padding: 12, overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead><tr><th style={th}>Bill</th><th style={th}>Consignee</th><th style={th}>Qty</th><th style={th}>Rate</th><th style={th}>Amount</th><th style={th}>Source</th></tr></thead>
                <tbody>
                  {purchaseLinks.map((item, index) => {
                    const qty = toNumber(item.quantity ?? item.weight);
                    const rate = toNumber(item.rate);
                    const amount = toNumber(item.amount) || qty * rate;
                    const purchase = item?.purchase_details || item || {};
                    return <tr key={`${item.purchase_id || item._id || index}`}><td style={td}>{item.voucher_no || purchase.voucher_no || "-"}</td><td style={td}>{item.consignee_name || purchase.consignee_name || purchase.consignee || preview.consignee || "-"}</td><td style={td}>{formatDecimal4(qty)}</td><td style={td}>{formatMoney(rate)}</td><td style={td}>{formatMoney(amount)}</td><td style={td}>{item.source === "auto" ? "Auto" : "Manual"}</td></tr>;
                  })}
                  {purchaseLinks.length === 0 && <tr><td style={{ ...td, textAlign: "center" }} colSpan={6}>No purchase bill tagged. Press F10 Purchase Tag.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ border: "1px solid #d1d5db", borderRadius: 10, overflow: "hidden", background: "#fff" }}>
            <div style={{ padding: "10px 12px", background: "#eef4ff", fontWeight: 800, color: "#0d3b7a" }}>Sale Details</div>
            <div style={{ padding: 12 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <tbody>
                  <tr><td style={td}>Sale Qty</td><td style={td}>{formatDecimal4(saleQty)}</td></tr>
                  <tr><td style={td}>Sale Rate</td><td style={td}>{formatMoney(saleRate)}</td></tr>
                  <tr><td style={td}>Sale Amount</td><td style={{ ...td, fontWeight: 900 }}>{formatMoney(saleAmount)}</td></tr>
                  <tr><td style={td}>Consignee</td><td style={td}>{preview.consignee || "-"}</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div style={{ border: "1px solid #d1d5db", borderRadius: 10, overflow: "hidden", background: "#fff" }}>
            <div style={{ padding: "10px 12px", background: "#f0fdfa", fontWeight: 800, color: "#115e59" }}>Purchase Deduction Details</div>
            <div style={{ padding: 12, overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <tbody>
                  {[
                    ["Claim", purchaseDeductionTotals.claim],
                    ["Labour", purchaseDeductionTotals.labour],
                    ["Freight / Transport", purchaseDeductionTotals.freight],
                    ["Cash Discount", purchaseDeductionTotals.cashDiscount],
                    ["TDS", purchaseDeductionTotals.tds],
                    ["Other Deduction", purchaseDeductionTotals.other],
                    ["Adjustment", purchaseDeductionTotals.adjustment],
                    ["Total Deduction", purchaseDeductionTotals.total],
                    ["Round Off", purchaseDeductionTotals.roundOff],
                    ["Net Purchase After Deduction", purchaseNetAfterDeduction],
                  ].map(([label, value]) => (
                    <tr key={label}><td style={td}>{label}</td><td style={{ ...td, textAlign: "right", fontWeight: label.includes("Net") || label === "Total Deduction" ? 900 : 700 }}>{formatMoney(value)}</td></tr>
                  ))}
                </tbody>
              </table>
              <div style={{ marginTop: 8, fontSize: 11, color: "#64748b" }}>Purchase deduction values are taken automatically from the linked purchase bills. Use F10 Purchase Tag to change the purchase allocation.</div>
            </div>
          </div>

          <div style={{ border: "1px solid #d1d5db", borderRadius: 10, overflow: "hidden", background: "#fff" }}>
            <div style={{ padding: "10px 12px", background: "#fff7ed", fontWeight: 800, color: "#9a3412" }}>Sale Deduction Details</div>
            <div style={{ padding: 12, overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead><tr><th style={th}>Particular</th><th style={th}>Auto</th><th style={th}>Manual</th><th style={th}>Final</th></tr></thead>
                <tbody>
                  {deductionRows.map((row) => (
                    <tr key={row.key}>
                      <td style={td}>{row.label}</td>
                      <td style={td}>{formatMoney(row.auto)}</td>
                      <td style={td}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <input type="checkbox" checked={Boolean(manualMode[row.key])} disabled={!isAdmin} onChange={(e) => setModeValue(row.key, e.target.checked)} />
                          <input type="number" step="0.01" value={manualValues[row.key]} disabled={!isAdmin || !manualMode[row.key]} onChange={(e) => setManualValues((prev) => ({ ...prev, [row.key]: e.target.value }))} style={{ width: 120, padding: "7px 8px", border: "1px solid #cbd5e1", borderRadius: 7 }} />
                        </div>
                      </td>
                      <td style={{ ...td, fontWeight: 800 }}>{formatMoney(row.value)}</td>
                    </tr>
                  ))}
                  {[['CD', cdAmount], ['Adjustment', adjustmentAmount], ['TDS', tdsAmount]].map(([label, value]) => (
                    <tr key={label}><td style={td}>{label}</td><td style={td}>Auto</td><td style={td}>-</td><td style={{ ...td, fontWeight: 800 }}>{formatMoney(value)}</td></tr>
                  ))}
                  <tr><td style={{ ...td, fontWeight: 800 }}>Total Deduction</td><td style={td}>-</td><td style={td}>-</td><td style={{ ...td, fontWeight: 900 }}>{formatMoney(totalDeduction)}</td></tr>
                  <tr><td style={td}>Round Off</td><td style={td}>-</td><td style={td}>-</td><td style={{ ...td, fontWeight: 800 }}>{formatMoney(roundOff)}</td></tr>
                </tbody>
              </table>
              <div style={{ marginTop: 8, fontSize: 11, color: isAdmin ? "#166534" : "#64748b" }}>
                {isAdmin ? "Admin can switch a deduction to Manual and enter a value." : "Automatic deductions are shown. Manual deduction editing is available to Admin only."}
              </div>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
          <div style={{ padding: 16, borderRadius: 10, background: "#eef4ff", border: "1px solid #c8d7ee" }}><div style={{ color: "#475569", fontSize: 12 }}>Net Sale Value</div><div style={{ fontSize: 23, fontWeight: 900, color: "#0d3b7a", marginTop: 4 }}>{formatMoney(netSale)}</div></div>
          <div style={{ padding: 16, borderRadius: 10, background: "#e8f6f3", border: "1px solid #b8dcd6" }}><div style={{ color: "#475569", fontSize: 12 }}>Net Purchase Value</div><div style={{ fontSize: 23, fontWeight: 900, color: "#115e59", marginTop: 4 }}>{formatMoney(netPurchase)}</div></div>
          <div style={{ padding: 16, borderRadius: 10, background: profitLoss >= 0 ? "#ecfdf5" : "#fef2f2", border: `1px solid ${profitLoss >= 0 ? "#a7f3d0" : "#fecaca"}` }}><div style={{ color: "#475569", fontSize: 12 }}>Profit / Loss</div><div style={{ fontSize: 23, fontWeight: 900, color: profitLoss >= 0 ? "#047857" : "#b91c1c", marginTop: 4 }}>{formatMoney(profitLoss)}</div></div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
          <button type="button" onClick={onOpenPurchaseTagging} style={{ ...btnPrimary, background: "#0f766e" }}>F10 Purchase Tag</button>
          <button type="button" onClick={handleReset} style={{ ...btnPrimary, background: "#64748b" }}>Reset</button>
          <button type="button" onClick={handleSave} disabled={loading} style={btnPrimary}>{loading ? "Saving..." : "Save Summary"}</button>
          <button type="button" onClick={() => { setShowSalePreview(false); setSalePreviewRow(null); }} style={{ ...btnPrimary, background: "#64748b" }}>Close</button>
        </div>
      </div>
    </div>
  );
}

export default React.memo(WarehouseSalePreviewModal);
