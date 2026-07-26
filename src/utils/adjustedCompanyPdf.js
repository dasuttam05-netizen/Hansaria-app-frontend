import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatDisplayDate } from "./date";

const HEADER = [15, 118, 110];
const HEADER_DARK = [17, 94, 89];
const HEADER_SOFT = [232, 246, 243];
const INK = [15, 23, 42];
const MUTED = [71, 85, 105];
const BORDER = [213, 224, 234];
const ROW_ALT = [248, 251, 255];
const PAGE_BG = [248, 251, 250];
const MARGIN = 12;
const CONTENT_WIDTH = 210 - MARGIN * 2;

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

const tableBaseStyles = {
  fontSize: 8,
  cellPadding: { top: 2.2, right: 3, bottom: 2.2, left: 3 },
  textColor: INK,
  lineColor: BORDER,
  lineWidth: 0.2,
  overflow: "linebreak",
  valign: "middle",
};

function drawSectionTitle(doc, label, y) {
  const title = String(label || "").toUpperCase();
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(HEADER_DARK[0], HEADER_DARK[1], HEADER_DARK[2]);
  doc.text(title, MARGIN, y);
  doc.setDrawColor(HEADER[0], HEADER[1], HEADER[2]);
  doc.setLineWidth(0.3);
  doc.line(MARGIN + doc.getTextWidth(title) + 3, y - 1.2, MARGIN + CONTENT_WIDTH, y - 1.2);
}

function drawMetadataTable(doc, settlement, startY) {
  autoTable(doc, {
    startY,
    theme: "plain",
    margin: { left: MARGIN, right: MARGIN },
    styles: {
      ...tableBaseStyles,
      fontSize: 7.2,
      cellPadding: { top: 2, right: 2.5, bottom: 2, left: 2.5 },
    },
    body: [
      [
        { content: "Date", styles: { fontStyle: "bold", textColor: MUTED } },
        formatDisplayDate(settlement.date) || "-",
        { content: "Voucher No.", styles: { fontStyle: "bold", textColor: MUTED } },
        settlement.voucherNo || "-",
        { content: "Company Account", styles: { fontStyle: "bold", textColor: MUTED } },
        settlement.companyAccount || "-",
      ],
      [
        { content: "Location", styles: { fontStyle: "bold", textColor: MUTED } },
        settlement.locationName || "-",
        { content: "Product", styles: { fontStyle: "bold", textColor: MUTED } },
        settlement.productName || "-",
        { content: "Lorry No.", styles: { fontStyle: "bold", textColor: MUTED } },
        settlement.outwardLorryNo || "-",
      ],
    ],
    columnStyles: {
      0: { cellWidth: 24 },
      1: { cellWidth: 34, fontStyle: "bold" },
      2: { cellWidth: 28 },
      3: { cellWidth: 30, fontStyle: "bold" },
      4: { cellWidth: 30 },
      5: { cellWidth: 34, fontStyle: "bold" },
    },
    didParseCell: (data) => {
      if (data.section === "body") {
        data.cell.styles.fillColor = data.row.index % 2 === 0 ? [255, 255, 255] : ROW_ALT;
      }
    },
  });

  doc.setDrawColor(BORDER[0], BORDER[1], BORDER[2]);
  doc.setLineWidth(0.25);
  doc.roundedRect(MARGIN, startY - 1, CONTENT_WIDTH, doc.lastAutoTable.finalY - startY + 2, 2, 2, "S");

  return doc.lastAutoTable.finalY + 4;
}

function drawDetailTable(doc, title, rows, startY) {
  drawSectionTitle(doc, title, startY);

  autoTable(doc, {
    startY: startY + 3,
    theme: "plain",
    margin: { left: MARGIN, right: MARGIN },
    styles: tableBaseStyles,
    body: rows.map(([label, value]) => [
      { content: label, styles: { fontStyle: "normal", textColor: MUTED } },
      { content: String(value || "-"), styles: { fontStyle: "bold", halign: "right" } },
    ]),
    columnStyles: {
      0: { cellWidth: 58 },
      1: { cellWidth: CONTENT_WIDTH - 58 },
    },
    didParseCell: (data) => {
      if (data.section === "body") {
        data.cell.styles.fillColor = data.row.index % 2 === 0 ? [255, 255, 255] : ROW_ALT;
      }
    },
  });

  doc.setDrawColor(BORDER[0], BORDER[1], BORDER[2]);
  doc.setLineWidth(0.25);
  doc.roundedRect(MARGIN, startY + 2, CONTENT_WIDTH, doc.lastAutoTable.finalY - startY - 1, 2, 2, "S");

  return doc.lastAutoTable.finalY + 5;
}

