import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { FaCheck, FaPlay, FaPlus, FaSyncAlt } from "react-icons/fa";
import { hasPermission, loadSession } from "../utils/auth";
import { useNavigate } from "react-router-dom";
import PageBackCloseActions from "../components/PageBackCloseActions";

const API = "/api/daily-rejections";
const STATUSES = ["ALL", "PENDING", "ASSIGNED", "RUNNING", "COMPLETE"];

const emptyForm = () => ({
  entry_date: new Date().toISOString().slice(0, 10), employee_id: "", location_id: "", warehouse_id: "", company_id: "", company_account_id: "", product_id: "", inward_voucher: "", inward_id: "", outward_voucher: "", outward_id: "", lorry_no: "", original_qty: "", rejection_qty: "", reason: "", remarks: ""
});

const textValue = (value) => String(value ?? "");
const idOf = (row) => String(row?.id || row?._id || "");
const money = (value) => Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const dateLabel = (value) => { if (!value) return "-"; const d = new Date(value); return Number.isNaN(d.getTime()) ? "-" : d.toLocaleDateString("en-GB"); };

export default function DailyRejectionPage() {
  const navigate = useNavigate();
  const session = loadSession() || {};
  const user = session.user || session || {};
  const isManager = hasPermission(user, "dailyRejection.assign") || hasPermission(user, "dailyRejection.report") || String(user?.role || "").toLowerCase() === "admin";
  const canCreate = hasPermission(user, "dailyRejection.create");
  const canAssign = hasPermission(user, "dailyRejection.assign") || String(user?.role || "").toLowerCase() === "admin";
  const canStart = hasPermission(user, "dailyRejection.start") || String(user?.role || "").toLowerCase() === "admin";
  const canComplete = hasPermission(user, "dailyRejection.complete") || String(user?.role || "").toLowerCase() === "admin";

  const [masters, setMasters] = useState({ locations: [], warehouses: [], companies: [], accounts: [], products: [], employees: [], consignees: [] });
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState({ total: 0, pending: 0, assigned: 0, running: 0, complete: 0 });
  const [status, setStatus] = useState("ALL");
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...emptyForm(), actual_unloading_qty: "", consignee_id: "" });
  const [assignedEmployee, setAssignedEmployee] = useState({});
  const [workDescription, setWorkDescription] = useState({});
  const [assigningId, setAssigningId] = useState(null);
  const [completingId, setCompletingId] = useState(null);
  const [completionRemarks, setCompletionRemarks] = useState({});
  const [reportFrom, setReportFrom] = useState("");
  const [reportTo, setReportTo] = useState("");
  const [showReport, setShowReport] = useState(false);
  const [reportWork, setReportWork] = useState("ALL");
  const [editId, setEditId] = useState(null);
  const [error, setError] = useState("");

  const normalizedMasters = useMemo(() => ({
    locations: Array.isArray(masters.locations) ? masters.locations : [],
    warehouses: Array.isArray(masters.warehouses) ? masters.warehouses : [],
    companies: Array.isArray(masters.companies) ? masters.companies : [],
    accounts: Array.isArray(masters.accounts) ? masters.accounts : [],
    products: Array.isArray(masters.products) ? masters.products : [],
    employees: Array.isArray(masters.employees) ? masters.employees : [],
    consignees: Array.isArray(masters.consignees) ? masters.consignees : []
  }), [masters]);

  const filteredAccounts = useMemo(() => normalizedMasters.accounts.filter((a) => !form.company_id || String(a.company_id ?? a.companyId ?? a.company ?? a.company_name ?? "") === String(form.company_id) || String(a.company_name ?? "").trim().toLowerCase() === String(normalizedMasters.companies.find(c => idOf(c) === String(form.company_id))?.name ?? "").trim().toLowerCase()), [normalizedMasters.accounts, normalizedMasters.companies, form.company_id]);

  const selectedAccount = useMemo(() => normalizedMasters.accounts.find(a => idOf(a) === String(form.company_account_id)), [normalizedMasters.accounts, form.company_account_id]);

  async function loadMasters() {
    try {
      const response = await axios.get(`${API}/masters`);
      const data = response?.data?.data || response?.data || {};
      setMasters({
        locations: data.locations || [], warehouses: data.warehouses || [], companies: data.companies || [], accounts: data.accounts || data.company_accounts || [], products: data.products || [], employees: data.employees || data.staff || [], consignees: data.consignees || data.parties || data.consignee || []
      });
    } catch (err) {
      setError(err?.response?.data?.error || err.message || "Failed to load masters");
    }
  }

  async function loadData() {
    setLoading(true); setError("");
    try {
      const params = { status };
      if (reportFrom) params.from = reportFrom;
      if (reportTo) params.to = reportTo;
      if (reportWork && reportWork !== "ALL") params.action_type = reportWork;
      const [l, s] = await Promise.all([axios.get(API, { params }), axios.get(`${API}/summary`, { params })]);
      const ld = l?.data?.data || l?.data || [];
      setRows(Array.isArray(ld) ? ld : (Array.isArray(ld?.rows) ? ld.rows : []));
      setSummary(s?.data?.data || s?.data || {});
    } catch (err) { setError(err?.response?.data?.error || err.message || "Failed to load Daily Rejection"); }
    finally { setLoading(false); }
  }

  useEffect(() => { loadMasters(); }, []);
  useEffect(() => { loadData(); }, [status, reportFrom, reportTo, reportWork]);
  useEffect(() => {
    if (!form.location_id && user?.location_id) setForm(p => ({ ...p, location_id: String(user.location_id) }));
    if (!form.employee_id && !isManager && (user?.id || user?._id)) setForm(p => ({ ...p, employee_id: String(user.id || user._id) }));
  }, [user, isManager, form.location_id, form.employee_id]);

  const updateForm = (key, value) => setForm(p => ({ ...p, [key]: value }));
  const resetForm = () => { const f = emptyForm(); f.location_id = user?.location_id ? String(user.location_id) : ""; f.employee_id = !isManager ? String(user?.id || user?._id || "") : ""; setForm(f); setEditId(null); };

  async function submitEntry(e) {
    e.preventDefault();
    if (!form.location_id || !form.product_id || !form.company_id || !form.company_account_id || !form.consignee_id || Number(form.original_qty) <= 0 || Number(form.unloading_qty) < 0) return alert("Please fill Location, Company, Account, Consignee, Original Qty and Unloading Qty.");
    const rejection = Math.max(Number(form.original_qty || 0) - Number(form.actual_unloading_qty || 0), 0);
    const payload = { ...form, actual_unloading_qty: Number(form.actual_unloading_qty || 0), rejection_qty: rejection };
    try {
      if (editId) await axios.put(`${API}/${editId}`, payload); else await axios.post(API, payload);
      resetForm(); setShowForm(false); await loadData();
    } catch (err) { alert(err?.response?.data?.error || err.message || "Failed to save Daily Rejection"); }
  }

  async function assignRow(rowId) {
    const staff = assignedEmployee[rowId] || ""; const work = workDescription[rowId] || "";
    if (!staff || !work || assigningId === rowId) return;
    try { setAssigningId(rowId); await axios.patch(`${API}/${rowId}/assign`, { assigned_to: staff, action_type: work }); await loadData(); }
    catch (err) { alert(err?.response?.data?.error || err.message || "Failed to assign"); }
    finally { setAssigningId(null); }
  }

  async function startRow(rowId) { try { await axios.post(`${API}/${rowId}/start`); await loadData(); } catch (err) { alert(err?.response?.data?.error || err.message || "Failed to start"); } }
  async function completeRow(rowId, qty) { try { setCompletingId(rowId); await axios.post(`${API}/${rowId}/complete`, { completion_qty: qty, completion_remarks: completionRemarks[rowId] || "" }); await loadData(); } catch (err) { alert(err?.response?.data?.error || err.message || "Failed to complete"); } finally { setCompletingId(null); } }
  async function editRow(row) {
    setForm({ entry_date: String(row.entry_date || "").slice(0,10), employee_id: idOf(row.employee_id || row.employee) || "", location_id: idOf(row.location_id || row.location) || "", company_id: idOf(row.company_id || row.company) || "", company_account_id: idOf(row.company_account_id || row.company_account) || "", consignee_id: idOf(row.consignee_id || row.consignee) || String(row.consignee_id || ""), product_id: idOf(row.product_id || row.product) || "", original_qty: row.original_qty ?? "", unloading_qty: row.unloading_qty ?? "", rejection_qty: row.rejection_qty ?? "", reason: row.reason || "", remarks: row.remarks || "" }); setEditId(idOf(row)); setShowForm(true); }

  const workOptions = ["PALTI", "WAREHOUSE UNLOAD", "LOCAL SALE", "PARTY ACCOUNT", "OTHERS"];
  const canEdit = hasPermission(user, "dailyRejection.edit") || String(user?.role || "").toLowerCase() === "admin";
  const reasonOptions = ["HIGH FUNGUS", "HIGH MOISTURE", "DISCOLOUR", "DAMAGE", "LIVE INSECT", "WATER DAMAGE", "OTHERS"];

  return <div style={pageStyle}>
    <div style={headerStyle}><div><div style={eyebrow}>Warehouse Operations</div><h2 style={{margin:"4px 0"}}>Daily Rejection</h2><div style={{color:"#64748b",fontSize:13}}>Smart rejection workflow with assignment, running work and completion.</div></div><PageBackCloseActions navigate={navigate} size="compact"/></div>
    <div style={summaryGrid}>{[["ALL","Total"],["PENDING","Pending"],["ASSIGNED","Assigned"],["RUNNING","Running"],["COMPLETE","Complete"]].map(([k,l])=><button key={k} onClick={()=>setStatus(k)} style={{...summaryCard,...(status===k?summaryActive:{})}}><div>{l}</div><strong>{summary[k.toLowerCase()] ?? 0}</strong></button>)}</div>
    <div style={toolbarStyle}><div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{STATUSES.map(k=><button key={k} onClick={()=>setStatus(k)} style={status===k?activeTab:tabButton}>{k}</button>)}<button onClick={()=>setShowReport(v=>!v)} style={status==="REPORT"?activeTab:tabButton}>REPORT</button></div><div style={{display:"flex",gap:8}}>{canCreate&&<button onClick={()=>{resetForm();setShowForm(true)}} style={primaryButton}><FaPlus/> New Rejection</button>}<button onClick={loadData} style={secondaryButton}><FaSyncAlt/> Refresh</button></div></div>
    {showReport && <div style={reportCard}><div style={sectionTitle}>Daily Rejection Report</div><div style={reportGrid}><Field label="From"><input type="date" value={reportFrom} onChange={e=>setReportFrom(e.target.value)} style={inputStyle}/></Field><Field label="To"><input type="date" value={reportTo} onChange={e=>setReportTo(e.target.value)} style={inputStyle}/></Field><Field label="Work"><select value={reportWork} onChange={e=>setReportWork(e.target.value)} style={inputStyle}><option value="ALL">ALL</option>{workOptions.map(w=><option key={w}>{w}</option>)}</select></Field></div></div>}
    {showForm&&canCreate&&<div style={formShell}><div style={sectionTitle}>{editId?"Edit Daily Rejection":"New Daily Rejection"}</div><form onSubmit={submitEntry}><div style={formGrid}><Field label="Date"><input type="date" value={form.entry_date} onChange={e=>updateForm("entry_date",e.target.value)} style={inputStyle}/></Field><Field label="Location"><select value={form.location_id} onChange={e=>updateForm("location_id",e.target.value)} style={inputStyle}><option value="">Select Location</option>{normalizedMasters.locations.map(x=><option key={idOf(x)} value={idOf(x)}>{x.name}</option>)}</select></Field><Field label="Company"><select value={form.company_id} onChange={e=>{updateForm("company_id",e.target.value);updateForm("company_account_id","")}} style={inputStyle}><option value="">Select Company</option>{normalizedMasters.companies.map(x=><option key={idOf(x)} value={idOf(x)}>{x.name}</option>)}</select></Field><Field label="Company Account"><select value={form.company_account_id} onChange={e=>updateForm("company_account_id",e.target.value)} style={inputStyle}><option value="">Select Account</option>{filteredAccounts.map(x=><option key={idOf(x)} value={idOf(x)}>{x.account_name||x.name}</option>)}</select></Field><Field label="Consignee"><select value={form.consignee_id||""} onChange={e=>updateForm("consignee_id",e.target.value)} style={inputStyle}><option value="">Select Consignee</option>{normalizedMasters.consignees.map(x=><option key={idOf(x)} value={idOf(x)}>{x.name||x.party_name}</option>)}</select></Field><Field label="Product"><select value={form.product_id} onChange={e=>updateForm("product_id",e.target.value)} style={inputStyle}><option value="">Select Product</option>{normalizedMasters.products.map(x=><option key={idOf(x)} value={idOf(x)}>{x.name}</option>)}</select></Field><Field label="Original Qty"><input type="number" step="0.01" min="0" value={form.original_qty} onChange={e=>updateForm("original_qty",e.target.value)} style={inputStyle}/></Field><Field label="Actual Unloading Qty"><input type="number" step="0.01" min="0" value={form.unloading_qty||""} onChange={e=>updateForm("unloading_qty",e.target.value)} style={inputStyle}/></Field><div style={rejectBox}><span>Auto Rejection Qty</span><strong>{Math.max(Number(form.original_qty||0)-Number(form.unloading_qty||0),0).toFixed(2)}</strong></div><Field label="Reason"><select value={form.reason} onChange={e=>updateForm("reason",e.target.value)} style={inputStyle}><option value="">Select Reason</option>{reasonOptions.map(r=><option key={r}>{r}</option>)}</select></Field><Field label="Remarks"><input value={form.remarks||""} onChange={e=>updateForm("remarks",e.target.value)} style={inputStyle}/></Field></div><div style={actionRow}><button type="submit" style={primaryButton}>{editId?"Update Entry":"Save Pending"}</button><button type="button" onClick={()=>{resetForm();setShowForm(false)}} style={secondaryButton}>Cancel</button></div></form></div>}
    {error&&<div style={errorStyle}>{error}</div>}
    <div style={listWrap}>{loading?<div style={emptyStyle}>Loading...</div>:rows.length===0?<div style={emptyStyle}>No records found.</div>:rows.map(row=><div key={idOf(row)} style={rowCard}><div style={rowTop}><div><div style={rejectionNo}>{row.rejection_no||idOf(row)}</div><div style={muted}>{dateLabel(row.entry_date)} · {row.employee_name||"-"}</div></div><span style={statusBadge}>{row.status}</span></div><div style={detailGrid}>{[["Location",row.location_name],["Company",row.company_name],["Account",row.company_account_name],["Consignee",row.consignee_name],["Product",row.product_name],["Original",money(row.original_qty)],["Unloading",money(row.unloading_qty)],["Rejection",money(row.rejection_qty)],["Reason",row.reason],["Work",row.action_type || row.work_description],["Assigned",row.assigned_to_name]].map(([l,v])=><Detail key={l} label={l} value={v||"-"}/>)}</div>{canAssign&&row.status!=="COMPLETE"&&<div style={assignBox}><select value={assignedEmployee[idOf(row)]||row.assigned_to||""} onChange={e=>setAssignedEmployee(p=>({...p,[idOf(row)]:e.target.value}))} style={inputStyle}><option value="">Select Staff</option>{normalizedMasters.employees.map(x=><option key={idOf(x)} value={idOf(x)}>{x.name}</option>)}</select><select value={workDescription[idOf(row)]||row.work_description||""} onChange={e=>setWorkDescription(p=>({...p,[idOf(row)]:e.target.value}))} style={inputStyle}><option value="">Work Description</option>{workOptions.map(w=><option key={w}>{w}</option>)}</select><button onClick={()=>assignRow(idOf(row))} disabled={!((assignedEmployee[idOf(row)]||row.assigned_to) && (workDescription[idOf(row)]||row.action_type||row.work_description)) || assigningId===idOf(row)} style={{...assignButton,opacity:(((assignedEmployee[idOf(row)]||row.assigned_to) && (workDescription[idOf(row)]||row.action_type||row.work_description)) ? 1 : .55),cursor:(((assignedEmployee[idOf(row)]||row.assigned_to) && (workDescription[idOf(row)]||row.action_type||row.work_description)) ? "pointer" : "not-allowed")}}>{assigningId===idOf(row)?"Assigning...":"Assign / Reassign"}</button></div>}{canComplete&&row.status==="RUNNING"&&(isManager||String(row.assigned_to||"")===String(user?.id||user?._id||""))&&<div style={completeBox}><input value={completionRemarks[idOf(row)]||""} onChange={e=>setCompletionRemarks(p=>({...p,[idOf(row)]:e.target.value}))} placeholder="Completion remarks" style={inputStyle}/><button onClick={()=>completeRow(idOf(row),row.rejection_qty)} style={completeButton}>{completingId===idOf(row)?"Completing...":"Complete Work"}</button></div>}{canEdit&&! ["COMPLETE"].includes(row.status)&&<button onClick={()=>editRow(row)} style={iconEdit} title="Edit entry" aria-label="Edit entry">✏</button>}</div>)}</div>
  </div>;
}

