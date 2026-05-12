import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
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
  const formatDate = (value) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    const dd = String(date.getDate()).padStart(2, "0");
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    return `${dd}-${mm}-${date.getFullYear()}`;
  };

  const getRowCalculations = (row) => {
    const dispatchQty = Number(row.dispatch_qty) || 0;
    const shortageQty = Number(row.shortage_qty) || 0;
    const saleAmount = Number(row.sale_amount) || 0;
    const settlementWeight = Number(row.settlement_weight) || 0;
    const saleRate = settlementWeight > 0 ? saleAmount / settlementWeight : 0;
    const purchaseAmount =
      Number(row.company_amount) ||
      settlementWeight * (Number(row.company_rate) || 0);
    const freight = Number(row.freight) || 0;
    const otherCharges = Number(row.other_charges) || 0;
    const labourCharges = Number(row.outward_labour_charges) || 0;

    const adjustmentDetails = (row.adjustment_details || []).map((item) => {
      const itemSettlementWeight = Number(item.settlement_weight) || 0;
      const companyRate = Number(item.company_rate ?? row.company_rate) || 0;
      const shortQtyPerLine =
        dispatchQty > 0 ? (itemSettlementWeight / dispatchQty) * shortageQty : 0;
      const shortAmount =
        item.short_amount != null
          ? Number(item.short_amount) || 0
          : shortQtyPerLine * companyRate;
      const amount =
        item.amount != null
          ? Number(item.amount) || 0
          : itemSettlementWeight * companyRate;
      const freightValue =
        item.freight != null
          ? Number(item.freight) || 0
          : dispatchQty > 0
            ? itemSettlementWeight * (freight / dispatchQty)
            : 0;
      const labourValue =
        item.labour_charges != null
          ? Number(item.labour_charges) || 0
          : dispatchQty > 0
            ? itemSettlementWeight * (labourCharges / dispatchQty)
            : 0;
      const otherValue =
        item.other_charges != null
          ? Number(item.other_charges) || 0
          : dispatchQty > 0
            ? itemSettlementWeight * (otherCharges / dispatchQty)
            : 0;
      const netPayableValue =
        amount - freightValue - labourValue - otherValue - shortAmount;

      return {
        ...item,
        shortQtyPerLine,
        shortAmount,
        amount,
        freight: freightValue,
        labour_charges: labourValue,
        other_charges: otherValue,
        company_rate: companyRate,
        net_payable: netPayableValue,
      };
    });

    const totalSAmountPurchase = adjustmentDetails.reduce(
      (sum, item) => sum + item.shortAmount,
      0
    );
    const totalSAmountSale = adjustmentDetails.reduce(
      (sum, item) => sum + item.shortQtyPerLine * saleRate,
      0
    );
    const netReceivable =
      saleAmount - freight - otherCharges - labourCharges - totalSAmountSale;
    const netPayable =
      adjustmentDetails.length > 0
        ? adjustmentDetails.reduce((sum, item) => sum + item.net_payable, 0)
        : purchaseAmount - freight - otherCharges - labourCharges - totalSAmountPurchase;

    return {
      dispatchQty,
      saleAmount,
      settlementWeight,
      saleRate,
      purchaseAmount,
      freight,
      otherCharges,
      labourCharges,
      adjustmentDetails,
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
      setRecords(res.data || []);
    } catch (err) {
      console.error(err);
      setRecords([]);
    }
  };

  const totals = useMemo(
    () =>
      records.reduce(
        (acc, row) => {
          acc.dispatch += Number(row.dispatch_qty) || 0;
          acc.unloading += Number(row.unloading_qty) || 0;
          acc.shortage += Number(row.shortage_qty) || 0;
          acc.settlement += Number(row.settlement_weight) || 0;
          acc.sale += Number(row.sale_amount) || 0;
          acc.gross += Number(row.gross_amount) || 0;
          acc.payable += Number(row.company_payable) || 0;
          acc.net += Number(row.receivable_amount) || 0;
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

  const createSinglePdf = (row) => {
    const doc = new jsPDF("l", "mm", "a4");
    const invNo = displayInvNo(row);
    const acct = displayAccountName(row);

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
      `Date: ${formatDate(row.date)} | Warehouse: ${row.warehouse_name || "-"} | Location: ${row.location_name || "-"} | Lorry: ${row.lorry_no || "-"}`,
      14,
      34
    );
    doc.text(
      `Buyer: ${row.buyer_name || "-"} | Consignee: ${row.consignee_name || "-"} | Product: ${row.product_name || "-"}`,
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
        formatDate(row.date),
        row.warehouse_name || "-",
        row.location_name || "-",
        row.lorry_no || "-",
        row.buyer_name || "-",
        row.consignee_name || "-",
        row.product_name || "-",
        num(row.dispatch_qty),
        num(row.unloading_qty),
        num(row.shortage_qty),
        num(row.settlement_weight),
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
        "Settlement Weight",
        "Short Qnt",
        "Company Rate",
        "Freight",
        "Labour Chgs",
        "Other Chgs",
        "Amount",
        "S.Amount",
        "Net Payable",
      ]],
      body:
        (row.adjustment_details || []).length > 0
          ? row.adjustment_details.map((item) => [
              item.sr_no,
              item.company_name || "-",
              item.lorry_no || "-",
              item.inward_voucher_no || "-",
              num(item.settlement_weight),
              num((Number(row.dispatch_qty) || 0) > 0 ? ((Number(item.settlement_weight) || 0) / (Number(row.dispatch_qty) || 0)) * (Number(row.shortage_qty) || 0) : 0),
              num(item.company_rate),
              num(item.freight),
              num(item.labour_charges),
              num(item.other_charges),
              num(item.amount),
              num((Number(row.dispatch_qty) || 0) > 0 ? ((Number(item.settlement_weight) || 0) / (Number(row.dispatch_qty) || 0)) * (Number(row.shortage_qty) || 0) * (Number(item.company_rate) || 0) : 0),
              num(
                (Number(item.amount) || 0) -
                (Number(item.freight) || 0) -
                (Number(item.labour_charges) || 0) -
                (Number(item.other_charges) || 0) -
                ((Number(row.dispatch_qty) || 0) > 0
                  ? ((Number(item.settlement_weight) || 0) / (Number(row.dispatch_qty) || 0)) * (Number(row.shortage_qty) || 0) * (Number(item.company_rate) || 0)
                  : 0)
              ),
            ])
          : [["", "No adjusted inward details found.", "", "", "", "", "", "", "", "", "", "", ""]],
    });

    const {
      saleAmount,
      purchaseAmount,
      freight,
      otherCharges,
      labourCharges,
      totalSAmountPurchase,
      totalSAmountSale,
      netReceivable,
      netPayable,
      netProfitLoss,
    } = getRowCalculations(row);

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
        ["S.Amount", num(totalSAmountSale)],
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
        ["S.Amount", num(totalSAmountPurchase)],
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
      if (startY > 178) {
        doc.addPage("a4", "landscape");
        startY = 14;
      }

      doc.setFontSize(11);
      doc.text(
        `${row.voucher_no || `OUT-${row.outward_id}`} | ${row.company_name || "-"} | ${row.location_name || "-"} | ${row.lorry_no || "-"}`,
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
          "Settlement Weight",
        "Short Qnt",
        "Company Rate",
          "Freight",
          "Labour Chgs",
          "Other Chgs",
          "Amount",
          "S.Amount",
          "Net Payable",
        ]],
        body:
          (row.adjustment_details || []).length > 0
            ? row.adjustment_details.map((item) => [
                item.sr_no,
                item.company_name || "-",
                item.lorry_no || "-",
                item.inward_voucher_no || "-",
                num(item.settlement_weight),
              num((Number(row.dispatch_qty) || 0) > 0 ? ((Number(item.settlement_weight) || 0) / (Number(row.dispatch_qty) || 0)) * (Number(row.shortage_qty) || 0) : 0),
              num(item.company_rate),
                num(item.freight),
                num(item.labour_charges),
                num(item.other_charges),
                num(item.amount),
                num((Number(row.dispatch_qty) || 0) > 0 ? ((Number(item.settlement_weight) || 0) / (Number(row.dispatch_qty) || 0)) * (Number(row.shortage_qty) || 0) * (Number(item.company_rate) || 0) : 0),
                num(
                  (Number(item.amount) || 0) -
                  (Number(item.freight) || 0) -
                  (Number(item.labour_charges) || 0) -
                  (Number(item.other_charges) || 0) -
                  ((Number(row.dispatch_qty) || 0) > 0
                    ? ((Number(item.settlement_weight) || 0) / (Number(row.dispatch_qty) || 0)) * (Number(row.shortage_qty) || 0) * (Number(item.company_rate) || 0)
                    : 0)
                ),
              ])
            : [["", "No adjusted inward details found.", "", "", "", "", "", "", "", "", "", "", ""]],
      });

      const {
        saleAmount,
        purchaseAmount,
        totalSAmountPurchase,
        totalSAmountSale,
        netReceivable,
        netPayable,
      } = getRowCalculations(row);

      autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 4,
        theme: "grid",
        headStyles: { fillColor: [14, 116, 144], textColor: 255 },
        styles: { fontSize: 8, halign: "right" },
        margin: { left: 14, right: 14 },
        head: [["Sale Amount", "Freight", "Other Chgs", "Labour Chgs", "S.Amount", "Net Receivable"]],
        body: [[
          num(saleAmount),
          num(row.freight),
          num(row.other_charges),
          num(row.outward_labour_charges),
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
        head: [["Purchase Amount (Sett.Wt×Co.Rate)", "Freight", "Other Chgs", "Labour Chgs", "S.Amount", "Net Payable"]],
        body: [[
          num(purchaseAmount),
          num(row.freight),
          num(row.other_charges),
          num(row.outward_labour_charges),
          num(totalSAmountPurchase),
          num(netPayable),
        ]],
      });

      const plVal = Number(row.receivable_amount);
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
      doc.text(num(row.receivable_amount), xPl + wPl - 6, yPl + 8.6, { align: "right" });

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
              netReceivable,
              netPayable,
              netProfitLoss,
            } = getRowCalculations(row);
            return (
              <div key={row.id} style={card}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 14 }}>
                <div>
                  <h3 style={{ margin: 0, color: "#0f172a" }}>
                    {displayInvNo(row)} | {displayAccountName(row)}
                  </h3>
                  <div style={{ color: "#0f172a", marginTop: 6 }}>
                    Date: {formatDate(row.date)} | Warehouse: {row.warehouse_name || "-"} | Location: {row.location_name || "-"} | Lorry: {row.lorry_no || "-"}
                  </div>
                  <div style={{ color: "#0f172a", marginTop: 4 }}>
                    Buyer: {row.buyer_name || "-"} | Consignee: {row.consignee_name || "-"} | Product: {row.product_name || "-"}
                  </div>
                </div>
                <div style={{ minWidth: 280, color: "#0f172a", fontSize: 14 }}>
                  <div>Dispatch Qty: {num(row.dispatch_qty)}</div>
                  <div>Unloading Qty: {num(row.unloading_qty)}</div>
                  <div>Shortage Qty: {num(row.shortage_qty)}</div>
                  <div>Settlement Weight: {num(row.settlement_weight)}</div>
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
                      <th style={{ ...hardHeaderCell, width: "118px" }}>Settlement Weight</th>
                      <th style={{ ...hardHeaderCell, width: "92px" }}>Short Qnt</th>
                      <th style={{ ...hardHeaderCell, width: "96px" }}>S.Amount</th>
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
                          <td style={hardBodyCell}>{num(item.settlement_weight)}</td>
                          <td style={hardBodyCell}>{num(item.shortQtyPerLine)}</td>
                          <td style={hardBodyCell}>{num(item.shortAmount)}</td>
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
                        <td style={hardBodyCell} colSpan="13">No adjusted inward details found.</td>
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
                      <div style={compactMetricItemStyle}><span>S.Amount</span><strong>{num(totalSAmountSale)}</strong></div>
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
                      <div style={compactMetricItemStyle}><span>S.Amount</span><strong>{num(totalSAmountPurchase)}</strong></div>
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
                  onClick={() => createSinglePdf(row)}
                  style={{ ...button, background: "#1d4ed8" }}
                >
                  Create PDF
                </button>
                <button
                  onClick={() => setEditingRecord(row)}
                  style={{ ...button, background: "#0f766e" }}
                >
                  Edit Settlement
                </button>
              </div>

              {row.narration ? (
                <div style={{ marginTop: 12, color: "#475569" }}>
                  Narration: {row.narration}
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

