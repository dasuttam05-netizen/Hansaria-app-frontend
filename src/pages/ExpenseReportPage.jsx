import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import jsPDF from "jspdf";
import MultiSelectDropdown from "../components/MultiSelectDropdown";
import ReportSectionToggles from "../components/ReportSectionToggles";
import { formatDisplayDate } from "../utils/date";
import { useNavigate } from "react-router-dom";
import PageBackCloseActions from "../components/PageBackCloseActions";

const VOUCHER_LINE_COUNT = 20;

const printableText = (value, fallback = "N.A") => {
  const text = String(value ?? "").trim();
  return text ? text : fallback;
};

const formatMoney = (value) => {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount.toFixed(2) : "0.00";
};

const toAmount = (value) => {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
};

const formatItemNumber = (value) => {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount === 0) return "";
  return Number.isInteger(amount) ? String(amount) : amount.toFixed(2);
};

const formatVoucherDate = (value) => {
  if (!value) return "N.A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N.A";
  const day = date.getDate();
  const suffix =
    day % 10 === 1 && day !== 11
      ? "st"
      : day % 10 === 2 && day !== 12
      ? "nd"
      : day % 10 === 3 && day !== 13
      ? "rd"
      : "th";
  const month = date.toLocaleString("en-IN", { month: "short" });
  return `${day}${suffix} ${month}, ${date.getFullYear()}`;
};

const getTotalCollectAmount = (expense) =>
  toAmount(expense?.receive_cash_from_party) + toAmount(expense?.receive_cash_from_driver);

const getVoucherTotalAmount = (expense) => toAmount(expense?.grand_total) - getTotalCollectAmount(expense);

const getVoucherFileName = (expense) => {
  const voucherNo = printableText(expense?.voucher_no, `EXP-${expense?.id || "voucher"}`);
  return `${voucherNo.replace(/[/\\?%*:|"<>]/g, "-")}_Expense_Voucher.pdf`;
};

const getVoucherJpgFileName = (expense) => getVoucherFileName(expense).replace(/\.pdf$/i, ".jpg");

const numberToWordsUnderCrore = (value) => {
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  const twoDigits = (num) => {
    if (num < 20) return ones[num];
    return `${tens[Math.floor(num / 10)]}${num % 10 ? ` ${ones[num % 10]}` : ""}`;
  };
  const threeDigits = (num) => {
    const hundred = Math.floor(num / 100);
    const rest = num % 100;
    return `${hundred ? `${ones[hundred]} Hundred` : ""}${hundred && rest ? " " : ""}${rest ? twoDigits(rest) : ""}`.trim();
  };

  let amount = Math.max(0, Math.floor(Number(value) || 0));
  if (amount === 0) return "Zero";
  const parts = [];
  const crore = Math.floor(amount / 10000000);
  amount %= 10000000;
  const lakh = Math.floor(amount / 100000);
  amount %= 100000;
  const thousand = Math.floor(amount / 1000);
  amount %= 1000;
  if (crore) parts.push(`${threeDigits(crore)} Crore`);
  if (lakh) parts.push(`${threeDigits(lakh)} Lakh`);
  if (thousand) parts.push(`${threeDigits(thousand)} Thousand`);
  if (amount) parts.push(threeDigits(amount));
  return parts.join(" ");
};