function drawAmountSummaryTable(doc, title, rows, startY, { totalLabel = null } = {}) {
  drawSectionTitle(doc, title, startY);

  const body = rows.map(([label, value], index) => {
    const isTotal = totalLabel && label === totalLabel;
    return [
      {
        content: label,
        styles: {
          fontStyle: isTotal ? "bold" : "normal",
          textColor: isTotal ? HEADER_DARK : MUTED,
          fillColor: isTotal ? HEADER_SOFT : index % 2 === 0 ? [255, 255, 255] : ROW_ALT,
        },
      },
      {
        content: value,
        styles: {
          halign: "right",
          fontStyle: "bold",
          textColor: isTotal ? HEADER_DARK : INK,
          fillColor: isTotal ? HEADER_SOFT : index % 2 === 0 ? [255, 255, 255] : ROW_ALT,
          fontSize: isTotal ? 8.8 : 8,
        },
      },
    ];
  });

  autoTable(doc, {
    startY: startY + 3,
    theme: "plain",
    margin: { left: MARGIN, right: MARGIN },
    styles: tableBaseStyles,
    headStyles: {
      fillColor: HEADER,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      halign: "left",
      fontSize: 7.5,
    },
    head: [["Description", "Amount (Rs.)"]],
    body,
    columnStyles: {
      0: { cellWidth: 98 },
      1: { cellWidth: CONTENT_WIDTH - 98, halign: "right" },
    },
  });

  doc.setDrawColor(BORDER[0], BORDER[1], BORDER[2]);
  doc.setLineWidth(0.25);
  doc.roundedRect(MARGIN, startY + 2, CONTENT_WIDTH, doc.lastAutoTable.finalY - startY - 1, 2, 2, "S");

  return doc.lastAutoTable.finalY + 5;
}

function drawPageHeader(doc, settlement) {
  doc.setFillColor(PAGE_BG[0], PAGE_BG[1], PAGE_BG[2]);
  doc.rect(0, 0, 210, 297, "F");

  const headerH = 18;
  doc.setFillColor(HEADER[0], HEADER[1], HEADER[2]);
  doc.rect(0, 8, 128, headerH, "F");
  doc.setFillColor(PAGE_BG[0], PAGE_BG[1], PAGE_BG[2]);
  doc.triangle(128, 8, 118, 8 + headerH, 128, 8 + headerH, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12.5);
  doc.setTextColor(255, 255, 255);
  doc.text("OUTWARD SETTLEMENT", MARGIN, 16.5);
  doc.setFontSize(6.8);
  doc.text("ADJUSTED COMPANY COPY", MARGIN, 21.5);

  doc.setFillColor(255, 255, 255);
  doc.rect(128, 8, 210 - 128, headerH, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(HEADER_DARK[0], HEADER_DARK[1], HEADER_DARK[2]);
  const companyTitle = String(settlement.companyName || settlement.accountName || "HANSARIA APP").toUpperCase();
  doc.text(companyTitle, 133, 15, { maxWidth: 68 });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.5);
  doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
  doc.text(String(settlement.accountAddress || "-"), 133, 21, { maxWidth: 68 });

  return drawMetadataTable(doc, settlement, 30);
}

