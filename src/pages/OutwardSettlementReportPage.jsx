import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { FaEdit, FaFilePdf } from "react-icons/fa";
import OutwardSettlementPage from "./OutwardSettlementPage";

export default function OutwardSettlementReportPage() {
  const navigate = useNavigate();
  const API_BASE = "/api";

  const [records, setRecords] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [editingRecord, setEditingRecord] = useState(null);

  const [filters, setFilters] = useState({
    from_date: new Date(new Date().setDate(new Date().getDate() - 30))
      .toISOString()
      .split("T")[0],
    to_date: new Date().toISOString().split("T")[0],
    company_id: "",
    warehouse_id: "",
  });

  const card = {
    background: "#fff",
    border: "1px solid #d1d5db",
    borderRadius: 16,
    padding: 16,
    boxShadow: "0 1px 4px rgba(15, 23, 42, 0.08)",
  };

  const input = {
    padding: "10px 12px",
    border: "1px solid #cbd5e1",
    borderRadius: 8,
    fontSize: 14,
    minWidth: 160,
  };

  const button = {
    padding: "10px 16px",
    border: "none",
    borderRadius: 8,
    fontWeight: 700,
    cursor: "pointer",
    color: "#fff",
  };

  const th = {
    background: "#f1f5f9",
    color: "#0f172a",
    padding: "10px 12px",
    border: "1px solid #cbd5e1",
    textAlign: "left",
    whiteSpace: "nowrap",
  };

  const td = {
    padding: "10px 12px",
    border: "1px solid #cbd5e1",
    background: "#fff",
    verticalAlign: "top",
    color: "#0f172a",
  };

  const num = (v) => Number(v || 0).toFixed(2);
  const toNumber = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };
  const formatDate = (value) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    const dd = String(date.getDate()).padStart(2, "0");
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    return `${dd}-${mm}-${date.getFullYear()}`;
  };

  const normalizeRow = (row) => {
    const dispatchQty = toNumber(row.dispatch_qty);
    const unloadingQty = toNumber(row.unloading_qty);
    const settlementWeight = toNumber(row.settlement_weight ?? row.billable_qty ?? Math.max(dispatchQty - unloadingQty, 0));
    const shortageQty = toNumber(row.shortage_qty ?? row.billable_qty ?? Math.max(dispatchQty - unloadingQty, 0));
    const saleRate = toNumber(row.sale_rate);
    const saleAmount = toNumber(row.sale_amount ?? dispatchQty * saleRate);
    const companyRate = toNumber(row.company_rate);
    const companyAmount = toNumber(row.company_amount ?? settlementWeight * companyRate);
    const freight = toNumber(row.freight);
    const otherCharges = toNumber(row.other_charges);
    const labourCharges = toNumber(row.outward_labour_charges);
    const grossAmount = toNumber(row.gross_amount ?? row.gross_profit ?? saleAmount - freight - otherCharges - labourCharges);
    const receivableAmount = toNumber(row.receivable_amount ?? row.net_profit);
    const companyPayable = toNumber(row.company_payable);

    return {
      ...row,
      dispatch_qty: dispatchQty,
      unloading_qty: unloadingQty,
      shortage_qty: shortageQty,
      settlement_weight: settlementWeight,
      sale_rate: saleRate,
      sale_amount: saleAmount,
      company_rate: companyRate,
      company_amount: companyAmount,
      freight,
      other_charges: otherCharges,
      outward_labour_charges: labourCharges,
      gross_amount: grossAmount,
      receivable_amount: receivableAmount,
      company_payable: companyPayable,
    };
  };

  const getRowCalculations = (row) => {
    const normalized = normalizeRow(row);
    const dispatchQty = normalized.dispatch_qty;
    const shortageQty = normalized.shortage_qty;
    const saleAmount = normalized.sale_amount;
    const settlementWeight = normalized.settlement_weight;
    const saleRate = normalized.sale_rate;
    const purchaseAmount = normalized.company_amount;
    const freight = normalized.freight;
    const otherCharges = normalized.other_charges;
    const labourCharges = normalized.outward_labour_charges;
    const totalUnloadingClaimAmount = toNumber(normalized.claim_amount);
    const totalUnloadingDeductionAmount = toNumber(normalized.other_deduction);

    const adjustmentDetails = (normalized.adjustment_details || []).map((item) => {
      const itemSettlementWeight = Number(item.settlement_weight) || 0;
      const companyRate = Number(item.company_rate ?? normalized.company_rate) || 0;
      const shortQtyPerLine =
        dispatchQty > 0 ? (itemSettlementWeight / dispatchQty) * shortageQty : 0;
      const shortAmount = shortQtyPerLine * companyRate;
      const saleShortAmount = shortQtyPerLine * saleRate;
      const claimPerLine = dispatchQty > 0 ? itemSettlementWeight * (totalUnloadingClaimAmount / dispatchQty) : 0;
      const deductionPerLine = dispatchQty > 0 ? itemSettlementWeight * (totalUnloadingDeductionAmount / dispatchQty) : 0;
      const freightPerLine = dispatchQty > 0 ? itemSettlementWeight * (freight / dispatchQty) : 0;
      const labourPerLine = dispatchQty > 0 ? itemSettlementWeight * (labourCharges / dispatchQty) : 0;
      const otherPerLine = dispatchQty > 0 ? itemSettlementWeight * (otherCharges / dispatchQty) : 0;
      const amount =
        item.amount != null
          ? Number(item.amount) || 0
          : itemSettlementWeight * companyRate;
      const netPayableValue =
        amount - freightPerLine - labourPerLine - otherPerLine - shortAmount - claimPerLine - deductionPerLine;

      return {
        ...item,
        shortQtyPerLine,
        shortAmount,
        sale_short_amount: toNumber(item.sale_short_amount ?? saleShortAmount),
        claim_per_line: toNumber(item.claim_per_line ?? claimPerLine),
        deduction_per_line: deductionPerLine,
        amount,
        freight: freightPerLine,
        labour_charges: labourPerLine,
        other_charges: otherPerLine,
        company_rate: companyRate,
        net_payable: netPayableValue,
      };
    });

    const totalSettlementShortageAmount = adjustmentDetails.reduce((sum, item) => {
      return sum + item.shortAmount;
    }, 0);
    const totalSaleShortageAmount = adjustmentDetails.reduce(
      (sum, item) => sum + item.sale_short_amount,
      0
    );
    const totalClaimAmount = totalUnloadingClaimAmount;
    const totalOtherDeductionAmount = totalUnloadingDeductionAmount;

    const totalSAmountPurchase = totalClaimAmount;
    const totalSAmountSale = totalClaimAmount;
    const netReceivable =
      saleAmount - freight - otherCharges - labourCharges - totalSaleShortageAmount - totalClaimAmount - totalOtherDeductionAmount;
    const netPayable =
      adjustmentDetails.length > 0
        ? adjustmentDetails.reduce((sum, item) => sum + item.net_payable, 0)
        : purchaseAmount - freight - otherCharges - labourCharges - totalSettlementShortageAmount - totalClaimAmount - totalOtherDeductionAmount;

    return {
      dispatchQty,
      saleAmount,
      settlementWeight,
      saleRate,
      purchaseAmount,
      freight,
      otherCharges,
      labourCharges,
      totalUnloadingClaimAmount,
      totalUnloadingDeductionAmount,
      adjustmentDetails,
      totalSettlementShortageAmount,
      totalSaleShortageAmount,
      totalClaimAmount,
      totalOtherDeductionAmount,
      totalSAmountPurchase,
      totalSAmountSale,
      netReceivable,
      netPayable,
      netProfitLoss: netReceivable - netPayable,
    };
  };

  useEffect(() => {
    axios.get(`${API_BASE}/companies`).then((res) => setCompanies(res.data || []));
    axios.get(`${API_BASE}/warehouses`).then((res) => setWarehouses(res.data || []));
    fetchReport();
  }, []);

  const fetchReport = async () => {
    try {
      const res = await axios.get(`${API_BASE}/outward-settlement/report/list`, {
        params: filters,
      });
      setRecords((Array.isArray(res.data) ? res.data : []).map(normalizeRow));
    } catch (err) {
      console.error(err);
      setRecords([]);
    }
  };

  const totals = useMemo(
    () =>
      records.reduce(
        (acc, row) => {
          acc.dispatch += toNumber(row.dispatch_qty);
          acc.unloading += toNumber(row.unloading_qty);
          acc.shortage += toNumber(row.shortage_qty);
          acc.settlement += toNumber(row.settlement_weight);
          acc.sale += toNumber(row.sale_amount);
          acc.gross += toNumber(row.gross_amount);
          acc.payable += toNumber(row.company_payable);
          acc.net += toNumber(row.receivable_amount);
          return acc;
        },
        {
          dispatch: 0,
          unloading: 0,
          shortage: 0,
          settlement: 0,
          sale: 0,
          gross: 0,
          payable: 0,
          net: 0,
        }
      ),
    [records]
  );

  const displayInvNo = (row) => {
    const inv = row.inv_no != null && String(row.inv_no).trim() !== "" ? String(row.inv_no).trim() : "";
    return inv || row.voucher_no || `OUT-${row.outward_id}`;
  };

  const displayAccountName = (row) => row.account_name || row.company_name || "-";
  const getLoadingTypeLabel = (sourceType) => {
    const normalized = String(sourceType || "").trim().toLowerCase();
    return normalized === "palti_lorry" ? "Palti Lorry" : "Warehouse Loading";
  };

  const createSinglePdf = (row) => {
    createSettlementReportPdf(row);
  };

  const createSettlementReportPdf = (row) => {
    const record = normalizeRow(row);
    const doc = new jsPDF("l", "mm", "a4");
    const invNo = displayInvNo(record);
    const acct = displayAccountName(record);

    {
      const calc = getRowCalculations(record);
      const generatedAt = new Date().toLocaleString();
      const left = 8;
      const right = 289;
      const green = [5, 86, 68];
      const orange = [229, 96, 12];

      doc.setFillColor(248, 251, 250);
      doc.rect(0, 0, 297, 210, "F");
      doc.setFillColor(green[0], green[1], green[2]);
      doc.roundedRect(6, 8, 285, 15, 2, 2, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(255, 255, 255);
      doc.text("OUTWARD SETTLEMENT REPORT", left + 3, 18);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.5);
      doc.text(`Generated: ${generatedAt}`, right - 5, 17, { align: "right" });

      doc.setFont("helvetica", "bold");
      doc.setFontSize(12.5);
      doc.setTextColor(15, 23, 42);
      doc.text(`${invNo} | ${acct}`, left + 3, 32);

      autoTable(doc, {
        startY: 36,
        theme: "plain",
        margin: { left: left + 3, right: left + 3 },
        styles: { fontSize: 7.2, cellPadding: 1.8, textColor: [31, 41, 55] },
        body: [[
          `Date: ${formatDate(record.date)}`,
          `Warehouse: ${record.warehouse_name || "-"}`,
          `Location: ${record.location_name || "-"}`,
          `Buyer: ${record.buyer_name || "-"}`,
          `Consignee: ${record.consignee_name || "-"}`,
          `Product: ${record.product_name || "-"}`,
        ]],
      });

      autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 2,
        theme: "grid",
        margin: { left: left + 3, right: left + 3 },
        headStyles: { fillColor: [238, 246, 243], textColor: green, fontStyle: "bold", halign: "center" },
        styles: { fontSize: 7.4, cellPadding: 2, lineColor: [222, 232, 238], lineWidth: 0.2, textColor: [15, 23, 42] },
        bodyStyles: { fontStyle: "bold", halign: "center" },
        head: [["Outward Company", "Qty", "Rate", "Amount", "Lorry No"]],
        body: [[
          acct,
          num(record.dispatch_qty),
          num(record.sale_rate),
          num(record.sale_amount),
          record.lorry_no || "-",
        ]],
      });

      const sectionY = doc.lastAutoTable.finalY + 8;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(green[0], green[1], green[2]);
      doc.text("ADJUSTED COMPANY DETAILS", left + 3, sectionY);
      doc.setDrawColor(210, 224, 230);
      doc.line(left + 3, sectionY + 3, right - 3, sectionY + 3);

      autoTable(doc, {
        startY: sectionY + 6,
        theme: "grid",
        margin: { left: left + 3, right: left + 3 },
        headStyles: { fillColor: green, textColor: 255, fontStyle: "bold", halign: "center" },
        styles: { fontSize: 6.3, cellPadding: 1.9, lineColor: [220, 230, 236], lineWidth: 0.18, textColor: [15, 23, 42] },
        alternateRowStyles: { fillColor: [250, 252, 252] },
        head: [[
          "Sr",
          "Adjusted Company",
          "Date",
          "Lorry No",
          "Inward Voucher",
          "Loading Type",
          "Settlement Weight",
          "Short Qnt",
          "Company Rate",
          "Freight",
          "Labour Chgs",
          "Other Chgs",
          "Amount",
          "S. Amount",
          "Net Payable",
        ]],
        body:
          calc.adjustmentDetails.length > 0
            ? calc.adjustmentDetails.map((item, index) => [
                item.sr_no || index + 1,
                item.company_name || "-",
                formatDate(item.inward_date),
                item.lorry_no || "-",
                item.inward_voucher_no || "-",
                getLoadingTypeLabel(item.source_type),
                num(item.settlement_weight),
                num(item.shortQtyPerLine),
                num(item.company_rate),
                num(item.freight),
                num(item.labour_charges),
                num(item.other_charges),
                num(item.amount),
                num(item.shortAmount),
                num(item.net_payable),
              ])
            : [["", "No adjusted inward details found.", "", "", "", "", "", "", "", "", "", "", "", "", ""]],
      });

      const summaryY = doc.lastAutoTable.finalY + 8;
      const cardW = 135;
      const cardH = 48;
      const drawSummary = (x, title, color, rows, totalLabel, totalValue) => {
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(220, 229, 235);
        doc.roundedRect(x, summaryY, cardW, cardH, 3, 3, "FD");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9.2);
        doc.setTextColor(color[0], color[1], color[2]);
        doc.text(title, x + 8, summaryY + 9);
        let y = summaryY + 16;
        rows.forEach(([label, value]) => {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(7.3);
          doc.setTextColor(31, 41, 55);
          doc.text(label, x + 8, y);
          doc.text(value, x + cardW - 8, y, { align: "right" });
          doc.setDrawColor(235, 240, 244);
          doc.line(x + 8, y + 2, x + cardW - 8, y + 2);
          y += 6.2;
        });
        doc.setFillColor(color[0], color[1], color[2]);
        doc.roundedRect(x, summaryY + cardH - 11, cardW, 11, 0, 0, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.6);
        doc.text(totalLabel, x + 8, summaryY + cardH - 4);
        doc.text(totalValue, x + cardW - 8, summaryY + cardH - 4, { align: "right" });
      };

      drawSummary(
        11,
        "SALE SUMMARY",
        green,
        [
          ["Sale Amount", num(calc.saleAmount)],
          ["Freight", num(calc.freight)],
          ["Other Charges", num(calc.otherCharges)],
          ["Labour Charges", num(calc.labourCharges)],
          ["S. Amount", num(calc.totalSAmountSale)],
        ],
        "Net Receivable",
        num(calc.netReceivable)
      );
      drawSummary(
        151,
        "PURCHASE SUMMARY",
        orange,
        [
          ["Purchase Amount", num(calc.purchaseAmount)],
          ["Freight", num(calc.freight)],
          ["Other Charges", num(calc.otherCharges)],
          ["Labour Charges", num(calc.labourCharges)],
          ["S. Amount", num(calc.totalSAmountPurchase)],
        ],
        "Net Payable",
        num(calc.netPayable)
      );

      const footerY = 198;
      doc.setDrawColor(190, 204, 214);
      doc.line(85, footerY, 120, footerY);
      doc.line(177, footerY, 212, footerY);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.2);
      doc.setTextColor(green[0], green[1], green[2]);
      doc.text("Thank you for your business!", 148.5, footerY + 1.5, { align: "center" });

      doc.save(`${invNo.replace(/[/\\?%*:|"<>]/g, "-")}_Settlement_Report.pdf`);
      return;
    }

    doc.setFillColor(14, 116, 144);
    doc.rect(0, 0, 297, 18, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(255, 255, 255);
    doc.text("Outward Settlement Report", 14, 12);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 230, 12);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(15, 23, 42);
    doc.text(`${invNo} | ${acct}`, 14, 28);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(
      `Date: ${formatDate(record.date)} | Warehouse: ${record.warehouse_name || "-"} | Location: ${record.location_name || "-"} | Lorry: ${record.lorry_no || "-"}`,
      14,
      34
    );
    doc.text(
      `Buyer: ${record.buyer_name || "-"} | Consignee: ${record.consignee_name || "-"} | Product: ${record.product_name || "-"}`,
      14,
      39
    );

    autoTable(doc, {
      startY: 44,
      theme: "grid",
      headStyles: { fillColor: [14, 116, 144], textColor: 255 },
      styles: { fontSize: 8, textColor: 0 },
      head: [[
        "Date",
        "Warehouse",
        "Location",
        "Lorry No",
        "Buyer",
        "Consignee",
        "Product",
        "Dispatch Qty",
        "Unloading Qty",
        "Shortage Qty",
        "Settlement Wt",
      ]],
      body: [[
        formatDate(record.date),
        record.warehouse_name || "-",
        record.location_name || "-",
        record.lorry_no || "-",
        record.buyer_name || "-",
        record.consignee_name || "-",
        record.product_name || "-",
        num(record.dispatch_qty),
        num(record.unloading_qty),
        num(record.shortage_qty),
        num(record.settlement_weight),
      ]],
    });

    const yAdjTitle = doc.lastAutoTable.finalY + 8;
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Adjusted Company Details", 14, yAdjTitle);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);

    autoTable(doc, {
      startY: yAdjTitle + 4,
      theme: "grid",
      headStyles: { fillColor: [14, 116, 144], textColor: 255 },
      styles: { fontSize: 7, textColor: 0 },
      head: [[
        "Sr",
        "Adjusted Company",
        "Lorry No",
        "Inward Voucher",
        "Loading Type",
        "Settlement Weight",
        "Short Qnt",
        "Short Amt",
        "S.Amount (Claim)",
        "C.Deduction",
        "Company Rate",
        "Freight",
        "Labour Chgs",
        "Other Chgs",
        "Amount",
        "S.Amount (Claim)",
        "Net Payable",
      ]],
      body:
        (record.adjustment_details || []).length > 0
          ? record.adjustment_details.map((item) => [
              item.sr_no,
              item.company_name || "-",
              item.lorry_no || "-",
              item.inward_voucher_no || "-",
              getLoadingTypeLabel(item.source_type),
              num(item.settlement_weight),
              num(item.shortQtyPerLine),
              num(item.shortAmount),
              num(item.sale_short_amount),
              num(item.claim_per_line + item.deduction_per_line),
              num(item.company_rate),
              num(item.freight),
              num(item.labour_charges),
              num(item.other_charges),
              num(item.amount),
              num((Number(record.dispatch_qty) || 0) > 0 ? ((Number(item.settlement_weight) || 0) / (Number(record.dispatch_qty) || 0)) * (Number(record.shortage_qty) || 0) * (Number(item.company_rate) || 0) : 0),
              num(
                (Number(item.amount) || 0) -
                (Number(item.freight) || 0) -
                (Number(item.labour_charges) || 0) -
                (Number(item.other_charges) || 0) -
                ((Number(record.dispatch_qty) || 0) > 0
                  ? ((Number(item.settlement_weight) || 0) / (Number(record.dispatch_qty) || 0)) * (Number(record.shortage_qty) || 0) * (Number(item.company_rate) || 0)
                  : 0)
              ),
            ])
            : [["", "No adjusted inward details found.", "", "", "", "", "", "", "", "", "", "", "", "", "", ""]],
    });

    const {
      saleAmount,
      purchaseAmount,
      freight,
      otherCharges,
      labourCharges,
      totalSAmountPurchase,
      totalSAmountSale,
      totalSaleShortageAmount,
      netReceivable,
      netPayable,
      netProfitLoss,
    } = getRowCalculations(record);

    const summaryStartY = doc.lastAutoTable.finalY + 8;
    const summarySectionHeight = 62;
    if (summaryStartY + summarySectionHeight > doc.internal.pageSize.getHeight() - 18) {
      doc.addPage();
    }

    const drawSummaryCard = ({
      title,
      accentFill,
      bodyFill,
      borderColor,
      x,
      y,
      width,
      rows,
      totalLabel,
      totalValue,
      totalColor,
    }) => {
      const headerHeight = 11;
      const rowHeight = 6.3;
      const totalHeight = 10.5;
      const innerPad = 2.5;
      const height = headerHeight + rows.length * rowHeight + totalHeight + 8;

      doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
      doc.setLineWidth(0.22);
      doc.setFillColor(236, 241, 247);
      doc.roundedRect(x + 1.2, y + 1.4, width, height, 4, 4, "F");

      doc.setFillColor(255, 255, 255);
      doc.roundedRect(x, y, width, height, 4, 4, "FD");

      doc.setFillColor(bodyFill[0], bodyFill[1], bodyFill[2]);
      doc.roundedRect(x + 1.8, y + headerHeight + 1.5, width - 3.6, height - headerHeight - 3.6, 3, 3, "F");

      doc.setFillColor(accentFill[0], accentFill[1], accentFill[2]);
      doc.roundedRect(x, y, width, headerHeight, 4, 4, "F");
      doc.rect(x, y + 4, width, headerHeight - 4, "F");
      doc.setFillColor(
        Math.min(accentFill[0] + 22, 255),
        Math.min(accentFill[1] + 22, 255),
        Math.min(accentFill[2] + 22, 255)
      );
      doc.circle(x + 18, y + 5.5, 7, "F");
      doc.circle(x + width - 16, y + 4.2, 5.5, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(255, 255, 255);
      doc.text(title, x + 6, y + 7.2);

      let rowY = y + headerHeight + 2;
      rows.forEach(([label, value], index) => {
        doc.setFillColor(index % 2 === 0 ? 255 : 250, index % 2 === 0 ? 255 : 252, index % 2 === 0 ? 255 : 254);
        doc.roundedRect(x + innerPad, rowY, width - innerPad * 2, rowHeight - 0.6, 1.8, 1.8, "F");

        doc.setDrawColor(232, 237, 243);
        doc.line(x + 5, rowY + rowHeight - 0.2, x + width - 5, rowY + rowHeight - 0.2);

        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.7);
        doc.setTextColor(44, 62, 80);
        doc.text(label, x + 7, rowY + 4.2);

        doc.setFont("helvetica", "bold");
        doc.setTextColor(30, 41, 59);
        doc.text(String(value), x + width - 7, rowY + 4.2, { align: "right" });
        rowY += rowHeight;
      });

      doc.setFillColor(246, 250, 253);
      doc.roundedRect(x + innerPad, rowY + 2.2, width - innerPad * 2, totalHeight, 3, 3, "F");
      doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
      doc.roundedRect(x + innerPad, rowY + 2.2, width - innerPad * 2, totalHeight, 3, 3, "S");

      doc.setFillColor(255, 255, 255);
      doc.roundedRect(x + width - 42, rowY + 3.6, 33, totalHeight - 2.8, 2.5, 2.5, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      doc.text(totalLabel, x + 7, rowY + 8.2);
      doc.setTextColor(totalColor[0], totalColor[1], totalColor[2]);
      doc.text(String(totalValue), x + width - 11, rowY + 8.2, { align: "right" });

      return y + height;
    };

    const cardWidth = 124;
    const saleBottomY = drawSummaryCard({
      title: "Sale Summary",
      accentFill: [14, 116, 144],
      bodyFill: [241, 248, 255],
      borderColor: [125, 181, 201],
      x: 14,
      y: summaryStartY,
      width: cardWidth,
      rows: [
        ["Sale Amount", num(saleAmount)],
        ["Freight", num(freight)],
        ["Other Charges", num(otherCharges)],
        ["Labour Charges", num(labourCharges)],
        ["Shortage Amount", num(totalSaleShortageAmount)],
        ["S.Amount (Claim)", num(totalSAmountSale)],
      ],
      totalLabel: "Net Receivable",
      totalValue: num(netReceivable),
      totalColor: [21, 128, 61],
    });

    const purchaseBottomY = drawSummaryCard({
      title: "Purchase Summary",
      accentFill: [180, 83, 9],
      bodyFill: [255, 247, 237],
      borderColor: [224, 164, 108],
      x: 157,
      y: summaryStartY,
      width: cardWidth,
      rows: [
        ["Purchase Amount", num(purchaseAmount)],
        ["Freight", num(freight)],
        ["Other Charges", num(otherCharges)],
        ["Labour Charges", num(labourCharges)],
        ["Shortage Amount", num(totalSettlementShortageAmount)],
        ["S.Amount (Claim)", num(totalSAmountPurchase)],
      ],
      totalLabel: "Net Payable",
      totalValue: num(netPayable),
      totalColor: [194, 65, 12],
    });

    const plVal = netProfitLoss;
    const plColor = plVal < 0 ? [220, 38, 38] : plVal > 0 ? [21, 128, 61] : [30, 41, 59];
    const skyFill = [241, 245, 249];

    const yPl = Math.max(saleBottomY, purchaseBottomY) + 10;
    const xPl = 14;
    const wPl = 128;
    const hPl = 18;

    doc.setFillColor(skyFill[0], skyFill[1], skyFill[2]);
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.25);
    if (typeof doc.roundedRect === "function") {
      doc.roundedRect(xPl, yPl, wPl, hPl, 5, 5, "FD");
    } else {
      doc.rect(xPl, yPl, wPl, hPl, "FD");
    }

    doc.setFillColor(255, 255, 255);
    doc.roundedRect(xPl + 3, yPl + 3, 24, 12, 3, 3, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text("P/L", xPl + 15, yPl + 10.3, { align: "center" });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.2);
    doc.setTextColor(15, 23, 42);
    doc.text("Net Profit / Loss", xPl + 32, yPl + 7.2);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.2);
    doc.setTextColor(100, 116, 139);
    doc.text("Final settlement margin", xPl + 32, yPl + 12.3);

    doc.setFontSize(13.5);
    doc.setTextColor(plColor[0], plColor[1], plColor[2]);
    doc.text(num(netProfitLoss), xPl + wPl - 7, yPl + 11, { align: "right" });

    const footerY = doc.internal.pageSize.getHeight() - 10;
    doc.setDrawColor(180);
    doc.line(14, footerY - 4, 283, footerY - 4);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text("Warehouse ERP Settlement Report", 14, footerY);
    doc.text("Confidential", 250, footerY);

    doc.save(`${invNo.replace(/[/\\?%*:|"<>]/g, "-")}_Settlement.pdf`);
  };

  const downloadPDF = () => {
    const doc = new jsPDF("l", "mm", "a4");
    doc.setFontSize(16);
    doc.text("Outward Settlement Report", 14, 14);
    doc.setFontSize(10);
    doc.text(`From: ${formatDate(filters.from_date)}   To: ${formatDate(filters.to_date)}`, 14, 21);

    autoTable(doc, {
      startY: 26,
      theme: "grid",
      headStyles: { fillColor: [15, 118, 110] },
      styles: { fontSize: 7 },
      head: [[
        "Date",
        "Voucher",
        "Outward Company",
        "Warehouse",
        "Location",
        "Lorry",
        "Dispatch Qty",
        "Unloading Qty",
        "Shortage Qty",
        "Settlement Wt",
        "Sale Amount",
        "Net Receivable",
        "Company Payable",
        "Net P/L",
      ]],
      body: records.map((row) => [
        formatDate(row.date),
        row.voucher_no || `OUT-${row.outward_id}`,
        row.company_name || "-",
        row.warehouse_name || "-",
        row.location_name || "-",
        row.lorry_no || "-",
        num(row.dispatch_qty),
        num(row.unloading_qty),
        num(row.shortage_qty),
        num(row.settlement_weight),
        num(row.sale_amount),
        num(row.gross_amount),
        num(row.company_payable),
        num(row.receivable_amount),
      ]),
      foot: [[
        "",
        "",
        "",
        "",
        "",
        "Totals",
        num(totals.dispatch),
        num(totals.unloading),
        num(totals.shortage),
        num(totals.settlement),
        num(totals.sale),
        num(totals.gross),
        num(totals.payable),
        num(totals.net),
      ]],
    });

    let startY = doc.lastAutoTable.finalY + 10;

    records.forEach((row, index) => {
      const record = normalizeRow(row);
      if (startY > 178) {
        doc.addPage("a4", "landscape");
        startY = 14;
      }

      doc.setFontSize(11);
      doc.text(
        `${record.voucher_no || `OUT-${record.outward_id}`} | ${record.company_name || "-"} | ${record.location_name || "-"} | ${record.lorry_no || "-"}`,
        14,
        startY
      );

      autoTable(doc, {
        startY: startY + 3,
        theme: "grid",
        headStyles: { fillColor: [30, 41, 59] },
        styles: { fontSize: 7 },
        margin: { left: 14, right: 14 },
        head: [[
          "Sr",
          "Adjusted Company",
          "Lorry No",
          "Inward Voucher",
          "Loading Type",
          "Settlement Weight",
        "Short Qnt",
        "Company Rate",
          "Freight",
          "Labour Chgs",
          "Other Chgs",
          "Amount",
          "S.Amount (Claim)",
          "Net Payable",
        ]],
        body:
          (record.adjustment_details || []).length > 0
            ? record.adjustment_details.map((item) => [
                item.sr_no,
                item.company_name || "-",
                item.lorry_no || "-",
                item.inward_voucher_no || "-",
                getLoadingTypeLabel(item.source_type),
                num(item.settlement_weight),
                num((Number(record.dispatch_qty) || 0) > 0 ? ((Number(item.settlement_weight) || 0) / (Number(record.dispatch_qty) || 0)) * (Number(record.shortage_qty) || 0) : 0),
                num(item.company_rate),
                num(item.freight),
                num(item.labour_charges),
                num(item.other_charges),
                num(item.amount),
                num((Number(record.dispatch_qty) || 0) > 0 ? ((Number(item.settlement_weight) || 0) / (Number(record.dispatch_qty) || 0)) * (Number(record.shortage_qty) || 0) * (Number(item.company_rate) || 0) : 0),
                num(
                  (Number(item.amount) || 0) -
                  (Number(item.freight) || 0) -
                  (Number(item.labour_charges) || 0) -
                  (Number(item.other_charges) || 0) -
                  ((Number(record.dispatch_qty) || 0) > 0
                    ? ((Number(item.settlement_weight) || 0) / (Number(record.dispatch_qty) || 0)) * (Number(record.shortage_qty) || 0) * (Number(item.company_rate) || 0)
                    : 0)
                ),
              ])
            : [["", "No adjusted inward details found.", "", "", "", "", "", "", "", "", "", "", "", ""]],
      });

      const {
        saleAmount,
        purchaseAmount,
        totalSAmountPurchase,
        totalSAmountSale,
        netReceivable,
        netPayable,
      } = getRowCalculations(record);

      autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 4,
        theme: "grid",
        headStyles: { fillColor: [14, 116, 144], textColor: 255 },
        styles: { fontSize: 8, halign: "right" },
        margin: { left: 14, right: 14 },
        head: [["Sale Amount", "Freight", "Other Chgs", "Labour Chgs", "S.Amount (Claim)", "Net Receivable"]],
      body: [[
        num(saleAmount),
        num(record.freight),
        num(record.other_charges),
        num(record.outward_labour_charges),
        num(totalSAmountSale),
        num(netReceivable),
      ]],
    });

      autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 4,
        theme: "grid",
        headStyles: { fillColor: [14, 116, 144], textColor: 255 },
        styles: { fontSize: 8, halign: "right" },
        margin: { left: 14, right: 14 },
        head: [["Purchase Amount (Sett.Wt×Co.Rate)", "Freight", "Other Chgs", "Labour Chgs", "S.Amount (Claim)", "Net Payable"]],
      body: [[
        num(purchaseAmount),
        num(record.freight),
        num(record.other_charges),
        num(record.outward_labour_charges),
        num(totalSAmountPurchase),
        num(netPayable),
      ]],
      });

      const plVal = Number(record.receivable_amount);
      const plColor = plVal < 0 ? [220, 38, 38] : plVal > 0 ? [21, 128, 61] : [30, 41, 59];
      const skyFill = [224, 242, 254];

      const yPl = doc.lastAutoTable.finalY + 8;
      const xPl = 14;
      const wPl = 100;
      const hPl = 13;

      doc.setFillColor(skyFill[0], skyFill[1], skyFill[2]);
      doc.setDrawColor(165, 200, 232);
      doc.setLineWidth(0.35);
      if (typeof doc.roundedRect === "function") {
        doc.roundedRect(xPl, yPl, wPl, hPl, 5, 5, "FD");
      } else {
        doc.rect(xPl, yPl, wPl, hPl, "FD");
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(15, 23, 42);
      doc.text("Net Profit / Loss", xPl + 6, yPl + 8.6);

      doc.setTextColor(plColor[0], plColor[1], plColor[2]);
      doc.setFontSize(14);
      doc.text(num(record.receivable_amount), xPl + wPl - 6, yPl + 8.6, { align: "right" });

      startY = yPl + hPl + (index === records.length - 1 ? 0 : 8);
    });

    doc.save("Outward_Settlement_Report.pdf");
  };

  return (
    <div style={{ padding: 20, background: "#f8fafc", minHeight: "100vh", fontFamily: "Segoe UI, Arial, sans-serif" }}>
      <div style={{ ...card, marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h2 style={{ margin: 0, color: "#0f172a" }}>Outward Settlement Report</h2>
          <p style={{ margin: "6px 0 0", color: "#0f172a" }}>
            Outward details, adjusted company breakdown, gross amount, and net profit or loss
          </p>
        </div>
        <button
          onClick={() => navigate("/dashboard")}
          style={{
            padding: "8px 16px",
            background: "#6366f1",
            color: "#fff",
            border: "none",
            borderRadius: 4,
            fontSize: 14,
            cursor: "pointer",
            fontWeight: 600,
            whiteSpace: "nowrap",
          }}
        >
          ← Back
        </button>
      </div>

      <div style={{ ...card, marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <input type="date" name="from_date" value={filters.from_date} onChange={(e) => setFilters((p) => ({ ...p, from_date: e.target.value }))} style={input} />
          <input type="date" name="to_date" value={filters.to_date} onChange={(e) => setFilters((p) => ({ ...p, to_date: e.target.value }))} style={input} />

          <select name="company_id" value={filters.company_id} onChange={(e) => setFilters((p) => ({ ...p, company_id: e.target.value }))} style={input}>
            <option value="">All Outward Companies</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <select name="warehouse_id" value={filters.warehouse_id} onChange={(e) => setFilters((p) => ({ ...p, warehouse_id: e.target.value }))} style={input}>
            <option value="">All Warehouses</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>

          <button onClick={fetchReport} style={{ ...button, background: "#0f766e" }}>
            Apply
          </button>
          <button onClick={downloadPDF} style={{ ...button, background: "#2563eb" }}>
            Download PDF
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 14, marginBottom: 16 }}>
        <div style={card}><div>Total Dispatch</div><div style={statValue}>{num(totals.dispatch)}</div></div>
        <div style={card}><div>Total Unloading</div><div style={statValue}>{num(totals.unloading)}</div></div>
        <div style={card}><div>Total Shortage</div><div style={statValue}>{num(totals.shortage)}</div></div>
        <div style={card}><div>Total Settlement Wt</div><div style={statValue}>{num(totals.settlement)}</div></div>
        <div style={card}><div>Total Net Receivable</div><div style={statValue}>{num(totals.gross)}</div></div>
        <div style={card}><div>Total Net Profit / Loss</div><div style={statValue}>{num(totals.net)}</div></div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {records.length > 0 ? (
          records.map((row) => {
            const record = normalizeRow(row);
            const {
              dispatchQty,
              saleAmount,
              purchaseAmount,
              freight,
              otherCharges,
              labourCharges,
              adjustmentDetails,
              totalSAmountPurchase,
              totalSAmountSale,
              totalSaleShortageAmount,
              netReceivable,
              netPayable,
              netProfitLoss,
            } = getRowCalculations(record);
            return (
              <div key={record.id} style={card}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 14 }}>
                <div>
                  <h3 style={{ margin: 0, color: "#0f172a" }}>
                    {displayInvNo(record)} | {displayAccountName(record)}
                  </h3>
                  <div style={{ color: "#0f172a", marginTop: 6 }}>
                    Date: {formatDate(record.date)} | Warehouse: {record.warehouse_name || "-"} | Location: {record.location_name || "-"} | Lorry: {record.lorry_no || "-"}
                  </div>
                  <div style={{ color: "#0f172a", marginTop: 4 }}>
                    Buyer: {record.buyer_name || "-"} | Consignee: {record.consignee_name || "-"} | Product: {record.product_name || "-"}
                  </div>
                </div>
                <div style={{ minWidth: 280, color: "#0f172a", fontSize: 14 }}>
                  <div>Dispatch Qty: {num(record.dispatch_qty)}</div>
                  <div>Unloading Qty: {num(record.unloading_qty)}</div>
                  <div>Shortage Qty: {num(record.shortage_qty)}</div>
                  <div>Settlement Weight: {num(record.settlement_weight)}</div>
                </div>
              </div>

              <div
                style={{
                  overflowX: "auto",
                  marginBottom: 14,
                  border: "1px solid #d1d5db",
                  borderRadius: 0,
                  background: "#ffffff",
                }}
              >
                <div
                  style={{
                    padding: "0 0 10px 0",
                    fontSize: 14,
                    fontWeight: 800,
                    color: "#1d4ed8",
                  }}
                >
                  Adjusted Company Details
                </div>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: 12,
                    tableLayout: "auto",
                    background: "#ffffff",
                  }}
                >
                  <thead>
                    <tr>
                      <th style={{ ...hardHeaderCell, width: "40px" }}>Sr</th>
                      <th style={{ ...hardHeaderCell, width: "138px" }}>Company Name</th>
                      <th style={{ ...hardHeaderCell, width: "118px" }}>Lorry No</th>
                      <th style={{ ...hardHeaderCell, width: "118px" }}>Inward Voucher</th>
                      <th style={{ ...hardHeaderCell, width: "128px" }}>Loading Type</th>
                      <th style={{ ...hardHeaderCell, width: "118px" }}>Settlement Weight</th>
                      <th style={{ ...hardHeaderCell, width: "92px" }}>Short Qnt</th>
                      <th style={{ ...hardHeaderCell, width: "96px" }}>Short Amt</th>
                      <th style={{ ...hardHeaderCell, width: "96px" }}>S.Amount (Claim)</th>
                      <th style={{ ...hardHeaderCell, width: "96px" }}>C.Deduction</th>
                      <th style={{ ...hardHeaderCell, width: "110px" }}>Company Rate</th>
                      <th style={{ ...hardHeaderCell, width: "84px" }}>Freight</th>
                      <th style={{ ...hardHeaderCell, width: "92px" }}>Labour Chgs</th>
                      <th style={{ ...hardHeaderCell, width: "88px" }}>Other Chgs</th>
                      <th style={{ ...hardHeaderCell, width: "96px" }}>Amount</th>
                      <th style={{ ...hardHeaderCell, width: "102px" }}>Net Payable</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adjustmentDetails.length > 0 ? (
                      adjustmentDetails.map((item, index) => (
                        <tr key={item.id} style={{ background: index % 2 === 0 ? "#ffffff" : "#f4f7fa" }}>
                          <td style={hardBodyCell}>{item.sr_no}</td>
                          <td style={hardBodyCell}>{item.company_name || "-"}</td>
                          <td style={hardBodyCell}>{item.lorry_no || "-"}</td>
                          <td style={hardBodyCell}>{item.inward_voucher_no || "-"}</td>
                          <td style={hardBodyCell}>{getLoadingTypeLabel(item.source_type)}</td>
                          <td style={hardBodyCell}>{num(item.settlement_weight)}</td>
                          <td style={hardBodyCell}>{num(item.shortQtyPerLine)}</td>
                          <td style={hardBodyCell}>{num(item.shortAmount)}</td>
                          <td style={hardBodyCell}>{num(item.sale_short_amount)}</td>
                          <td style={hardBodyCell}>{num(item.claim_per_line + item.deduction_per_line)}</td>
                          <td style={hardBodyCell}>{num(item.company_rate)}</td>
                          <td style={hardBodyCell}>{num(item.freight)}</td>
                          <td style={hardBodyCell}>{num(item.labour_charges)}</td>
                          <td style={hardBodyCell}>{num(item.other_charges)}</td>
                          <td style={hardBodyCell}>{num(item.amount)}</td>
                          <td style={hardBodyCell}>{num(item.net_payable)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td style={hardBodyCell} colSpan="16">No adjusted inward details found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div style={summaryBoxStyle}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12, padding: 12 }}>
                  <div style={compactSummaryCardStyle}>
                    <div style={compactSummaryHeaderStyle}>
                      <span>Sale Summary</span>
                      <strong>{num(netReceivable)}</strong>
                    </div>
                    <div style={compactMetricGridStyle}>
                      <div style={compactMetricItemStyle}><span>Sale</span><strong>{num(saleAmount)}</strong></div>
                      <div style={compactMetricItemStyle}><span>Freight</span><strong>{num(freight)}</strong></div>
                      <div style={compactMetricItemStyle}><span>Other</span><strong>{num(otherCharges)}</strong></div>
                      <div style={compactMetricItemStyle}><span>Labour</span><strong>{num(labourCharges)}</strong></div>
                      <div style={compactMetricItemStyle}><span>Shortage Amount</span><strong>{num(totalSaleShortageAmount)}</strong></div>
                      <div style={compactMetricItemStyle}><span>S.Amount (Claim)</span><strong>{num(totalSAmountSale)}</strong></div>
                      <div style={{ ...compactMetricItemStyle, background: "#ecfdf5", borderColor: "#86efac" }}>
                        <span>Receivable</span><strong style={{ color: "#15803d" }}>{num(netReceivable)}</strong>
                      </div>
                    </div>
                  </div>

                  <div style={compactSummaryCardStyle}>
                    <div style={compactSummaryHeaderStyle}>
                      <span>Purchase Summary</span>
                      <strong>{num(netPayable)}</strong>
                    </div>
                    <div style={compactMetricGridStyle}>
                      <div style={compactMetricItemStyle}><span>Purchase</span><strong>{num(purchaseAmount)}</strong></div>
                      <div style={compactMetricItemStyle}><span>Freight</span><strong>{num(freight)}</strong></div>
                      <div style={compactMetricItemStyle}><span>Other</span><strong>{num(otherCharges)}</strong></div>
                      <div style={compactMetricItemStyle}><span>Labour</span><strong>{num(labourCharges)}</strong></div>
                        <div style={compactMetricItemStyle}><span>Shortage Amount</span><strong>{num(totalSettlementShortageAmount)}</strong></div>
                        <div style={compactMetricItemStyle}><span>S.Amount (Claim)</span><strong>{num(totalSAmountPurchase)}</strong></div>
                      <div style={{ ...compactMetricItemStyle, background: "#fff7ed", borderColor: "#fdba74" }}>
                        <span>Payable</span><strong style={{ color: "#c2410c" }}>{num(netPayable)}</strong>
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ padding: "0 12px 12px" }}>
                  <div
                    style={{
                      maxWidth: 320,
                      padding: "10px 14px",
                      borderRadius: 12,
                      background: "#eff6ff",
                      border: "1px solid #93c5fd",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 12,
                    }}
                  >
                    <span style={{ fontSize: 14, fontWeight: 800, color: "#0f172a" }}>Net Profit / Loss</span>
                    <span
                      style={{
                        fontSize: 18,
                        fontWeight: 900,
                        color: netProfitLoss < 0 ? "#dc2626" : netProfitLoss > 0 ? "#15803d" : "#1e293b",
                      }}
                    >
                      {num(netProfitLoss)}
                    </span>
                  </div>
                </div>
              </div>

                    <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 14 }}>
                <button
                  onClick={() => createSinglePdf(record)}
                  style={{ ...iconActionButtonStyle, background: "#1d4ed8" }}
                  title="Download PDF"
                  aria-label="Download PDF"
                >
                  <FaFilePdf />
                </button>
                <button
                  onClick={() => setEditingRecord(record)}
                  style={{ ...iconActionButtonStyle, background: "#0f766e" }}
                  title="Edit Settlement"
                  aria-label="Edit Settlement"
                >
                  <FaEdit />
                </button>
              </div>

              {record.narration ? (
                <div style={{ marginTop: 12, color: "#475569" }}>
                  Narration: {record.narration}
                </div>
              ) : null}
            </div>
            );
          })
        ) : (
          <div style={card}>No records found</div>
        )}
      </div>

      <div style={{ display: "flex", justifyContent: "center", marginTop: 20, paddingBottom: 24 }}>
        <button onClick={downloadPDF} style={{ ...button, background: "#1d4ed8", minWidth: 180 }}>
          Download PDF
        </button>
      </div>

      {editingRecord ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.45)",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "center",
            padding: "20px 0",
            zIndex: 1000,
            overflowY: "auto",
          }}
        >
          <div
            style={{
              width: "94%",
              maxWidth: "1200px",
              background: "#fff",
              borderRadius: 18,
              padding: 18,
              position: "relative",
              boxShadow: "0 24px 60px rgba(15,23,42,0.28)",
            }}
          >
            <button
              onClick={() => setEditingRecord(null)}
              style={{
                position: "absolute",
                top: 12,
                right: 12,
                width: 34,
                height: 34,
                borderRadius: "50%",
                border: "none",
                background: "#ef4444",
                color: "#fff",
                cursor: "pointer",
                fontWeight: 700,
              }}
            >
              X
            </button>
            <OutwardSettlementPage
              outward={{ id: editingRecord.outward_id }}
              onSaved={() => {
                fetchReport();
                setEditingRecord(null);
              }}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

