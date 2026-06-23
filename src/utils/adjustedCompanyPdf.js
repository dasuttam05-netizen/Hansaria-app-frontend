import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatDisplayDate } from "./date";

const GREEN = [10, 82, 65];
const GREEN_DARK = [5, 64, 50];
const GREEN_SOFT = [237, 246, 243];
const TEXT = [31, 41, 55];
const MUTED = [91, 108, 128];
const BORDER = [223, 231, 238];

const toNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const money = (value) =>
  toNumber(value).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const safeFileName = (value) =>
  String(value || "outward-settlement")
    .replace(/[/\\?%*:|"<>]/g, "-")
    .replace(/\s+/g, "_");

const loadingTypeLabel = (sourceType) =>
  String(sourceType || "").trim().toLowerCase() === "palti_lorry"
    ? "Palti Lorry"
    : "Warehouse Loading";

function drawSectionTitle(doc, label, x, y) {
  const title = String(label || "").toUpperCase();
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.2);
  doc.setTextColor(GREEN_DARK[0], GREEN_DARK[1], GREEN_DARK[2]);
  doc.text(title, x, y);
  doc.setDrawColor(GREEN[0], GREEN[1], GREEN[2]);
  doc.setLineWidth(0.35);
  doc.line(x + doc.getTextWidth(title) + 5, y - 1.5, 190, y - 1.5);
}

function drawInfoTile(doc, x, y, w, title, value) {
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(BORDER[0], BORDER[1], BORDER[2]);
  doc.roundedRect(x, y, w, 17, 2.5, 2.5, "FD");
  doc.setFillColor(GREEN[0], GREEN[1], GREEN[2]);
  doc.circle(x + 7, y + 8.5, 4.1, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.2);
  doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
  doc.text(String(title || "").toUpperCase(), x + 14, y + 6.6);
  doc.setFontSize(7);
  doc.setTextColor(TEXT[0], TEXT[1], TEXT[2]);
  doc.text(String(value || "-"), x + 14, y + 11.7, { maxWidth: w - 16 });
}

function drawDetailGrid(doc, leftRows, rightRows, y) {
  const rowCount = Math.max(leftRows.length, rightRows.length);
  const body = Array.from({ length: rowCount }, (_, index) => {
    const left = leftRows[index] || ["", ""];
    const right = rightRows[index] || ["", ""];
    return [
      left[0] ? `- ${left[0]}` : "",
      left[0] ? ":" : "",
      left[0] ? left[1] || "-" : "",
      right[0] ? `- ${right[0]}` : "",
      right[0] ? ":" : "",
      right[0] ? right[1] || "-" : "",
    ];
  });

  autoTable(doc, {
    startY: y,
    theme: "plain",
    margin: { left: 14, right: 14 },
    styles: {
      fontSize: 8,
      cellPadding: { top: 2.1, right: 2, bottom: 2.1, left: 2 },
      textColor: TEXT,
    },
    alternateRowStyles: { fillColor: [250, 252, 252] },
    body,
    columnStyles: {
      0: { cellWidth: 38, fontStyle: "bold" },
      1: { cellWidth: 5, halign: "center" },
      2: { cellWidth: 47, fontStyle: "bold" },
      3: { cellWidth: 38, fontStyle: "bold" },
      4: { cellWidth: 5, halign: "center" },
      5: { cellWidth: 47, fontStyle: "bold" },
    },
  });
}

export function buildAdjustedCompanyCopyPdf({ settlement, adjustmentItems }) {
  const doc = new jsPDF("p", "mm", "a4");
  const items =
    Array.isArray(adjustmentItems) && adjustmentItems.length
      ? adjustmentItems
      : [settlement.adjustmentItem || {}];

  items.forEach((item, index) => {
    if (index > 0) doc.addPage();

    const row = {
      settlementWeight: toNumber(item.settlementWeight ?? item.settlement_weight),
      shortQty: toNumber(item.shortQty ?? item.shortQtyPerLine),
      shortageAmount: toNumber(item.shortageAmount ?? item.shortAmount),
      claim: toNumber(item.claim),
      deduction: toNumber(item.deduction),
      companyRate: toNumber(item.companyRate ?? item.company_rate),
      freight: toNumber(item.freight),
      labour: toNumber(item.labour ?? item.labour_charges),
      other: toNumber(item.other ?? item.other_charges),
      amount: toNumber(item.amount),
      netPayable: toNumber(item.netPayable ?? item.net_payable),
    };

    doc.setFillColor(248, 251, 250);
    doc.rect(0, 0, 210, 297, "F");

    doc.setFillColor(GREEN[0], GREEN[1], GREEN[2]);
    doc.rect(0, 10, 140, 31, "F");
    doc.setFillColor(248, 251, 250);
    doc.triangle(140, 10, 128, 41, 140, 41, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(19.5);
    doc.setTextColor(255, 255, 255);
    doc.text("OUTWARD SETTLEMENT", 8, 24);
    doc.setFontSize(9.5);
    doc.text("ADJUSTED COMPANY COPY", 8, 34);

    doc.setFillColor(255, 255, 255);
    doc.rect(140, 10, 62, 31, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.4);
    doc.setTextColor(GREEN_DARK[0], GREEN_DARK[1], GREEN_DARK[2]);
    doc.text(String(settlement.accountName || "HANSARIA APP").toUpperCase(), 147, 21.5, { maxWidth: 48 });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(5.8);
    doc.text("GRAIN MERCHANT & COMMISSION AGENT", 147, 27.2, { maxWidth: 48 });
    doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
    doc.text(String(settlement.accountAddress || "-"), 147, 33.2, { maxWidth: 48 });

    const tileY = 51;
    drawInfoTile(doc, 14, tileY, 34, "Date", formatDisplayDate(settlement.date) || "-");
    drawInfoTile(doc, 50, tileY, 39, "Voucher No.", settlement.voucherNo || "-");
    drawInfoTile(doc, 91, tileY, 39, "Company Account", settlement.accountName || "-");
    drawInfoTile(doc, 132, tileY, 30, "Location", settlement.locationName || "-");
    drawInfoTile(doc, 164, tileY, 32, "Outward Lorry No.", settlement.outwardLorryNo || "-");

    drawSectionTitle(doc, "Adjusted Company Details", 14, 83);
    drawDetailGrid(
      doc,
      [
        ["Adjusted Company", item.companyName || item.company_name || "-"],
        ["Adjusted Lorry No.", item.lorryNo || item.lorry_no || "-"],
        ["Inward Voucher", item.inwardVoucherNo || item.inward_voucher_no || "-"],
        ["Loading Type", loadingTypeLabel(item.sourceType ?? item.source_type)],
        ["Consignee", settlement.consigneeName || "-"],
      ],
      [
        ["Product", settlement.productName || "-"],
        ["Name", item.companyName || item.company_name || settlement.accountName || "-"],
        ["Settlement Weight", row.settlementWeight.toFixed(2)],
      ],
      88
    );

    const detailsY = doc.lastAutoTable.finalY + 8;
    drawSectionTitle(doc, "Settlement Details", 14, detailsY);
    autoTable(doc, {
      startY: detailsY + 5,
      theme: "grid",
      margin: { left: 14, right: 14 },
      headStyles: { fillColor: GREEN, textColor: 255, fontStyle: "bold", halign: "center" },
      styles: { fontSize: 8, cellPadding: 2.7, textColor: TEXT, lineColor: BORDER, lineWidth: 0.25 },
      alternateRowStyles: { fillColor: [250, 252, 252] },
      head: [["#", "Particular", "Details", "Amount (Rs.)"]],
      body: [
        ["1", "Weight", "Settlement weight", row.settlementWeight.toFixed(2)],
        ["2", "Company Rate", "Rate applied on settlement", money(row.companyRate)],
        [{ content: "Amount", colSpan: 2, styles: { fontStyle: "bold", fillColor: GREEN_SOFT } }, "Weight x company rate", money(row.amount)],
        ["3", "S. Amount", "Shortage deduction", money(row.shortageAmount)],
        ["4", "Claim", "Claim amount", money(row.claim)],
        ["5", "C.Deduction", "Claim + deduction", money(row.claim + row.deduction)],
        ["6", "Freight", "Transportation charges", money(row.freight)],
        ["7", "Labour Chgs", "Labour charges", money(row.labour)],
        ["8", "Other Chgs", "Other miscellaneous charges", money(row.other)],
        [{ content: "Net Payable", colSpan: 2, styles: { fontStyle: "bold", fillColor: GREEN_SOFT } }, "Total payable after all adjustments", money(row.netPayable)],
      ],
      columnStyles: {
        0: { cellWidth: 12, halign: "center" },
        1: { cellWidth: 48, fontStyle: "bold" },
        2: { cellWidth: 82 },
        3: { cellWidth: 40, halign: "right", fontStyle: "bold" },
      },
    });

    const netY = doc.lastAutoTable.finalY + 9;
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(BORDER[0], BORDER[1], BORDER[2]);
    doc.roundedRect(14, netY, 182, 20, 2.5, 2.5, "FD");
    doc.setFillColor(GREEN[0], GREEN[1], GREEN[2]);
    doc.roundedRect(18, netY + 3, 16, 14, 2.5, 2.5, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(GREEN_DARK[0], GREEN_DARK[1], GREEN_DARK[2]);
    doc.text("NET PAYABLE", 42, netY + 12);
    doc.setFontSize(16);
    doc.text(`Rs. ${money(row.netPayable)}`, 190, netY + 12.5, { align: "right" });

    const footerY = Math.max(netY + 31, 276);
    doc.setDrawColor(GREEN[0], GREEN[1], GREEN[2]);
    doc.line(70, footerY, 91, footerY);
    doc.line(119, footerY, 140, footerY);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.2);
    doc.setTextColor(GREEN_DARK[0], GREEN_DARK[1], GREEN_DARK[2]);
    doc.text("Thank you for your business!", 105, footerY + 1.5, { align: "center" });
  });

  const firstItem = items[0] || {};
  const voucher = settlement.voucherNo || "OUT";
  const fileName = `${safeFileName(voucher)}_${safeFileName(firstItem.companyName || firstItem.company_name || "Adjusted_Company")}.pdf`;
  const shareText = [
    "Outward Settlement - Adjusted Company Copy",
    `Voucher: ${settlement.voucherNo || "-"}`,
    `Date: ${formatDisplayDate(settlement.date) || "-"}`,
    `Company Account: ${settlement.accountName || "-"}`,
    `Adjusted Company: ${firstItem.companyName || firstItem.company_name || "-"}`,
    `Net Payable: Rs. ${money(toNumber(firstItem.netPayable ?? firstItem.net_payable))}`,
  ].join("\n");

  return { doc, fileName, shareText };
}
