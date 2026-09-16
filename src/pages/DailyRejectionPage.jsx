import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { hasPermission, loadSession } from "../utils/auth";

const API = "/api/daily-rejections";
const STATUSES = ["ALL", "PENDING", "RUNNING", "COMPLETE", "REPORT"];
const WORK_DESCRIPTIONS = ["PALTI", "WAREHOUSE UNLOAD", "LOCAL SALE", "PARTY ACCOUNT", "OTHERS"];
const REASONS = ["HIGH FUNGUS", "HIGH MOISTURE", "DISCOLOUR", "DAMAGE", "LIVE INSECT", "WATER DAMAGE", "OTHERS"];

const makeEmptyForm = (user) => ({
  entry_date: new Date().toISOString().slice(0, 10),
  employee_id: user?.id ? String(user.id) : "",
  location_id: user?.location_id ? String(user.location_id) : "",
  company_id: "",
  company_account_id: "",
  product_id: "",
  consignee_id: "",
  original_qty: "",
  actual_unloading_qty: "",
  rejection_qty: "",
  reason: "",
  remarks: "",
});

const idOf = (row) => String(row?.id ?? row?._id ?? row?.legacy_id ?? "");
const textOf = (row) => String(row?.name ?? row?.title ?? row?.display_name ?? row?.party_name ?? row?.company_name ?? row?.consignee_name ?? "");
const money = (value) => Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function pickArray(payload, keys) {
  if (Array.isArray(payload)) return payload;
  for (const key of keys) {
    if (Array.isArray(payload?.[key])) return payload[key];
    if (Array.isArray(payload?.data?.[key])) return payload.data[key];
  }
  return [];
}