function drawNetPayableBox(doc, startY, netPayable) {
  const netBoxH = 14;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(BORDER[0], BORDER[1], BORDER[2]);
  doc.roundedRect(MARGIN, startY, CONTENT_WIDTH, netBoxH, 2, 2, "FD");
  doc.setFillColor(HEADER[0], HEADER[1], HEADER[2]);
  doc.roundedRect(MARGIN + 3, startY + 2.5, 10, 9, 1.5, 1.5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(HEADER_DARK[0], HEADER_DARK[1], HEADER_DARK[2]);
  doc.text("NET PAYABLE", MARGIN + 16, startY + 8.5);
  doc.setFontSize(12);
  doc.text(`Rs. ${money(netPayable)}`, MARGIN + CONTENT_WIDTH - 3, startY + 9, { align: "right" });
  return startY + netBoxH + 4;
}

function drawFooter(doc, startY) {
  doc.setDrawColor(HEADER[0], HEADER[1], HEADER[2]);
  doc.line(MARGIN + 50, startY, MARGIN + 62, startY);
  doc.line(MARGIN + CONTENT_WIDTH - 62, startY, MARGIN + CONTENT_WIDTH - 50, startY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(HEADER_DARK[0], HEADER_DARK[1], HEADER_DARK[2]);
  doc.text("Thank you for your business!", MARGIN + CONTENT_WIDTH / 2, startY + 1.2, { align: "center" });
}

function drawLineItemsTable(doc, lineItems, startY) {
  drawSectionTitle(doc, "Full Adjustment Details", startY);

  autoTable(doc, {
    startY: startY + 3,
    theme: "grid",
    margin: { left: MARGIN, right: MARGIN },
    styles: {
      ...tableBaseStyles,
      fontSize: 6.2,
      cellPadding: { top: 1.6, right: 1.5, bottom: 1.6, left: 1.5 },
    },
    headStyles: {
      fillColor: HEADER,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      halign: "center",
      fontSize: 6,
    },
    alternateRowStyles: { fillColor: ROW_ALT },
    head: [[
      "Sr",
      "Lorry No",
      "Inward Voucher",
      "Loading",
      "Settl. Wt",
      "Short Qnt",
      "Short Amt",
      "Claim",
      "C.Ded.",
      "Rate",
      "Freight",
      "Labour",
      "Other",
      "Amount",
      "Net Pay.",
    ]],
    body: lineItems.map((entry, index) => {
      const item = entry.item || entry;
      const row = entry.row || entry;
      return [
        index + 1,
        item.lorryNo || item.lorry_no || "-",
        item.inwardVoucherNo || item.inward_voucher_no || "-",
        loadingTypeLabel(item.sourceType ?? item.source_type),
        toNumber(row.settlementWeight).toFixed(2),
        toNumber(row.shortQty).toFixed(2),
        money(row.shortageAmount),
        money(row.claim),
        money(row.cDeduction ?? row.c_deduction),
        money(row.rowCompanyRate ?? row.companyRate ?? row.company_rate),
        money(row.freight),
        money(row.labour ?? row.labour_charges),
        money(row.other ?? row.other_charges),
        money(row.amount),
        money(row.netPayable ?? row.net_payable),
      ];
    }),
    columnStyles: {
      0: { cellWidth: 7, halign: "center" },
      1: { cellWidth: 16 },
      2: { cellWidth: 16 },
      3: { cellWidth: 14 },
      4: { cellWidth: 12, halign: "right" },
      5: { cellWidth: 11, halign: "right" },
      6: { cellWidth: 13, halign: "right" },
      7: { cellWidth: 12, halign: "right" },
      8: { cellWidth: 12, halign: "right" },
      9: { cellWidth: 13, halign: "right" },
      10: { cellWidth: 12, halign: "right" },
      11: { cellWidth: 12, halign: "right" },
      12: { cellWidth: 12, halign: "right" },
      13: { cellWidth: 14, halign: "right" },
      14: { cellWidth: 14, halign: "right", fontStyle: "bold" },
    },
    didDrawPage: (data) => {
      if (data.pageNumber > 1) {
        doc.setFillColor(PAGE_BG[0], PAGE_BG[1], PAGE_BG[2]);
        doc.rect(0, 0, 210, 297, "F");
      }
    },
  });

  return doc.lastAutoTable.finalY + 5;
}

export function buildUniqueCompanyCopyPdf({ settlement, uniqueSummary, lineItems }) {
  const doc = new jsPDF("p", "mm", "a4");
  const summary = {
    companyName: uniqueSummary?.companyName || "-",
    settlementWeight: toNumber(uniqueSummary?.settlementWeight),
    companyRate: toNumber(uniqueSummary?.companyRate),
    gAmount: toNumber(uniqueSummary?.gAmount),
    shortAmt: toNumber(uniqueSummary?.shortAmt),
    claim: toNumber(uniqueSummary?.claim),
    cDeduction: toNumber(uniqueSummary?.cDeduction),
    freight: toNumber(uniqueSummary?.freight),
    labour: toNumber(uniqueSummary?.labour),
    other: toNumber(uniqueSummary?.other),
    netPayable: toNumber(uniqueSummary?.netPayable),
  };
  const totalDeduction =
    summary.shortAmt + summary.claim + summary.cDeduction + summary.freight + summary.labour + summary.other;

  let cursorY = drawPageHeader(doc, settlement);

  cursorY = drawDetailTable(doc, "Adjusted Company Details", [
    ["Adjusted Company", summary.companyName],
    ["Settlement Weight", summary.settlementWeight.toFixed(2)],
    ["Consignee", settlement.consigneeName || "-"],
    ["Product", settlement.productName || "-"],
    ["Total Rows", String(Array.isArray(lineItems) ? lineItems.length : 0)],
  ], cursorY);

  cursorY = drawAmountSummaryTable(
    doc,
    "Gross Amount Details",
    [
      ["Weight", summary.settlementWeight.toFixed(2)],
      ["Company Rate", money(summary.companyRate)],
      ["Gross Amount", money(summary.gAmount)],
    ],
    cursorY,
    { totalLabel: "Gross Amount" }
  );

  cursorY = drawAmountSummaryTable(
    doc,
    "Deductions & Charges",
    [
      ["Shortage Amount", money(summary.shortAmt)],
      ["Claim", money(summary.claim)],
      ["C.Deduction", money(summary.cDeduction)],
      ["Freight", money(summary.freight)],
      ["Labour", money(summary.labour)],
      ["Other Charges", money(summary.other)],
      ["Total Deduction", money(totalDeduction)],
    ],
    cursorY,
    { totalLabel: "Total Deduction" }
  );

  if (Array.isArray(lineItems) && lineItems.length > 0) {
    cursorY = drawLineItemsTable(doc, lineItems, cursorY);
  }

  cursorY = drawNetPayableBox(doc, cursorY, summary.netPayable);
  drawFooter(doc, cursorY);

  const voucher = settlement.voucherNo || "OUT";
  const fileName = `${safeFileName(voucher)}_${safeFileName(summary.companyName)}_Unique.pdf`;
  const shareText = [
    "Outward Settlement - Unique Company Copy",
    `Voucher: ${settlement.voucherNo || "-"}`,
    `Date: ${formatDisplayDate(settlement.date) || "-"}`,
    `Company Account: ${settlement.companyAccount || "-"}`,
    `Adjusted Company: ${summary.companyName}`,
    `Gross Amount: Rs. ${money(summary.gAmount)}`,
    `Net Payable: Rs. ${money(summary.netPayable)}`,
    `Total Rows: ${Array.isArray(lineItems) ? lineItems.length : 0}`,
  ].join("\n");

  return { doc, fileName, shareText };
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
      shortageAmount: toNumber(item.shortageAmount ?? item.shortAmount),
      claim: toNumber(item.claim),
      cDeduction: toNumber(item.cDeduction ?? item.c_deduction),
      companyRate: toNumber(item.companyRate ?? item.company_rate),
      freight: toNumber(item.freight),
      labour: toNumber(item.labour ?? item.labour_charges),
      other: toNumber(item.other ?? item.other_charges),
      amount: toNumber(item.amount),
      netPayable: toNumber(item.netPayable ?? item.net_payable),
    };

    const totalDeduction =
      row.shortageAmount + row.claim + row.cDeduction + row.freight + row.labour + row.other;

    let cursorY = drawPageHeader(doc, settlement);

    // 1. Adjusted Company Details
    cursorY = drawDetailTable(doc, "Adjusted Company Details", [
      ["Adjusted Company", item.companyName || item.company_name || "-"],
      ["Adjusted Lorry No.", item.lorryNo || item.lorry_no || "-"],
      ["Inward Voucher", item.inwardVoucherNo || item.inward_voucher_no || "-"],
      ["Loading Type", loadingTypeLabel(item.sourceType ?? item.source_type)],
      ["Consignee", settlement.consigneeName || "-"],
      ["Product", settlement.productName || "-"],
      ["Settlement Weight", row.settlementWeight.toFixed(2)],
    ], cursorY);

    // 2. Gross Amount Details
    cursorY = drawAmountSummaryTable(
      doc,
      "Gross Amount Details",
      [
        ["Weight", row.settlementWeight.toFixed(2)],
        ["Company Rate", money(row.companyRate)],
        ["Gross Amount", money(row.amount)],
      ],
      cursorY,
      { totalLabel: "Gross Amount" }
    );

    // 3. Deductions & Charges
    cursorY = drawAmountSummaryTable(
      doc,
      "Deductions & Charges",
      [
        ["Shortage Amount", money(row.shortageAmount)],
        ["Claim", money(row.claim)],
        ["C.Deduction", money(row.cDeduction)],
        ["Freight", money(row.freight)],
        ["Labour", money(row.labour)],
        ["Other Charges", money(row.other)],
        ["Total Deduction", money(totalDeduction)],
      ],
      cursorY,
      { totalLabel: "Total Deduction" }
    );

    // Net payable
    cursorY = drawNetPayableBox(doc, cursorY, row.netPayable);
    drawFooter(doc, cursorY);
  });

  const firstItem = items[0] || {};
  const voucher = settlement.voucherNo || "OUT";
  const fileName = `${safeFileName(voucher)}_${safeFileName(firstItem.companyName || firstItem.company_name || "Adjusted_Company")}.pdf`;
  const shareText = [
    "Outward Settlement - Adjusted Company Copy",
    `Voucher: ${settlement.voucherNo || "-"}`,
    `Date: ${formatDisplayDate(settlement.date) || "-"}`,
    `Company Account: ${settlement.companyAccount || "-"}`,
    `Product: ${settlement.productName || "-"}`,
    `Adjusted Company: ${firstItem.companyName || firstItem.company_name || "-"}`,
    `Gross Amount: Rs. ${money(toNumber(firstItem.amount))}`,
    `Net Payable: Rs. ${money(toNumber(firstItem.netPayable ?? firstItem.net_payable))}`,
  ].join("\n");

  return { doc, fileName, shareText };
}
