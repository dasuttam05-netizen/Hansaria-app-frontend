import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const formatAmount = (value) => Number(value || 0).toFixed(2);
const parseAmount = (value) => {
  const cleaned = String(value ?? "").replace(/[^0-9.-]/g, "");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
};
const isPositiveAmount = (value) => parseAmount(value) > 0;

const formatDateRangeText = (dateFrom, dateTo) => {
  if (dateFrom && dateTo) return `${dateFrom} to ${dateTo}`;
  if (dateFrom) return `From ${dateFrom}`;
  if (dateTo) return `Up to ${dateTo}`;
  return "All dates";
};

export function exportLedgerExcel({
  title,
  fileName,
  ledgerTitle,
  dateFrom,
  dateTo,
  headers,
  rows,
  openingBalance,
  totalDr,
  totalCr,
  closingBalance,
}) {
  const typeColumnIndex = 2;
  const drColumnIndex = headers.length - 2;
  const crColumnIndex = headers.length - 1;
  const openingDr = Number(openingBalance || 0) > 0 ? formatAmount(openingBalance) : "-";
  const openingCr = Number(openingBalance || 0) < 0 ? formatAmount(Math.abs(Number(openingBalance || 0))) : "-";
  const openingDrClass = isPositiveAmount(openingDr) ? "amount-income" : "";
  const openingCrClass = isPositiveAmount(openingCr) ? "amount-expense" : "";
  const totalDrClass = isPositiveAmount(totalDr) ? "amount-income" : "";
  const totalCrClass = isPositiveAmount(totalCr) ? "amount-expense" : "";

  const buildCellClass = (columnIndex, typeValue, cellValue) => {
    const classes = [];
    if (columnIndex === drColumnIndex || columnIndex === crColumnIndex) {
      classes.push("num");
    }
    if (columnIndex === drColumnIndex && typeValue.includes("income") && isPositiveAmount(cellValue)) {
      classes.push("amount-income");
    }
    if (columnIndex === crColumnIndex && typeValue.includes("expense") && isPositiveAmount(cellValue)) {
      classes.push("amount-expense");
    }
    return classes.join(" ");
  };

  const bodyRows = rows
    .map(
      (row, rowIndex) => {
        const typeValue = String(row[typeColumnIndex] || "").toLowerCase();
        const rowClass = rowIndex % 2 === 0 ? "row-odd" : "row-even";
        return `
      <tr class="${rowClass}">
        ${row
          .map((cell, columnIndex) => {
            const cellClass = buildCellClass(columnIndex, typeValue, cell);
            return `<td class="${cellClass}">${escapeHtml(cell)}</td>`;
          })
          .join("")}
      </tr>`
      }
    )
    .join("");

  const html = `
    <html>
      <head>
        <meta charset="UTF-8" />
        <style>
          body { font-family: "Segoe UI", Arial, sans-serif; color: #0f172a; margin: 0; padding: 18px; background: #f1f5f9; }
          .report-head { background: linear-gradient(135deg, #065f46, #064e3b); color: #fff; border: 1px solid #064e3b; border-radius: 10px; padding: 14px 16px; margin-bottom: 14px; }
          .report-title { margin: 0 0 6px; font-size: 20px; font-weight: 700; letter-spacing: 0.02em; }
          .report-meta { margin: 0; color: #ecfdf5; font-size: 12px; }
          .table-wrap { background: #fff; border-top: 1px solid #94a3b8; border-bottom: 1px solid #94a3b8; border-left: none; border-right: none; border-radius: 0; overflow: hidden; }
          table { border-collapse: collapse; width: 100%; font-size: 12px; }
          th, td { border-top: 1px solid #cbd5e1; border-bottom: 1px solid #cbd5e1; border-left: none; border-right: none; padding: 7px 8px; text-align: left; }
          th { background: #ffffff; color: #0f172a; font-weight: 700; text-transform: uppercase; letter-spacing: 0.02em; }
          .row-odd td { background: #ffffff; }
          .row-even td { background: #f8fafc; }
          .num { text-align: right; }
          .summary td { background: #ecfdf5; font-weight: 700; }
          .amount-income { color: #15803d; font-weight: 700; }
          .amount-expense { color: #b91c1c; font-weight: 700; }
        </style>
      </head>
      <body>
        <div class="report-head">
          <h2 class="report-title">${escapeHtml(title)}</h2>
          <p class="report-meta"><strong>Ledger:</strong> ${escapeHtml(ledgerTitle || "All Ledger Accounts")}</p>
          <p class="report-meta"><strong>Date Range:</strong> ${escapeHtml(formatDateRangeText(dateFrom, dateTo))}</p>
        </div>

        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                ${headers.map((head) => `<th>${escapeHtml(head)}</th>`).join("")}
              </tr>
            </thead>
            <tbody>
              <tr class="summary">
                <td colspan="${Math.max(headers.length - 2, 1)}">Current opening balance</td>
                <td class="num ${openingDrClass}">${escapeHtml(openingDr)}</td>
                <td class="num ${openingCrClass}">${escapeHtml(openingCr)}</td>
              </tr>
              ${bodyRows}
              <tr class="summary">
                <td colspan="${Math.max(headers.length - 2, 1)}">Current closing balance</td>
                <td class="num ${totalDrClass}">${escapeHtml(formatAmount(totalDr))}</td>
                <td class="num ${totalCrClass}">${escapeHtml(formatAmount(totalCr))}</td>
              </tr>
              <tr class="summary">
                <td colspan="${Math.max(headers.length - 2, 1)}">Final balance</td>
                <td colspan="2" class="num">${escapeHtml(formatAmount(closingBalance))}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </body>
    </html>
  `;

  const blob = new Blob([html], { type: "application/vnd.ms-excel" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName.endsWith(".xls") ? fileName : `${fileName}.xls`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportLedgerPDF({
  title,
  fileName,
  ledgerTitle,
  dateFrom,
  dateTo,
  headers,
  rows,
  openingBalance,
  totalDr,
  totalCr,
  closingBalance,
}) {
  const doc = new jsPDF("l", "mm", "a4");
  const pageWidth = doc.internal.pageSize.getWidth();
  const typeColumnIndex = 2;
  const drColumnIndex = headers.length - 2;
  const crColumnIndex = headers.length - 1;

  doc.setFillColor(6, 95, 70);
  doc.rect(0, 0, pageWidth, 33, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.text(title || "Ledger Report", 14, 12);
  doc.setFontSize(10);
  doc.text(`Ledger: ${ledgerTitle || "All Ledger Accounts"}`, 14, 19);
  doc.text(`Date Range: ${formatDateRangeText(dateFrom, dateTo)}`, 14, 25);
  doc.setTextColor(30, 41, 59);

  const openingDr = Number(openingBalance || 0) > 0 ? formatAmount(openingBalance) : "-";
  const openingCr = Number(openingBalance || 0) < 0 ? formatAmount(Math.abs(Number(openingBalance || 0))) : "-";

  const body = [
    [...new Array(Math.max(headers.length - 2, 1)).fill(""), openingDr, openingCr],
    ...rows,
    [...new Array(Math.max(headers.length - 2, 1)).fill(""), formatAmount(totalDr), formatAmount(totalCr)],
    [...new Array(Math.max(headers.length - 2, 1)).fill(""), "Final", formatAmount(closingBalance)],
  ];

  if (body[0].length > 0) {
    body[0][0] = "Current opening balance";
  }
  if (body[rows.length + 1]?.length > 0) {
    body[rows.length + 1][0] = "Current closing balance";
  }

  autoTable(doc, {
    startY: 37,
    theme: "grid",
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [15, 23, 42],
      fontStyle: "bold",
      lineColor: [148, 163, 184],
      lineWidth: { top: 0.22, right: 0, bottom: 0.22, left: 0 },
    },
    styles: {
      fontSize: 8,
      textColor: [30, 41, 59],
      cellPadding: 2.2,
      lineColor: [148, 163, 184],
      lineWidth: { top: 0.15, right: 0, bottom: 0.15, left: 0 },
    },
    bodyStyles: {
      lineColor: [148, 163, 184],
      lineWidth: { top: 0.15, right: 0, bottom: 0.15, left: 0 },
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    head: [headers],
    body,
    didParseCell: (data) => {
      const rowIndex = data.row.index;
      const isSummaryRow = rowIndex === 0 || rowIndex === rows.length + 1 || rowIndex === rows.length + 2;
      const isLedgerDataRow = rowIndex > 0 && rowIndex <= rows.length;
      const typeValue = String(body[rowIndex]?.[typeColumnIndex] || "").toLowerCase();
      const isExpenseRow = typeValue.includes("expense");
      const isIncomeRow = typeValue.includes("income");

      if (isSummaryRow) {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fillColor = [248, 250, 252];
      }
      if (data.column.index >= headers.length - 2) {
        data.cell.styles.halign = "right";
      }

      if (isLedgerDataRow && data.column.index === drColumnIndex && isIncomeRow && isPositiveAmount(data.cell.raw)) {
        data.cell.styles.textColor = [22, 163, 74];
        data.cell.styles.fontStyle = "bold";
      }

      if (isLedgerDataRow && data.column.index === crColumnIndex && isExpenseRow && isPositiveAmount(data.cell.raw)) {
        data.cell.styles.textColor = [185, 28, 28];
        data.cell.styles.fontStyle = "bold";
      }

      if (isSummaryRow && data.column.index === drColumnIndex && isPositiveAmount(data.cell.raw)) {
        data.cell.styles.textColor = [22, 163, 74];
      }

      if (isSummaryRow && data.column.index === crColumnIndex && isPositiveAmount(data.cell.raw)) {
        data.cell.styles.textColor = [185, 28, 28];
      }
    },
  });

  doc.save(fileName.endsWith(".pdf") ? fileName : `${fileName}.pdf`);
}
