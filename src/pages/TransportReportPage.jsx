import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { FaFilePdf, FaWhatsapp, FaSyncAlt, FaBook } from "react-icons/fa";
import { formatDisplayDate } from "../utils/date";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function TransportReportPage() {
  const navigate = useNavigate();
  const API_BASE = "/api";
  const [records, setRecords] = useState([]);
  const [paymentRecords, setPaymentRecords] = useState([]);
  const [activeSection, setActiveSection] = useState("payment");
  const [selectedLedgerTransporter, setSelectedLedgerTransporter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    from_date: new Date(new Date().setDate(new Date().getDate() - 30))
      .toISOString()
      .split("T")[0],
    to_date: new Date().toISOString().split("T")[0],
  });

  const card = {
    background: "#fff",
    border: "1px solid #dbe4ea",
    borderRadius: 16,
    padding: 18,
    boxShadow: "0 12px 32px rgba(15, 23, 42, 0.07)",
  };

  const input = {
    padding: "10px 12px",
    border: "1px solid #cbd5e1",
    borderRadius: 10,
    fontSize: 14,
    minWidth: 160,
    background: "#fff",
    color: "#0f172a",
  };

  const button = {
    padding: "10px 16px",
    border: "none",
    borderRadius: 10,
    fontWeight: 700,
    cursor: "pointer",
    color: "#fff",
  };

  const th = {
    background: "#0f766e",
    color: "#fff",
    padding: "11px 12px",
    border: "1px solid #e2e8f0",
    textAlign: "left",
    whiteSpace: "nowrap",
    fontSize: 12,
    letterSpacing: "0.25px",
  };

  const td = {
    padding: "11px 12px",
    border: "1px solid #e2e8f0",
    background: "#fff",
    whiteSpace: "nowrap",
    color: "#334155",
  };

  const num = (v) => Number(v || 0).toFixed(2);

  const dateValue = (v) => (v ? formatDisplayDate(v) : "");

  const getAdvanceDate = (row) => row?.advance_date || row?.adv_date || "";
  const getPayDate = (row) => row?.pa_date || row?.pay_date || row?.payment_date || "";
  const getPayAmount = (row) => Number(row?.pay_amount ?? row?.paid_amount ?? row?.payment_amount ?? 0) || 0;
  const getBalanceAmount = (row) => {
    if (row?.balance_amount !== undefined && row?.balance_amount !== null && row?.balance_amount !== "") {
      return Number(row.balance_amount) || 0;
    }
    return (Number(row?.payable_amount) || 0) - getPayAmount(row);
  };

  const numberToWords = (value) => {
    const number = Number(value);
    if (!Number.isFinite(number)) return "Zero";
    const roundedAmount = Math.round((Math.abs(number) + Number.EPSILON) * 100) / 100;
    const totalPaise = Math.round(roundedAmount * 100);
    const integerPart = Math.floor(totalPaise / 100);
    const fractionalPart = totalPaise % 100;
    const wordsForNumber = (numValue) => {
      const units = ["Zero","One","Two","Three","Four","Five","Six","Seven","Eight","Nine","Ten","Eleven","Twelve","Thirteen","Fourteen","Fifteen","Sixteen","Seventeen","Eighteen","Nineteen"];
      const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
      if (numValue < 20) return units[numValue];
      if (numValue < 100) return `${tens[Math.floor(numValue / 10)]}${numValue % 10 ? ` ${units[numValue % 10]}` : ""}`;
      if (numValue < 1000) return `${units[Math.floor(numValue / 100)]} Hundred${numValue % 100 ? ` ${wordsForNumber(numValue % 100)}` : ""}`;
      const scales = ["Thousand", "Million", "Billion"];
      let remainder = numValue;
      let scaleIndex = -1;
      let result = "";
      while (remainder > 0) {
        const chunk = remainder % 1000;
        remainder = Math.floor(remainder / 1000);
        scaleIndex += 1;
        if (chunk) {
          const chunkText = wordsForNumber(chunk);
          result = `${chunkText} ${scales[scaleIndex]}${result ? ` ${result}` : ""}`.trim();
        }
      }
      return result;
    };
    const integerWords = integerPart === 0 ? "Zero" : wordsForNumber(integerPart);
    return `${number < 0 ? "Minus " : ""}${integerWords}${fractionalPart ? ` and ${fractionalPart}/100` : ""} only`;
  };

  const fetchReport = useCallback(async () => {
    try {
      const [biltiResponse, paymentResponse] = await Promise.all([
        axios.get(`${API_BASE}/transport-bilti/report/list`, {
          params: { ...filters, _t: Date.now() },
          headers: {
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
          },
        }),
        axios.get(`${API_BASE}/transport-payments`, {
          params: { ...filters, _t: Date.now() },
          headers: {
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
          },
        }),
      ]);
      setRecords(biltiResponse.data || []);
      setPaymentRecords(paymentResponse.data?.rows || []);
    } catch (err) {
      console.error(err);
      setRecords([]);
      setPaymentRecords([]);
    }
  }, [filters.from_date, filters.to_date]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "F5") {
        event.preventDefault();
        fetchReport();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [fetchReport]);

  const visibleRecords = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    if (!search) return records;

    return records.filter((row) => {
      const haystack = [
        row.transporter_name,
        row.bilti_no,
        row.voucher_no,
        row.outward_voucher_no,
        row.sale_voucher_no,
        row.lorry_no,
        row.outward_lorry_no,
        row.sale_lorry_no,
        row.company_name,
        row.outward_company_name,
        row.sale_buyer_name,
        row.warehouse_name,
        row.destination,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(search);
    });
  }, [records, searchTerm]);

  const visiblePayments = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    if (!search) return paymentRecords;

    return paymentRecords.filter((row) =>
      [
        row.voucher_no,
        row.transporter_name,
        row.payment_method,
        row.narration,
        row.amount,
      ]
        .filter((value) => value !== undefined && value !== null)
        .join(" ")
        .toLowerCase()
        .includes(search)
    );
  }, [paymentRecords, searchTerm]);

  const transporterLedgerRows = useMemo(() => {
    const grouped = new Map();
    visibleRecords.forEach((row) => {
      const name = String(row.transporter_name || "Unknown Transporter").trim() || "Unknown Transporter";
      if (!grouped.has(name)) {
        grouped.set(name, {
          name, bills: 0, gross: 0, net: 0, shortage: 0, detain: 0, others: 0, advance: 0, tds: 0, payable: 0, paid: 0, balance: 0, rows: [],
        });
      }
      const item = grouped.get(name);
      item.bills += 1;
      item.gross += Number(row.gross_freight) || 0;
      item.net += Number(row.net_amount) || 0;
      item.shortage += Number(row.shortage_amount) || 0;
      item.detain += Number(row.detain_amount) || 0;
      item.others += Number(row.others_exp) || 0;
      item.advance += Number(row.advance_amount) || 0;
      item.tds += Number(row.tds_amount) || 0;
      item.payable += Number(row.payable_amount) || 0;
      item.paid += getPayAmount(row);
      item.balance += getBalanceAmount(row);
      item.rows.push(row);
    });
    return Array.from(grouped.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [visibleRecords]);

  const totals = useMemo(
    () =>
      visibleRecords.reduce(
        (acc, row) => {
          acc.gross += Number(row.gross_freight) || 0;
          acc.net += Number(row.net_amount) || 0;
          acc.shortage += Number(row.shortage_amount) || 0;
          acc.detain += Number(row.detain_amount) || 0;
          acc.others += Number(row.others_exp) || 0;
          acc.advance += Number(row.advance_amount) || 0;
          acc.tds += Number(row.tds_amount) || 0;
          acc.payable += Number(row.payable_amount) || 0;
          return acc;
        },
        { gross: 0, net: 0, shortage: 0, detain: 0, others: 0, advance: 0, tds: 0, payable: 0 }
      ),
    [visibleRecords]
  );

  const visiblePaymentTotal = useMemo(
    () =>
      visiblePayments.reduce(
        (total, payment) => total + (Number(payment.amount) || 0),
        0
      ),
    [visiblePayments]
  );

  const buildReportPdf = (rows, title = "Transport Report") => {
    const doc = new jsPDF("l", "mm", "a4");
    doc.setFontSize(16);
    doc.text(title, 14, 14);
    doc.setFontSize(10);
    doc.text(`From: ${filters.from_date}   To: ${filters.to_date}`, 14, 21);

    const rowTotals = rows.reduce(
      (acc, row) => {
        acc.gross += Number(row.gross_freight) || 0;
        acc.net += Number(row.net_amount) || 0;
        acc.shortage += Number(row.shortage_amount) || 0;
        acc.detain += Number(row.detain_amount) || 0;
        acc.others += Number(row.others_exp) || 0;
        acc.advance += Number(row.advance_amount) || 0;
        acc.tds += Number(row.tds_amount) || 0;
        acc.payable += Number(row.payable_amount) || 0;
        return acc;
      },
      { gross: 0, net: 0, shortage: 0, detain: 0, others: 0, advance: 0, tds: 0, payable: 0 }
    );

    autoTable(doc, {
      startY: 26,
      theme: "grid",
      headStyles: { fillColor: [15, 118, 110] },
      styles: { fontSize: 7 },
      head: [[
        "Bilti",
        "Transport",
        "Dispatch",
        "Voucher",
        "Party",
        "Lorry",
        "Dest",
        "Gross",
        "Net Amount",
        "Shortage",
        "Detain",
        "Others",
        "Advance",
        "TDS",
        "Payable",
      ]],
      body: rows.map((row) => [
        row.bilti_no,
        row.transporter_name || "",
        formatDisplayDate(row.dispatch_date),
        row.voucher_no || row.outward_voucher_no || row.sale_voucher_no || "",
        row.company_name || row.outward_company_name || row.sale_buyer_name || "",
        row.lorry_no || row.outward_lorry_no || row.sale_lorry_no || "",
        row.destination || "",
        num(row.gross_freight),
        num(row.net_amount),
        num(row.shortage_amount),
        num(row.detain_amount),
        num(row.others_exp),
        num(row.advance_amount),
        num(row.tds_amount),
        num(row.payable_amount),
      ]),
      foot: [[
        "", "", "", "", "", "", "Totals",
        num(rowTotals.gross),
        num(rowTotals.net),
        num(rowTotals.shortage),
        num(rowTotals.detain),
        num(rowTotals.others),
        num(rowTotals.advance),
        num(rowTotals.tds),
        num(rowTotals.payable),
      ]],
    });

    return doc;
  };

  const makePdfFile = (rows, title, filename) => {
    const doc = buildReportPdf(rows, title);
    const blob = doc.output("blob");
    return {
      doc,
      file: new File([blob], filename, { type: "application/pdf" }),
    };
  };

  const downloadPDF = () => {
    const { doc } = makePdfFile(
      visibleRecords,
      "Transport Report",
      "Transport_Report.pdf"
    );
    doc.save("Transport_Report.pdf");
  };

  const downloadPdfDocument = (doc, filename) => {
    try {
      const blob = doc.output("blob");
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      anchor.style.display = "none";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1500);
      return true;
    } catch (err) {
      console.error("PDF download failed", err);
      try {
        doc.save(filename);
        return true;
      } catch (fallbackErr) {
        console.error("PDF save fallback failed", fallbackErr);
        return false;
      }
    }
  };

  const sharePdf = (rows, title, filename, whatsappText) => {
    try {
      const { file } = makePdfFile(rows, title, filename);
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        navigator.share({
          title,
          text: whatsappText,
          files: [file],
        }).catch((err) => {
          if (err?.name !== "AbortError") console.error("PDF share failed", err);
        });
        return;
      }

      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(whatsappText)}`;
      const popup = window.open(whatsappUrl, "_blank", "noopener,noreferrer");
      if (!popup) {
        window.location.href = whatsappUrl;
      }
    } catch (err) {
      console.error("WhatsApp share preparation failed", err);
    }
  };

  const shareReportWhatsApp = () => {
    sharePdf(
      visibleRecords,
      "Transport Report",
      "Transport_Report.pdf",
      `Transport Report
From: ${filters.from_date}
To: ${filters.to_date}
Rows: ${visibleRecords.length}`
    );
  };

  const buildBiltiStylePdf = (row, title = "Transport Payment Advice") => {
    const doc = new jsPDF("l", "mm", "a4");
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 12;
    const leftX = margin;
    const rightX = pageWidth - margin;
    const contentWidth = pageWidth - margin * 2;
    const outwardWeight = Number(row?.outward_qty || 0) || 0;
    const dispatchWeight = Number(row?.dispatch_qty || 0) || 0;
    const rate = Number(row?.transport_rate || 0) || 0;
    const gross = Number(row?.gross_freight || 0) || 0;
    const shortage = Number(row?.shortage_amount || 0) || 0;
    const detain = Number(row?.detain_amount || 0) || 0;
    const others = Number(row?.others_exp || 0) || 0;
    const tds = Number(row?.tds_amount || 0) || 0;
    const advance = Number(row?.advance_amount || 0) || 0;
    const roundOff = Number(row?.round_off || 0) || 0;
    const payable = Number(row?.payable_amount || 0) || 0;
    const netAmount = Number(row?.net_amount || 0) || 0;
    const money = (v) => Number(v || 0).toFixed(2);
    const claimAmount = Math.max(0, shortage);
    const addOnCharges = Math.max(0, detain + others);
    const netFreight = Math.max(0, netAmount || gross - claimAmount + addOnCharges);
    const shortageDetail = `${money(outwardWeight)} - ${money(dispatchWeight)} = ${money(Math.max(outwardWeight - dispatchWeight, 0))}`;
    const voucherNo = row?.voucher_no || row?.outward_voucher_no || row?.sale_voucher_no || "-";
    const billNo = row?.bilti_no || (row?.id ? `BLT-${row.id}` : "DRAFT");
    const transporterName = row?.transporter_name || "Transport Copy";

    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, pageWidth, pageHeight, "F");
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.5);
    doc.roundedRect(4, 4, pageWidth - 8, pageHeight - 8, 4, 4, "S");

    const headerHeight = 26;
    doc.setFillColor(3, 105, 103);
    doc.roundedRect(leftX, margin, contentWidth, headerHeight, 4, 4, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(255, 255, 255);
    doc.text(title, leftX + 10, margin + 16);

    const topBlockY = margin + headerHeight + 8;
    const topBlockHeight = 24;
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(leftX, topBlockY, contentWidth, topBlockHeight, 4, 4, "FD");

    const summaryFields = [
      ["LR Date", dateValue(row?.dispatch_date || row?.outward_date) || "-"],
      ["Voucher No", voucherNo],
      ["Transport", transporterName],
      ["Consignee", row?.consignee_name || "-"],
      ["Buyer", row?.buyer_name || "-"],
      ["Warehouse", row?.warehouse_name || "-"],
      ["Destination", row?.destination || "-"],
      ["Vehicle", row?.lorry_no || row?.outward_lorry_no || row?.sale_lorry_no || "-"],
      ["Product", row?.product_name || "-"],
      ["ADV Date", dateValue(getAdvanceDate(row)) || "-"],
    ];
    const cols = 5;
    const colWidth = contentWidth / cols;
    summaryFields.forEach((field, index) => {
      const col = index % cols;
      const rowIndex = Math.floor(index / cols);
      const x = leftX + col * colWidth;
      const y = topBlockY + 5 + rowIndex * 10;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(15, 23, 42);
      doc.text(field[0], x + 3, y);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(71, 85, 105);
      doc.text(String(field[1]), x + 3, y + 4);
      if (col < cols - 1) {
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.2);
        doc.line(x + colWidth, topBlockY + 4, x + colWidth, topBlockY + topBlockHeight - 4);
      }
    });

    const tableY = topBlockY + topBlockHeight + 10;
    autoTable(doc, {
      startY: tableY,
      margin: { left: leftX, right: leftX },
      theme: "grid",
      styles: { fontSize: 7.8, cellPadding: 3.5, lineWidth: 0.22, lineColor: [203, 213, 225], textColor: [15, 23, 42] },
      headStyles: { fillColor: [3, 105, 103], textColor: [255, 255, 255], fontStyle: "bold", halign: "center" },
      alternateRowStyles: { fillColor: [249, 250, 251] },
      head: [["Bilti No","Voucher","Consignor / Party","Consignee","Lorry No","Product","Outward Wt.","Dispatch Wt.","Rate","Gross Freight"]],
      body: [[
        billNo, voucherNo, row?.company_name || row?.outward_company_name || row?.sale_buyer_name || row?.account_name || "-",
        row?.consignee_name || "-", row?.lorry_no || row?.outward_lorry_no || row?.sale_lorry_no || "-", row?.product_name || "-",
        money(outwardWeight), money(dispatchWeight), money(rate), money(gross),
      ]],
    });

    const sectionY = doc.lastAutoTable.finalY + 10;
    const sectionWidth = (contentWidth - 10) / 2;
    const sectionHeight = 86;
    doc.setDrawColor(203, 213, 225);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(leftX, sectionY, sectionWidth, sectionHeight, 4, 4, "FD");
    doc.roundedRect(leftX + sectionWidth + 10, sectionY, sectionWidth, sectionHeight, 4, 4, "FD");
    doc.setFillColor(3, 105, 103);
    doc.roundedRect(leftX, sectionY, sectionWidth, 12, 4, 4, "F");
    doc.roundedRect(leftX + sectionWidth + 10, sectionY, sectionWidth, 12, 4, 4, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text("DEDUCTION DETAILS", leftX + 5, sectionY + 8);
    doc.text("PAYMENT DETAILS", leftX + sectionWidth + 15, sectionY + 8);

    const leftCol1 = leftX + 5;
    const leftCol2 = leftX + sectionWidth * 0.45;
    const leftCol3 = leftX + sectionWidth - 4;
    let rowY = sectionY + 18;
    const leftRows = [
      ["Shortage Qty", shortageDetail, ""], ["Free KG", row?.shortage_free_kg || "-", ""], ["Claim Amount", "", money(claimAmount)],
      ["Detain Charges", "", money(detain)], ["Other Charges", "", money(others)],
    ];
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    leftRows.forEach((item) => {
      doc.text(String(item[0] ?? ""), leftCol1, rowY); doc.text(String(item[1] ?? ""), leftCol2, rowY); doc.text(String(item[2] ?? ""), leftCol3, rowY, { align: "right" }); rowY += 7.5;
    });
    doc.setDrawColor(226, 232, 240); doc.line(leftX + 5, sectionY + sectionHeight - 20, leftX + sectionWidth - 5, sectionY + sectionHeight - 20);
    doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(15, 23, 42);
    doc.text("Total Claim", leftCol1, sectionY + sectionHeight - 8); doc.text(money(claimAmount), leftCol3, sectionY + sectionHeight - 8, { align: "right" });

    const rightCol1 = leftX + sectionWidth + 15;
    const rightCol2 = leftX + sectionWidth * 2 + 6;
    rowY = sectionY + 18;
    const rightRows = [
      ["Gross Freight", money(gross)], ["Less: Claim Amount", money(claimAmount)], ["Add: Detain Charges", money(detain)],
      ["Add: Other Charges", money(others)], ["Net Freight", money(netFreight)], ["TDS Amount", money(tds)],
      ["Round Off", money(roundOff)], ["ADV Date", dateValue(getAdvanceDate(row)) || "-"], ["Advance Paid", money(advance)],
    ];
    rightRows.forEach((item) => {
      doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.setTextColor(15, 23, 42);
      doc.text(String(item[0] ?? ""), rightCol1, rowY); doc.text(String(item[1] ?? ""), rightCol2, rowY, { align: "right" }); rowY += 7.5;
    });
    doc.setDrawColor(226, 232, 240); doc.setLineWidth(0.4);
    doc.line(leftX + sectionWidth + 10, sectionY + sectionHeight - 20, leftX + sectionWidth * 2 + 10, sectionY + sectionHeight - 20);
    doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(15, 23, 42);
    doc.text("Net Payable", rightCol1, sectionY + sectionHeight - 10);
    const payableBoxWidth = 34; const payableBoxHeight = 10; const payableBoxX = rightCol2 - payableBoxWidth; const payableBoxY = sectionY + sectionHeight - 14.5;
    doc.setFillColor(188, 239, 188); doc.setDrawColor(188, 239, 188); doc.roundedRect(payableBoxX, payableBoxY, payableBoxWidth, payableBoxHeight, 2, 2, "FD");
    doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(15, 23, 42); doc.text(money(payable), rightCol2 - 2, sectionY + sectionHeight - 7, { align: "right" });

    const payDate = dateValue(getPayDate(row)) || "-";
    const payAmount = getPayAmount(row);
    const balanceAmount = getBalanceAmount(row);
    const footerY = sectionY + sectionHeight + 8;
    doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(15, 23, 42);
    doc.text(`Amount in words: Indian Rupees ${numberToWords(payable)}`, leftX, footerY);
    doc.setFont("helvetica", "normal"); doc.setFontSize(7.5);
    doc.text(`PA Date: ${payDate}   Pay Amount: ${money(payAmount)}   Balance Amount: ${money(balanceAmount)}`, leftX, footerY + 7);
    doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.text("Authorized By:", rightX - 2, footerY, { align: "right" });

    return doc;
  };

  const transportRows = (transportName) =>
    visibleRecords.filter(
      (row) =>
        String(row.transporter_name || "").trim().toLowerCase() ===
        String(transportName || "").trim().toLowerCase()
    );

  const buildTransportLedgerPdf = (row) => {
    const name = row?.transporter_name || "Transport";
    const rows = transportRows(name);
    const doc = new jsPDF("l", "mm", "a4");
    doc.setFontSize(16);
    doc.text(`Transport Ledger - ${name}`, 14, 14);
    doc.setFontSize(10);
    doc.text(`From: ${filters.from_date}   To: ${filters.to_date}`, 14, 21);

    autoTable(doc, {
      startY: 26,
      theme: "grid",
      headStyles: { fillColor: [15, 118, 110] },
      styles: { fontSize: 7 },
      head: [["Date", "Bilti", "Voucher", "Lorry", "Destination", "Gross", "Net", "Shortage", "Detain", "Others", "ADV Date", "Advance", "TDS", "Payable", "PA. Date", "Pay Amount", "Balance Amount"]],
      body: rows.map((item) => [
        formatDisplayDate(item.dispatch_date),
        item.bilti_no || "",
        item.voucher_no || item.outward_voucher_no || item.sale_voucher_no || "",
        item.lorry_no || item.outward_lorry_no || item.sale_lorry_no || "",
        item.destination || "",
        num(item.gross_freight),
        num(item.net_amount),
        num(item.shortage_amount),
        num(item.detain_amount),
        num(item.others_exp),
        dateValue(getAdvanceDate(item)),
        num(item.advance_amount),
        num(item.tds_amount),
        num(item.payable_amount),
        dateValue(getPayDate(item)),
        num(getPayAmount(item)),
        num(getBalanceAmount(item)),
      ]),
    });

    return { doc, rows, name };
  };

  const downloadTransportLedger = (row) => {
    const { doc, name } = buildTransportLedgerPdf(row);
    downloadPdfDocument(doc, `Transport_Ledger_${name.replace(/[^a-z0-9]+/gi, "_")}.pdf`);
  };

  const shareTransportLedger = (row) => {
    try {
      const { doc, rows, name } = buildTransportLedgerPdf(row);
      const filename = `Transport_Ledger_${name.replace(/[^a-z0-9]+/gi, "_")}.pdf`;
      const pdfBlob = doc.output("blob");
      const pdfFile = new File([pdfBlob], filename, { type: "application/pdf" });
      const textMessage = `Transport Ledger
Transport: ${name}
From: ${filters.from_date}
To: ${filters.to_date}
Rows: ${rows.length}`;

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
        navigator.share({
          title: `Transport Ledger - ${name}`,
          text: textMessage,
          files: [pdfFile],
        }).catch((err) => {
          if (err?.name !== "AbortError") console.error("Transport ledger share failed", err);
        });
        return;
      }

      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(textMessage)}`;
      const popup = window.open(whatsappUrl, "_blank", "noopener,noreferrer");
      if (!popup) window.location.href = whatsappUrl;
    } catch (err) {
      console.error("Transport ledger share preparation failed", err);
    }
  };

  const handleEdit = (id) => {
    window.location.href = `/transport-bilti?edit=${id}`;
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this bilti?")) return;
    try {
      await axios.delete(`${API_BASE}/transport-bilti/${id}`);
      alert("Bilti deleted successfully");
      fetchReport();
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.error || "Delete failed");
    }
  };

  return (
    <div style={{ padding: 20, background: "linear-gradient(180deg, #f1f5f9 0%, #f8fafc 260px)", minHeight: "100vh", fontFamily: "Segoe UI, Arial, sans-serif" }}>
      <div style={{ ...card, marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap", padding: "22px 24px", background: "linear-gradient(115deg, #0f172a 0%, #134e4a 74%, #0f766e 100%)", border: "none", color: "#fff" }}>
        <div>
          <div style={{ color: "#99f6e4", fontSize: 11, fontWeight: 800, letterSpacing: 1.4, textTransform: "uppercase", marginBottom: 5 }}>
            Transport Operations
          </div>
          <h2 style={{ margin: 0, color: "#fff", fontSize: 25 }}>Transport Report</h2>
          <div style={{ color: "#cbd5e1", fontSize: 13, marginTop: 5 }}>
            Review transport payments, bilti details and transporter balances
          </div>
        </div>
        <button
          onClick={() => navigate("/dashboard")}
          style={{
            padding: "8px 16px",
            background: "rgba(255,255,255,0.12)",
            color: "#fff",
            border: "1px solid rgba(255,255,255,0.28)",
            borderRadius: 10,
            fontSize: 14,
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          ← Back
        </button>
      </div>

      <div style={{ ...card, marginBottom: 16, borderTop: "4px solid #0f766e" }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <label style={{ display: "grid", gap: 5, color: "#64748b", fontSize: 11, fontWeight: 800, textTransform: "uppercase" }}>
            From date
            <input type="date" name="from_date" value={filters.from_date} onChange={(e) => setFilters((p) => ({ ...p, from_date: e.target.value }))} style={input} />
          </label>
          <label style={{ display: "grid", gap: 5, color: "#64748b", fontSize: 11, fontWeight: 800, textTransform: "uppercase" }}>
            To date
            <input type="date" name="to_date" value={filters.to_date} onChange={(e) => setFilters((p) => ({ ...p, to_date: e.target.value }))} style={input} />
          </label>
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search transport / bilti / voucher / lorry"
            aria-label="Search transport report"
            style={{ ...input, minWidth: 260, flex: "1 1 260px", alignSelf: "end" }}
          />
          <button onClick={fetchReport} style={{ ...button, background: "#0f766e", display: "inline-flex", alignItems: "center", gap: 8, alignSelf: "end" }}><FaSyncAlt /> F5 / Refresh</button>
          <button onClick={downloadPDF} style={{ ...button, background: "#2563eb", display: "inline-flex", alignItems: "center", gap: 8, alignSelf: "end" }}><FaFilePdf /> Report PDF</button>
          <button onClick={shareReportWhatsApp} style={{ ...button, background: "#16a34a", display: "inline-flex", alignItems: "center", gap: 8, alignSelf: "end" }}><FaWhatsapp /> WhatsApp Report</button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 12, marginBottom: 16 }}>
        {[
          { label: "Bilti Records", value: visibleRecords.length.toLocaleString(), accent: "#2563eb", tint: "#eff6ff" },
          { label: "Gross Freight", value: `₹ ${num(totals.gross)}`, accent: "#0f766e", tint: "#f0fdfa" },
          { label: "Total Payable", value: `₹ ${num(totals.payable)}`, accent: "#7c3aed", tint: "#f5f3ff" },
          { label: "Payment Vouchers", value: `${visiblePayments.length} · ₹ ${num(visiblePaymentTotal)}`, accent: "#ea580c", tint: "#fff7ed" },
        ].map((metric) => (
          <div key={metric.label} style={{ ...card, padding: "15px 17px", borderLeft: `4px solid ${metric.accent}`, background: metric.tint }}>
            <div style={{ color: "#64748b", fontSize: 11, fontWeight: 800, letterSpacing: 0.6, textTransform: "uppercase" }}>{metric.label}</div>
            <div style={{ color: "#172033", fontSize: 19, fontWeight: 800, marginTop: 7, overflowWrap: "anywhere" }}>{metric.value}</div>
          </div>
        ))}
      </div>

      <div style={{ ...card, marginBottom: 16, padding: 8, display: "flex", gap: 8, flexWrap: "wrap", background: "#e9eff5" }}>
        {[
          ['payment', 'Transport Payment'],
          ['bilti', 'Bilti Full Report'],
          ['ledger', 'Transporter Ledger'],
        ].map(([key, label]) => (
          <button key={key} type="button" onClick={() => setActiveSection(key)} style={{
            ...button,
            background: activeSection === key ? "#0f766e" : "#fff",
            color: activeSection === key ? "#fff" : "#334155",
            boxShadow: activeSection === key ? "0 4px 10px rgba(15,118,110,0.2)" : "none",
          }}>
            {label}
          </button>
        ))}
      </div>
      {activeSection === "payment" && (
      <div style={{ ...card, marginBottom: 16, overflow: "hidden", padding: 0 }}>
        <div style={{ padding: "17px 18px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div>
            <div style={{ color: "#0f766e", fontSize: 11, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>Payment History</div>
            <h3 style={{ margin: 0, color: "#0f172a" }}>Transport Payment Vouchers</h3>
          </div>
          <span style={{ padding: "6px 10px", borderRadius: 999, background: "#f0fdfa", color: "#0f766e", fontSize: 12, fontWeight: 800 }}>
            {visiblePayments.length} records
          </span>
        </div>
        <div style={{ overflowX: "auto", maxHeight: "45vh" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 900 }}>
            <thead>
              <tr>
                {["Voucher No", "Date", "Transporter", "Amount", "Bill Adjusted", "Advance", "On Account", "Method", "Narration", "Action"].map((heading) => (
                  <th key={heading} style={th}>{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visiblePayments.length ? visiblePayments.map((payment, index) => {
                const allocations = Array.isArray(payment.adjustments)
                  ? payment.adjustments
                  : Array.isArray(payment.allocations)
                  ? payment.allocations
                  : [];
                const adjusted = allocations.reduce(
                  (total, item) => total + Number(item.adjusted_amount ?? item.amount ?? 0),
                  0
                );

                return (
                  <tr key={payment._id || payment.id} style={{ background: index % 2 === 0 ? "#fff" : "#f8fafc" }}>
                    <td style={td}><span style={{ display: "inline-block", padding: "5px 8px", borderRadius: 7, background: "#f0fdfa", color: "#0f766e", fontWeight: 800 }}>{payment.voucher_no || "-"}</span></td>
                    <td style={td}>{dateValue(payment.date) || "-"}</td>
                    <td style={{ ...td, fontWeight: 700 }}>{payment.transporter_name || "-"}</td>
                    <td style={{ ...td, textAlign: "right", fontWeight: 800, color: "#0f766e" }}>{num(payment.amount)}</td>
                    <td style={{ ...td, textAlign: "right" }}>{num(adjusted)}</td>
                    <td style={{ ...td, textAlign: "right" }}>{num(payment.advance_amount)}</td>
                    <td style={{ ...td, textAlign: "right" }}>{num(payment.on_account_amount)}</td>
                    <td style={td}><span style={{ display: "inline-block", padding: "4px 8px", borderRadius: 999, background: "#eef2ff", color: "#4338ca", fontSize: 12, fontWeight: 700 }}>{payment.payment_method || "-"}</span></td>
                    <td style={{ ...td, whiteSpace: "normal", minWidth: 160 }}>{payment.narration || "-"}</td>
                    <td style={td}>
                      <button
                        type="button"
                        onClick={() => navigate(`/voucher-entry?type=transport&edit=${encodeURIComponent(payment._id || payment.id)}`)}
                        style={{ ...button, background: "#ea580c", padding: "7px 11px" }}
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td style={{ ...td, textAlign: "center", color: "#64748b" }} colSpan={10}>
                    No transport payment vouchers found for this date range.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      )}
      {activeSection === "bilti" && (
      <div style={{ ...card, overflow: "hidden", padding: 0 }}>
        <div style={{ padding: "17px 18px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div>
            <div style={{ color: "#2563eb", fontSize: 11, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>Detailed Freight Register</div>
            <h3 style={{ margin: 0, color: "#0f172a" }}>Bilti Full Report</h3>
          </div>
          <span style={{ padding: "6px 10px", borderRadius: 999, background: "#eff6ff", color: "#1d4ed8", fontSize: 12, fontWeight: 800 }}>
            {visibleRecords.length} records
          </span>
        </div>
        <div style={{ overflowX: "auto", maxHeight: "72vh" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr>
                <th style={th}>Bilti No</th>
                <th style={th}>Transport</th>
                <th style={th}>Dispatch Date</th>
                <th style={th}>Voucher</th>
                <th style={th}>Party</th>
                <th style={th}>Warehouse</th>
                <th style={th}>Lorry</th>
                <th style={th}>Destination</th>
                <th style={th}>Days</th>
                <th style={th}>Outward Qty</th>
                <th style={th}>Dispatch Qty</th>
                <th style={th}>Shortage Qty</th>
                <th style={th}>Rate</th>
                <th style={th}>Gross Freight</th>
                <th style={th}>Net Amount</th>
                <th style={th}>Shortage Amount</th>
                <th style={th}>Detain</th>
                <th style={th}>Others Exp</th>
                <th style={th}>ADV Date</th>
                <th style={th}>Advance</th>
                <th style={th}>TDS %</th>
                <th style={th}>TDS Amount</th>
                <th style={th}>Payable</th>
                <th style={th}>PA. Date</th>
                <th style={th}>Pay Amount</th>
                <th style={th}>Balance Amount</th>
                <th style={th}>Action</th>
              </tr>
            </thead>
            <tbody>
              {visibleRecords.length > 0 ? (
                visibleRecords.map((row, index) => (
                  <tr key={row.id} style={{ background: index % 2 === 0 ? "#fff" : "#f8fafc" }}>
                    <td style={{ ...td, fontWeight: 800, color: "#1d4ed8" }}>{row.bilti_no}</td>
                    <td style={td}>{row.transporter_name}</td>
                  <td style={td}>{formatDisplayDate(row.dispatch_date)}</td>
                    <td style={td}>{row.voucher_no || row.outward_voucher_no || row.sale_voucher_no || ""}</td>
                    <td style={td}>{row.company_name || row.outward_company_name || row.sale_buyer_name || ""}</td>
                    <td style={td}>{row.warehouse_name || row.outward_warehouse_name || row.sale_warehouse_name || ""}</td>
                    <td style={td}>{row.lorry_no || row.outward_lorry_no || row.sale_lorry_no || ""}</td>
                    <td style={td}>{row.destination}</td>
                    <td style={td}>{row.days}</td>
                    <td style={td}>{num(row.outward_qty)}</td>
                    <td style={td}>{num(row.dispatch_qty)}</td>
                    <td style={td}>{num(row.shortage_qty)}</td>
                    <td style={td}>{num(row.transport_rate)}</td>
                    <td style={td}>{num(row.gross_freight)}</td>
                    <td style={td}>{num(row.net_amount)}</td>
                    <td style={td}>{num(row.shortage_amount)}</td>
                    <td style={td}>{num(row.detain_amount)}</td>
                    <td style={td}>{num(row.others_exp)}</td>
                    <td style={td}>{dateValue(getAdvanceDate(row))}</td>
                    <td style={td}>{num(row.advance_amount)}</td>
                    <td style={td}>{num(row.tds_percent)}</td>
                    <td style={td}>{num(row.tds_amount)}</td>
                    <td style={{ ...td, fontWeight: 800, color: "#0f766e" }}>{num(row.payable_amount)}</td>
                    <td style={td}>{dateValue(getPayDate(row))}</td>
                    <td style={td}>{num(getPayAmount(row))}</td>
                    <td style={{ ...td, fontWeight: 700, color: getBalanceAmount(row) > 0 ? "#c2410c" : "#047857" }}>{num(getBalanceAmount(row))}</td>
                    <td style={td}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => handleEdit(row.id)} style={{ ...button, background: "#2563eb", padding: "8px 10px" }}>
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const filename = `Transport_Bilti_${row.bilti_no || row.id}.pdf`;
                            const doc = buildBiltiStylePdf(row, "TRANSPORT PAYMENT ADVICE");
                            downloadPdfDocument(doc, filename);
                          }}
                          style={{ ...button, background: "#475569", padding: "8px 10px", display: "inline-flex", alignItems: "center", gap: 6 }}
                        >
                          <FaFilePdf /> PDF
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            try {
                              const title = `Transport Bilti - ${row.bilti_no || ""}`;
                              const filename = `Transport_Bilti_${row.bilti_no || row.id}.pdf`;
                              const doc = buildBiltiStylePdf(row, "TRANSPORT PAYMENT ADVICE");
                              const blob = doc.output("blob");
                              const pdfFile = new File([blob], filename, { type: "application/pdf" });
                              const whatsappText = `Transport Bilti
Bilti: ${row.bilti_no || ""}
Transport: ${row.transporter_name || ""}
Payable: ${num(row.payable_amount)}`;
                              if (navigator.share && navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
                                navigator.share({ title, text: whatsappText, files: [pdfFile] }).catch((err) => {
                                  if (err?.name !== "AbortError") console.error("Transport Bilti WhatsApp share failed", err);
                                });
                                return;
                              }

                              const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(whatsappText)}`;
                              const popup = window.open(whatsappUrl, "_blank", "noopener,noreferrer");
                              if (!popup) window.location.href = whatsappUrl;
                            } catch (err) {
                              console.error("Transport Bilti WhatsApp share preparation failed", err);
                            }
                          }}
                          style={{ ...button, background: "#16a34a", padding: "8px 10px", display: "inline-flex", alignItems: "center", gap: 6 }}
                        >
                          <FaWhatsapp /> WhatsApp
                        </button>
                        <button onClick={() => handleDelete(row.id)} style={{ ...button, background: "#dc2626", padding: "8px 10px", display: "inline-flex", alignItems: "center", gap: 6 }}>
                          Delete
                        </button>
                        <button onClick={() => downloadTransportLedger(row)} style={{ ...button, background: "#7c3aed", padding: "8px 10px", display: "inline-flex", alignItems: "center", gap: 6 }}>
                          <FaBook /> Ledger PDF
                        </button>
                        <button onClick={() => shareTransportLedger(row)} style={{ ...button, background: "#059669", padding: "8px 10px", display: "inline-flex", alignItems: "center", gap: 6 }}>
                          <FaWhatsapp /> Ledger WhatsApp
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td style={td} colSpan="23">No records found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>      )}
      {activeSection === "ledger" && (
        <div style={{ ...card, overflow: "hidden", padding: 0 }}>
          <div style={{ padding: "17px 18px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <div>
              <div style={{ color: "#7c3aed", fontSize: 11, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>Account Summary</div>
              <h3 style={{ margin: 0, color: "#0f172a" }}>Transporter Ledger</h3>
            </div>
            <span style={{ padding: "6px 10px", borderRadius: 999, background: "#f5f3ff", color: "#6d28d9", fontSize: 12, fontWeight: 800 }}>
              {transporterLedgerRows.length} transporters
            </span>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr>
                  {['Transporter', 'Bilti', 'Gross Freight', 'Net Amount', 'Advance', 'TDS', 'Payable', 'Paid', 'Balance', 'Action'].map((heading) => (
                    <th key={heading} style={th}>{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {transporterLedgerRows.length ? transporterLedgerRows.map((item, index) => {
                  const open = selectedLedgerTransporter === item.name;
                  return (
                    <React.Fragment key={item.name}>
                      <tr style={{ background: index % 2 === 0 ? "#fff" : "#f8fafc" }}>
                        <td style={{ ...td, fontWeight: 800, color: "#5b21b6" }}>{item.name}</td>
                        <td style={td}>{item.bills}</td>
                        <td style={td}>{num(item.gross)}</td>
                        <td style={td}>{num(item.net)}</td>
                        <td style={td}>{num(item.advance)}</td>
                        <td style={td}>{num(item.tds)}</td>
                        <td style={td}>{num(item.payable)}</td>
                        <td style={td}>{num(item.paid)}</td>
                        <td style={{ ...td, fontWeight: 800, color: item.balance > 0 ? "#c2410c" : "#047857" }}>{num(item.balance)}</td>
                        <td style={td}>
                          <button type="button" onClick={() => setSelectedLedgerTransporter(open ? "" : item.name)} style={{ ...button, background: open ? "#64748b" : "#7c3aed", padding: "7px 11px" }}>
                            {open ? 'Hide Details' : 'Details'}
                          </button>
                        </td>
                      </tr>
                      {open && (
                        <tr>
                          <td colSpan={10} style={{ padding: 0, background: '#f8fafc' }}>
                            <div style={{ padding: 12, overflowX: 'auto' }}>
                              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                                <thead><tr>{['Date','Bilti','Lorry','Destination','Gross','Payable','Paid','Balance'].map((h) => <th key={h} style={{ ...th, background: '#475569' }}>{h}</th>)}</tr></thead>
                                <tbody>{item.rows.map((row) => (
                                  <tr key={row.id || row.bilti_no}>
                                    <td style={td}>{dateValue(row.dispatch_date)}</td>
                                    <td style={td}>{row.bilti_no || '-'}</td>
                                    <td style={td}>{row.lorry_no || row.outward_lorry_no || row.sale_lorry_no || '-'}</td>
                                    <td style={td}>{row.destination || '-'}</td>
                                    <td style={td}>{num(row.gross_freight)}</td>
                                    <td style={td}>{num(row.payable_amount)}</td>
                                    <td style={td}>{num(getPayAmount(row))}</td>
                                    <td style={td}>{num(getBalanceAmount(row))}</td>
                                  </tr>
                                ))}</tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                }) : <tr><td style={{ ...td, textAlign: 'center', color: '#64748b' }} colSpan={10}>No transporter ledger found.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}
      </div>
  );
}
