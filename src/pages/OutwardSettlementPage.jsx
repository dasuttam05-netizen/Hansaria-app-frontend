import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { formatDisplayDate } from "../utils/date";

export default function OutwardSettlementPage({ outward, onSaved }) {
  const API_BASE = "/api";

  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState(null);
  const [isFreightAutoLocked, setIsFreightAutoLocked] = useState(false);
  const [formData, setFormData] = useState({
    dispatch_qty: "",
    unloading_qty: "",
    sale_rate: "",
    company_rate: "",
    freight: "",
    outward_labour_charges: "",
    other_charges: "",
    charge_bearer: "self",
    narration: "",
  });

  const num = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  const fetchSettlement = async () => {
    if (!outward?.id) {
      return;
    }

    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/outward-settlement/${outward.id}`);
      setMeta(res.data);
      const s = res.data.settlement || {};
      let freightValue = s.freight ?? "";

      try {
        const biltiRes = await axios.get(`${API_BASE}/transport-bilti/${outward.id}`);
        const biltiFreight = Number(biltiRes?.data?.net_amount || 0);

        // If transport payment exists, always lock freight in settlement.
        if (biltiFreight > 0) {
          freightValue = biltiFreight;
          setIsFreightAutoLocked(true);
        } else {
          setIsFreightAutoLocked(false);
        }
      } catch (biltiErr) {
        console.error(biltiErr);
        setIsFreightAutoLocked(false);
      }

      setFormData({
        dispatch_qty: s.dispatch_qty ?? "",
        unloading_qty: s.unloading_qty ?? "",
        sale_rate: s.sale_rate ?? "",
        company_rate: s.company_rate ?? "",
        freight: freightValue,
        outward_labour_charges: s.outward_labour_charges ?? "",
        other_charges: s.other_charges ?? "",
        charge_bearer: s.charge_bearer || "self",
        narration: s.narration || "",
      });
    } catch (err) {
      console.error(err);
      setIsFreightAutoLocked(false);
      alert("Settlement load failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettlement();
  }, [outward?.id]);

  const calculation = useMemo(() => {
  const dispatchQty = num(formData.dispatch_qty);
  const unloadingQty = num(formData.unloading_qty);
  const saleRate = num(formData.sale_rate);
  const companyRate = num(formData.company_rate);
  const freight = num(formData.freight);
  const labour = num(formData.outward_labour_charges);
  const other = num(formData.other_charges);

  const adjustmentDetails = meta?.adjustment_details || [];

  const settlementWeight = adjustmentDetails.reduce(
    (sum, item) => sum + num(item.settlement_weight),
    0
  );

  const shortageQty = Math.max(dispatchQty - unloadingQty, 0);

  const saleAmount = dispatchQty * saleRate;

  // ✅ Total Shortage Amount (Sale Rate)
  const totalShortageAmountSale = adjustmentDetails.reduce((sum, item) => {
    const shortQtyPerLine =
      dispatchQty > 0
        ? (num(item.settlement_weight) / dispatchQty) * shortageQty
        : 0;

    return sum + shortQtyPerLine * saleRate;
  }, 0);

  // ✅ Net Receivable (ALL LESS)
  const grossAmount = Math.max(
    saleAmount - freight - labour - other - totalShortageAmountSale,
    0
  );

  // ✅ Company Payable = Sum of Net Payable (Table match)
  const companyPayable = adjustmentDetails.reduce((sum, item) => {
    const weight = num(item.settlement_weight);

    const freightPerMt = dispatchQty > 0 ? freight / dispatchQty : 0;
    const labourPerMt = dispatchQty > 0 ? labour / dispatchQty : 0;
    const otherPerMt = dispatchQty > 0 ? other / dispatchQty : 0;

    const amount = weight * companyRate;

    const shortQtyPerLine =
      dispatchQty > 0 ? (weight / dispatchQty) * shortageQty : 0;

    const shortageAmount = shortQtyPerLine * companyRate;

    const netPayable =
      amount -
      weight * freightPerMt -
      weight * labourPerMt -
      weight * otherPerMt -
      shortageAmount;

    return sum + netPayable;
  }, 0);

  // ✅ Profit / Loss
  const receivableAmount = grossAmount - companyPayable;

  return {
    settlementWeight,
    shortageQty,
    saleAmount,
    grossAmount,
    companyPayable,
    receivableAmount,
  };
}, [formData, meta]);

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSave = async () => {
    try {
      await axios.post(`${API_BASE}/outward-settlement/save`, {
        outward_id: outward.id,
        ...formData,
      });
      alert("Settlement saved successfully");
      fetchSettlement();
      if (onSaved) {
        onSaved();
      }
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.error || "Settlement save failed");
    }
  };

  const card = {
    background: "#ffffff",
    border: "1px solid #b8c4cf",
    borderRadius: 4,
    padding: 12,
    boxShadow: "none",
  };

  const input = {
    padding: "8px 10px",
    border: "1px solid #aebdca",
    borderRadius: 4,
    fontSize: 13,
    width: "100%",
    background: "#ffffff",
    color: "#000000",
  };

  const label = {
    fontSize: 12,
    color: "#000000",
    marginBottom: 4,
    display: "block",
    fontWeight: 600,
    letterSpacing: "0.1px",
  };

  if (loading) {
    return <div style={card}>Loading settlement...</div>;
  }

  return (
    <div style={{ padding: 10, background: "#e9eef3", borderRadius: 4, border: "1px solid #c5d0da" }}>
      <div style={{ ...card, marginBottom: 10 }}>
        <h2 style={{ margin: 0, color: "#000000", fontWeight: 700, fontSize: 20, letterSpacing: "0.2px", borderBottom: "1px solid #c6d2dc", paddingBottom: 8 }}>Outward Settlement</h2>
        <div style={{ display: "grid", gap: 18, marginTop: 14 }}>
          <div style={compactGridStyle}>
            <div style={miniCardStyle("92px")}>
              <div style={miniHeadStyle}>Voucher No</div>
              <div style={miniBodyStyle}>{meta?.voucher_no || `OUT-${meta?.outward_id || outward?.id || "-"}`}</div>
            </div>
            <div style={miniCardStyle("84px")}>
              <div style={miniHeadStyle}>Date</div>
          <div style={miniBodyStyle}>{formatDisplayDate(meta?.outward_date) || "-"}</div>
            </div>
            <div style={miniCardStyle("132px")}>
              <div style={miniHeadStyle}>Outward Company</div>
              <div style={miniBodyStyle}>{meta?.company_name || "-"}</div>
            </div>
            <div style={miniCardStyle("100px")}>
              <div style={miniHeadStyle}>Warehouse</div>
              <div style={miniBodyStyle}>{meta?.warehouse_name || "-"}</div>
            </div>
            <div style={miniCardStyle("98px")}>
              <div style={miniHeadStyle}>Lorry No</div>
              <div style={miniBodyStyle}>{meta?.lorry_no || "-"}</div>
            </div>
            <div style={miniCardStyle("92px")}>
              <div style={miniHeadStyle}>Buyer</div>
              <div style={miniBodyStyle}>{meta?.buyer_name || "-"}</div>
            </div>
          </div>

          <div style={compactGridStyle}>
            <div style={miniCardStyle("120px")}>
              <div style={miniHeadStyle}>Consignee</div>
              <div style={miniBodyStyle}>{meta?.consignee_name || "-"}</div>
            </div>
            <div style={miniCardStyle("80px")}>
              <div style={miniHeadStyle}>Product</div>
              <div style={miniBodyStyle}>{meta?.product_name || "-"}</div>
            </div>
            <div style={miniCardStyle("128px")}>
              <div style={miniHeadStyle}>Dispatch Qty</div>
              <div style={miniBodyStyle}>{num(formData.dispatch_qty).toFixed(2)}</div>
            </div>
            <div style={miniCardStyle("128px")}>
              <div style={miniHeadStyle}>Unloading Qty</div>
              <div style={miniBodyStyle}>{num(formData.unloading_qty).toFixed(2)}</div>
            </div>
            <div style={miniCardStyle("88px")}>
              <div style={miniHeadStyle}>Shortage Qty</div>
              <div style={miniBodyStyle}>{calculation.shortageQty.toFixed(2)}</div>
            </div>
            <div style={miniCardStyle("120px")}>
              <div style={miniHeadStyle}>Settlement Weight</div>
              <div style={miniBodyStyle}>{calculation.settlementWeight.toFixed(2)}</div>
            </div>
          </div>

          <div style={summaryDividerStyle} />

          <div style={statsGridStyle}>
            <div style={statTileStyle("90px")}>
              <div style={statHeadStyle}>Sale Amount</div>
              <div style={statBodyStyle}>{calculation.saleAmount.toFixed(2)}</div>
            </div>
            <div style={statTileStyle("215px")}>
              <div style={statHeadStyle}>Net Receivable</div>
              <div style={statBodyStyle}>{calculation.grossAmount.toFixed(2)}</div>
            </div>
            <div style={statTileStyle("155px")}>
              <div style={statHeadStyle}>Company Payable</div>
              <div style={statBodyStyle}>{calculation.companyPayable.toFixed(2)}</div>
            </div>
            <div style={statTileStyle("128px")}>
              <div style={statHeadStyle}>Net Profit / Loss</div>
              <div style={statBodyStyle}>{calculation.receivableAmount.toFixed(2)}</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ ...card, marginBottom: 10 }}>
        <h3 style={{ marginTop: 0, color: "#000000" }}>Adjusted Company Details</h3>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
  <tr>
    <th style={tableHeaderStyle}>Sr</th>
    <th style={tableHeaderStyle}>Company Name</th>
    <th style={tableHeaderStyle}>Lorry No</th>
    <th style={tableHeaderStyle}>Inward Voucher</th>
    <th style={tableHeaderStyle}>Settlement Weight</th>
    <th style={tableHeaderStyle}>Short Qnt</th>
    <th style={tableHeaderStyle}>S.Amount</th> {/* NEW */}
    <th style={tableHeaderStyle}>Company Rate</th>
    <th style={tableHeaderStyle}>Freight</th>
    <th style={tableHeaderStyle}>Labour Chgs</th>
    <th style={tableHeaderStyle}>Other Chgs</th>
    <th style={tableHeaderStyle}>Amount</th>
    <th style={tableHeaderStyle}>Net Payable</th>
  </tr>
</thead>

<tbody>
  {(meta?.adjustment_details || []).length > 0 ? (
    meta.adjustment_details.map((item, index) => {
      const dispatchQty = num(formData.dispatch_qty);
      const freightPerMt = dispatchQty > 0 ? num(formData.freight) / dispatchQty : 0;
      const labourPerMt = dispatchQty > 0 ? num(formData.outward_labour_charges) / dispatchQty : 0;
      const otherPerMt = dispatchQty > 0 ? num(formData.other_charges) / dispatchQty : 0;

      const amount = num(item.settlement_weight) * num(formData.company_rate);

      const shortQtyPerLine =
        dispatchQty > 0
          ? (num(item.settlement_weight) / dispatchQty) * calculation.shortageQty
          : 0;

      const shortageAmount = shortQtyPerLine * num(formData.company_rate); // NEW

      const freightPerLine = num(item.settlement_weight) * freightPerMt;
      const labourPerLine = num(item.settlement_weight) * labourPerMt;
      const otherPerLine = num(item.settlement_weight) * otherPerMt;

      const netPayable =
        amount - freightPerLine - labourPerLine - otherPerLine;

      return (
        <tr key={item.id} style={{ background: index % 2 === 0 ? "#ffffff" : "#f8fafc" }}>
          <td style={tableCellStyle}>{index + 1}</td>
          <td style={tableCellStyle}>{item.company_name || "-"}</td>
          <td style={tableCellStyle}>{item.lorry_no || "-"}</td>
          <td style={tableCellStyle}>{item.inward_voucher_no || "-"}</td>
          <td style={tableCellStyle}>{num(item.settlement_weight).toFixed(2)}</td>
          <td style={tableCellStyle}>{shortQtyPerLine.toFixed(2)}</td>
          <td style={tableCellStyle}>{shortageAmount.toFixed(2)}</td> {/* NEW */}
          <td style={tableCellStyle}>{num(formData.company_rate).toFixed(2)}</td>
          <td style={tableCellStyle}>{freightPerLine.toFixed(2)}</td>
          <td style={tableCellStyle}>{labourPerLine.toFixed(2)}</td>
          <td style={tableCellStyle}>{otherPerLine.toFixed(2)}</td>
          <td style={tableCellStyle}>{amount.toFixed(2)}</td>
          <td style={tableCellStyle}>{netPayable.toFixed(2)}</td>
        </tr>
                );
                })
              ) : (
                <tr>
                  <td style={tableCellStyle} colSpan="12">No adjustment found for this outward.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ ...card, marginBottom: 10 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 14,
          }}
        >
          <div>
            <label style={label}>Dispatch Qty</label>
            <input name="dispatch_qty" type="number" value={formData.dispatch_qty} onChange={handleChange} readOnly style={{ ...input, background: "#e5e7eb", cursor: "not-allowed" }} />
          </div>

          <div>
            <label style={label}>Unloading Qty</label>
            <input name="unloading_qty" type="number" value={formData.unloading_qty} onChange={handleChange} style={input} />
          </div>

          <div>
            <label style={label}>Sale Rate</label>
            <input name="sale_rate" type="number" value={formData.sale_rate} onChange={handleChange} readOnly style={{ ...input, background: "#e5e7eb", cursor: "not-allowed" }} />
          </div>

          <div>
            <label style={label}>Company Rate</label>
            <input name="company_rate" type="number" value={formData.company_rate} onChange={handleChange} style={input} />
          </div>

          <div>
            <label style={label}>Freight</label>
            <input
              name="freight"
              type="number"
              value={formData.freight}
              onChange={handleChange}
              readOnly={isFreightAutoLocked}
              style={{ ...input, background: isFreightAutoLocked ? "#f8fafc" : "#fff" }}
            />
            <div style={{ marginTop: 6, fontSize: 12, color: isFreightAutoLocked ? "#0f766e" : "#64748b" }}>
              {isFreightAutoLocked ? "Auto from transport payment (locked)" : "Manual entry"}
            </div>
          </div>

          <div>
            <label style={label}>Labour Charges</label>
            <input
              name="outward_labour_charges"
              type="number"
              value={formData.outward_labour_charges}
              onChange={handleChange}
              style={input}
            />
          </div>

          <div>
            <label style={label}>Other Charges</label>
            <input name="other_charges" type="number" value={formData.other_charges} onChange={handleChange} style={input} />
          </div>

          <div>
            <label style={label}>Charge Bearer</label>
            <select name="charge_bearer" value={formData.charge_bearer} onChange={handleChange} style={input}>
              <option value="self">Self</option>
              <option value="company">Company</option>
            </select>
          </div>

          <div style={{ gridColumn: "1 / -1" }}>
            <label style={label}>Narration</label>
            <input name="narration" type="text" value={formData.narration} onChange={handleChange} style={input} />
          </div>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button
          onClick={handleSave}
          style={{
            padding: "10px 18px",
            border: "none",
            borderRadius: 8,
            background: "#16a34a",
            color: "#000000",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Save Settlement
        </button>
      </div>
    </div>
  );
}

const tableHeaderStyle = {
  background: "#177b79",
  color: "#ffffff",
  padding: "4px 6px",
  border: "1px solid #b8c4cf",
  textAlign: "left",
  fontWeight: 700,
  whiteSpace: "nowrap",
  fontSize: 12,
  lineHeight: 1.1,
};

const tableCellStyle = {
  padding: "4px 6px",
  border: "1px solid #c6d1db",
  color: "#000000",
  whiteSpace: "nowrap",
  fontSize: 12,
  lineHeight: 1.15,
  background: "#ffffff",
};

const summaryHeadStyle = {
  padding: "10px 12px",
  border: "1px solid #dbe4ea",
  background: "#0f766e",
  fontWeight: 700,
  color: "#ffffff",
  whiteSpace: "nowrap",
};

const summaryCellStyle = {
  padding: "10px 12px",
  border: "1px solid #dbe4ea",
  background: "#fff",
  color: "#000000",
};

const summaryBoxStyle = {
  border: "1px solid #cbd5e1",
  borderRadius: 12,
  overflow: "hidden",
  background: "#fff",
  boxShadow: "0 4px 14px rgba(15, 23, 42, 0.05)",
};

const compactGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
  gap: 4,
  alignItems: "stretch",
  border: "1px solid #c2ced8",
  borderRight: "none",
  borderBottom: "none",
};

const miniCardStyle = (minWidth) => ({
  minWidth,
  borderRight: "1px solid #c2ced8",
  borderBottom: "1px solid #c2ced8",
  background: "#ffffff",
});

const miniHeadStyle = {
  background: "#177b79",
  color: "#ffffff",
  fontWeight: 700,
  fontSize: 12,
  padding: "4px 6px",
  lineHeight: 1.05,
  borderBottom: "1px solid #b8c4cf",
  whiteSpace: "nowrap",
};

const miniBodyStyle = {
  color: "#000000",
  fontSize: 12,
  padding: "8px",
  lineHeight: 1.25,
  minHeight: 40,
  display: "flex",
  alignItems: "center",
};

const summaryDividerStyle = {
  height: 1,
  background: "#2f3e4f",
  opacity: 1,
};

const statsGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(140px, 1fr))",
  gap: 4,
  alignItems: "stretch",
};

const statTileStyle = (minWidth) => ({
  minWidth: "auto",
  border: "1px solid #1e3a8a",
  background: "#dbeafe",
  borderRadius: 4,
  overflow: "hidden",
});

const statHeadStyle = {
  textAlign: "center",
  background: "#177b79",
  color: "#ffffff",
  fontWeight: 700,
  fontSize: 12,
  padding: "4px 6px",
  lineHeight: 1.1,
  whiteSpace: "nowrap",
};

const statBodyStyle = {
  textAlign: "center",
  color: "#000000",
  fontSize: 12,
  fontWeight: 700,
  padding: "6px 6px",
  lineHeight: 1.2,
  textAlign: "center",
  background: "#dbeafe",
};
















