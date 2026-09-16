import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { FaCheck, FaPlay, FaPlus, FaSyncAlt } from "react-icons/fa";
import { hasPermission, loadSession } from "../utils/auth";
import { useNavigate } from "react-router-dom";
import PageBackCloseActions from "../components/PageBackCloseActions";

const API = "/api/daily-rejections";
const STATUSES = ["ALL", "PENDING", "ASSIGNED", "RUNNING", "COMPLETE"];
const WORK_DESCRIPTIONS = ["PALTI", "WAREHOUSE UNLOAD", "LOCAL SALE", "PARTY ACCOUNT", "OTHERS"];
const REASONS = ["HIGH FUNGUS", "HIGH MOISTURE", "DISCOLOUR", "DAMAGE", "LIVE INSECT", "WATER DAMAGE", "OTHERS"];

const emptyForm = () => ({
  entry_date: new Date().toISOString().slice(0, 10),
  employee_id: "",
  location_id: "",
  warehouse_id: "",
  company_id: "",
  company_account_id: "",
  product_id: "",
  inward_voucher: "",
  inward_id: "",
  outward_voucher: "",
  outward_id: "",
  consignee: "",
  original_qty: "",
  actual_unloading_qty: "",
  rejection_qty: "",
  action_type: "",
  reason: "",
  remarks: "",
});

const textValue = (value) => String(value ?? "");
const idOf = (row) => String(row?.id || row?._id || "");
const money = (value) => Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const dateLabel = (value) => {
  if (!value) return "-";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "-" : d.toLocaleDateString("en-GB");
};

