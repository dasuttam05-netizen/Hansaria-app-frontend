import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const pad = (v) => String(v).padStart(2, "0");
const currentMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
};
const today = () => new Date().toISOString().slice(0, 10);
const money = (v) => Number(v || 0).toFixed(2);

export default function WarehouseRentBookingPage({ embedded = false } = {}) {
  const navigate = useNavigate();
  const [active, setActive] = useState("booking");
  const [warehouses, setWarehouses] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [bills, setBills] = useState([]);
  const [workflow, setWorkflow] = useState({ summary: [], details: [] });
  const [rentMonth, setRentMonth] = useState(currentMonth);
  const [bookingDate, setBookingDate] = useState(today);
  const [warehouseId, setWarehouseId] = useState("");
  const [remarks, setRemarks] = useState("");
  const [selectedReceivable, setSelectedReceivable] = useState([]);
  const [loading, setLoading] = useState(false);
  const [collectBill, setCollectBill] = useState(null);
  const [collectionForm, setCollectionForm] = useState({ amount: "", collection_date: today(), collection_mode: "Bank", reference_no: "", remarks: "" });

  const loadWarehouses = async () => {
    const res = await axios.get("/api/warehouses");
    setWarehouses(Array.isArray(res.data) ? res.data : []);
  };

  const loadBookings = async () => {
    const res = await axios.get("/api/warehouse-rent-bookings", { params: { rent_month: rentMonth } });
    setBookings(Array.isArray(res.data) ? res.data : []);
  };

  const loadBills = async () => {
    const res = await axios.get("/api/warehouse-rent-bills", { params: { rent_month: rentMonth } });
    setBills(Array.isArray(res.data) ? res.data : []);
  };

  const loadWorkflow = async () => {
    const res = await axios.get("/api/warehouse-rent-bills/workflow", { params: { rent_month: rentMonth } });
    setWorkflow({ summary: res.data?.summary || [], details: res.data?.details || [] });
  };

  const load = async () => {
    setLoading(true);
    try {
      await loadWarehouses();
      await Promise.all([loadBookings(), loadBills(), loadWorkflow()]);
    } catch (e) {
      console.error(e);
      alert(e?.response?.data?.error || "Failed to load warehouse rent data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [rentMonth]);

  const selected = useMemo(() => warehouses.find((w) => String(w.id || w._id) === String(warehouseId)) || null, [warehouses, warehouseId]);
  const payableWarehouses = useMemo(() => warehouses.filter((w) => String(w.rent_flow || "payable") !== "receivable" && Number(w.monthly_rent || 0) > 0), [warehouses]);
  const receivableWarehouses = useMemo(() => warehouses.filter((w) => String(w.rent_flow || "payable") === "receivable" && Number(w.monthly_rent || 0) > 0), [warehouses]);
  const bookedIdSet = useMemo(() => new Set(bookings.map((b) => String(b.warehouse_id?._id || b.warehouse_id || b.id))), [bookings]);
  const selectableReceivable = useMemo(() => receivableWarehouses.filter((w) => !bookedIdSet.has(String(w.id || w._id))), [receivableWarehouses, bookedIdSet]);
  const allSelected = selectableReceivable.length > 0 && selectableReceivable.every((w) => selectedReceivable.includes(String(w.id || w._id)));

  const handleSave = async () => {
    if (!warehouseId || !rentMonth || !bookingDate) return alert("Select warehouse, month and booking date");
    try {
      setLoading(true);
      await axios.post("/api/warehouse-rent-bookings", { warehouse_id: warehouseId, rent_month: rentMonth, booking_date: bookingDate, rent_flow: "payable", remarks });
      alert("Warehouse rent booked successfully");
      setRemarks("");
      await load();
    } catch (e) {
      alert(e?.response?.data?.error || "Failed to book rent");
    } finally { setLoading(false); }
  };

  const toggleReceivable = (id) => {
    setSelectedReceivable((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const toggleAll = () => {
    if (allSelected) setSelectedReceivable([]);
    else setSelectedReceivable(selectableReceivable.map((w) => String(w.id || w._id)));
  };

  const bulkBook = async () => {
    if (!rentMonth) return alert("Select rent month");
    if (!selectedReceivable.length) return alert("Select at least one company warehouse, or use Select All");
    try {
      setLoading(true);
      const result = await axios.post("/api/warehouse-rent-bookings/bulk", { rent_month: rentMonth, booking_date: bookingDate, warehouse_ids: selectedReceivable });
      await axios.post("/api/warehouse-rent-bills/generate", { rent_month: rentMonth });
      alert(`Bulk booking complete. Created: ${result.data?.created_count || 0}, Skipped: ${result.data?.skipped_count || 0}, Errors: ${result.data?.error_count || 0}`);
      setSelectedReceivable([]);
      await load();
    } catch (e) {
      alert(e?.response?.data?.error || "Failed to bulk book company rent");
    } finally { setLoading(false); }
  };

  const generateBills = async () => {
    try {
      setLoading(true);
      const result = await axios.post("/api/warehouse-rent-bills/generate", { rent_month: rentMonth });
      alert(`Company rent bill generation complete. Bills: ${result.data?.generated_count || 0}`);
      await load();
    } catch (e) {
      alert(e?.response?.data?.error || "Failed to generate bills");
    } finally { setLoading(false); }
  };

  const submitCollection = async () => {
    if (!collectBill) return;
    try {
      setLoading(true);
      await axios.post(`/api/warehouse-rent-bills/collect/${collectBill.id}`, collectionForm);
      setCollectBill(null);
      setCollectionForm({ amount: "", collection_date: today(), collection_mode: "Bank", reference_no: "", remarks: "" });
      alert("Company rent collection updated successfully");
      await load();
    } catch (e) {
      alert(e?.response?.data?.error || "Failed to update collection");
    } finally { setLoading(false); }
  };

  return <div style={{ padding: 16, fontFamily: "Segoe UI, Arial, sans-serif", background: "#f8fafc", minHeight: "100%" }}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:8}}>
      <div><h2 style={{margin:0}}>Warehouse Rent Management</h2><div style={{fontSize:13,color:"#64748b",marginTop:4}}>Payable rent + Company rent collection workflow</div></div>
      {!embedded ? <button onClick={()=>navigate("/warehouses")} style={btn.secondary}>Back To Warehouse Master</button> : <span style={embeddedBadge}>Warehouse Management → Rent</span>}
    </div>

    <div style={{...card, marginBottom:16}}>
      <div style={topGrid}>
        <label>Rent Month<input type="month" value={rentMonth} onChange={e=>setRentMonth(e.target.value)} style={input}/></label>
        <label>Booking Date<input type="date" value={bookingDate} onChange={e=>setBookingDate(e.target.value)} style={input}/></label>
        <button onClick={load} style={{...btn.primary,alignSelf:"end"}} disabled={loading}>Refresh</button>
      </div>
    </div>

    <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:16}}>
      {[['booking','Rent Booking'],['collection','Company Rent Collection'],['bills','Company Bills'],['workflow','Workflow Report']].map(([key,label])=><button key={key} onClick={()=>setActive(key)} style={{...tab,background:active===key?"#0f766e":"#e2e8f0",color:active===key?"#fff":"#334155"}}>{label}</button>)}
    </div>

    {active === "booking" ? <div style={card}>
      <h3 style={{marginTop:0}}>1. Rent We Pay — Manual Booking</h3>
      <div style={grid}>
        <label>Warehouse<select value={warehouseId} onChange={e=>setWarehouseId(e.target.value)} style={input}><option value="">Select Payable Warehouse</option>{payableWarehouses.map(w=><option key={w.id||w._id} value={String(w.id||w._id)}>{w.name}</option>)}</select></label>
        <label>Company / Rent Payee<input value={selected?.company_name || ""} readOnly style={input}/></label>
        <label>Monthly Rent<input value={selected ? money(selected.monthly_rent) : ""} readOnly style={input}/></label>
        <label>Remarks<input value={remarks} onChange={e=>setRemarks(e.target.value)} style={input}/></label>
      </div>
      <button disabled={loading} onClick={handleSave} style={btn.primary}>Book Payable Rent</button>

      <div style={{marginTop:22, borderTop:"1px solid #e2e8f0", paddingTop:18}}>
        <h3 style={{marginTop:0}}>2. Company Rent — Bulk Booking / Collection Side</h3>
        <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",marginBottom:10}}>
          <label style={{fontWeight:700,display:"flex",gap:8,alignItems:"center"}}><input type="checkbox" checked={allSelected} onChange={toggleAll}/> Select All</label>
          <span style={{fontSize:13,color:"#64748b"}}>{selectedReceivable.length} selected / {selectableReceivable.length} pending for {rentMonth}</span>
          <button disabled={loading || !selectedReceivable.length} onClick={bulkBook} style={{...btn.primary,background:"#7c3aed"}}>Bulk Book & Generate Bill</button>
          <button disabled={loading} onClick={generateBills} style={{...btn.secondary,background:"#0f766e"}}>Generate Company Bills</button>
        </div>
        <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}><thead><tr><th style={th}>Select</th><th style={th}>Warehouse</th><th style={th}>Company</th><th style={th}>Monthly Rent</th><th style={th}>Current Month</th></tr></thead><tbody>{receivableWarehouses.map((w,i)=>{const id=String(w.id||w._id);const booked=bookedIdSet.has(id);return <tr key={id} style={{background:i%2?"#f8fafc":"#fff"}}><td style={td}><input type="checkbox" disabled={booked} checked={selectedReceivable.includes(id)} onChange={()=>toggleReceivable(id)}/></td><td style={td}>{w.name}</td><td style={td}>{w.company_name||"-"}</td><td style={td}>{money(w.monthly_rent)}</td><td style={td}>{booked?<span style={pill.green}>Booked</span>:<span style={pill.orange}>Pending</span>}</td></tr>})}{!receivableWarehouses.length&&<tr><td colSpan={5} style={td}>No receivable/company warehouses found.</td></tr>}</tbody></table></div>
      </div>
    </div> : null}

    {active === "collection" ? <div style={card}>
      <h3 style={{marginTop:0}}>Company Rent Collection</h3>
      <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}><thead><tr><th style={th}>Bill No</th><th style={th}>Month</th><th style={th}>Company</th><th style={th}>Bill</th><th style={th}>Collected</th><th style={th}>Balance</th><th style={th}>Status</th><th style={th}>Action</th></tr></thead><tbody>{bills.map((b,i)=><tr key={b.id} style={{background:i%2?"#f8fafc":"#fff"}}><td style={td}>{b.bill_no}</td><td style={td}>{b.rent_month}</td><td style={td}>{b.company_name||"-"}</td><td style={td}>{money(b.total_amount)}</td><td style={td}>{money(b.collected_amount)}</td><td style={td}>{money(b.balance_amount)}</td><td style={td}>{statusPill(b.status)}</td><td style={td}>{Number(b.balance_amount||0)>0?<button onClick={()=>{setCollectBill(b);setCollectionForm(f=>({...f,amount:money(b.balance_amount)}));}} style={{...mini,background:"#0f766e"}}>Collect</button>:"Completed"}</td></tr>)}{!bills.length&&<tr><td colSpan={8} style={td}>No company rent bills for this month.</td></tr>}</tbody></table></div>
    </div> : null}

    {active === "bills" ? <div style={card}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,flexWrap:"wrap"}}><h3 style={{marginTop:0}}>Company Rent Bills</h3><button onClick={generateBills} disabled={loading} style={btn.primary}>Generate / Refresh Bills</button></div>
      <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}><thead><tr><th style={th}>Bill No</th><th style={th}>Bill Date</th><th style={th}>Month</th><th style={th}>Company</th><th style={th}>Warehouses</th><th style={th}>Amount</th><th style={th}>Status</th></tr></thead><tbody>{bills.map((b,i)=><tr key={b.id} style={{background:i%2?"#f8fafc":"#fff"}}><td style={td}>{b.bill_no}</td><td style={td}>{b.bill_date}</td><td style={td}>{b.rent_month}</td><td style={td}>{b.company_name||"-"}</td><td style={td}>{b.item_count||0}</td><td style={td}>{money(b.total_amount)}</td><td style={td}>{statusPill(b.status)}</td></tr>)}{!bills.length&&<tr><td colSpan={7} style={td}>No company bills found.</td></tr>}</tbody></table></div>
    </div> : null}

    {active === "workflow" ? <div style={card}>
      <h3 style={{marginTop:0}}>Warehouse Rent Workflow Report</h3>
      <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}><thead><tr><th style={th}>Month</th><th style={th}>Flow</th><th style={th}>Company</th><th style={th}>Warehouse</th><th style={th}>Booking</th><th style={th}>Bill</th><th style={th}>Bill Amount</th><th style={th}>Collected</th><th style={th}>Balance</th><th style={th}>Status</th></tr></thead><tbody>{workflow.details.map((r,i)=><tr key={r.id} style={{background:i%2?"#f8fafc":"#fff"}}><td style={td}>{r.rent_month}</td><td style={td}>{r.rent_flow==="receivable"?"We Collect":"We Pay"}</td><td style={td}>{r.company_name||"-"}</td><td style={td}>{r.warehouse_name||"-"}</td><td style={td}>{r.booking_no||"-"}</td><td style={td}>{r.bill_no||"-"}</td><td style={td}>{r.bill_no?money(r.bill_amount):"-"}</td><td style={td}>{r.bill_no?money(r.collected_amount):"-"}</td><td style={td}>{r.bill_no?money(r.balance_amount):"-"}</td><td style={td}>{r.bill_no?statusPill(r.bill_status):statusPill(r.booking_status)}</td></tr>)}{!workflow.details.length&&<tr><td colSpan={10} style={td}>No workflow data for this month.</td></tr>}</tbody></table></div>
    </div> : null}

    {collectBill ? <div style={overlay}><div style={{...card,width:"min(520px, 94vw)",maxHeight:"88vh",overflowY:"auto"}}><h3 style={{marginTop:0}}>Collect Company Rent</h3><div style={{fontSize:13,color:"#475569",marginBottom:12}}>{collectBill.company_name} · {collectBill.bill_no} · Balance ₹{money(collectBill.balance_amount)}</div><div style={grid}><label>Collection Amount<input type="number" min="0.01" step="0.01" value={collectionForm.amount} onChange={e=>setCollectionForm({...collectionForm,amount:e.target.value})} style={input}/></label><label>Collection Date<input type="date" value={collectionForm.collection_date} onChange={e=>setCollectionForm({...collectionForm,collection_date:e.target.value})} style={input}/></label><label>Mode<select value={collectionForm.collection_mode} onChange={e=>setCollectionForm({...collectionForm,collection_mode:e.target.value})} style={input}><option>Bank</option><option>Cash</option><option>UPI</option><option>Cheque</option></select></label><label>Reference No<input value={collectionForm.reference_no} onChange={e=>setCollectionForm({...collectionForm,reference_no:e.target.value})} style={input}/></label></div><div style={{display:"flex",justifyContent:"flex-end",gap:8}}><button onClick={()=>setCollectBill(null)} style={btn.secondary}>Cancel</button><button onClick={submitCollection} disabled={loading} style={btn.primary}>Save Collection</button></div></div></div> : null}
  </div>;
}