const Summary=({label,value})=><div/>;
const Field=({label,children})=><label style={fieldStyle}><span style={labelStyle}>{label}</span>{children}</label>;
const Detail=({label,value})=><div style={detailCell}><div style={detailLabel}>{label}</div><div style={detailValue}>{value}</div></div>;
const pageStyle={minHeight:"100vh",background:"#f5f7fb",padding:14,fontFamily:"Segoe UI,Arial,sans-serif"}; const headerStyle={background:"#fff",border:"1px solid #e5e7eb",borderRadius:18,padding:18,display:"flex",justifyContent:"space-between",alignItems:"center"}; const eyebrow={color:"#0f766e",fontWeight:900,fontSize:12}; const summaryGrid={display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:10,margin:"12px 0"}; const summaryCard={background:"#fff",border:"1px solid #dbe4ee",borderRadius:14,padding:14,textAlign:"left",cursor:"pointer"}; const summaryActive={border:"2px solid #0f766e",background:"#ecfdf5"}; const toolbarStyle={background:"#fff",border:"1px solid #e2e8f0",borderRadius:16,padding:12,display:"flex",justifyContent:"space-between",gap:12,flexWrap:"wrap"}; const tabButton={border:"1px solid #cbd5e1",background:"#fff",borderRadius:999,padding:"8px 12px",fontWeight:800}; const activeTab={...tabButton,background:"#0f766e",color:"#fff"}; const formShell={background:"#fff",border:"1px solid #dbe4ee",borderRadius:18,padding:16,marginTop:12}; const reportCard={...formShell}; const reportGrid={display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12}; const fieldStyle={display:"grid",gap:6}; const labelStyle={fontSize:12,color:"#475569",fontWeight:800}; const inputStyle={width:"100%",minHeight:42,border:"1px solid #cbd5e1",borderRadius:10,padding:"9px 10px",boxSizing:"border-box"}; const formGrid={display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12}; const rejectBox={background:"#0f766e",color:"#fff",borderRadius:12,padding:12,display:"flex",flexDirection:"column",justifyContent:"center"}; const actionRow={display:"flex",gap:8,marginTop:14}; const primaryButton={border:0,background:"#0f766e",color:"#fff",borderRadius:10,padding:"10px 14px",fontWeight:900}; const secondaryButton={border:"1px solid #cbd5e1",background:"#fff",borderRadius:10,padding:"10px 14px",fontWeight:800}; const listWrap={display:"grid",gap:12,marginTop:12}; const rowCard={position:"relative",background:"#fff",border:"1px solid #dbe4ee",borderRadius:18,padding:15,boxShadow:"0 8px 20px rgba(15,23,42,.04)"}; const rowTop={display:"flex",justifyContent:"space-between"}; const rejectionNo={fontSize:18,fontWeight:900}; const muted={color:"#64748b",fontSize:12}; const statusBadge={background:"#dcfce7",color:"#166534",padding:"6px 10px",borderRadius:999,fontSize:11,fontWeight:900}; const detailGrid={display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:8,marginTop:12}; const detailCell={background:"#f8fafc",padding:9,borderRadius:10}; const detailLabel={fontSize:10,color:"#64748b",fontWeight:800,textTransform:"uppercase"}; const detailValue={fontWeight:800,marginTop:2}; const assignBox={display:"grid",gridTemplateColumns:"1fr 1fr auto",gap:8,marginTop:12,padding:10,borderRadius:12,background:"#eff6ff"}; const assignButton={border:0,background:"#1d4ed8",color:"#fff",borderRadius:10,padding:"10px 14px",fontWeight:900}; const completeBox={display:"grid",gridTemplateColumns:"1fr auto",gap:8,marginTop:12,padding:10,borderRadius:12,background:"#ecfdf5"}; const completeButton={border:0,background:"#047857",color:"#fff",borderRadius:10,padding:"10px 14px",fontWeight:900}; const iconEdit={position:"absolute",right:12,bottom:12,width:38,height:38,borderRadius:"50%",border:"1px solid #cbd5e1",background:"#fff",color:"#0f766e",fontSize:19,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 4px 12px rgba(15,118,110,.12)"}; const errorStyle={marginTop:12,padding:12,borderRadius:12,background:"#fef2f2",color:"#b91c1c"}; const emptyStyle={background:"#fff",padding:30,textAlign:"center",borderRadius:16,color:"#64748b"};
