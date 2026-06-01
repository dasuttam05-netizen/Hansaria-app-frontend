import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { FaFilePdf, FaWhatsapp } from "react-icons/fa";
import { formatDisplayDate } from "../utils/date";
import { hasPermission, loadSession } from "../utils/auth";

const BASE_FONT = "'Trebuchet MS', 'Segoe UI', Tahoma, sans-serif";
const PALETTE = {
  ink: "#0f172a",
  muted: "#475569",
  border: "#d5e0ea",
  borderStrong: "#b8c8d8",
  panel: "#ffffff",
  header: "#0f766e",
  headerDark: "#115e59",
  headerSoft: "#e8f6f3",
  rowAlt: "#f8fbff",
  tile: "#eef4ff",
  tileBorder: "#c8d7ee",
  tileValue: "#0d3b7a",
  divider: "#d4dee8",
};

export default function OutwardSettlementPage({ outward, onSaved }) {
  const API_BASE = "/api";
  const { user } = loadSession();
  const canEditCompanyRate = hasPermission(user, "settlement.companyRate");

  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState(null);
  const [isFreightAutoLocked, setIsFreightAutoLocked] = useState(false);
  const [showLabourExpenseOption, setShowLabourExpenseOption] = useState(false);
  const [adjustmentRates, setAdjustmentRates] = useState({});
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

  const getLoadingTypeLabel = (sourceType) => {
    const normalized = String(sourceType || "").trim().toLowerCase();
    return normalized === "palti_lorry" ? "Palti Lorry" : "Warehouse Loading";
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
      const approvedLabourAmount = num(res.data?.labour_expense?.amount);
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
      setAdjustmentRates(
        (res.data?.adjustment_details || []).reduce((acc, item) => {
          acc[item.id] = item.company_rate ?? s.company_rate ?? "";
          return acc;
        }, {})
      );
      setShowLabourExpenseOption(approvedLabourAmount > 0 && num(s.outward_labour_charges) !== approvedLabourAmount);
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
    const rowCompanyRate = num(adjustmentRates[item.id] ?? item.company_rate ?? formData.company_rate);

    const freightPerMt = dispatchQty > 0 ? freight / dispatchQty : 0;
    const labourPerMt = dispatchQty > 0 ? labour / dispatchQty : 0;
    const otherPerMt = dispatchQty > 0 ? other / dispatchQty : 0;

    const amount = weight * rowCompanyRate;

    const shortQtyPerLine =
      dispatchQty > 0 ? (weight / dispatchQty) * shortageQty : 0;

    const shortageAmount = shortQtyPerLine * rowCompanyRate;

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
}, [formData, meta, adjustmentRates]);

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleAdjustmentRateChange = (adjustmentId, value) => {
    setAdjustmentRates((prev) => ({ ...prev, [adjustmentId]: value }));
  };

  const handleCompanyRateChange = (value) => {
    setFormData((prev) => ({ ...prev, company_rate: value }));
    setAdjustmentRates(
      (meta?.adjustment_details || []).reduce((acc, item) => {
        acc[item.id] = value;
        return acc;
      }, {})
    );
  };

  const useApprovedLabourExpense = () => {
    setFormData((prev) => ({
      ...prev,
      outward_labour_charges: String(num(meta?.labour_expense?.amount)),
    }));
    setShowLabourExpenseOption(false);
  };

  const handleSave = async () => {
    try {
      await axios.post(`${API_BASE}/outward-settlement/save`, {
        outward_id: outward.id,
        ...formData,
        adjustment_rates: (meta?.adjustment_details || []).map((item) => ({
          adjustment_id: item.id,
          company_rate: adjustmentRates[item.id] ?? item.company_rate ?? formData.company_rate,
        })),
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

  const getAdjustmentRowAmounts = (item) => {
    const dispatchQty = num(formData.dispatch_qty);
    const rowCompanyRate = num(adjustmentRates[item.id] ?? item.company_rate ?? formData.company_rate);
    const settlementWeight = num(item.settlement_weight);
    const freightPerMt = dispatchQty > 0 ? num(formData.freight) / dispatchQty : 0;
    const labourPerMt = dispatchQty > 0 ? num(formData.outward_labour_charges) / dispatchQty : 0;
    const otherPerMt = dispatchQty > 0 ? num(formData.other_charges) / dispatchQty : 0;
    const amount = settlementWeight * rowCompanyRate;
    const shortQty = dispatchQty > 0 ? (settlementWeight / dispatchQty) * calculation.shortageQty : 0;
    const shortageAmount = shortQty * rowCompanyRate;
    const freight = settlementWeight * freightPerMt;
    const labour = settlementWeight * labourPerMt;
    const other = settlementWeight * otherPerMt;
    const netPayable = amount - freight - labour - other - shortageAmount;

    return {
      rowCompanyRate,
      settlementWeight,
      shortQty,
      shortageAmount,
      freight,
      labour,
      other,
      amount,
      netPayable,
    };
  };

  const safeFileName = (value) =>
    String(value || "outward-settlement")
      .replace(/[/\\?%*:|"<>]/g, "-")
      .replace(/\s+/g, "_");

  const createAdjustmentPdf = (item, index) => {
    const row = getAdjustmentRowAmounts(item);
    const voucherNo = meta?.voucher_no || `OUT-${meta?.outward_id || outward?.id || "-"}`;
    const fileName = `${safeFileName(voucherNo)}_${safeFileName(item.company_name || `row-${index + 1}`)}.pdf`;
    const doc = new jsPDF("p", "mm", "a4");
    const pageWidth = doc.internal.pageSize.getWidth();
    const left = 14;

    doc.setFillColor(15, 118, 110);
    doc.rect(0, 0, pageWidth, 24, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(17);
    doc.setTextColor(255, 255, 255);
    doc.text("Outward Settlement", left, 15);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("Adjusted Company Copy", pageWidth - 14, 15, { align: "right" });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text("Outward Details", left, 35);

    autoTable(doc, {
      startY: 39,
      theme: "grid",
      styles: { fontSize: 8.5, cellPadding: 2.4, textColor: [15, 23, 42] },
      headStyles: { fillColor: [232, 246, 243], textColor: [17, 94, 89], fontStyle: "bold" },
      bodyStyles: { fillColor: [255, 255, 255] },
      head: [["Date", "Voucher No.", "Outward Company", "Location", "Outward Lorry No."]],
      body: [[
        formatDisplayDate(meta?.outward_date) || "-",
        voucherNo,
        meta?.company_name || "-",
        meta?.location_name || outward?.location_name || "-",
        meta?.lorry_no || "-",
      ]],
      margin: { left, right: left },
    });

    const detailY = doc.lastAutoTable.finalY + 9;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text("Adjusted Company Details", left, detailY);

    autoTable(doc, {
      startY: detailY + 4,
      theme: "grid",
      styles: { fontSize: 8.2, cellPadding: 2.2, textColor: [15, 23, 42] },
      headStyles: { fillColor: [15, 118, 110], textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [248, 251, 255] },
      head: [["Particular", "Details"]],
      body: [
        ["Adjusted Company", item.company_name || "-"],
        ["Adjusted Lorry No.", item.lorry_no || "-"],
        ["Inward Voucher", item.inward_voucher_no || "-"],
        ["Loading Type", getLoadingTypeLabel(item.source_type)],
        ["Consignee", meta?.consignee_name || "-"],
        ["Product", meta?.product_name || "-"],
        ["Settlement Weight", row.settlementWeight.toFixed(2)],
        ["Short Qnt", row.shortQty.toFixed(2)],
        ["S.Amount", row.shortageAmount.toFixed(2)],
        ["Company Rate", row.rowCompanyRate.toFixed(2)],
        ["Freight", row.freight.toFixed(2)],
        ["Labour Chgs", row.labour.toFixed(2)],
        ["Other Chgs", row.other.toFixed(2)],
        ["Amount", row.amount.toFixed(2)],
        ["Net Payable", row.netPayable.toFixed(2)],
      ],
      margin: { left, right: left },
      columnStyles: {
        0: { cellWidth: 62, fontStyle: "bold", fillColor: [248, 250, 252] },
        1: { cellWidth: 116 },
      },
    });

    const y = doc.lastAutoTable.finalY + 12;
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(left, y, pageWidth - left * 2, 20, 3, 3, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105);
    doc.text("Net Payable", left + 6, y + 8);
    doc.setFontSize(15);
    doc.setTextColor(15, 118, 110);
    doc.text(row.netPayable.toFixed(2), pageWidth - left - 6, y + 13, { align: "right" });

    const footerY = doc.internal.pageSize.getHeight() - 12;
    doc.setDrawColor(213, 224, 234);
    doc.line(left, footerY - 5, pageWidth - left, footerY - 5);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text("Computer generated outward settlement copy.", left, footerY);

    const shareText = [
      "Outward Settlement",
      `Voucher: ${voucherNo}`,
      `Date: ${formatDisplayDate(meta?.outward_date) || "-"}`,
      `Outward Company: ${meta?.company_name || "-"}`,
      `Location: ${meta?.location_name || outward?.location_name || "-"}`,
      `Outward Lorry No.: ${meta?.lorry_no || "-"}`,
      `Adjusted Company: ${item.company_name || "-"}`,
      `Adjusted Lorry No.: ${item.lorry_no || "-"}`,
      `Net Payable: ${row.netPayable.toFixed(2)}`,
    ].join("\n");

    return { doc, fileName, shareText };
  };

  const downloadAdjustmentPdf = (item, index) => {
    const { doc, fileName } = createAdjustmentPdf(item, index);
    doc.save(fileName);
  };

  const shareAdjustmentPdf = async (item, index) => {
    const { doc, fileName, shareText } = createAdjustmentPdf(item, index);
    const blob = doc.output("blob");
    const file = new File([blob], fileName, { type: "application/pdf" });

    if (navigator.canShare && navigator.canShare({ files: [file] }) && navigator.share) {
      await navigator.share({
        title: "Outward Settlement",
        text: shareText,
        files: [file],
      });
      return;
    }

    doc.save(fileName);
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, "_blank", "noopener,noreferrer");
  };

  const card = {
    background: PALETTE.panel,
    border: `1px solid ${PALETTE.border}`,
    borderRadius: 16,
    padding: 16,
    boxShadow: "0 1px 4px rgba(15, 23, 42, 0.08)",
  };

  const input = {
    padding: "10px 12px",
    border: `1px solid ${PALETTE.border}`,
    borderRadius: 10,
    fontSize: 13,
    width: "100%",
    background: "#ffffff",
    color: PALETTE.ink,
    fontFamily: BASE_FONT,
  };

  const label = {
    fontSize: 12,
    color: PALETTE.muted,
    marginBottom: 6,
    display: "block",
    fontWeight: 700,
    letterSpacing: "0.2px",
  };

  if (loading) {
    return <div style={{ ...card, fontFamily: BASE_FONT, color: PALETTE.muted }}>Loading settlement...</div>;
  }

  return (
    <div style={settlementShellStyle}>
      <div style={{ ...card, marginBottom: 10 }}>
        <h2
          style={{
            margin: 0,
            color: PALETTE.ink,
            fontWeight: 800,
            fontSize: 24,
            letterSpacing: "0.3px",
            borderBottom: `1px solid ${PALETTE.border}`,
            paddingBottom: 10,
          }}
        >
          Outward Settlement
        </h2>
        <div style={settlementPreviewStyle}>
          <div style={buyerLineStyle}>
            <div style={roundIconStyle}>B</div>
            <div style={buyerLabelStyle}>Buyer</div>
            <div style={buyerValueStyle}>{meta?.buyer_name || "-"}</div>
          </div>

          <div style={sectionTitleStyle}>
            <div style={smallSectionIconStyle}>i</div>
            <div style={sectionLabelStyle}>Outward Details</div>
            <div style={sectionRuleStyle} />
          </div>

          <div style={outwardDetailGridStyle}>
            <div style={plainInfoCellStyle}>
              <div style={plainInfoLabelStyle}>Outward Company</div>
              <div style={plainInfoValueStyle}>{meta?.company_name || "-"}</div>
            </div>
            <div style={plainInfoCellStyle}>
              <div style={plainInfoLabelStyle}>Warehouse</div>
              <div style={plainInfoValueStyle}>{meta?.warehouse_name || "-"}</div>
            </div>
            <div style={plainInfoCellStyle}>
              <div style={plainInfoLabelStyle}>Dispatch Date</div>
              <div style={plainInfoValueStyle}>{formatDisplayDate(meta?.outward_date) || "-"}</div>
            </div>
            <div style={plainInfoCellStyle}>
              <div style={plainInfoLabelStyle}>Location</div>
              <div style={plainInfoValueStyle}>{meta?.location_name || outward?.location_name || "-"}</div>
            </div>
            <div style={plainInfoCellStyle}>
              <div style={plainInfoLabelStyle}>Voucher No.</div>
              <div style={plainInfoValueStyle}>{meta?.voucher_no || `OUT-${meta?.outward_id || outward?.id || "-"}`}</div>
            </div>
            <div style={{ ...plainInfoCellStyle, borderRight: "none" }}>
              <div style={plainInfoLabelStyle}>Lorry No.</div>
              <div style={plainInfoValueStyle}>{meta?.lorry_no || "-"}</div>
            </div>
          </div>

          <div style={sectionTitleStyle}>
            <div style={smallSectionIconStyle}>C</div>
            <div style={sectionLabelStyle}>Consignment Details</div>
          </div>

          <div style={consignmentTableWrapStyle}>
            <table style={consignmentTableStyle}>
              <thead>
                <tr>
                  <th style={consignmentHeadStyle}>Consignee</th>
                  <th style={consignmentHeadStyle}>Product</th>
                  <th style={consignmentHeadStyle}>Dispatch Qty</th>
                  <th style={consignmentHeadStyle}>Unloading Qty</th>
                  <th style={consignmentHeadStyle}>Shortage Qty</th>
                  <th style={consignmentHeadStyle}>Settlement Weight</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={consignmentCellStyle}>{meta?.consignee_name || "-"}</td>
                  <td style={consignmentCellStyle}>{meta?.product_name || "-"}</td>
                  <td style={consignmentCellStyle}>{num(formData.dispatch_qty).toFixed(2)}</td>
                  <td style={consignmentCellStyle}>{num(formData.unloading_qty).toFixed(2)}</td>
                  <td style={consignmentCellStyle}>{calculation.shortageQty.toFixed(2)}</td>
                  <td style={consignmentCellStyle}>{calculation.settlementWeight.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div style={sectionTitleStyle}>
            <div style={smallSectionIconStyle}>₹</div>
            <div style={sectionLabelStyle}>Settlement Summary</div>
            <div style={sectionRuleStyle} />
          </div>

          <div style={settlementSummaryGridStyle}>
            <div style={summaryMetricStyle}>
              <div style={{ ...summaryIconStyle, background: "#dcfce7", color: "#15803d" }}>₹</div>
              <div>
                <div style={summaryMetricLabelStyle}>Sale Amount</div>
                <div style={{ ...summaryMetricValueStyle, color: "#15803d" }}>₹ {calculation.saleAmount.toFixed(2)}</div>
              </div>
            </div>
            <div style={summaryMetricStyle}>
              <div style={{ ...summaryIconStyle, background: "#dbeafe", color: "#2563eb" }}>↓</div>
              <div>
                <div style={summaryMetricLabelStyle}>Net Receivable</div>
                <div style={{ ...summaryMetricValueStyle, color: "#1d4ed8" }}>₹ {calculation.grossAmount.toFixed(2)}</div>
              </div>
            </div>
            <div style={summaryMetricStyle}>
              <div style={{ ...summaryIconStyle, background: "#ffedd5", color: "#f97316" }}>₹</div>
              <div>
                <div style={summaryMetricLabelStyle}>Company Payable</div>
                <div style={{ ...summaryMetricValueStyle, color: "#ea580c" }}>₹ {calculation.companyPayable.toFixed(2)}</div>
              </div>
            </div>
            <div style={{ ...summaryMetricStyle, borderRight: "none" }}>
              <div style={{ ...summaryIconStyle, background: "#ede9fe", color: "#7c3aed" }}>P/L</div>
              <div>
                <div style={summaryMetricLabelStyle}>Net Profit / Loss</div>
                <div style={{ ...summaryMetricValueStyle, color: "#6d28d9" }}>₹ {calculation.receivableAmount.toFixed(2)}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ ...card, marginBottom: 10 }}>
        <h3 style={{ marginTop: 0, marginBottom: 12, color: PALETTE.ink, fontWeight: 800 }}>Adjusted Company Details</h3>
        <div style={{ overflowX: "auto", border: `1px solid ${PALETTE.border}`, borderRadius: 10, background: "#fff" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
  <tr>
    <th style={tableHeaderStyle}>Sr</th>
    <th style={tableHeaderStyle}>Company Name</th>
    <th style={tableHeaderStyle}>Lorry No</th>
    <th style={tableHeaderStyle}>Inward Voucher</th>
    <th style={tableHeaderStyle}>Loading Type</th>
    <th style={tableHeaderStyle}>Settlement Weight</th>
    <th style={tableHeaderStyle}>Short Qnt</th>
    <th style={tableHeaderStyle}>S.Amount</th> {/* NEW */}
    <th style={tableHeaderStyle}>Company Rate</th>
    <th style={tableHeaderStyle}>Freight</th>
    <th style={tableHeaderStyle}>Labour Chgs</th>
    <th style={tableHeaderStyle}>Other Chgs</th>
    <th style={tableHeaderStyle}>Amount</th>
    <th style={tableHeaderStyle}>Action</th>
    <th style={tableHeaderStyle}>Net Payable</th>
  </tr>
</thead>

<tbody>
  {(meta?.adjustment_details || []).length > 0 ? (
    meta.adjustment_details.map((item, index) => {
      const dispatchQty = num(formData.dispatch_qty);
      const rowCompanyRate = num(adjustmentRates[item.id] ?? item.company_rate ?? formData.company_rate);
      const freightPerMt = dispatchQty > 0 ? num(formData.freight) / dispatchQty : 0;
      const labourPerMt = dispatchQty > 0 ? num(formData.outward_labour_charges) / dispatchQty : 0;
      const otherPerMt = dispatchQty > 0 ? num(formData.other_charges) / dispatchQty : 0;

      const amount = num(item.settlement_weight) * rowCompanyRate;

      const shortQtyPerLine =
        dispatchQty > 0
          ? (num(item.settlement_weight) / dispatchQty) * calculation.shortageQty
          : 0;

      const shortageAmount = shortQtyPerLine * rowCompanyRate;

      const freightPerLine = num(item.settlement_weight) * freightPerMt;
      const labourPerLine = num(item.settlement_weight) * labourPerMt;
      const otherPerLine = num(item.settlement_weight) * otherPerMt;

      const netPayable =
        amount - freightPerLine - labourPerLine - otherPerLine;

      return (
        <tr key={item.id} style={{ background: index % 2 === 0 ? "#ffffff" : PALETTE.rowAlt }}>
          <td style={tableCellStyle}>{index + 1}</td>
          <td style={tableCellStyle}>{item.company_name || "-"}</td>
          <td style={tableCellStyle}>{item.lorry_no || "-"}</td>
          <td style={tableCellStyle}>{item.inward_voucher_no || "-"}</td>
          <td style={tableCellStyle}>{getLoadingTypeLabel(item.source_type)}</td>
          <td style={tableCellStyle}>{num(item.settlement_weight).toFixed(2)}</td>
          <td style={tableCellStyle}>{shortQtyPerLine.toFixed(2)}</td>
          <td style={tableCellStyle}>{shortageAmount.toFixed(2)}</td> {/* NEW */}
          <td style={tableCellStyle}>
            {canEditCompanyRate ? (
              <input
                name="company_rate"
                type="number"
                value={adjustmentRates[item.id] ?? item.company_rate ?? formData.company_rate}
                onChange={(e) => handleAdjustmentRateChange(item.id, e.target.value)}
                style={tableRateInputStyle}
              />
            ) : (
              rowCompanyRate.toFixed(2)
            )}
          </td>
          <td style={tableCellStyle}>{freightPerLine.toFixed(2)}</td>
          <td style={tableCellStyle}>{labourPerLine.toFixed(2)}</td>
          <td style={tableCellStyle}>{otherPerLine.toFixed(2)}</td>
          <td style={tableCellStyle}>{amount.toFixed(2)}</td>
          <td style={tableCellStyle}>
            <div style={rowActionWrapStyle}>
              <button
                type="button"
                onClick={() => downloadAdjustmentPdf(item, index)}
                style={{ ...rowActionButtonStyle, background: "#dc2626" }}
                title="Download PDF"
              >
                <FaFilePdf />
              </button>
              <button
                type="button"
                onClick={() => shareAdjustmentPdf(item, index)}
                style={{ ...rowActionButtonStyle, background: "#16a34a" }}
                title="Share on WhatsApp"
              >
                <FaWhatsapp />
              </button>
            </div>
          </td>
          <td style={tableCellStyle}>{netPayable.toFixed(2)}</td>
        </tr>
                );
                })
              ) : (
                <tr>
                  <td style={tableCellStyle} colSpan="15">No adjustment found for this outward.</td>
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
            <input name="dispatch_qty" type="number" value={formData.dispatch_qty} onChange={handleChange} readOnly style={{ ...input, background: "#f3f8ff", cursor: "not-allowed", color: PALETTE.muted }} />
          </div>

          <div>
            <label style={label}>Unloading Qty</label>
            <input name="unloading_qty" type="number" value={formData.unloading_qty} onChange={handleChange} style={input} />
          </div>

          <div>
            <label style={label}>Sale Rate</label>
            <input name="sale_rate" type="number" value={formData.sale_rate} onChange={handleChange} readOnly style={{ ...input, background: "#f3f8ff", cursor: "not-allowed", color: PALETTE.muted }} />
          </div>

          <div>
            <label style={label}>Company Rate</label>
            <input
              name="company_rate"
              type="number"
              value={formData.company_rate}
              onChange={(e) => handleCompanyRateChange(e.target.value)}
              readOnly={!canEditCompanyRate}
              style={{
                ...input,
                background: canEditCompanyRate ? "#fff" : "#f3f8ff",
                cursor: canEditCompanyRate ? "text" : "not-allowed",
                color: canEditCompanyRate ? PALETTE.ink : PALETTE.muted,
              }}
            />
            {!canEditCompanyRate && (
              <div style={{ marginTop: 6, fontSize: 12, color: PALETTE.muted, fontWeight: 600 }}>
                Admin or Company Rate access required
              </div>
            )}
          </div>

          <div>
            <label style={label}>Freight</label>
            <input
              name="freight"
              type="number"
              value={formData.freight}
              onChange={handleChange}
              readOnly={isFreightAutoLocked}
              style={{ ...input, background: isFreightAutoLocked ? "#f3f8ff" : "#fff", color: isFreightAutoLocked ? PALETTE.muted : PALETTE.ink }}
            />
            <div style={{ marginTop: 6, fontSize: 12, color: isFreightAutoLocked ? PALETTE.headerDark : PALETTE.muted, fontWeight: 600 }}>
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
            {showLabourExpenseOption && (
              <div style={labourOptionStyle}>
                <div>
                  Approved expense found: <strong>{num(meta?.labour_expense?.amount).toFixed(2)}</strong>
                  {meta?.labour_expense?.vouchers?.length ? ` (${meta.labour_expense.vouchers.join(", ")})` : ""}
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <button type="button" onClick={useApprovedLabourExpense} style={smallYesButtonStyle}>
                    Yes
                  </button>
                  <button type="button" onClick={() => setShowLabourExpenseOption(false)} style={smallNoButtonStyle}>
                    No
                  </button>
                </div>
              </div>
            )}
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
            padding: "11px 20px",
            border: "none",
            borderRadius: 10,
            background: "linear-gradient(135deg, #15803d 0%, #22c55e 100%)",
            color: "#ffffff",
            fontWeight: 800,
            letterSpacing: "0.2px",
            cursor: "pointer",
            boxShadow: "0 10px 20px rgba(21, 128, 61, 0.28)",
          }}
        >
          Save Settlement
        </button>
      </div>
    </div>
  );
}

const tableHeaderStyle = {
  background: PALETTE.header,
  color: "#ffffff",
  padding: "8px 10px",
  border: `1px solid ${PALETTE.borderStrong}`,
  textAlign: "left",
  fontWeight: 800,
  whiteSpace: "nowrap",
  fontSize: 12.5,
  lineHeight: 1.2,
};

const tableCellStyle = {
  padding: "8px 10px",
  border: `1px solid ${PALETTE.border}`,
  color: PALETTE.ink,
  whiteSpace: "nowrap",
  fontSize: 12.5,
  lineHeight: 1.2,
  background: "#ffffff",
};

const tableRateInputStyle = {
  width: 92,
  padding: "6px 8px",
  border: `1px solid ${PALETTE.borderStrong}`,
  borderRadius: 8,
  color: PALETTE.ink,
  fontSize: 12.5,
  fontWeight: 700,
  fontFamily: BASE_FONT,
  background: "#ffffff",
};

const rowActionWrapStyle = {
  display: "flex",
  gap: 7,
  alignItems: "center",
  justifyContent: "center",
};

const rowActionButtonStyle = {
  width: 30,
  height: 30,
  border: "none",
  borderRadius: 8,
  color: "#ffffff",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  fontSize: 15,
  boxShadow: "0 4px 10px rgba(15, 23, 42, 0.16)",
};

const settlementShellStyle = {
  padding: 16,
  background: "#f8fafc",
  borderRadius: 18,
  border: `1px solid ${PALETTE.border}`,
  fontFamily: BASE_FONT,
};

const labourOptionStyle = {
  marginTop: 8,
  padding: "9px 10px",
  border: "1px solid #bbf7d0",
  borderRadius: 10,
  background: "#f0fdf4",
  color: "#166534",
  fontSize: 12,
  lineHeight: 1.35,
  fontWeight: 600,
};

const smallYesButtonStyle = {
  border: "none",
  borderRadius: 8,
  background: "#15803d",
  color: "#ffffff",
  padding: "6px 12px",
  fontWeight: 800,
  cursor: "pointer",
};

const smallNoButtonStyle = {
  border: "1px solid #cbd5e1",
  borderRadius: 8,
  background: "#ffffff",
  color: PALETTE.ink,
  padding: "6px 12px",
  fontWeight: 800,
  cursor: "pointer",
};

const settlementPreviewStyle = {
  display: "grid",
  gap: 13,
  marginTop: 12,
  padding: "2px 14px 0",
  background: "#ffffff",
};

const buyerLineStyle = {
  display: "grid",
  gridTemplateColumns: "34px 70px 1fr",
  alignItems: "center",
  gap: 8,
  minHeight: 34,
};

const roundIconStyle = {
  width: 28,
  height: 28,
  borderRadius: "50%",
  background: PALETTE.header,
  color: "#ffffff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: 900,
  fontSize: 13,
};

const buyerLabelStyle = {
  color: PALETTE.ink,
  fontSize: 13,
  fontWeight: 800,
};

const buyerValueStyle = {
  color: PALETTE.ink,
  fontSize: 13,
  fontWeight: 600,
  borderLeft: `1px solid ${PALETTE.divider}`,
  paddingLeft: 14,
};

const sectionTitleStyle = {
  display: "grid",
  gridTemplateColumns: "28px auto 1fr",
  alignItems: "center",
  gap: 8,
  minHeight: 28,
};

const smallSectionIconStyle = {
  width: 24,
  height: 24,
  borderRadius: "50%",
  background: PALETTE.header,
  color: "#ffffff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 12,
  fontWeight: 900,
};

const sectionLabelStyle = {
  color: PALETTE.headerDark,
  fontSize: 14,
  fontWeight: 900,
  whiteSpace: "nowrap",
};

const sectionRuleStyle = {
  height: 1,
  background: "#5fb7b1",
};

const outwardDetailGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(6, minmax(115px, 1fr))",
  gap: 0,
  padding: "0 0 4px 16px",
};

const plainInfoCellStyle = {
  padding: "0 18px 0 0",
  marginRight: 18,
  borderRight: `1px solid ${PALETTE.divider}`,
  minHeight: 45,
};

const plainInfoLabelStyle = {
  color: PALETTE.ink,
  fontSize: 12,
  fontWeight: 900,
  marginBottom: 7,
};

const plainInfoValueStyle = {
  color: PALETTE.ink,
  fontSize: 12,
  fontWeight: 600,
  lineHeight: 1.25,
};

const consignmentTableWrapStyle = {
  border: `1px solid ${PALETTE.border}`,
  borderRadius: 6,
  overflow: "hidden",
  background: "#ffffff",
};

const consignmentTableStyle = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: 12,
  tableLayout: "fixed",
};

const consignmentHeadStyle = {
  background: PALETTE.header,
  color: "#ffffff",
  padding: "8px 10px",
  textAlign: "center",
  borderRight: "1px solid rgba(255,255,255,0.22)",
  fontWeight: 900,
};

const consignmentCellStyle = {
  background: "#f8fafc",
  color: PALETTE.ink,
  padding: "10px 10px",
  textAlign: "center",
  borderRight: `1px solid ${PALETTE.border}`,
  fontWeight: 700,
  lineHeight: 1.25,
};

const settlementSummaryGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(160px, 1fr))",
  gap: 0,
  alignItems: "center",
  padding: "8px 0 2px",
};

const summaryMetricStyle = {
  display: "grid",
  gridTemplateColumns: "50px 1fr",
  alignItems: "center",
  gap: 10,
  padding: "8px 22px",
  borderRight: `1px solid ${PALETTE.divider}`,
  minHeight: 62,
};

const summaryIconStyle = {
  width: 42,
  height: 42,
  borderRadius: "50%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: 900,
  fontSize: 15,
};

const summaryMetricLabelStyle = {
  color: PALETTE.ink,
  fontSize: 12,
  fontWeight: 900,
  marginBottom: 4,
};

const summaryMetricValueStyle = {
  fontSize: 19,
  fontWeight: 900,
  lineHeight: 1.15,
};

const summaryHeadStyle = {
  padding: "10px 12px",
  border: `1px solid ${PALETTE.border}`,
  background: PALETTE.header,
  fontWeight: 700,
  color: "#ffffff",
  whiteSpace: "nowrap",
};

const summaryCellStyle = {
  padding: "10px 12px",
  border: `1px solid ${PALETTE.border}`,
  background: "#fff",
  color: PALETTE.ink,
};

const summaryBoxStyle = {
  border: `1px solid ${PALETTE.border}`,
  borderRadius: 12,
  overflow: "hidden",
  background: "#fff",
  boxShadow: "0 8px 20px rgba(15, 23, 42, 0.06)",
};

const compactGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(155px, 1fr))",
  gap: 10,
  alignItems: "stretch",
};