function statusPill(status){const s=String(status||"").toLowerCase(); if(s==="collected"||s==="paid") return <span style={pill.green}>{s.toUpperCase()}</span>; if(s==="partial") return <span style={pill.blue}>{s.toUpperCase()}</span>; return <span style={pill.orange}>{s? s.toUpperCase():"PENDING"}</span>;}

const card={background:"#fff",border:"1px solid #e2e8f0",borderRadius:12,padding:16,boxShadow:"0 4px 18px rgba(15,23,42,.06)"};
const grid={display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:14,marginBottom:16};
const topGrid={display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:12};
const input={display:"block",width:"100%",boxSizing:"border-box",marginTop:6,padding:"10px 11px",border:"1px solid #cbd5e1",borderRadius:8,background:"#fff"};
const th={background:"#0f766e",color:"#fff",padding:10,textAlign:"left",whiteSpace:"nowrap"};
const td={padding:10,borderBottom:"1px solid #e2e8f0",whiteSpace:"nowrap"};
const tab={border:0,borderRadius:8,padding:"10px 14px",fontWeight:700,cursor:"pointer"};
const btn={primary:{background:"#0f766e",color:"#fff",border:0,borderRadius:8,padding:"10px 16px",fontWeight:700,cursor:"pointer"},secondary:{background:"#475569",color:"#fff",border:0,borderRadius:8,padding:"10px 16px",fontWeight:700,cursor:"pointer"}};
const mini={color:"#fff",border:0,borderRadius:6,padding:"7px 10px",fontWeight:700,cursor:"pointer"};
const pill={green:{display:"inline-block",padding:"4px 8px",borderRadius:999,background:"#dcfce7",color:"#166534",fontWeight:700},orange:{display:"inline-block",padding:"4px 8px",borderRadius:999,background:"#ffedd5",color:"#9a3412",fontWeight:700},blue:{display:"inline-block",padding:"4px 8px",borderRadius:999,background:"#dbeafe",color:"#1d4ed8",fontWeight:700}};
const overlay={position:"fixed",inset:0,background:"rgba(15,23,42,.42)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:16};
const embeddedBadge={display:"inline-block",padding:"7px 10px",borderRadius:999,background:"#ede9fe",color:"#6d28d9",fontSize:12,fontWeight:800};
