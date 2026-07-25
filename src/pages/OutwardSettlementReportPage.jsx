import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import jsPDF from "jspdf";
import API from "./axiosInstance";
import autoTable from "jspdf-autotable";
import { FaEdit, FaFilePdf } from "react-icons/fa";
import OutwardSettlementPage from "./OutwardSettlementPage";

export default function OutwardSettlementReportPage() {
  const navigate = useNavigate();

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

  const firstNonEmpty = (...values) => {
    for (const value of values) {
      if (value === null || value === undefined) continue;
      if (typeof value === "object") continue;
      const text = String(value).trim();
      if (text && text !== "-" && text.toLowerCase() !== "null" && text.toLowerCase() !== "undefined") {
        return text;
      }
    }
    return "";
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
    const firstAdj = Array.isArray(row.adjustment_details) && row.adjustment_details.length
      ? row.adjustment_details[0]
      : {};
    const accountName = firstNonEmpty(
      row.account_name,
      row.company_account_name,
      row.accountName,
      row.party_name,
      firstAdj.company_account_name,
      row.company_name,
      row.company_account?.account_name,
      row.company_account?.name
    ) || "-";
    const warehouseName = firstNonEmpty(
      row.warehouse_name,
      row.warehouseName,
      row.outward_warehouse_name,
      firstAdj.warehouse_name,
      row.warehouse?.name,
      row.warehouse?.warehouse_name
    ) || "-";
    const locationName = firstNonEmpty(
      row.location_name,
      row.locationName,
      row.outward_location_name,
      firstAdj.location_name,
      row.location?.name,
      row.location?.location_name,
      row.warehouse?.location_name
    ) || "-";
    const productName = firstNonEmpty(
      row.product_name,
      row.productName,
      row.outward_product_name,
      firstAdj.product_name,
      row.product?.name,
      row.product?.product_name
    ) || "-";

    return {
      ...row,
      account_name: accountName,
      company_account_name: firstNonEmpty(row.company_account_name, accountName) || accountName,
      warehouse_name: warehouseName,
      location_name: locationName,
      product_name: productName,
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

  const hasOwn = (obj, key) => Object.prototype.hasOwnProperty.call(obj || {}, key);

  const getRowCalculations = (row) => {
    const normalized = normalizeRow(row);
    const dispatchQty = normalized.dispatch_qty;
    const shortageQty = normalized.shortage_qty;
    const saleRate = normalized.sale_rate;
    const saleAmount = dispatchQty * saleRate || normalized.sale_amount;
    const freight = normalized.freight;
    const otherCharges = normalized.other_charges;
    const labourCharges = normalized.outward_labour_charges;
    const claimAmount = toNumber(normalized.claim_amount);
    const otherDeduction = toNumber(normalized.other_deduction);

    const rowAdjById = (Array.isArray(normalized.row_adjustments) ? normalized.row_adjustments : []).reduce(
      (acc, item) => {
        const id = item?.adjustment_id ?? item?.id;
        if (id == null || id === "") return acc;
        acc[String(id)] = item;
        return acc;
      },
      {}
    );

    const adjustmentDetails = (normalized.adjustment_details || []).map((item, index) => {
      const weight = toNumber(item.settlement_weight);
      const companyRate = toNumber(item.company_rate ?? normalized.company_rate);
      const amount = weight * companyRate;
      const shortQtyPerLine = dispatchQty > 0 ? (weight / dispatchQty) * shortageQty : 0;
      const autoShortAmount = shortQtyPerLine * companyRate;
      const autoClaim = dispatchQty > 0 ? weight * (claimAmount / dispatchQty) : 0;
      const autoFreight = dispatchQty > 0 ? weight * (freight / dispatchQty) : 0;
      const autoLabour = dispatchQty > 0 ? weight * (labourCharges / dispatchQty) : 0;
      const autoOther = dispatchQty > 0 ? weight * (otherCharges / dispatchQty) : 0;
      const manual = rowAdjById[String(item.id)] || {};

      const shortAmount = hasOwn(manual, "short_amt") ? toNumber(manual.short_amt) : autoShortAmount;
      const claimPerLine = hasOwn(manual, "s_amount") ? toNumber(manual.s_amount) : autoClaim;
      const cDeduction = hasOwn(manual, "c_deduction") ? toNumber(manual.c_deduction) : 0;
      const freightPerLine = hasOwn(manual, "freight") ? toNumber(manual.freight) : autoFreight;
      const labourPerLine = hasOwn(manual, "labour_chgs") ? toNumber(manual.labour_chgs) : autoLabour;
      const otherPerLine = hasOwn(manual, "other_chgs") ? toNumber(manual.other_chgs) : autoOther;
      const saleShortAmount = shortQtyPerLine * saleRate;
      const netPayableValue =
        amount - shortAmount - claimPerLine - cDeduction - freightPerLine - labourPerLine - otherPerLine;

      return {
        ...item,
        sr_no: item.sr_no || index + 1,
        shortQtyPerLine,
        shortAmount,
        sale_short_amount: saleShortAmount,
        claim_per_line: claimPerLine,
        deduction_per_line: cDeduction,
        amount,
        freight: freightPerLine,
        labour_charges: labourPerLine,
        other_charges: otherPerLine,
        company_rate: companyRate,
        net_payable: netPayableValue,
      };
    });

    const purchaseAmount = adjustmentDetails.reduce((sum, item) => sum + toNumber(item.amount), 0);
    const totalSettlementShortageAmount = adjustmentDetails.reduce(
      (sum, item) => sum + toNumber(item.shortAmount),
      0
    );
    const totalSaleShortageAmount = adjustmentDetails.reduce(
      (sum, item) => sum + toNumber(item.sale_short_amount),
      0
    );
    const purchaseClaim = adjustmentDetails.reduce((sum, item) => sum + toNumber(item.claim_per_line), 0);
    const purchaseCDeduction = adjustmentDetails.reduce(
      (sum, item) => sum + toNumber(item.deduction_per_line),
      0
    );
    const purchaseFreight = adjustmentDetails.reduce((sum, item) => sum + toNumber(item.freight), 0);
    const purchaseLabour = adjustmentDetails.reduce((sum, item) => sum + toNumber(item.labour_charges), 0);
    const purchaseOther = adjustmentDetails.reduce((sum, item) => sum + toNumber(item.other_charges), 0);
    const purchaseDeduction =
      totalSettlementShortageAmount +
      purchaseClaim +
      purchaseCDeduction +
      purchaseFreight +
      purchaseLabour +
      purchaseOther;
    const netPayable = purchaseAmount - purchaseDeduction;

    const saleDeduction =
      totalSaleShortageAmount + claimAmount + labourCharges + freight + otherDeduction + otherCharges;
    const netReceivable = saleAmount - saleDeduction;
    const netProfitLoss = netReceivable - netPayable;

    return {
      dispatchQty,
      saleAmount,
      settlementWeight: adjustmentDetails.reduce((sum, item) => sum + toNumber(item.settlement_weight), 0),
      saleRate,
      purchaseAmount,
      freight,
      otherCharges,
      labourCharges,
      claimAmount,
      otherDeduction,
      totalUnloadingClaimAmount: claimAmount,
      totalUnloadingDeductionAmount: otherDeduction,
      adjustmentDetails,
      totalSettlementShortageAmount,
      totalSaleShortageAmount,
      totalClaimAmount: claimAmount,
      totalOtherDeductionAmount: otherDeduction,
      totalSAmountPurchase: purchaseClaim,
      totalSAmountSale: claimAmount,
      purchaseClaim,
      purchaseCDeduction,
      purchaseFreight,
      purchaseLabour,
      purchaseOther,
      purchaseDeduction,
      saleDeduction,
      netReceivable,
      netPayable,
      netProfitLoss,
    };
  };

  useEffect(() => {
    API.get("/api/companies").then((res) => setCompanies(res.data || []));
    API.get("/api/warehouses").then((res) => setWarehouses(res.data || []));
    fetchReport();
  }, []);

  const fetchReport = async () => {
    try {
      const res = await API.get("/api/outward-settlement/report/list", {
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
          const calc = getRowCalculations(row);
          acc.dispatch += toNumber(row.dispatch_qty);
          acc.unloading += toNumber(row.unloading_qty);
          acc.shortage += toNumber(row.shortage_qty);
          acc.settlement += toNumber(calc.settlementWeight);
          acc.sale += toNumber(calc.saleAmount);
          acc.gross += toNumber(calc.netReceivable);
          acc.payable += toNumber(calc.netPayable);
          acc.net += toNumber(calc.netProfitLoss);
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

  const displayAccountName = (row) =>
    firstNonEmpty(
      row.account_name,
      row.company_account_name,
      row.accountName,
      row.party_name,
      Array.isArray(row.adjustment_details) ? row.adjustment_details[0]?.company_account_name : "",
      row.company_name
    ) || "-";

  const displayWarehouseName = (row) =>
    firstNonEmpty(
      row.warehouse_name,
      row.warehouseName,
      row.outward_warehouse_name,
      Array.isArray(row.adjustment_details) ? row.adjustment_details[0]?.warehouse_name : ""
    ) || "-";

  const displayLocationName = (row) =>
    firstNonEmpty(
      row.location_name,
      row.locationName,
      row.outward_location_name,
      Array.isArray(row.adjustment_details) ? row.adjustment_details[0]?.location_name : ""
    ) || "-";

  const displayProductName = (row) =>
    firstNonEmpty(
      row.product_name,
      row.productName,
      row.outward_product_name,
      Array.isArray(row.adjustment_details) ? row.adjustment_details[0]?.product_name : ""
    ) || "-";
  const getLoadingTypeLabel = (sourceType) => {
    const normalized = String(sourceType || "").trim().toLowerCase();
    return normalized === "palti_lorry" ? "Palti Lorry" : "Warehouse Loading";
  };

  const buildUniqueCompanyRows = (adjustmentDetails = []) => {
    const map = new Map();
    (adjustmentDetails || []).forEach((item) => {
      const companyName = String(item.company_name || "Unknown Company").trim() || "Unknown Company";
      const key = companyName.toLowerCase();
      const current = map.get(key) || {
        companyName,
        settlementWeight: 0,
        gAmount: 0,
        shortQty: 0,
        shortAmt: 0,
        claim: 0,
        cDeduction: 0,
        freight: 0,
        labour: 0,
        other: 0,
        netPayable: 0,
      };
      current.settlementWeight += toNumber(item.settlement_weight);
      current.gAmount += toNumber(item.amount);
      current.shortQty += toNumber(item.shortQtyPerLine);
      current.shortAmt += toNumber(item.shortAmount);
      current.claim += toNumber(item.claim_per_line);
      current.cDeduction += toNumber(item.deduction_per_line);
      current.freight += toNumber(item.freight);
      current.labour += toNumber(item.labour_charges);
      current.other += toNumber(item.other_charges);
      current.netPayable += toNumber(item.net_payable);
      map.set(key, current);
    });

    return [...map.values()]
      .map((row) => ({
        ...row,
        companyRate: row.settlementWeight > 0 ? row.gAmount / row.settlementWeight : 0,
      }))
      .sort((a, b) => a.companyName.localeCompare(b.companyName));
  };

  const createSinglePdf = (row) => {
    createSettlementReportPdf(row);
  };

  const createSettlementReportPdf = (row) => {
    const record = normalizeRow(row);
    const doc = new jsPDF("l", "mm", "a4");
    const invNo = displayInvNo(record);
    const outwardCompanyName = displayAccountName(record);
    const calc = getRowCalculations(record);
    const uniqueCompanies = buildUniqueCompanyRows(calc.adjustmentDetails);
    const uniqueTotals = uniqueCompanies.reduce(
      (acc, item) => ({
        settlementWeight: acc.settlementWeight + item.settlementWeight,
        gAmount: acc.gAmount + item.gAmount,
        shortQty: acc.shortQty + item.shortQty,
        shortAmt: acc.shortAmt + item.shortAmt,
        claim: acc.claim + item.claim,
        cDeduction: acc.cDeduction + item.cDeduction,
        freight: acc.freight + item.freight,
        labour: acc.labour + item.labour,
        other: acc.other + item.other,
        netPayable: acc.netPayable + item.netPayable,
      }),
      {
        settlementWeight: 0,
        gAmount: 0,
        shortQty: 0,
        shortAmt: 0,
        claim: 0,
        cDeduction: 0,
        freight: 0,
        labour: 0,
        other: 0,
        netPayable: 0,
      }
    );

    const generatedAt = new Date().toLocaleString();
    const left = 8;
    const right = 289;
    const green = [5, 86, 68];
    const orange = [229, 96, 12];
    const pageBottom = 198;

    const drawPageHeader = (pageNo) => {
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
      doc.text(`Generated: ${generatedAt}   |   Page ${pageNo}`, right - 5, 17, { align: "right" });
    };

    const drawFooter = () => {
      const footerY = 202;
      doc.setDrawColor(190, 204, 214);
      doc.line(85, footerY, 120, footerY);
      doc.line(177, footerY, 212, footerY);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.2);
      doc.setTextColor(green[0], green[1], green[2]);
      doc.text("Thank you for your business!", 148.5, footerY + 1.5, { align: "center" });
    };

    const drawSummaries = (startY) => {
      const cardW = 135;
      const cardH = 68;
      const drawSummary = (x, title, color, rows, totalLabel, totalValue) => {
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(220, 229, 235);
        doc.roundedRect(x, startY, cardW, cardH, 3, 3, "FD");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9.2);
        doc.setTextColor(color[0], color[1], color[2]);
        doc.text(title, x + 8, startY + 9);
        let y = startY + 16;
        rows.forEach(([label, value]) => {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(6.8);
          doc.setTextColor(31, 41, 55);
          doc.text(label, x + 8, y);
          doc.text(value, x + cardW - 8, y, { align: "right" });
          doc.setDrawColor(235, 240, 244);
          doc.line(x + 8, y + 1.6, x + cardW - 8, y + 1.6);
          y += 5.4;
        });
        doc.setFillColor(color[0], color[1], color[2]);
        doc.roundedRect(x, startY + cardH - 11, cardW, 11, 0, 0, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.2);
        doc.text(totalLabel, x + 8, startY + cardH - 4);
        doc.text(totalValue, x + cardW - 8, startY + cardH - 4, { align: "right" });
      };

      drawSummary(
        11,
        "SALE SUMMARY",
        green,
        [
          ["Sale Amount", num(calc.saleAmount)],
          ["Shortage Amount", num(calc.totalSaleShortageAmount)],
          ["Claim", num(calc.claimAmount)],
          ["Labour", num(calc.labourCharges)],
          ["Freight", num(calc.freight)],
          ["Other Deduction", num(calc.otherDeduction)],
          ["Other Charges", num(calc.otherCharges)],
          ["Total Deduction", num(calc.saleDeduction)],
        ],
        "Less Sale Amount",
        num(calc.netReceivable)
      );
      drawSummary(
        151,
        "PURCHASE SUMMARY",
        orange,
        [
          ["Purchase Amount", num(calc.purchaseAmount)],
          ["Shortage Amount", num(calc.totalSettlementShortageAmount)],
          ["Claim", num(calc.totalSAmountPurchase)],
          ["C.Deduction", num(calc.purchaseCDeduction)],
          ["Freight", num(calc.purchaseFreight)],
          ["Labour", num(calc.purchaseLabour)],
          ["Other Charges", num(calc.purchaseOther)],
          ["Total Deduction", num(calc.purchaseDeduction)],
        ],
        "Less Purchase / Net Payable",
        num(calc.netPayable)
      );

      const plY = startY + cardH + 6;
      const plColor =
        calc.netProfitLoss < 0 ? [220, 38, 38] : calc.netProfitLoss > 0 ? [21, 128, 61] : [30, 41, 59];
      doc.setFillColor(241, 245, 249);
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(11, plY, 275, 14, 3, 3, "FD");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.text("NET PROFIT / LOSS", 18, plY + 9);
      doc.setTextColor(plColor[0], plColor[1], plColor[2]);
      doc.setFontSize(12);
      doc.text(num(calc.netProfitLoss), 278, plY + 9, { align: "right" });
      return plY + 16;
    };

    // -------- PAGE 1 --------
    drawPageHeader(1);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12.5);
    doc.setTextColor(15, 23, 42);
    doc.text(`${invNo} | ${outwardCompanyName}`, left + 3, 32);

    autoTable(doc, {
      startY: 36,
      theme: "plain",
      margin: { left: left + 3, right: left + 3 },
      styles: { fontSize: 7.2, cellPadding: 1.8, textColor: [31, 41, 55] },
      body: [[
        `Date: ${formatDate(record.date)}`,
        `Warehouse: ${displayWarehouseName(record)}`,
        `Location: ${displayLocationName(record)}`,
        `Buyer: ${record.buyer_name || "-"}`,
        `Consignee: ${record.consignee_name || "-"}`,
        `Product: ${displayProductName(record)}`,
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
        outwardCompanyName,
        num(record.dispatch_qty),
        num(record.sale_rate),
        num(calc.saleAmount),
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
      styles: { fontSize: 6.2, cellPadding: 1.7, lineColor: [220, 230, 236], lineWidth: 0.18, textColor: [15, 23, 42] },
      alternateRowStyles: { fillColor: [250, 252, 252] },
      showHead: "everyPage",
      pageBreak: "auto",
      rowPageBreak: "avoid",
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
        "S. Amount (Claim)",
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
              num(item.claim_per_line),
              num(item.net_payable),
            ])
          : [["", "No adjusted inward details found.", "", "", "", "", "", "", "", "", "", "", "", "", ""]],
      didDrawPage: (data) => {
        if (data.pageNumber > 1) {
          drawPageHeader(data.pageNumber);
        }
      },
    });

    let uniqueStartY = doc.lastAutoTable.finalY + 8;
    if (uniqueStartY > pageBottom - 40) {
      drawFooter();
      doc.addPage();
      drawPageHeader(doc.internal.getNumberOfPages());
      uniqueStartY = 30;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(green[0], green[1], green[2]);
    doc.text("UNIQUE COMPANY REPORT", left + 3, uniqueStartY);
    doc.setDrawColor(210, 224, 230);
    doc.line(left + 3, uniqueStartY + 3, right - 3, uniqueStartY + 3);

    autoTable(doc, {
      startY: uniqueStartY + 6,
      theme: "grid",
      margin: { left: left + 3, right: left + 3 },
      headStyles: { fillColor: [15, 118, 110], textColor: 255, fontStyle: "bold", halign: "center" },
      styles: { fontSize: 6.5, cellPadding: 1.8, lineColor: [220, 230, 236], lineWidth: 0.18, textColor: [15, 23, 42] },
      alternateRowStyles: { fillColor: [250, 252, 252] },
      showHead: "everyPage",
      pageBreak: "auto",
      rowPageBreak: "avoid",
      head: [[
        "Sr",
        "Company Name",
        "Settlement Weight",
        "Company Rate",
        "G.Amount",
        "Short Qnt",
        "Short Amt",
        "Claim",
        "C.Deduction",
        "Freight",
        "Labour Chgs",
        "Other Chgs",
        "Net Payable",
      ]],
      body:
        uniqueCompanies.length > 0
          ? uniqueCompanies.map((item, index) => [
              index + 1,
              item.companyName,
              num(item.settlementWeight),
              num(item.companyRate),
              num(item.gAmount),
              num(item.shortQty),
              num(item.shortAmt),
              num(item.claim),
              num(item.cDeduction),
              num(item.freight),
              num(item.labour),
              num(item.other),
              num(item.netPayable),
            ])
          : [["", "No unique company details found.", "", "", "", "", "", "", "", "", "", "", ""]],
      foot:
        uniqueCompanies.length > 0
          ? [[
              "",
              "Totals",
              num(uniqueTotals.settlementWeight),
              uniqueTotals.settlementWeight > 0
                ? num(uniqueTotals.gAmount / uniqueTotals.settlementWeight)
                : "0.00",
              num(uniqueTotals.gAmount),
              num(uniqueTotals.shortQty),
              num(uniqueTotals.shortAmt),
              num(uniqueTotals.claim),
              num(uniqueTotals.cDeduction),
              num(uniqueTotals.freight),
              num(uniqueTotals.labour),
              num(uniqueTotals.other),
              num(uniqueTotals.netPayable),
            ]]
          : undefined,
      footStyles: {
        fillColor: [236, 253, 245],
        textColor: [15, 23, 42],
        fontStyle: "bold",
        fontSize: 6.5,
      },
      didDrawPage: (data) => {
        if (data.pageNumber > 1) {
          drawPageHeader(data.pageNumber);
        }
      },
    });

    // Summaries: same page if space, otherwise new page
    let summaryStartY = doc.lastAutoTable.finalY + 8;
    const summaryBlockHeight = 92;
    if (summaryStartY + summaryBlockHeight > pageBottom) {
      drawFooter();
      doc.addPage();
      drawPageHeader(doc.internal.getNumberOfPages());
      summaryStartY = 30;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(green[0], green[1], green[2]);
      doc.text("SALE / PURCHASE SUMMARY", left + 3, 28);
    }

    drawSummaries(summaryStartY);
    drawFooter();

    doc.save(`${invNo.replace(/[/\\?%*:|"<>]/g, "-")}_Settlement_Report.pdf`);
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
        displayAccountName(row),
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
      const calc = getRowCalculations(record);
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
          calc.adjustmentDetails.length > 0
            ? calc.adjustmentDetails.map((item) => [
                item.sr_no,
                item.company_name || "-",
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
                num(item.claim_per_line),
                num(item.net_payable),
              ])
            : [["", "No adjusted inward details found.", "", "", "", "", "", "", "", "", "", "", "", ""]],
      });

      autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 4,
        theme: "grid",
        headStyles: { fillColor: [14, 116, 144], textColor: 255 },
        styles: { fontSize: 8, halign: "right" },
        margin: { left: 14, right: 14 },
        head: [["Sale Amount", "Shortage", "Claim", "Labour", "Freight", "Other Ded.", "Other Chgs", "Less Sale"]],
        body: [[
          num(calc.saleAmount),
          num(calc.totalSaleShortageAmount),
          num(calc.claimAmount),
          num(calc.labourCharges),
          num(calc.freight),
          num(calc.otherDeduction),
          num(calc.otherCharges),
          num(calc.netReceivable),
        ]],
      });

      autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 4,
        theme: "grid",
        headStyles: { fillColor: [14, 116, 144], textColor: 255 },
        styles: { fontSize: 8, halign: "right" },
        margin: { left: 14, right: 14 },
        head: [["Purchase Amount", "Shortage", "Claim", "C.Deduction", "Freight", "Labour", "Other Chgs", "Net Payable"]],
        body: [[
          num(calc.purchaseAmount),
          num(calc.totalSettlementShortageAmount),
          num(calc.totalSAmountPurchase),
          num(calc.purchaseCDeduction),
          num(calc.purchaseFreight),
          num(calc.purchaseLabour),
          num(calc.purchaseOther),
          num(calc.netPayable),
        ]],
      });

      const plVal = Number(calc.netProfitLoss);
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
      doc.text(num(calc.netProfitLoss), xPl + wPl - 6, yPl + 8.6, { align: "right" });

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
        <div style={card}><div>Total Net Receivable (Less Sale)</div><div style={statValue}>{num(totals.gross)}</div></div>
        <div style={card}><div>Total Net Payable</div><div style={statValue}>{num(totals.payable)}</div></div>
        <div style={card}><div>Total Net Profit / Loss</div><div style={statValue}>{num(totals.net)}</div></div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {records.length > 0 ? (
          records.map((row) => {
            const record = normalizeRow(row);
            const {
              saleAmount,
              purchaseAmount,
              freight,
              otherCharges,
              labourCharges,
              claimAmount,
              otherDeduction,
              adjustmentDetails,
              totalSAmountPurchase,
              totalSettlementShortageAmount,
              totalSaleShortageAmount,
              purchaseCDeduction,
              purchaseFreight,
              purchaseLabour,
              purchaseOther,
              purchaseDeduction,
              saleDeduction,
              netReceivable,
              netPayable,
              netProfitLoss,
            } = getRowCalculations(record);
            const uniqueCompanies = buildUniqueCompanyRows(adjustmentDetails);
            const uniqueTotals = uniqueCompanies.reduce(
              (acc, item) => ({
                settlementWeight: acc.settlementWeight + item.settlementWeight,
                gAmount: acc.gAmount + item.gAmount,
                shortQty: acc.shortQty + item.shortQty,
                shortAmt: acc.shortAmt + item.shortAmt,
                claim: acc.claim + item.claim,
                cDeduction: acc.cDeduction + item.cDeduction,
                freight: acc.freight + item.freight,
                labour: acc.labour + item.labour,
                other: acc.other + item.other,
                netPayable: acc.netPayable + item.netPayable,
              }),
              {
                settlementWeight: 0,
                gAmount: 0,
                shortQty: 0,
                shortAmt: 0,
                claim: 0,
                cDeduction: 0,
                freight: 0,
                labour: 0,
                other: 0,
                netPayable: 0,
              }
            );
            return (
              <div key={record.id} style={card}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 14 }}>
                <div>
                  <h3 style={{ margin: 0, color: "#0f172a" }}>
                    {displayInvNo(record)} | {displayAccountName(record)}
                  </h3>
                  <div style={{ color: "#0f172a", marginTop: 6 }}>
                    Date: {formatDate(record.date)} | Warehouse: {displayWarehouseName(record)} | Location: {displayLocationName(record)} | Lorry: {record.lorry_no || "-"}
                  </div>
                  <div style={{ color: "#0f172a", marginTop: 4 }}>
                    Buyer: {record.buyer_name || "-"} | Consignee: {record.consignee_name || "-"} | Product: {displayProductName(record)}
                  </div>
                </div>
                <div style={{ minWidth: 280, color: "#0f172a", fontSize: 14 }}>
                  <div>Dispatch Qty: {num(record.dispatch_qty)}</div>
                  <div>Unloading Qty: {num(record.unloading_qty)}</div>
                  <div>Shortage Qty: {num(record.shortage_qty)}</div>
                  <div>Settlement Weight: {num(record.settlement_weight)}</div>
                </div>
              </div>

              <div style={{ overflowX: "auto", marginBottom: 14, border: "1px solid #d1d5db", background: "#fff" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr>
                      <th style={hardHeaderCell}>Outward Company</th>
                      <th style={hardHeaderCell}>Qty</th>
                      <th style={hardHeaderCell}>Rate</th>
                      <th style={hardHeaderCell}>Amount</th>
                      <th style={hardHeaderCell}>Lorry No</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={hardBodyCell}>{displayAccountName(record)}</td>
                      <td style={hardBodyCell}>{num(record.dispatch_qty)}</td>
                      <td style={hardBodyCell}>{num(record.sale_rate)}</td>
                      <td style={hardBodyCell}>{num(saleAmount)}</td>
                      <td style={hardBodyCell}>{record.lorry_no || "-"}</td>
                    </tr>
                  </tbody>
                </table>
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
                        <tr key={item.id || `${item.company_name}-${index}`} style={{ background: index % 2 === 0 ? "#ffffff" : "#f4f7fa" }}>
                          <td style={hardBodyCell}>{item.sr_no || index + 1}</td>
                          <td style={hardBodyCell}>{item.company_name || "-"}</td>
                          <td style={hardBodyCell}>{item.lorry_no || "-"}</td>
                          <td style={hardBodyCell}>{item.inward_voucher_no || "-"}</td>
                          <td style={hardBodyCell}>{getLoadingTypeLabel(item.source_type)}</td>
                          <td style={hardBodyCell}>{num(item.settlement_weight)}</td>
                          <td style={hardBodyCell}>{num(item.shortQtyPerLine)}</td>
                          <td style={hardBodyCell}>{num(item.shortAmount)}</td>
                          <td style={hardBodyCell}>{num(item.claim_per_line)}</td>
                          <td style={hardBodyCell}>{num(item.deduction_per_line)}</td>
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
                    color: "#0f766e",
                  }}
                >
                  Unique Company Report
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
                      <th style={{ ...hardHeaderCell, width: "160px" }}>Company Name</th>
                      <th style={hardHeaderCell}>Settlement Weight</th>
                      <th style={hardHeaderCell}>Company Rate</th>
                      <th style={hardHeaderCell}>G.Amount</th>
                      <th style={hardHeaderCell}>Short Qnt</th>
                      <th style={hardHeaderCell}>Short Amt</th>
                      <th style={hardHeaderCell}>Claim</th>
                      <th style={hardHeaderCell}>C.Deduction</th>
                      <th style={hardHeaderCell}>Freight</th>
                      <th style={hardHeaderCell}>Labour Chgs</th>
                      <th style={hardHeaderCell}>Other Chgs</th>
                      <th style={hardHeaderCell}>Net Payable</th>
                    </tr>
                  </thead>
                  <tbody>
                    {uniqueCompanies.length > 0 ? (
                      <>
                        {uniqueCompanies.map((item, index) => (
                          <tr key={item.companyName} style={{ background: index % 2 === 0 ? "#ffffff" : "#f4f7fa" }}>
                            <td style={hardBodyCell}>{index + 1}</td>
                            <td style={hardBodyCell}>{item.companyName}</td>
                            <td style={hardBodyCell}>{num(item.settlementWeight)}</td>
                            <td style={hardBodyCell}>{num(item.companyRate)}</td>
                            <td style={hardBodyCell}>{num(item.gAmount)}</td>
                            <td style={hardBodyCell}>{num(item.shortQty)}</td>
                            <td style={hardBodyCell}>{num(item.shortAmt)}</td>
                            <td style={hardBodyCell}>{num(item.claim)}</td>
                            <td style={hardBodyCell}>{num(item.cDeduction)}</td>
                            <td style={hardBodyCell}>{num(item.freight)}</td>
                            <td style={hardBodyCell}>{num(item.labour)}</td>
                            <td style={hardBodyCell}>{num(item.other)}</td>
                            <td style={{ ...hardBodyCell, fontWeight: 800, color: "#1d4ed8" }}>{num(item.netPayable)}</td>
                          </tr>
                        ))}
                        <tr style={{ background: "#ecfdf5", fontWeight: 800 }}>
                          <td style={hardBodyCell} colSpan={2}>Totals</td>
                          <td style={hardBodyCell}>{num(uniqueTotals.settlementWeight)}</td>
                          <td style={hardBodyCell}>
                            {uniqueTotals.settlementWeight > 0
                              ? num(uniqueTotals.gAmount / uniqueTotals.settlementWeight)
                              : "0.00"}
                          </td>
                          <td style={hardBodyCell}>{num(uniqueTotals.gAmount)}</td>
                          <td style={hardBodyCell}>{num(uniqueTotals.shortQty)}</td>
                          <td style={hardBodyCell}>{num(uniqueTotals.shortAmt)}</td>
                          <td style={hardBodyCell}>{num(uniqueTotals.claim)}</td>
                          <td style={hardBodyCell}>{num(uniqueTotals.cDeduction)}</td>
                          <td style={hardBodyCell}>{num(uniqueTotals.freight)}</td>
                          <td style={hardBodyCell}>{num(uniqueTotals.labour)}</td>
                          <td style={hardBodyCell}>{num(uniqueTotals.other)}</td>
                          <td style={{ ...hardBodyCell, color: "#1d4ed8" }}>{num(uniqueTotals.netPayable)}</td>
                        </tr>
                      </>
                    ) : (
                      <tr>
                        <td style={hardBodyCell} colSpan="13">No unique company details found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div style={summaryBoxStyle}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12, padding: 12 }}>
                  <div style={compactSummaryCardStyle}>
                    <div style={compactSummaryHeaderStyle}>
                      <span>Sale Summary</span>
                      <strong style={{ color: "#15803d" }}>{num(netReceivable)}</strong>
                    </div>
                    <div style={compactMetricGridStyle}>
                      <div style={compactMetricItemStyle}><span>Sale Amount</span><strong>{num(saleAmount)}</strong></div>
                      <div style={compactMetricItemStyle}><span>Shortage Amount</span><strong>{num(totalSaleShortageAmount)}</strong></div>
                      <div style={compactMetricItemStyle}><span>Claim</span><strong>{num(claimAmount)}</strong></div>
                      <div style={compactMetricItemStyle}><span>Labour</span><strong>{num(labourCharges)}</strong></div>
                      <div style={compactMetricItemStyle}><span>Freight</span><strong>{num(freight)}</strong></div>
                      <div style={compactMetricItemStyle}><span>Other Deduction</span><strong>{num(otherDeduction)}</strong></div>
                      <div style={compactMetricItemStyle}><span>Other Charges</span><strong>{num(otherCharges)}</strong></div>
                      <div style={compactMetricItemStyle}><span>Total Deduction</span><strong>{num(saleDeduction)}</strong></div>
                      <div style={{ ...compactMetricItemStyle, background: "#ecfdf5", borderColor: "#86efac" }}>
                        <span>Less Sale Amount</span><strong style={{ color: "#15803d" }}>{num(netReceivable)}</strong>
                      </div>
                    </div>
                  </div>

                  <div style={compactSummaryCardStyle}>
                    <div style={compactSummaryHeaderStyle}>
                      <span>Purchase Summary</span>
                      <strong style={{ color: "#c2410c" }}>{num(netPayable)}</strong>
                    </div>
                    <div style={compactMetricGridStyle}>
                      <div style={compactMetricItemStyle}><span>Purchase Amount</span><strong>{num(purchaseAmount)}</strong></div>
                      <div style={compactMetricItemStyle}><span>Shortage Amount</span><strong>{num(totalSettlementShortageAmount)}</strong></div>
                      <div style={compactMetricItemStyle}><span>Claim</span><strong>{num(totalSAmountPurchase)}</strong></div>
                      <div style={compactMetricItemStyle}><span>C.Deduction</span><strong>{num(purchaseCDeduction)}</strong></div>
                      <div style={compactMetricItemStyle}><span>Freight</span><strong>{num(purchaseFreight)}</strong></div>
                      <div style={compactMetricItemStyle}><span>Labour</span><strong>{num(purchaseLabour)}</strong></div>
                      <div style={compactMetricItemStyle}><span>Other Charges</span><strong>{num(purchaseOther)}</strong></div>
                      <div style={compactMetricItemStyle}><span>Total Deduction</span><strong>{num(purchaseDeduction)}</strong></div>
                      <div style={{ ...compactMetricItemStyle, background: "#fff7ed", borderColor: "#fdba74" }}>
                        <span>Less Purchase / Net Payable</span><strong style={{ color: "#c2410c" }}>{num(netPayable)}</strong>
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ padding: "0 12px 12px" }}>
                  <div
                    style={{
                      maxWidth: 420,
                      padding: "12px 14px",
                      borderRadius: 12,
                      background:
                        netProfitLoss >= 0
                          ? "linear-gradient(135deg, #14532d 0%, #16a34a 100%)"
                          : "linear-gradient(135deg, #7f1d1d 0%, #dc2626 100%)",
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 12,
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.5px" }}>NET PROFIT / LOSS</div>
                      <div style={{ fontSize: 12, opacity: 0.92, marginTop: 3 }}>
                        Less Sale ({num(netReceivable)}) − Less Purchase ({num(netPayable)})
                      </div>
                    </div>
                    <span style={{ fontSize: 20, fontWeight: 900 }}>{num(netProfitLoss)}</span>
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

