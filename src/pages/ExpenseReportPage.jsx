import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import MultiSelectDropdown from "../components/MultiSelectDropdown";
import ReportSectionToggles from "../components/ReportSectionToggles";
import { formatDisplayDate } from "../utils/date";
import { useNavigate } from "react-router-dom";
import PageBackCloseActions from "../components/PageBackCloseActions";

const VOUCHER_LINE_COUNT = 20;
const VOUCHER_HEADER_TITLE = "HANSARIA FOOD PVT LTD PAYMENT VOUCHER";

const escapeHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const printableText = (value, fallback = "N.A") => {
  const text = String(value ?? "").trim();
  return text ? text : fallback;
};

const formatMoney = (value) => {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount.toFixed(2) : "0.00";
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
          <td style="text-align:right">${Number(item.total_expense_amount || 0).toFixed(2)}</td>
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
                <th>Party</th><th>Send To</th><th>Reg Lorry</th><th>Paid By</th><th>Grand Total</th><th>Net Expense</th>
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

  const printVoucherPdf = (expense) => {
    if (!expense) return;
    const printWindow = window.open("", "_blank", "width=1100,height=780");
    if (!printWindow) return;

    const items = Array.isArray(expense.items) ? expense.items : [];
    const voucherTitle = VOUCHER_HEADER_TITLE;
    const fields = {
      workDescription: printableText(expense.work_description),
      voucherNo: printableText(expense.voucher_no),
      date: formatVoucherDate(expense.expense_date),
      product: printableText(expense.product_name),
      partyName: printableText(expense.company_name),
      partyCompanyNo: printableText(expense.company_account_name),
      rejectLorryNo: printableText(expense.new_lorry_no || expense.reg_lorry_no),
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
      totalExpense: formatMoney(expense.total_expense_amount),
    };

    const itemRows = Array.from({ length: VOUCHER_LINE_COUNT }, (_, index) => {
      const line = items[index] || {};
      const lineNo = Number.isFinite(Number(line.line_no)) ? Number(line.line_no) : index + 1;
      return `
        <tr>
          <td class="center">${lineNo}</td>
          <td>${escapeHtml(printableText(line.particular_name || "", ""))}</td>
          <td class="center">${escapeHtml(formatItemNumber(line.bags))}</td>
          <td class="center">${escapeHtml(formatItemNumber(line.rate))}</td>
          <td class="right">${escapeHtml(formatItemNumber(line.amount))}</td>
        </tr>`;
    }).join("");

    const html = `
      <html>
        <head>
          <meta charset="UTF-8" />
          <title>Expense Voucher ${escapeHtml(fields.voucherNo)}</title>
          <style>
            @page { size: A4 portrait; margin: 8mm; }
            body { margin: 0; font-family: "Segoe UI", Arial, sans-serif; color: #111827; }
            .voucher { width: 100%; border-collapse: collapse; table-layout: fixed; border: 1px solid #111827; font-size: 10.8px; }
            .voucher th, .voucher td { border: 1px solid #111827; padding: 5px 6px; vertical-align: top; }
            .title { text-align: center; font-size: 14px; font-weight: 700; letter-spacing: 0.2px; background: #f1f5f9; }
            .label { font-weight: 700; background: #f8fafc; white-space: nowrap; }
            .value { font-weight: 600; }
            .split-cell { padding: 0; }
            .left-grid, .items-grid { width: 100%; border-collapse: collapse; table-layout: fixed; }
            .left-grid th, .left-grid td, .items-grid th, .items-grid td { border: 1px solid #111827; padding: 4px 6px; font-size: 10.6px; }
            .left-grid th { width: 48%; text-align: left; background: #f8fafc; }
            .items-grid th { text-align: center; background: #f8fafc; font-weight: 700; }
            .items-grid td { height: 18px; }
            .center { text-align: center; }
            .right { text-align: right; }
            .summary-value { font-weight: 700; }
            .generated { margin-top: 8px; text-align: right; color: #475569; font-size: 10px; }
          </style>
        </head>
        <body>
          <table class="voucher">
            <tr>
              <th colspan="4" class="title">${escapeHtml(voucherTitle)}</th>
            </tr>
            <tr>
              <th class="label">WORK DESCRIPTION</th>
              <td colspan="3" class="value">${escapeHtml(fields.workDescription)}</td>
            </tr>
            <tr>
              <th class="label">VOUCHER NO.</th>
              <td class="value">${escapeHtml(fields.voucherNo)}</td>
              <th class="label">DATE</th>
              <td class="value">${escapeHtml(fields.date)}</td>
            </tr>
            <tr>
              <th class="label">PRODUCT</th>
              <td class="value">${escapeHtml(fields.product)}</td>
              <th class="label">PARTY NAME</th>
              <td class="value">${escapeHtml(fields.partyName)}</td>
            </tr>
            <tr>
              <th class="label">PARTY COMPANY NO.</th>
              <td class="value">${escapeHtml(fields.partyCompanyNo)}</td>
              <th class="label">REJECT LORRY NO.</th>
              <td class="value">${escapeHtml(fields.rejectLorryNo)}</td>
            </tr>
            <tr>
              <td colspan="2" class="split-cell">
                <table class="left-grid">
                  <tr><th>REG FROM</th><td>${escapeHtml(fields.regFrom)}</td></tr>
                  <tr><th>LOADING</th><td>${escapeHtml(fields.loading)}</td></tr>
                  <tr><th>UNLOADING</th><td>${escapeHtml(fields.unloading)}</td></tr>
                  <tr><th>BALANCE</th><td>${escapeHtml(fields.balance)}</td></tr>
                  <tr><th>NET WEIGHT</th><td>${escapeHtml(fields.netWeight)}</td></tr>
                  <tr><th>NEW LORRY NO.</th><td>${escapeHtml(fields.newLorryNo)}</td></tr>
                  <tr><th>NEW WEIGHT</th><td>${escapeHtml(fields.newWeight)}</td></tr>
                  <tr><th>SEND TO</th><td>${escapeHtml(fields.sendTo)}</td></tr>
                  <tr><th>A/C</th><td>${escapeHtml(fields.account)}</td></tr>
                  <tr><th>A/C PARTY COMPANY</th><td>${escapeHtml(fields.accountPartyCompany)}</td></tr>
                  <tr><th>PAID BY PARTY/DRIVER</th><td>${escapeHtml(fields.paidBy)}</td></tr>
                  <tr><th>PARTY/DRIVER MOBILE NO.</th><td>${escapeHtml(fields.partyDriverMobileNo)}</td></tr>
                  <tr><th>CHALLAN WEIGHT</th><td>${escapeHtml(fields.challanWeight)}</td></tr>
                  <tr><th>DRIVER SIGN</th><td>&nbsp;</td></tr>
                  <tr><th>MB NO.</th><td>${escapeHtml(fields.mbNo)}</td></tr>
                  <tr><th>REP. SIGN</th><td>&nbsp;</td></tr>
                </table>
              </td>
              <td colspan="2" class="split-cell">
                <table class="items-grid">
                  <thead>
                    <tr>
                      <th style="width: 12%;">#</th>
                      <th style="width: 48%;">Particulars</th>
                      <th style="width: 13%;">Bags</th>
                      <th style="width: 12%;">Rate</th>
                      <th style="width: 15%;">Amount</th>
                    </tr>
                  </thead>
                  <tbody>${itemRows}</tbody>
                </table>
              </td>
            </tr>
            <tr>
              <th class="label">RECEIVE CASH FROM PARTY</th>
              <td class="summary-value">Rs. ${escapeHtml(fields.receiveCashFromParty)}</td>
              <th class="label">GRAND TOTAL</th>
              <td class="summary-value">Rs. ${escapeHtml(fields.grandTotal)}</td>
            </tr>
            <tr>
              <th class="label">RECEIVE CASH FROM DRIVER</th>
              <td class="summary-value">Rs. ${escapeHtml(fields.receiveCashFromDriver)}</td>
              <th class="label">TOTAL EXPENSE AMOUNT</th>
              <td class="summary-value">Rs. ${escapeHtml(fields.totalExpense)}</td>
            </tr>
          </table>
          <div class="generated">Generated: ${escapeHtml(new Date().toLocaleString())}</div>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
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
                  <th style={thStyle}>Net Expense</th>
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
          {Number(item.total_expense_amount || 0).toFixed(2)}
        </td>

        <td style={tdStyle}>
          <div style={actionButtonsStyle}>
            <button onClick={() => navigate(`/expenses?edit=${item.id}`)} style={editButtonStyle}>
              Edit
            </button>
            <button onClick={() => printVoucherPdf(item)} style={voucherPdfButtonStyle}>
              PDF
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
