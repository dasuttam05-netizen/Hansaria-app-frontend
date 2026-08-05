import React from "react";

function WarehouseSaleDeductionModal({
  modalOverlayStyle,
  paymentAdjustModalStyle,
  btnAction,
  inp,
  lbl,
  readOnlyInp,
  th,
  td,
  formData,
  warehouses,
  employees,
  buyerNames,
  filteredConsignees,
  selectedLocationName,
  selectedSalePassBill,
  saleDispatchQty,
  saleUnloadingQty,
  saleTotalQtyPreview,
  selectedSalePassJourneyRows,
  selectedSalePassJourneyRemainingQty,
  saleVoucherPassBills,
  saleBillSearch,
  setSaleBillSearch,
  journeyTemplateId,
  setJourneyTemplateId,
  editId,
  setShowSaleDeductionModal,
  handleChange,
  renderAccountSelect,
  openSaleJourneyReport,
  applyAddQty,
  applyJourneyTemplate,
  getBuyerName,
  getJourneySourceLabel,
  formatLedgerDate,
  formatDecimal4,
  formatMoney,
  toNumber,
  selectSaleVoucherForPass,
  saveSaleVoucherPass,
  saveSaleVoucherPassAndNew,
  saleQualityDeduction,
  saleCashDiscountAmount,
  saleBillAmountFromData,
  tdsEligible,
  autoTdsAmount,
  saleRemainingQty,
  saleShortageQty,
  saleShortageAmount,
  saleNetReceivablePreview,
}) {
  const filteredSaleBills = saleVoucherPassBills.filter((row) => {
    const search = String(saleBillSearch || "").trim().toLowerCase();
    if (!search) return true;
    return [row.voucher_no, row.date, row.lorry_no, row.reference_id, getBuyerName(row), row.consignee_name]
      .some((value) => String(value || "").toLowerCase().includes(search));
  });
  return (
    <div style={modalOverlayStyle}>
      <div style={paymentAdjustModalStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <div>
            <h3 style={{ margin: 0 }}>Sale Voucher Pass</h3>
            <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>
              Select a sale bill, enter unloading, then save shortage, deduction and TDS separately.
            </div>
          </div>
          <button type="button" onClick={() => setShowSaleDeductionModal(false)} style={{ ...btnAction, background: "#64748b" }}>
            Close
          </button>
        </div>

        <div style={{ marginTop: 14, padding: "10px 12px", border: "1px solid #d7dce4", borderRadius: 8, background: "#f8fafc" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#0f766e", marginBottom: 4 }}>Sale Unloading / Journey (Outward-style)</div>
          <div style={{ fontSize: 12, color: "#475569", lineHeight: 1.5 }}>
            Select a sale bill, enter unloading qty, rate, bill no and other details manually. Save this unloading leg and Save & New will create the next bill for the remaining / palti quantity.
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginTop: 14 }}>
          <div style={{ gridColumn: "1 / -1", fontSize: 12, fontWeight: 700, color: "#334155" }}>Bill Details</div>
          <div>
            <label style={lbl}>Warehouse</label>
            <select name="warehouse_id" value={formData.warehouse_id} onChange={handleChange} style={inp}>
              <option value="">Select Warehouse</option>
              {warehouses.map((w) => (
                <option key={w.id || w._id} value={w.id || w._id}>{w.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={lbl}>Location</label>
            <input value={selectedLocationName || ""} readOnly style={readOnlyInp} />
          </div>
          <div>
            <label style={lbl}>Employee</label>
            <select name="employee_id" value={formData.employee_id} onChange={handleChange} style={inp}>
              <option value="">Select Employee</option>
              {employees.map((e) => (
                <option key={e.id || e._id} value={e.id || e._id}>{e.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={lbl}>Account</label>
            {renderAccountSelect(inp)}
          </div>
          <div style={{ gridColumn: "1 / -1", border: "1px solid #dbe3ef", borderRadius: 8, background: "#fff", padding: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#0f766e", marginBottom: 6 }}>Selected Bill Summary</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10, fontSize: 12, alignItems: "end" }}>
              <div>
                <label style={lbl}>Buyer</label>
                <select name="buyer_id" value={formData.buyer_id || formData.company_id} onChange={handleChange} style={inp}>
                  <option value="">Select Buyer</option>
                  {buyerNames.map((buyer) => (
                    <option key={buyer.id || buyer._id} value={buyer.id || buyer._id}>{buyer.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={lbl}>Consignee</label>
                <select name="consignee_id" value={formData.consignee_id} onChange={handleChange} style={inp}>
                  <option value="">{formData.buyer_id || formData.company_id ? "Select Consignee" : "Select Buyer First"}</option>
                  {filteredConsignees.map((c) => (
                    <option key={c.id || c._id} value={c.id || c._id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={lbl}>Rate</label>
                <input type="number" step="0.0001" name="rate" value={formData.rate} onChange={handleChange} style={inp} placeholder="Rate for next bill" />
              </div>
              <div>
                <label style={lbl}>Lorry No</label>
                <input value={selectedSalePassBill?.lorry_no || formData.lorry_no || ""} readOnly style={readOnlyInp} />
              </div>
              <div>
                <label style={lbl}>Remaining Qty</label>
                <input value={formatDecimal4(Math.max(saleDispatchQty - saleUnloadingQty, 0))} readOnly style={readOnlyInp} />
              </div>
              <div>
                <label style={lbl}>Extra Qty for Next Bill</label>
                <input type="number" step="0.0001" name="add_qty" value={formData.add_qty} onChange={handleChange} style={inp} placeholder="Optional extra qty" />
              </div>
              <div>
                <label style={lbl}>Next Bill Qty</label>
                <input value={formatDecimal4(saleTotalQtyPreview)} readOnly style={readOnlyInp} />
              </div>
            </div>
            <div style={{ marginTop: 8, fontSize: 11, color: "#64748b" }}>
              Same lorry will stay fixed. Buyer, consignee, account and add qty can change for every next leg before save.
            </div>
          </div>

          <div style={{ gridColumn: "1 / -1", border: "1px solid #cfe6e2", borderRadius: 8, background: "#f7fffd", padding: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#0f766e", marginBottom: 3 }}>Journey Chain</div>
                <div style={{ fontSize: 12, color: "#475569" }}>
                  First to last unloading, transfer, palti or godown move in one chain.
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <button type="button" onClick={openSaleJourneyReport} style={{ ...btnAction, background: "#0f766e" }} disabled={!selectedSalePassBill && !formData.lorry_no}>
                  Open Journey Report
                </button>
                <button type="button" onClick={() => applyAddQty(5)} style={{ ...btnAction, background: "#2563eb" }}>
                  +5
                </button>
                <button type="button" onClick={() => applyAddQty(10)} style={{ ...btnAction, background: "#2563eb" }}>
                  +10
                </button>
                <button type="button" onClick={() => applyAddQty(Math.max(saleDispatchQty - saleUnloadingQty, 0))} style={{ ...btnAction, background: "#2563eb" }}>
                  +Remaining
                </button>
                <select value={journeyTemplateId} onChange={(e) => setJourneyTemplateId(e.target.value) || applyJourneyTemplate(e.target.value)} style={inp} disabled={!selectedSalePassJourneyRows.length}>
                  <option value="">Use previous leg</option>
                  {selectedSalePassJourneyRows.map((row, index) => (
                    <option key={row.id || row._id || index} value={row.id || row._id}>
                      {`${index + 1}. ${row.voucher_no || row.bill_no || "-"} | ${row.lorry_no || "-"} | ${getBuyerName(row)} | ${row.consignee_name || "-"}`}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div style={{ marginTop: 10, overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr>
                    <th style={th}>Leg</th>
                    <th style={th}>Voucher</th>
                    <th style={th}>Date</th>
                    <th style={th}>Lorry</th>
                    <th style={th}>Source / Remark</th>
                    <th style={th}>Buyer</th>
                    <th style={th}>Consignee</th>
                    <th style={th}>Rate</th>
                    <th style={th}>Dispatch</th>
                    <th style={th}>Unload</th>
                    <th style={th}>Remain</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedSalePassJourneyRows.length > 0 ? (
                    selectedSalePassJourneyRows.map((row, index) => {
                      const dispatchQty = toNumber(row.dispatch_qty || row.quantity || row.total_quantity || row.unloading_qty || 0);
                      const unloadQty = toNumber(row.unloading_qty || 0);
                      const remainQty = Math.max(dispatchQty - unloadQty, 0);
                      return (
                        <tr key={row.id || row._id || index}>
                          <td style={td}>{index + 1}</td>
                          <td style={td}>{row.voucher_no || row.bill_no || "-"}</td>
                          <td style={td}>{formatLedgerDate(row.date || row.bill_date || "")}</td>
                          <td style={td}>{row.lorry_no || row.reference_id || "-"}</td>
                          <td style={td}>{getJourneySourceLabel(row)}</td>
                          <td style={td}>{getBuyerName(row)}</td>
                          <td style={td}>{row.consignee_name || "-"}</td>
                          <td style={td}>{formatMoney(row.rate || 0)}</td>
                          <td style={td}>{formatDecimal4(dispatchQty)}</td>
                          <td style={td}>{formatDecimal4(unloadQty)}</td>
                          <td style={td}>{formatDecimal4(remainQty)}</td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={11} style={{ ...td, textAlign: "center", padding: 12 }}>
                        No journey history found yet for this lorry.
                      </td>
                    </tr>
                  )}
                </tbody>
                {selectedSalePassJourneyRows.length > 0 && (
                  <tfoot>
                    <tr style={{ background: "#ecfeff", fontWeight: 800 }}>
                      <td style={td} colSpan={7}>Total</td>
                      <td style={td}>{formatDecimal4(selectedSalePassJourneyRows.reduce((sum, row) => sum + toNumber(row.dispatch_qty || row.quantity || row.total_quantity || row.unloading_qty || 0), 0))}</td>
                      <td style={td}>{formatDecimal4(selectedSalePassJourneyRows.reduce((sum, row) => sum + toNumber(row.unloading_qty || 0), 0))}</td>
                      <td style={td}>{formatDecimal4(selectedSalePassJourneyRemainingQty)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>

          <div style={{ gridColumn: "1 / -1" }}>
            <label style={lbl}>Sale Bill</label>
            <input value={saleBillSearch} onChange={(e) => setSaleBillSearch(e.target.value)} style={inp} placeholder="Search by bill no, lorry no, buyer, consignee" />
            <div style={{ maxHeight: 240, marginTop: 8, overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr>
                    <th style={th}>S.L</th>
                    <th style={th}>Bill</th>
                    <th style={th}>Date</th>
                    <th style={th}>Lorry No</th>
                    <th style={th}>Buyer</th>
                    <th style={th}>Consignee</th>
                    <th style={th}>Qty</th>
                    <th style={th}>Rate</th>
                    <th style={th}>Amount</th>
                    <th style={th}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSaleBills.map((row, index) => {
                    const rowId = row.id || row._id;
                    const selected = String(rowId) === String(editId);
                    return (
                      <tr key={rowId} style={{ background: selected ? "#dcfce7" : index % 2 ? "#f8fafc" : "#fff" }}>
                        <td style={td}>{index + 1}</td>
                        <td style={td}>{row.voucher_no || "-"}</td>
                        <td style={td}>{formatLedgerDate(row.date)}</td>
                        <td style={td}>{row.lorry_no || row.reference_id || "-"}</td>
                        <td style={td}>{getBuyerName(row)}</td>
                        <td style={td}>{row.consignee_name || "-"}</td>
                        <td style={td}>{formatDecimal4(row.quantity || row.total_quantity || 0)}</td>
                        <td style={td}>{formatMoney(row.rate || 0)}</td>
                        <td style={td}>{formatMoney(row.total_amount || row.amount || 0)}</td>
                        <td style={td}>
                          <button type="button" onClick={() => selectSaleVoucherForPass(rowId)} style={{ ...btnAction, background: selected ? "#15803d" : "#2563eb" }}>
                            {selected ? "Selected" : "Select"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredSaleBills.length === 0 && (
                    <tr>
                      <td colSpan={10} style={{ ...td, textAlign: "center", padding: 14 }}>
                        No sale bill found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <div>
            <label style={lbl}>Bill No</label>
            <input type="text" value={formData.bill_no || formData.voucher_no} onChange={(e) => handleChange(e)} style={inp} placeholder="Manual bill no or leave blank for auto" />
          </div>
          <div>
            <label style={lbl}>Bill Date</label>
            <input type="date" value={formData.bill_date || formData.date} onChange={(e) => handleChange(e)} style={inp} />
          </div>
          <div>
            <label style={lbl}>Lorry No</label>
            <input type="text" value={formData.lorry_no} onChange={(e) => handleChange(e)} style={inp} placeholder="Lorry / Trip" />
          </div>
          <div>
            <label style={lbl}>Journey Note</label>
            <input type="text" value={formData.journey_note || formData.description} onChange={(e) => handleChange(e)} style={inp} placeholder="Loading / reject / palti / godown note" />
          </div>
          <div style={{ gridColumn: "1 / -1", fontSize: 12, fontWeight: 700, color: "#334155" }}>Unloading / Leg Details</div>
          <div>
            <label style={lbl}>Dispatch Weight</label>
            <input type="text" value={formatDecimal4(saleDispatchQty)} readOnly style={readOnlyInp} />
          </div>
          <div>
            <label style={lbl}>Unloading Date</label>
            <input type="date" value={formData.unloading_date} onChange={(e) => handleChange(e)} style={inp} />
          </div>
          <div>
            <label style={lbl}>Due Days</label>
            <input type="number" min="0" value={formData.due_days || ""} onChange={(e) => handleChange(e)} style={inp} />
          </div>
          <div>
            <label style={lbl}>Due Date</label>
            <input type="date" value={formData.due_date} readOnly style={readOnlyInp} />
          </div>
          <div>
            <label style={lbl}>Unloading Weight (Qty)</label>
            <input type="number" step="0.0001" value={formData.unloading_qty} onChange={(e) => handleChange(e)} style={inp} placeholder="Weight" />
          </div>
          <div>
            <label style={lbl}>Reject Qty</label>
            <input type="number" step="0.0001" value={formData.reject_qty || ""} onChange={(e) => handleChange(e)} style={inp} placeholder="Reject quantity" />
          </div>
          <div>
            <label style={lbl}>Shortage Weight</label>
            <input type="text" value={formatDecimal4(saleShortageQty)} readOnly style={readOnlyInp} />
          </div>
          <div>
            <label style={lbl}>Shortage Amount</label>
            <input type="text" value={formatMoney(saleShortageAmount)} readOnly style={readOnlyInp} />
          </div>
          <div>
            <label style={lbl}>Moisture</label>
            <input type="number" step="0.0001" value={formData.moisture} onChange={(e) => handleChange(e)} style={inp} placeholder="Moisture %" />
          </div>
          <div>
            <label style={lbl}>Dunky</label>
            <input type="number" step="0.0001" value={formData.dunki} onChange={(e) => handleChange(e)} style={inp} placeholder="Dunky %" />
          </div>
          <div>
            <label style={lbl}>Fungus</label>
            <input type="number" step="0.0001" value={formData.fungus} onChange={(e) => handleChange(e)} style={inp} placeholder="Fungus %" />
          </div>
          <div>
            <label style={lbl}>Discolour</label>
            <input type="number" step="0.0001" value={formData.discolour} onChange={(e) => handleChange(e)} style={inp} placeholder="Discolour %" />
          </div>
          <div>
            <label style={lbl}>Others</label>
            <input type="number" step="0.0001" value={formData.others} onChange={(e) => handleChange(e)} style={inp} placeholder="Others %" />
          </div>
          <div>
            <label style={lbl}>Total Deduction (Auto)</label>
            <input type="text" value={formatMoney(saleQualityDeduction + saleCashDiscountAmount)} readOnly style={readOnlyInp} />
          </div>
          <div>
            <label style={lbl}>CD %</label>
            <input type="number" step="0.0001" value={formData.cd_percent} onChange={(e) => handleChange(e)} style={inp} />
          </div>
          <div>
            <label style={lbl}>CD Amount</label>
            <input type="text" value={formatMoney(saleCashDiscountAmount)} readOnly style={readOnlyInp} />
          </div>
          <div>
            <label style={lbl}>TDS</label>
            <input type="number" step="0.0001" value={tdsEligible ? formatMoney(autoTdsAmount) : formData.tds_amount} onChange={(e) => handleChange(e)} readOnly={tdsEligible} style={tdsEligible ? readOnlyInp : inp} />
          </div>
          <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <div style={{ fontSize: 12, color: "#475569" }}>
              Same lorry can carry multiple legs. Each unloading/bill is saved as a separate entry, just like outward buyer adjustment.
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#0f766e" }}>
              Remaining after this leg: {formatDecimal4(saleRemainingQty)}
            </div>
          </div>
        </div>

        <div style={{ marginTop: 16, padding: 12, background: "#f8fafc", borderRadius: 8, border: "1px solid #cbd5e1" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, fontSize: 13 }}>
            <div><strong>Gross Amount:</strong> Rs.{formatMoney(saleBillAmountFromData(formData))}</div>
            <div><strong>Shortage:</strong> Rs.{formatMoney(saleShortageAmount)}</div>
            <div><strong>Deduction:</strong> Rs.{formatMoney(saleQualityDeduction)}</div>
            <div><strong>Cash Discount:</strong> Rs.{formatMoney(saleCashDiscountAmount)}</div>
            <div><strong>TDS:</strong> Rs.{formatMoney(tdsEligible ? autoTdsAmount : formData.tds_amount)}</div>
            <div><strong>Round Off:</strong> Rs.{formatMoney(formData.round_off)}</div>
            <div style={{ fontWeight: 700, color: "#0f766e", fontSize: 14 }}><strong>Net Receivable:</strong> Rs.{formatMoney(saleNetReceivablePreview)}</div>
          </div>
          {tdsEligible && (
            <div style={{ marginTop: 8, color: "#92400e", fontSize: 13 }}>
              Party sale total crossed Rs.50,00,000, so TDS is auto-calculated at 0.1%.
            </div>
          )}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 14 }}>
          <button type="button" onClick={saveSaleVoucherPass} style={btnAction}>
            Final Save
          </button>
          <button type="button" onClick={saveSaleVoucherPassAndNew} style={{ ...btnAction, background: "#0f766e" }}>
            Save & New
          </button>
        </div>
      </div>
    </div>
  );
}

export default React.memo(WarehouseSaleDeductionModal);