const createExpenseVoucherPdf = (expense) => {
  const doc = new jsPDF("p", "mm", "a4");
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 8;
  const green = [91, 138, 57];
  const lightGreen = [238, 245, 231];
  const border = [218, 226, 214];
  const text = [28, 38, 50];
  const muted = [91, 105, 119];
  const items = Array.isArray(expense.items) ? expense.items : [];
  const totalCollect = getTotalCollectAmount(expense);
  const totalAmount = getVoucherTotalAmount(expense);
  const fields = {
    workDescription: printableText(expense.work_description),
    voucherNo: printableText(expense.voucher_no),
    date: formatVoucherDate(expense.expense_date),
    product: printableText(expense.product_name),
    partyName: printableText(expense.company_name),
    partyCompanyNo: printableText(expense.company_account_name),
    rejectLorryNo: printableText(expense.reg_lorry_no),
    regFrom: printableText(expense.reg_from_company_name),
    loading: printableText(formatItemNumber(expense.loading)),
    unloading: printableText(formatItemNumber(expense.unloading)),
    balance: printableText(formatItemNumber(expense.balance)),
    netWeight: printableText(formatItemNumber(expense.net_weight)),
    newLorryNo: printableText(expense.new_lorry_no),
    newWeight: printableText(formatItemNumber(expense.new_weight)),
    sendTo: printableText(expense.send_to_company_name),
    account: printableText(expense.company_account_name || expense.company_name),
    accountPartyCompany: printableText(expense.company_name),
    paidBy: printableText(expense.paid_by),
    partyDriverMobileNo: printableText(expense.paid_by_mobile),
    challanWeight: printableText(formatItemNumber(expense.challan_weight)),
    mbNo: printableText(expense.mb_no),
    receiveCashFromParty: formatMoney(expense.receive_cash_from_party),
    receiveCashFromDriver: formatMoney(expense.receive_cash_from_driver),
    grandTotal: formatMoney(expense.grand_total),
    totalCollect: formatMoney(totalCollect),
    totalAmount: formatMoney(totalAmount),
  };

  const rounded = (x, y, w, h, fill) => {
    doc.setDrawColor(...border);
    doc.setFillColor(...fill);
    doc.roundedRect(x, y, w, h, 2.5, 2.5, "FD");
  };
  const labelValue = (label, value, x, y, iconText = "") => {
    doc.setFillColor(...lightGreen);
    doc.setDrawColor(...green);
    doc.circle(x + 5, y + 5, 3.5, "FD");
    doc.setTextColor(...green);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.2);
    doc.text(iconText || label.charAt(0), x + 5, y + 6, { align: "center" });
    doc.setTextColor(...text);
    doc.setFontSize(5.8);
    doc.text(label.toUpperCase(), x + 12, y + 3.8);
    doc.setFontSize(7);
    doc.text(String(value), x + 12, y + 8.2, { maxWidth: 42 });
  };
  const leftRow = (label, value, y) => {
    doc.setTextColor(...muted);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(5.8);
    doc.text(label.toUpperCase(), 18, y);
    doc.setTextColor(...text);
    doc.setFontSize(6.2);
    doc.text(String(value), 58, y, { maxWidth: 30 });
    doc.setDrawColor(...border);
    doc.line(13, y + 2.4, 93, y + 2.4);
  };

  doc.setFillColor(249, 251, 246);
  doc.rect(0, 0, pageWidth, 297, "F");
  rounded(margin, 7, pageWidth - margin * 2, 29, [255, 255, 255]);
  doc.setFillColor(...green);
  doc.roundedRect(pageWidth - 63, 7, 55, 29, 2.5, 2.5, "F");
  doc.setTextColor(...text);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("HANSARIA FOOD PVT LTD", 14, 21);
  doc.setTextColor(...green);
  doc.setFontSize(9);
  doc.text("PAYMENT VOUCHER", 14, 29);
  doc.setDrawColor(...green);
  doc.setLineWidth(0.4);
  doc.line(14, 33, 22, 33);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(6.2);
  doc.text("VOUCHER NO.", pageWidth - 56, 15);
  doc.setFontSize(13);
  doc.text(fields.voucherNo, pageWidth - 56, 23);
  doc.setFontSize(6.7);
  doc.text(fields.date, pageWidth - 50, 30);

  rounded(margin, 39, pageWidth - margin * 2, 35, [255, 255, 255]);
  labelValue("Work Description", fields.workDescription, 12, 47, "W");
  labelValue("Product", fields.product, 76, 47, "P");
  labelValue("Party Name", fields.partyName, 136, 47, "N");
  doc.setDrawColor(...border);
  doc.line(70, 45, 70, 72);
  doc.line(130, 45, 130, 72);
  doc.line(12, 61, pageWidth - 12, 61);
  labelValue("Party Company No.", fields.partyCompanyNo, 12, 62, "A");
  labelValue("Reject Lorry No.", fields.rejectLorryNo, 76, 62, "R");
  labelValue("New Lorry No.", fields.newLorryNo, 136, 62, "L");

  rounded(margin, 77, 86, 116, [255, 255, 255]);
  doc.setFillColor(...lightGreen);
  doc.rect(8, 77, 86, 8, "F");
  doc.setTextColor(...green);
  doc.setFontSize(6.3);
  doc.text("VOUCHER DETAILS", 20, 82.2);
  [
    ["REG FROM", fields.regFrom],
    ["LOADING", fields.loading],
    ["UNLOADING", fields.unloading],
    ["BALANCE", fields.balance],
    ["NET WEIGHT", fields.netWeight],
    ["NEW LORRY NO.", fields.newLorryNo],
    ["NEW WEIGHT", fields.newWeight],
    ["SEND TO", fields.sendTo],
    ["A/C", fields.account],
    ["A/C PARTY COMPANY", fields.accountPartyCompany],
    ["PAID BY PARTY/DRIVER", fields.paidBy],
    ["PARTY/DRIVER MOBILE NO.", fields.partyDriverMobileNo],
    ["CHALLAN WEIGHT", fields.challanWeight],
    ["DRIVER SIGN", "-"],
    ["MB NO.", fields.mbNo],
    ["REP. SIGN", "-"],
  ].forEach(([label, value], index) => leftRow(label, value, 91 + index * 6.1));

  const tableX = 98;
  const tableY = 77;
  const tableW = pageWidth - tableX - 8;
  rounded(tableX, tableY, tableW, 152, [255, 255, 255]);
  doc.setFillColor(...green);
  doc.rect(tableX, tableY, tableW, 8, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(6);
  const col = [tableX, tableX + 12, tableX + 58, tableX + 78, tableX + 97, tableX + tableW];
  ["#", "PARTICULARS", "BAGS", "RATE", "AMOUNT"].forEach((head, i) => {
    doc.text(head, (col[i] + col[i + 1]) / 2, tableY + 5.2, { align: "center" });
  });
  doc.setDrawColor(...border);
  col.forEach((x) => doc.line(x, tableY, x, tableY + 152));
  const itemRowHeight = 7.2;
  for (let index = 0; index < VOUCHER_LINE_COUNT; index += 1) {
    const y = tableY + 8 + index * itemRowHeight;
    if (index % 2 === 1) {
      doc.setFillColor(250, 252, 248);
      doc.rect(tableX, y, tableW, itemRowHeight, "F");
    }
    doc.line(tableX, y, tableX + tableW, y);
    const line = items[index] || {};
    doc.setTextColor(...text);
    doc.setFont("helvetica", index < items.length ? "bold" : "normal");
    doc.setFontSize(6.2);
    doc.text(String(Number(line.line_no) || index + 1), col[0] + 6, y + 4.2, { align: "center" });
    doc.text(printableText(line.particular_name || "", ""), col[1] + 3, y + 4.2, { maxWidth: 42 });
    doc.text(formatItemNumber(line.bags), col[3] - 3, y + 4.2, { align: "right" });
    doc.text(formatItemNumber(line.rate), col[4] - 3, y + 4.2, { align: "right" });
    doc.text(formatItemNumber(line.amount), col[5] - 4, y + 4.2, { align: "right" });
  }

  rounded(margin, 197, 86, 27, [255, 255, 255]);
  doc.setFillColor(...lightGreen);
  doc.rect(8, 197, 86, 8, "F");
  doc.setTextColor(...green);
  doc.setFontSize(6.2);
  doc.text("PAYMENT RECEIVED", 20, 202.2);
  doc.setTextColor(...text);
  doc.text("RECEIVE CASH FROM PARTY", 21, 212);
  doc.text(`Rs. ${fields.receiveCashFromParty}`, 88, 212, { align: "right" });
  doc.text("RECEIVE CASH FROM DRIVER", 21, 220);
  doc.text(`Rs. ${fields.receiveCashFromDriver}`, 88, 220, { align: "right" });

  const sumY = 232;
  rounded(98, sumY, tableW, 28, [255, 255, 255]);
  doc.setFontSize(7);
  doc.setTextColor(...text);
  doc.text("GRAND TOTAL", 103, sumY + 8);
  doc.text(`Rs. ${fields.grandTotal}`, pageWidth - 14, sumY + 8, { align: "right" });
  doc.text("TOTAL COLLECT AMOUNT", 103, sumY + 18);
  doc.text(`Rs. ${fields.totalCollect}`, pageWidth - 14, sumY + 18, { align: "right" });
  doc.setFillColor(...green);
  doc.rect(98, sumY + 20, tableW, 8, "F");
  doc.setTextColor(255, 255, 255);
  doc.text("TOTAL AMOUNT", 103, sumY + 25.5);
  doc.setFontSize(10);
  doc.text(`Rs. ${fields.totalAmount}`, pageWidth - 14, sumY + 25.5, { align: "right" });

  rounded(margin, 263, pageWidth - margin * 2, 25, [255, 255, 255]);
  doc.setTextColor(...green);
  doc.setFontSize(5.8);
  doc.text("TOTAL AMOUNT (IN WORDS)", 26, 270);
  doc.setTextColor(...text);
  doc.setFontSize(7);
  doc.text(`${numberToWordsUnderCrore(totalAmount)} Only`, 26, 277, { maxWidth: 70 });
  doc.setDrawColor(...border);
  doc.line(122, 266, 122, 285);
  doc.setTextColor(...green);
  doc.setFontSize(5.8);
  doc.text("AUTHORIZED SIGNATURE", 137, 276);
  doc.setDrawColor(155, 166, 152);
  doc.line(135, 283, 175, 283);

  doc.setFillColor(225, 235, 218);
  doc.rect(0, 290, pageWidth, 7, "F");
  doc.setTextColor(...text);
  doc.setFontSize(5.8);
  doc.text(printableText(expense.paid_by_mobile, "-"), 15, 294.5);
  doc.text(printableText(expense.employee_name, "-"), 50, 294.5);
  doc.text(printableText(expense.company_account_name || expense.company_name, "-"), 90, 294.5);
  doc.text(`Generated: ${new Date().toLocaleString("en-IN")}`, pageWidth - 14, 294.5, { align: "right" });

  return doc;
};