const statValue = {
  fontSize: 24,
  fontWeight: 700,
  marginTop: 6,
  color: "#0f172a",
};

const summaryHeadStyle = {
  padding: "11px 14px",
  border: "1px solid #cbd5e1",
  background: "#f8fafc",
  fontWeight: 700,
  color: "#0f172a",
  whiteSpace: "nowrap",
  letterSpacing: "0.1px",
};

const summaryCellStyle = {
  padding: "11px 14px",
  border: "1px solid #cbd5e1",
  background: "#ffffff",
  color: "#0f172a",
};

const summaryBoxStyle = {
  border: "1px solid #d1d5db",
  borderRadius: 16,
  overflow: "hidden",
  boxShadow: "0 1px 4px rgba(15, 23, 42, 0.07)",
  background: "#f1f5f9",
  color: "#0f172a",
  padding: "10px 12px",
};

const compactSummaryCardStyle = {
  background: "#ffffff",
  border: "1px solid rgba(15, 118, 110, 0.2)",
  borderRadius: 14,
  padding: 12,
  boxShadow: "0 8px 18px rgba(15, 23, 42, 0.06)",
};

const compactSummaryHeaderStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  marginBottom: 10,
  paddingBottom: 8,
  borderBottom: "1px solid rgba(15, 118, 110, 0.14)",
  color: "#0f172a",
  fontSize: 16,
  fontWeight: 800,
};

const compactMetricGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
  gap: 8,
};

const compactMetricItemStyle = {
  display: "flex",
  flexDirection: "column",
  gap: 4,
  padding: "10px 12px",
  borderRadius: 10,
  background: "#f8fafc",
  border: "1px solid rgba(148, 163, 184, 0.2)",
  color: "#0f172a",
  fontSize: 12,
};

const iconActionButtonStyle = {
  width: 42,
  height: 38,
  border: "none",
  borderRadius: 8,
  color: "#ffffff",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 16,
  cursor: "pointer",
  boxShadow: "0 6px 14px rgba(15, 23, 42, 0.14)",
};

const tableCellStyle = {
  padding: "9px 12px",
  border: "1px solid #dbe4ea",
  color: "#0f172a",
  whiteSpace: "nowrap",
};

const hardHeaderCell = {
  background: "#0f766e",
  color: "#ffffff",
  padding: "8px 10px",
  border: "1px solid #0f766e",
  textAlign: "left",
  fontWeight: 700,
  fontSize: 12,
  lineHeight: 1.2,
  whiteSpace: "nowrap",
};

const hardBodyCell = {
  padding: "8px 10px",
  border: "1px solid #cbd5e1",
  color: "#0f172a",
  fontSize: 12,
  lineHeight: 1.2,
  whiteSpace: "nowrap",
  background: "transparent",
};

