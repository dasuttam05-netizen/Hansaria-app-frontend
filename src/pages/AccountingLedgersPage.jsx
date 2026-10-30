import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { formatDisplayDate } from "../utils/date";
import { getApiUrl } from "../utils/api";
import PageBackCloseActions from "../components/PageBackCloseActions";

const API_BASE = getApiUrl("/api");

const panel = { background: "#fff", border: "1px solid #d1d5db", borderRadius: 8, padding: 16, marginBottom: 14 };
const input = { width: "100%", boxSizing: "border-box", padding: "9px 10px", border: "1px solid #cbd5e1", borderRadius: 5, background: "#fff" };
const button = { border: 0, borderRadius: 5, padding: "9px 13px", color: "#fff", background: "#0f766e", fontWeight: 700, cursor: "pointer" };
const natureLabels = { asset: "Assets", liability: "Liabilities", income: "Income", expense: "Expenses", equity: "Capital" };
const currentMonth = () => new Date().toISOString().slice(0, 7);
const money = (value) => `Rs. ${Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function AccountingLedgersPage() {
  const navigate = useNavigate();
  const [groups, setGroups] = useState([]);
  const [ledgers, setLedgers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [selectedLedger, setSelectedLedger] = useState("");
  const [report, setReport] = useState({ entries: [], total: 0, ledger: null });
  const [month, setMonth] = useState(currentMonth());
  const [newGroup, setNewGroup] = useState({ name: "", nature: "expense" });
  const [newLedger, setNewLedger] = useState({ name: "", group_id: "", opening_balance: "0", opening_balance_type: "dr" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const loadMasters = async () => {
    const res = await axios.get(`${API_BASE}/account-ledgers`);
    const nextGroups = Array.isArray(res.data?.groups) ? res.data.groups : [];
    const nextLedgers = Array.isArray(res.data?.ledgers) ? res.data.ledgers : [];
    setGroups(nextGroups);
    setLedgers(nextLedgers);
    try {
      const employeeRes = await axios.get(`${API_BASE}/employees`);
      setEmployees(Array.isArray(employeeRes.data) ? employeeRes.data : []);
    } catch (_) { setEmployees([]); }
    if (!newLedger.group_id && nextGroups.length) setNewLedger((prev) => ({ ...prev, group_id: String(nextGroups[0]._id) }));
    if (!selectedLedger && nextLedgers.length) {
      const salary = nextLedgers.find((row) => String(row.name).toLowerCase() === "salary");
      setSelectedLedger(String((salary || nextLedgers[0])._id));
    }
  };

  useEffect(() => { loadMasters().catch((err) => setError(err.response?.data?.error || err.message)); }, []);
  useEffect(() => {
    if (!selectedLedger || !month) return;
    const [year, mon] = month.split("-").map(Number);
    const from = `${month}-01`;
    const to = new Date(Date.UTC(year, mon, 0)).toISOString().slice(0, 10);
    axios.get(`${API_BASE}/account-ledgers/report/${selectedLedger}`, { params: { from_date: from, to_date: to, ...(selectedEmployee ? { employee_id: selectedEmployee } : {}) } })
      .then((res) => setReport(res.data || { entries: [], total: 0 }))
      .catch((err) => setError(err.response?.data?.error || err.message));
  }, [selectedLedger, month, selectedEmployee]);

  const selectedLedgerRow = useMemo(() => ledgers.find((row) => String(row._id) === String(selectedLedger)), [ledgers, selectedLedger]);
  const normalSide = ["liability", "income", "equity"].includes(String(selectedLedgerRow?.group_id?.nature || "").toLowerCase()) ? "credit" : "debit";
  const openingBalance = useMemo(() => {
    const masterBalance = selectedEmployee ? 0 : Number(selectedLedgerRow?.opening_balance || 0) * (selectedLedgerRow?.opening_balance_type === "cr" ? -1 : 1);
    const priorBalance = Number(report.opening_debit || 0) - Number(report.opening_credit || 0);
    return masterBalance + priorBalance;
  }, [report.opening_debit, report.opening_credit, selectedLedgerRow, selectedEmployee]);
  const ledgerRows = useMemo(() => {
    let running = openingBalance;
    const displayBalance = (value) => {
      const normalAmount = normalSide === "debit" ? value : -value;
      return `${money(Math.abs(normalAmount))} ${normalAmount < 0 ? "Cr" : "Dr"}`;
    };
    return (report.entries || []).map((row) => {
      running += Number(row.amount || 0) * (row.ledger_side === "debit" ? 1 : -1);
      return { ...row, runningBalance: displayBalance(running) };
    });
  }, [report.entries, openingBalance, normalSide]);
  const closingBalance = ledgerRows.length ? ledgerRows[ledgerRows.length - 1].runningBalance : (() => {
    const normalAmount = normalSide === "debit" ? openingBalance : -openingBalance;
    return `${money(Math.abs(normalAmount))} ${normalAmount < 0 ? "Cr" : "Dr"}`;
  })();

  const createGroup = async (event) => {
    event.preventDefault(); setBusy(true); setError("");
    try {
      await axios.post(`${API_BASE}/account-ledgers/groups`, newGroup);
      setNewGroup({ name: "", nature: "expense" }); await loadMasters();
    } catch (err) { setError(err.response?.data?.error || err.message); }
    finally { setBusy(false); }
  };

  const createLedger = async (event) => {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const res = await axios.post(`${API_BASE}/account-ledgers/ledgers`, newLedger);
      setNewLedger((prev) => ({ ...prev, name: "", opening_balance: "0" }));
      await loadMasters(); setSelectedLedger(String(res.data?._id || ""));
    } catch (err) { setError(err.response?.data?.error || err.message); }
    finally { setBusy(false); }
  };

  return (
    <main style={{ minHeight: "100vh", background: "#f1f5f9", padding: 18, fontFamily: "Segoe UI, Arial, sans-serif" }}>
      <header style={{ ...panel, display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
        <div><h1 style={{ margin: 0, color: "#0f172a" }}>Accounting Groups & Ledgers</h1><p style={{ margin: "6px 0 0", color: "#475569" }}>Create Tally-style account groups and ledgers; open a ledger to see monthly entries and totals.</p></div>
        <PageBackCloseActions navigate={navigate} />
      </header>
      {error && <div style={{ ...panel, color: "#b91c1c", borderColor: "#fecaca" }}>{error}</div>}
      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 14 }}>
        <form onSubmit={createGroup} style={panel}>
          <h2 style={{ margin: "0 0 12px", fontSize: 18 }}>Create Group</h2>
          <label>Group name<input required value={newGroup.name} onChange={(e) => setNewGroup((p) => ({ ...p, name: e.target.value }))} style={{ ...input, marginTop: 5 }} placeholder="e.g. Indirect Expenses" /></label>
          <label style={{ display: "block", marginTop: 10 }}>Group nature<select value={newGroup.nature} onChange={(e) => setNewGroup((p) => ({ ...p, nature: e.target.value }))} style={{ ...input, marginTop: 5 }}>{Object.entries(natureLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <button disabled={busy} style={{ ...button, marginTop: 12 }}>Add Group</button>
        </form>
        <form onSubmit={createLedger} style={panel}>
          <h2 style={{ margin: "0 0 12px", fontSize: 18 }}>Create Ledger</h2>
          <label>Ledger name<input required value={newLedger.name} onChange={(e) => setNewLedger((p) => ({ ...p, name: e.target.value }))} style={{ ...input, marginTop: 5 }} placeholder="e.g. Driver Salary" /></label>
          <label style={{ display: "block", marginTop: 10 }}>Under group<select required value={newLedger.group_id} onChange={(e) => setNewLedger((p) => ({ ...p, group_id: e.target.value }))} style={{ ...input, marginTop: 5 }}>{groups.map((group) => <option key={group._id} value={group._id}>{group.name} · {natureLabels[group.nature] || group.nature}</option>)}</select></label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 110px", gap: 8, marginTop: 10 }}><label>Opening balance<input type="number" min="0" step="0.01" value={newLedger.opening_balance} onChange={(e) => setNewLedger((p) => ({ ...p, opening_balance: e.target.value }))} style={{ ...input, marginTop: 5 }} /></label><label>Type<select value={newLedger.opening_balance_type} onChange={(e) => setNewLedger((p) => ({ ...p, opening_balance_type: e.target.value }))} style={{ ...input, marginTop: 5 }}><option value="dr">Dr</option><option value="cr">Cr</option></select></label></div>
          <button disabled={busy} style={{ ...button, marginTop: 12 }}>Add Ledger</button>
        </form>
      </section>
      <section style={panel}>
        <h2 style={{ margin: "0 0 12px", fontSize: 18 }}>Available Groups & Ledgers</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(250px,1fr))", gap: 10 }}>
          {groups.map((group) => (
            <div key={group._id} style={{ border: "1px solid #e2e8f0", borderRadius: 6, padding: 10 }}>
              <strong>{group.name}</strong><span style={{ color: "#64748b" }}> · {natureLabels[group.nature] || group.nature}</span>
              <div style={{ marginTop: 7, color: "#334155", fontSize: 13 }}>{ledgers.filter((row) => String(row.group_id?._id || row.group_id) === String(group._id)).map((row) => row.name).join(", ") || "No ledgers yet"}</div>
            </div>
          ))}
        </div>
      </section>
      <section style={{ ...panel, borderColor: "#99d5ca", boxShadow: "0 8px 24px rgba(15, 23, 42, .07)", padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "17px 18px", background: "linear-gradient(110deg,#0f766e,#164e63)", color: "white" }}>
          <h2 style={{ margin: 0, fontSize: 21 }}>Ledger Account</h2>
          <div style={{ marginTop: 4, opacity: .9, fontSize: 13 }}>Tally-style monthly ledger with opening, debit, credit and running balance</div>
        </div>
        <div style={{ padding: 16 }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "end" }}>
          <label style={{ minWidth: 260, flex: 1 }}>Open Ledger<select value={selectedLedger} onChange={(e) => setSelectedLedger(e.target.value)} style={{ ...input, marginTop: 5 }}><option value="">Select ledger</option>{ledgers.map((row) => <option key={row._id} value={row._id}>{row.name} · {row.group_id?.name || "Group"}</option>)}</select></label>
          <label>Month<input type="month" value={month} onChange={(e) => setMonth(e.target.value)} style={{ ...input, marginTop: 5 }} /></label>
          <label style={{ minWidth: 220 }}>Staff<select value={selectedEmployee} onChange={(e) => setSelectedEmployee(e.target.value)} style={{ ...input, marginTop: 5 }}><option value="">All Staff</option>{employees.map((employee) => <option key={employee._id || employee.id} value={employee._id || employee.id}>{employee.name || employee.employee_name}</option>)}</select></label>
          <div style={{ minWidth: 170, padding: "9px 12px", borderRadius: 8, background: "#f0fdfa", color: "#115e59", border: "1px solid #99f6e4", fontWeight: 800 }}>Opening: {money(Math.abs(openingBalance))} {openingBalance < 0 ? "Cr" : "Dr"}</div>
          <div style={{ minWidth: 170, padding: "9px 12px", borderRadius: 8, background: "#dcfce7", color: "#166534", fontWeight: 800 }}>Monthly Debit: {money(report.debit_total)}</div>
          <div style={{ minWidth: 170, padding: "9px 12px", borderRadius: 8, background: "#e0f2fe", color: "#075985", fontWeight: 800 }}>Monthly Credit: {money(report.credit_total)}</div>
          <div style={{ minWidth: 170, padding: "9px 12px", borderRadius: 8, background: "#fff7ed", color: "#9a3412", border: "1px solid #fed7aa", fontWeight: 800 }}>Closing: {closingBalance}</div>
        </div>
        <h2 style={{ fontSize: 18 }}>{report.ledger?.name || selectedLedgerRow?.name || "Ledger Details"} · {month}</h2>
        <div style={{ overflowX: "auto", border: "1px solid #dbe5e7", borderRadius: 8 }}><table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1120 }}><thead><tr style={{ background: "#0f766e", color: "white", textAlign: "left" }}>{["Date", "Voucher Type", "Voucher No.", "Particulars", "Staff", "Warehouse", "Debit", "Credit", "Balance"].map((h) => <th key={h} style={{ padding: 10, whiteSpace: "nowrap" }}>{h}</th>)}</tr></thead><tbody>
          <tr style={{ background: "#f0fdfa", fontWeight: 700 }}><td style={{ padding: 9 }} colSpan={6}>Opening Balance</td><td style={{ padding: 9, textAlign: "right" }}>{openingBalance > 0 ? money(openingBalance) : "-"}</td><td style={{ padding: 9, textAlign: "right" }}>{openingBalance < 0 ? money(-openingBalance) : "-"}</td><td style={{ padding: 9, whiteSpace: "nowrap" }}>{`${money(Math.abs(normalSide === "debit" ? openingBalance : -openingBalance))} ${(normalSide === "debit" ? openingBalance : -openingBalance) < 0 ? "Cr" : "Dr"}`}</td></tr>
          {ledgerRows.length ? ledgerRows.map((row) => <tr key={row.id} style={{ borderBottom: "1px solid #e2e8f0" }}><td style={{ padding: 9, whiteSpace: "nowrap" }}>{formatDisplayDate(row.entry_date)}</td><td style={{ padding: 9 }}>{row.transaction_mode || "Entry"}</td><td style={{ padding: 9 }}>{row.journal_group_no || row.voucher_no || "-"}</td><td style={{ padding: 9 }}>{row.description || row.narration || "-"}</td><td style={{ padding: 9 }}>{row.employee_name || "-"}</td><td style={{ padding: 9 }}>{row.warehouse_name || "-"}</td><td style={{ padding: 9, textAlign: "right" }}>{row.ledger_side === "debit" ? money(row.amount) : "-"}</td><td style={{ padding: 9, textAlign: "right" }}>{row.ledger_side === "credit" ? money(row.amount) : "-"}</td><td style={{ padding: 9, whiteSpace: "nowrap", fontWeight: 700 }}>{row.runningBalance}</td></tr>) : <tr><td colSpan={9} style={{ padding: 18, textAlign: "center", color: "#64748b" }}>No entries for this ledger and month.</td></tr>}
          <tr style={{ background: "#f8fafc", fontWeight: 800, borderTop: "2px solid #cbd5e1" }}><td style={{ padding: 9 }} colSpan={6}>Monthly Total</td><td style={{ padding: 9, textAlign: "right" }}>{money(report.debit_total)}</td><td style={{ padding: 9, textAlign: "right" }}>{money(report.credit_total)}</td><td style={{ padding: 9, whiteSpace: "nowrap" }}>Closing: {closingBalance}</td></tr>
        </tbody></table></div>
        </div>
      </section>
    </main>
  );
}
