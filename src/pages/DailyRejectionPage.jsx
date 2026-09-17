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
  lorry_no: "",
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


function formatDate(value) {
  if (!value) return "-";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "-" : d.toLocaleDateString("en-GB");
}

function Icon({ type, size = 18 }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
  };
  if (type === "edit") {
    return <svg {...common}><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>;
  }
  if (type === "whatsapp") {
    return <svg {...common}><path d="M20 11.5a8 8 0 0 1-11.8 7L4 20l1.5-4A8 8 0 1 1 20 11.5Z"/><path d="M9 8.8c.2-.4.5-.4.8-.4l.6 1.4c.1.2.1.4-.1.6l-.5.5c.6 1 1.4 1.8 2.4 2.3l.6-.6c.2-.2.3-.2.6-.1l1.4.6c.3.1.4.3.3.6-.3.9-.9 1.4-1.7 1.3-2.9-.3-5.8-3.2-6.2-6.1-.1-.8.3-1.4 1.8-1.5Z"/></svg>;
  }
  if (type === "pdf") {
    return <svg {...common}><path d="M6 2h9l4 4v16H6Z"/><path d="M14 2v5h5"/><path d="M8 15h2.5a1.5 1.5 0 0 0 0-3H8v6"/><path d="M13 12h2a3 3 0 0 1 0 6h-2Z"/><path d="M19 12h-3v6"/></svg>;
  }
  if (type === "copy") {
    return <svg {...common}><rect x="8" y="8" width="11" height="12" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h3"/></svg>;
  }
  return null;
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
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = "success") => {
    setToast({ id: Date.now(), message, type });
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

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
      showToast("Location, Product, Consignee, Reason, Original Qty and Actual Unloading Qty are required.", "error");
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form, original_qty: originalQty, actual_unloading_qty: unloadingQty, rejection_qty: rejectionQty };
      if (editId) {
        await axios.put(`${API}/${editId}`, payload);
        showToast("Daily Rejection updated successfully.", "success");
      } else {
        await axios.post(API, payload);
        showToast("Daily Rejection saved as Pending.", "success");
      }
      resetForm();
      setShowForm(false);
      setEditId("");
      await loadData();
    } catch (err) {
      showToast(err?.response?.data?.error || err?.message || "Failed to save Daily Rejection", "error");
    } finally {
      setSaving(false);
    }
  };

  const assignRow = async (rowId) => {
    const employeeId = assignedEmployee[rowId];
    const actionType = assignedAction[rowId];
    if (!employeeId || !actionType) {
      showToast("Please select a staff member and Work Description first.", "warning");
      return;
    }
    setBusyId(rowId);
    try {
      await axios.patch(`${API}/${rowId}/assign`, { assigned_to: employeeId, action_type: actionType });
      showToast("Work assigned successfully and moved to Running.", "success");
      await loadData();
    } catch (err) {
      showToast(err?.response?.data?.error || err?.message || "Failed to assign the work.", "error");
    } finally {
      setBusyId("");
    }
  };

  const completeRow = async (rowId, qty) => {
    setBusyId(rowId);
    try {
      await axios.post(`${API}/${rowId}/complete`, { completion_qty: qty, completion_remarks: completionRemarks[rowId] || "" });
      setCompletionRemarks((prev) => ({ ...prev, [rowId]: "" }));
      showToast("Work completed successfully.", "success");
      await loadData();
    } catch (err) {
      showToast(err?.response?.data?.error || err?.message || "Failed to complete the work.", "error");
    } finally {
      setBusyId("");
    }
  };


  const buildShareText = (row) => [
    `Daily Rejection ${row?.rejection_no || ""}`.trim(),
    `Date: ${formatDate(row?.entry_date)}`,
    `Lorry No: ${row?.lorry_no || "-"}`,
    `Company: ${row?.company_name || "-"}`,
    `Account: ${row?.company_account_name || "-"}`,
    `Consignee: ${row?.consignee_name || row?.consignee || "-"}`,
    `Product: ${row?.product_name || "-"}`,
    `Original Qty: ${money(row?.original_qty)}`,
    `Unloading Qty: ${money(row?.actual_unloading_qty)}`,
    `Rejection Qty: ${money(row?.rejection_qty)}`,
    `Reason: ${row?.reason || "-"}`,
    `Work: ${row?.action_type || "-"}`,
    `Assigned To: ${row?.assigned_to_name || "-"}`,
    `Status: ${row?.status || "-"}`,
  ].join("\n");

  const copyRowText = async (row) => {
    const text = buildShareText(row);
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const area = document.createElement("textarea");
        area.value = text;
        area.style.position = "fixed";
        area.style.left = "-9999px";
        document.body.appendChild(area);
        area.focus();
        area.select();
        document.execCommand("copy");
        area.remove();
      }
      showToast("Daily Rejection text copied. You can now paste it wherever you want.", "success");
    } catch (err) {
      showToast("Unable to copy the Daily Rejection text. Please try again.", "error");
    }
  };

  const shareWhatsApp = (row) => {
    let mobile = String(row?.consignee_mobile || row?.mobile || row?.phone || "").replace(/\D/g, "");
    if (mobile.length === 10) mobile = `91${mobile}`;
    const message = buildShareText(row);
    const url = mobile
      ? `https://wa.me/${mobile}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank", "noopener,noreferrer");
    showToast("WhatsApp share opened.", "success");
  };

  const openPdf = (row) => {
    const popup = window.open("", "_blank", "width=900,height=700");
    if (!popup) {
      showToast("Please allow pop-ups to open the PDF preview.", "warning");
      return;
    }
    const esc = (value) => String(value ?? "-")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
    const htmlDoc = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(row?.rejection_no || "Daily Rejection")}</title>
      <style>
        body{font-family:Arial,sans-serif;padding:28px;color:#0f172a}h1{font-size:22px;margin:0 0 4px}
        .meta{color:#64748b;margin-bottom:18px}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
        .box{border:1px solid #dbe4ee;border-radius:10px;padding:10px}.l{font-size:10px;color:#64748b;font-weight:700;text-transform:uppercase}.v{font-size:14px;font-weight:700;margin-top:3px}
        .qty{margin-top:16px;padding:12px;border-radius:10px;background:#f0fdfa;border:1px solid #99f6e4}
        .foot{margin-top:22px;color:#64748b;font-size:11px}
        @media print{body{padding:10px}}
      </style></head><body>
      <h1>Daily Rejection — ${esc(row?.rejection_no || "")}</h1>
      <div class="meta">${esc(formatDate(row?.entry_date))}</div>
      <div class="grid">
        <div class="box"><div class="l">Lorry No</div><div class="v">${esc(row?.lorry_no)}</div></div>
        <div class="box"><div class="l">Company</div><div class="v">${esc(row?.company_name)}</div></div>
        <div class="box"><div class="l">Account</div><div class="v">${esc(row?.company_account_name)}</div></div>
        <div class="box"><div class="l">Consignee</div><div class="v">${esc(row?.consignee_name || row?.consignee)}</div></div>
        <div class="box"><div class="l">Product</div><div class="v">${esc(row?.product_name)}</div></div>
        <div class="box"><div class="l">Reason</div><div class="v">${esc(row?.reason)}</div></div>
        <div class="box"><div class="l">Work</div><div class="v">${esc(row?.action_type)}</div></div>
        <div class="box"><div class="l">Assigned To</div><div class="v">${esc(row?.assigned_to_name)}</div></div>
        <div class="box"><div class="l">Status</div><div class="v">${esc(row?.status)}</div></div>
        <div class="box"><div class="l">Employee</div><div class="v">${esc(row?.employee_name)}</div></div>
      </div>
      <div class="qty"><strong>Original Qty:</strong> ${esc(money(row?.original_qty))} &nbsp;&nbsp; <strong>Unloading Qty:</strong> ${esc(money(row?.actual_unloading_qty))} &nbsp;&nbsp; <strong>Rejection Qty:</strong> ${esc(money(row?.rejection_qty))}</div>
      <div class="foot">Generated from Warehouse App Daily Rejection.</div>
      <script>window.onload=function(){setTimeout(function(){window.print()},250)}</script>
      </body></html>`;
    popup.document.open();
    popup.document.write(htmlDoc);
    popup.document.close();
    showToast("PDF preview opened.", "success");
  };

  const renderActionIcons = (row) => {
    const allowEdit = canEdit && row?.status !== "COMPLETE";
    return (
      <div style={styles.actionIcons}>
        {allowEdit ? (
          <button type="button" title="Edit" aria-label="Edit" onClick={() => editRow(row)} style={{ ...styles.iconButton, ...styles.iconEdit }}>
            <Icon type="edit" />
          </button>
        ) : <span style={styles.iconSpacer} />}
        <button type="button" title="Copy Text" aria-label="Copy Text" onClick={() => copyRowText(row)} style={{ ...styles.iconButton, ...styles.copyButton }}>
          <Icon type="copy" size={16} />
          <span>Copy</span>
        </button>
        <button type="button" title="WhatsApp" aria-label="WhatsApp" onClick={() => shareWhatsApp(row)} style={{ ...styles.iconButton, ...styles.iconWhatsapp }}>
          <Icon type="whatsapp" />
        </button>
        <button type="button" title="PDF" aria-label="PDF" onClick={() => openPdf(row)} style={{ ...styles.iconButton, ...styles.iconPdf }}>
          <Icon type="pdf" />
        </button>
      </div>
    );
  };

  const assignedToMeRow = (row) => String(row?.assigned_to || "") === String(user?.id || "") || String(row?.assigned_to || "") === String(user?._id || "");

  const renderMobileCards = (tableRows, withWorkflow = true) => (
    <div className="dr-mobile-list">
      {tableRows.length ? tableRows.map((row) => {
        const rowId = idOf(row);
        const assignedToMe = assignedToMeRow(row);
        const isComplete = row?.status === "COMPLETE";
        const actionValue = assignedAction[rowId] || row?.action_type || "";
        const employeeValue = assignedEmployee[rowId] || row?.assigned_to || "";
        const rowBusy = busyId === rowId;
        return (
          <div key={rowId} className="dr-mobile-card">
            <div className="dr-mobile-card-head">
              <div>
                <div className="dr-mobile-rej">{row?.rejection_no || rowId}</div>
                <div className="dr-mobile-date">{formatDate(row?.entry_date)}</div>
              </div>
              <span style={{ ...styles.statusChip, ...statusStyle(row?.status) }}>{row?.status || "PENDING"}</span>
            </div>
            <div className="dr-mobile-grid">
              <div><span>Date</span><b>{formatDate(row?.entry_date)}</b></div>
              <div><span>Rejection No</span><b>{row?.rejection_no || rowId}</b></div>
              <div><span>Lorry No</span><b>{row?.lorry_no || "-"}</b></div>
              <div><span>Company</span><b>{row?.company_name || "-"}</b></div>
              <div><span>Account</span><b>{row?.company_account_name || "-"}</b></div>
              <div><span>Consignee</span><b>{row?.consignee_name || row?.consignee || "-"}</b></div>
              <div><span>Product</span><b>{row?.product_name || "-"}</b></div>
              <div><span>Original</span><b>{money(row?.original_qty)}</b></div>
              <div><span>Unloading</span><b>{money(row?.actual_unloading_qty)}</b></div>
              <div><span>Reject</span><b>{money(row?.rejection_qty)}</b></div>
              <div><span>Reason</span><b>{row?.reason || "-"}</b></div>
              <div><span>Work</span><b>{row?.action_type || "-"}</b></div>
              <div><span>Assigned To</span><b>{row?.assigned_to_name || "-"}</b></div>
            </div>

            {withWorkflow && canAssign && !isComplete ? (
              <div className="dr-mobile-workflow">
                <div className="dr-mobile-workflow-title">ASSIGN WORK</div>
                <div className="dr-mobile-workflow-grid">
                  <select value={actionValue} disabled={isComplete} onChange={(e) => setAssignedAction((prev) => ({ ...prev, [rowId]: e.target.value }))} style={styles.workflowSelect}>
                    <option value="">Select Work</option>
                    {WORK_DESCRIPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                  <select value={employeeValue} disabled={isComplete} onChange={(e) => setAssignedEmployee((prev) => ({ ...prev, [rowId]: e.target.value }))} style={styles.workflowSelect}>
                    <option value="">Select Staff</option>
                    {masters.employees.map((item) => <option key={idOf(item)} value={idOf(item)}>{textOf(item)}</option>)}
                  </select>
                  <button type="button" disabled={rowBusy || isComplete || !actionValue || !employeeValue} onClick={() => assignRow(rowId)} style={{ ...styles.assignButtonInline, opacity: rowBusy || isComplete || !actionValue || !employeeValue ? 0.55 : 1 }}>
                    {rowBusy ? "Assigning..." : row?.status === "RUNNING" ? "Reassign & Keep Running" : "Assign & Start Work"}
                  </button>
                </div>
              </div>
            ) : null}

            {withWorkflow && assignedToMe && row?.status === "RUNNING" ? (
              <div className="dr-mobile-worker">
                <div className="dr-mobile-workflow-title">YOUR ASSIGNED WORK</div>
                <div className="dr-mobile-worker-work">{row?.action_type || "Work assigned"} · {money(row?.rejection_qty)} Qty</div>
                <div className="dr-mobile-complete">
                  <input value={completionRemarks[rowId] || ""} onChange={(e) => setCompletionRemarks((prev) => ({ ...prev, [rowId]: e.target.value }))} placeholder="Completion note" style={styles.workflowInput} />
                  <button type="button" disabled={rowBusy} onClick={() => completeRow(rowId, row?.rejection_qty)} style={styles.completeInline}>{rowBusy ? "Completing..." : "✓ Complete Work"}</button>
                </div>
              </div>
            ) : null}

            <div className="dr-mobile-actions">
              {renderActionIcons(row)}
            </div>
          </div>
        );
      }) : <div style={styles.emptyCell}>No Daily Rejection records found.</div>}
    </div>
  );

  const renderTable = (tableRows, withWorkflow = true, reportMode = false) => {
    const showManagerWorkflow = withWorkflow && canAssign;
    const showReportWorkflow = reportMode;
    const totalColumns = 15 + (showManagerWorkflow || showReportWorkflow ? 3 : withWorkflow ? 1 : 0);
    const headers = [
      "Date",
      "Rejection No",
      "Lorry No",
      "Company",
      "Account",
      "Consignee",
      "Product",
      "Original",
      "Unloading",
      "Reject",
      "Reason",
      "Work",
      "Assigned To",
      "Status",
      ...(showManagerWorkflow || showReportWorkflow ? ["Assign Work", "Select Staff", "Work Action"] : withWorkflow ? ["Work Action"] : []),
      "Action",
    ];

    return (
      <>
        <div className="dr-desktop-table">
          <div className="dr-scroll-shell">
            <div className="dr-scroll-hint" aria-hidden="true">← Scroll horizontally to see all details and actions →</div>
            <div style={styles.tableOuter}>
              <table style={{ ...styles.dataTable, minWidth: showManagerWorkflow ? 2350 : showReportWorkflow ? 2250 : withWorkflow ? 1850 : 1650 }}>
              <thead>
                <tr>
                  {headers.map((head) => (
                    <th key={head} style={{ ...styles.th, ...(head === "Action" ? styles.actionTh : {}), ...(head === "Assign Work" || head === "Select Staff" || head === "Work Action" ? styles.workflowTh : {}) }}>{head}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableRows.length ? tableRows.map((row) => {
                  const rowId = idOf(row);
                  const assignedToMe = assignedToMeRow(row);
                  const isComplete = row?.status === "COMPLETE";
                  const actionValue = assignedAction[rowId] || row?.action_type || "";
                  const employeeValue = assignedEmployee[rowId] || row?.assigned_to || "";
                  const rowBusy = busyId === rowId;
                  return (
                    <tr key={rowId}>
                      <td style={styles.td}>{formatDate(row?.entry_date)}</td>
                      <td style={{ ...styles.td, fontWeight: 900 }}>{row?.rejection_no || rowId}</td>
                      <td style={styles.td}>{row?.lorry_no || "-"}</td>
                      <td style={styles.td}>{row?.company_name || "-"}</td>
                      <td style={styles.td}>{row?.company_account_name || "-"}</td>
                      <td style={styles.td}>{row?.consignee_name || row?.consignee || "-"}</td>
                      <td style={styles.td}>{row?.product_name || "-"}</td>
                      <td style={styles.tdNum}>{money(row?.original_qty)}</td>
                      <td style={styles.tdNum}>{money(row?.actual_unloading_qty)}</td>
                      <td style={{ ...styles.tdNum, fontWeight: 900 }}>{money(row?.rejection_qty)}</td>
                      <td style={styles.td}>{row?.reason || "-"}</td>
                      <td style={styles.td}>{row?.action_type || "-"}</td>
                      <td style={styles.td}>{row?.assigned_to_name || "-"}</td>
                      <td style={styles.td}><span style={{ ...styles.statusChip, ...statusStyle(row?.status) }}>{row?.status || "PENDING"}</span></td>
                      {showManagerWorkflow ? (
                        <>
                          <td style={{ ...styles.td, ...styles.workflowTd }}><select value={actionValue} disabled={isComplete} onChange={(e) => setAssignedAction((prev) => ({ ...prev, [rowId]: e.target.value }))} style={styles.workflowSelect}><option value="">Select Work</option>{WORK_DESCRIPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}</select></td>
                          <td style={{ ...styles.td, ...styles.workflowTd }}><select value={employeeValue} disabled={isComplete} onChange={(e) => setAssignedEmployee((prev) => ({ ...prev, [rowId]: e.target.value }))} style={styles.workflowSelect}><option value="">Select Staff</option>{masters.employees.map((item) => <option key={idOf(item)} value={idOf(item)}>{textOf(item)}</option>)}</select></td>
                          <td style={{ ...styles.td, ...styles.workflowTd }}><button type="button" disabled={rowBusy || isComplete || !actionValue || !employeeValue} onClick={() => assignRow(rowId)} style={{ ...styles.assignButtonInline, opacity: rowBusy || isComplete || !actionValue || !employeeValue ? 0.55 : 1 }}>{rowBusy ? "Assigning..." : row?.status === "RUNNING" ? "Reassign & Keep Running" : "Assign & Start Work"}</button></td>
                        </>
                      ) : showReportWorkflow ? (
                        <>
                          <td style={{ ...styles.td, ...styles.workflowTd }}><span style={styles.reportWorkflowValue}>{row?.action_type || "-"}</span></td>
                          <td style={{ ...styles.td, ...styles.workflowTd }}><span style={styles.reportWorkflowValue}>{row?.assigned_to_name || "-"}</span></td>
                          <td style={{ ...styles.td, ...styles.workflowTd }}><span style={{ ...styles.reportWorkflowChip, ...statusStyle(row?.status) }}>{row?.status === "COMPLETE" ? "Completed" : row?.status === "RUNNING" ? "Running" : row?.status === "ASSIGNED" ? "Assigned" : "Pending"}</span></td>
                        </>
                      ) : withWorkflow ? (
                        <td style={{ ...styles.td, ...styles.workflowTd }}>{assignedToMe && row?.status === "RUNNING" ? <div style={styles.workerInline}><input value={completionRemarks[rowId] || ""} onChange={(e) => setCompletionRemarks((prev) => ({ ...prev, [rowId]: e.target.value }))} placeholder="Completion note" style={styles.workflowInput} /><button type="button" disabled={rowBusy} onClick={() => completeRow(rowId, row?.rejection_qty)} style={styles.completeInline}>{rowBusy ? "Completing..." : "✓ Complete Work"}</button></div> : <span style={styles.mutedDash}>-</span>}</td>
                      ) : null}
                      <td style={{ ...styles.td, ...styles.actionTd, position: "sticky", right: 0, background: "#fff", zIndex: 4 }}>{renderActionIcons(row)}</td>
                    </tr>
                  );
                }) : <tr><td colSpan={totalColumns} style={styles.emptyCell}>No Daily Rejection records found.</td></tr>}
              </tbody>
              </table>
            </div>
          </div>
        </div>
        {renderMobileCards(tableRows, withWorkflow)}
      </>
    );
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
      lorry_no: String(row?.lorry_no || ""),
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
    <>
      <style>{`

        .dr-mobile-list { display:none; }
        .dr-scroll-shell { width:100%; max-width:100%; }
        .dr-scroll-hint { display:flex; justify-content:flex-end; align-items:center; min-height:24px; padding:0 8px 5px; color:#64748b; font-size:10px; font-weight:800; letter-spacing:.2px; white-space:nowrap; }
        .dr-scroll-shell .tableOuter { scrollbar-color:#94a3b8 #eef2f7; scrollbar-width:auto; }
        .dr-scroll-shell .tableOuter::-webkit-scrollbar { height:12px; }
        .dr-scroll-shell .tableOuter::-webkit-scrollbar-track { background:#eef2f7; border-radius:999px; }
        .dr-scroll-shell .tableOuter::-webkit-scrollbar-thumb { background:#94a3b8; border-radius:999px; border:2px solid #eef2f7; }
        .dr-scroll-shell .tableOuter::-webkit-scrollbar-thumb:hover { background:#64748b; }
        .dr-mobile-card { background:#fff; border:1px solid #dbe4ee; border-radius:16px; padding:12px; box-shadow:0 8px 24px rgba(15,23,42,.05); }
        .dr-mobile-card-head { display:flex; justify-content:space-between; align-items:flex-start; gap:10px; padding-bottom:10px; border-bottom:1px solid #eef2f7; }
        .dr-mobile-rej { font-weight:900; color:#0f172a; font-size:15px; }
        .dr-mobile-date { color:#64748b; font-size:11px; margin-top:2px; }
        .dr-mobile-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:7px; margin-top:10px; }
        .dr-mobile-grid > div { background:#f8fafc; border:1px solid #eef2f7; border-radius:10px; padding:8px; min-width:0; }
        .dr-mobile-grid span { display:block; color:#64748b; font-size:9px; font-weight:800; text-transform:uppercase; }
        .dr-mobile-grid b { display:block; color:#0f172a; font-size:12px; margin-top:2px; word-break:break-word; }
        .dr-mobile-workflow,.dr-mobile-worker { margin-top:10px; border-radius:12px; padding:10px; }
        .dr-mobile-workflow { background:linear-gradient(135deg,#eff6ff,#f8fbff); border:1px solid #bfdbfe; }
        .dr-mobile-worker { background:linear-gradient(135deg,#ecfeff,#f0fdfa); border:1px solid #99f6e4; }
        .dr-mobile-workflow-title { color:#1e3a8a; font-size:10px; font-weight:900; letter-spacing:.3px; }
        .dr-mobile-worker-work { color:#475569; font-size:11px; margin-top:3px; }
        .dr-mobile-workflow-grid { display:grid; gap:7px; margin-top:8px; }
        .dr-mobile-complete { display:grid; gap:7px; margin-top:8px; }
        .dr-mobile-actions { display:flex; justify-content:flex-end; margin-top:10px; padding-top:9px; border-top:1px solid #eef2f7; }
        @media (max-width: 720px) {
          .dr-desktop-table { display:none; }
          .dr-mobile-list { display:grid; gap:10px; }
          .dr-scroll-hint { display:none; }
        }
        .daily-rejection-report-input {
          min-height: 38px !important;
          height: 38px;
          padding: 7px 10px !important;
          border-radius: 9px !important;
          font-size: 13px;
          background: #ffffff;
        }
        @media (max-width: 720px) {
          .daily-rejection-report-input { width: 100%; }
        }
      `}</style>
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
            <Field label="From Date"><input className="daily-rejection-report-input" type="date" value={reportFrom} onChange={(e) => setReportFrom(e.target.value)} style={styles.input} /></Field>
            <Field label="To Date"><input className="daily-rejection-report-input" type="date" value={reportTo} onChange={(e) => setReportTo(e.target.value)} style={styles.input} /></Field>
            <Field label="Work"><select className="daily-rejection-report-input" value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} style={styles.input}><option value="ALL">All Work</option>{WORK_DESCRIPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}</select></Field>
          </div>
          <div style={styles.reportTableWrap}>{reportRows.length ? renderTable(reportRows, false, true) : <div style={styles.empty}>Select dates and click Generate Report.</div>}</div>
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
              <Field label="Lorry No."><input value={form.lorry_no} onChange={(e) => updateForm("lorry_no", e.target.value)} placeholder="Enter Lorry No." style={styles.input} /></Field>
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

      {toast ? (
        <div role="status" aria-live="polite" style={{ ...styles.toast, ...styles.toastKinds[toast.type || "success"] }}>
          <span style={styles.toastDot} />
          <div style={styles.toastMessage}>{toast.message}</div>
          <button type="button" onClick={() => setToast(null)} style={styles.toastClose} aria-label="Close notification">×</button>
        </div>
      ) : null}

      {error ? <div style={styles.error}>{error}</div> : null}

      <div style={styles.list}>
        {loading ? <div style={styles.empty}>Loading Daily Rejection...</div> : renderTable(rows)}
      </div>
    </div>
    </>
  );
}

function Field({ label, children }) { return <label style={styles.field}><span style={styles.label}>{label}</span>{children}</label>; }
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
  tableOuter: { width: '100%', maxWidth: '100%', overflowX: 'auto', overflowY: 'hidden', WebkitOverflowScrolling: 'touch', overscrollBehaviorX: 'contain', scrollbarWidth: 'auto', background: '#fff', border: '1px solid #dbe4ee', borderRadius: 16, boxShadow: '0 10px 28px rgba(15,23,42,.05)' },
  dataTable: { width: 'max-content', minWidth: 1500, borderCollapse: 'separate', borderSpacing: 0, fontSize: 12 },
  th: { position: 'sticky', top: 0, zIndex: 3, background: '#0f766e', color: '#fff', padding: '11px 10px', textAlign: 'left', fontWeight: 900, whiteSpace: 'nowrap', borderRight: '1px solid rgba(255,255,255,.14)' },
  td: { padding: '10px', color: '#0f172a', background: '#fff', whiteSpace: 'nowrap', borderTop: '1px solid #eef2f7', verticalAlign: 'middle' },
  tdNum: { padding: '10px', color: '#0f172a', background: '#fff', whiteSpace: 'nowrap', borderTop: '1px solid #eef2f7', textAlign: 'right', fontVariantNumeric: 'tabular-nums', verticalAlign: 'middle' },
  statusChip: { display: 'inline-flex', alignItems: 'center', borderRadius: 999, padding: '5px 8px', fontSize: 10, fontWeight: 900, whiteSpace: 'nowrap' },
  emptyCell: { padding: 28, textAlign: 'center', color: '#64748b', background: '#fff' },
  workflowTh: { background: '#155e75', color: '#fff', minWidth: 170 },
  workflowTd: { background: '#fbfdff', borderLeft: '1px solid #e2e8f0' },
  workflowSelect: { minWidth: 165, height: 34, border: '1px solid #cbd5e1', borderRadius: 8, padding: '6px 8px', background: '#fff', color: '#0f172a', fontWeight: 700, whiteSpace: 'nowrap' },
  workflowInput: { width: 155, height: 34, border: '1px solid #cbd5e1', borderRadius: 8, padding: '6px 8px', background: '#fff', color: '#0f172a', boxSizing: 'border-box' },
  assignButtonInline: { border: 0, background: '#1d4ed8', color: '#fff', borderRadius: 8, padding: '8px 11px', fontWeight: 900, whiteSpace: 'nowrap' },
  workerInline: { display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' },
  completeInline: { border: 0, background: '#047857', color: '#fff', borderRadius: 8, padding: '8px 10px', fontWeight: 900, whiteSpace: 'nowrap', cursor: 'pointer' },
  mutedDash: { color: '#94a3b8', fontWeight: 800 },
  actionTd: { boxShadow: '-6px 0 10px rgba(15,23,42,.06)' },
  actionIcons: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, whiteSpace: 'nowrap' },
  iconButton: { width: 32, height: 32, borderRadius: 9, border: '1px solid', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: '#fff' },
  iconEdit: { color: '#2563eb', borderColor: '#bfdbfe', background: '#eff6ff' },
  iconCopy: { color: '#7c3aed', borderColor: '#ddd6fe', background: '#f5f3ff' },
  copyButton: { color: '#7c3aed', borderColor: '#ddd6fe', background: '#f5f3ff', minWidth: 66, padding: '7px 10px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5, fontWeight: 800 },
  iconWhatsapp: { color: '#15803d', borderColor: '#bbf7d0', background: '#f0fdf4' },
  iconPdf: { color: '#dc2626', borderColor: '#fecaca', background: '#fef2f2' },
  iconSpacer: { width: 32, height: 32, display: 'inline-block' },
  subRowCell: { padding: 0, background: '#fbfdff', borderTop: '1px dashed #dbe4ee' },
  assignPanelCompact: { margin: 0, padding: '9px 10px', borderTop: '1px solid #bfdbfe', borderBottom: '1px solid #bfdbfe', background: 'linear-gradient(90deg,#eff6ff,#f8fbff)' },
  workerPanelCompact: { margin: 0, padding: '9px 10px', borderTop: '1px solid #99f6e4', borderBottom: '1px solid #99f6e4', background: 'linear-gradient(90deg,#ecfeff,#f0fdfa)' },
  formCard: { background: '#fff', border: '1px solid #dbe4ee', borderRadius: 20, padding: 17, marginTop: 12, boxShadow: '0 12px 30px rgba(15,23,42,.07)' }, formHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 8 }, formTitle: { margin: '2px 0 0', color: '#0f172a', fontSize: 23 }, close: { border: 0, background: '#f1f5f9', color: '#334155', width: 35, height: 35, borderRadius: 10, fontSize: 22, cursor: 'pointer' }, infoStrip: { background: '#f0fdfa', border: '1px solid #99f6e4', color: '#115e59', borderRadius: 11, padding: 10, fontSize: 12, marginBottom: 8 },
  section: { marginTop: 10, paddingTop: 12, borderTop: '1px solid #eef2f7' }, sectionTitle: { color: '#0f172a', fontSize: 15, fontWeight: 900, marginBottom: 10 }, grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 11 }, quantityGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 11 }, field: { display: 'grid', gap: 6 }, label: { fontSize: 12, color: '#475569', fontWeight: 800 }, input: { width: '100%', minHeight: 42, boxSizing: 'border-box', border: '1px solid #cbd5e1', borderRadius: 10, padding: '9px 10px', background: '#fff', color: '#0f172a' },
  rejectBox: { borderRadius: 13, padding: 13, background: 'linear-gradient(135deg,#ecfeff,#f0fdfa)', border: '1px solid #99f6e4', boxShadow: 'inset 0 1px 0 rgba(255,255,255,.7)' }, rejectLabel: { color: '#0f766e', fontSize: 11, fontWeight: 900, textTransform: 'uppercase' }, rejectValue: { fontSize: 28, fontWeight: 900, color: '#115e59', marginTop: 4 }, rejectHint: { color: '#5f6f7f', fontSize: 11, marginTop: 2 }, actionRow: { display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' },
  error: { marginTop: 12, padding: 12, background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', borderRadius: 12, fontWeight: 700 }, list: { display: 'grid', gap: 12, marginTop: 12 }, empty: { background: '#fff', border: '1px dashed #cbd5e1', borderRadius: 16, padding: 30, textAlign: 'center', color: '#64748b' }, emptyLarge: { maxWidth: 560, margin: '12vh auto', background: '#fff', border: '1px solid #dbe4ee', borderRadius: 20, padding: 36, textAlign: 'center', boxShadow: '0 14px 40px rgba(15,23,42,.08)' }, emptyIcon: { width: 48, height: 48, margin: '0 auto 12px', borderRadius: '50%', background: '#fff7ed', color: '#c2410c', display: 'grid', placeItems: 'center', fontWeight: 900, fontSize: 24 }, emptyTitle: { margin: 0, color: '#0f172a' }, emptyText: { marginTop: 8, color: '#64748b' },
  card: { position: 'relative', overflow: 'hidden', background: '#fff', border: '1px solid #dbe4ee', borderRadius: 18, padding: 15, boxShadow: '0 8px 24px rgba(15,23,42,.05)' }, cardAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: '#0f766e' }, cardTop: { display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }, rejNo: { fontWeight: 950, color: '#0f172a', fontSize: 18 }, meta: { color: '#64748b', fontSize: 12, marginTop: 3 }, badge: { borderRadius: 999, padding: '6px 10px', fontSize: 10, fontWeight: 950 }, details: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(145px,1fr))', gap: 8, marginTop: 12 }, detail: { background: '#f8fafc', borderRadius: 11, padding: 9, minWidth: 0 }, detailLabel: { color: '#64748b', fontSize: 10, fontWeight: 800, textTransform: 'uppercase' }, detailValue: { color: '#0f172a', fontWeight: 700, marginTop: 3, wordBreak: 'break-word' },
  reportPanel: {
    marginTop: 12,
    background: 'linear-gradient(180deg,#ffffff 0%,#f8fbfb 100%)',
    border: '1px solid #d7e5e3',
    borderRadius: 18,
    padding: 12,
    boxShadow: '0 10px 28px rgba(15,118,110,.07)',
    overflow: 'hidden',
  },
  reportHead: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
    padding: '2px 2px 10px',
  },
  reportTitle: {
    fontSize: 17,
    fontWeight: 900,
    color: '#0f172a',
    marginTop: 2,
  },
  reportFilters: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3,minmax(160px,1fr))',
    gap: 9,
    padding: 10,
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: 13,
  },
  reportFiltersCompactField: {
    minWidth: 0,
  },
  reportTableWrap: { marginTop: 10, overflow: 'visible', borderRadius: 12 },
  reportWorkflowValue: { display: 'inline-flex', alignItems: 'center', minHeight: 30, padding: '5px 8px', borderRadius: 8, background: '#f8fafc', border: '1px solid #e2e8f0', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap' },
  reportWorkflowChip: { display: 'inline-flex', alignItems: 'center', borderRadius: 999, padding: '5px 8px', fontSize: 10, fontWeight: 900, whiteSpace: 'nowrap', border: '1px solid transparent' },
  toast: { position: 'fixed', top: 18, right: 18, zIndex: 99999, minWidth: 300, maxWidth: 'min(420px, calc(100vw - 36px))', display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 12, border: '1px solid', boxShadow: '0 14px 35px rgba(15,23,42,.18)', backdropFilter: 'blur(8px)' },
  toastKinds: { success: { background: '#ecfdf5', color: '#065f46', borderColor: '#a7f3d0' }, error: { background: '#fef2f2', color: '#991b1b', borderColor: '#fecaca' }, warning: { background: '#fffbeb', color: '#92400e', borderColor: '#fde68a' }, info: { background: '#eff6ff', color: '#1e40af', borderColor: '#bfdbfe' } },
  toastDot: { width: 8, height: 8, borderRadius: 999, background: 'currentColor', flex: '0 0 auto' },
  toastMessage: { fontSize: 13, fontWeight: 800, lineHeight: 1.35, flex: '1 1 auto' },
  toastClose: { width: 24, height: 24, border: 0, background: 'transparent', color: 'inherit', fontSize: 18, lineHeight: 1, cursor: 'pointer', padding: 0, opacity: .8 },
  assignPanel: { marginTop: 13, border: '1px solid #bfdbfe', background: 'linear-gradient(135deg,#eff6ff,#f8fbff)', borderRadius: 14, padding: 12 }, assignHead: { display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center', marginBottom: 8, color: '#1e3a8a', fontSize: 11, fontWeight: 900 }, assignGrid: { display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr) auto', gap: 8 }, assignButton: { border: 0, background: '#1d4ed8', color: '#fff', borderRadius: 10, padding: '10px 13px', fontWeight: 900, cursor: 'pointer' },
  workerPanel: { marginTop: 13, border: '1px solid #99f6e4', background: 'linear-gradient(135deg,#ecfeff,#f0fdfa)', borderRadius: 14, padding: 12 }, workerTitle: { color: '#115e59', fontWeight: 950 }, workerWork: { color: '#475569', fontSize: 12, marginTop: 3 }, completeRow: { display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto', gap: 8, marginTop: 10 }, complete: { border: 0, background: '#047857', color: '#fff', borderRadius: 10, padding: '10px 14px', fontWeight: 900, cursor: 'pointer' }, completedPanel: { marginTop: 12, padding: 10, borderRadius: 11, background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#047857', fontWeight: 800 },
};
