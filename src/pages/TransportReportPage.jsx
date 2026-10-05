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
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    from_date: new Date(new Date().setDate(new Date().getDate() - 30))
      .toISOString()
      .split("T")[0],
    to_date: new Date().toISOString().split("T")[0],
  });

  const card = {
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: 16,
    padding: 16,
    boxShadow: "0 10px 30px rgba(15, 23, 42, 0.08)",
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
    background: "#0f766e",
    color: "#fff",
    padding: "10px 12px",
    border: "1px solid #dbe4ea",
    textAlign: "left",
    whiteSpace: "nowrap",
  };

  const td = {
    padding: "10px 12px",
    border: "1px solid #e2e8f0",
    background: "#fff",
    whiteSpace: "nowrap",
  };

  const num = (v) => Number(v || 0).toFixed(2);\n\n  const dateValue = (v) => (v ? formatDisplayDate(v) : "");\n\n  const getAdvanceDate = (row) => row?.advance_date || row?.adv_date || "";\n  const getPayDate = (row) => row?.pa_date || row?.pay_date || row?.payment_date || "";\n  const getPayAmount = (row) => Number(row?.pay_amount ?? row?.paid_amount ?? row?.payment_amount ?? 0) || 0;\n  const getBalanceAmount = (row) => {\n    if (row?.balance_amount !== undefined && row?.balance_amount !== null && row?.balance_amount !== "") {\n      return Number(row.balance_amount) || 0;\n    }\n    return (Number(row?.payable_amount) || 0) - getPayAmount(row);\n  };\n\n  const numberToWords = (value) => {\n    const number = Number(value);\n    if (!Number.isFinite(number)) return "Zero";\n    const roundedAmount = Math.round((Math.abs(number) + Number.EPSILON) * 100) / 100;\n    const totalPaise = Math.round(roundedAmount * 100);\n    const integerPart = Math.floor(totalPaise / 100);\n    const fractionalPart = totalPaise % 100;\n    const wordsForNumber = (numValue) => {\n      const units = ["Zero","One","Two","Three","Four","Five","Six","Seven","Eight","Nine","Ten","Eleven","Twelve","Thirteen","Fourteen","Fifteen","Sixteen","Seventeen","Eighteen","Nineteen"];\n      const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];\n      if (numValue < 20) return units[numValue];\n      if (numValue < 100) return `${tens[Math.floor(numValue / 10)]}${numValue % 10 ? ` ${units[numValue % 10]}` : ""}`;\n      if (numValue < 1000) return `${units[Math.floor(numValue / 100)]} Hundred${numValue % 100 ? ` ${wordsForNumber(numValue % 100)}` : ""}`;\n      const scales = ["Thousand", "Million", "Billion"];\n      let remainder = numValue;\n      let scaleIndex = -1;\n      let result = "";\n      while (remainder > 0) {\n        const chunk = remainder % 1000;\n        remainder = Math.floor(remainder / 1000);\n        scaleIndex += 1;\n        if (chunk) {\n          const chunkText = wordsForNumber(chunk);\n          result = `${chunkText} ${scales[scaleIndex]}${result ? ` ${result}` : ""}`.trim();\n        }\n      }\n      return result;\n    };\n    const integerWords = integerPart === 0 ? "Zero" : wordsForNumber(integerPart);\n    return `${number < 0 ? "Minus " : ""}${integerWords}${fractionalPart ? ` and ${fractionalPart}/100` : ""} only`;\n  };\n\n  const fetchReport = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE}/transport-bilti/report/list`, {
        params: { ...filters, _t: Date.now() },
        headers: {
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
      });
      setRecords(res.data || []);
    } catch (err) {
      console.error(err);
      setRecords([]);
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

  const sharePdf = async (rows, title, filename, whatsappText) => {
    const { file } = makePdfFile(rows, title, filename);
    try {
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title,
          text: whatsappText,
          files: [file],
        });
        return;
      }
    } catch (err) {
      console.error("PDF share failed", err);
    }

    window.open(
      `https://wa.me/?text=${encodeURIComponent(whatsappText)}`,
      "_blank"
    );
  };

  const shareReportWhatsApp = () => {
    sharePdf(
      visibleRecords,
      "Transport Report",
      "Transport_Report.pdf",
      `Transport Report\nFrom: ${filters.from_date}\nTo: ${filters.to_date}\nRows: ${visibleRecords.length}`
    );
  };

  const buildBiltiStylePdf = (row, title = "Transport Payment Advice") => {\n    const doc = new jsPDF("l", "mm", "a4");\n    const pageWidth = doc.internal.pageSize.getWidth();\n    const pageHeight = doc.internal.pageSize.getHeight();\n    const margin = 12;\n    const leftX = margin;\n    const rightX = pageWidth - margin;\n    const contentWidth = pageWidth - margin * 2;\n    const outwardWeight = Number(row?.outward_qty || 0) || 0;\n    const dispatchWeight = Number(row?.dispatch_qty || 0) || 0;\n    const rate = Number(row?.transport_rate || 0) || 0;\n    const gross = Number(row?.gross_freight || 0) || 0;\n    const shortage = Number(row?.shortage_amount || 0) || 0;\n    const detain = Number(row?.detain_amount || 0) || 0;\n    const others = Number(row?.others_exp || 0) || 0;\n    const tds = Number(row?.tds_amount || 0) || 0;\n    const advance = Number(row?.advance_amount || 0) || 0;\n    const roundOff = Number(row?.round_off || 0) || 0;\n    const payable = Number(row?.payable_amount || 0) || 0;\n    const netAmount = Number(row?.net_amount || 0) || 0;\n    const money = (v) => Number(v || 0).toFixed(2);\n    const claimAmount = Math.max(0, shortage);\n    const addOnCharges = Math.max(0, detain + others);\n    const netFreight = Math.max(0, netAmount || gross - claimAmount + addOnCharges);\n    const shortageDetail = `${money(outwardWeight)} - ${money(dispatchWeight)} = ${money(Math.max(outwardWeight - dispatchWeight, 0))}`;\n    const voucherNo = row?.voucher_no || row?.outward_voucher_no || row?.sale_voucher_no || "-";\n    const billNo = row?.bilti_no || (row?.id ? `BLT-${row.id}` : "DRAFT");\n    const transporterName = row?.transporter_name || "Transport Copy";\n\n    doc.setFillColor(255, 255, 255);\n    doc.rect(0, 0, pageWidth, pageHeight, "F");\n    doc.setDrawColor(203, 213, 225);\n    doc.setLineWidth(0.5);\n    doc.roundedRect(4, 4, pageWidth - 8, pageHeight - 8, 4, 4, "S");\n\n    const headerHeight = 26;\n    doc.setFillColor(3, 105, 103);\n    doc.roundedRect(leftX, margin, contentWidth, headerHeight, 4, 4, "F");\n    doc.setFont("helvetica", "bold");\n    doc.setFontSize(18);\n    doc.setTextColor(255, 255, 255);\n    doc.text(title, leftX + 10, margin + 16);\n\n    const topBlockY = margin + headerHeight + 8;\n    const topBlockHeight = 24;\n    doc.setFillColor(255, 255, 255);\n    doc.setDrawColor(203, 213, 225);\n    doc.roundedRect(leftX, topBlockY, contentWidth, topBlockHeight, 4, 4, "FD");\n\n    const summaryFields = [\n      ["LR Date", dateValue(row?.dispatch_date || row?.outward_date) || "-"],\n      ["Voucher No", voucherNo],\n      ["Transport", transporterName],\n      ["Consignee", row?.consignee_name || "-"],\n      ["Buyer", row?.buyer_name || "-"],\n      ["Warehouse", row?.warehouse_name || "-"],\n      ["Destination", row?.destination || "-"],\n      ["Vehicle", row?.lorry_no || row?.outward_lorry_no || row?.sale_lorry_no || "-"],\n      ["Product", row?.product_name || "-"],\n      ["ADV Date", dateValue(getAdvanceDate(row)) || "-"],\n    ];\n    const cols = 5;\n    const colWidth = contentWidth / cols;\n    summaryFields.forEach((field, index) => {\n      const col = index % cols;\n      const rowIndex = Math.floor(index / cols);\n      const x = leftX + col * colWidth;\n      const y = topBlockY + 5 + rowIndex * 10;\n      doc.setFont("helvetica", "bold");\n      doc.setFontSize(7);\n      doc.setTextColor(15, 23, 42);\n      doc.text(field[0], x + 3, y);\n      doc.setFont("helvetica", "normal");\n      doc.setTextColor(71, 85, 105);\n      doc.text(String(field[1]), x + 3, y + 4);\n      if (col < cols - 1) {\n        doc.setDrawColor(226, 232, 240);\n        doc.setLineWidth(0.2);\n        doc.line(x + colWidth, topBlockY + 4, x + colWidth, topBlockY + topBlockHeight - 4);\n      }\n    });\n\n    const tableY = topBlockY + topBlockHeight + 10;\n    autoTable(doc, {\n      startY: tableY,\n      margin: { left: leftX, right: leftX },\n      theme: "grid",\n      styles: { fontSize: 7.8, cellPadding: 3.5, lineWidth: 0.22, lineColor: [203, 213, 225], textColor: [15, 23, 42] },\n      headStyles: { fillColor: [3, 105, 103], textColor: [255, 255, 255], fontStyle: "bold", halign: "center" },\n      alternateRowStyles: { fillColor: [249, 250, 251] },\n      head: [["Bilti No","Voucher","Consignor / Party","Consignee","Lorry No","Product","Outward Wt.","Dispatch Wt.","Rate","Gross Freight"]],\n      body: [[\n        billNo, voucherNo, row?.company_name || row?.outward_company_name || row?.sale_buyer_name || row?.account_name || "-",\n        row?.consignee_name || "-", row?.lorry_no || row?.outward_lorry_no || row?.sale_lorry_no || "-", row?.product_name || "-",\n        money(outwardWeight), money(dispatchWeight), money(rate), money(gross),\n      ]],\n    });\n\n    const sectionY = doc.lastAutoTable.finalY + 10;\n    const sectionWidth = (contentWidth - 10) / 2;\n    const sectionHeight = 86;\n    doc.setDrawColor(203, 213, 225);\n    doc.setFillColor(255, 255, 255);\n    doc.roundedRect(leftX, sectionY, sectionWidth, sectionHeight, 4, 4, "FD");\n    doc.roundedRect(leftX + sectionWidth + 10, sectionY, sectionWidth, sectionHeight, 4, 4, "FD");\n    doc.setFillColor(3, 105, 103);\n    doc.roundedRect(leftX, sectionY, sectionWidth, 12, 4, 4, "F");\n    doc.roundedRect(leftX + sectionWidth + 10, sectionY, sectionWidth, 12, 4, 4, "F");\n    doc.setFont("helvetica", "bold");\n    doc.setFontSize(9);\n    doc.setTextColor(255, 255, 255);\n    doc.text("DEDUCTION DETAILS", leftX + 5, sectionY + 8);\n    doc.text("PAYMENT DETAILS", leftX + sectionWidth + 15, sectionY + 8);\n\n    const leftCol1 = leftX + 5;\n    const leftCol2 = leftX + sectionWidth * 0.45;\n    const leftCol3 = leftX + sectionWidth - 4;\n    let rowY = sectionY + 18;\n    const leftRows = [\n      ["Shortage Qty", shortageDetail, ""], ["Free KG", row?.shortage_free_kg || "-", ""], ["Claim Amount", "", money(claimAmount)],\n      ["Detain Charges", "", money(detain)], ["Other Charges", "", money(others)],\n    ];\n    doc.setFont("helvetica", "normal");\n    doc.setFontSize(7.5);\n    doc.setTextColor(71, 85, 105);\n    leftRows.forEach((item) => {\n      doc.text(item[0], leftCol1, rowY); doc.text(item[1], leftCol2, rowY); doc.text(item[2], leftCol3, rowY, { align: "right" }); rowY += 7.5;\n    });\n    doc.setDrawColor(226, 232, 240); doc.line(leftX + 5, sectionY + sectionHeight - 20, leftX + sectionWidth - 5, sectionY + sectionHeight - 20);\n    doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(15, 23, 42);\n    doc.text("Total Claim", leftCol1, sectionY + sectionHeight - 8); doc.text(money(claimAmount), leftCol3, sectionY + sectionHeight - 8, { align: "right" });\n\n    const rightCol1 = leftX + sectionWidth + 15;\n    const rightCol2 = leftX + sectionWidth * 2 + 6;\n    rowY = sectionY + 18;\n    const rightRows = [\n      ["Gross Freight", money(gross)], ["Less: Claim Amount", money(claimAmount)], ["Add: Detain Charges", money(detain)],\n      ["Add: Other Charges", money(others)], ["Net Freight", money(netFreight)], ["TDS Amount", money(tds)],\n      ["Round Off", money(roundOff)], ["ADV Date", dateValue(getAdvanceDate(row)) || "-"], ["Advance Paid", money(advance)],\n    ];\n    rightRows.forEach((item) => {\n      doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.setTextColor(15, 23, 42);\n      doc.text(item[0], rightCol1, rowY); doc.text(item[1], rightCol2, rowY, { align: "right" }); rowY += 7.5;\n    });\n    doc.setDrawColor(226, 232, 240); doc.setLineWidth(0.4);\n    doc.line(leftX + sectionWidth + 10, sectionY + sectionHeight - 20, leftX + sectionWidth * 2 + 10, sectionY + sectionHeight - 20);\n    doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(15, 23, 42);\n    doc.text("Net Payable", rightCol1, sectionY + sectionHeight - 10);\n    const payableBoxWidth = 34; const payableBoxHeight = 10; const payableBoxX = rightCol2 - payableBoxWidth; const payableBoxY = sectionY + sectionHeight - 14.5;\n    doc.setFillColor(188, 239, 188); doc.setDrawColor(188, 239, 188); doc.roundedRect(payableBoxX, payableBoxY, payableBoxWidth, payableBoxHeight, 2, 2, "FD");\n    doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(15, 23, 42); doc.text(money(payable), rightCol2 - 2, sectionY + sectionHeight - 7, { align: "right" });\n\n    const payDate = dateValue(getPayDate(row)) || "-";\n    const payAmount = getPayAmount(row);\n    const balanceAmount = getBalanceAmount(row);\n    const footerY = sectionY + sectionHeight + 8;\n    doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(15, 23, 42);\n    doc.text(`Amount in words: Indian Rupees ${numberToWords(payable)}`, leftX, footerY);\n    doc.setFont("helvetica", "normal"); doc.setFontSize(7.5);\n    doc.text(`PA Date: ${payDate}   Pay Amount: ${money(payAmount)}   Balance Amount: ${money(balanceAmount)}`, leftX, footerY + 7);\n    doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.text("Authorized By:", rightX - 2, footerY, { align: "right" });\n\n    return doc;\n  };\n\n  const transportRows = (transportName) =>
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
    doc.save(`Transport_Ledger_${name.replace(/[^a-z0-9]+/gi, "_")}.pdf`);
  };

  const shareTransportLedger = (row) => {
    const { doc, rows, name } = buildTransportLedgerPdf(row);
    const filename = `Transport_Ledger_${name.replace(/[^a-z0-9]+/gi, "_")}.pdf`;
    const pdfBlob = doc.output("blob");
    const pdfFile = new File([pdfBlob], filename, { type: "application/pdf" });
    const textMessage = `Transport Ledger\nTransport: ${name}\nFrom: ${filters.from_date}\nTo: ${filters.to_date}\nRows: ${rows.length}`;

    (async () => {
      try {
        if (navigator.share && navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
          await navigator.share({
            title: `Transport Ledger - ${name}`,
            text: textMessage,
            files: [pdfFile],
          });
          return;
        }
      } catch (err) {
        console.error("Transport ledger share failed", err);
      }
      window.open(`https://wa.me/?text=${encodeURIComponent(textMessage)}`, "_blank");
    })();
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
    <div style={{ padding: 20, background: "#f8fafc", minHeight: "100vh", fontFamily: "Segoe UI, Arial, sans-serif" }}>
      <div style={{ ...card, marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ margin: 0, color: "#0f172a" }}>Transport Report</h2>
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
          }}
        >
          ← Back
        </button>
      </div>

      <div style={{ ...card, marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <input type="date" name="from_date" value={filters.from_date} onChange={(e) => setFilters((p) => ({ ...p, from_date: e.target.value }))} style={input} />
          <input type="date" name="to_date" value={filters.to_date} onChange={(e) => setFilters((p) => ({ ...p, to_date: e.target.value }))} style={input} />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search transport / bilti / voucher / lorry"
            style={{ ...input, minWidth: 300 }}
          />
          <button onClick={fetchReport} style={{ ...button, background: "#0f766e", display: "inline-flex", alignItems: "center", gap: 8 }}><FaSyncAlt /> F5 / Refresh</button>
          <button onClick={downloadPDF} style={{ ...button, background: "#2563eb", display: "inline-flex", alignItems: "center", gap: 8 }}><FaFilePdf /> Report PDF</button>
          <button onClick={shareReportWhatsApp} style={{ ...button, background: "#16a34a", display: "inline-flex", alignItems: "center", gap: 8 }}><FaWhatsapp /> WhatsApp Report</button>
        </div>
      </div>

      <div style={{ ...card, overflow: "hidden" }}>
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
                visibleRecords.map((row) => (
                  <tr key={row.id}>
                    <td style={td}>{row.bilti_no}</td>
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
                    <td style={td}>{num(row.payable_amount)}</td>
                    <td style={td}>{dateValue(getPayDate(row))}</td>
                    <td style={td}>{num(getPayAmount(row))}</td>
                    <td style={td}>{num(getBalanceAmount(row))}</td>
                    <td style={td}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => handleEdit(row.id)} style={{ ...button, background: "#2563eb", padding: "8px 10px" }}>
                          Edit
                        </button>
                        <button
                          onClick={() => {
                            const filename = `Transport_Bilti_${row.bilti_no || row.id}.pdf`;
                            buildBiltiStylePdf(row, "TRANSPORT PAYMENT ADVICE").save(filename);
                          }}
                          style={{ ...button, background: "#475569", padding: "8px 10px", display: "inline-flex", alignItems: "center", gap: 6 }}
                        >
                          <FaFilePdf /> PDF
                        </button>
                        <button
                          onClick={async () => {
                            const title = `Transport Bilti - ${row.bilti_no || ""}`;
                            const filename = `Transport_Bilti_${row.bilti_no || row.id}.pdf`;
                            const doc = buildBiltiStylePdf(row, "TRANSPORT PAYMENT ADVICE");
                            const blob = doc.output("blob");
                            const pdfFile = new File([blob], filename, { type: "application/pdf" });
                            const whatsappText = `Transport Bilti\nBilti: ${row.bilti_no || ""}\nTransport: ${row.transporter_name || ""}\nPayable: ${num(row.payable_amount)}`;
                            try {
                              if (navigator.share && navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
                                await navigator.share({ title, text: whatsappText, files: [pdfFile] });
                                return;
                              }
                            } catch (err) {
                              console.error("Transport Bilti WhatsApp share failed", err);
                            }
                            window.open(`https://wa.me/?text=${encodeURIComponent(whatsappText)}`, "_blank");
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
      </div>
    </div>
  );
}