const buildVoucherFields = (expense) => {
  const totalCollect = getTotalCollectAmount(expense);
  const totalAmount = getVoucherTotalAmount(expense);
  return {
    workDescription: printableText(expense.work_description),
    voucherNo: printableText(expense.voucher_no),
    date: formatVoucherDate(expense.expense_date),
    product: printableText(expense.product_name),
    partyName: printableText(expense.company_name),
    partyCompanyNo: printableText(expense.company_account_name),
    rejectLorryNo: printableText(expense.reg_lorry_no),
    regFrom: printableText(expense.reg_from_company_name),
    loading: printableText(formatItemNumber(expense.loading)),
    unloading: printableText(formatItemNumber(expense.unloading)),
    balance: printableText(formatItemNumber(expense.balance)),
    netWeight: printableText(formatItemNumber(expense.net_weight)),
    newLorryNo: printableText(expense.new_lorry_no),
    newWeight: printableText(formatItemNumber(expense.new_weight)),
    sendTo: printableText(expense.send_to_company_name),
    account: printableText(expense.company_account_name || expense.company_name),
    accountPartyCompany: printableText(expense.company_name),
    paidBy: printableText(expense.paid_by),
    partyDriverMobileNo: printableText(expense.paid_by_mobile),
    challanWeight: printableText(formatItemNumber(expense.challan_weight)),
    mbNo: printableText(expense.mb_no),
    receiveCashFromParty: formatMoney(expense.receive_cash_from_party),
    receiveCashFromDriver: formatMoney(expense.receive_cash_from_driver),
    grandTotal: formatMoney(expense.grand_total),
    totalCollect: formatMoney(totalCollect),
    totalAmount: formatMoney(totalAmount),
    totalAmountWords: `${numberToWordsUnderCrore(totalAmount)} Only`,
  };
};

