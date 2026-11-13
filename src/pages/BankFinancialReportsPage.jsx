import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate, useSearchParams } from "react-router-dom";
import PageBackCloseActions from "../components/PageBackCloseActions";

const API_BASE = "/api/bank-financial-reports";
const panel = { background: "#fff", border: "1px solid #dbe3ec", borderRadius: 10, padding: 16, boxShadow: "0 2px 8px rgba(15,23,42,.035)" };
const input = { width: "100%", boxSizing: "border-box", padding: "9px 10px", border: "1px solid #cbd5e1", borderRadius: 6, background: "#fff", color: "#0f172a", fontSize: 13 };
const label = { display: "block", color: "#475569", fontSize: 12, fontWeight: 700, marginBottom: 5 };
const primary = { border: 0, borderRadius: 7, padding: "9px 14px", color: "#fff", background: "#0f766e", fontWeight: 800, cursor: "pointer" };
const secondary = { border: "1px solid #cbd5e1", borderRadius: 7, padding: "9px 14px", color: "#334155", background: "#fff", fontWeight: 700, cursor: "pointer" };
const th = { position: "sticky", top: 0, zIndex: 1, background: "#17365d", color: "#fff", padding: "10px 9px", textAlign: "left", fontSize: 12, whiteSpace: "nowrap" };
const td = { padding: "9px", borderBottom: "1px solid #e8edf3", fontSize: 12, color: "#334155", verticalAlign: "middle" };
// Dedicated report styles: consistent column alignment, readable numbers and a
// restrained navy/teal visual hierarchy without changing report calculations.
const reportTableWrap = { overflowX: "auto", border: "1px solid #d7e2ee", borderRadius: 13, background: "#fff", boxShadow: "0 8px 22px rgba(15, 35, 65, .055)" };
const reportTable = { width: "100%", borderCollapse: "separate", borderSpacing: 0, tableLayout: "fixed" };
const reportHeadCell = { ...th, position: "static", padding: "13px 12px", background: "linear-gradient(115deg, #17365d 0%, #145b69 100%)", fontSize: 10, fontWeight: 800, letterSpacing: ".045em", textTransform: "uppercase", borderBottom: "1px solid #0f5260" };
const reportBodyCell = { ...td, padding: "12px 12px", fontSize: 12, lineHeight: 1.45, overflowWrap: "anywhere" };
const reportAmountCell = { ...reportBodyCell, textAlign: "right", whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums", fontFeatureSettings: '"tnum"' };
const reportTotalCell = { ...reportAmountCell, background: "#eaf3f8", color: "#123553", fontWeight: 900, borderTop: "2px solid #9db6c8", borderBottom: 0 };
const money = (value) => `₹${Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
// Use the voucher Receipt / Payment amount when present. Some bank exports only
// populate Statement Credit / Debit, so fall back to those columns for split entry.
const transactionEntrySide = (row = {}) => {
  if (Number(row.receipt_amount || 0) > 0) return "receipt";
  if (Number(row.payment_amount || 0) > 0) return "payment";
  if (Number(row.bank_credit || 0) > 0) return "receipt";
  if (Number(row.bank_debit || 0) > 0) return "payment";
  return "receipt";
};
const transactionEntryAmount = (row = {}) => {
  const side = transactionEntrySide(row);
  const explicitAmount = side === "receipt" ? Number(row.receipt_amount || 0) : Number(row.payment_amount || 0);
  if (explicitAmount > 0) return explicitAmount;
  return side === "receipt" ? Number(row.bank_credit || 0) : Number(row.bank_debit || 0);
};
const dateLabel = (value) => value ? new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" }) : "-";
const dateInputValue = (value) => value ? new Date(value).toISOString().slice(0, 10) : "";
const natureLabels = { asset: "Asset", liability: "Liability", equity: "Capital / Equity", income: "Income", expense: "Expense", other: "Other / Excluded" };
const placementLabels = { balance_sheet: "Balance Sheet", profit_loss: "Profit & Loss", exclude: "Exclude from Statements" };
const sourceLabels = { bank_statement: "Bank Statement Particulars", warehouse_sale: "Warehouse Sale Vouchers", warehouse_purchase: "Warehouse Purchase Vouchers" };
const initialGroup = { name: "", source_type: "bank_statement", nature: "expense", report_placement: "profit_loss", sort_order: "0" };
const initialSubGroup = { name: "", group_id: "", sort_order: "0" };
const initialQuickMapping = { particulars_name: "", ledger_name: "", group_id: "", subgroup_id: "", group_company: "", opening_balance: "0", opening_balance_type: "dr" };

// TallyPrime's 15 predefined primary groups and 13 predefined sub-groups.
// Selecting a primary group pre-fills its account nature and report placement.
const TALLY_PRIMARY_GROUPS = [
  { name: "Branch / Divisions", nature: "other", report_placement: "balance_sheet" },
  { name: "Capital Account", nature: "equity", report_placement: "balance_sheet" },
  { name: "Current Assets", nature: "asset", report_placement: "balance_sheet" },
  { name: "Current Liabilities", nature: "liability", report_placement: "balance_sheet" },
  { name: "Direct Expenses", nature: "expense", report_placement: "profit_loss" },
  { name: "Direct Incomes", nature: "income", report_placement: "profit_loss" },
  { name: "Fixed Assets", nature: "asset", report_placement: "balance_sheet" },
  { name: "Indirect Expenses", nature: "expense", report_placement: "profit_loss" },
  { name: "Indirect Incomes", nature: "income", report_placement: "profit_loss" },
  { name: "Investments", nature: "asset", report_placement: "balance_sheet" },
  { name: "Loans (Liability)", nature: "liability", report_placement: "balance_sheet" },
  { name: "Misc. Expenses (ASSET)", nature: "asset", report_placement: "balance_sheet" },
  { name: "Purchase Accounts", nature: "expense", report_placement: "profit_loss" },
  { name: "Sales Accounts", nature: "income", report_placement: "profit_loss" },
  { name: "Suspense A/c", nature: "other", report_placement: "balance_sheet" },
];
const TALLY_SUBGROUPS_BY_PARENT = {
  "Capital Account": ["Reserves & Surplus"],
  "Current Assets": ["Bank Accounts", "Cash-in-hand", "Deposits (Asset)", "Loans & Advances (Asset)", "Stock-in-hand", "Sundry Debtors"],
  "Current Liabilities": ["Duties & Taxes", "Provisions", "Sundry Creditors"],
  "Loans (Liability)": ["Bank OD A/c", "Secured Loans", "Unsecured Loans"],
};
// Common user-created sub-groups are suggestions only; they are not Tally's
// 13 predefined sub-groups. Users may also enter any custom sub-group name.
const CUSTOM_SUBGROUP_SUGGESTIONS = {
  "Current Assets": ["Staff Advances", "Supplier Advances", "Inter-company Receivable", "Security Deposits", "GST Input / Receivable"],
  "Fixed Assets": ["Plant & Machinery", "Furniture & Fixtures", "Vehicles", "Computers & Equipment", "Office Equipment"],
  "Current Liabilities": ["Outstanding Expenses", "Customer Advances", "GST Payable", "Statutory Liabilities"],
  "Loans (Liability)": ["Vehicle Loans", "Business Loans", "Loan from Sister Company"],
  "Capital Account": ["Owner Capital", "Drawings", "Retained Earnings"],
  "Direct Incomes": ["Sales Income", "Service Income", "Other Direct Income"],
  "Indirect Incomes": ["Bank Interest", "Discount Received", "Other Income"],
  "Direct Expenses": ["Transport Expenses", "Freight & Loading", "Labour Charges", "Job Work Charges", "Factory Expenses", "Power & Fuel"],
  "Indirect Expenses": ["Salary Expenses", "Office Rent", "Electricity Expenses", "Bank Charges", "Office Expenses", "Repair & Maintenance"],
  "Purchase Accounts": ["Raw Material Purchase", "Packing Material Purchase", "Other Purchases"],
  "Sales Accounts": ["Product Sales", "Other Sales"],
  "Suspense A/c": ["Temporary Adjustment", "Unidentified Bank Entries"],
  "Branch / Divisions": ["Inter-branch Balance"],
  "Investments": ["Investment in Sister Company", "Fixed Deposits"],
  "Misc. Expenses (ASSET)": ["Preliminary Expenses", "Deferred Expenses"],
};
const displayOrderOptions = Array.from({ length: 21 }, (_, index) => String(index));

const tabs = [
  ["import", "Bank Statement Import"],
  ["importhistory", "Import History"],
  ["groups", "Group Master"],
  ["subgroups", "Sub-group Master"],
  ["mapping", "Particulars Mapping"],
  ["statement", "Bank Statement"],
  ["groupwise", "Group-wise Report"],
  ["groupcompany", "Group Company Report"],
  ["profitloss", "Profit & Loss"],
  ["balancesheet", "Balance Sheet"],
  ["bankbalance", "Bank Balance / Opening & Closing"],
];

function TallyAutocompleteField({
  value = "",
  options = [],
  onSelect,
  onInput,
  placeholder = "Type to search...",
  order,
  formName = "quick-ledger",
  disabled = false,
  allowCustom = false,
  allowEmpty = false,
}) {
  const [query, setQuery] = useState(value || "");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  useEffect(() => {
    setQuery(value || "");
  }, [value]);

  const filteredOptions = useMemo(() => {
    const q = String(query || "").trim().toLowerCase();
    const normalized = (options || []).map((option) => (
      typeof option === "string"
        ? { label: option, value: option }
        : { label: String(option?.label ?? ""), value: option?.value }
    )).filter((option) => option.label);
    return normalized
      .filter((option) => !q || option.label.toLowerCase().includes(q))
      .sort((a, b) => {
        if (!q) return a.label.localeCompare(b.label);
        const aName = a.label.toLowerCase();
        const bName = b.label.toLowerCase();
        if (aName === q && bName !== q) return -1;
        if (bName === q && aName !== q) return 1;
        const aStarts = aName.startsWith(q);
        const bStarts = bName.startsWith(q);
        if (aStarts !== bStarts) return aStarts ? -1 : 1;
        return a.label.localeCompare(b.label);
      })
      .slice(0, 12);
  }, [options, query]);

  const focusNext = () => {
    window.setTimeout(() => {
      const form = document.querySelector(`[data-tally-form="${formName}"]`);
      const next = form?.querySelector(`[data-tally-order="${Number(order) + 1}"]`);
      if (next && !next.disabled) next.focus();
      else form?.requestSubmit();
    }, 0);
  };

  const commitOption = (option) => {
    setQuery(option.label);
    setOpen(false);
    setActiveIndex(-1);
    onSelect?.(option);
    focusNext();
  };

  const commitTypedValue = () => {
    const typed = String(query || "").trim();
    if (!typed && !allowEmpty) return;
    if (filteredOptions.length) {
      commitOption(filteredOptions[Math.max(0, Math.min(activeIndex, filteredOptions.length - 1))]);
      return;
    }
    if (allowCustom || allowEmpty) {
      const custom = { label: typed, value: typed };
      setOpen(false);
      onSelect?.(custom);
      focusNext();
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === "ArrowDown" && filteredOptions.length) {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((current) => Math.min(current + 1, filteredOptions.length - 1));
      return;
    }
    if (event.key === "ArrowUp" && filteredOptions.length) {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((current) => Math.max(current - 1, 0));
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      commitTypedValue();
    }
    if (event.key === "Escape") setOpen(false);
  };

  return (
    <div style={{ position: "relative", width: "100%" }}>
      <input
        data-tally-order={order}
        value={query}
        disabled={disabled}
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 140)}
        onChange={(event) => {
          const next = event.target.value;
          setQuery(next);
          setActiveIndex(-1);
          setOpen(true);
          onInput?.(next);
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoComplete="off"
        style={{ ...input, marginTop: 4 }}
      />
      {open && !disabled && filteredOptions.length > 0 && (
        <div style={{ position: "absolute", top: "calc(100% + 2px)", left: 0, right: 0, zIndex: 50, maxHeight: 230, overflowY: "auto", background: "#fff", border: "1px solid #94a3b8", borderRadius: 7, boxShadow: "0 9px 24px rgba(15,23,42,.16)" }}>
          {filteredOptions.map((option, index) => (
            <button
              type="button"
              key={`${option.label}-${index}`}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => commitOption(option)}
              style={{ display: "block", width: "100%", textAlign: "left", padding: "9px 10px", border: 0, borderBottom: "1px solid #eef2f7", background: index === activeIndex ? "#ccfbf1" : "#fff", color: "#0f172a", cursor: "pointer", fontSize: 13 }}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
      {open && !disabled && query.trim() && filteredOptions.length === 0 && !allowCustom && !allowEmpty && (
        <div style={{ position: "absolute", top: "calc(100% + 2px)", left: 0, right: 0, zIndex: 50, padding: 9, background: "#fff", border: "1px solid #cbd5e1", borderRadius: 7, color: "#64748b", fontSize: 12 }}>
          No matching name. Create it in the relevant Master first.
        </div>
      )}
    </div>
  );
}

export default function BankFinancialReportsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTab] = useState(searchParams.get("tab") || "import");
  const [groups, setGroups] = useState([]);
  const [subgroups, setSubgroups] = useState([]);
  const [mappings, setMappings] = useState([]);
  const [summary, setSummary] = useState({ total_transactions: 0, total_receipts: 0, total_payments: 0, mapped_particulars: 0, unmapped_particulars: 0, bank_names: [] });
  const [transactions, setTransactions] = useState([]);
  const [groupReport, setGroupReport] = useState([]);
  const [profitLoss, setProfitLoss] = useState({ income: 0, expense: 0, net_profit: 0, rows: [] });
  const [balanceSheet, setBalanceSheet] = useState({ total_assets: 0, total_liabilities: 0, total_equity: 0, liabilities_plus_equity: 0, difference: 0, rows: [] });
  const [groupCompanyReport, setGroupCompanyReport] = useState([]);
  const [bankOpeningBalances, setBankOpeningBalances] = useState([]);
  const [bankOpeningForm, setBankOpeningForm] = useState({ bank_name: "", effective_date: "", opening_balance: "", opening_balance_type: "dr", notes: "" });
  const [bankBalanceReport, setBankBalanceReport] = useState({ totals: {}, rows: [], summary_rows: [], details: [], opening_balance_missing_banks: [] });
  const [bankBalanceViewMode, setBankBalanceViewMode] = useState("summary");
  const [selectedSubgroupSummary, setSelectedSubgroupSummary] = useState(null);
  const [expandedBankDetailRows, setExpandedBankDetailRows] = useState({});
  const [quickMappingForm, setQuickMappingForm] = useState(initialQuickMapping);
  const [quickGroupQuery, setQuickGroupQuery] = useState("");
  const [quickSubgroupQuery, setQuickSubgroupQuery] = useState("");
  // Manual ledger masters are independent of imported bank statement rows.
  const [manualLedgerForm, setManualLedgerForm] = useState({ ledger_name: "", group_id: "", subgroup_id: "", group_company: "", opening_balance: "0", opening_balance_type: "dr" });
  const [manualGroupQuery, setManualGroupQuery] = useState("");
  const [manualSubgroupQuery, setManualSubgroupQuery] = useState("");
  const [groupForm, setGroupForm] = useState(initialGroup);
  const [subGroupForm, setSubGroupForm] = useState(initialSubGroup);
  const [customGroupName, setCustomGroupName] = useState("");
  const [customSubGroupName, setCustomSubGroupName] = useState("");
  const [file, setFile] = useState(null);
  const [importResult, setImportResult] = useState(null);
  const [mappingSearch, setMappingSearch] = useState("");
  const [imports, setImports] = useState([]);
  const [bulkBankNames, setBulkBankNames] = useState({});
  const [bulkBankUpdatingBatch, setBulkBankUpdatingBatch] = useState("");
  const [editingGroupId, setEditingGroupId] = useState("");
  const [editingSubGroupId, setEditingSubGroupId] = useState("");
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [transactionEditForm, setTransactionEditForm] = useState(null);
  const [filters, setFilters] = useState({ from_date: "", to_date: "", bank_name: "", voucher_type: "", import_batch_id: "", group_company: "", group_id: "", subgroup_id: "", period_type: "range" });
  const [appliedFilters, setAppliedFilters] = useState({ from_date: "", to_date: "", bank_name: "", voucher_type: "", import_batch_id: "", group_company: "", group_id: "", subgroup_id: "", period_type: "range" });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const next = searchParams.get("tab") || "import";
    if (tabs.some(([key]) => key === next)) setTab(next);
  }, [searchParams]);

  const params = useMemo(() => Object.fromEntries(Object.entries(appliedFilters).filter(([, value]) => value !== "")), [appliedFilters]);
  const bankBalanceDetailTotals = useMemo(() => (bankBalanceReport.details || []).reduce((totals, row) => ({
    receipts: totals.receipts + Number(row.receipt_amount || 0),
    payments: totals.payments + Number(row.payment_amount || 0),
  }), { receipts: 0, payments: 0 }), [bankBalanceReport.details]);
  const bankBalanceDetailsBySummary = useMemo(() => {
    const grouped = {};
    (bankBalanceReport.details || []).forEach((row) => {
      const key = String(row.summary_key || "");
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(row);
    });
    return grouped;
  }, [bankBalanceReport.details]);

  const loadMasters = useCallback(async () => {
    const [groupRes, subRes, mappingRes, summaryRes, importRes, bankOpeningRes] = await Promise.all([
      axios.get(`${API_BASE}/groups`),
      axios.get(`${API_BASE}/subgroups`),
      axios.get(`${API_BASE}/ledger-mappings`),
      axios.get(`${API_BASE}/summary`),
      axios.get(`${API_BASE}/import-batches`),
      axios.get(`${API_BASE}/bank-opening-balances`),
    ]);
    setGroups(Array.isArray(groupRes.data) ? groupRes.data : []);
    setSubgroups(Array.isArray(subRes.data) ? subRes.data : []);
    setMappings(Array.isArray(mappingRes.data) ? mappingRes.data : []);
    setSummary(summaryRes.data || {});
    setImports(Array.isArray(importRes.data) ? importRes.data : []);
    setBankOpeningBalances(Array.isArray(bankOpeningRes.data) ? bankOpeningRes.data : []);
  }, []);

  const loadCurrentReport = useCallback(async (selectedTab = tab, filterParams = params) => {
    if (selectedTab === "statement") {
      const res = await axios.get(`${API_BASE}/transactions`, { params: { ...filterParams, limit: 1000 } });
      setTransactions(Array.isArray(res.data) ? res.data : []);
    } else if (selectedTab === "groupwise") {
      const reportFilters = { ...filterParams }; delete reportFilters.import_batch_id;
      const res = await axios.get(`${API_BASE}/reports/groupwise`, { params: reportFilters });
      setGroupReport(Array.isArray(res.data) ? res.data : []);
    } else if (selectedTab === "groupcompany") {
      const reportFilters = { ...filterParams }; delete reportFilters.import_batch_id;
      const res = await axios.get(`${API_BASE}/reports/group-company`, { params: reportFilters });
      setGroupCompanyReport(Array.isArray(res.data) ? res.data : []);
    } else if (selectedTab === "profitloss") {
      const reportFilters = { ...filterParams }; delete reportFilters.import_batch_id;
      const res = await axios.get(`${API_BASE}/reports/profit-loss`, { params: reportFilters });
      setProfitLoss(res.data || { income: 0, expense: 0, net_profit: 0, rows: [] });
    } else if (selectedTab === "balancesheet") {
      const reportFilters = { ...filterParams }; delete reportFilters.import_batch_id; delete reportFilters.period_type;
      const res = await axios.get(`${API_BASE}/reports/balance-sheet`, { params: reportFilters });
      setBalanceSheet(res.data || { total_assets: 0, total_liabilities: 0, total_equity: 0, liabilities_plus_equity: 0, difference: 0, rows: [] });
    } else if (selectedTab === "bankbalance") {
      const res = await axios.get(`${API_BASE}/reports/bank-balance`, { params: filterParams });
      setBankBalanceReport(res.data || { totals: {}, rows: [], details: [], opening_balance_missing_banks: [] });
    }
  }, [tab, params]);

  const refreshAll = useCallback(async (selectedTab = tab) => {
    setLoading(true); setError("");
    try {
      await loadMasters();
      await loadCurrentReport(selectedTab);
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Could not load Bank & Financial Reports.");
    } finally { setLoading(false); }
  }, [loadMasters, loadCurrentReport, tab]);

  useEffect(() => { refreshAll(tab); }, [tab, params]);

  const selectTab = (key) => {
    setTab(key);
    setSearchParams({ tab: key });
    setError(""); setNotice("");
  };

  const updateImportedBatchBankName = async (batch) => {
    const batchId = String(batch?.batch_id || "").trim();
    const bankName = String(bulkBankNames[batchId] ?? (batch?.bank_names?.length === 1 ? batch.bank_names[0] : "") ?? "").trim();
    if (!batchId) { setError("This import record has no batch ID, so it cannot be bulk updated."); return; }
    if (!bankName) { setError("Please enter or select the Bank Name to apply to this imported statement."); return; }
    const rowCount = Number(batch.total_rows || 0);
    const approved = window.confirm(`Update Bank Name to "${bankName}" for all ${rowCount} rows in "${batch.file_name}"?\n\nDates, amounts, ledger mappings, split allocations and bank balances will remain unchanged.`);
    if (!approved) return;

    setBulkBankUpdatingBatch(batchId); setError(""); setNotice("");
    try {
      const response = await axios.patch(`${API_BASE}/import-batches/${encodeURIComponent(batchId)}/bank-name`, { bank_name: bankName });
      await loadMasters();
      if (tab === "statement" && appliedFilters.import_batch_id === batchId) {
        await loadCurrentReport("statement", params);
      }
      setNotice(response.data?.message || `Bank Name updated for ${rowCount} rows.`);
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Could not bulk update Bank Name.");
    } finally {
      setBulkBankUpdatingBatch("");
    }
  };

  const createGroup = async (event) => {
    event.preventDefault(); setSaving(true); setError(""); setNotice("");
    try {
      const resolvedGroupName = groupForm.name === "__custom__" ? customGroupName.trim() : groupForm.name.trim();
      if (!resolvedGroupName) throw new Error("Please select a Tally Group or enter a custom Group Name.");
      const payload = { ...groupForm, name: resolvedGroupName, sort_order: Number(groupForm.sort_order || 0) };
      if (editingGroupId) await axios.put(`${API_BASE}/groups/${editingGroupId}`, payload);
      else await axios.post(`${API_BASE}/groups`, payload);
      setGroupForm(initialGroup); setCustomGroupName(""); setEditingGroupId(""); await loadMasters(); setNotice(editingGroupId ? "Group Master updated successfully." : "Group Master saved successfully.");
    } catch (err) { setError(err.response?.data?.error || err.message); }
    finally { setSaving(false); }
  };

  const createSubGroup = async (event) => {
    event.preventDefault(); setSaving(true); setError(""); setNotice("");
    try {
      const resolvedSubGroupName = subGroupForm.name === "__custom__" ? customSubGroupName.trim() : subGroupForm.name.trim();
      if (!resolvedSubGroupName) throw new Error("Please select a Tally Sub-group or enter a custom Sub-group Name.");
      const payload = { ...subGroupForm, name: resolvedSubGroupName, sort_order: Number(subGroupForm.sort_order || 0) };
      if (editingSubGroupId) await axios.put(`${API_BASE}/subgroups/${editingSubGroupId}`, payload);
      else await axios.post(`${API_BASE}/subgroups`, payload);
      setSubGroupForm(initialSubGroup); setCustomSubGroupName(""); setEditingSubGroupId(""); await loadMasters(); setNotice(editingSubGroupId ? "Sub-group Master updated successfully." : "Sub-group Master saved successfully.");
    } catch (err) { setError(err.response?.data?.error || err.message); }
    finally { setSaving(false); }
  };

  const uploadStatement = async (event) => {
    event.preventDefault();
    if (!file) { setError("Please select an .xls or .xlsx Bank Statement file."); return; }
    setSaving(true); setError(""); setNotice(""); setImportResult(null);
    try {
      const form = new FormData(); form.append("file", file);
      const response = await axios.post(`${API_BASE}/import`, form, { headers: { "Content-Type": "multipart/form-data" } });
      setImportResult(response.data || null);
      setFile(null);
      await loadMasters();
      setNotice(`Bank Statement imported. Excel Ledger Name used on ${response.data?.excel_ledger_names || 0} rows and Group Company used on ${response.data?.excel_group_companies || 0} rows. ${response.data?.auto_mapped_rows || 0} rows also used saved Group / Sub-group mappings.`);
    } catch (err) { setError(err.response?.data?.error || err.message || "Bank Statement import failed."); }
    finally { setSaving(false); }
  };

  const startEditGroup = (row) => {
    const isTallyPrimary = TALLY_PRIMARY_GROUPS.some((item) => item.name === row.name);
    setEditingGroupId(String(row._id || row.id));
    setCustomGroupName(isTallyPrimary ? "" : (row.name || ""));
    setGroupForm({ name: isTallyPrimary ? row.name : "__custom__", source_type: row.source_type || "bank_statement", nature: row.nature || "expense", report_placement: row.report_placement || "profit_loss", sort_order: String(row.sort_order ?? 0) });
    selectTab("groups");
  };

  const startEditSubGroup = (row) => {
    const parent = groups.find((g) => String(g._id || g.id) === String(row.group_id || ""));
    const defaults = [...(TALLY_SUBGROUPS_BY_PARENT[parent?.name] || []), ...(CUSTOM_SUBGROUP_SUGGESTIONS[parent?.name] || [])];
    const existing = subgroups.filter((item) => String(item.group_id) === String(row.group_id)).map((item) => item.name);
    const isSuggested = [...defaults, ...existing].includes(row.name);
    setEditingSubGroupId(String(row._id || row.id));
    setCustomSubGroupName(isSuggested ? "" : (row.name || ""));
    setSubGroupForm({ name: isSuggested ? row.name : "__custom__", group_id: String(row.group_id || ""), sort_order: String(row.sort_order ?? 0) });
    selectTab("subgroups");
  };

  const cancelGroupEdit = () => { setEditingGroupId(""); setGroupForm(initialGroup); setCustomGroupName(""); };
  const cancelSubGroupEdit = () => { setEditingSubGroupId(""); setSubGroupForm(initialSubGroup); setCustomSubGroupName(""); };

  const openTransactionEdit = (row) => {
    setEditingTransaction(row);
    setTransactionEditForm({
      bank_date: dateInputValue(row.bank_date), bank_name: row.bank_name || "", bank_remarks: row.bank_remarks || "",
      bank_time: row.bank_time || "", instrument_type: row.instrument_type || "", instrument_no: row.instrument_no || "", transaction_id: row.transaction_id || "",
      bank_debit: String(row.bank_debit ?? 0), bank_credit: String(row.bank_credit ?? 0), bank_balance: String(row.bank_balance ?? 0),
      bank_status: row.bank_status || "", tally_date: dateInputValue(row.tally_date), particulars_name: row.particulars_name || "",
      voucher_type: row.voucher_type || "", voucher_number: row.voucher_number || "",
      receipt_amount: String(row.receipt_amount ?? 0), payment_amount: String(row.payment_amount ?? 0),
      allocations: (Array.isArray(row.split_allocations) ? row.split_allocations : []).map((item) => ({
        ledger_name: item.ledger_name || "", group_id: item.group_id || "", subgroup_id: item.subgroup_id || "",
        group_company: item.group_company || "", amount: String(item.amount ?? 0), side: item.side || transactionEntrySide(row),
      })),
    });
  };

  const updateTransactionAllocation = (index, changes) => {
    setTransactionEditForm((previous) => ({
      ...previous,
      allocations: (previous.allocations || []).map((item, itemIndex) => itemIndex === index ? { ...item, ...changes } : item),
    }));
  };

  // When a split Ledger Name matches a saved Particulars / Ledger mapping,
  // reuse its Group, Sub-group and Group Company automatically.
  const applySavedMappingToAllocation = (index, ledgerName) => {
    const normalized = String(ledgerName || "").trim().toLowerCase();
    const match = normalized
      ? mappings.find((row) => String(row.ledger_name || "").trim().toLowerCase() === normalized)
        || mappings.find((row) => String(row.particulars_name || "").trim().toLowerCase() === normalized)
      : null;

    updateTransactionAllocation(index, {
      ledger_name: ledgerName,
      group_id: match?.group_id || "",
      subgroup_id: match?.subgroup_id || "",
      group_company: match?.group_company || "",
    });
  };

  const addTransactionAllocation = () => {
    setTransactionEditForm((previous) => {
      const allocations = previous.allocations || [];
      const total = allocations.reduce((sum, item) => sum + Number(item.amount || 0), 0);
      const bankAmount = transactionEntryAmount(previous);
      const remaining = Math.max(0, bankAmount - total);
      return {
        ...previous,
        allocations: [...allocations, {
          ledger_name: editingTransaction?.ledger_name || editingTransaction?.particulars_name || "",
          group_id: editingTransaction?.mapping?.group_id || "",
          subgroup_id: editingTransaction?.mapping?.subgroup_id || "",
          group_company: editingTransaction?.mapping?.group_company || "",
          amount: String(Number(remaining.toFixed(2))),
          side: transactionEntrySide(previous),
        }],
      };
    });
  };

  const removeTransactionAllocation = (index) => {
    setTransactionEditForm((previous) => ({
      ...previous,
      allocations: (previous.allocations || []).filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const saveTransactionEdit = async (event) => {
    event.preventDefault();
    if (!editingTransaction || !transactionEditForm) return;
    setSaving(true); setError(""); setNotice("");
    try {
      const allocations = transactionEditForm.allocations || [];
      if (allocations.length) {
        const bankAmount = transactionEntryAmount(transactionEditForm);
        const allocatedTotal = allocations.reduce((sum, item) => sum + Number(item.amount || 0), 0);
        if (allocations.some((item) => !String(item.ledger_name || "").trim() || !item.group_id || Number(item.amount || 0) <= 0)) {
          throw new Error("Every split row needs a Ledger Name, Group and an amount greater than zero.");
        }
        if (Math.abs(allocatedTotal - bankAmount) > 0.01) {
          throw new Error(`Split total ${money(allocatedTotal)} must equal the Bank Statement amount ${money(bankAmount)}.`);
        }
      }
      await axios.put(`${API_BASE}/transactions/${editingTransaction._id || editingTransaction.id}`, transactionEditForm);
      setEditingTransaction(null); setTransactionEditForm(null);
      await loadMasters(); await loadCurrentReport("statement", params);
      setNotice("Bank Statement row updated successfully. Saved Particulars mapping remains unchanged.");
    } catch (err) { setError(err.response?.data?.error || err.message || "Could not update Bank Statement row."); }
    finally { setSaving(false); }
  };

  const updateMappingDraft = (normalizedName, changes) => {
    setMappings((previous) => previous.map((row) => row.normalized_name === normalizedName ? { ...row, ...changes } : row));
  };

  const saveMapping = async (row) => {
    setSaving(true); setError(""); setNotice("");
    try {
      await axios.post(`${API_BASE}/ledger-mappings`, {
        particulars_name: row.particulars_name,
        ledger_name: row.ledger_name || row.particulars_name,
        group_id: row.group_id,
        subgroup_id: row.subgroup_id,
        group_company: row.group_company || "",
        opening_balance: row.opening_balance,
        opening_balance_type: row.opening_balance_type,
      });
      await loadMasters(); setNotice(`Mapping saved: ${row.particulars_name}`);
    } catch (err) { setError(err.response?.data?.error || err.message); }
    finally { setSaving(false); }
  };

  const companyGroupOptions = useMemo(() => {
    const values = ["Group Company", "HFPL Group Company", "Retails Group Company", ...mappings.map((row) => row.group_company || "")];
    return [...new Set(values.map((value) => String(value || "").trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  }, [mappings]);

  const quickLedgerOptions = useMemo(() => mappings.map((row) => ({
    label: row.particulars_name,
    value: row.particulars_name,
  })), [mappings]);

  const splitLedgerOptions = useMemo(() => {
    const names = mappings.flatMap((row) => [row.ledger_name, row.particulars_name]);
    return [...new Set(names.map((name) => String(name || "").trim()).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b));
  }, [mappings]);

  const bankGroupOptions = useMemo(() => groups
    .filter((group) => !group.source_type || group.source_type === "bank_statement")
    .map((group) => ({ label: group.name, value: group._id })), [groups]);

    const quickSubgroupOptions = useMemo(() => subgroups
    .filter((subgroup) => String(subgroup.group_id) === String(quickMappingForm.group_id))
    .map((subgroup) => ({ label: subgroup.name, value: subgroup._id })), [subgroups, quickMappingForm.group_id]);

  const manualSubgroupOptions = useMemo(() => subgroups
    .filter((subgroup) => String(subgroup.group_id) === String(manualLedgerForm.group_id))
    .map((subgroup) => ({ label: subgroup.name, value: subgroup._id })), [subgroups, manualLedgerForm.group_id]);

  const chooseQuickLedger = (name) => {
    const match = mappings.find((row) => String(row.particulars_name || "").trim().toLowerCase() === String(name || "").trim().toLowerCase());
    setQuickMappingForm(match ? {
      particulars_name: match.particulars_name,
      ledger_name: match.ledger_name || match.particulars_name,
      group_id: match.group_id || "",
      subgroup_id: match.subgroup_id || "",
      group_company: match.group_company || "",
      opening_balance: String(match.opening_balance ?? 0),
      opening_balance_type: match.opening_balance_type || "dr",
    } : { ...initialQuickMapping, particulars_name: name, ledger_name: name });
    setQuickGroupQuery(match ? (groups.find((group) => String(group._id) === String(match.group_id))?.name || "") : "");
    setQuickSubgroupQuery(match ? (subgroups.find((subgroup) => String(subgroup._id) === String(match.subgroup_id))?.name || "") : "");
  };

  const moveQuickLedgerFocus = (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    const target = event.currentTarget;
    const form = target.closest('[data-tally-form="quick-ledger"]');
    if (!form) return;
    const fields = [...form.querySelectorAll('[data-tally-order]')].filter((field) => !field.disabled);
    const index = fields.indexOf(target);
    if (index >= 0 && index < fields.length - 1) fields[index + 1].focus();
    else form.requestSubmit();
  };

  // Keep Enter-based keyboard navigation working in the Particulars Mapping grid.
  // This handler was referenced by the grid inputs but was missing, causing the
  // entire React page to crash during render.
  const handleMappingGridKeyDown = (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    const current = event.currentTarget;
    const row = current.closest("tr");
    const tableBody = row?.parentElement;
    if (!row || !tableBody) return;
    const cells = [...row.querySelectorAll("[data-ledger-cell]")]
      .filter((field) => !field.disabled);
    const currentIndex = cells.indexOf(current);
    const nextInRow = currentIndex >= 0 ? cells[currentIndex + 1] : null;
    if (nextInRow) {
      nextInRow.focus();
      return;
    }
    let nextRow = row.nextElementSibling;
    while (nextRow) {
      const nextCell = [...nextRow.querySelectorAll("[data-ledger-cell]")]
        .find((field) => !field.disabled);
      if (nextCell) {
        nextCell.focus();
        return;
      }
      nextRow = nextRow.nextElementSibling;
    }
  };

  const saveQuickLedgerMapping = async (event) => {
    event.preventDefault(); setSaving(true); setError(""); setNotice("");
    try {
      const payload = { ...quickMappingForm, particulars_name: quickMappingForm.particulars_name.trim(), opening_balance: Number(quickMappingForm.opening_balance || 0) };
      if (!payload.particulars_name) throw new Error("Please type or select a Particulars / Ledger name.");
      if (!payload.group_id) throw new Error("Please select a Tally Group.");
      await axios.post(`${API_BASE}/ledger-mappings`, payload);
      setQuickMappingForm(initialQuickMapping); setQuickGroupQuery(""); setQuickSubgroupQuery("");
      await loadMasters();
      setNotice(`Ledger mapping saved: ${payload.particulars_name}. Future bank statement imports will reuse this mapping automatically.`);
    } catch (err) { setError(err.response?.data?.error || err.message || "Could not save ledger mapping."); }
    finally { setSaving(false); }
  };

  const moveManualLedgerFocus = (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    const form = event.currentTarget.closest('[data-tally-form="manual-ledger"]');
    if (!form) return;
    const fields = [...form.querySelectorAll('[data-tally-order]')].filter((field) => !field.disabled);
    const index = fields.indexOf(event.currentTarget);
    if (index >= 0 && index < fields.length - 1) fields[index + 1].focus();
    else form.requestSubmit();
  };

  const saveManualLedger = async (event) => {
    event.preventDefault(); setSaving(true); setError(""); setNotice("");
    try {
      const ledgerName = String(manualLedgerForm.ledger_name || "").trim();
      if (!ledgerName) throw new Error("Please enter a Ledger Name.");
      if (!manualLedgerForm.group_id) throw new Error("Please select a Tally Group.");
      const alreadyExists = mappings.some((row) => String(row.particulars_name || "").trim().toLowerCase() === ledgerName.toLowerCase());
      if (alreadyExists) throw new Error("This Ledger / Particulars name already exists. Please update its existing mapping in the table instead of creating a duplicate.");
      const payload = {
        particulars_name: ledgerName,
        ledger_name: ledgerName,
        group_id: manualLedgerForm.group_id,
        subgroup_id: manualLedgerForm.subgroup_id || "",
        group_company: String(manualLedgerForm.group_company || "").trim(),
        opening_balance: Number(manualLedgerForm.opening_balance || 0),
        opening_balance_type: manualLedgerForm.opening_balance_type || "dr",
      };
      await axios.post(`${API_BASE}/ledger-mappings`, payload);
      setManualLedgerForm({ ledger_name: "", group_id: "", subgroup_id: "", group_company: "", opening_balance: "0", opening_balance_type: "dr" });
      setManualGroupQuery(""); setManualSubgroupQuery("");
      await loadMasters();
      setNotice(`Manual Ledger created: ${ledgerName}. It is saved without a Bank Statement import. A future statement Particulars with the same name can reuse this mapping.`);
    } catch (err) { setError(err.response?.data?.error || err.message || "Could not create manual ledger."); }
    finally { setSaving(false); }
  };

  const saveBankOpeningBalance = async (event) => {
    event.preventDefault(); setSaving(true); setError(""); setNotice("");
    try {
      const payload = { ...bankOpeningForm, bank_name: String(bankOpeningForm.bank_name || "").trim(), opening_balance: Number(bankOpeningForm.opening_balance || 0) };
      if (!payload.bank_name) throw new Error("Please enter or select a Bank Name.");
      if (!payload.effective_date) throw new Error("Please select the Opening Balance Date.");
      if (!Number.isFinite(payload.opening_balance) || payload.opening_balance < 0) throw new Error("Opening Balance must be zero or more. Use Dr / Cr to select the balance side.");
      await axios.post(`${API_BASE}/bank-opening-balances`, payload);
      await loadMasters();
      await loadCurrentReport("bankbalance", params);
      setNotice(`Bank Opening Balance saved: ${payload.bank_name}. Reports will calculate opening and closing balances from this date.`);
    } catch (err) { setError(err.response?.data?.error || err.message || "Could not save Bank Opening Balance."); }
    finally { setSaving(false); }
  };

  const editBankOpeningBalance = (row) => setBankOpeningForm({
    bank_name: row.bank_name || "", effective_date: dateInputValue(row.effective_date),
    opening_balance: String(row.opening_balance ?? 0), opening_balance_type: row.opening_balance_type || "dr", notes: row.notes || "",
  });

  const deleteBankOpeningBalance = async (row) => {
    if (!window.confirm(`Remove the opening balance for ${row.bank_name}?`)) return;
    setSaving(true); setError(""); setNotice("");
    try {
      await axios.delete(`${API_BASE}/bank-opening-balances/${row._id || row.id}`);
      await loadMasters(); await loadCurrentReport("bankbalance", params);
      setNotice(`Opening Balance removed for ${row.bank_name}.`);
    } catch (err) { setError(err.response?.data?.error || err.message || "Could not remove Bank Opening Balance."); }
    finally { setSaving(false); }
  };

  const filteredMappings = useMemo(() => {
    const q = mappingSearch.trim().toLowerCase();
    return !q ? mappings : mappings.filter((row) => `${row.particulars_name || ""} ${row.ledger_name || ""}`.toLowerCase().includes(q));
  }, [mappings, mappingSearch]);

  const applyFilters = async () => {
    setSelectedSubgroupSummary(null);
    setExpandedBankDetailRows({});
    setAppliedFilters({ ...filters });
  };

  const fmt = money;
  const reportPrintButton = () => <button type="button" className="bank-financial-no-print" onClick={() => window.print()} style={secondary}>Print / Save as PDF</button>;
  const renderBankBalanceDetailsTable = (detailRows) => (
    <div style={reportTableWrap}>
      <table style={{ ...reportTable, minWidth: 1720, tableLayout: "auto" }}>
        <thead><tr>{["Bank Date","Time","Bank Name","Ledger Name","Original Bank Particulars","Voucher Type","Voucher Number","Group Company","Group","Sub-group","Receipt","Payment","Statement Debit","Statement Credit","Bank Balance (H)","Running Balance","More Details"].map((title) => <th key={title} style={{ ...reportHeadCell, fontSize: 9, padding: "11px 8px" }}>{title}</th>)}</tr></thead>
        <tbody>
          {(detailRows || []).map((detail) => {
            const showMore = Boolean(expandedBankDetailRows[detail.id]);
            return <tr key={detail.id}>
              <td style={td}>{dateLabel(detail.bank_date)}</td>
              <td style={{ ...td, whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>{detail.bank_time || "-"}</td>
              <td style={td}>{detail.bank_name || "-"}</td>
              <td style={td}><b>{detail.ledger_name || "-"}</b></td>
              <td style={{ ...td, minWidth: 170 }}>{detail.original_particulars || "-"}</td>
              <td style={td}>{detail.voucher_type || "-"}</td>
              <td style={td}>{detail.voucher_number || "-"}</td>
              <td style={td}>{detail.group_company || "Unassigned"}</td>
              <td style={td}>{detail.group_name || "Unmapped"}</td>
              <td style={td}>{detail.subgroup_name || "-"}</td>
              <td style={{ ...td, textAlign: "right" }}>{detail.receipt_amount ? fmt(detail.receipt_amount) : "-"}</td>
              <td style={{ ...td, textAlign: "right" }}>{detail.payment_amount ? fmt(detail.payment_amount) : "-"}</td>
              <td style={{ ...td, textAlign: "right" }}>{detail.statement_debit ? fmt(detail.statement_debit) : "-"}</td>
              <td style={{ ...td, textAlign: "right" }}>{detail.statement_credit ? fmt(detail.statement_credit) : "-"}</td>
              <td style={{ ...td, textAlign: "right", whiteSpace: "nowrap" }}>{detail.bank_balance === null || detail.bank_balance === undefined ? "-" : fmt(detail.bank_balance)}</td>
              <td style={{ ...td, textAlign: "right", fontWeight: 800, whiteSpace: "nowrap" }}>{detail.running_balance === null || detail.running_balance === undefined ? "-" : fmt(detail.running_balance)}</td>
              <td style={td}>
                <button type="button" className="bank-financial-no-print" onClick={() => setExpandedBankDetailRows((previous) => ({ ...previous, [detail.id]: !previous[detail.id] }))} style={{ ...secondary, padding: "5px 9px" }}>{showMore ? "Hide" : "Show"}</button>
                {showMore && <div style={{ minWidth: 230, marginTop: 6, padding: 8, background: "#fff", border: "1px solid #cbd5e1", borderRadius: 6, lineHeight: 1.7 }}>
                  <div><b>Bank Name:</b> {detail.bank_name || "-"}</div>
                  <div><b>Ledger:</b> {detail.ledger_name || "-"}</div>
                  <div><b>Group Company:</b> {detail.group_company || "Unassigned"}</div>
                  <div><b>Group:</b> {detail.group_name || "Unmapped"}</div>
                  <div><b>Sub-group:</b> {detail.subgroup_name || "-"}</div>
                  <div><b>Bank Remarks:</b> {detail.bank_remarks || "-"}</div>
                  <div><b>Instrument Type:</b> {detail.instrument_type || "-"}</div>
                  <div><b>Instrument Number:</b> {detail.instrument_no || "-"}</div>
                  <div><b>Transaction ID:</b> {detail.transaction_reference || "-"}</div>
                  <div><b>Bank Status:</b> {detail.bank_status || "-"}</div>
                  <div><b>Tally Date:</b> {dateLabel(detail.tally_date)}</div>
                </div>}
              </td>
            </tr>;
          })}
          {!(detailRows || []).length && <tr><td style={td} colSpan={17}>No transaction details found for this report.</td></tr>}
        </tbody>
      </table>
    </div>
  );
  const card = (title, value, note) => (
    <div key={title} style={{ ...panel, minWidth: 150, flex: "1 1 160px" }}>
      <div style={{ color: "#64748b", fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: .5 }}>{title}</div>
      <div style={{ marginTop: 6, color: "#0f172a", fontWeight: 900, fontSize: 20 }}>{value}</div>
      {note && <div style={{ color: "#64748b", fontSize: 11, marginTop: 4 }}>{note}</div>}
    </div>
  );

  return (
    <main style={{ minHeight: "100vh", background: "#f1f5f9", padding: 16, fontFamily: "Segoe UI, Arial, sans-serif", color: "#0f172a" }}>
      <style>{`@page{size:A4 landscape;margin:12mm}@media print{body *{visibility:hidden!important}.bank-financial-print-area,.bank-financial-print-area *{visibility:visible!important}.bank-financial-print-area{position:absolute!important;left:0!important;top:0!important;width:100%!important;max-height:none!important;overflow:visible!important;box-shadow:none!important;border:0!important;padding:0!important}.bank-financial-print-area div{max-height:none!important;overflow:visible!important}.bank-financial-no-print{display:none!important}table{width:100%!important;border-collapse:collapse!important}th,td{font-size:9px!important;padding:5px!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}details:not([open])>*:not(summary){display:block!important}}`}</style>
      <header style={{ ...panel, borderTop: "4px solid #0f766e", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, color: "#102a43" }}>Bank & Financial Reports</h1>
          <p style={{ margin: "6px 0 0", color: "#64748b", fontSize: 13 }}>Import bank statements, classify Particulars into Groups / Sub-groups, and prepare Group-wise, Profit & Loss and Balance Sheet reports.</p>
        </div>
        <PageBackCloseActions navigate={navigate} />
      </header>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, margin: "14px 0" }}>
        {card("Transactions", Number(summary.total_transactions || 0).toLocaleString("en-IN"), `${(summary.bank_names || []).join(", ") || "No bank imported"}`)}
        {card("Receipts", fmt(summary.total_receipts), "Excel Column O")}
        {card("Payments", fmt(summary.total_payments), "Excel Column P")}
        {card("Mapped Particulars", `${summary.mapped_particulars || 0} / ${summary.distinct_particulars || 0}`, `${summary.unmapped_particulars || 0} still need mapping`)}
      </div>

      <nav style={{ ...panel, display: "flex", flexWrap: "wrap", gap: 7, padding: 10, marginBottom: 14 }}>
        {tabs.map(([key, title]) => (
          <button key={key} type="button" onClick={() => selectTab(key)} style={{ border: "1px solid", borderColor: tab === key ? "#0f766e" : "#dbe3ec", borderRadius: 7, padding: "9px 12px", background: tab === key ? "#0f766e" : "#fff", color: tab === key ? "#fff" : "#334155", fontSize: 12, fontWeight: 800, cursor: "pointer" }}>{title}</button>
        ))}
      </nav>

      {error && <div style={{ ...panel, marginBottom: 12, borderColor: "#fecaca", color: "#b91c1c", background: "#fff7f7", fontSize: 13 }}>{error}</div>}
      {notice && <div style={{ ...panel, marginBottom: 12, borderColor: "#bbf7d0", color: "#166534", background: "#f0fdf4", fontSize: 13 }}>{notice}</div>}
      {loading && <div style={{ ...panel, marginBottom: 12, color: "#64748b" }}>Loading report data...</div>}

      {tab === "import" && (
        <section style={{ display: "grid", gridTemplateColumns: "minmax(300px,1fr) minmax(280px,.8fr)", gap: 14 }}>
          <form onSubmit={uploadStatement} style={panel}>
            <h2 style={{ margin: "0 0 8px", fontSize: 18 }}>Upload Bank Statement</h2>
            <p style={{ margin: "0 0 14px", color: "#64748b", fontSize: 12 }}>Upload the Tally-reconciled bank statement Excel. Keep the original A:P columns and headers unchanged. Add Q = Ledger Name and R = Group Company to define the report name and company for each transaction directly in Excel.</p>
            <label style={label}>Select Excel File (.xls / .xlsx)</label>
            <input type="file" accept=".xls,.xlsx,.csv" onChange={(e) => setFile(e.target.files?.[0] || null)} style={{ ...input, padding: 7 }} />
            {file && <div style={{ marginTop: 8, fontSize: 12, color: "#0f766e", fontWeight: 700 }}>{file.name}</div>}
            <button disabled={saving || !file} type="submit" style={{ ...primary, marginTop: 14, opacity: saving || !file ? .6 : 1 }}>{saving ? "Importing..." : "Import Bank Statement"}</button>
            {importResult && <div style={{ marginTop: 16, padding: 13, borderRadius: 8, background: "#f0fdfa", border: "1px solid #99f6e4" }}>
              <strong style={{ color: "#115e59" }}>Import Result</strong>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8, marginTop: 10, fontSize: 12 }}>
                <span>Total Rows: <b>{importResult.total_rows}</b></span><span>Imported: <b>{importResult.imported_rows}</b></span>
                <span>Duplicates: <b>{importResult.duplicate_rows}</b></span><span>Invalid: <b>{importResult.invalid_rows}</b></span>
                <span>Auto-mapped rows: <b>{importResult.auto_mapped_rows || 0}</b></span><span>Need Mapping: <b>{importResult.unmapped_rows || 0}</b></span>
                <span>Excel Ledger Names: <b>{importResult.excel_ledger_names || 0}</b></span><span>Excel Group Companies: <b>{importResult.excel_group_companies || 0}</b></span>
                <span>Receipts: <b>{fmt(importResult.total_receipts)}</b></span><span>Payments: <b>{fmt(importResult.total_payments)}</b></span>
              </div>
              {importResult.invalid_details?.length > 0 && <div style={{ marginTop: 9, color: "#b91c1c" }}>{importResult.invalid_details.map((item) => <div key={item.row}>Row {item.row}: {item.reason}</div>)}</div>}
            </div>}
          </form>
          <div style={panel}>
            <h2 style={{ margin: "0 0 8px", fontSize: 18 }}>Excel Column Rules</h2>
            <div style={{ display: "grid", gridTemplateColumns: "55px 1fr", gap: 8, fontSize: 12 }}>
              {[["A", "Transaction Date"], ["D", "Bank Name"], ["L", "Original Particulars (keep unchanged)"], ["M", "Payment / Receipt / Contra"], ["N", "Voucher Number"], ["O", "Receipt Amount"], ["P", "Payment Amount"], ["Q", "Ledger Name (your report name)"], ["R", "Group Company (report split)" ]].map(([col, desc]) => <React.Fragment key={col}><b style={{ padding: 7, borderRadius: 5, background: col === "Q" || col === "R" ? "#ccfbf1" : "#e2e8f0", textAlign: "center" }}>{col}</b><span style={{ padding: 7 }}>{desc}</span></React.Fragment>)}
            </div>
            <div style={{ marginTop: 14, padding: 12, background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8, color: "#92400e", fontSize: 12, lineHeight: 1.55 }}>
              <b>Excel naming rule</b><br />Keep Column L (Particulars) unchanged. Add Column Q with header <b>Ledger Name</b> and type the report name you want, for example RAM - HFPL. Add Column R with header <b>Group Company</b> and enter HFPL Group Company, Retails Group Company or your own company label. These Q/R values apply to that transaction only; if blank, the saved Particulars Mapping is used.<br /><br /><b>Important accounting rule</b><br />Receipt against an existing Sale is Debtor Settlement, not a second Sales entry. Payment against an existing Purchase is Creditor Settlement, not a second Purchase entry. Contra entries are not P&L income or expense.
            </div>
          </div>
        </section>
      )}

      {tab === "importhistory" && (
        <section style={panel}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
            <div><h2 style={{ margin: 0, fontSize: 18 }}>Imported Bank Statements</h2><p style={{ margin: "5px 0 0", fontSize: 12, color: "#64748b" }}>Open a previous import and edit its individual statement rows. Saved Group / Sub-group mappings remain in place.</p></div>
            <button type="button" onClick={() => refreshAll("importhistory")} style={secondary}>Refresh History</button>
          </div>
          <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1120 }}><thead><tr>{["File Name","Date From","Date To","Rows","Receipts","Payments","Imported By","Current Bank Name","Apply Bank Name to All Rows","Action"].map((x) => <th key={x} style={th}>{x}</th>)}</tr></thead><tbody>
            {imports.map((row) => <tr key={row.batch_id || row.file_name}><td style={td}><b>{row.file_name}</b></td><td style={td}>{dateLabel(row.date_from)}</td><td style={td}>{dateLabel(row.date_to)}</td><td style={td}>{row.total_rows}</td><td style={{ ...td, textAlign: "right" }}>{fmt(row.total_receipts)}</td><td style={{ ...td, textAlign: "right" }}>{fmt(row.total_payments)}</td><td style={td}>{row.imported_by || "-"}</td><td style={td}>{(row.bank_names || []).join(", ") || <span style={{ color: "#b45309", fontWeight: 700 }}>Missing</span>}</td><td style={{ ...td, minWidth: 230 }}><input list="bank-bulk-name-options" value={bulkBankNames[row.batch_id] ?? ((row.bank_names || []).length === 1 ? row.bank_names[0] : "")} onChange={(event) => setBulkBankNames((previous) => ({ ...previous, [row.batch_id]: event.target.value }))} placeholder="Enter / select Bank Name" style={{ ...input, marginBottom: 6 }} /><button type="button" disabled={bulkBankUpdatingBatch === row.batch_id || !row.batch_id} style={{ ...primary, opacity: bulkBankUpdatingBatch === row.batch_id || !row.batch_id ? .6 : 1 }} onClick={() => updateImportedBatchBankName(row)}>{bulkBankUpdatingBatch === row.batch_id ? "Updating..." : `Update All ${row.total_rows || 0} Rows`}</button></td><td style={td}><button type="button" style={secondary} onClick={() => { const next = { ...appliedFilters, from_date: "", to_date: "", bank_name: "", voucher_type: "", import_batch_id: row.batch_id || "" }; setFilters(next); setAppliedFilters(next); selectTab("statement"); }}>Open / Edit Statement</button></td></tr>)}
            {!imports.length && <tr><td style={td} colSpan={10}>No imported statements found yet.</td></tr>}
          </tbody></table><datalist id="bank-bulk-name-options">{(summary.bank_names || []).map((name) => <option key={name} value={name} />)}</datalist></div>
          <p style={{ margin: "10px 0 0", color: "#64748b", fontSize: 12 }}>Bulk Bank Name update applies to every transaction in the selected imported file. It does not re-import rows or change dates, amounts, ledger mapping, split allocations or bank balance.</p>
        </section>
      )}

      {tab === "groups" && (
        <section style={{ display: "grid", gridTemplateColumns: "minmax(280px,.7fr) minmax(320px,1.3fr)", gap: 14 }}>
          <form onSubmit={createGroup} style={panel}>
            <h2 style={{ margin: "0 0 12px", fontSize: 18 }}>{editingGroupId ? "Edit Group" : "Create Group"}</h2>
            <label style={label}>Group Name (Tally Primary Groups)</label>
            <select required value={groupForm.name} onChange={(e) => {
              const selectedName = e.target.value;
              const standard = TALLY_PRIMARY_GROUPS.find((item) => item.name === selectedName);
              setGroupForm((p) => ({ ...p, name: selectedName, ...(standard && p.source_type === "bank_statement" ? { nature: standard.nature, report_placement: standard.report_placement } : {}) }));
              if (selectedName !== "__custom__") setCustomGroupName("");
            }} style={input}>
              <option value="">Select Tally Primary Group</option>
              {TALLY_PRIMARY_GROUPS.map((item) => <option key={item.name} value={item.name}>{item.name}</option>)}
              <option value="__custom__">+ Create a custom Group</option>
            </select>
            {groupForm.name === "__custom__" && <input required value={customGroupName} onChange={(e) => setCustomGroupName(e.target.value)} style={{ ...input, marginTop: 8 }} placeholder="Enter custom Group Name" />}
            <p style={{ color: "#64748b", fontSize: 11, margin: "6px 0 10px" }}>TallyPrime standard chart: 15 Primary Groups and 13 predefined Sub-groups. Choose a standard group here, then choose its Sub-group in the next tab. Custom groups are also supported.</p>
            <label style={{ ...label, marginTop: 10 }}>Group Source</label><select value={groupForm.source_type || "bank_statement"} onChange={(e) => { const source = e.target.value; setGroupForm((p) => ({ ...p, source_type: source, nature: source === "warehouse_sale" ? "income" : source === "warehouse_purchase" ? "expense" : p.nature, report_placement: source === "bank_statement" ? p.report_placement : "profit_loss" })); }} style={input}>{Object.entries(sourceLabels).map(([key,value]) => <option key={key} value={key}>{value}</option>)}</select>
            <label style={{ ...label, marginTop: 10 }}>Account Nature</label><select disabled={groupForm.source_type !== "bank_statement"} value={groupForm.nature} onChange={(e) => setGroupForm((p) => ({ ...p, nature: e.target.value }))} style={{ ...input, background: groupForm.source_type !== "bank_statement" ? "#f1f5f9" : "#fff" }}>{Object.entries(natureLabels).map(([key,value]) => <option key={key} value={key}>{value}</option>)}</select>
            <label style={{ ...label, marginTop: 10 }}>Where should this Group appear?</label><select disabled={groupForm.source_type !== "bank_statement"} value={groupForm.report_placement} onChange={(e) => setGroupForm((p) => ({ ...p, report_placement: e.target.value }))} style={{ ...input, background: groupForm.source_type !== "bank_statement" ? "#f1f5f9" : "#fff" }}>{Object.entries(placementLabels).map(([key,value]) => <option key={key} value={key}>{value}</option>)}</select>
            {groupForm.source_type !== "bank_statement" && <p style={{ color: "#475569", fontSize: 11, margin: "8px 0 0" }}>This source is connected to existing Warehouse vouchers automatically. Account Nature and Profit & Loss placement are fixed for this source.</p>}
            <label style={{ ...label, marginTop: 10 }}>Display Order</label><select value={groupForm.sort_order} onChange={(e) => setGroupForm((p) => ({ ...p, sort_order: e.target.value }))} style={input}>{displayOrderOptions.map((order) => <option key={order} value={order}>{order === "0" ? "0 · Default" : order}</option>)}</select>
            <div style={{ display: "flex", gap: 8, marginTop: 13 }}><button type="submit" disabled={saving} style={primary}>{saving ? "Saving..." : editingGroupId ? "Update Group" : "Save Group"}</button>{editingGroupId && <button type="button" onClick={cancelGroupEdit} style={secondary}>Cancel Edit</button>}</div>
          </form>
          <div style={panel}>
            <h2 style={{ margin: "0 0 12px", fontSize: 18 }}>Group Master List</h2>
            <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse" }}><thead><tr>{["Group Name","Source","Nature","Report Placement","Action"].map((x) => <th key={x} style={th}>{x}</th>)}</tr></thead><tbody>
              {groups.map((row) => <tr key={row._id}><td style={td}><b>{row.name}</b></td><td style={td}>{sourceLabels[row.source_type || "bank_statement"] || "Bank Statement Particulars"}</td><td style={td}>{natureLabels[row.nature] || row.nature}</td><td style={td}>{placementLabels[row.report_placement] || row.report_placement}</td><td style={td}><button type="button" onClick={() => startEditGroup(row)} style={secondary}>Edit</button></td></tr>)}
              {!groups.length && <tr><td style={td} colSpan={5}>No Groups created yet.</td></tr>}
            </tbody></table></div>
          </div>
        </section>
      )}

      {tab === "subgroups" && (
        <section style={{ display: "grid", gridTemplateColumns: "minmax(280px,.7fr) minmax(320px,1.3fr)", gap: 14 }}>
          <form onSubmit={createSubGroup} style={panel}>
            <h2 style={{ margin: "0 0 12px", fontSize: 18 }}>{editingSubGroupId ? "Edit Sub-group" : "Create Sub-group"}</h2>
            <label style={label}>Sub-group Name (Tally Predefined + Custom)</label>
            <select required value={subGroupForm.name} onChange={(e) => { setSubGroupForm((p) => ({ ...p, name: e.target.value })); if (e.target.value !== "__custom__") setCustomSubGroupName(""); }} style={input}>
              <option value="">Select Sub-group</option>
              {(() => {
                const parentName = groups.find((g) => String(g._id || g.id) === String(subGroupForm.group_id))?.name;
                const currentEditingName = subgroups.find((item) => String(item._id || item.id) === String(editingSubGroupId))?.name;
                const alreadyUsed = new Set(subgroups.filter((item) => String(item.group_id) === String(subGroupForm.group_id) && String(item._id || item.id) !== String(editingSubGroupId)).map((item) => item.name));
                const options = [...new Set([...(TALLY_SUBGROUPS_BY_PARENT[parentName] || []), ...(CUSTOM_SUBGROUP_SUGGESTIONS[parentName] || []), ...(currentEditingName ? [currentEditingName] : [])])].filter((name) => !alreadyUsed.has(name));
                return options.map((name) => <option key={name} value={name}>{name}{TALLY_SUBGROUPS_BY_PARENT[parentName]?.includes(name) ? " (Tally)" : ""}</option>);
              })()}
              <option value="__custom__">+ Create a custom Sub-group</option>
            </select>
            {subGroupForm.name === "__custom__" && <input required value={customSubGroupName} onChange={(e) => setCustomSubGroupName(e.target.value)} style={{ ...input, marginTop: 8 }} placeholder="Enter custom Sub-group Name" />}
            <label style={{ ...label, marginTop: 10 }}>Under Group</label><select required value={subGroupForm.group_id} onChange={(e) => { setSubGroupForm((p) => ({ ...p, group_id: e.target.value, name: "" })); setCustomSubGroupName(""); }} style={input}><option value="">Select Tally Primary Group</option>{groups.filter((g) => !g.source_type || g.source_type === "bank_statement").map((g) => <option key={g._id} value={g._id}>{g.name}</option>)}</select>
            <label style={{ ...label, marginTop: 10 }}>Display Order</label><select value={subGroupForm.sort_order} onChange={(e) => setSubGroupForm((p) => ({ ...p, sort_order: e.target.value }))} style={input}>{displayOrderOptions.map((order) => <option key={order} value={order}>{order === "0" ? "0 · Default" : order}</option>)}</select>
            <div style={{ display: "flex", gap: 8, marginTop: 13 }}><button type="submit" disabled={saving || !groups.some((g) => !g.source_type || g.source_type === "bank_statement")} style={primary}>{saving ? "Saving..." : editingSubGroupId ? "Update Sub-group" : "Save Sub-group"}</button>{editingSubGroupId && <button type="button" onClick={cancelSubGroupEdit} style={secondary}>Cancel Edit</button>}</div>
          </form>
          <div style={panel}>
            <h2 style={{ margin: "0 0 12px", fontSize: 18 }}>Sub-group Master List</h2>
            <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse" }}><thead><tr><th style={th}>Sub-group</th><th style={th}>Under Group</th><th style={th}>Action</th></tr></thead><tbody>
              {subgroups.map((row) => <tr key={row._id}><td style={td}><b>{row.name}</b></td><td style={td}>{row.group_name}</td><td style={td}><button type="button" onClick={() => startEditSubGroup(row)} style={secondary}>Edit</button></td></tr>)}
              {!subgroups.length && <tr><td style={td} colSpan={3}>No Sub-groups created yet.</td></tr>}
            </tbody></table></div>
          </div>
        </section>
      )}

      {tab === "mapping" && (
        <section style={panel}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
            <div><h2 style={{ margin: 0, fontSize: 18 }}>Bank Particulars → Ledger Name / Group Mapping</h2><p style={{ margin: "5px 0 0", color: "#64748b", fontSize: 12 }}>Original name from Excel Column L stays preserved for bank reconciliation. Set your own Ledger Name here; the mapped Ledger Name is displayed in Bank Statement and reports and reused on future imports.</p></div>
            <input value={mappingSearch} onChange={(e) => setMappingSearch(e.target.value)} placeholder="Search Particulars name..." style={{ ...input, maxWidth: 280 }} />
          </div>
          {!groups.length && <div style={{ padding: 12, background: "#fffbeb", color: "#92400e", borderRadius: 7, marginBottom: 10 }}>First create Groups in Group Master, then map Particulars here.</div>}
          <form data-tally-form="manual-ledger" onSubmit={saveManualLedger} style={{ border: "1px solid #bfdbfe", background: "#eff6ff", borderRadius: 10, padding: 12, marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
              <div><b style={{ color: "#1d4ed8" }}>＋ Create Manual Ledger (No Bank Statement Required)</b><div style={{ color: "#475569", fontSize: 11, marginTop: 3 }}>Create and save a Ledger Name, Group, Sub-group and Group Company directly. You do not need to import or select any Bank Statement. This manual ledger will also be available in Split Receipt / Payment and other Ledger Name suggestions.</div></div>
              <button type="submit" disabled={saving || !groups.length} style={{ ...primary, background: "#1d4ed8", opacity: !groups.length ? .55 : 1 }}>{saving ? "Saving..." : "Create Manual Ledger"}</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(165px,1fr))", gap: 8, marginTop: 11, alignItems: "end" }}>
              <label style={{ ...label, margin: 0 }}>Ledger Name
                <TallyAutocompleteField
                  formName="manual-ledger" order="0" options={splitLedgerOptions}
                  value={manualLedgerForm.ledger_name}
                  placeholder="Type a new Ledger Name..." allowCustom
                  onInput={(value) => setManualLedgerForm((p) => ({ ...p, ledger_name: value }))}
                  onSelect={(option) => setManualLedgerForm((p) => ({ ...p, ledger_name: option.value }))}
                />
              </label>
              <label style={{ ...label, margin: 0 }}>Group
                <TallyAutocompleteField
                  formName="manual-ledger" order="1" options={bankGroupOptions}
                  value={manualGroupQuery} placeholder="Type / select Group..."
                  onInput={(value) => { setManualGroupQuery(value); setManualLedgerForm((p) => ({ ...p, group_id: "", subgroup_id: "" })); setManualSubgroupQuery(""); }}
                  onSelect={(option) => { setManualGroupQuery(option.label); setManualSubgroupQuery(""); setManualLedgerForm((p) => ({ ...p, group_id: option.value, subgroup_id: "" })); }}
                />
              </label>
              <label style={{ ...label, margin: 0 }}>Sub-group
                <TallyAutocompleteField
                  formName="manual-ledger" order="2" options={manualSubgroupOptions}
                  value={manualSubgroupQuery} placeholder={manualLedgerForm.group_id ? "Type / select Sub-group..." : "Select Group first"}
                  disabled={!manualLedgerForm.group_id} allowEmpty
                  onInput={(value) => { setManualSubgroupQuery(value); setManualLedgerForm((p) => ({ ...p, subgroup_id: "" })); }}
                  onSelect={(option) => { setManualSubgroupQuery(option.label); setManualLedgerForm((p) => ({ ...p, subgroup_id: option.value || "" })); }}
                />
              </label>
              <label style={{ ...label, margin: 0 }}>Group Company
                <TallyAutocompleteField
                  formName="manual-ledger" order="3" options={companyGroupOptions.map((name) => ({ label: name, value: name }))}
                  value={manualLedgerForm.group_company} placeholder="Type / select Group Company..." allowCustom
                  onInput={(value) => setManualLedgerForm((p) => ({ ...p, group_company: value }))}
                  onSelect={(option) => setManualLedgerForm((p) => ({ ...p, group_company: option.value }))}
                />
              </label>
              <label style={{ ...label, margin: 0 }}>Opening Balance<input data-tally-order="4" type="number" step="0.01" value={manualLedgerForm.opening_balance} onKeyDown={moveManualLedgerFocus} onChange={(e) => setManualLedgerForm((p) => ({ ...p, opening_balance: e.target.value }))} style={{ ...input, marginTop: 4 }} /></label>
              <label style={{ ...label, margin: 0 }}>Dr / Cr<select data-tally-order="5" value={manualLedgerForm.opening_balance_type} onKeyDown={moveManualLedgerFocus} onChange={(e) => setManualLedgerForm((p) => ({ ...p, opening_balance_type: e.target.value }))} style={{ ...input, marginTop: 4 }}><option value="dr">Dr</option><option value="cr">Cr</option></select></label>
            </div>
          </form>
          <form data-tally-form="quick-ledger" onSubmit={saveQuickLedgerMapping} style={{ border: "1px solid #99f6e4", background: "#f0fdfa", borderRadius: 10, padding: 12, marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
              <div><b style={{ color: "#115e59" }}>Map Bank Statement Particulars to a Ledger</b><div style={{ color: "#475569", fontSize: 11, marginTop: 3 }}>Use this section when the original Bank Statement Particulars name is different from your report Ledger Name. Type names to see matching suggestions. Press Enter to select a suggestion and move straight to the next field; continue with Enter through Group, Sub-group, Group Company and Balance. A saved Group Company is used to split reports.</div></div>
              <button type="submit" disabled={saving} style={primary}>{saving ? "Saving..." : "Save Ledger Mapping"}</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(165px,1fr))", gap: 8, marginTop: 11, alignItems: "end" }}>
              <label style={{ ...label, margin: 0 }}>Original Bank Particulars (L)
                <TallyAutocompleteField
                  order="0"
                  options={quickLedgerOptions}
                  value={quickMappingForm.particulars_name}
                  placeholder="Type ledger name..."
                  allowCustom
                  onInput={(value) => setQuickMappingForm((p) => ({
                    ...p,
                    particulars_name: value,
                    ledger_name: !p.ledger_name || p.ledger_name === p.particulars_name ? value : p.ledger_name,
                  }))}
                  onSelect={(option) => chooseQuickLedger(option.value)}
                />
              </label>
              <label style={{ ...label, margin: 0 }}>Ledger Name (will show in Bank Statement / Reports)
                <TallyAutocompleteField
                  order="1"
                  options={mappings.map((row) => ({ label: row.ledger_name || row.particulars_name, value: row.ledger_name || row.particulars_name }))}
                  value={quickMappingForm.ledger_name}
                  placeholder="Type new Ledger Name..."
                  allowCustom
                  onInput={(value) => setQuickMappingForm((p) => ({ ...p, ledger_name: value }))}
                  onSelect={(option) => setQuickMappingForm((p) => ({ ...p, ledger_name: option.value }))}
                />
              </label>
              <label style={{ ...label, margin: 0 }}>Group
                <TallyAutocompleteField
                  order="2"
                  options={bankGroupOptions}
                  value={quickGroupQuery}
                  placeholder="Type group name..."
                  onInput={(value) => { setQuickGroupQuery(value); setQuickMappingForm((p) => ({ ...p, group_id: "", subgroup_id: "" })); setQuickSubgroupQuery(""); }}
                  onSelect={(option) => { setQuickGroupQuery(option.label); setQuickSubgroupQuery(""); setQuickMappingForm((p) => ({ ...p, group_id: option.value, subgroup_id: "" })); }}
                />
              </label>
              <label style={{ ...label, margin: 0 }}>Sub-group
                <TallyAutocompleteField
                  order="3"
                  options={quickSubgroupOptions}
                  value={quickSubgroupQuery}
                  placeholder={quickMappingForm.group_id ? "Type sub-group..." : "Select Group first"}
                  disabled={!quickMappingForm.group_id}
                  allowEmpty
                  onInput={(value) => { setQuickSubgroupQuery(value); setQuickMappingForm((p) => ({ ...p, subgroup_id: "" })); }}
                  onSelect={(option) => { setQuickSubgroupQuery(option.label); setQuickMappingForm((p) => ({ ...p, subgroup_id: option.value || "" })); }}
                />
              </label>
              <label style={{ ...label, margin: 0 }}>Group Company
                <TallyAutocompleteField
                  order="4"
                  options={companyGroupOptions.map((name) => ({ label: name, value: name }))}
                  value={quickMappingForm.group_company}
                  placeholder="Type Group Company..."
                  allowCustom
                  onInput={(value) => setQuickMappingForm((p) => ({ ...p, group_company: value }))}
                  onSelect={(option) => setQuickMappingForm((p) => ({ ...p, group_company: option.value }))}
                />
              </label>
              <label style={{ ...label, margin: 0 }}>Opening Balance<input data-tally-order="5" type="number" step="0.01" value={quickMappingForm.opening_balance} onKeyDown={moveQuickLedgerFocus} onChange={(e) => setQuickMappingForm((p) => ({ ...p, opening_balance: e.target.value }))} style={{ ...input, marginTop: 4 }} /></label>
              <label style={{ ...label, margin: 0 }}>Dr / Cr<select data-tally-order="6" value={quickMappingForm.opening_balance_type} onKeyDown={moveQuickLedgerFocus} onChange={(e) => setQuickMappingForm((p) => ({ ...p, opening_balance_type: e.target.value }))} style={{ ...input, marginTop: 4 }}><option value="dr">Dr</option><option value="cr">Cr</option></select></label>
            </div>
            <datalist id="bank-financial-group-company-options">{companyGroupOptions.map((name) => <option key={name} value={name} />)}</datalist>
          </form>
          <div style={{ overflowX: "auto", maxHeight: "68vh" }}><table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1250 }}><thead><tr>{["Original Bank Particulars (L)","Ledger Name (Report Name)","Rows","Group","Sub-group","Group Company","Opening Balance","Dr/Cr","Report Placement","Mapping Status","Action"].map((x) => <th key={x} style={th}>{x}</th>)}</tr></thead><tbody>
            {filteredMappings.map((row) => {
              const allowedSubgroups = subgroups.filter((sub) => String(sub.group_id) === String(row.group_id));
              return <tr key={row.normalized_name} style={{ background: row.mapped ? "#fff" : "#fffdf5" }}>
                <td style={{ ...td, fontWeight: 800, minWidth: 190 }}>{row.particulars_name}</td>
                <td style={{ ...td, minWidth: 190 }}><input data-ledger-cell="0" onKeyDown={handleMappingGridKeyDown} value={row.ledger_name || row.particulars_name} onChange={(e) => updateMappingDraft(row.normalized_name, { ledger_name: e.target.value })} placeholder="Type Ledger Name" style={input} /></td>
                <td style={td}>{row.transaction_count}</td>
                <td style={{ ...td, minWidth: 165 }}><select data-ledger-cell="1" onKeyDown={handleMappingGridKeyDown} value={row.group_id || ""} onChange={(e) => { const g = groups.find((item) => String(item._id) === e.target.value); updateMappingDraft(row.normalized_name, { group_id: e.target.value, subgroup_id: "", nature: g?.nature || "", report_placement: g?.report_placement || "" }); }} style={input}><option value="">Select Group</option>{groups.filter((g) => !g.source_type || g.source_type === "bank_statement").map((g) => <option key={g._id} value={g._id}>{g.name}</option>)}</select></td>
                <td style={{ ...td, minWidth: 165 }}><select data-ledger-cell="2" onKeyDown={handleMappingGridKeyDown} value={row.subgroup_id || ""} disabled={!row.group_id} onChange={(e) => updateMappingDraft(row.normalized_name, { subgroup_id: e.target.value })} style={input}><option value="">No Sub-group</option>{allowedSubgroups.map((sub) => <option key={sub._id} value={sub._id}>{sub.name}</option>)}</select></td>
                <td style={{ ...td, minWidth: 180 }}><input data-ledger-cell="3" onKeyDown={handleMappingGridKeyDown} list="bank-financial-group-company-options" value={row.group_company || ""} onChange={(e) => updateMappingDraft(row.normalized_name, { group_company: e.target.value })} placeholder="Type / select Group Company" style={input} /></td>
                <td style={{ ...td, minWidth: 125 }}><input data-ledger-cell="4" onKeyDown={handleMappingGridKeyDown} type="number" step="0.01" value={row.opening_balance ?? 0} onChange={(e) => updateMappingDraft(row.normalized_name, { opening_balance: e.target.value })} style={input} /></td>
                <td style={{ ...td, minWidth: 85 }}><select data-ledger-cell="5" onKeyDown={handleMappingGridKeyDown} value={row.opening_balance_type || "dr"} onChange={(e) => updateMappingDraft(row.normalized_name, { opening_balance_type: e.target.value })} style={input}><option value="dr">Dr</option><option value="cr">Cr</option></select></td>
                <td style={td}>{placementLabels[row.report_placement] || (row.group_id ? "From Group" : "Not Mapped")}</td>
                <td style={td}><span style={{ display: "inline-block", padding: "4px 8px", borderRadius: 12, fontSize: 11, fontWeight: 800, color: row.mapped ? "#166534" : "#92400e", background: row.mapped ? "#dcfce7" : "#fef3c7" }}>{row.mapped ? "Saved · Auto-mapped" : "Needs Mapping"}</span></td>
                <td style={td}><button type="button" disabled={saving || !row.group_id} onClick={() => saveMapping(row)} style={{ ...primary, padding: "7px 10px", opacity: !row.group_id ? .5 : 1 }}>{row.mapped ? "Update Mapping" : "Save Mapping"}</button></td>
              </tr>;
            })}
            {!filteredMappings.length && <tr><td style={td} colSpan={11}>No Particulars found. Import a bank statement first, or use Quick Ledger Mapping to create one.</td></tr>}
          </tbody></table></div>
        </section>
      )}

      {!["import", "importhistory", "groups", "subgroups", "mapping"].includes(tab) && (
        <>
          <section style={{ ...panel, marginBottom: 12, display: "flex", alignItems: "end", flexWrap: "wrap", gap: 9 }}>
            <div><label style={label}>From Date (Bank Date – A)</label><input type="date" value={filters.from_date} onChange={(e) => setFilters((p) => ({ ...p, from_date: e.target.value }))} style={input} /></div>
            <div><label style={label}>To Date</label><input type="date" value={filters.to_date} onChange={(e) => setFilters((p) => ({ ...p, to_date: e.target.value }))} style={input} /></div>
            <div><label style={label}>Bank Name</label><select value={filters.bank_name} onChange={(e) => setFilters((p) => ({ ...p, bank_name: e.target.value }))} style={input}><option value="">All Banks</option>{[...new Set([...(summary.bank_names || []), ...bankOpeningBalances.map((row) => row.bank_name)])].sort((a, b) => a.localeCompare(b)).map((name) => <option key={name} value={name}>{name}</option>)}</select></div>
            <div><label style={label}>Voucher Type</label><select value={filters.voucher_type} onChange={(e) => setFilters((p) => ({ ...p, voucher_type: e.target.value }))} style={input}><option value="">All Types</option><option>Payment</option><option>Receipt</option><option>Contra</option></select></div>
            {!["statement"].includes(tab) && <>
              <div><label style={label}>Group Company</label><select value={filters.group_company} onChange={(e) => setFilters((p) => ({ ...p, group_company: e.target.value }))} style={input}><option value="">All Group Companies</option><option value="__unassigned__">Unassigned</option>{companyGroupOptions.map((name) => <option key={name} value={name}>{name}</option>)}</select></div>
              <div><label style={label}>Group</label><select value={filters.group_id} onChange={(e) => setFilters((p) => ({ ...p, group_id: e.target.value, subgroup_id: "" }))} style={input}><option value="">All Groups</option>{groups.filter((g) => !g.source_type || g.source_type === "bank_statement").map((g) => <option key={g._id} value={g._id}>{g.name}</option>)}</select></div>
              <div><label style={label}>Sub-group</label><select value={filters.subgroup_id} onChange={(e) => setFilters((p) => ({ ...p, subgroup_id: e.target.value }))} style={input}><option value="">All Sub-groups</option>{subgroups.filter((g) => !filters.group_id || String(g.group_id) === String(filters.group_id)).map((g) => <option key={g._id} value={g._id}>{g.name}</option>)}</select></div>
            </>}
            {["groupwise", "groupcompany", "profitloss", "bankbalance"].includes(tab) && <div><label style={label}>Report Period</label><select value={filters.period_type} onChange={(e) => setFilters((p) => ({ ...p, period_type: e.target.value }))} style={input}><option value="range">Selected Date Range Total</option><option value="daily">Day-wise</option><option value="monthly">Monthly</option></select></div>}
            {filters.import_batch_id && <div><label style={label}>Import Batch</label><input readOnly value={imports.find((item) => item.batch_id === filters.import_batch_id)?.file_name || "Selected Import"} style={{ ...input, background: "#f1f5f9" }} /></div>}
            <button type="button" onClick={applyFilters} disabled={loading} style={primary}>Apply Filter</button>
            {tab === "bankbalance" && <div><label style={label}>Report View</label><select value={bankBalanceViewMode} onChange={(event) => { setBankBalanceViewMode(event.target.value); setSelectedSubgroupSummary(null); setExpandedBankDetailRows({}); }} style={input}><option value="summary">Summary</option><option value="full_details">Full Details</option></select></div>}
            <button type="button" onClick={() => { const cleared = { from_date: "", to_date: "", bank_name: "", voucher_type: "", import_batch_id: "", group_company: "", group_id: "", subgroup_id: "", period_type: "range" }; setFilters(cleared); setAppliedFilters(cleared); setBankBalanceViewMode("summary"); setSelectedSubgroupSummary(null); setExpandedBankDetailRows({}); }} style={secondary}>Clear Filter</button>
          </section>

          {tab === "statement" && <section style={panel}>
            <h2 style={{ margin: "0 0 12px", fontSize: 18 }}>Bank Statement Transactions</h2>
            {editingTransaction && transactionEditForm && <form onSubmit={saveTransactionEdit} style={{ border: "1px solid #99f6e4", background: "#f0fdfa", borderRadius: 9, padding: 12, marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 10 }}><b>Edit Imported Statement Row · {editingTransaction.voucher_number}</b><button type="button" onClick={() => { setEditingTransaction(null); setTransactionEditForm(null); }} style={secondary}>Close</button></div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(175px,1fr))", gap: 9 }}>
                {[["bank_date","Date","date"],["bank_time","Time","text"],["bank_name","Bank Name","text"],["particulars_name","Original Bank Particulars (L)","text"],["voucher_type","Voucher Type","text"],["voucher_number","Voucher Number","text"],["receipt_amount","Receipt Amount","number"],["payment_amount","Payment Amount","number"],["bank_debit","Statement Debit","number"],["bank_credit","Statement Credit","number"],["bank_balance","Bank Balance (H)","number"],["bank_remarks","Bank Remarks","text"],["instrument_type","Instrument Type","text"],["instrument_no","Instrument Number","text"],["transaction_id","Transaction ID","text"],["bank_status","Bank Status","text"],["tally_date","Tally Date","date"]].map(([key,title,type]) => <label key={key} style={{ ...label, margin: 0 }}>{title}<input type={type} value={transactionEditForm[key] ?? ""} onChange={(e) => setTransactionEditForm((p) => ({ ...p, [key]: e.target.value }))} style={{ ...input, marginTop: 4 }} /></label>)}
              </div>
              <div style={{ marginTop: 14, padding: 12, border: "1px solid #cbd5e1", borderRadius: 8, background: "#fff" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <div><b style={{ fontSize: 13, color: "#0f172a" }}>Split Ledger / Receipt & Payment Allocation</b><div style={{ color: "#64748b", fontSize: 11, marginTop: 3 }}>Split a Receipt into income / other ledgers or a Payment into expense / other ledgers. Type or select a saved Ledger Name to auto-fill its Group, Sub-group and Group Company. Bank Statement amount and bank balance remain unchanged.</div></div>
                  <button type="button" onClick={addTransactionAllocation} style={secondary}>+ Add Split Row</button>
                </div>
                {(() => {
                  const allocations = transactionEditForm.allocations || [];
                  const bankAmount = transactionEntryAmount(transactionEditForm);
                  const allocatedTotal = allocations.reduce((sum, item) => sum + Number(item.amount || 0), 0);
                  const remaining = bankAmount - allocatedTotal;
                  return <>
                    <div style={{ display: "flex", gap: 16, flexWrap: "wrap", margin: "10px 0", fontSize: 12 }}>
                      <span>Statement {transactionEntrySide(transactionEditForm) === "payment" ? "Payment" : "Receipt"}: <b>{money(bankAmount)}</b></span>
                      <span>Allocated: <b>{money(allocatedTotal)}</b></span>
                      <span style={{ color: Math.abs(remaining) <= 0.01 ? "#047857" : "#b45309" }}>Remaining: <b>{money(remaining)}</b></span>
                    </div>
                    {allocations.length > 0 && <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", minWidth: 850 }}><thead><tr>{["Ledger Name","Group","Sub-group","Group Company","Amount","Action"].map((title) => <th key={title} style={{ ...th, position: "static" }}>{title}</th>)}</tr></thead><tbody>
                      {allocations.map((allocation, index) => <tr key={`allocation-${index}`}>
                        <td style={td}><input value={allocation.ledger_name || ""} onChange={(event) => applySavedMappingToAllocation(index, event.target.value)} list="bank-financial-split-ledger-options" placeholder="Type / select saved Ledger Name" style={input} /></td>
                        <td style={{ ...td, minWidth: 160 }}><select value={allocation.group_id || ""} onChange={(event) => updateTransactionAllocation(index, { group_id: event.target.value, subgroup_id: "" })} style={input}><option value="">Select Group</option>{groups.filter((item) => !item.source_type || item.source_type === "bank_statement").map((item) => <option key={item._id} value={item._id}>{item.name}</option>)}</select></td>
                        <td style={{ ...td, minWidth: 160 }}><select value={allocation.subgroup_id || ""} disabled={!allocation.group_id} onChange={(event) => updateTransactionAllocation(index, { subgroup_id: event.target.value })} style={input}><option value="">No Sub-group</option>{subgroups.filter((item) => String(item.group_id) === String(allocation.group_id)).map((item) => <option key={item._id} value={item._id}>{item.name}</option>)}</select></td>
                        <td style={{ ...td, minWidth: 170 }}><input value={allocation.group_company || ""} onChange={(event) => updateTransactionAllocation(index, { group_company: event.target.value })} list="bank-financial-group-company-options" placeholder="Group Company" style={input} /></td>
                        <td style={{ ...td, minWidth: 125 }}><input type="number" min="0.01" step="0.01" value={allocation.amount ?? ""} onChange={(event) => updateTransactionAllocation(index, { amount: event.target.value })} style={{ ...input, textAlign: "right" }} /></td>
                        <td style={td}><button type="button" onClick={() => removeTransactionAllocation(index)} style={{ ...secondary, color: "#b91c1c", padding: "7px 9px" }}>Remove</button></td>
                      </tr>)}
                    </tbody></table></div>}
                    {!allocations.length && <div style={{ padding: 12, background: "#f8fafc", borderRadius: 7, color: "#64748b", fontSize: 12 }}>No split allocation has been added. Click “Add Split Row” to classify this bank entry.</div>}
                  </>;
                })()}
                <datalist id="bank-financial-group-company-options">{companyGroupOptions.map((name) => <option key={name} value={name} />)}</datalist>
                <datalist id="bank-financial-split-ledger-options">{splitLedgerOptions.map((name) => <option key={name} value={name} />)}</datalist>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}><button type="submit" disabled={saving} style={primary}>{saving ? "Saving..." : "Save Statement Changes"}</button><button type="button" onClick={() => { setEditingTransaction(null); setTransactionEditForm(null); }} style={secondary}>Cancel</button></div>
              <p style={{ margin: "8px 0 0", fontSize: 11, color: "#475569" }}>The original Bank Statement Particulars is kept for reconciliation. Split allocations affect ledger reports only; the Bank Statement entry and bank balance stay as one transaction.</p>
            </form>}
            <div style={{ overflow: "auto", maxHeight: "70vh" }}><table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1250 }}><thead><tr>{["Date (A)","Bank (D)","Ledger Name (mapped from L)","Group Company","Voucher Type (M)","Voucher No. (N)","Receipt (O)","Payment (P)","Bank Balance (H)","Group Mapping","Status","Action"].map((x) => <th key={x} style={th}>{x}</th>)}</tr></thead><tbody>
              {transactions.map((row) => <tr key={row._id}><td style={td}>{dateLabel(row.bank_date)}</td><td style={td}>{row.bank_name}</td><td style={td}><b>{row.ledger_name || row.particulars_name}</b>{row.ledger_name && String(row.ledger_name).trim().toLowerCase() !== String(row.particulars_name || "").trim().toLowerCase() && <div style={{ color: "#64748b", fontSize: 10, marginTop: 3 }}>Original: {row.particulars_name}</div>}{(row.split_allocations || []).length > 0 && <div style={{ color: "#0f766e", fontSize: 10, marginTop: 4 }}>{row.allocations.map((item) => `${item.ledger_name}: ${money(item.amount)}`).join(" · ")}</div>}</td><td style={td}>{(row.split_allocations || []).length > 0 ? [...new Set(row.allocations.map((item) => item.group_company || "Unassigned"))].join(", ") : row.mapping?.group_company || "Unassigned"}</td><td style={td}>{row.voucher_type}</td><td style={td}>{row.voucher_number}</td><td style={{ ...td, textAlign: "right" }}>{row.receipt_amount ? fmt(row.receipt_amount) : "-"}</td><td style={{ ...td, textAlign: "right" }}>{row.payment_amount ? fmt(row.payment_amount) : "-"}</td><td style={{ ...td, textAlign: "right" }}>{fmt(row.bank_balance)}</td><td style={td}>{(row.split_allocations || []).length > 0 ? <span style={{ color: "#0f766e", fontWeight: 700 }}>Split ({row.allocations.length} ledgers)</span> : row.mapping ? `${row.mapping.group_name}${row.mapping.subgroup_name ? ` / ${row.mapping.subgroup_name}` : ""}` : <span style={{ color: "#b45309", fontWeight: 800 }}>Unmapped</span>}</td><td style={td}>{row.bank_status || "-"}</td><td style={td}><button type="button" onClick={() => openTransactionEdit(row)} style={secondary}>Edit</button></td></tr>)}
              {!transactions.length && <tr><td style={td} colSpan={12}>No bank transactions for the selected filter.</td></tr>}
            </tbody></table></div>
          </section>}

          {tab === "groupwise" && <section className="bank-financial-print-area" style={panel}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}><h2 style={{ margin: "0 0 12px", fontSize: 18 }}>Group-wise / Sub-group-wise Report</h2>{reportPrintButton() }</div>
            <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse" }}><thead><tr>{["Period","Group","Sub-group","Ledger Names","Group Company","Nature","Report Placement","Transactions","Receipts","Payments","Net Movement"].map((x) => <th key={x} style={th}>{x}</th>)}</tr></thead><tbody>
              {groupReport.map((row, i) => <tr key={`${row.group_id}-${row.subgroup_id}-${row.period_label}-${i}`}><td style={td}>{row.period_label || "Selected Period"}</td><td style={td}><b>{row.group_name}</b></td><td style={td}>{row.subgroup_name}</td><td style={td}>{(row.ledger_names || []).join(", ") || "-"}</td><td style={td}>{row.group_company || "Unassigned"}</td><td style={td}>{natureLabels[row.nature] || row.nature || "-"}</td><td style={td}>{placementLabels[row.report_placement] || "Not mapped"}</td><td style={td}>{row.transactions}</td><td style={{ ...td, textAlign: "right" }}>{fmt(row.receipts)}</td><td style={{ ...td, textAlign: "right" }}>{fmt(row.payments)}</td><td style={{ ...td, textAlign: "right", fontWeight: 800 }}>{fmt(row.net_movement)}</td></tr>)}
              {!groupReport.length && <tr><td style={td} colSpan={11}>No transactions found.</td></tr>}
            </tbody></table></div>
          </section>}

          {tab === "groupcompany" && <section className="bank-financial-print-area" style={panel}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}><h2 style={{ margin: "0 0 12px", fontSize: 18 }}>Group Company-wise Report</h2>{reportPrintButton() }</div>
            <p style={{ margin: "0 0 12px", color: "#64748b", fontSize: 12 }}>Every Particulars / Ledger is assigned to one Group Company in Particulars Mapping. This report splits Receipt, Payment, P&L Income and Expense by that tag.</p>
            <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", minWidth: 950 }}><thead><tr>{["Period","Group Company","Ledger Names","Ledgers","Transactions","Receipts","Payments","P&L Income","P&L Expenses","Net Profit / (Loss)"].map((x) => <th key={x} style={th}>{x}</th>)}</tr></thead><tbody>
              {groupCompanyReport.map((row, index) => <tr key={`${row.group_company}-${row.period_label}-${index}`}><td style={td}>{row.period_label || "Selected Period"}</td><td style={td}><b>{row.group_company}</b></td><td style={td}>{(row.ledger_names || []).join(", ") || "-"}</td><td style={td}>{row.ledgers}</td><td style={td}>{row.transactions}</td><td style={{ ...td, textAlign: "right" }}>{fmt(row.receipts)}</td><td style={{ ...td, textAlign: "right" }}>{fmt(row.payments)}</td><td style={{ ...td, textAlign: "right" }}>{fmt(row.income)}</td><td style={{ ...td, textAlign: "right" }}>{fmt(row.expenses)}</td><td style={{ ...td, textAlign: "right", fontWeight: 800 }}>{fmt(row.net_profit)}</td></tr>)}
              {!groupCompanyReport.length && <tr><td style={td} colSpan={10}>No transactions found. Assign a Group Company to Particulars / Ledger mappings first.</td></tr>}
            </tbody></table></div>
            <p style={{ color: "#92400e", background: "#fffbeb", border: "1px solid #fde68a", padding: 10, borderRadius: 7, fontSize: 12 }}>Unassigned rows appear separately until you assign their Group Company. Contra entries remain excluded from P&L calculations.</p>
          </section>}

          {tab === "profitloss" && <section className="bank-financial-print-area" style={panel}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}><h2 style={{ margin: "0 0 12px", fontSize: 18 }}>Profit & Loss Report</h2>{reportPrintButton() }</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
              {card("Income", fmt(profitLoss.income), "Mapped P&L Income groups")}
              {card("Expenses", fmt(profitLoss.expense), "Mapped P&L Expense groups")}
              {card("Net Profit / (Loss)", fmt(profitLoss.net_profit), profitLoss.net_profit >= 0 ? "Net Profit" : "Net Loss")}
            </div>
            <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse" }}><thead><tr>{["Period","Group","Sub-group","Ledger Name","Group Company","Nature","Amount"].map((x) => <th key={x} style={th}>{x}</th>)}</tr></thead><tbody>
              {(profitLoss.rows || []).map((row,i) => <tr key={`${row.period_label}-${row.group_name}-${row.subgroup_name}-${i}`}><td style={td}>{row.period_label || "Selected Period"}</td><td style={td}><b>{row.group_name}</b></td><td style={td}>{row.subgroup_name || "-"}</td><td style={td}>{row.ledger_name || "-"}</td><td style={td}>{row.group_company || "Unassigned"}</td><td style={td}>{natureLabels[row.nature]}</td><td style={{ ...td, textAlign: "right" }}>{fmt(row.amount)}</td></tr>)}
              {!(profitLoss.rows || []).length && <tr><td style={td} colSpan={7}>No P&L ledger mappings in the selected period. Map direct income / expense ledgers in Particulars Mapping.</td></tr>}
            </tbody></table></div>
            <p style={{ color: "#92400e", background: "#fffbeb", border: "1px solid #fde68a", padding: 10, borderRadius: 7, fontSize: 12 }}>Contra vouchers are excluded from P&L. Customer receipts and supplier payments mapped to Balance Sheet remain settlements, not new income or expense. Warehouse Sale / Purchase totals are included when you create the matching Source Groups in Group Master. Purchase values are shown as trading purchases; opening/closing stock, production cost and cost-of-goods-sold adjustments are not yet calculated, so treat Net Profit as provisional until those stock adjustments are entered.</p>
          </section>}

          {tab === "balancesheet" && <section className="bank-financial-print-area" style={panel}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}><h2 style={{ margin: "0 0 12px", fontSize: 18 }}>Balance Sheet</h2>{reportPrintButton() }</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
              {card("Assets", fmt(balanceSheet.total_assets), "Debit-normal balance")}
              {card("Liabilities", fmt(balanceSheet.total_liabilities), "Credit-normal balance")}
              {card("Capital / Equity", fmt(balanceSheet.total_equity), "Credit-normal balance")}
              {card("Difference", fmt(balanceSheet.difference), "Assets − Liabilities − Equity")}
            </div>
            <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}><thead><tr>{["Group","Sub-group","Ledger Names / Details","Group Company","Nature","Closing Balance"].map((x) => <th key={x} style={th}>{x}</th>)}</tr></thead><tbody>
              {(balanceSheet.rows || []).map((row,i) => <tr key={`${row.group_name}-${row.subgroup_name}-${i}`}><td style={td}><b>{row.group_name}</b></td><td style={td}>{row.subgroup_name || "-"}</td><td style={td}>{row.ledgers?.length ? <details><summary style={{ cursor: "pointer", color: "#0f766e", fontWeight: 700 }}>{row.ledgers.length} Ledger(s)</summary><div style={{ minWidth: 240, paddingTop: 6 }}>{row.ledgers.map((ledger, ledgerIndex) => <div key={`${ledger.particulars_name}-${ledgerIndex}`} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "4px 0", borderBottom: "1px solid #e2e8f0" }}><span>{ledger.particulars_name}</span><b>{fmt(ledger.normal_balance)}</b></div>)}</div></details> : "-"}</td><td style={td}>{row.group_company || "Unassigned"}</td><td style={td}>{natureLabels[row.nature]}</td><td style={{ ...td, textAlign: "right" }}>{fmt(row.balance)}</td></tr>)}
              {!(balanceSheet.rows || []).length && <tr><td style={td} colSpan={6}>No Balance Sheet ledger mappings. Map Assets, Liabilities and Capital groups first.</td></tr>}
            </tbody></table></div>
            <p style={{ color: "#92400e", background: "#fffbeb", border: "1px solid #fde68a", padding: 10, borderRadius: 7, fontSize: 12 }}>Bank balances use manually saved Bank Opening Balances plus statement Receipt / Payment movements. Where an opening balance has not been entered, the report falls back to the latest imported Bank Balance column when available. A complete Balance Sheet also needs non-bank assets, liabilities, stock, debtors, creditors, tax balances and other journal/account entries.</p>
          </section>}

          {tab === "bankbalance" && <>
            <section className="bank-financial-no-print" style={{ ...panel, marginBottom: 12 }}>
              <h2 style={{ margin: "0 0 6px", fontSize: 18 }}>Set Bank Opening Balance</h2>
              <p style={{ margin: "0 0 12px", color: "#64748b", fontSize: 12 }}>Enter the bank balance at the start of the Effective Date. Dr is a positive bank balance; Cr is OD / negative bank balance. This opening is used to calculate day-wise, monthly and selected-date closing balances.</p>
              <form onSubmit={saveBankOpeningBalance} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 9, alignItems: "end" }}>
                <label style={{ ...label, margin: 0 }}>Bank Name<input required list="bank-opening-name-options" value={bankOpeningForm.bank_name} onChange={(e) => setBankOpeningForm((p) => ({ ...p, bank_name: e.target.value }))} placeholder="Enter / select bank" style={{ ...input, marginTop: 4 }} /></label>
                <label style={{ ...label, margin: 0 }}>Opening Balance Date<input required type="date" value={bankOpeningForm.effective_date} onChange={(e) => setBankOpeningForm((p) => ({ ...p, effective_date: e.target.value }))} style={{ ...input, marginTop: 4 }} /></label>
                <label style={{ ...label, margin: 0 }}>Opening Balance<input required type="number" min="0" step="0.01" value={bankOpeningForm.opening_balance} onChange={(e) => setBankOpeningForm((p) => ({ ...p, opening_balance: e.target.value }))} placeholder="0.00" style={{ ...input, marginTop: 4 }} /></label>
                <label style={{ ...label, margin: 0 }}>Balance Type<select value={bankOpeningForm.opening_balance_type} onChange={(e) => setBankOpeningForm((p) => ({ ...p, opening_balance_type: e.target.value }))} style={{ ...input, marginTop: 4 }}><option value="dr">Dr – Bank Balance</option><option value="cr">Cr – Bank OD</option></select></label>
                <label style={{ ...label, margin: 0 }}>Remarks<input value={bankOpeningForm.notes} onChange={(e) => setBankOpeningForm((p) => ({ ...p, notes: e.target.value }))} placeholder="Optional" style={{ ...input, marginTop: 4 }} /></label>
                <button type="submit" disabled={saving} style={primary}>{saving ? "Saving..." : "Save / Update Opening"}</button>
              </form>
              <datalist id="bank-opening-name-options">{(summary.bank_names || []).map((name) => <option key={name} value={name} />)}</datalist>
              <div style={{ overflowX: "auto", marginTop: 12 }}><table style={{ width: "100%", borderCollapse: "collapse" }}><thead><tr>{["Bank","Effective Date","Opening Balance","Type","Remarks","Action"].map((x) => <th key={x} style={th}>{x}</th>)}</tr></thead><tbody>
                {bankOpeningBalances.map((row) => <tr key={row._id || row.id}><td style={td}><b>{row.bank_name}</b></td><td style={td}>{dateLabel(row.effective_date)}</td><td style={{ ...td, textAlign: "right" }}>{fmt(row.opening_balance)}</td><td style={td}>{String(row.opening_balance_type || "dr").toUpperCase()}</td><td style={td}>{row.notes || "-"}</td><td style={td}><button type="button" onClick={() => editBankOpeningBalance(row)} style={secondary}>Edit</button> <button type="button" onClick={() => deleteBankOpeningBalance(row)} style={{ ...secondary, color: "#b91c1c" }}>Remove</button></td></tr>)}
                {!bankOpeningBalances.length && <tr><td style={td} colSpan={6}>No Bank Opening Balance entered yet.</td></tr>}
              </tbody></table></div>
            </section>
            <section className="bank-financial-print-area" style={{ ...panel, padding: 20, borderRadius: 16, borderColor: "#cfdae7", background: "linear-gradient(180deg, #ffffff 0%, #f8fbfe 100%)", boxShadow: "0 12px 30px rgba(15, 35, 65, .07)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}><div><h2 style={{ margin: "0 0 5px", fontSize: 20, letterSpacing: "-.02em", color: "#153453" }}>Multi-Bank / Single-Bank Balance Report</h2><p style={{ margin: 0, color: "#64748b", fontSize: 12 }}>All Banks combines every bank; choosing one bank shows its separate balance.</p><p style={{ margin: "4px 0 0", color: "#334155", fontSize: 11 }}>Applied: {appliedFilters.bank_name || "All Banks"} · {appliedFilters.from_date || "First available date"} to {appliedFilters.to_date || "Latest date"} · {appliedFilters.period_type === "daily" ? "Day-wise" : appliedFilters.period_type === "monthly" ? "Monthly" : "Selected Date Range"}{appliedFilters.group_company ? ` · Group Company: ${appliedFilters.group_company === "__unassigned__" ? "Unassigned" : appliedFilters.group_company}` : ""}{appliedFilters.group_id ? ` · Group: ${groups.find((item) => String(item._id) === String(appliedFilters.group_id))?.name || "Selected"}` : ""}{appliedFilters.subgroup_id ? ` · Sub-group: ${subgroups.find((item) => String(item._id) === String(appliedFilters.subgroup_id))?.name || "Selected"}` : ""}</p></div>{reportPrintButton() }</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, margin: "12px 0" }}>
                {card("Opening Balance", fmt(bankBalanceReport.totals?.opening_balance), "At selected From Date")}
                {card("Total Receipts", fmt(bankBalanceReport.totals?.receipts), "Selected period")}
                {card("Total Payments", fmt(bankBalanceReport.totals?.payments), "Selected period")}
                {card("Closing Balance", fmt(bankBalanceReport.totals?.closing_balance), "Opening + Receipts − Payments")}
              </div>
              {bankBalanceReport.opening_balance_missing_banks?.length > 0 && <p className="bank-financial-no-print" style={{ color: "#92400e", background: "#fffbeb", border: "1px solid #fde68a", padding: 10, borderRadius: 7, fontSize: 12 }}>Opening Balance not entered for: {bankBalanceReport.opening_balance_missing_banks.join(", ")}. Enter the opening balance above for accurate day-wise and monthly balances.</p>}
              <div style={reportTableWrap}><table style={{ ...reportTable, minWidth: 1040 }}>
                <colgroup><col style={{ width: "11%" }} /><col style={{ width: "14%" }} /><col style={{ width: "14%" }} /><col style={{ width: "12%" }} /><col style={{ width: "12%" }} /><col style={{ width: "14%" }} /><col style={{ width: "8%" }} /><col style={{ width: "15%" }} /></colgroup>
                <thead><tr>{["Period","Bank Name","Opening Balance","Receipts","Payments","Closing Balance","Transactions","Opening Source"].map((x) => <th key={x} style={reportHeadCell}>{x}</th>)}</tr></thead><tbody>
                {(bankBalanceReport.rows || []).map((row, index) => <tr key={`${row.bank_name}-${row.period}-${index}`} style={{ background: index % 2 ? "#f7fafc" : "#fff" }}>
                  <td style={reportBodyCell}>{row.period}</td><td style={reportBodyCell}><b style={{ color: "#17365d" }}>{row.bank_name}</b></td>
                  <td style={reportAmountCell}>{fmt(row.opening_balance)}</td><td style={{ ...reportAmountCell, color: "#087f5b", fontWeight: 700 }}>{fmt(row.receipts)}</td>
                  <td style={{ ...reportAmountCell, color: "#b45309", fontWeight: 700 }}>{fmt(row.payments)}</td><td style={{ ...reportAmountCell, color: "#123f63", fontWeight: 900 }}>{fmt(row.closing_balance)}</td>
                  <td style={{ ...reportBodyCell, textAlign: "center", fontWeight: 800 }}>{row.transactions}</td><td style={reportBodyCell}>{row.opening_balance_source || (row.opening_balance_set ? "Manual" : "Missing")}</td>
                </tr>)}
                {!bankBalanceReport.rows?.length && <tr><td style={reportBodyCell} colSpan={8}>No bank transactions found for the selected bank and date range.</td></tr>}
              </tbody></table></div>
              <div style={{ marginTop: 22, paddingTop: 18, borderTop: "1px solid #d8e3ed" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end", gap: 10, flexWrap: "wrap", marginBottom: 13 }}>
                  <div>
                    <h3 style={{ margin: "0 0 5px", fontSize: 17, color: "#17365d", letterSpacing: "-.01em" }}>
                      {bankBalanceViewMode === "full_details" ? "Full Transaction Details" : appliedFilters.period_type === "daily" ? "Sub-group-wise Day-wise Summary" : appliedFilters.period_type === "monthly" ? "Sub-group-wise Monthly Summary" : "Sub-group-wise Summary"}
                    </h3>
                    <p style={{ margin: 0, color: "#64748b", fontSize: 11 }}>
                      {bankBalanceViewMode === "full_details"
                        ? "All transaction allocations are listed below. Use Show / Hide on the right to view or hide extra bank remarks and instrument details."
                        : "Each Sub-group appears once per Period, Group Company and Group. Ledgers and selected Banks under that Sub-group are combined into one total. Click the Sub-group name to open its transaction details."}
                    </p>
                  </div>
                  <div style={{ fontSize: 11, color: "#155e75", fontWeight: 900, background: "#e8f4f7", border: "1px solid #c8e3e8", borderRadius: 999, padding: "7px 12px", whiteSpace: "nowrap" }}>{bankBalanceViewMode === "full_details" ? `${(bankBalanceReport.details || []).length} DETAIL ROW(S)` : `${(bankBalanceReport.summary_rows || []).length} SUB-GROUP ROW(S)`}</div>
                </div>

                {bankBalanceViewMode === "summary" ? (
                  <div style={reportTableWrap}>
                    <table style={{ ...reportTable, minWidth: 1180 }}>
                      <colgroup>
                        <col style={{ width: "8%" }} /><col style={{ width: "12%" }} /><col style={{ width: "12%" }} />
                        <col style={{ width: "13%" }} /><col style={{ width: "16%" }} /><col style={{ width: "11%" }} />
                        <col style={{ width: "11%" }} /><col style={{ width: "10%" }} /><col style={{ width: "7%" }} />
                      </colgroup>
                      <thead><tr>{["Period","Bank Name","Group Company","Group","Sub-group","Total Receipt","Total Payment","Total Amount","Transactions"].map((title) => <th key={title} style={reportHeadCell}>{title}</th>)}</tr></thead>
                      <tbody>
                        {(bankBalanceReport.summary_rows || []).map((summaryRow, rowIndex) => (
                          <tr key={summaryRow.summary_key} style={{ background: rowIndex % 2 ? "#f7fafc" : "#fff" }}>
                            <td style={{ ...reportBodyCell, whiteSpace: "nowrap", color: "#536579", fontWeight: 700 }}>{summaryRow.period}</td>
                            <td style={reportBodyCell}><b style={{ color: "#17365d" }}>{summaryRow.bank_name || "-"}</b>{summaryRow.bank_names?.length > 1 && <div style={{ color: "#64748b", fontSize: 10, marginTop: 3, lineHeight: 1.4 }}>{summaryRow.bank_names.join(", ")}</div>}</td>
                            <td style={reportBodyCell}>{summaryRow.group_company || "Unassigned"}</td>
                            <td style={reportBodyCell}>{summaryRow.group_name || "Unmapped"}</td>
                            <td style={reportBodyCell}>
                              <button type="button" onClick={() => { setSelectedSubgroupSummary(summaryRow); setExpandedBankDetailRows({}); }} style={{ border: 0, padding: 0, background: "transparent", color: "#087f8c", fontWeight: 900, cursor: "pointer", textAlign: "left", textDecoration: "none", borderBottom: "1px dashed #0f9aa7", lineHeight: 1.5 }}>{summaryRow.subgroup_name || "No Sub-group"}</button>
                              <div style={{ color: "#718096", fontSize: 10, marginTop: 4 }}>{(summaryRow.ledger_names || []).length} Ledger(s) · Click for details</div>
                            </td>
                            <td style={{ ...reportAmountCell, color: Number(summaryRow.receipts || 0) ? "#087f5b" : "#94a3b8", fontWeight: Number(summaryRow.receipts || 0) ? 800 : 500 }}>{Number(summaryRow.receipts || 0) ? fmt(summaryRow.receipts) : "—"}</td>
                            <td style={{ ...reportAmountCell, color: Number(summaryRow.payments || 0) ? "#b45309" : "#94a3b8", fontWeight: Number(summaryRow.payments || 0) ? 800 : 500 }}>{Number(summaryRow.payments || 0) ? fmt(summaryRow.payments) : "—"}</td>
                            <td style={{ ...reportAmountCell, color: "#123f63", fontWeight: 900, background: rowIndex % 2 ? "#f0f6fa" : "#f5f9fc" }}>{fmt(summaryRow.total_amount)}</td>
                            <td style={{ ...reportBodyCell, textAlign: "center", fontWeight: 900, color: "#334155" }}>{summaryRow.transactions}</td>
                          </tr>
                        ))}
                        {!(bankBalanceReport.summary_rows || []).length && <tr><td style={reportBodyCell} colSpan={9}>No Sub-group summary matches the selected filters.</td></tr>}
                      </tbody>
                      <tfoot><tr>
                        <td style={{ ...reportTotalCell, textAlign: "left" }} colSpan={5}>SUB-GROUP TOTALS</td>
                        <td style={{ ...reportTotalCell, color: "#087f5b" }}>{fmt((bankBalanceReport.summary_rows || []).reduce((sum, row) => sum + Number(row.receipts || 0), 0))}</td>
                        <td style={{ ...reportTotalCell, color: "#b45309" }}>{fmt((bankBalanceReport.summary_rows || []).reduce((sum, row) => sum + Number(row.payments || 0), 0))}</td>
                        <td style={{ ...reportTotalCell, color: "#123f63" }}>{fmt((bankBalanceReport.summary_rows || []).reduce((sum, row) => sum + Number(row.total_amount || 0), 0))}</td>
                        <td style={{ ...reportTotalCell, textAlign: "center" }}>—</td>
                      </tr></tfoot>
                    </table>
                  </div>
                ) : renderBankBalanceDetailsTable(bankBalanceReport.details || [])}
                <p className="bank-financial-no-print" style={{ margin: "8px 0 0", color: "#64748b", fontSize: 11 }}>Bank Remarks and Tally Date remain hidden until Show is clicked. Monthly Periods use the full month name. Transactions are ordered by Bank Date and time from earliest to latest. Split allocations are combined in Summary and displayed separately in Full Details without multiplying Bank Balance movements.</p>
              </div>

              {selectedSubgroupSummary && bankBalanceViewMode === "summary" && (() => {
                const popupDetails = bankBalanceDetailsBySummary[selectedSubgroupSummary.summary_key] || [];
                return <div className="bank-financial-no-print" role="dialog" aria-modal="true" aria-label="Sub-group transaction details" onClick={() => setSelectedSubgroupSummary(null)} style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(15,23,42,.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 18 }}>
                  <div onClick={(event) => event.stopPropagation()} style={{ width: "min(1500px, 98vw)", maxHeight: "90vh", overflow: "auto", background: "linear-gradient(180deg, #ffffff 0%, #f8fbfe 100%)", border: "1px solid #d5e1ec", borderRadius: 18, padding: 20, boxShadow: "0 24px 70px rgba(4, 25, 48, .32)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 12, marginBottom: 12 }}>
                      <div><h3 style={{ margin: 0, fontSize: 18, color: "#17365d" }}>{selectedSubgroupSummary.subgroup_name || "No Sub-group"} · Full Details</h3><p style={{ margin: "5px 0 0", color: "#64748b", fontSize: 12 }}>{selectedSubgroupSummary.period} · {selectedSubgroupSummary.group_company || "Unassigned"} · {selectedSubgroupSummary.group_name || "Unmapped"}</p><div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 8, fontSize: 12 }}><b>Receipt: {fmt(selectedSubgroupSummary.receipts)}</b><b>Payment: {fmt(selectedSubgroupSummary.payments)}</b><b>Total: {fmt(selectedSubgroupSummary.total_amount)}</b><b>Transactions: {selectedSubgroupSummary.transactions}</b></div></div>
                      <button type="button" onClick={() => setSelectedSubgroupSummary(null)} style={{ ...secondary, borderColor: "#c7d7e4", borderRadius: 9, padding: "9px 16px", color: "#17365d" }}>Close</button>
                    </div>
                    <div style={{ color: "#64748b", fontSize: 11, marginBottom: 8 }}>Ledgers: {(selectedSubgroupSummary.ledger_names || []).join(", ") || "-"} · Banks: {(selectedSubgroupSummary.bank_names || []).join(", ") || "-"}</div>
                    {renderBankBalanceDetailsTable(popupDetails)}
                  </div>
                </div>;
              })()}

            </section>
          </>}
        </>
      )}
    </main>
  );
}