function statusStyle(status) {
  const styles = {
    PENDING: { background: "#fff7ed", color: "#c2410c", border: "1px solid #fed7aa" },
    ASSIGNED: { background: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe" },
    RUNNING: { background: "#ecfeff", color: "#0f766e", border: "1px solid #99f6e4" },
    COMPLETE: { background: "#ecfdf5", color: "#047857", border: "1px solid #a7f3d0" },
  };
  return styles[status] || { background: "#f1f5f9", color: "#475569", border: "1px solid #e2e8f0" };
}

export default function DailyRejectionPage() {
  const navigate = useNavigate();
  const session = loadSession() || {};
  const user = session.user || null;

  const canCreate = hasPermission(user, "dailyRejection.create");
  const canAssign = hasPermission(user, "dailyRejection.assign") || String(user?.role || "").toLowerCase() === "admin";
  const canView = hasPermission(user, "dailyRejection.view") || canCreate || canAssign || hasPermission(user, "dailyRejection.complete") || hasPermission(user, "dailyRejection.report") || String(user?.role || "").toLowerCase() === "admin";
  const canComplete = hasPermission(user, "dailyRejection.complete") || canAssign;
  const canEdit = hasPermission(user, "dailyRejection.edit") || String(user?.role || "").toLowerCase() === "admin";
  const canReport = hasPermission(user, "dailyRejection.report") || String(user?.role || "").toLowerCase() === "admin";

  const [masters, setMasters] = useState({ locations: [], companies: [], accounts: [], products: [], employees: [], consignees: [] });
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState({ total: 0, pending: 0, assigned: 0, running: 0, complete: 0 });
  const [status, setStatus] = useState("ALL");
  const [actionFilter, setActionFilter] = useState("ALL");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(makeEmptyForm(user));
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [assignedEmployee, setAssignedEmployee] = useState({});
  const [assignedAction, setAssignedAction] = useState({});
  const [busyId, setBusyId] = useState("");
  const [completionRemarks, setCompletionRemarks] = useState({});
  const [editId, setEditId] = useState("");
  const [reportFrom, setReportFrom] = useState("");
  const [reportTo, setReportTo] = useState("");
  const [reportRows, setReportRows] = useState([]);

  const loadMasters = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/masters`);
      const payload = response?.data?.data || response?.data || {};
      setMasters({
        locations: pickArray(payload, ["locations"]),
        companies: pickArray(payload, ["companies"]),
        accounts: pickArray(payload, ["accounts", "companyAccounts"]),
        products: pickArray(payload, ["products"]),
        employees: pickArray(payload, ["employees", "staff", "users"]),
        consignees: pickArray(payload, ["consignees", "consigneeNames", "buyers"]),
      });
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || "Unable to load Daily Rejection masters");
    }
  }, []);

  const loadData = useCallback(async () => {
    if (!canView) return;
    if (status === "REPORT") return;
    setLoading(true);
    setError("");
    try {
      const params = { status };
      if (actionFilter !== "ALL") params.action_type = actionFilter;
      const [listResponse, summaryResponse] = await Promise.all([
        axios.get(API, { params }),
        axios.get(`${API}/summary`),
      ]);
      const listPayload = listResponse?.data?.data || listResponse?.data || [];
      const summaryPayload = summaryResponse?.data?.data || summaryResponse?.data || {};
      const list = Array.isArray(listPayload) ? listPayload : (listPayload.rows || listPayload.items || []);
      setRows(Array.isArray(list) ? list : []);
      setSummary(summaryPayload && typeof summaryPayload === "object" ? summaryPayload : {});
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || "Unable to load Daily Rejection");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [status, actionFilter, canView]);

  useEffect(() => { loadMasters(); }, [loadMasters]);
  useEffect(() => { loadData(); }, [loadData]);

  const resetForm = () => setForm(makeEmptyForm(user));
  const updateForm = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const filteredAccounts = useMemo(() => {
    if (!form.company_id) return masters.accounts;
    const selectedCompany = masters.companies.find((item) => idOf(item) === String(form.company_id));
    const selectedName = String(selectedCompany?.name || selectedCompany?.company_name || "").trim().toLowerCase();
    const matched = masters.accounts.filter((account) => {
      const companyId = account?.company_id ?? account?.companyId ?? account?.company?.id ?? account?.company?._id;
      const companyName = String(account?.company_name || account?.company?.name || "").trim().toLowerCase();
      return String(companyId || "") === String(form.company_id) || (!!selectedName && companyName === selectedName);
    });
    return matched.length ? matched : masters.accounts;
  }, [masters.accounts, masters.companies, form.company_id]);

  const originalQty = Number(form.original_qty) || 0;
  const unloadingQty = Number(form.actual_unloading_qty) || 0;
  const rejectionQty = Math.max(originalQty - unloadingQty, 0);

  const submitEntry = async (event) => {
    event.preventDefault();
    if (!form.location_id || !form.product_id || !form.consignee_id || !form.reason || originalQty <= 0 || unloadingQty < 0 || unloadingQty > originalQty || rejectionQty <= 0) {
      alert("Location, Product, Consignee, Reason, Original Qty and Actual Unloading Qty are required.");
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form, original_qty: originalQty, actual_unloading_qty: unloadingQty, rejection_qty: rejectionQty };
      if (editId) {
        await axios.put(`${API}/${editId}`, payload);
        alert("Daily Rejection updated successfully.");
      } else {
        await axios.post(API, payload);
        alert("Daily Rejection saved as Pending.");
      }
      resetForm();
      setShowForm(false);
      setEditId("");
      await loadData();
    } catch (err) {
      alert(err?.response?.data?.error || err?.message || "Failed to save Daily Rejection");
    } finally {
      setSaving(false);
    }
  };

  const assignRow = async (rowId) => {
    const employeeId = assignedEmployee[rowId];
    const actionType = assignedAction[rowId];
    if (!employeeId || !actionType) {
      alert("Select staff and Work Description first.");
      return;
    }
    setBusyId(rowId);
    try {
      await axios.patch(`${API}/${rowId}/assign`, { assigned_to: employeeId, action_type: actionType });
      await loadData();
    } catch (err) {
      alert(err?.response?.data?.error || err?.message || "Failed to assign");
    } finally {
      setBusyId("");
    }
  };

  const completeRow = async (rowId, qty) => {
    setBusyId(rowId);
    try {
      await axios.post(`${API}/${rowId}/complete`, { completion_qty: qty, completion_remarks: completionRemarks[rowId] || "" });
      setCompletionRemarks((prev) => ({ ...prev, [rowId]: "" }));
      await loadData();
    } catch (err) {
      alert(err?.response?.data?.error || err?.message || "Failed to complete");
    } finally {
      setBusyId("");
    }
  };

  const editRow = async (row) => {
    if (!canEdit) return;
    setEditId(row?.id || row?._id || "");
    setForm({
      entry_date: row?.entry_date ? new Date(row.entry_date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
      employee_id: String(row?.employee_id || user?.id || ""),
      location_id: String(row?.location_id || ""),
      company_id: String(row?.company_id || ""),
      company_account_id: String(row?.company_account_id || ""),
      product_id: String(row?.product_id || ""),
      consignee_id: String(row?.consignee_id || ""),
      original_qty: row?.original_qty ?? "",
      actual_unloading_qty: row?.actual_unloading_qty ?? "",
      rejection_qty: row?.rejection_qty ?? "",
      reason: row?.reason || "",
      remarks: row?.remarks || "",
    });
    setShowForm(true);
  };

  const submitReport = async () => {
    if (!canReport) return;
    try {
      const response = await axios.get(`${API}/report`, { params: { from: reportFrom, to: reportTo, action_type: actionFilter } });
      const payload = response?.data?.data || response?.data || {};
      setReportRows(Array.isArray(payload) ? payload : (payload.rows || []));
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || "Unable to load report");
      setReportRows([]);
    }
  };

  if (!canView) {
    return <div style={styles.page}><div style={styles.emptyLarge}><div style={styles.emptyIcon}>!</div><h2 style={styles.emptyTitle}>Daily Rejection Access Required</h2><div style={styles.emptyText}>Please ask an administrator to give you Daily Rejection access.</div></div></div>;
  }

  return (
    <div style={styles.page}>
      <div style={styles.hero}>
        <div><div style={styles.kicker}>WAREHOUSE OPERATIONS</div><h1 style={styles.title}>Daily Rejection</h1><div style={styles.subtitle}>Create rejection entries, assign work to staff, and close completed work from one smart workflow.</div></div>
        <button type="button" onClick={() => navigate(-1)} style={styles.back}>Back</button>
      </div>

      <div style={styles.summaryGrid}>
        {[['Total', summary.total, 'neutral'], ['Pending', summary.pending, 'pending'], ['Running', summary.running, 'running'], ['Complete', summary.complete, 'complete']].map(([label, value, kind]) => (
          <div key={label} style={{ ...styles.metric, ...(styles.metricKinds[kind] || {}) }}><div style={styles.metricLabel}>{label}</div><div style={styles.metricValue}>{value ?? 0}</div></div>
        ))}
      </div>

      <div style={styles.toolbar}>
        <div style={styles.tabs}>{STATUSES.filter((item) => item !== "REPORT" || canReport).map((item) => <button key={item} type="button" onClick={() => setStatus(item)} style={status === item ? styles.tabActive : styles.tab}>{item}</button>)}</div>
        <div style={styles.toolbarRight}>
          <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} style={styles.compactSelect}><option value="ALL">All Work</option>{WORK_DESCRIPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}</select>
          {canCreate && <button type="button" onClick={() => { resetForm(); setShowForm(true); }} style={styles.primary}>+ New Rejection</button>}
          <button type="button" onClick={loadData} style={styles.secondary}>Refresh</button>
        </div>
      </div>

      {status === "REPORT" && canReport ? (
        <div style={styles.reportPanel}>
          <div style={styles.reportHead}><div><div style={styles.kicker}>REPORT</div><div style={styles.reportTitle}>Daily Rejection Date-wise Report</div></div><button type="button" onClick={submitReport} style={styles.primary}>Generate Report</button></div>
          <div style={styles.reportFilters}>
            <Field label="From Date"><input type="date" value={reportFrom} onChange={(e) => setReportFrom(e.target.value)} style={styles.input} /></Field>
            <Field label="To Date"><input type="date" value={reportTo} onChange={(e) => setReportTo(e.target.value)} style={styles.input} /></Field>
            <Field label="Work"><select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} style={styles.input}><option value="ALL">All Work</option>{WORK_DESCRIPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}</select></Field>
          </div>
          <div style={styles.reportTableWrap}>{reportRows.length ? <table style={styles.table}><thead><tr>{["Date","Rejection No","Company","Account","Consignee","Product","Original","Unloading","Reject","Reason","Work","Assigned To","Status"].map((h) => <th key={h} style={styles.th}>{h}</th>)}</tr></thead><tbody>{reportRows.map((row) => <tr key={idOf(row)}>{[row.entry_date ? new Date(row.entry_date).toLocaleDateString('en-GB') : '-', row.rejection_no, row.company_name, row.company_account_name, row.consignee_name || row.consignee, row.product_name, money(row.original_qty), money(row.actual_unloading_qty), money(row.rejection_qty), row.reason, row.action_type, row.assigned_to_name, row.status].map((v,i)=><td key={i} style={styles.td}>{v || '-'}</td>)}</tr>)}</tbody></table> : <div style={styles.empty}>Select dates and click Generate Report.</div>}</div>
        </div>
      ) : null}

      {showForm && (
        <div style={styles.formCard}>
          <div style={styles.formHeader}><div><div style={styles.kicker}>NEW ENTRY</div><h2 style={styles.formTitle}>{editId ? "Edit Daily Rejection" : "Create Daily Rejection"}</h2></div><button type="button" onClick={() => setShowForm(false)} style={styles.close}>×</button></div>
          <div style={styles.infoStrip}>Employee entry starts as <strong>PENDING</strong>. Work Description and Staff assignment are selected later by an authorised assigner.</div>
          <form onSubmit={submitEntry}>
            <div style={styles.section}><div style={styles.sectionTitle}>1 · Basic Details</div><div style={styles.grid}>
              <Field label="Date"><input type="date" value={form.entry_date} onChange={(e) => updateForm('entry_date', e.target.value)} style={styles.input} /></Field>
              <Field label="Location"><select value={form.location_id} onChange={(e) => updateForm('location_id', e.target.value)} style={styles.input}><option value="">Select Location</option>{masters.locations.map((item) => <option key={idOf(item)} value={idOf(item)}>{textOf(item)}</option>)}</select></Field>
              <Field label="Company"><select value={form.company_id} onChange={(e) => { updateForm('company_id', e.target.value); updateForm('company_account_id', ''); }} style={styles.input}><option value="">Select Company</option>{masters.companies.map((item) => <option key={idOf(item)} value={idOf(item)}>{textOf(item)}</option>)}</select></Field>
              <Field label="Company Account"><select value={form.company_account_id} onChange={(e) => updateForm('company_account_id', e.target.value)} style={styles.input}><option value="">Select Account</option>{filteredAccounts.map((item) => <option key={idOf(item)} value={idOf(item)}>{item.account_name || item.name || '-'}</option>)}</select></Field>
              <Field label="Consignee"><select value={form.consignee_id} onChange={(e) => updateForm('consignee_id', e.target.value)} style={styles.input}><option value="">Select Consignee</option>{masters.consignees.map((item) => <option key={idOf(item)} value={idOf(item)}>{textOf(item)}</option>)}</select></Field>
              <Field label="Product"><select value={form.product_id} onChange={(e) => updateForm('product_id', e.target.value)} style={styles.input}><option value="">Select Product</option>{masters.products.map((item) => <option key={idOf(item)} value={idOf(item)}>{textOf(item)}</option>)}</select></Field>
            </div></div>

            <div style={styles.section}><div style={styles.sectionTitle}>2 · Quantity Check</div><div style={styles.quantityGrid}>
              <Field label="Original Qty"><input type="number" min="0" step="0.01" value={form.original_qty} onChange={(e) => updateForm('original_qty', e.target.value)} style={styles.input} /></Field>
              <Field label="Actual Unloading Qty"><input type="number" min="0" step="0.01" value={form.actual_unloading_qty} onChange={(e) => updateForm('actual_unloading_qty', e.target.value)} style={styles.input} /></Field>
              <div style={styles.rejectBox}><div style={styles.rejectLabel}>Automatic Rejection</div><div style={styles.rejectValue}>{money(rejectionQty)}</div><div style={styles.rejectHint}>Original Qty − Actual Unloading Qty</div></div>
            </div></div>

            <div style={styles.section}><div style={styles.sectionTitle}>3 · Rejection Reason</div><div style={styles.grid}>
              <Field label="Reason"><select value={form.reason} onChange={(e) => updateForm('reason', e.target.value)} style={styles.input}><option value="">Select Reason</option>{REASONS.map((item) => <option key={item} value={item}>{item}</option>)}</select></Field>
              <Field label="Remark"><input value={form.remarks} onChange={(e) => updateForm('remarks', e.target.value)} placeholder="Optional note" style={styles.input} /></Field>
            </div></div>

            <div style={styles.actionRow}><button type="submit" disabled={saving} style={styles.primary}>{saving ? 'Saving...' : editId ? 'Update Rejection' : 'Save Pending'}</button><button type="button" onClick={() => { setShowForm(false); setEditId(""); resetForm(); }} style={styles.secondary}>Cancel</button></div>
          </form>
        </div>
      )}

      {error ? <div style={styles.error}>{error}</div> : null}

      <div style={styles.list}>
        {loading ? <div style={styles.empty}>Loading Daily Rejection...</div> : rows.length === 0 ? <div style={styles.empty}>No Daily Rejection records found.</div> : rows.map((row) => {
          const rowId = idOf(row);
          const assignedToMe = String(row.assigned_to || '') === String(user?.id || '') || String(row.assigned_to || '') === String(user?._id || '');
          const badge = statusStyle(row.status);
          return (
            <div key={rowId} style={styles.card}>
              <div style={styles.cardAccent} />
              <div style={styles.cardTop}><div><div style={styles.rejNo}>{row.rejection_no || rowId}</div><div style={styles.meta}>{row.entry_date ? new Date(row.entry_date).toLocaleDateString('en-GB') : '-'} · {row.employee_name || '-'}</div></div><span style={{ ...styles.badge, ...badge }}>{row.status || 'PENDING'}</span></div>
              <div style={styles.details}>
                <Detail label="Location" value={row.location_name} /><Detail label="Company" value={row.company_name} /><Detail label="Account" value={row.company_account_name} /><Detail label="Consignee" value={row.consignee_name || row.consignee} /><Detail label="Product" value={row.product_name} /><Detail label="Original Qty" value={money(row.original_qty)} /><Detail label="Unloading Qty" value={money(row.actual_unloading_qty)} /><Detail label="Rejection Qty" value={money(row.rejection_qty)} /><Detail label="Reason" value={row.reason} /><Detail label="Work" value={row.action_type} /><Detail label="Assigned To" value={row.assigned_to_name} />
              </div>

              {canEdit && row.status !== 'COMPLETE' ? <div style={styles.editRow}><button type="button" onClick={() => editRow(row)} style={styles.editButton}>Edit Entry</button></div> : null}

              {canAssign && row.status !== 'COMPLETE' ? (
                <div style={styles.assignPanel}>
                  <div style={styles.assignHead}><span>ASSIGN WORK</span><small>Authorised users only</small></div>
                  <div style={styles.assignGrid}>
                    <select value={assignedAction[rowId] || row.action_type || ''} onChange={(e) => setAssignedAction((prev) => ({ ...prev, [rowId]: e.target.value }))} style={styles.input}><option value="">Select Work Description</option>{WORK_DESCRIPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}</select>
                    <select value={assignedEmployee[rowId] || row.assigned_to || ''} onChange={(e) => setAssignedEmployee((prev) => ({ ...prev, [rowId]: e.target.value }))} style={styles.input}><option value="">Select Staff</option>{masters.employees.map((item) => <option key={idOf(item)} value={idOf(item)}>{textOf(item)}</option>)}</select>
                    <button type="button" disabled={busyId === rowId} onClick={() => assignRow(rowId)} style={styles.assignButton}>{busyId === rowId ? 'Assigning...' : row.status === 'RUNNING' ? 'Reassign & Keep Running' : 'Assign & Start Work'}</button>
                  </div>
                </div>
              ) : null}

              {assignedToMe && row.status === 'RUNNING' ? (
                <div style={styles.workerPanel}>
                  <div><div style={styles.workerTitle}>Your Assigned Work</div><div style={styles.workerWork}>{row.action_type || 'Work assigned'} · {money(row.rejection_qty)} Qty</div></div>
                  <div style={styles.completeRow}><input value={completionRemarks[rowId] || ''} onChange={(e) => setCompletionRemarks((prev) => ({ ...prev, [rowId]: e.target.value }))} placeholder="Completion remark (optional)" style={styles.input} /><button type="button" disabled={busyId === rowId} onClick={() => completeRow(rowId, row.rejection_qty)} style={styles.complete}>{busyId === rowId ? 'Completing...' : '✓ Complete Work'}</button></div>
                </div>
              ) : null}

              {row.status === 'COMPLETE' ? <div style={styles.completedPanel}>✓ Work completed{row.completed_by_name ? ` by ${row.completed_by_name}` : ''}{row.completed_at ? ` · ${new Date(row.completed_at).toLocaleString('en-GB')}` : ''}</div> : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Field({ label, children }) { return <label style={styles.field}><span style={styles.label}>{label}</span>{children}</label>; }
function Detail({ label, value }) { return <div style={styles.detail}><div style={styles.detailLabel}>{label}</div><div style={styles.detailValue}>{value == null || value === '' ? '-' : value}</div></div>; }

const styles = {
  page: { minHeight: '100vh', background: 'linear-gradient(180deg,#f8fafc 0%,#eef6f5 100%)', padding: 14, fontFamily: 'Segoe UI,Arial,sans-serif', boxSizing: 'border-box' },
  hero: { background: 'linear-gradient(135deg,#0f766e,#155e75 72%,#164e63)', color: '#fff', borderRadius: 22, padding: 22, display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center', flexWrap: 'wrap', boxShadow: '0 14px 34px rgba(15,118,110,.22)' },
  kicker: { fontSize: 11, fontWeight: 900, letterSpacing: 1.1, opacity: .82 }, title: { margin: '4px 0', fontSize: 30, lineHeight: 1.1 }, subtitle: { opacity: .88, fontSize: 13, maxWidth: 760 },
  back: { border: '1px solid rgba(255,255,255,.35)', background: 'rgba(255,255,255,.12)', color: '#fff', borderRadius: 10, padding: '9px 14px', fontWeight: 800, cursor: 'pointer' },
  summaryGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 10, margin: '12px 0' },
  metric: { background: '#fff', border: '1px solid #dbe4ee', borderRadius: 16, padding: 14, boxShadow: '0 7px 20px rgba(15,23,42,.05)' }, metricKinds: { running: { borderColor: '#99f6e4' }, complete: { borderColor: '#a7f3d0' }, pending: { borderColor: '#fed7aa' }, neutral: {} },
  metricLabel: { fontSize: 11, color: '#64748b', fontWeight: 800 }, metricValue: { fontSize: 25, color: '#0f172a', fontWeight: 900, marginTop: 3 },
  toolbar: { background: '#fff', border: '1px solid #dbe4ee', borderRadius: 16, padding: 11, display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', alignItems: 'center' }, tabs: { display: 'flex', gap: 7, flexWrap: 'wrap' }, toolbarRight: { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' },
  tab: { border: '1px solid #cbd5e1', background: '#fff', color: '#334155', borderRadius: 999, padding: '8px 12px', fontWeight: 800, cursor: 'pointer' }, tabActive: { border: '1px solid #0f766e', background: '#0f766e', color: '#fff', borderRadius: 999, padding: '8px 12px', fontWeight: 800, cursor: 'pointer' }, compactSelect: { minHeight: 40, border: '1px solid #cbd5e1', borderRadius: 10, padding: '8px 10px', background: '#fff' },
  primary: { border: 0, background: '#0f766e', color: '#fff', borderRadius: 11, padding: '10px 15px', fontWeight: 900, cursor: 'pointer', boxShadow: '0 5px 12px rgba(15,118,110,.16)' }, secondary: { border: '1px solid #cbd5e1', background: '#fff', color: '#334155', borderRadius: 11, padding: '10px 14px', fontWeight: 900, cursor: 'pointer' },
  formCard: { background: '#fff', border: '1px solid #dbe4ee', borderRadius: 20, padding: 17, marginTop: 12, boxShadow: '0 12px 30px rgba(15,23,42,.07)' }, formHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 8 }, formTitle: { margin: '2px 0 0', color: '#0f172a', fontSize: 23 }, close: { border: 0, background: '#f1f5f9', color: '#334155', width: 35, height: 35, borderRadius: 10, fontSize: 22, cursor: 'pointer' }, infoStrip: { background: '#f0fdfa', border: '1px solid #99f6e4', color: '#115e59', borderRadius: 11, padding: 10, fontSize: 12, marginBottom: 8 },
  section: { marginTop: 10, paddingTop: 12, borderTop: '1px solid #eef2f7' }, sectionTitle: { color: '#0f172a', fontSize: 15, fontWeight: 900, marginBottom: 10 }, grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 11 }, quantityGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 11 }, field: { display: 'grid', gap: 6 }, label: { fontSize: 12, color: '#475569', fontWeight: 800 }, input: { width: '100%', minHeight: 42, boxSizing: 'border-box', border: '1px solid #cbd5e1', borderRadius: 10, padding: '9px 10px', background: '#fff', color: '#0f172a' },
  rejectBox: { borderRadius: 13, padding: 13, background: 'linear-gradient(135deg,#ecfeff,#f0fdfa)', border: '1px solid #99f6e4', boxShadow: 'inset 0 1px 0 rgba(255,255,255,.7)' }, rejectLabel: { color: '#0f766e', fontSize: 11, fontWeight: 900, textTransform: 'uppercase' }, rejectValue: { fontSize: 28, fontWeight: 900, color: '#115e59', marginTop: 4 }, rejectHint: { color: '#5f6f7f', fontSize: 11, marginTop: 2 }, actionRow: { display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' },
  error: { marginTop: 12, padding: 12, background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', borderRadius: 12, fontWeight: 700 }, list: { display: 'grid', gap: 12, marginTop: 12 }, empty: { background: '#fff', border: '1px dashed #cbd5e1', borderRadius: 16, padding: 30, textAlign: 'center', color: '#64748b' }, emptyLarge: { maxWidth: 560, margin: '12vh auto', background: '#fff', border: '1px solid #dbe4ee', borderRadius: 20, padding: 36, textAlign: 'center', boxShadow: '0 14px 40px rgba(15,23,42,.08)' }, emptyIcon: { width: 48, height: 48, margin: '0 auto 12px', borderRadius: '50%', background: '#fff7ed', color: '#c2410c', display: 'grid', placeItems: 'center', fontWeight: 900, fontSize: 24 }, emptyTitle: { margin: 0, color: '#0f172a' }, emptyText: { marginTop: 8, color: '#64748b' },
  card: { position: 'relative', overflow: 'hidden', background: '#fff', border: '1px solid #dbe4ee', borderRadius: 18, padding: 15, boxShadow: '0 8px 24px rgba(15,23,42,.05)' }, cardAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: '#0f766e' }, cardTop: { display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }, rejNo: { fontWeight: 950, color: '#0f172a', fontSize: 18 }, meta: { color: '#64748b', fontSize: 12, marginTop: 3 }, badge: { borderRadius: 999, padding: '6px 10px', fontSize: 10, fontWeight: 950 }, details: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(145px,1fr))', gap: 8, marginTop: 12 }, detail: { background: '#f8fafc', borderRadius: 11, padding: 9, minWidth: 0 }, detailLabel: { color: '#64748b', fontSize: 10, fontWeight: 800, textTransform: 'uppercase' }, detailValue: { color: '#0f172a', fontWeight: 700, marginTop: 3, wordBreak: 'break-word' },
  assignPanel: { marginTop: 13, border: '1px solid #bfdbfe', background: 'linear-gradient(135deg,#eff6ff,#f8fbff)', borderRadius: 14, padding: 12 }, assignHead: { display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center', marginBottom: 8, color: '#1e3a8a', fontSize: 11, fontWeight: 900 }, assignGrid: { display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr) auto', gap: 8 }, assignButton: { border: 0, background: '#1d4ed8', color: '#fff', borderRadius: 10, padding: '10px 13px', fontWeight: 900, cursor: 'pointer' },
  workerPanel: { marginTop: 13, border: '1px solid #99f6e4', background: 'linear-gradient(135deg,#ecfeff,#f0fdfa)', borderRadius: 14, padding: 12 }, workerTitle: { color: '#115e59', fontWeight: 950 }, workerWork: { color: '#475569', fontSize: 12, marginTop: 3 }, completeRow: { display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto', gap: 8, marginTop: 10 }, complete: { border: 0, background: '#047857', color: '#fff', borderRadius: 10, padding: '10px 14px', fontWeight: 900, cursor: 'pointer' }, completedPanel: { marginTop: 12, padding: 10, borderRadius: 11, background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#047857', fontWeight: 800 },
};
