import React, { useState, useEffect } from "react";
import axios from "axios";
import { formatDisplayDate } from "../utils/date";

export default function OutwardPage({ userRole = "user" }) {
  const API = "/api";

  const [outwards, setOutwards] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState(null);

  const [employees, setEmployees] = useState([]);
  const [locations, setLocations] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);
  const [companies, setCompanies] = useState([]);

  const [formData, setFormData] = useState({
    date: "",
    employee_id: "",
    location_id: "",
    warehouse_id: "",
    product_id: "",
    company_id: "",
    buyer_name: "",
    consignee_name: "",
    quantity: "",
    rate: "",
    amount: 0,
    narration: "",
  });

  useEffect(() => {
    fetchDropdowns();
    fetchOutwards();
  }, []);

  async function fetchDropdowns() {
    try {
      const [empRes, locRes, whRes, prodRes, compRes] = await Promise.all([
        axios.get(`${API}/employees`),
        axios.get(`${API}/locations`),
        axios.get(`${API}/warehouses`),
        axios.get(`${API}/products`),
        axios.get(`${API}/companies`),
      ]);
      setEmployees(empRes.data);
      setLocations(locRes.data);
      setWarehouses(whRes.data);
      setProducts(prodRes.data);
      setCompanies(compRes.data);
    } catch (err) {
      console.error("fetchDropdowns error", err);
      alert("Dropdown fetch error");
    }
  }

  async function fetchOutwards() {
    try {
      const res = await axios.get(`${API}/outward`);
      setOutwards(res.data);
    } catch (err) {
      console.error("fetchOutwards error", err);
      alert("Failed to load outwards");
    }
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setFormData(p => ({ ...p, [name]: value }));
  }

  useEffect(() => {
    const q = Number(formData.quantity || 0);
    const r = Number(formData.rate || 0);
    setFormData(p => ({ ...p, amount: q * r }));
  }, [formData.quantity, formData.rate]);

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        quantity: Number(formData.quantity || 0),
        rate: Number(formData.rate || 0),
        amount: Number(formData.amount || 0),
        employee_id: Number(formData.employee_id || null),
        location_id: Number(formData.location_id || null),
        warehouse_id: Number(formData.warehouse_id || null),
        product_id: Number(formData.product_id || null),
        company_id: Number(formData.company_id || null),
      };

      if (editData) {
        await axios.post(`${API}/outward`, { ...payload, id: editData.id });
        alert("Outward updated successfully");
      } else {
        await axios.post(`${API}/outward`, payload);
        alert("Outward added successfully");
      }
      setShowForm(false);
      setEditData(null);
      resetForm();
      fetchOutwards();
    } catch (err) {
      console.error("Save error", err);
      alert("Failed to save outward entry");
    }
  }

  function resetForm() {
    setFormData({
      date: "",
      employee_id: "",
      location_id: "",
      warehouse_id: "",
      product_id: "",
      company_id: "",
      buyer_name: "",
      consignee_name: "",
      quantity: "",
      rate: "",
      amount: 0,
      narration: "",
    });
  }

  function handleEdit(row) {
    setEditData(row);
    setFormData({
      date: row.date || "",
      employee_id: row.employee_id || "",
      location_id: row.location_id || "",
      warehouse_id: row.warehouse_id || "",
      product_id: row.product_id || "",
      company_id: row.company_id || "",
      buyer_name: row.buyer_name || "",
      consignee_name: row.consignee_name || "",
      quantity: row.quantity || "",
      rate: row.rate || "",
      amount: row.amount || 0,
      narration: row.narration || "",
    });
    setShowForm(true);
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete outward?")) return;
    try {
      await axios.delete(`${API}/outward/${id}`);
      fetchOutwards();
    } catch {
      alert("Delete failed");
    }
  }

  const inputStyle = { padding: 6, fontSize: 12, borderRadius: 4, border: "1px solid #ccc", width: "100%" };
  const btnStyle = { padding: "6px 10px", fontSize: 12, borderRadius: 4, border: "none", cursor: "pointer" };

  return (
    <div style={{ padding: 16, fontFamily: "Segoe UI, Arial, sans-serif" }}>
      <h2>📤 Outward Management</h2>
      <button onClick={() => { resetForm(); setEditData(null); setShowForm(true); }} style={{ ...btnStyle, background: "#4caf50", color: "#fff", marginBottom: 12 }}>
        ➕ Add Outward
      </button>

      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 999 }}>
          <div style={{ background: "#fff", padding: 16, borderRadius: 10, width: 700, maxHeight: "90vh", overflowY: "auto", position: "relative" }}>
            <button onClick={() => { setShowForm(false); setEditData(null); }} style={{ position: "absolute", right: 10, top: 10, border: "none", background: "transparent", fontSize: 16 }}>✖</button>

            <form onSubmit={handleSubmit} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, fontSize: 12 }}>
              <input type="date" name="date" value={formData.date} onChange={handleChange} required style={inputStyle} />
              <select name="employee_id" value={formData.employee_id} onChange={handleChange} required style={inputStyle}>
                <option value="">Select Employee</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
              <select name="location_id" value={formData.location_id} disabled style={inputStyle}>
                <option value="">Location</option>
                {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>

              <select name="warehouse_id" value={formData.warehouse_id} onChange={handleChange} style={inputStyle}>
                <option value="">Select Warehouse</option>
                {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
              <select name="product_id" value={formData.product_id} onChange={handleChange} style={inputStyle}>
                <option value="">Select Product</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <select name="company_id" value={formData.company_id} onChange={handleChange} style={inputStyle}>
                <option value="">Select Company</option>
                {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>

              <input type="text" name="buyer_name" placeholder="Buyer Name" value={formData.buyer_name} onChange={handleChange} style={inputStyle} />
              <input type="text" name="consignee_name" placeholder="Consignee Name" value={formData.consignee_name} onChange={handleChange} style={inputStyle} />
              <input type="number" name="quantity" placeholder="Qty" value={formData.quantity} onChange={handleChange} style={inputStyle} />

              <input type="number" name="rate" placeholder="Rate" value={formData.rate} onChange={handleChange} style={inputStyle} />
              <input type="number" name="amount" placeholder="Amount" value={formData.amount} disabled style={inputStyle} />
              <textarea name="narration" placeholder="Narration" value={formData.narration} onChange={handleChange} style={{ gridColumn: "1/-1", ...inputStyle }} />

              <div style={{ gridColumn: "1/-1", display: "flex", gap: 6, justifyContent: "flex-end", marginTop: 8 }}>
                <button type="submit" style={{ ...btnStyle, background: "#4caf50", color: "#fff" }}>Save</button>
                <button type="button" onClick={() => { setShowForm(false); setEditData(null); }} style={{ ...btnStyle, background: "#f44336", color: "#fff" }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 12, fontSize: 12 }}>
        <thead>
          <tr style={{ background: "#ddd" }}>
            <th style={{ border: "1px solid #ccc", padding: 6 }}>ID</th>
            <th style={{ border: "1px solid #ccc", padding: 6 }}>Voucher</th>
            <th style={{ border: "1px solid #ccc", padding: 6 }}>Date</th>
            <th style={{ border: "1px solid #ccc", padding: 6 }}>Buyer</th>
            <th style={{ border: "1px solid #ccc", padding: 6 }}>Product</th>
            <th style={{ border: "1px solid #ccc", padding: 6 }}>Qty</th>
            <th style={{ border: "1px solid #ccc", padding: 6 }}>Rate</th>
            <th style={{ border: "1px solid #ccc", padding: 6 }}>Amount</th>
            <th style={{ border: "1px solid #ccc", padding: 6 }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {outwards.map(o => (
            <tr key={o.id}>
              <td style={{ border: "1px solid #ccc", padding: 6 }}>{o.id}</td>
              <td style={{ border: "1px solid #ccc", padding: 6 }}>{o.voucher_no}</td>
                  <td style={{ border: "1px solid #ccc", padding: 6 }}>{formatDisplayDate(o.date)}</td>
              <td style={{ border: "1px solid #ccc", padding: 6 }}>{o.buyer_name}</td>
              <td style={{ border: "1px solid #ccc", padding: 6 }}>{o.product_id}</td>
              <td style={{ border: "1px solid #ccc", padding: 6 }}>{o.quantity}</td>
              <td style={{ border: "1px solid #ccc", padding: 6 }}>{o.rate}</td>
              <td style={{ border: "1px solid #ccc", padding: 6 }}>{o.amount}</td>
              <td style={{ border: "1px solid #ccc", padding: 6 }}>
                <button onClick={() => handleEdit(o)} style={{ ...btnStyle, background: "#2196f3", color: "#fff", marginRight: 4 }}>Edit</button>
                <button onClick={() => handleDelete(o.id)} style={{ ...btnStyle, background: "#f44336", color: "#fff" }}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
