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
    cd: false,
    adjustment: false,
    tds: false,
  });
  const [manualValues, setManualValues] = useState({
    shortage: "",
    claim: "",
    freight: "",
    other: "",
    cd: "",
    adjustment: "",
    tds: "",
  });
  const [purchaseManualMode, setPurchaseManualMode] = useState({
    claim: false,
    labour: false,
    freight: false,
    cashDiscount: false,
    tds: false,
    other: false,
    adjustment: false,
  });
  const [saleBiltiFreightAmount, setSaleBiltiFreightAmount] = useState(null);
  const [purchaseManualValues, setPurchaseManualValues] = useState({
    claim: "",
    labour: "",
    freight: "",
    cashDiscount: "",
    tds: "",
    other: "",
    adjustment: "",
  });

  useEffect(() => {
    let cancelled = false;
    const biltiId = salePreviewRow?.bilti_id || salePreviewRow?.transport_bilti_id;
    if (!salePreviewRow || !biltiId || !axios?.get) {
      setSaleBiltiFreightAmount(null);
      return undefined;
    }
    const loadBiltiFreight = async () => {
      try {
        const response = await axios.get(`/api/transport-bilti/${biltiId}`);
        const amount = toNumber(
          response.data?.transport_charge ??
          response.data?.net_amount ??
          response.data?.payable_amount ??
          response.data?.gross_freight ??
          0
        );
        if (!cancelled) setSaleBiltiFreightAmount(amount);
      } catch (err) {
        if (!cancelled) setSaleBiltiFreightAmount(null);
      }
    };
    loadBiltiFreight();
    return () => { cancelled = true; };
  }, [salePreviewRow?.bilti_id, salePreviewRow?.transport_bilti_id, axios, toNumber]);

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
    const cdAuto = toNumber(salePreviewRow?.cd_amount);
    const adjustmentAuto = toNumber(salePreviewRow?.adjustment_amount);
    const tdsAuto = toNumber(salePreviewRow?.tds_amount);
    setManualValues({
      shortage: shortageAuto.toFixed(2),
      claim: claimAuto.toFixed(2),
      freight: freightAuto.toFixed(2),
      other: otherAuto.toFixed(2),
      cd: cdAuto.toFixed(2),
      adjustment: adjustmentAuto.toFixed(2),
      tds: tdsAuto.toFixed(2),
    });
    const savedSaleManualModes =
      salePreviewRow?.sale_deduction_manual_modes ||
      salePreviewSummary?.sale?.sale_deduction_manual_modes ||
      {};
    setManualMode({
      shortage: Boolean(savedSaleManualModes.shortage),
      claim: Boolean(savedSaleManualModes.claim),
      freight: saleTransportMode === "manual" || Boolean(savedSaleManualModes.freight),
      other: Boolean(savedSaleManualModes.other),
      cd: Boolean(savedSaleManualModes.cd),
      adjustment: Boolean(savedSaleManualModes.adjustment),
      tds: Boolean(savedSaleManualModes.tds),
    });

    const savedPurchaseLinks = Array.isArray(salePreviewSummary?.purchase_links)
      ? salePreviewSummary.purchase_links
      : (Array.isArray(salePreviewRow?.against_purchase_links) ? salePreviewRow.against_purchase_links : []);
    const savedPurchaseModes = savedPurchaseLinks.reduce((acc, item) => ({
      claim: acc.claim || Boolean(item?.purchase_deduction_manual_modes?.claim || item?.sale_summary_manual_modes?.claim),
      labour: acc.labour || Boolean(item?.purchase_deduction_manual_modes?.labour || item?.sale_summary_manual_modes?.labour),
      freight: acc.freight || Boolean(item?.purchase_deduction_manual_modes?.freight || item?.sale_summary_manual_modes?.freight),
      cashDiscount: acc.cashDiscount || Boolean(item?.purchase_deduction_manual_modes?.cashDiscount || item?.sale_summary_manual_modes?.cashDiscount),
      tds: acc.tds || Boolean(item?.purchase_deduction_manual_modes?.tds || item?.sale_summary_manual_modes?.tds),
      other: acc.other || Boolean(item?.purchase_deduction_manual_modes?.other || item?.sale_summary_manual_modes?.other),
      adjustment: acc.adjustment || Boolean(item?.purchase_deduction_manual_modes?.adjustment || item?.sale_summary_manual_modes?.adjustment),
    }), { claim: false, labour: false, freight: false, cashDiscount: false, tds: false, other: false, adjustment: false });
    const sumSavedPurchase = (key) => savedPurchaseLinks.reduce((sum, item) => {
      const purchase = item?.purchase_details || item || {};
      const map = {
        claim: purchase.claim_amount ?? purchase.bags_claim,
        labour: purchase.labour,
        freight: purchase.transport_charge,
        cashDiscount: purchase.cd_amount,
        tds: purchase.tds_amount,
        other: purchase.other_deduction,
        adjustment: purchase.adjustment_amount,
      };
      return sum + toNumber(map[key]);
    }, 0);
    setPurchaseManualValues({
      claim: sumSavedPurchase("claim").toFixed(2),
      labour: sumSavedPurchase("labour").toFixed(2),
      freight: sumSavedPurchase("freight").toFixed(2),
      cashDiscount: sumSavedPurchase("cashDiscount").toFixed(2),
      tds: sumSavedPurchase("tds").toFixed(2),
      other: sumSavedPurchase("other").toFixed(2),
      adjustment: sumSavedPurchase("adjustment").toFixed(2),
    });
    setPurchaseManualMode(savedPurchaseModes);
  }, [salePreviewRow, salePreviewSummary, saleTransportMode, toNumber]);

  if (!salePreviewRow) return null;

  const previewSource = salePreviewSummary?.sale || salePreviewRow;
  const preview = getSalePreviewDataForRow(previewSource);
  const hydratedPurchaseLinks = Array.isArray(salePreviewSummary?.purchase_links)
    ? salePreviewSummary.purchase_links
    : (Array.isArray(preview?.purchaseLinks) ? preview.purchaseLinks : []);
  const summary = salePreviewSummary?.summary || null;

  const saleQty = toNumber(salePreviewRow?.quantity || salePreviewRow?.dispatch_qty || salePreviewRow?.unloading_qty || 0);
  const unloadingQty = toNumber(salePreviewRow?.unloading_qty || salePreviewRow?.quantity || 0);
  const shortageQtyAuto = Math.max(saleQty - unloadingQty, 0);
  const saleRate = toNumber(salePreviewRow?.rate || previewSource?.rate);
  const saleAmount = toNumber(summary?.gross_amount ?? preview.grossAmount ?? saleQty * saleRate);

  const saleAdditionalAmount = toNumber(
    summary?.additional_amount ??
    salePreviewSummary?.additional_amount ??
    salePreviewRow?.additional_amount ??
    previewSource?.additional_amount ??
    0
  );

  const saleFreightAutoAmount = saleBiltiFreightAmount !== null
    ? saleBiltiFreightAmount
    : toNumber(
        salePreviewSummary?.transport_charge ??
        salePreviewSummary?.summary?.transport_charge ??
        salePreviewRow?.transport_charge ??
        salePreviewRow?.freight ??
        0
      );
  const purchaseQty = hydratedPurchaseLinks.reduce((sum, item) => sum + toNumber(item.quantity ?? item.weight), 0);
  const purchaseAmount = hydratedPurchaseLinks.reduce((sum, item) => sum + toNumber(item.amount ?? (toNumber(item.quantity ?? item.weight) * toNumber(item.rate))), 0);
  const purchaseDeductionTotals = useMemo(() => {
    return hydratedPurchaseLinks.reduce((acc, item) => {
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
  }, [hydratedPurchaseLinks, toNumber]);
  const freightAmountForPurchaseAuto = saleFreightAutoAmount > 0 ? saleFreightAutoAmount : purchaseDeductionTotals.freight;
  const purchaseDeductionAutoRows = useMemo(() => ({
    claim: purchaseDeductionTotals.claim,
    labour: purchaseDeductionTotals.labour,
    // Sale Freight automatically flows into Purchase Freight. Admin can still override it manually below.
    freight: freightAmountForPurchaseAuto,
    cashDiscount: purchaseDeductionTotals.cashDiscount,
    tds: purchaseDeductionTotals.tds,
    other: purchaseDeductionTotals.other,
    adjustment: purchaseDeductionTotals.adjustment,
  }), [purchaseDeductionTotals, freightAmountForPurchaseAuto]);

  const purchaseDeductionFinal = {
    claim: purchaseManualMode.claim ? toNumber(purchaseManualValues.claim) : purchaseDeductionAutoRows.claim,
    labour: purchaseManualMode.labour ? toNumber(purchaseManualValues.labour) : purchaseDeductionAutoRows.labour,
    freight: purchaseManualMode.freight ? toNumber(purchaseManualValues.freight) : purchaseDeductionAutoRows.freight,
    cashDiscount: purchaseManualMode.cashDiscount ? toNumber(purchaseManualValues.cashDiscount) : purchaseDeductionAutoRows.cashDiscount,
    tds: purchaseManualMode.tds ? toNumber(purchaseManualValues.tds) : purchaseDeductionAutoRows.tds,
    other: purchaseManualMode.other ? toNumber(purchaseManualValues.other) : purchaseDeductionAutoRows.other,
    adjustment: purchaseManualMode.adjustment ? toNumber(purchaseManualValues.adjustment) : purchaseDeductionAutoRows.adjustment,
  };
  const purchaseFinalDeductionTotal = Object.values(purchaseDeductionFinal).reduce((sum, value) => sum + toNumber(value), 0);
  const purchaseNetAfterDeduction = purchaseAmount - purchaseFinalDeductionTotal + purchaseDeductionTotals.roundOff;

  const shortageAutoAmount = toNumber(salePreviewRow?.shortage_amount) || shortageQtyAuto * saleRate;
  const claimAutoAmount = toNumber(salePreviewRow?.claim_amount);
  const freightAutoAmount = saleFreightAutoAmount;
  const otherAutoAmount = toNumber(salePreviewRow?.other_deduction);

  const shortageAmount = manualMode.shortage ? toNumber(manualValues.shortage) : shortageAutoAmount;
  const claimAmount = manualMode.claim ? toNumber(manualValues.claim) : claimAutoAmount;
  const freightAmount = manualMode.freight ? toNumber(manualValues.freight) : freightAutoAmount;
  const otherAmount = manualMode.other ? toNumber(manualValues.other) : otherAutoAmount;
  const cdAutoAmount = toNumber(salePreviewRow?.cd_amount);
  const adjustmentAutoAmount = toNumber(salePreviewRow?.adjustment_amount);
  const tdsAutoAmount = toNumber(salePreviewRow?.tds_amount);
  const cdAmount = manualMode.cd ? toNumber(manualValues.cd) : cdAutoAmount;
  const adjustmentAmount = manualMode.adjustment ? toNumber(manualValues.adjustment) : adjustmentAutoAmount;
  const tdsAmount = manualMode.tds ? toNumber(manualValues.tds) : tdsAutoAmount;
  const roundOff = toNumber(salePreviewRow?.round_off);

  const totalDeduction = shortageAmount + claimAmount + freightAmount + otherAmount + cdAmount + adjustmentAmount + tdsAmount;
  const netSale = saleAmount - totalDeduction + saleAdditionalAmount + roundOff;
  const netPurchase = purchaseNetAfterDeduction;
  const profitLoss = netSale - netPurchase;

  const setModeValue = (key, checked) => {
    setManualMode((prev) => ({ ...prev, [key]: checked }));
    if (!checked) {
      const autoValue = {
        shortage: shortageAutoAmount,
        claim: claimAutoAmount,
        freight: freightAutoAmount,
        other: otherAutoAmount,
        cd: cdAutoAmount,
        adjustment: adjustmentAutoAmount,
        tds: tdsAutoAmount,
      }[key];
      setManualValues((prev) => ({ ...prev, [key]: Number(autoValue || 0).toFixed(2) }));
    }
  };

  const setPurchaseModeValue = (key, checked) => {
    if (!isAdmin) return;
    setPurchaseManualMode((prev) => ({ ...prev, [key]: checked }));
    if (!checked) {
      const autoValue = purchaseDeductionAutoRows[key] || 0;
      setPurchaseManualValues((prev) => ({ ...prev, [key]: Number(autoValue).toFixed(2) }));
    }
  };

  const handleReset = () => {
    setManualMode({ shortage: false, claim: false, freight: false, other: false, cd: false, adjustment: false, tds: false });
    setManualValues({
      shortage: shortageAutoAmount.toFixed(2),
      claim: claimAutoAmount.toFixed(2),
      freight: freightAutoAmount.toFixed(2),
      other: otherAutoAmount.toFixed(2),
      cd: cdAutoAmount.toFixed(2),
      adjustment: adjustmentAutoAmount.toFixed(2),
      tds: tdsAutoAmount.toFixed(2),
    });
    setPurchaseManualMode({ claim: false, labour: false, freight: false, cashDiscount: false, tds: false, other: false, adjustment: false });
    setPurchaseManualValues({
      claim: purchaseDeductionAutoRows.claim.toFixed(2),
      labour: purchaseDeductionAutoRows.labour.toFixed(2),
      freight: purchaseDeductionAutoRows.freight.toFixed(2),
      cashDiscount: purchaseDeductionAutoRows.cashDiscount.toFixed(2),
      tds: purchaseDeductionAutoRows.tds.toFixed(2),
      other: purchaseDeductionAutoRows.other.toFixed(2),
      adjustment: purchaseDeductionAutoRows.adjustment.toFixed(2),
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
      const saleType = salePreviewRow?.sale_type || salePreviewSummary?.sale?.sale_type || "direct";
      const locationId =
        salePreviewRow?.location_id ||
        salePreviewRow?.location?.id ||
        salePreviewSummary?.sale?.location_id ||
        salePreviewSummary?.location_id ||
        salePreviewSummary?.summary?.location_id ||
        "";
      const warehouseId =
        salePreviewRow?.warehouse_id ||
        salePreviewRow?.warehouse?.id ||
        salePreviewSummary?.sale?.warehouse_id ||
        salePreviewSummary?.warehouse_id ||
        salePreviewSummary?.summary?.warehouse_id ||
        "";
      const consigneeId =
        salePreviewRow?.consignee_id ||
        salePreviewRow?.consignee?.id ||
        salePreviewSummary?.sale?.consignee_id ||
        salePreviewSummary?.consignee_id ||
        salePreviewSummary?.summary?.consignee_id ||
        "";

      const purchaseGrossTotal = hydratedPurchaseLinks.reduce((sum, item) => {
        const purchase = item?.purchase_details || item || {};
        const qty = toNumber(item?.quantity ?? item?.weight ?? purchase.quantity);
        const rate = toNumber(item?.rate ?? purchase.rate);
        return sum + toNumber(item?.amount ?? purchase.amount ?? (qty * rate));
      }, 0);
      const purchaseDeductionUpdates = hydratedPurchaseLinks
        .map((item) => {
          const purchase = item?.purchase_details || item || {};
          const qty = toNumber(item?.quantity ?? item?.weight ?? purchase.quantity);
          const rate = toNumber(item?.rate ?? purchase.rate);
          const gross = toNumber(item?.amount ?? purchase.amount ?? (qty * rate));
          const ratio = purchaseGrossTotal > 0
            ? gross / purchaseGrossTotal
            : (hydratedPurchaseLinks.length ? 1 / hydratedPurchaseLinks.length : 0);
          const auto = {
            claim: toNumber(purchase.claim_amount ?? purchase.bags_claim),
            labour: toNumber(purchase.labour),
            freight: saleFreightAutoAmount > 0 ? saleFreightAutoAmount * ratio : toNumber(purchase.transport_charge),
            cashDiscount: toNumber(purchase.cd_amount),
            tds: toNumber(purchase.tds_amount),
            other: toNumber(purchase.other_deduction),
            adjustment: toNumber(purchase.adjustment_amount),
          };
          const final = {
            claim: purchaseManualMode.claim ? purchaseDeductionFinal.claim * ratio : auto.claim,
            labour: purchaseManualMode.labour ? purchaseDeductionFinal.labour * ratio : auto.labour,
            freight: purchaseManualMode.freight ? purchaseDeductionFinal.freight * ratio : auto.freight,
            cashDiscount: purchaseManualMode.cashDiscount ? purchaseDeductionFinal.cashDiscount * ratio : auto.cashDiscount,
            tds: purchaseManualMode.tds ? purchaseDeductionFinal.tds * ratio : auto.tds,
            other: purchaseManualMode.other ? purchaseDeductionFinal.other * ratio : auto.other,
            adjustment: purchaseManualMode.adjustment ? purchaseDeductionFinal.adjustment * ratio : auto.adjustment,
            roundOff: toNumber(purchase.round_off),
          };
          final.totalDeduction = Number((
            final.claim + final.labour + final.freight + final.cashDiscount +
            final.tds + final.other + final.adjustment
          ).toFixed(2));
          return {
            purchase_id: String(item?.purchase_id || item?.id || item?._id || "").trim(),
            final,
            manual_modes: { ...purchaseManualMode },
          };
        })
        .filter((item) => item.purchase_id);

      const payload = {
        deduction_only: true,
        sale_type: saleType,
        warehouse_id: warehouseId,
        location_id: locationId,
        consignee_id: consigneeId,
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
        additional_amount: saleAdditionalAmount,
        round_off: roundOff,
        total_deduction: totalDeduction,
        sale_deduction_manual_modes: { ...manualMode },
        purchase_deduction_updates: purchaseDeductionUpdates,
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
      { key: "cd", label: "CD", auto: cdAutoAmount, value: cdAmount },
      { key: "adjustment", label: "Adjustment", auto: adjustmentAutoAmount, value: adjustmentAmount },
      { key: "tds", label: "TDS", auto: tdsAutoAmount, value: tdsAmount },
    ],
    [formatDecimal4, shortageQtyAuto, shortageAutoAmount, claimAutoAmount, freightAutoAmount, otherAutoAmount, cdAutoAmount, adjustmentAutoAmount, tdsAutoAmount, shortageAmount, claimAmount, freightAmount, otherAmount, cdAmount, adjustmentAmount, tdsAmount]
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

        <div style={{ overflowX: "auto", paddingBottom: 2 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(6, minmax(145px, 1fr))", gap: 8, minWidth: 930 }}>
            {[
              { label: "Voucher No", value: preview.voucherNo, accent: "#0f766e", bg: "#ecfdf5" },
              { label: "Sale Type", value: preview.saleType, accent: "#1d4ed8", bg: "#eff6ff" },
              { label: "Date", value: preview.date, accent: "#7c3aed", bg: "#f5f3ff" },
              { label: "Location", value: preview.location, accent: "#0369a1", bg: "#f0f9ff" },
              { label: "Consignee", value: preview.consignee, accent: "#c2410c", bg: "#fff7ed" },
              { label: "Buyer / Account", value: preview.account, accent: "#0f766e", bg: "#f0fdfa" },
            ].map((item) => (
              <div key={item.label} style={{ border: `1px solid ${item.accent}33`, borderTop: `3px solid ${item.accent}`, borderRadius: 10, padding: "9px 10px", background: item.bg, minWidth: 0, boxSizing: "border-box" }}>
                <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 0.65, color: "#64748b", marginBottom: 3, fontWeight: 800 }}>{item.label}</div>
                <div style={{ fontSize: 13, fontWeight: 900, color: "#111827", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={item.value || "-"}>{item.value || "-"}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div style={{ border: "1px solid #d1d5db", borderRadius: 10, overflow: "hidden", background: "#fff" }}>
            <div style={{ padding: "10px 12px", background: "#e8f6f3", fontWeight: 800, color: "#115e59" }}>Purchase Details</div>
            <div style={{ padding: 12, overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead><tr><th style={th}>Bill</th><th style={th}>Farmer</th><th style={th}>Qty</th><th style={th}>Rate</th><th style={th}>Amount</th><th style={th}>Source</th></tr></thead>
                <tbody>
                  {hydratedPurchaseLinks.map((item, index) => {
                    const qty = toNumber(item.quantity ?? item.weight);
                    const rate = toNumber(item.rate);
                    const amount = toNumber(item.amount) || qty * rate;
                    const purchase = item?.purchase_details || item || {};
                    const farmerName = item?.farmer_name || purchase?.farmer_name || purchase?.farmer || purchase?.party_name || purchase?.company_name || "-";
                    return <tr key={`${item.purchase_id || item._id || index}`}><td style={td}>{item.voucher_no || purchase.voucher_no || "-"}</td><td style={td}>{farmerName}</td><td style={td}>{formatDecimal4(qty)}</td><td style={td}>{formatMoney(rate)}</td><td style={td}>{formatMoney(amount)}</td><td style={td}>{item.source === "auto" ? "Auto" : "Manual"}</td></tr>;
                  })}
                  {hydratedPurchaseLinks.length === 0 && <tr><td style={{ ...td, textAlign: "center" }} colSpan={6}>No purchase bill tagged. Press F10 Purchase Tag.</td></tr>}
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
                  <tr><td style={td}>Freight (Transport Bilti)</td><td style={{ ...td, fontWeight: 800, color: "#9a3412" }}>{formatMoney(freightAmount)}</td></tr>
                  <tr><td style={td}>Add Amount</td><td style={{ ...td, fontWeight: 900, color: "#166534" }}>+ {formatMoney(saleAdditionalAmount)}</td></tr>
                  <tr><td style={td}>Net Amount</td><td style={{ ...td, fontWeight: 900, color: "#0f766e" }}>{formatMoney(netSale)}</td></tr>
                  <tr><td style={td}>Buyer</td><td style={td}>{preview.party || previewSource?.buyer_name || previewSource?.buyer || previewSource?.party_name || previewSource?.company_name || "-"}</td></tr>
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
                <thead><tr><th style={th}>Particular</th><th style={th}>Auto</th><th style={th}>Manual</th><th style={th}>Final</th></tr></thead>
                <tbody>
                  {[
                    ["claim", "Claim"],
                    ["labour", "Labour"],
                    ["freight", "Freight / Transport"],
                    ["cashDiscount", "Cash Discount"],
                    ["tds", "TDS"],
                    ["other", "Other Deduction"],
                    ["adjustment", "Adjustment"],
                  ].map(([key, label]) => {
                    const autoValue = purchaseDeductionAutoRows[key] || 0;
                    const finalValue = purchaseDeductionFinal[key] || 0;
                    return (
                      <tr key={key}>
                        <td style={td}>{label}</td>
                        <td style={td}>{formatMoney(autoValue)}</td>
                        <td style={td}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 150 }}>
                            <label style={{ display: "inline-flex", alignItems: "center", gap: 5, color: purchaseManualMode[key] ? "#115e59" : "#475569", fontWeight: 800, fontSize: 11, whiteSpace: "nowrap" }}>
                              <input type="checkbox" checked={Boolean(purchaseManualMode[key])} disabled={!isAdmin} onChange={(e) => setPurchaseModeValue(key, e.target.checked)} />
                              Manual
                            </label>
                            <input type="number" step="0.01" value={purchaseManualValues[key]} disabled={!isAdmin || !purchaseManualMode[key]} onChange={(e) => setPurchaseManualValues((prev) => ({ ...prev, [key]: e.target.value }))} style={{ width: 105, padding: "7px 8px", border: "1px solid #cbd5e1", borderRadius: 7, background: purchaseManualMode[key] ? "#fff" : "#f8fafc" }} />
                          </div>
                        </td>
                        <td style={{ ...td, fontWeight: 800 }}>{formatMoney(finalValue)}</td>
                      </tr>
                    );
                  })}
                  <tr><td style={{ ...td, fontWeight: 800 }}>Total Deduction</td><td style={td}>{formatMoney(Object.values(purchaseDeductionAutoRows).reduce((sum, value) => sum + toNumber(value), 0))}</td><td style={td}>-</td><td style={{ ...td, fontWeight: 900 }}>{formatMoney(purchaseFinalDeductionTotal)}</td></tr>
                  <tr><td style={td}>Round Off</td><td style={td}>{formatMoney(purchaseDeductionTotals.roundOff)}</td><td style={td}>-</td><td style={{ ...td, fontWeight: 800 }}>{formatMoney(purchaseDeductionTotals.roundOff)}</td></tr>
                </tbody>
              </table>
              <div style={{ marginTop: 8, fontSize: 11, color: isAdmin ? "#166534" : "#64748b" }}>
                {isAdmin ? "Admin can switch a purchase deduction to Manual and enter a value." : "Automatic purchase deductions are shown. Manual deduction editing is available to Admin only."} Sale Freight automatically flows to Purchase Freight; Admin can override it manually. Use F10 Purchase Tag to change the purchase allocation.
              </div>
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
                        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 150 }}>
                          <label style={{ display: "inline-flex", alignItems: "center", gap: 5, color: manualMode[row.key] ? "#9a3412" : "#475569", fontWeight: 800, fontSize: 11, whiteSpace: "nowrap" }}>
                            <input type="checkbox" checked={Boolean(manualMode[row.key])} disabled={!isAdmin} onChange={(e) => setModeValue(row.key, e.target.checked)} />
                            Manual
                          </label>
                          <input type="number" step="0.01" value={manualValues[row.key]} disabled={!isAdmin || !manualMode[row.key]} onChange={(e) => setManualValues((prev) => ({ ...prev, [row.key]: e.target.value }))} style={{ width: 105, padding: "7px 8px", border: "1px solid #cbd5e1", borderRadius: 7, background: manualMode[row.key] ? "#fff" : "#f8fafc" }} />
                        </div>
                      </td>
                      <td style={{ ...td, fontWeight: 800 }}>{formatMoney(row.value)}</td>
                    </tr>
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

        <div style={{
          marginTop: 12,
          padding: "13px 16px",
          borderRadius: 12,
          background: "linear-gradient(135deg,#ecfdf5,#f0fdfa)",
          border: "1px solid #99f6e4",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 900, textTransform: "uppercase", letterSpacing: 0.7, color: "#0f766e" }}>Purchase Net After Deduction</div>
            <div style={{ marginTop: 3, fontSize: 12, color: "#64748b" }}>Purchase amount after all final purchase deductions and round off.</div>
          </div>
          <div style={{ fontSize: 24, fontWeight: 950, color: "#115e59", whiteSpace: "nowrap" }}>{formatMoney(purchaseNetAfterDeduction)}</div>
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
