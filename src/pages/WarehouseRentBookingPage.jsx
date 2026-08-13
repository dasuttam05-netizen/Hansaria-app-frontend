import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

export default function WarehouseRentBookingPage() {
  const navigate = useNavigate();
  const [warehouses, setWarehouses] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [warehouseId, setWarehouseId] = useState("");
  const [rentMonth, setRentMonth] = useState(new Date().toISOString().slice(0,7));
  const [bookingDate, setBookingDate] = useState(new Date().toISOString().slice(0,10));
  const [remarks, setRemarks] = useState("");
  const [saving, setSaving] = useState(false);
  const selected = useMemo(() => warehouses.find(w => String(w.id || w._id) === String(warehouseId)) || null, [warehouses, warehouseId]);

  const load = async () => {
    try {
      const [w, b] = await Promise.all([axios.get("/api/warehouses"), axios.get("/api/warehouse-rent-bookings")]);
      setWarehouses(Array.isArray(w.data) ? w.data : []);
      setBookings(Array.isArray(b.data) ? b.data : []);
    } catch (e) {
      console.error(e);
      alert(e?.response?.data?.error || "Failed to load warehouse rent data");
    }
  };
  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    if (!warehouseId || !rentMonth || !bookingDate) return alert("Select warehouse, month and booking date");
    setSaving(true);
    try {
      await axios.post("/api/warehouse-rent-bookings", { warehouse_id: warehouseId, rent_month: rentMonth, booking_date: bookingDate, remarks });
      alert("Warehouse rent booked successfully");
      setRemarks("");
      await load();
    } catch (e) {
      alert(e?.response?.data?.error || "Failed to book rent");
    } finally { setSaving(false); }
  };

  return <div style={{ padding: 16, fontFamily: "Segoe UI, Arial, sans-serif" }}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:8}}>
      <h2 style={{margin:0}}>Warehouse Rent Booking</h2>
      <button onClick={()=>navigate("/warehouses")} style={btn.secondary}>Back To Warehouse Master</button>
    </div>
    <div style={card}>
      <div style={grid}>
        <label>Booking Date<input type="date" value={bookingDate} onChange={e=>setBookingDate(e.target.value)} style={input}/></label>
        <label>Rent Month<input type="month" value={rentMonth} onChange={e=>setRentMonth(e.target.value)} style={input}/></label>
        <label>Warehouse<select value={warehouseId} onChange={e=>setWarehouseId(e.target.value)} style={input}><option value="">Select Warehouse</option>{warehouses.map(w=><option key={w.id||w._id} value={String(w.id||w._id)}>{w.name}</option>)}</select></label>
        <label>Company / Rent Payee<input value={selected?.company_name || ""} readOnly style={input}/></label>
        <label>Monthly Rent<input value={selected ? Number(selected.monthly_rent||0).toFixed(2) : ""} readOnly style={input}/></label>
        <label>Remarks<input value={remarks} onChange={e=>setRemarks(e.target.value)} style={input}/></label>
      </div>
      <button disabled={saving} onClick={handleSave} style={btn.primary}>{saving ? "Saving..." : "Book Rent"}</button>
    </div>
    <div style={{...card,marginTop:16,overflowX:"auto"}}><h3>Booked Warehouse Rent</h3><table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr><th style={th}>Booking No</th><th style={th}>Month</th><th style={th}>Warehouse</th><th style={th}>Company / Rent Payee</th><th style={th}>Rent</th><th style={th}>Status</th></tr></thead><tbody>{bookings.map((b,i)=><tr key={b.id||b._id||i}><td style={td}>{b.booking_no}</td><td style={td}>{b.rent_month}</td><td style={td}>{b.warehouse_name||"-"}</td><td style={td}>{b.company_name||"-"}</td><td style={td}>{Number(b.monthly_rent||0).toFixed(2)}</td><td style={td}>{String(b.status||"").toUpperCase()}</td></tr>)}{!bookings.length&&<tr><td colSpan={6} style={{...td,textAlign:"center"}}>No rent bookings yet.</td></tr>}</tbody></table></div>
  </div>;
}

const card={background:"#fff",border:"1px solid #e2e8f0",borderRadius:12,padding:16,boxShadow:"0 4px 18px rgba(15,23,42,.06)"};
const grid={display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:14,marginBottom:16};
const input={display:"block",width:"100%",boxSizing:"border-box",marginTop:6,padding:"10px 11px",border:"1px solid #cbd5e1",borderRadius:8};
const th={background:"#0f766e",color:"#fff",padding:10,textAlign:"left"};
const td={padding:10,borderBottom:"1px solid #e2e8f0"};
const btn={primary:{background:"#0f766e",color:"#fff",border:0,borderRadius:8,padding:"10px 16px",fontWeight:700,cursor:"pointer"},secondary:{background:"#475569",color:"#fff",border:0,borderRadius:8,padding:"10px 16px",fontWeight:700,cursor:"pointer"}};