export default function DailyRejectionPage() {
  const navigate = useNavigate();
  const session = loadSession() || {};
  const user = session?.user || null;
  const isManager = hasPermission(user, "dailyRejection.assign") || hasPermission(user, "dailyRejection.report") || String(user?.role || "").toLowerCase() === "admin";
  const canCreate = hasPermission(user, "dailyRejection.create");
  const canAssign = hasPermission(user, "dailyRejection.assign");
  const canStart = hasPermission(user, "dailyRejection.start");
  const canComplete = hasPermission(user, "dailyRejection.complete");

  const [masters, setMasters] = useState({ locations: [], warehouses: [], companies: [], accounts: [], products: [], employees: [] });
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState({ total: 0, pending: 0, assigned: 0, running: 0, complete: 0 });
  const [status, setStatus] = useState("ALL");
  const [actionFilter, setActionFilter] = useState("ALL");
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [assigningId, setAssigningId] = useState(null);
  const [assignedEmployee, setAssignedEmployee] = useState({});
  const [completingId, setCompletingId] = useState(null);
  const [completionRemarks, setCompletionRemarks] = useState({});
  const [error, setError] = useState("");

  const safeMasters = useMemo(() => ({
    locations: Array.isArray(masters?.locations) ? masters.locations : [],
    warehouses: Array.isArray(masters?.warehouses) ? masters.warehouses : [],
    companies: Array.isArray(masters?.companies) ? masters.companies : [],
    accounts: Array.isArray(masters?.accounts) ? masters.accounts : [],
    products: Array.isArray(masters?.products) ? masters.products : [],
    employees: Array.isArray(masters?.employees) ? masters.employees : [],
  }), [masters]);

  const filteredAccounts = useMemo(
    () => safeMasters.accounts.filter((account) => !form.company_id || String(account.company_id || account.companyId || "") === String(form.company_id)),
    [safeMasters.accounts, form.company_id]
  );

  const selectedWarehouse = useMemo(
    () => safeMasters.warehouses.find((item) => idOf(item) === String(form.warehouse_id || "")),
    [safeMasters.warehouses, form.warehouse_id]
  );

  const loadMasters = async () => {
    const response = await axios.get(`${API}/masters`);
    const payload = response?.data?.data || response?.data || {};
    setMasters({
      locations: Array.isArray(payload.locations) ? payload.locations : [],
      warehouses: Array.isArray(payload.warehouses) ? payload.warehouses : [],
      companies: Array.isArray(payload.companies) ? payload.companies : [],
      accounts: Array.isArray(payload.accounts) ? payload.accounts : [],
      products: Array.isArray(payload.products) ? payload.products : [],
      employees: Array.isArray(payload.employees) ? payload.employees : [],
    });
  };

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const [listResponse, summaryResponse] = await Promise.all([
        axios.get(API, { params: { status } }),
        axios.get(`${API}/summary`),
      ]);
      const listPayload = listResponse?.data?.data || listResponse?.data || [];
      const summaryPayload = summaryResponse?.data?.data || summaryResponse?.data || {};
      const normalizedRows = Array.isArray(listPayload)
        ? listPayload
        : Array.isArray(listPayload?.rows)
          ? listPayload.rows
          : Array.isArray(listPayload?.items)
            ? listPayload.items
            : [];
      setRows(normalizedRows);
      setSummary(summaryPayload && typeof summaryPayload === "object" ? summaryPayload : {});
    } catch (err) {
      setError(err?.response?.data?.error || err.message || "Failed to load Daily Rejection");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMasters().catch(() => {});
  }, []);

  useEffect(() => {
    loadData();
  }, [status, actionFilter]);

  useEffect(() => {
    if (!form.location_id && user?.location_id) {
      setForm((prev) => ({ ...prev, location_id: String(user.location_id) }));
    }
    if (!form.employee_id && !isManager && user?.id) {
      setForm((prev) => ({ ...prev, employee_id: String(user.id) }));
    }
  }, [user, isManager, form.location_id, form.employee_id]);

  useEffect(() => {
    if ((selectedWarehouse?.location_id || selectedWarehouse?.locationId) && !form.location_id) {
      setForm((prev) => ({ ...prev, location_id: String(selectedWarehouse.location_id || selectedWarehouse.locationId) }));
    }
  }, [selectedWarehouse, form.location_id]);

  const updateForm = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const resetForm = () => {
    const next = emptyForm();
    next.location_id = user?.location_id ? String(user.location_id) : "";
    next.employee_id = !isManager && user?.id ? String(user.id) : "";
    setForm(next);
  };

  const submitEntry = async (event) => {
    event.preventDefault();
    const originalQty = Number(form.original_qty);
    const actualUnloadingQty = Number(form.actual_unloading_qty);
    const calculatedRejectionQty = Math.max(originalQty - actualUnloadingQty, 0);
    const payload = { ...form, original_qty: originalQty, actual_unloading_qty: actualUnloadingQty, rejection_qty: calculatedRejectionQty };
    if (!form.warehouse_id || !form.location_id || !form.product_id || !form.action_type || !form.reason || !Number.isFinite(originalQty) || !Number.isFinite(actualUnloadingQty) || actualUnloadingQty < 0 || calculatedRejectionQty <= 0) {
      alert("Location, Warehouse, Product, Work Description, Reason, Original Qty and Actual Unloading Qty are required. Rejection Qty must be greater than 0.");
      return;
    }
    try {
      await axios.post(API, payload);
      alert("Daily Rejection saved as Pending.");
      resetForm();
      setShowForm(false);
      await loadData();
    } catch (err) {
      alert(err?.response?.data?.error || err.message || "Failed to save Daily Rejection");
    }
  };

  const assignRow = async (rowId) => {
    const employeeId = assignedEmployee[rowId];
    if (!employeeId) {
      alert("Select an employee first.");
      return;
    }
    try {
      setAssigningId(rowId);
      await axios.patch(`${API}/${rowId}/assign`, { assigned_to: employeeId });
      await loadData();
    } catch (err) {
      alert(err?.response?.data?.error || err.message || "Failed to assign");
    } finally {
      setAssigningId(null);
    }
  };

  const startRow = async (rowId) => {
    try {
      await axios.post(`${API}/${rowId}/start`);
      await loadData();
    } catch (err) {
      alert(err?.response?.data?.error || err.message || "Failed to start");
    }
  };

  const completeRow = async (rowId, defaultQty) => {
    try {
      setCompletingId(rowId);
      await axios.post(`${API}/${rowId}/complete`, {
        completion_qty: defaultQty,
        completion_remarks: completionRemarks[rowId] || "",
      });
      setCompletionRemarks((prev) => ({ ...prev, [rowId]: "" }));
      await loadData();
    } catch (err) {
      alert(err?.response?.data?.error || err.message || "Failed to complete");
    } finally {
      setCompletingId(null);
    }
  };

  const statusStyle = (value) => {
    const styles = {
      PENDING: { background: "#fff7ed", color: "#c2410c" },
      ASSIGNED: { background: "#eff6ff", color: "#1d4ed8" },
      RUNNING: { background: "#ecfeff", color: "#0f766e" },
      COMPLETE: { background: "#ecfdf5", color: "#047857" },
    };
    return styles[value] || { background: "#f1f5f9", color: "#475569" };
  };

  const canView = isManager || canCreate || canAssign || canStart || canComplete || hasPermission(user, "dailyRejection.view");

  return (
    <div style={pageStyle}>
      <div style={headerStyle}>
        <div>
          <div style={eyebrow}>Warehouse Operations</div>
          <h2 style={{ margin: "4px 0", color: "#0f172a" }}>Daily Rejection</h2>
          <div style={{ color: "#64748b", fontSize: 13 }}>
            Employee entry, assignment, running work and completion in one mobile-friendly page.
          </div>
        </div>
        <PageBackCloseActions navigate={navigate} size="compact" />
      </div>

      {!canView && (
        <div style={errorStyle}>You do not have permission to view Daily Rejection. Please ask Admin/HO/BM to enable Daily Rejection access for your employee.</div>
      )}

      <div style={summaryGrid}>
        <SummaryCard label="Total" value={summary.total} />
        <SummaryCard label="Pending" value={summary.pending} />
        <SummaryCard label="Assigned" value={summary.assigned} />
        <SummaryCard label="Running" value={summary.running} />
        <SummaryCard label="Complete" value={summary.complete} />
      </div>

      <div style={toolbarStyle}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {STATUSES.map((item) => (
            <button key={item} type="button" onClick={() => setStatus(item)} style={status === item ? activeTab : tabButton}>
              {item}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} style={{ ...inputStyle, width: "auto", minWidth: 180 }} aria-label="Filter by work description">
            <option value="ALL">All Work</option>
            {WORK_DESCRIPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          {canCreate && (
            <button type="button" onClick={() => { resetForm(); setShowForm(true); }} style={primaryButton}>
              <FaPlus /> New Rejection
            </button>
          )}
          <button type="button" onClick={loadData} style={secondaryButton}><FaSyncAlt /> Refresh</button>
        </div>
      </div>

      {showForm && canCreate && (
        <div style={cardStyle}>
          <div style={sectionTitle}>New Daily Rejection</div>
          <form onSubmit={submitEntry}>
            <div style={formGrid}>
              <Field label="Date"><input type="date" value={form.entry_date} onChange={(e) => updateForm("entry_date", e.target.value)} style={inputStyle} /></Field>
              {isManager && <Field label="Employee"><select value={form.employee_id} onChange={(e) => updateForm("employee_id", e.target.value)} style={inputStyle}><option value="">Select Employee</option>{safeMasters.employees.map((item) => <option key={idOf(item)} value={idOf(item)}>{item.name}{item.employee_id ? ` (${item.employee_id})` : ""}</option>)}</select></Field>}
              <Field label="Location"><select value={form.location_id} onChange={(e) => updateForm("location_id", e.target.value)} style={inputStyle}><option value="">Select Location</option>{safeMasters.locations.map((item) => <option key={idOf(item)} value={idOf(item)}>{item.name}</option>)}</select></Field>
              <Field label="Warehouse"><select value={form.warehouse_id} onChange={(e) => { updateForm("warehouse_id", e.target.value); const w = masters.warehouses.find((x) => idOf(x) === e.target.value); if (w?.location_id || w?.locationId) updateForm("location_id", String(w.location_id || w.locationId)); }} style={inputStyle}><option value="">Select Warehouse</option>{safeMasters.warehouses.map((item) => <option key={idOf(item)} value={idOf(item)}>{item.name}</option>)}</select></Field>
              <Field label="Company"><select value={form.company_id} onChange={(e) => { updateForm("company_id", e.target.value); updateForm("company_account_id", ""); }} style={inputStyle}><option value="">Select Company</option>{safeMasters.companies.map((item) => <option key={idOf(item)} value={idOf(item)}>{item.name}</option>)}</select></Field>
              <Field label="Company Account"><select value={form.company_account_id} onChange={(e) => updateForm("company_account_id", e.target.value)} style={inputStyle}><option value="">Select Account</option>{filteredAccounts.map((item) => <option key={idOf(item)} value={idOf(item)}>{item.account_name}</option>)}</select></Field>
              <Field label="Product"><select value={form.product_id} onChange={(e) => updateForm("product_id", e.target.value)} style={inputStyle}><option value="">Select Product</option>{safeMasters.products.map((item) => <option key={idOf(item)} value={idOf(item)}>{item.name}</option>)}</select></Field>
              <Field label="Inward Voucher"><input value={form.inward_voucher} onChange={(e) => updateForm("inward_voucher", e.target.value)} placeholder="Optional" style={inputStyle} /></Field>
              <Field label="Outward Voucher"><input value={form.outward_voucher} onChange={(e) => updateForm("outward_voucher", e.target.value)} placeholder="Optional" style={inputStyle} /></Field>
              <Field label="Consignee"><input value={form.consignee} onChange={(e) => updateForm("consignee", e.target.value)} placeholder="Consignee name" style={inputStyle} /></Field>
              <Field label="Work Description"><select value={form.action_type} onChange={(e) => updateForm("action_type", e.target.value)} style={inputStyle}><option value="">Select Work</option>{WORK_DESCRIPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}</select></Field>
              <Field label="Original Qty"><input type="number" step="0.01" min="0" value={form.original_qty} onChange={(e) => updateForm("original_qty", e.target.value)} style={inputStyle} /></Field>
              <Field label="Actual Unloading Qty"><input type="number" step="0.01" min="0" value={form.actual_unloading_qty} onChange={(e) => updateForm("actual_unloading_qty", e.target.value)} style={inputStyle} /></Field>
              <Field label="Rejection Qty"><input type="number" step="0.01" value={Math.max(Number(form.original_qty || 0) - Number(form.actual_unloading_qty || 0), 0).toFixed(2)} readOnly style={{ ...inputStyle, background: "#f8fafc", fontWeight: 800 }} /></Field>
              <Field label="Reason"><select value={form.reason} onChange={(e) => updateForm("reason", e.target.value)} style={inputStyle}><option value="">Select Reason</option>{REASONS.map((item) => <option key={item} value={item}>{item}</option>)}</select></Field>
              <Field label="Remarks"><input value={form.remarks} onChange={(e) => updateForm("remarks", e.target.value)} placeholder="Optional" style={inputStyle} /></Field>
            </div>
            <div style={actionRow}><button type="submit" style={primaryButton}>Save Pending</button><button type="button" onClick={() => { resetForm(); setShowForm(false); }} style={secondaryButton}>Cancel</button></div>
          </form>
        </div>
      )}

      {error && <div style={errorStyle}>{error}</div>}

      <div style={listWrap}>
        {loading ? <div style={emptyStyle}>Loading Daily Rejection...</div> : rows.length === 0 ? <div style={emptyStyle}>No Daily Rejection records found.</div> : rows.map((row) => {
          const badge = statusStyle(row.status);
          return (
            <div key={idOf(row)} style={rowCard}>
              <div style={rowTop}>
                <div>
                  <div style={{ fontWeight: 900, color: "#0f172a", fontSize: 17 }}>{row.rejection_no || idOf(row)}</div>
                  <div style={{ color: "#64748b", fontSize: 12 }}>{dateLabel(row.entry_date)} · {row.employee_name || "-"}</div>
                </div>
                <span style={{ ...statusBadge, ...badge }}>{row.status}</span>
              </div>

              <div style={detailGrid}>
                <Detail label="Location" value={row.location_name || "-"} />
                <Detail label="Warehouse" value={row.warehouse_name || "-"} />
                <Detail label="Company" value={row.company_name || "-"} />
                <Detail label="Account" value={row.company_account_name || "-"} />
                <Detail label="Product" value={row.product_name || "-"} />
                <Detail label="Consignee" value={row.consignee || "-"} />
                <Detail label="Original Qty" value={money(row.original_qty)} />
                <Detail label="Actual Unloading Qty" value={money(row.actual_unloading_qty)} />
                <Detail label="Rejection Qty" value={money(row.rejection_qty)} />
                <Detail label="Reason" value={row.reason || "-"} />
                <Detail label="Work Description" value={row.action_type || "-"} />
                <Detail label="Assigned To" value={row.assigned_to_name || "-"} />
              </div>

              {canAssign && row.status !== "COMPLETE" && (
                <div style={assignBox}>
                  <select value={assignedEmployee[idOf(row)] || row.assigned_to || ""} onChange={(e) => setAssignedEmployee((prev) => ({ ...prev, [idOf(row)]: e.target.value }))} style={inputStyle}>
                    <option value="">Assign Employee</option>
                    {safeMasters.employees.map((item) => <option key={idOf(item)} value={idOf(item)}>{item.name}{item.employee_id ? ` (${item.employee_id})` : ""}</option>)}
                  </select>
                  <button type="button" disabled={assigningId === idOf(row)} onClick={() => assignRow(idOf(row))} style={secondaryButton}>{assigningId === idOf(row) ? "Assigning..." : "Assign"}</button>
                </div>
              )}

              {(canStart && ["PENDING", "ASSIGNED"].includes(row.status) && (isManager || String(row.employee_id || "") === String(user?.id || "") || String(row.assigned_to || "") === String(user?.id || ""))) && (
                <button type="button" onClick={() => startRow(idOf(row))} style={startButton}><FaPlay /> Start Work</button>
              )}

              {canComplete && row.status === "RUNNING" && (isManager || String(row.employee_id || "") === String(user?.id || "") || String(row.assigned_to || "") === String(user?.id || "")) && (
                <div style={completeBox}>
                  <input value={completionRemarks[idOf(row)] || ""} onChange={(e) => setCompletionRemarks((prev) => ({ ...prev, [idOf(row)]: e.target.value }))} placeholder="Completion remarks" style={inputStyle} />
                  <button type="button" disabled={completingId === idOf(row)} onClick={() => completeRow(idOf(row), row.rejection_qty)} style={completeButton}><FaCheck /> {completingId === idOf(row) ? "Completing..." : "Complete"}</button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SummaryCard({ label, value }) {
  return <div style={summaryCard}><div style={{ color: "#64748b", fontSize: 12, fontWeight: 700 }}>{label}</div><div style={{ fontSize: 24, fontWeight: 900, color: "#0f172a", marginTop: 4 }}>{value ?? 0}</div></div>;
}

function Field({ label, children }) {
  return <label style={fieldStyle}><span style={labelStyle}>{label}</span>{children}</label>;
}

function Detail({ label, value }) {
  return <div style={detailCell}><div style={{ color: "#64748b", fontSize: 11, fontWeight: 700, textTransform: "uppercase" }}>{label}</div><div style={{ color: "#0f172a", fontWeight: 700, marginTop: 2, wordBreak: "break-word" }}>{value}</div></div>;
}

const pageStyle = { minHeight: "100vh", background: "#f8fafc", padding: 12, fontFamily: "Segoe UI, Arial, sans-serif", boxSizing: "border-box" };
const headerStyle = { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, padding: 16, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", boxShadow: "0 8px 24px rgba(15,23,42,.05)" };
const eyebrow = { color: "#0f766e", fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: .5 };
const summaryGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 10, margin: "12px 0" };
const summaryCard = { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: 14 };
const toolbarStyle = { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, padding: 12, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" };
const tabButton = { border: "1px solid #cbd5e1", background: "#fff", color: "#334155", borderRadius: 999, padding: "8px 12px", fontWeight: 800, cursor: "pointer" };
const activeTab = { ...tabButton, background: "#0f766e", color: "#fff", borderColor: "#0f766e" };
const cardStyle = { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, padding: 16, marginTop: 12 };
const sectionTitle = { fontSize: 17, fontWeight: 900, marginBottom: 12, color: "#0f172a" };
const formGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12 };
const fieldStyle = { display: "grid", gap: 6 };
const labelStyle = { fontSize: 12, color: "#475569", fontWeight: 800 };
const inputStyle = { width: "100%", minHeight: 42, boxSizing: "border-box", border: "1px solid #cbd5e1", borderRadius: 10, padding: "9px 10px", background: "#fff", color: "#0f172a" };
const actionRow = { display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" };
const primaryButton = { border: 0, background: "#0f766e", color: "#fff", borderRadius: 10, padding: "10px 14px", fontWeight: 800, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 7 };
const secondaryButton = { border: "1px solid #cbd5e1", background: "#fff", color: "#334155", borderRadius: 10, padding: "10px 14px", fontWeight: 800, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 7 };
const listWrap = { display: "grid", gap: 12, marginTop: 12 };
const rowCard = { background: "#fff", border: "1px solid #dbe4ee", borderRadius: 16, padding: 14, boxShadow: "0 8px 24px rgba(15,23,42,.04)" };
const rowTop = { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 };
const statusBadge = { borderRadius: 999, padding: "6px 9px", fontSize: 11, fontWeight: 900 };
const detailGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(145px,1fr))", gap: 8, marginTop: 12 };
const detailCell = { background: "#f8fafc", borderRadius: 10, padding: 9, minWidth: 0 };
const assignBox = { display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 8, marginTop: 12 };
const completeBox = { display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 8, marginTop: 12 };
const startButton = { marginTop: 12, border: 0, background: "#0369a1", color: "#fff", borderRadius: 10, padding: "10px 14px", fontWeight: 900, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 7 };
const completeButton = { border: 0, background: "#047857", color: "#fff", borderRadius: 10, padding: "10px 14px", fontWeight: 900, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 7 };
const errorStyle = { marginTop: 12, padding: 12, borderRadius: 12, background: "#fef2f2", color: "#b91c1c", fontWeight: 700, border: "1px solid #fecaca" };
const emptyStyle = { background: "#fff", border: "1px dashed #cbd5e1", borderRadius: 16, padding: 30, textAlign: "center", color: "#64748b" };
