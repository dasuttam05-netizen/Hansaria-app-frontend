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
const money = (value) => `₹${Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const dateLabel = (value) => value ? new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" }) : "-";
const natureLabels = { asset: "Asset", liability: "Liability", equity: "Capital / Equity", income: "Income", expense: "Expense", other: "Other / Excluded" };
const placementLabels = { balance_sheet: "Balance Sheet", profit_loss: "Profit & Loss", exclude: "Exclude from Statements" };
const sourceLabels = { bank_statement: "Bank Statement Particulars", warehouse_sale: "Warehouse Sale Vouchers", warehouse_purchase: "Warehouse Purchase Vouchers" };
const initialGroup = { name: "", source_type: "bank_statement", nature: "expense", report_placement: "profit_loss", sort_order: "0" };
const initialSubGroup = { name: "", group_id: "", sort_order: "0" };

const tabs = [
  ["import", "Bank Statement Import"],
  ["groups", "Group Master"],
  ["subgroups", "Sub-group Master"],
  ["mapping", "Particulars Mapping"],
  ["statement", "Bank Statement"],
  ["groupwise", "Group-wise Report"],
  ["profitloss", "Profit & Loss"],
  ["balancesheet", "Balance Sheet"],
];

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
  const [groupForm, setGroupForm] = useState(initialGroup);
  const [subGroupForm, setSubGroupForm] = useState(initialSubGroup);
  const [file, setFile] = useState(null);
  const [importResult, setImportResult] = useState(null);
  const [mappingSearch, setMappingSearch] = useState("");
  const [filters, setFilters] = useState({ from_date: "", to_date: "", bank_name: "", voucher_type: "" });
  const [appliedFilters, setAppliedFilters] = useState({ from_date: "", to_date: "", bank_name: "", voucher_type: "" });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const next = searchParams.get("tab") || "import";
    if (tabs.some(([key]) => key === next)) setTab(next);
  }, [searchParams]);

  const params = useMemo(() => Object.fromEntries(Object.entries(appliedFilters).filter(([, value]) => value !== "")), [appliedFilters]);

  const loadMasters = useCallback(async () => {
    const [groupRes, subRes, mappingRes, summaryRes] = await Promise.all([
      axios.get(`${API_BASE}/groups`),
      axios.get(`${API_BASE}/subgroups`),
      axios.get(`${API_BASE}/ledger-mappings`),
      axios.get(`${API_BASE}/summary`),
    ]);
    setGroups(Array.isArray(groupRes.data) ? groupRes.data : []);
    setSubgroups(Array.isArray(subRes.data) ? subRes.data : []);
    setMappings(Array.isArray(mappingRes.data) ? mappingRes.data : []);
    setSummary(summaryRes.data || {});
  }, []);

  const loadCurrentReport = useCallback(async (selectedTab = tab, filterParams = params) => {
    if (selectedTab === "statement") {
      const res = await axios.get(`${API_BASE}/transactions`, { params: { ...filterParams, limit: 1000 } });
      setTransactions(Array.isArray(res.data) ? res.data : []);
    } else if (selectedTab === "groupwise") {
      const res = await axios.get(`${API_BASE}/reports/groupwise`, { params: filterParams });
      setGroupReport(Array.isArray(res.data) ? res.data : []);
    } else if (selectedTab === "profitloss") {
      const res = await axios.get(`${API_BASE}/reports/profit-loss`, { params: filterParams });
      setProfitLoss(res.data || { income: 0, expense: 0, net_profit: 0, rows: [] });
    } else if (selectedTab === "balancesheet") {
      const res = await axios.get(`${API_BASE}/reports/balance-sheet`, { params: filterParams });
      setBalanceSheet(res.data || { total_assets: 0, total_liabilities: 0, total_equity: 0, liabilities_plus_equity: 0, difference: 0, rows: [] });
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

  const createGroup = async (event) => {
    event.preventDefault(); setSaving(true); setError(""); setNotice("");
    try {
      await axios.post(`${API_BASE}/groups`, { ...groupForm, sort_order: Number(groupForm.sort_order || 0) });
      setGroupForm(initialGroup); await loadMasters(); setNotice("Group Master saved successfully.");
    } catch (err) { setError(err.response?.data?.error || err.message); }
    finally { setSaving(false); }
  };

  const createSubGroup = async (event) => {
    event.preventDefault(); setSaving(true); setError(""); setNotice("");
    try {
      await axios.post(`${API_BASE}/subgroups`, { ...subGroupForm, sort_order: Number(subGroupForm.sort_order || 0) });
      setSubGroupForm(initialSubGroup); await loadMasters(); setNotice("Sub-group Master saved successfully.");
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
      setNotice("Bank Statement imported. Please map the Particulars before using P&L and Balance Sheet.");
    } catch (err) { setError(err.response?.data?.error || err.message || "Bank Statement import failed."); }
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
        group_id: row.group_id,
        subgroup_id: row.subgroup_id,
        opening_balance: row.opening_balance,
        opening_balance_type: row.opening_balance_type,
      });
      await loadMasters(); setNotice(`Mapping saved: ${row.particulars_name}`);
    } catch (err) { setError(err.response?.data?.error || err.message); }
    finally { setSaving(false); }
  };

  const filteredMappings = useMemo(() => {
    const q = mappingSearch.trim().toLowerCase();
    return !q ? mappings : mappings.filter((row) => String(row.particulars_name || "").toLowerCase().includes(q));
  }, [mappings, mappingSearch]);

  const applyFilters = async () => {
    setAppliedFilters({ ...filters });
  };

  const fmt = money;
  const card = (title, value, note) => (
    <div key={title} style={{ ...panel, minWidth: 150, flex: "1 1 160px" }}>
      <div style={{ color: "#64748b", fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: .5 }}>{title}</div>
      <div style={{ marginTop: 6, color: "#0f172a", fontWeight: 900, fontSize: 20 }}>{value}</div>
      {note && <div style={{ color: "#64748b", fontSize: 11, marginTop: 4 }}>{note}</div>}
    </div>
  );

  return (
    <main style={{ minHeight: "100vh", background: "#f1f5f9", padding: 16, fontFamily: "Segoe UI, Arial, sans-serif", color: "#0f172a" }}>
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
            <p style={{ margin: "0 0 14px", color: "#64748b", fontSize: 12 }}>Upload the Tally-reconciled bank statement Excel. Existing A:P headers must remain unchanged.</p>
            <label style={label}>Select Excel File (.xls / .xlsx)</label>
            <input type="file" accept=".xls,.xlsx,.csv" onChange={(e) => setFile(e.target.files?.[0] || null)} style={{ ...input, padding: 7 }} />
            {file && <div style={{ marginTop: 8, fontSize: 12, color: "#0f766e", fontWeight: 700 }}>{file.name}</div>}
            <button disabled={saving || !file} type="submit" style={{ ...primary, marginTop: 14, opacity: saving || !file ? .6 : 1 }}>{saving ? "Importing..." : "Import Bank Statement"}</button>
            {importResult && <div style={{ marginTop: 16, padding: 13, borderRadius: 8, background: "#f0fdfa", border: "1px solid #99f6e4" }}>
              <strong style={{ color: "#115e59" }}>Import Result</strong>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8, marginTop: 10, fontSize: 12 }}>
                <span>Total Rows: <b>{importResult.total_rows}</b></span><span>Imported: <b>{importResult.imported_rows}</b></span>
                <span>Duplicates: <b>{importResult.duplicate_rows}</b></span><span>Invalid: <b>{importResult.invalid_rows}</b></span>
                <span>Receipts: <b>{fmt(importResult.total_receipts)}</b></span><span>Payments: <b>{fmt(importResult.total_payments)}</b></span>
              </div>
              {importResult.invalid_details?.length > 0 && <div style={{ marginTop: 9, color: "#b91c1c" }}>{importResult.invalid_details.map((item) => <div key={item.row}>Row {item.row}: {item.reason}</div>)}</div>}
            </div>}
          </form>
          <div style={panel}>
            <h2 style={{ margin: "0 0 8px", fontSize: 18 }}>Excel Column Rules</h2>
            <div style={{ display: "grid", gridTemplateColumns: "55px 1fr", gap: 8, fontSize: 12 }}>
              {[["A", "Transaction Date"], ["D", "Bank Name"], ["L", "Particulars / Ledger Name"], ["M", "Payment / Receipt / Contra"], ["N", "Voucher Number"], ["O", "Receipt Amount"], ["P", "Payment Amount"]].map(([col, desc]) => <React.Fragment key={col}><b style={{ padding: 7, borderRadius: 5, background: "#e2e8f0", textAlign: "center" }}>{col}</b><span style={{ padding: 7 }}>{desc}</span></React.Fragment>)}
            </div>
            <div style={{ marginTop: 14, padding: 12, background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8, color: "#92400e", fontSize: 12, lineHeight: 1.55 }}>
              <b>Important accounting rule</b><br />Receipt against an existing Sale is Debtor Settlement, not a second Sales entry. Payment against an existing Purchase is Creditor Settlement, not a second Purchase entry. Contra entries are not P&L income or expense.
            </div>
          </div>
        </section>
      )}

      {tab === "groups" && (
        <section style={{ display: "grid", gridTemplateColumns: "minmax(280px,.7fr) minmax(320px,1.3fr)", gap: 14 }}>
          <form onSubmit={createGroup} style={panel}>
            <h2 style={{ margin: "0 0 12px", fontSize: 18 }}>Create Group</h2>
            <label style={label}>Group Name</label><input required value={groupForm.name} onChange={(e) => setGroupForm((p) => ({ ...p, name: e.target.value }))} style={input} placeholder="e.g. Sundry Debtors" />
            <label style={{ ...label, marginTop: 10 }}>Group Source</label><select value={groupForm.source_type || "bank_statement"} onChange={(e) => { const source = e.target.value; setGroupForm((p) => ({ ...p, source_type: source, nature: source === "warehouse_sale" ? "income" : source === "warehouse_purchase" ? "expense" : p.nature, report_placement: source === "bank_statement" ? p.report_placement : "profit_loss" })); }} style={input}>{Object.entries(sourceLabels).map(([key,value]) => <option key={key} value={key}>{value}</option>)}</select>
            <label style={{ ...label, marginTop: 10 }}>Account Nature</label><select disabled={groupForm.source_type !== "bank_statement"} value={groupForm.nature} onChange={(e) => setGroupForm((p) => ({ ...p, nature: e.target.value }))} style={{ ...input, background: groupForm.source_type !== "bank_statement" ? "#f1f5f9" : "#fff" }}>{Object.entries(natureLabels).map(([key,value]) => <option key={key} value={key}>{value}</option>)}</select>
            <label style={{ ...label, marginTop: 10 }}>Where should this Group appear?</label><select disabled={groupForm.source_type !== "bank_statement"} value={groupForm.report_placement} onChange={(e) => setGroupForm((p) => ({ ...p, report_placement: e.target.value }))} style={{ ...input, background: groupForm.source_type !== "bank_statement" ? "#f1f5f9" : "#fff" }}>{Object.entries(placementLabels).map(([key,value]) => <option key={key} value={key}>{value}</option>)}</select>
            {groupForm.source_type !== "bank_statement" && <p style={{ color: "#475569", fontSize: 11, margin: "8px 0 0" }}>This source is connected to existing Warehouse vouchers automatically. Account Nature and Profit & Loss placement are fixed for this source.</p>}
            <label style={{ ...label, marginTop: 10 }}>Display Order</label><input type="number" value={groupForm.sort_order} onChange={(e) => setGroupForm((p) => ({ ...p, sort_order: e.target.value }))} style={input} />
            <button type="submit" disabled={saving} style={{ ...primary, marginTop: 13 }}>{saving ? "Saving..." : "Save Group"}</button>
          </form>
          <div style={panel}>
            <h2 style={{ margin: "0 0 12px", fontSize: 18 }}>Group Master List</h2>
            <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse" }}><thead><tr>{["Group Name","Source","Nature","Report Placement"].map((x) => <th key={x} style={th}>{x}</th>)}</tr></thead><tbody>
              {groups.map((row) => <tr key={row._id}><td style={td}><b>{row.name}</b></td><td style={td}>{sourceLabels[row.source_type || "bank_statement"] || "Bank Statement Particulars"}</td><td style={td}>{natureLabels[row.nature] || row.nature}</td><td style={td}>{placementLabels[row.report_placement] || row.report_placement}</td></tr>)}
              {!groups.length && <tr><td style={td} colSpan={4}>No Groups created yet.</td></tr>}
            </tbody></table></div>
          </div>
        </section>
      )}

      {tab === "subgroups" && (
        <section style={{ display: "grid", gridTemplateColumns: "minmax(280px,.7fr) minmax(320px,1.3fr)", gap: 14 }}>
          <form onSubmit={createSubGroup} style={panel}>
            <h2 style={{ margin: "0 0 12px", fontSize: 18 }}>Create Sub-group</h2>
            <label style={label}>Sub-group Name</label><input required value={subGroupForm.name} onChange={(e) => setSubGroupForm((p) => ({ ...p, name: e.target.value }))} style={input} placeholder="e.g. Assam Customers" />
            <label style={{ ...label, marginTop: 10 }}>Under Group</label><select required value={subGroupForm.group_id} onChange={(e) => setSubGroupForm((p) => ({ ...p, group_id: e.target.value }))} style={input}><option value="">Select Group</option>{groups.filter((g) => !g.source_type || g.source_type === "bank_statement").map((g) => <option key={g._id} value={g._id}>{g.name}</option>)}</select>
            <label style={{ ...label, marginTop: 10 }}>Display Order</label><input type="number" value={subGroupForm.sort_order} onChange={(e) => setSubGroupForm((p) => ({ ...p, sort_order: e.target.value }))} style={input} />
            <button type="submit" disabled={saving || !groups.some((g) => !g.source_type || g.source_type === "bank_statement")} style={{ ...primary, marginTop: 13 }}>{saving ? "Saving..." : "Save Sub-group"}</button>
          </form>
          <div style={panel}>
            <h2 style={{ margin: "0 0 12px", fontSize: 18 }}>Sub-group Master List</h2>
            <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse" }}><thead><tr><th style={th}>Sub-group</th><th style={th}>Under Group</th></tr></thead><tbody>
              {subgroups.map((row) => <tr key={row._id}><td style={td}><b>{row.name}</b></td><td style={td}>{row.group_name}</td></tr>)}
              {!subgroups.length && <tr><td style={td} colSpan={2}>No Sub-groups created yet.</td></tr>}
            </tbody></table></div>
          </div>
        </section>
      )}

      {tab === "mapping" && (
        <section style={panel}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
            <div><h2 style={{ margin: 0, fontSize: 18 }}>Particulars → Group / Sub-group Mapping</h2><p style={{ margin: "5px 0 0", color: "#64748b", fontSize: 12 }}>Names are read automatically from Excel Column L. Select where each name belongs.</p></div>
            <input value={mappingSearch} onChange={(e) => setMappingSearch(e.target.value)} placeholder="Search Particulars name..." style={{ ...input, maxWidth: 280 }} />
          </div>
          {!groups.length && <div style={{ padding: 12, background: "#fffbeb", color: "#92400e", borderRadius: 7, marginBottom: 10 }}>First create Groups in Group Master, then map Particulars here.</div>}
          <div style={{ overflowX: "auto", maxHeight: "68vh" }}><table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1050 }}><thead><tr>{["Particulars / Ledger","Rows","Group","Sub-group","Opening Balance","Dr/Cr","Report Placement","Action"].map((x) => <th key={x} style={th}>{x}</th>)}</tr></thead><tbody>
            {filteredMappings.map((row) => {
              const allowedSubgroups = subgroups.filter((sub) => String(sub.group_id) === String(row.group_id));
              return <tr key={row.normalized_name} style={{ background: row.mapped ? "#fff" : "#fffdf5" }}>
                <td style={{ ...td, fontWeight: 800, minWidth: 210 }}>{row.particulars_name}</td>
                <td style={td}>{row.transaction_count}</td>
                <td style={{ ...td, minWidth: 165 }}><select value={row.group_id || ""} onChange={(e) => { const g = groups.find((item) => String(item._id) === e.target.value); updateMappingDraft(row.normalized_name, { group_id: e.target.value, subgroup_id: "", nature: g?.nature || "", report_placement: g?.report_placement || "" }); }} style={input}><option value="">Select Group</option>{groups.filter((g) => !g.source_type || g.source_type === "bank_statement").map((g) => <option key={g._id} value={g._id}>{g.name}</option>)}</select></td>
                <td style={{ ...td, minWidth: 165 }}><select value={row.subgroup_id || ""} disabled={!row.group_id} onChange={(e) => updateMappingDraft(row.normalized_name, { subgroup_id: e.target.value })} style={input}><option value="">No Sub-group</option>{allowedSubgroups.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}</select></td>
                <td style={{ ...td, minWidth: 125 }}><input type="number" step="0.01" value={row.opening_balance ?? 0} onChange={(e) => updateMappingDraft(row.normalized_name, { opening_balance: e.target.value })} style={input} /></td>
                <td style={{ ...td, minWidth: 85 }}><select value={row.opening_balance_type || "dr"} onChange={(e) => updateMappingDraft(row.normalized_name, { opening_balance_type: e.target.value })} style={input}><option value="dr">Dr</option><option value="cr">Cr</option></select></td>
                <td style={td}>{placementLabels[row.report_placement] || (row.group_id ? "From Group" : "Not Mapped")}</td>
                <td style={td}><button type="button" disabled={saving || !row.group_id} onClick={() => saveMapping(row)} style={{ ...primary, padding: "7px 10px", opacity: !row.group_id ? .5 : 1 }}>Save</button></td>
              </tr>;
            })}
            {!filteredMappings.length && <tr><td style={td} colSpan={8}>No Particulars found. Import a bank statement first.</td></tr>}
          </tbody></table></div>
        </section>
      )}

      {!["import", "groups", "subgroups", "mapping"].includes(tab) && (
        <>
          <section style={{ ...panel, marginBottom: 12, display: "flex", alignItems: "end", flexWrap: "wrap", gap: 9 }}>
            <div><label style={label}>From Date (Bank Date – A)</label><input type="date" value={filters.from_date} onChange={(e) => setFilters((p) => ({ ...p, from_date: e.target.value }))} style={input} /></div>
            <div><label style={label}>To Date</label><input type="date" value={filters.to_date} onChange={(e) => setFilters((p) => ({ ...p, to_date: e.target.value }))} style={input} /></div>
            <div><label style={label}>Bank Name</label><select value={filters.bank_name} onChange={(e) => setFilters((p) => ({ ...p, bank_name: e.target.value }))} style={input}><option value="">All Banks</option>{(summary.bank_names || []).map((name) => <option key={name} value={name}>{name}</option>)}</select></div>
            <div><label style={label}>Voucher Type</label><select value={filters.voucher_type} onChange={(e) => setFilters((p) => ({ ...p, voucher_type: e.target.value }))} style={input}><option value="">All Types</option><option>Payment</option><option>Receipt</option><option>Contra</option></select></div>
            <button type="button" onClick={applyFilters} disabled={loading} style={primary}>Apply Filter</button>
          </section>

          {tab === "statement" && <section style={panel}>
            <h2 style={{ margin: "0 0 12px", fontSize: 18 }}>Bank Statement Transactions</h2>
            <div style={{ overflow: "auto", maxHeight: "70vh" }}><table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1250 }}><thead><tr>{["Date (A)","Bank (D)","Particulars (L)","Voucher Type (M)","Voucher No. (N)","Receipt (O)","Payment (P)","Bank Balance (H)","Group Mapping","Status"].map((x) => <th key={x} style={th}>{x}</th>)}</tr></thead><tbody>
              {transactions.map((row) => <tr key={row._id}><td style={td}>{dateLabel(row.bank_date)}</td><td style={td}>{row.bank_name}</td><td style={td}>{row.particulars_name}</td><td style={td}>{row.voucher_type}</td><td style={td}>{row.voucher_number}</td><td style={{ ...td, textAlign: "right" }}>{row.receipt_amount ? fmt(row.receipt_amount) : "-"}</td><td style={{ ...td, textAlign: "right" }}>{row.payment_amount ? fmt(row.payment_amount) : "-"}</td><td style={{ ...td, textAlign: "right" }}>{fmt(row.bank_balance)}</td><td style={td}>{row.mapping ? `${row.mapping.group_name}${row.mapping.subgroup_name ? ` / ${row.mapping.subgroup_name}` : ""}` : <span style={{ color: "#b45309", fontWeight: 800 }}>Unmapped</span>}</td><td style={td}>{row.bank_status || "-"}</td></tr>)}
              {!transactions.length && <tr><td style={td} colSpan={10}>No bank transactions for the selected filter.</td></tr>}
            </tbody></table></div>
          </section>}

          {tab === "groupwise" && <section style={panel}>
            <h2 style={{ margin: "0 0 12px", fontSize: 18 }}>Group-wise / Sub-group-wise Report</h2>
            <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse" }}><thead><tr>{["Group","Sub-group","Nature","Report Placement","Transactions","Receipts","Payments","Net Movement"].map((x) => <th key={x} style={th}>{x}</th>)}</tr></thead><tbody>
              {groupReport.map((row, i) => <tr key={`${row.group_id}-${row.subgroup_id}-${i}`}><td style={td}><b>{row.group_name}</b></td><td style={td}>{row.subgroup_name}</td><td style={td}>{natureLabels[row.nature] || row.nature || "-"}</td><td style={td}>{placementLabels[row.report_placement] || "Not mapped"}</td><td style={td}>{row.transactions}</td><td style={{ ...td, textAlign: "right" }}>{fmt(row.receipts)}</td><td style={{ ...td, textAlign: "right" }}>{fmt(row.payments)}</td><td style={{ ...td, textAlign: "right", fontWeight: 800 }}>{fmt(row.net_movement)}</td></tr>)}
              {!groupReport.length && <tr><td style={td} colSpan={8}>No transactions found.</td></tr>}
            </tbody></table></div>
          </section>}

          {tab === "profitloss" && <section style={panel}>
            <h2 style={{ margin: "0 0 12px", fontSize: 18 }}>Profit & Loss Report</h2>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
              {card("Income", fmt(profitLoss.income), "Mapped P&L Income groups")}
              {card("Expenses", fmt(profitLoss.expense), "Mapped P&L Expense groups")}
              {card("Net Profit / (Loss)", fmt(profitLoss.net_profit), profitLoss.net_profit >= 0 ? "Net Profit" : "Net Loss")}
            </div>
            <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse" }}><thead><tr>{["Group","Sub-group","Nature","Amount"].map((x) => <th key={x} style={th}>{x}</th>)}</tr></thead><tbody>
              {(profitLoss.rows || []).map((row,i) => <tr key={`${row.group_name}-${row.subgroup_name}-${i}`}><td style={td}><b>{row.group_name}</b></td><td style={td}>{row.subgroup_name || "-"}</td><td style={td}>{natureLabels[row.nature]}</td><td style={{ ...td, textAlign: "right" }}>{fmt(row.amount)}</td></tr>)}
              {!(profitLoss.rows || []).length && <tr><td style={td} colSpan={4}>No P&L ledger mappings in the selected period. Map direct income / expense ledgers in Particulars Mapping.</td></tr>}
            </tbody></table></div>
            <p style={{ color: "#92400e", background: "#fffbeb", border: "1px solid #fde68a", padding: 10, borderRadius: 7, fontSize: 12 }}>Contra vouchers are excluded from P&L. Customer receipts and supplier payments mapped to Balance Sheet remain settlements, not new income or expense. Warehouse Sale / Purchase totals are included when you create the matching Source Groups in Group Master. Purchase values are shown as trading purchases; opening/closing stock, production cost and cost-of-goods-sold adjustments are not yet calculated, so treat Net Profit as provisional until those stock adjustments are entered.</p>
          </section>}

          {tab === "balancesheet" && <section style={panel}>
            <h2 style={{ margin: "0 0 12px", fontSize: 18 }}>Balance Sheet</h2>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
              {card("Assets", fmt(balanceSheet.total_assets), "Debit-normal balance")}
              {card("Liabilities", fmt(balanceSheet.total_liabilities), "Credit-normal balance")}
              {card("Capital / Equity", fmt(balanceSheet.total_equity), "Credit-normal balance")}
              {card("Difference", fmt(balanceSheet.difference), "Assets − Liabilities − Equity")}
            </div>
            <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}><thead><tr>{["Group","Sub-group","Nature","Closing Balance"].map((x) => <th key={x} style={th}>{x}</th>)}</tr></thead><tbody>
              {(balanceSheet.rows || []).map((row,i) => <tr key={`${row.group_name}-${row.subgroup_name}-${i}`}><td style={td}><b>{row.group_name}</b></td><td style={td}>{row.subgroup_name || "-"}</td><td style={td}>{natureLabels[row.nature]}</td><td style={{ ...td, textAlign: "right" }}>{fmt(row.balance)}</td></tr>)}
              {!(balanceSheet.rows || []).length && <tr><td style={td} colSpan={4}>No Balance Sheet ledger mappings. Map Assets, Liabilities and Capital groups first.</td></tr>}
            </tbody></table></div>
            <p style={{ color: "#92400e", background: "#fffbeb", border: "1px solid #fde68a", padding: 10, borderRadius: 7, fontSize: 12 }}>Bank balances are taken from the latest Bank Statement Column H up to the selected To Date. Enter opening balances in Particulars Mapping. A complete Balance Sheet also needs non-bank assets, liabilities, stock, debtors, creditors, tax balances and other journal/account entries.</p>
          </section>}
        </>
      )}
    </main>
  );
}