const createExpenseVoucherJpgFile = (expense) => {
  const canvas = document.createElement("canvas");
  canvas.width = 900;
  canvas.height = 1275;
  const ctx = canvas.getContext("2d");
  const green = "#5b8a39";
  const lightGreen = "#eef5e7";
  const border = "#dae2d6";
  const text = "#1c2632";
  const muted = "#5b6977";
  const fields = buildVoucherFields(expense);
  const items = Array.isArray(expense.items) ? expense.items : [];

  const roundRect = (x, y, w, h, r, fill = "#fff", stroke = border) => {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1.4;
    ctx.stroke();
  };
  const textLine = (value, x, y, size = 16, weight = "600", color = text, align = "left") => {
    ctx.fillStyle = color;
    ctx.font = `${weight} ${size}px Arial`;
    ctx.textAlign = align;
    ctx.fillText(String(value || ""), x, y);
  };
  const labelBlock = (label, value, x, y, w) => {
    ctx.fillStyle = lightGreen;
    ctx.strokeStyle = green;
    ctx.beginPath();
    ctx.arc(x + 18, y + 19, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    textLine(label.toUpperCase(), x + 42, y + 15, 10, "700", muted);
    textLine(value, x + 42, y + 34, 14, "700", text);
    ctx.strokeStyle = border;
    ctx.beginPath();
    ctx.moveTo(x + w, y + 3);
    ctx.lineTo(x + w, y + 43);
    ctx.stroke();
  };
  const detailRow = (label, value, y) => {
    textLine(label.toUpperCase(), 52, y, 11, "700", muted);
    textLine(value, 192, y, 12, "700", text);
    ctx.strokeStyle = border;
    ctx.beginPath();
    ctx.moveTo(36, y + 13);
    ctx.lineTo(392, y + 13);
    ctx.stroke();
  };

  ctx.fillStyle = "#f9fbf6";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  roundRect(28, 24, 844, 108, 9);
  ctx.fillStyle = green;
  ctx.beginPath();
  ctx.roundRect(660, 24, 212, 108, 9);
  ctx.fill();
  textLine("HANSARIA FOOD PVT LTD", 58, 74, 38, "800", text);
  textLine("PAYMENT VOUCHER", 58, 109, 20, "700", green);
  textLine("VOUCHER NO.", 692, 56, 12, "800", "#fff");
  textLine(fields.voucherNo, 692, 88, 26, "800", "#fff");
  textLine(fields.date, 692, 116, 14, "700", "#fff");

  roundRect(28, 154, 844, 132, 9);
  labelBlock("Work Description", fields.workDescription, 48, 178, 260);
  labelBlock("Product", fields.product, 330, 178, 230);
  labelBlock("Party Name", fields.partyName, 585, 178, 245);
  ctx.strokeStyle = border;
  ctx.beginPath();
  ctx.moveTo(48, 230);
  ctx.lineTo(850, 230);
  ctx.stroke();
  labelBlock("Party Company No.", fields.partyCompanyNo, 48, 236, 260);
  labelBlock("Reject Lorry No.", fields.rejectLorryNo, 330, 236, 230);
  labelBlock("New Lorry No.", fields.newLorryNo, 585, 236, 245);

  roundRect(28, 310, 380, 500, 9);
  ctx.fillStyle = lightGreen;
  ctx.fillRect(29, 311, 378, 34);
  textLine("VOUCHER DETAILS", 86, 334, 12, "800", green);
  [
    ["REG FROM", fields.regFrom],
    ["LOADING", fields.loading],
    ["UNLOADING", fields.unloading],
    ["BALANCE", fields.balance],
    ["NET WEIGHT", fields.netWeight],
    ["NEW LORRY NO.", fields.newLorryNo],
    ["NEW WEIGHT", fields.newWeight],
    ["SEND TO", fields.sendTo],
    ["A/C", fields.account],
    ["A/C PARTY COMPANY", fields.accountPartyCompany],
    ["PAID BY PARTY/DRIVER", fields.paidBy],
    ["PARTY/DRIVER MOBILE NO.", fields.partyDriverMobileNo],
    ["CHALLAN WEIGHT", fields.challanWeight],
    ["DRIVER SIGN", "-"],
    ["MB NO.", fields.mbNo],
    ["REP. SIGN", "-"],
  ].forEach(([label, value], index) => detailRow(label, value, 370 + index * 27));

  const tx = 430;
  const ty = 310;
  const tw = 442;
  roundRect(tx, ty, tw, 640, 9);
  ctx.fillStyle = green;
  ctx.fillRect(tx + 1, ty + 1, tw - 2, 34);
  const col = [tx, tx + 45, tx + 255, tx + 330, tx + 385, tx + tw];
  ["#", "PARTICULARS", "BAGS", "RATE", "AMOUNT"].forEach((head, index) =>
    textLine(head, (col[index] + col[index + 1]) / 2, ty + 23, 11, "800", "#fff", "center")
  );
  ctx.strokeStyle = border;
  col.forEach((x) => {
    ctx.beginPath();
    ctx.moveTo(x, ty);
    ctx.lineTo(x, ty + 640);
    ctx.stroke();
  });
  for (let index = 0; index < VOUCHER_LINE_COUNT; index += 1) {
    const y = ty + 35 + index * 30;
    if (index % 2) {
      ctx.fillStyle = "#fafcf8";
      ctx.fillRect(tx + 1, y, tw - 2, 30);
    }
    ctx.strokeStyle = border;
    ctx.beginPath();
    ctx.moveTo(tx, y);
    ctx.lineTo(tx + tw, y);
    ctx.stroke();
    const line = items[index] || {};
    textLine(Number(line.line_no) || index + 1, col[0] + 22, y + 21, 12, "700", text, "center");
    textLine(printableText(line.particular_name || "", ""), col[1] + 12, y + 21, 12, "700", text);
    textLine(formatItemNumber(line.bags), col[3] - 12, y + 21, 12, "700", text, "right");
    textLine(formatItemNumber(line.rate), col[4] - 12, y + 21, 12, "700", text, "right");
    textLine(formatItemNumber(line.amount), col[5] - 14, y + 21, 12, "700", text, "right");
  }

  roundRect(28, 832, 380, 96, 9);
  ctx.fillStyle = lightGreen;
  ctx.fillRect(29, 833, 378, 34);
  textLine("PAYMENT RECEIVED", 86, 856, 12, "800", green);
  textLine("RECEIVE CASH FROM PARTY", 62, 890, 12, "800", text);
  textLine(`Rs. ${fields.receiveCashFromParty}`, 380, 890, 14, "800", green, "right");
  textLine("RECEIVE CASH FROM DRIVER", 62, 918, 12, "800", text);
  textLine(`Rs. ${fields.receiveCashFromDriver}`, 380, 918, 14, "800", green, "right");

  roundRect(430, 965, 442, 96, 9);
  textLine("GRAND TOTAL", 455, 998, 14, "800", text);
  textLine(`Rs. ${fields.grandTotal}`, 842, 998, 18, "800", text, "right");
  textLine("TOTAL COLLECT AMOUNT", 455, 1030, 14, "800", text);
  textLine(`Rs. ${fields.totalCollect}`, 842, 1030, 18, "800", text, "right");
  ctx.fillStyle = green;
  ctx.fillRect(430, 1038, 442, 23);
  textLine("TOTAL AMOUNT", 455, 1055, 13, "800", "#fff");
  textLine(`Rs. ${fields.totalAmount}`, 842, 1056, 20, "800", "#fff", "right");

  roundRect(28, 1090, 844, 98, 9);
  textLine("TOTAL AMOUNT (IN WORDS)", 95, 1120, 12, "800", green);
  textLine(fields.totalAmountWords, 95, 1155, 16, "800", text);
  ctx.strokeStyle = border;
  ctx.beginPath();
  ctx.moveTo(520, 1105);
  ctx.lineTo(520, 1175);
  ctx.stroke();
  textLine("AUTHORIZED SIGNATURE", 618, 1148, 12, "800", green);
  ctx.strokeStyle = "#9ba698";
  ctx.beginPath();
  ctx.moveTo(610, 1170);
  ctx.lineTo(780, 1170);
  ctx.stroke();

  ctx.fillStyle = "#e1ebda";
  ctx.fillRect(0, 1220, 900, 40);
  textLine(printableText(expense.paid_by_mobile, "-"), 48, 1246, 12, "700", text);
  textLine(printableText(expense.employee_name, "-"), 230, 1246, 12, "700", text);
  textLine(printableText(expense.company_account_name || expense.company_name, "-"), 410, 1246, 12, "700", text);
  textLine(`Generated: ${new Date().toLocaleString("en-IN")}`, 850, 1246, 12, "700", text, "right");

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        resolve(new File([], getVoucherJpgFileName(expense), { type: "image/jpeg" }));
        return;
      }
      resolve(new File([blob], getVoucherJpgFileName(expense), { type: "image/jpeg" }));
    }, "image/jpeg", 0.92);
  });
};