const miniCardStyle = (minWidth) => ({
  minWidth,
  border: `1px solid ${PALETTE.border}`,
  borderRadius: 10,
  overflow: "hidden",
  background: "#ffffff",
  boxShadow: "0 4px 10px rgba(15, 23, 42, 0.04)",
});

const miniHeadStyle = {
  background: PALETTE.headerSoft,
  color: PALETTE.headerDark,
  fontWeight: 700,
  fontSize: 11.5,
  padding: "7px 9px",
  lineHeight: 1.15,
  borderBottom: `1px solid ${PALETTE.border}`,
  whiteSpace: "nowrap",
  textTransform: "uppercase",
  letterSpacing: "0.25px",
};

const miniBodyStyle = {
  color: PALETTE.ink,
  fontSize: 13,
  fontWeight: 700,
  padding: "10px 10px",
  lineHeight: 1.25,
  minHeight: 40,
  display: "flex",
  alignItems: "center",
};

const summaryDividerStyle = {
  height: 1,
  background: PALETTE.divider,
  opacity: 1,
};

const statsGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 10,
  alignItems: "stretch",
};

const statTileStyle = (minWidth) => ({
  minWidth: "auto",
  border: `1px solid ${PALETTE.tileBorder}`,
  background: PALETTE.tile,
  borderRadius: 10,
  overflow: "hidden",
  boxShadow: "0 4px 12px rgba(15, 23, 42, 0.05)",
});

const statHeadStyle = {
  textAlign: "center",
  background: PALETTE.header,
  color: "#ffffff",
  fontWeight: 800,
  fontSize: 12,
  padding: "7px 8px",
  lineHeight: 1.2,
  whiteSpace: "nowrap",
};

const statBodyStyle = {
  textAlign: "center",
  color: PALETTE.tileValue,
  fontSize: 13,
  fontWeight: 800,
  padding: "9px 8px",
  lineHeight: 1.2,
  background: PALETTE.tile,
};
