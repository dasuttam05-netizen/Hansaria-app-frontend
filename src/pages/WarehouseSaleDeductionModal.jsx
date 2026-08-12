import React, { useMemo } from "react";

export default function WarehouseSaleDeductionModal({
  modalOverlayStyle,
  paymentAdjustModalStyle,
  btnAction,
  inp,
  readOnlyInp,
  th,
  td,
  formData,
  selectedSalePassBill,
  saleDispatchQty,
  saleUnloadingQty,
  saleVoucherPassBills = [],
  saleBillSearch,
  setSaleBillSearch,
  editId,
  setShowSaleDeductionModal,
  handleChange,
  formatDecimal4,
  formatMoney,
  toNumber,
  selectSaleVoucherForPass,
  saveSaleVoucherPass,
  saveSaleVoucherPassAndNew,
  saleShortageQty,
  saleShortageAmount,
  saleCashDiscountAmount,
  saleBillAmountFromData,
  saleNetReceivablePreview,
  saleQualityDeduction,
  saleTransportCharge = 0,
  tdsEligible,
  autoTdsAmount,
}) {
  const rows = Array.isArray(saleVoucherPassBills) ? saleVoucherPassBills : [];
  const filteredBills = useMemo(() => {
    const q = String(saleBillSearch || "").trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => [
      row.voucher_no, row.bill_no, row.lorry_no, row.buyer_name, row.company_name,
    ].some((value) => String(value || "").toLowerCase().includes(q)));
  }, [rows, saleBillSearch]);

  const manualTds = String(formData.tds_amount ?? "").trim() !== "";
  const displayedTds = manualTds ? toNumber(formData.tds_amount) : (tdsEligible ? autoTdsAmount : 0);
  const claimAmount = String(formData.claim_amount ?? "").trim() !== ""
    ? toNumber(formData.claim_amount)
    : saleShortageAmount;
  const otherDeduction = String(formData.other_deduction ?? "").trim() !== ""
    ? toNumber(formData.other_deduction)
    : saleQualityDeduction;

  return (
    <div style={modalOverlayStyle}>
      <div style={{ ...paymentAdjustModalStyle, width: "min(1180px, 96vw)", maxHeight: "92vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 14 }}>
          <div>
            <h3 style={{ margin: 0 }}>Sale Voucher Pass — F2</h3>
            <div style={{ marginTop: 4, color: "#64748b", fontSize: 12 }}>
              Enter unloading quantity/date and all applicable deductions before passing the sale voucher.
            </div>
          </div>
          <button type="button" onClick={() => setShowSaleDeductionModal(false)} style={{ ...btnAction, background: "#64748b" }}>
            Close
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "minmax(280px, 1fr) minmax(280px, 1fr)", gap: 12 }}>
          <div style={{ border: "1px solid #dbe4ef", borderRadius: 10, padding: 12, background: "#f8fafc" }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Sale Bill</label>
            <input
              value={saleBillSearch || ""}
              onChange={(e) => setSaleBillSearch(e.target.value)}
              placeholder="Search voucher / lorry / buyer"
              style={inp}
            />
            <div style={{ marginTop: 8, maxHeight: 180, overflowY: "auto", border: "1px solid #e2e8f0", borderRadius: 8, background: "#fff" }}>
              {filteredBills.map((row) => {
                const id = row.id || row._id;
                const active = String(id) === String(editId);
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => selectSaleVoucherForPass(id)}
                    style={{ width: "100%", textAlign: "left", border: "none", borderBottom: "1px solid #edf2f7", padding: "9px 10px", cursor: "pointer", background: active ? "#e6fffb" : "#fff" }}
                  >
                    <strong>{row.voucher_no || row.bill_no || "-"}</strong>
                    <span style={{ marginLeft: 8, color: "#64748b" }}>{row.buyer_name || row.company_name || ""}</span>
                    <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                      Qty {formatDecimal4(row.quantity || row.dispatch_qty || 0)} · Rate {formatMoney(row.rate || 0)} · {row.lorry_no || "No lorry"}
                    </div>
                  </button>
                );
              })}
              {!filteredBills.length && <div style={{ padding: 12, color: "#64748b", fontSize: 12 }}>No sale bill found.</div>}
            </div>
          </div>

          <div style={{ border: "1px solid #dbe4ef", borderRadius: 10, padding: 12, background: "#fff" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
              <div><label style={{ fontSize: 12, fontWeight: 700 }}>Voucher No</label><input value={formData.voucher_no || ""} readOnly style={readOnlyInp} /></div>
              <div><label style={{ fontSize: 12, fontWeight: 700 }}>Loading Date</label><input name="date" type="date" value={formData.date || ""} onChange={handleChange} style={inp} /></div>
              <div><label style={{ fontSize: 12, fontWeight: 700 }}>Unloading Date *</label><input name="unloading_date" type="date" value={formData.unloading_date || ""} onChange={handleChange} style={inp} /></div>
              <div><label style={{ fontSize: 12, fontWeight: 700 }}>Due Days</label><input name="due_days" type="number" min="0" value={formData.due_days || ""} onChange={handleChange} style={inp} /></div>
              <div><label style={{ fontSize: 12, fontWeight: 700 }}>Due Date</label><input name="due_date" type="date" value={formData.due_date || ""} onChange={handleChange} style={inp} /></div>
              <div><label style={{ fontSize: 12, fontWeight: 700 }}>Unloading Qty *</label><input name="unloading_qty" type="number" min="0" step="0.0001" value={formData.unloading_qty || ""} onChange={handleChange} style={inp} /></div>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 14, overflowX: "auto", border: "1px solid #dbe4ef", borderRadius: 10 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead><tr style={{ background: "#0f766e", color: "#fff" }}>
              <th style={th}>Dispatch Qty</th><th style={th}>Unloading Qty</th><th style={th}>Shortage Qty</th><th style={th}>Rate</th><th style={th}>Gross Amount</th><th style={th}>Net Receivable</th>
            </tr></thead>
            <tbody><tr>
              <td style={td}>{formatDecimal4(saleDispatchQty)}</td><td style={td}>{formatDecimal4(saleUnloadingQty)}</td><td style={td}>{formatDecimal4(saleShortageQty)}</td><td style={td}>{formatMoney(formData.rate || 0)}</td><td style={td}>{formatMoney(saleBillAmountFromData(formData))}</td><td style={td}><strong>{formatMoney(saleNetReceivablePreview)}</strong></td>
            </tr></tbody>
          </table>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(160px, 1fr))", gap: 10, marginTop: 14 }}>
          <div><label style={{ fontSize: 12, fontWeight: 700 }}>Claim Amount</label><input name="claim_amount" type="number" step="0.01" min="0" value={formData.claim_amount || ""} onChange={handleChange} placeholder={formatMoney(saleShortageAmount)} style={inp} /></div>
          <div><label style={{ fontSize: 12, fontWeight: 700 }}>Other Deduction</label><input name="other_deduction" type="number" step="0.01" min="0" value={formData.other_deduction || ""} onChange={handleChange} placeholder={formatMoney(saleQualityDeduction)} style={inp} /></div>
          <div><label style={{ fontSize: 12, fontWeight: 700 }}>CD %</label><input name="cd_percent" type="number" step="0.0001" min="0" value={formData.cd_percent || ""} onChange={handleChange} style={inp} /></div>
          <div><label style={{ fontSize: 12, fontWeight: 700 }}>CD Amount</label><input value={formatMoney(saleCashDiscountAmount)} readOnly style={readOnlyInp} /></div>
          <div><label style={{ fontSize: 12, fontWeight: 700 }}>TDS Amount</label><input name="tds_amount" type="number" step="0.01" min="0" value={formData.tds_amount || ""} onChange={handleChange} placeholder={tdsEligible ? formatMoney(autoTdsAmount) : "0.00"} style={inp} /></div>
          <div><label style={{ fontSize: 12, fontWeight: 700 }}>Adjustment</label><input name="adjustment_amount" type="number" step="0.01" min="0" value={formData.adjustment_amount || ""} onChange={handleChange} style={inp} /></div>
          <div><label style={{ fontSize: 12, fontWeight: 700 }}>Transport Charge</label><input name="transport_charge" type="number" step="0.01" min="0" value={formData.transport_charge || ""} onChange={handleChange} style={inp} /></div>
          <div><label style={{ fontSize: 12, fontWeight: 700 }}>Round Off</label><input name="round_off" type="number" step="0.01" value={formData.round_off || ""} onChange={handleChange} style={inp} /></div>
        </div>

        <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
          <div style={{ padding: 10, borderRadius: 8, background: "#f8fafc", border: "1px solid #e2e8f0" }}><small>Claim</small><strong style={{ display: "block" }}>Rs.{formatMoney(claimAmount)}</strong></div>
          <div style={{ padding: 10, borderRadius: 8, background: "#f8fafc", border: "1px solid #e2e8f0" }}><small>TDS</small><strong style={{ display: "block" }}>Rs.{formatMoney(displayedTds)}</strong></div>
          <div style={{ padding: 10, borderRadius: 8, background: "#ecfdf5", border: "1px solid #a7f3d0" }}><small>Net Receivable</small><strong style={{ display: "block", fontSize: 18 }}>Rs.{formatMoney(saleNetReceivablePreview)}</strong></div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, flexWrap: "wrap", marginTop: 16 }}>
          <button type="button" onClick={() => setShowSaleDeductionModal(false)} style={{ ...btnAction, background: "#64748b" }}>Cancel</button>
          <button type="button" onClick={saveSaleVoucherPassAndNew} style={{ ...btnAction, background: "#2563eb" }}>Save & New Bill</button>
          <button type="button" onClick={saveSaleVoucherPass} style={{ ...btnAction, background: "#0f766e" }}>Save F2 Voucher Pass</button>
        </div>
      </div>
    </div>
  );
}
