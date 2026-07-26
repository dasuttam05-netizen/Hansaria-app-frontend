import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatDisplayDate } from "./date";

// App palette (matches OutwardSettlementPage)
const HEADER = [15, 118, 110];
const HEADER_DARK = [17, 94, 89];
const HEADER_SOFT = [232, 246, 243];
const INK = [15, 23, 42];
const MUTED = [71, 85, 105];
const BORDER = [213, 224, 234];
const ROW_ALT = [248, 251, 255];
const PAGE_BG = [248, 251, 250];

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
  doc.setFontSize(9.5);
  doc.setTextColor(HEADER_DARK[0], HEADER_DARK[1], HEADER_DARK[2]);
  doc.text(title, x, y);
  doc.setDrawColor(HEADER[0], HEADER[1], HEADER[2]);
  doc.setLineWidth(0.35);
  doc.line(x + doc.getTextWidth(title) + 4, y - 1.5, 196, y - 1.5);
}

function drawInfoTile(doc, x, y, w, title, value) {
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(BORDER[0], BORDER[1], BORDER[2]);
  doc.roundedRect(x, y, w, 16, 2, 2, "FD");
  doc.setFillColor(HEADER[0], HEADER[1], HEADER[2]);
  doc.circle(x + 6.5, y + 8, 3.8, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(5.8);
  doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
  doc.text(String(title || "").toUpperCase(), x + 13, y + 6.2);
  doc.setFontSize(6.8);
  doc.setTextColor(INK[0], INK[1], INK[2]);
  doc.text(String(value || "-"), x + 13, y + 11.2, { maxWidth: w - 15 });
}

function drawKeyValueCard(doc, rows, startY) {
  const left = 14;
  const right = 196;
  const cardWidth = right - left;
  const rowHeight = 8.2;
  const cardHeight = rows.length * rowHeight + 6;

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(BORDER[0], BORDER[1], BORDER[2]);
  doc.roundedRect(left, startY, cardWidth, cardHeight, 2.5, 2.5, "FD");

  rows.forEach(([label, value], index) => {
    const rowY = startY + 5 + index * rowHeight;
    if (index % 2 === 1) {
      doc.setFillColor(ROW_ALT[0], ROW_ALT[1], ROW_ALT[2]);
      doc.rect(left + 0.5, rowY - 5.5, cardWidth - 1, rowHeight, "F");
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.2);
    doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
    doc.text(String(label || ""), left + 4, rowY);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.4);
    doc.setTextColor(INK[0], INK[1], INK[2]);
    doc.text(String(value || "-"), right - 4, rowY, { align: "right", maxWidth: cardWidth - 52 });
  });

  return startY + cardHeight;
}

