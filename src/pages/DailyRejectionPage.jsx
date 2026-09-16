import React, { useEffect, useState } from "react";
import axios from "axios";

const API = "/api/daily-rejections";
const STATUSES = ["ALL", "PENDING", "ASSIGNED", "RUNNING", "COMPLETE"];

const safeId = (x) => String(x?.id ?? x?._id ?? "");
const safeName = (x) => x?.name ?? x?.location_name ?? x?.warehouse_name ?? x?.company_name ?? "";

function getSessionSafe() {
  try {
    const raw = localStorage.getItem("session");
    if (!raw) return {};
    return JSON.parse(raw) || {};
  } catch (_) {
    return {};
  }
}

export default function DailyRejectionPage() {
  const session = getSessionSafe();
  const user = session.user || {};
  const [status, setStatus] = useState("ALL");
  const [rows, setRows] = useState([]);
  const [masters, setMasters] = useState({ locations: [], warehouses: [], companies: [], accounts: [], products: [], employees: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    entry_date: new Date().toISOString().slice(0, 10), employee_id: "", location_id: "", warehouse_id: "",
    company_id: "", company_account_id: "", product_id: "", inward_voucher: "", lorry_no: "",
    original_qty: "", rejection_qty: "", reason: "", remarks: ""
  });

  const canCreate = true;

  const loadMasters = async () => {
    try {
      const r = await axios.get(`${API}/masters`);
      const d = r?.data || {};
      setMasters({
        locations: Array.isArray(d.locations) ? d.locations : [],
        warehouses: Array.isArray(d.warehouses) ? d.warehouses : [],
        companies: Array.isArray(d.companies) ? d.companies : [],
        accounts: Array.isArray(d.accounts) ? d.accounts : (Array.isArray(d.companyAccounts) ? d.companyAccounts : []),
        products: Array.isArray(d.products) ? d.products : [],
        employees: Array.isArray(d.employees) ? d.employees : (Array.isArray(d.staff) ? d.staff : [])
      });
    } catch (e) {
      // Keep the page visible even when the API is unavailable.
    }
  };

  const loadRows = async () => {
    setLoading(true);
    try {
      const r = await axios.get(API, { params: { status } });
      setRows(Array.isArray(r?.data) ? r.data : []);
      setError("");
    } catch (e) {
      setRows([]);
      setError(e?.response?.data?.error || e?.message || "Daily Rejection API is not available.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadMasters(); }, []);
  useEffect(() => { loadRows(); }, [status]);

  const submit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(API, form);
      setShowForm(false);
      await loadRows();
      alert("Daily Rejection saved as Pending.");
    } catch (err) {
      alert(err?.response?.data?.error || err?.message || "Failed to save Daily Rejection.");
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <div style={styles.kicker}>Warehouse Operations</div>
          <h2 style={styles.title}>Daily Rejection</h2>
          <div style={styles.sub}>Daily rejection entry, pending, assigned, running and complete work.</div>
        </div>
        <button onClick={() => window.history.back()} style={styles.back}>Back</button>
      </div>

      <div style={styles.tabs}>
        {STATUSES.map((s) => (
          <button key={s} onClick={() => setStatus(s)} style={status === s ? styles.tabActive : styles.tab}>{s}</button>
        ))}
        <button onClick={() => setShowForm(v => !v)} style={styles.primary}>{showForm ? "Close Form" : "+ New Rejection"}</button>
        <button onClick={loadRows} style={styles.secondary}>Refresh</button>
      </div>

      {showForm && canCreate && (
        <form onSubmit={submit} style={styles.card}>
          <h3 style={styles.section}>New Daily Rejection</h3>
          <div style={styles.grid}>
            <label>Date<input type="date" value={form.entry_date} onChange={e=>setForm({...form,entry_date:e.target.value})} style={styles.input}/></label>
            <label>Employee<select value={form.employee_id} onChange={e=>setForm({...form,employee_id:e.target.value})} style={styles.input}><option value="">Select Employee</option>{masters.employees.map(x=><option key={safeId(x)} value={safeId(x)}>{safeName(x)}</option>)}</select></label>
            <label>Location<select value={form.location_id} onChange={e=>setForm({...form,location_id:e.target.value})} style={styles.input}><option value="">Select Location</option>{masters.locations.map(x=><option key={safeId(x)} value={safeId(x)}>{safeName(x)}</option>)}</select></label>
            <label>Warehouse<select value={form.warehouse_id} onChange={e=>setForm({...form,warehouse_id:e.target.value})} style={styles.input}><option value="">Select Warehouse</option>{masters.warehouses.map(x=><option key={safeId(x)} value={safeId(x)}>{safeName(x)}</option>)}</select></label>
            <label>Company<select value={form.company_id} onChange={e=>setForm({...form,company_id:e.target.value,company_account_id:""})} style={styles.input}><option value="">Select Company</option>{masters.companies.map(x=><option key={safeId(x)} value={safeId(x)}>{safeName(x)}</option>)}</select></label>
            <label>Account<select value={form.company_account_id} onChange={e=>setForm({...form,company_account_id:e.target.value})} style={styles.input}><option value="">Select Account</option>{masters.accounts.filter(x=>!form.company_id || String(x.company_id||"")===String(form.company_id)).map(x=><option key={safeId(x)} value={safeId(x)}>{x.account_name||x.name}</option>)}</select></label>
            <label>Product<select value={form.product_id} onChange={e=>setForm({...form,product_id:e.target.value})} style={styles.input}><option value="">Select Product</option>{masters.products.map(x=><option key={safeId(x)} value={safeId(x)}>{safeName(x)}</option>)}</select></label>
            <label>Lorry No.<input value={form.lorry_no} onChange={e=>setForm({...form,lorry_no:e.target.value})} style={styles.input}/></label>
            <label>Original Qty<input type="number" step="0.01" value={form.original_qty} onChange={e=>setForm({...form,original_qty:e.target.value})} style={styles.input}/></label>
            <label>Rejection Qty *<input type="number" step="0.01" required value={form.rejection_qty} onChange={e=>setForm({...form,rejection_qty:e.target.value})} style={styles.input}/></label>
            <label>Reason<input value={form.reason} onChange={e=>setForm({...form,reason:e.target.value})} style={styles.input}/></label>
            <label>Remarks<input value={form.remarks} onChange={e=>setForm({...form,remarks:e.target.value})} style={styles.input}/></label>
          </div>
          <button type="submit" style={styles.primary}>Save Pending</button>
        </form>
      )}

      {error && <div style={styles.error}>{error}</div>}
      <div style={styles.list}>
        {loading ? <div style={styles.empty}>Loading Daily Rejection...</div> : rows.length === 0 ? <div style={styles.empty}>No Daily Rejection records found.</div> : rows.map(row => (
          <div key={safeId(row)} style={styles.row}>
            <div style={styles.rowHead}><b>{row.rejection_no || safeId(row)}</b><span style={styles.badge}>{row.status || "PENDING"}</span></div>
            <div style={styles.details}>
              <span><b>Employee:</b> {row.employee_name || "-"}</span><span><b>Location:</b> {row.location_name || "-"}</span><span><b>Warehouse:</b> {row.warehouse_name || "-"}</span><span><b>Company:</b> {row.company_name || "-"}</span><span><b>Product:</b> {row.product_name || "-"}</span><span><b>Lorry:</b> {row.lorry_no || "-"}</span><span><b>Reject Qty:</b> {row.rejection_qty ?? 0}</span><span><b>Action:</b> {row.action_type || "-"}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const styles = {
  page:{minHeight:"100vh",background:"#f8fafc",padding:16,fontFamily:"Segoe UI,Arial,sans-serif",boxSizing:"border-box"},
  header:{background:"#fff",border:"1px solid #e2e8f0",borderRadius:14,padding:16,display:"flex",justifyContent:"space-between",gap:12,alignItems:"center",flexWrap:"wrap"},
  kicker:{color:"#0f766e",fontWeight:800,fontSize:12}, title:{margin:"4px 0",color:"#0f172a"}, sub:{color:"#64748b",fontSize:13},
  tabs:{display:"flex",gap:8,flexWrap:"wrap",background:"#fff",padding:12,border:"1px solid #e2e8f0",borderRadius:14,marginTop:12},
  tab:{padding:"8px 12px",border:"1px solid #cbd5e1",background:"#fff",borderRadius:999,fontWeight:700,cursor:"pointer"},
  tabActive:{padding:"8px 12px",border:"1px solid #0f766e",background:"#0f766e",color:"#fff",borderRadius:999,fontWeight:800,cursor:"pointer"},
  primary:{padding:"10px 14px",border:0,background:"#0f766e",color:"#fff",borderRadius:9,fontWeight:800,cursor:"pointer"}, secondary:{padding:"10px 14px",border:"1px solid #cbd5e1",background:"#fff",borderRadius:9,fontWeight:700,cursor:"pointer"}, back:{padding:"8px 12px",background:"#475569",color:"#fff",border:0,borderRadius:8,cursor:"pointer"},
  card:{background:"#fff",border:"1px solid #e2e8f0",borderRadius:14,padding:16,marginTop:12}, section:{marginTop:0,color:"#0f172a"},
  grid:{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:12}, input:{width:"100%",boxSizing:"border-box",marginTop:5,minHeight:40,border:"1px solid #cbd5e1",borderRadius:8,padding:"8px 10px",background:"#fff"},
  error:{marginTop:12,padding:12,background:"#fef2f2",color:"#b91c1c",border:"1px solid #fecaca",borderRadius:10,fontWeight:700}, list:{display:"grid",gap:12,marginTop:12}, empty:{background:"#fff",padding:30,textAlign:"center",borderRadius:14,border:"1px dashed #cbd5e1",color:"#64748b"}, row:{background:"#fff",padding:14,borderRadius:14,border:"1px solid #dbe4ee"}, rowHead:{display:"flex",justifyContent:"space-between",gap:10}, badge:{background:"#ecfdf5",color:"#047857",borderRadius:999,padding:"4px 8px",fontWeight:800,fontSize:12}, details:{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:8,marginTop:10,color:"#334155",fontSize:13}
};