export default function ExpenseReportPage() {
  const API_BASE = "/api";
  const [expenses, setExpenses] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [searchText, setSearchText] = useState("");
  const [warehouseIds, setWarehouseIds] = useState([]);
  const [selectedParties, setSelectedParties] = useState([]);
  const [month, setMonth] = useState("");
  const [visibleSections, setVisibleSections] = useState(["table"]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchExpenses();
    axios.get(`${API_BASE}/warehouses`).then((res) => setWarehouses(res.data || [])).catch(() => setWarehouses([]));
  }, []);

  const fetchExpenses = async () => {
    try {
      const res = await axios.get(`${API_BASE}/expenses`);
      setExpenses(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error(error);
    }
  };

  const partyOptions = useMemo(() => {
    const unique = new Map();
    expenses.forEach((item) => {
      const partyName = item.company_name || item.party || "";
      if (partyName) {
        unique.set(partyName, partyName);
      }
    });
    return Array.from(unique.values()).map((name) => ({ value: name, label: name }));
  }, [expenses]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter((item) => {
      const dateOk = (!dateFrom || item.expense_date >= dateFrom) && (!dateTo || item.expense_date <= dateTo);
      const monthOk = !month || String(item.expense_date || "").startsWith(month);
      const warehouseOk = warehouseIds.length === 0 || warehouseIds.includes(String(item.warehouse_id || ""));
      const partyOk = selectedParties.length === 0 || selectedParties.includes(item.company_name || "");

      const haystack = [
        item.voucher_no,
        item.warehouse_name,
        item.employee_name,
        item.product_name,
        item.company_name,
        item.send_to_company_name,
        item.paid_by,
      ]
        .join(" ")
        .toLowerCase();

      return dateOk && monthOk && warehouseOk && partyOk && haystack.includes(searchText.toLowerCase());
    });
  }, [expenses, dateFrom, dateTo, searchText, warehouseIds, selectedParties, month]);

  const buildReportRows = () =>
    filteredExpenses
      .map(
        (item, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${item.voucher_no || ""}</td>
          <td>${formatDisplayDate(item.expense_date) || ""}</td>
          <td>${item.warehouse_name || ""}</td>
          <td>${item.employee_name || ""}</td>
          <td>${item.product_name || ""}</td>
          <td>${item.company_name || ""}</td>
          <td>${item.send_to_company_name || ""}</td>
          <td>${item.reg_lorry_no || ""}</td>
          <td>${item.paid_by || ""}</td>
          <td style="text-align:right">${Number(item.grand_total || 0).toFixed(2)}</td>
          <td style="text-align:right">${formatMoney(getTotalCollectAmount(item))}</td>
        </tr>`
      )
      .join("");

  const exportExcel = () => {
    const rows = buildReportRows();

    const html = `
      <html>
        <head>
          <meta charset="UTF-8" />
          <style>
            table { border-collapse: collapse; width: 100%; font-family: Arial, sans-serif; }
            th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; }
            th { background: #0f766e; color: white; }
          </style>
        </head>
        <body>
          <h2>Expense Report</h2>
          <table>
            <thead>
              <tr>
                <th>Sl No</th><th>Voucher</th><th>Date</th><th>Warehouse</th><th>Employee</th><th>Product</th>
                <th>Party</th><th>Send To</th><th>Reg Lorry</th><th>Paid By</th><th>Grand Total</th><th>Total Collect</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </body>
      </html>
    `;

    const blob = new Blob([html], { type: "application/vnd.ms-excel" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "expense-report.xls";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const downloadVoucherPdf = (expense) => {
    if (!expense) return;
    createExpenseVoucherPdf(expense).save(getVoucherFileName(expense));
  };

  const shareVoucherOnWhatsApp = async (expense) => {
    if (!expense) return;
    const file = await createExpenseVoucherJpgFile(expense);
    const message = `Expense voucher ${printableText(expense.voucher_no)} - Total amount Rs. ${formatMoney(getVoucherTotalAmount(expense))}`;

    if (navigator.canShare && navigator.canShare({ files: [file] }) && navigator.share) {
      try {
        await navigator.share({
          title: "Expense Voucher",
          text: message,
          files: [file],
        });
        return;
      } catch (error) {
        if (error?.name === "AbortError") return;
      }
    }

    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    window.open(`https://wa.me/?text=${encodeURIComponent(`${message}\nJPG downloaded. Please attach it in WhatsApp.`)}`, "_blank");
  };

  return (
    <div style={pageStyle}>
      <div style={headerStyle}>
        <div>
          <h2 style={{ margin: 0, color: "#0f172a" }}>Expense Report</h2>
          <p style={{ margin: "6px 0 0", color: "#64748b", fontSize: "14px" }}>
            Expense report ke tick-based view kore dilam. Warehouse multi-select o ache.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={exportExcel} style={exportButtonStyle}>
            Export Excel
          </button>
          <PageBackCloseActions navigate={navigate} size="compact" />
        </div>
      </div>

      <div style={filterCardStyle}>
        <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={inputStyle} />
        <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={inputStyle} />
        <input
          type="text"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          placeholder="Search voucher / warehouse / party / paid by"
          style={{ ...inputStyle, minWidth: "320px" }}
        />
        <MultiSelectDropdown
          label="Warehouses"
          options={warehouses.map((item) => ({ value: String(item.id), label: item.name }))}
          value={warehouseIds}
          onChange={setWarehouseIds}
          placeholder="All Warehouses"
        />
        <div style={{ minWidth: 220, flex: "1 1 220px" }}>
          <div style={{ marginBottom: 6, fontSize: 12, fontWeight: 700, color: "#475569" }}>Month</div>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            style={inputStyle}
          />
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", width: "100%", alignItems: "flex-start" }}>
          <MultiSelectDropdown
            label="Party"
            options={partyOptions}
            value={selectedParties}
            onChange={setSelectedParties}
            placeholder="All Parties"
          />
          <div style={{ flex: "1 1 320px", minWidth: 320 }}>
            <ReportSectionToggles
              title="Show Report Sections"
              value={visibleSections}
              onChange={setVisibleSections}
              options={[{ key: "table", label: "Expense Table" }]}
            />
          </div>
        </div>
      </div>

      {visibleSections.includes("table") ? (
        <div style={tableCardStyle}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr>
                  <th style={thStyle}>Sl No</th>
                  <th style={thStyle}>Voucher</th>
                  <th style={thStyle}>Date</th>
                  <th style={thStyle}>Warehouse</th>
                  <th style={thStyle}>Employee</th>
                  <th style={thStyle}>Product</th>
                  <th style={thStyle}>Party</th>
                  <th style={thStyle}>Send To</th>
                  <th style={thStyle}>Reg Lorry</th>
                  <th style={thStyle}>Paid By</th>
                  <th style={thStyle}>Grand Total</th>
                  <th style={thStyle}>Total Collect</th>
                  <th style={thStyle}>Action</th>
                </tr>
              </thead>
              <tbody>
  {filteredExpenses.length > 0 ? (
    filteredExpenses.map((item, index) => (
      <tr
        key={item.id}
        style={{ background: index % 2 === 0 ? "#fff" : "#f8fafc" }}
      >
        <td style={tdStyle}>{index + 1}</td>
        <td style={tdStyle}>{item.voucher_no}</td>
        <td style={tdStyle}>{formatDisplayDate(item.expense_date)}</td>
        <td style={tdStyle}>{item.warehouse_name || "-"}</td>
        <td style={tdStyle}>{item.employee_name || "-"}</td>
        <td style={tdStyle}>{item.product_name || "-"}</td>
        <td style={tdStyle}>{item.company_name || "-"}</td>
        <td style={tdStyle}>{item.send_to_company_name || "-"}</td>
        <td style={tdStyle}>{item.reg_lorry_no || "-"}</td>
        <td style={tdStyle}>{item.paid_by || "-"}</td>

        <td style={{ ...tdStyle, textAlign: "right" }}>
          {Number(item.grand_total || 0).toFixed(2)}
        </td>

        <td
          style={{
            ...tdStyle,
            textAlign: "right",
            fontWeight: 700,
          }}
        >
          {formatMoney(getTotalCollectAmount(item))}
        </td>

        <td style={tdStyle}>
          <div style={actionButtonsStyle}>
            <button onClick={() => navigate(`/expenses?edit=${item.id}`)} style={editButtonStyle}>
              Edit
            </button>
            <button onClick={() => downloadVoucherPdf(item)} style={voucherPdfButtonStyle}>
              PDF
            </button>
            <button
              onClick={() => shareVoucherOnWhatsApp(item)}
              style={whatsAppButtonStyle}
              title="Share voucher JPG on WhatsApp"
            >
              WhatsApp
            </button>
          </div>
        </td>
      </tr>
    ))
  ) : (
    <tr>
      <td colSpan="13" style={{ ...tdStyle, textAlign: "center" }}>
        No expense report data found
      </td>
    </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}

const pageStyle = {
  padding: "20px",
  background: "#f8fafc",
  minHeight: "100vh",
  fontFamily: "Segoe UI, Arial, sans-serif",
};

const headerStyle = {
  background: "#fff",
  border: "1px solid #e2e8f0",
  borderRadius: "16px",
  boxShadow: "0 10px 24px rgba(15, 23, 42, 0.08)",
  padding: "18px 20px",
  marginBottom: "16px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "12px",
};

const filterCardStyle = {
  display: "flex",
  gap: "12px",
  flexWrap: "wrap",
  background: "#fff",
  border: "1px solid #e2e8f0",
  borderRadius: "16px",
  boxShadow: "0 10px 24px rgba(15, 23, 42, 0.08)",
  padding: "16px",
  marginBottom: "16px",
};

const tableCardStyle = {
  background: "#fff",
  border: "1px solid #e2e8f0",
  borderRadius: "16px",
  boxShadow: "0 10px 24px rgba(15, 23, 42, 0.08)",
  overflow: "hidden",
};

const inputStyle = {
  padding: "10px 12px",
  borderRadius: "10px",
  border: "1px solid #cbd5e1",
  fontSize: "14px",
  outline: "none",
};

const exportButtonStyle = {
  border: "none",
  background: "#0f766e",
  color: "#fff",
  borderRadius: "10px",
  padding: "10px 16px",
  cursor: "pointer",
  fontWeight: 700,
};

const actionButtonsStyle = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
};

const editButtonStyle = {
  border: "none",
  background: "#1d4ed8",
  color: "#fff",
  borderRadius: "8px",
  padding: "6px 12px",
  cursor: "pointer",
  fontWeight: 700,
  fontSize: "12px",
};

const voucherPdfButtonStyle = {
  border: "none",
  background: "#0f766e",
  color: "#fff",
  borderRadius: "8px",
  padding: "6px 12px",
  cursor: "pointer",
  fontWeight: 700,
  fontSize: "12px",
};

const whatsAppButtonStyle = {
  border: "none",
  background: "#16a34a",
  color: "#fff",
  borderRadius: "8px",
  padding: "6px 12px",
  cursor: "pointer",
  fontWeight: 700,
  fontSize: "12px",
};

const thStyle = {
  padding: "10px 10px",
  border: "1px solid #dbe4ea",
  background: "#0f766e",
  color: "#fff",
  textAlign: "left",
  whiteSpace: "nowrap",
};

const tdStyle = {
  padding: "9px 10px",
  border: "1px solid #e2e8f0",
};