function drawAmountTable(doc, title, rows, startY, { highlightLast = false } = {}) {
  drawSectionTitle(doc, title, 14, startY);

  const body = rows.map(([particular, details, amount], index) => {
    const isLast = highlightLast && index === rows.length - 1;
    return [
      {
        content: particular,
        styles: isLast
          ? { fontStyle: "bold", fillColor: HEADER_SOFT, textColor: HEADER_DARK }
          : { fontStyle: "bold" },
      },
      {
        content: details,
        styles: isLast ? { fillColor: HEADER_SOFT } : {},
      },
      {
        content: amount,
        styles: {
          halign: "right",
          fontStyle: "bold",
          ...(isLast ? { fillColor: HEADER_SOFT, textColor: HEADER_DARK, fontSize: 9 } : {}),
        },
      },
    ];
  });

  autoTable(doc, {
    startY: startY + 4,
    theme: "grid",
    margin: { left: 14, right: 14 },
    headStyles: {
      fillColor: HEADER,
      textColor: 255,
      fontStyle: "bold",
      halign: "center",
      fontSize: 7.5,
    },
    styles: {
      fontSize: 7.8,
      cellPadding: 2.8,
      textColor: INK,
      lineColor: BORDER,
      lineWidth: 0.25,
    },
    alternateRowStyles: { fillColor: ROW_ALT },
    head: [["Particular", "Details", "Amount (Rs.)"]],
    body,
    columnStyles: {
      0: { cellWidth: 52 },
      1: { cellWidth: 88 },
      2: { cellWidth: 42, halign: "right" },
    },
  });

  return doc.lastAutoTable.finalY;
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

    doc.setFillColor(PAGE_BG[0], PAGE_BG[1], PAGE_BG[2]);
    doc.rect(0, 0, 210, 297, "F");

    // Header banner
    doc.setFillColor(HEADER[0], HEADER[1], HEADER[2]);
    doc.rect(0, 10, 138, 28, "F");
    doc.setFillColor(PAGE_BG[0], PAGE_BG[1], PAGE_BG[2]);
    doc.triangle(138, 10, 126, 38, 138, 38, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(17);
    doc.setTextColor(255, 255, 255);
    doc.text("OUTWARD SETTLEMENT", 8, 22);
    doc.setFontSize(8.5);
    doc.text("ADJUSTED COMPANY COPY", 8, 30);

    // Account block
    doc.setFillColor(255, 255, 255);
    doc.rect(138, 10, 64, 28, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(HEADER_DARK[0], HEADER_DARK[1], HEADER_DARK[2]);
    doc.text(String(settlement.accountName || "HANSARIA APP").toUpperCase(), 144, 19, { maxWidth: 52 });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(5.5);
    doc.text("GRAIN MERCHANT & COMMISSION AGENT", 144, 24.5, { maxWidth: 52 });
    doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
    doc.text(String(settlement.accountAddress || "-"), 144, 30, { maxWidth: 52 });

    // Metadata tiles
    const tileY = 48;
    drawInfoTile(doc, 14, tileY, 34, "Date", formatDisplayDate(settlement.date) || "-");
    drawInfoTile(doc, 50, tileY, 38, "Voucher No.", settlement.voucherNo || "-");
    drawInfoTile(doc, 90, tileY, 38, "Company Account", settlement.accountName || "-");
    drawInfoTile(doc, 130, tileY, 30, "Location", settlement.locationName || "-");
    drawInfoTile(doc, 162, tileY, 34, "Outward Lorry No.", settlement.outwardLorryNo || "-");

    // Gross amount at top
    let cursorY = 72;
    cursorY =
      drawAmountTable(
        doc,
        "Gross Amount Details",
        [
          ["Weight", "Settlement weight (MT)", row.settlementWeight.toFixed(2)],
          ["Company Rate", "Rate applied on settlement", money(row.companyRate)],
          ["Gross Amount", "Weight × company rate", money(row.amount)],
        ],
        cursorY,
        { highlightLast: true }
      ) + 10;

    // Adjusted company details – single-column card for WhatsApp readability
    drawSectionTitle(doc, "Adjusted Company Details", 14, cursorY);
    cursorY = drawKeyValueCard(
      doc,
      [
        ["Adjusted Company", item.companyName || item.company_name || "-"],
        ["Adjusted Lorry No.", item.lorryNo || item.lorry_no || "-"],
        ["Inward Voucher", item.inwardVoucherNo || item.inward_voucher_no || "-"],
        ["Loading Type", loadingTypeLabel(item.sourceType ?? item.source_type)],
        ["Consignee", settlement.consigneeName || "-"],
        ["Product", settlement.productName || "-"],
        ["Settlement Weight", row.settlementWeight.toFixed(2)],
      ],
      cursorY + 5
    );
    cursorY += 10;

    // Deductions & charges – separate section at bottom
    cursorY =
      drawAmountTable(
        doc,
        "Deductions & Charges",
        [
          ["S. Amount", "Shortage deduction", money(row.shortageAmount)],
          ["Claim", "Claim amount", money(row.claim)],
          ["C. Deduction", "Claim + other deduction", money(row.claim + row.deduction)],
          ["Freight", "Transportation charges", money(row.freight)],
          ["Labour Chgs", "Labour charges", money(row.labour)],
          ["Other Chgs", "Other miscellaneous charges", money(row.other)],
        ],
        cursorY
      ) + 10;

    // Net payable highlight
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(BORDER[0], BORDER[1], BORDER[2]);
    doc.roundedRect(14, cursorY, 182, 18, 2.5, 2.5, "FD");
    doc.setFillColor(HEADER[0], HEADER[1], HEADER[2]);
    doc.roundedRect(18, cursorY + 2.5, 14, 13, 2, 2, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(HEADER_DARK[0], HEADER_DARK[1], HEADER_DARK[2]);
    doc.text("NET PAYABLE", 38, cursorY + 11);
    doc.setFontSize(15);
    doc.text(`Rs. ${money(row.netPayable)}`, 192, cursorY + 11.5, { align: "right" });

    const footerY = Math.max(cursorY + 28, 276);
    doc.setDrawColor(HEADER[0], HEADER[1], HEADER[2]);
    doc.line(72, footerY, 88, footerY);
    doc.line(122, footerY, 138, footerY);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.8);
    doc.setTextColor(HEADER_DARK[0], HEADER_DARK[1], HEADER_DARK[2]);
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
    `Gross Amount: Rs. ${money(toNumber(firstItem.amount))}`,
    `Net Payable: Rs. ${money(toNumber(firstItem.netPayable ?? firstItem.net_payable))}`,
  ].join("\n");

  return { doc, fileName, shareText };
}
