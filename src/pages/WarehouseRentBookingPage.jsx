import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const money = (v) => Number(v || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function WarehouseRentBookingPage() {
  const navigate = useNavigate();
  const [warehouses, setWarehouses] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [warehouseId, setWarehouseId] = useState("");
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [bookingDate, setBookingDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);

  const selectedWarehouse = useMemo(
    () => warehouses.find((w) => String(w.id || w._id) === String(warehouseId)),
    [warehouses, warehouseId]
  );

  const fetchData = async () => {
    try {
      const [wRes, bRes] = await Promise.all([
        axios.get("/api/warehouses"),
        axios.get("/api/warehouse-rent-bookings", { params: { month } }),
      ]);
      setWarehouses(Array.isArray(wRes.data) ? wRes.data : []);
      setBookings(Array.isArray(bRes.data) ? bRes.data : []);
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.error || "Failed to load warehouse rent data");
    }
  };

  useEffect(() => { fetchData(); }, [month]);

  const handleBook = async () => {
    if (!warehouseId) return alert("Please select warehouse");
    if (!month) return alert("Please select month");
    if (!Number(selectedWarehouse?.monthly_rent || 0)) return alert("Monthly rent is not set for this warehouse");
    setLoading(true);
    try {
      await axios.post("/api/warehouse-rent-bookings", {
        warehouse_id: warehouseId,
        month,
        booking_date: bookingDate,
      });
      alert("Warehouse rent booked successfully");
      await fetchData();
    } catch (err) {
      alert(err?.response?.data?.error || "Failed to book warehouse rent");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", padding: 22, fontFamily: "Segoe UI, Arial, sans-serif" }}>
      <div style={{ maxWidth: 1180, margin: "0 auto" }}>
        <div style={{ background: "linear-gradient(135deg,#0f766e,#155e75)", color: "#fff", borderRadius: 20, padding: 24, boxShadow: "0 16px 35px rgba(15,118,110,.18)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 13, opacity: .8, fontWeight: 700, letterSpacing: .5 }}>WAREHOUSE RENT</div>
              <h1 style={{ margin: "5px 0", fontSize: 28 }}>Monthly Rent Booking</h1>
              <div style={{ opacity: .9 }}>Select warehouse and month. Company and monthly rent are automatic.</div>
            </div>
            <button onClick={() => navigate("/warehouses")} style={{ border: 0, borderRadius: 10, padding: "10px 16px", fontWeight: 700, cursor: "pointer" }}>Back to Warehouses</button>
          </div>
        </div>

        <div style={{ marginTop: 18, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 18, padding: 20, boxShadow: "0 8px 25px rgba(15,23,42,.06)" }}>
          <h2 style={{ marginTop: 0 }}>Create Rent Booking</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 16 }}>
            <label style={{ display: "flex", flexDirection: "column", gap: 6, fontWeight: 700 }}>
              Warehouse
              <select value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} style={inputStyle}>
                <option value="">Select Warehouse</option>
                {warehouses.map((w) => <option key={w.id || w._id} value={w.id || w._id}>{w.name}</option>)}
              </select>
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 6, fontWeight: 700 }}>
              Rent Month
              <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} style={inputStyle} />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 6, fontWeight: 700 }}>
              Booking Date
              <input type="date" value={bookingDate} onChange={(e) => setBookingDate(e.target.value)} style={inputStyle} />
            </label>
          </div>

          <div style={{ marginTop: 20, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 14 }}>
            <Info label="Company (Automatic)" value={selectedWarehouse?.company_name || "—"} />
            <Info label="Monthly Rent (Automatic)" value={`₹${money(selectedWarehouse?.monthly_rent)}`} />
            <Info label="Selected Month" value={month || "—"} />
          </div>

          <button disabled={loading} onClick={handleBook} style={{ marginTop: 20, border: 0, borderRadius: 11, padding: "12px 20px", background: loading ? "#94a3b8" : "#7c3aed", color: "#fff", fontWeight: 800, cursor: loading ? "not-allowed" : "pointer" }}>
            {loading ? "Booking..." : "Book Warehouse Rent"}
          </button>
        </div>

        <div style={{ marginTop: 18, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 18, padding: 20, boxShadow: "0 8px 25px rgba(15,23,42,.06)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h2 style={{ margin: 0 }}>Booked Rent — {month}</h2>
            <strong>{bookings.length} booking(s)</strong>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead><tr>{["Booking No","Booking Date","Company","Warehouse","Month","Rent","Status"].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
              <tbody>
                {bookings.length ? bookings.map((b) => <tr key={b.id}><td style={td}>{b.booking_no}</td><td style={td}>{b.booking_date}</td><td style={td}>{b.company_name}</td><td style={td}>{b.warehouse_name}</td><td style={td}>{b.month}</td><td style={td}>₹{money(b.monthly_rent)}</td><td style={td}><span style={{ background: "#dcfce7", color: "#166534", padding: "5px 9px", borderRadius: 999, fontWeight: 700 }}>{b.status}</span></td></tr>) : <tr><td colSpan={7} style={{ ...td, textAlign: "center", padding: 24 }}>No rent booking for this month.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }) {
  return <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, padding: 14 }}><div style={{ color: "#64748b", fontSize: 12, fontWeight: 700 }}>{label}</div><div style={{ marginTop: 5, color: "#0f172a", fontSize: 18, fontWeight: 800 }}>{value}</div></div>;
}

const inputStyle = { width: "100%", boxSizing: "border-box", padding: "11px 12px", border: "1px solid #cbd5e1", borderRadius: 9, fontSize: 14, background: "#fff" };
const th = { background: "#0f766e", color: "#fff", padding: "11px 12px", textAlign: "left", whiteSpace: "nowrap" };
const td = { borderBottom: "1px solid #e2e8f0", padding: "11px 12px", whiteSpace: "nowrap" };
