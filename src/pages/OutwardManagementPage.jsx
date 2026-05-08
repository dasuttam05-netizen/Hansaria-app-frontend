// src/pages/OutwardPage.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import { formatDisplayDate } from "../utils/date";

export default function OutwardPage() {
  const API = "/api";

  const [outwards, setOutwards] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState(null);

  const [formData, setFormData] = useState({
    date: "",
    employee_id: "",
    location_id: "",
    warehouse_id: "",
    product_id: "",
    company_id: "",
    company_account_id: "",
    lorry_no: "",
    weight: "",
    labour_charges: "",
  });

  const [employees, setEmployees] = useState([]);
  const [locations, setLocations] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [companyAccounts, setCompanyAccounts] = useState([]);

  useEffect(() => {
    fetchOutwards();
    fetchDropdowns();
  }, []);

  const fetchOutwards = async () => {
    try {
      const res = await axios.get(`${API}/outward`);
      setOutwards(res.data);
    } catch (err) {
      console.error(err);
      alert("Error fetching outwards");
    }
  };

  const fetchDropdowns = async () => {
    try {
      const [empRes, locRes, whRes, prodRes, compRes, accRes] = await Promise.all([
        axios.get(`${API}/employees`),
        axios.get(`${API}/locations`),
        axios.get(`${API}/warehouses`),
        axios.get(`${API}/products`),
        axios.get(`${API}/companies`),
        axios.get(`${API}/company_accounts`),
      ]);
      setEmployees(empRes.data);
      setLocations(locRes.data);
      setWarehouses(whRes.data);
      setProducts(prodRes.data);
      setCompanies(compRes.data);
      setCompanyAccounts(accRes.data);
    } catch (err) {
      console.error(err);
      alert("Error fetching dropdowns");
    }
  };

  // Auto-set location and warehouse when employee selected
  useEffect(() => {
    if (formData.employee_id) {
      const employeeId = Number(formData.employee_id);
      const emp = employees.find((e) => e.id === employeeId);
      const assignedWarehouses = warehouses.filter(
        (w) => Number(w.employee_id) === employeeId
      );

      setFormData((prev) => ({
        ...prev,
        location_id: emp?.location_id || "",
        warehouse_id:
          assignedWarehouses.length > 0
            ? String(assignedWarehouses[0].id)
            : "",
      }));
    }
  }, [formData.employee_id, employees, warehouses]);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        employee_id: formData.employee_id ? Number(formData.employee_id) : null,
        location_id: formData.location_id ? Number(formData.location_id) : null,
        warehouse_id: formData.warehouse_id ? Number(formData.warehouse_id) : null,
        product_id: formData.product_id ? Number(formData.product_id) : null,
        company_id: formData.company_id ? Number(formData.company_id) : null,
        company_account_id: formData.company_account_id ? Number(formData.company_account_id) : null,
        weight: Number(formData.weight) || 0,
        labour_charges: Number(formData.labour_charges) || 0,
      };

      if (editData) await axios.put(`${API}/outward/${editData.id}`, payload);
      else await axios.post(`${API}/outward`, payload);

      setShowForm(false);
      setEditData(null);
      setFormData({
        date: "", employee_id: "", location_id: "", warehouse_id: "",
        product_id: "", company_id: "", company_account_id: "",
        lorry_no: "", weight: "", labour_charges: "",
      });
      fetchOutwards();
    } catch (err) {
      console.error(err);
      alert("Error saving outward");
    }
  };

  const handleEdit = (row) => {
    setEditData(row);
    setFormData({
      date: row.date || "",
      employee_id: row.employee_id || "",
      location_id: row.location_id || "",
      warehouse_id: row.warehouse_id || "",
      product_id: row.product_id || "",
      company_id: row.company_id || "",
      company_account_id: row.company_account_id || "",
      lorry_no: row.lorry_no || "",
      weight: row.weight || "",
      labour_charges: row.labour_charges || "",
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this outward?")) return;
    try {
      await axios.delete(`${API}/outward/${id}`);
      fetchOutwards();
    } catch (err) {
      console.error(err);
      alert("Delete error");
    }
  };

  return (
    <div style={{ fontFamily: "Segoe UI, Arial, sans-serif", padding: "16px" }}>
      <h2 style={{ marginTop: 0, marginBottom: "12px" }}>📦 Outward Management</h2>

      <button
        onClick={() => setShowForm(true)}
        style={{
          background: "#009688",
          color: "#fff",
          padding: "10px 18px",
          border: "none",
          borderRadius: "8px",
          cursor: "pointer",
          marginBottom: "12px",
          fontSize: "15px",
        }}
      >
        ➕ Add Outward
      </button>

      {/* ✅ FULL-SCREEN POPUP FORM */}
      {showForm && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(2px)",
            zIndex: 9999,
          }}
        >
          <div
            style={{
              width: "100%",
              height: "100%",
              background: "#fff",
              padding: "24px",
              overflowY: "auto",
              position: "relative",
              boxShadow: "0 8px 40px rgba(0,0,0,0.45)",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Close Button */}
            <button
              onClick={() => { setShowForm(false); setEditData(null); }}
              style={{
                position: "absolute",
                top: "16px",
                right: "20px",
                background: "#ff5555",
                color: "#fff",
                border: "none",
                borderRadius: "50%",
                width: "36px",
                height: "36px",
                fontSize: "20px",
                fontWeight: "bold",
                cursor: "pointer",
              }}
            >
              ✖
            </button>

            <h3 style={{ marginTop: "8px", marginBottom: "20px", fontSize: "22px" }}>
              {editData ? "✏️ Edit Outward Entry" : "➕ New Outward Entry"}
            </h3>

            <form
              onSubmit={handleSubmit}
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(250px,1fr))",
                gap: "16px",
                flex: 1,
              }}
            >
              <input type="date" name="date" value={formData.date} onChange={handleChange} required
                style={{ padding:"12px", fontSize:"16px", borderRadius:"6px", border:"1px solid #ccc" }}/>

              <select name="employee_id" value={formData.employee_id} onChange={handleChange} required
                style={{ padding:"12px", fontSize:"16px", borderRadius:"6px", border:"1px solid #ccc" }}>
                <option value="">Select Employee</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>

              <select name="location_id" value={formData.location_id} disabled
                style={{ padding:"12px", fontSize:"16px", borderRadius:"6px", border:"1px solid #ccc", background:"#f5f5f5" }}>
                <option value="">Location</option>
                {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>

              <select name="warehouse_id" value={formData.warehouse_id} onChange={handleChange}
                style={{ padding:"12px", fontSize:"16px", borderRadius:"6px", border:"1px solid #ccc" }}>
                <option value="">Select Warehouse</option>
                {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>

              <select name="product_id" value={formData.product_id} onChange={handleChange}
                style={{ padding:"12px", fontSize:"16px", borderRadius:"6px", border:"1px solid #ccc" }}>
                <option value="">Select Product</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>

              <select name="company_id" value={formData.company_id} onChange={handleChange}
                style={{ padding:"12px", fontSize:"16px", borderRadius:"6px", border:"1px solid #ccc" }}>
                <option value="">Select Company</option>
                {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>

              <select name="company_account_id" value={formData.company_account_id} onChange={handleChange}
                style={{ padding:"12px", fontSize:"16px", borderRadius:"6px", border:"1px solid #ccc" }}>
                <option value="">Select Account</option>
                {companyAccounts
                  .filter(acc => acc.company_id === Number(formData.company_id))
                  .map(acc => <option key={acc.id} value={acc.id}>{acc.account_name}</option>)}
              </select>

              <input type="text" name="lorry_no" placeholder="Lorry No" value={formData.lorry_no} onChange={handleChange}
                style={{ padding:"12px", fontSize:"16px", borderRadius:"6px", border:"1px solid #ccc" }}/>

              <input type="number" name="weight" placeholder="Weight" value={formData.weight} onChange={handleChange}
                style={{ padding:"12px", fontSize:"16px", borderRadius:"6px", border:"1px solid #ccc" }}/>

              <input type="number" name="labour_charges" placeholder="Labour Charges" value={formData.labour_charges} onChange={handleChange}
                style={{ padding:"12px", fontSize:"16px", borderRadius:"6px", border:"1px solid #ccc" }}/>

              <div style={{ gridColumn:"1/-1", display:"flex", justifyContent:"flex-end", gap:"12px", marginTop:"12px" }}>
                <button type="submit" style={{ background:"#009688", color:"#fff", padding:"10px 16px", border:"none", borderRadius:"6px", cursor:"pointer", fontSize:"16px" }}>Save</button>
                <button type="button" onClick={()=>{ setShowForm(false); setEditData(null); }}
                  style={{ background:"#f44336", color:"#fff", padding:"10px 16px", border:"none", borderRadius:"6px", cursor:"pointer", fontSize:"16px" }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Table */}
      <div style={{ overflowX:"auto", maxHeight:"65vh" }}>
        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:"14px", minWidth:"900px" }}>
          <thead style={{ background:"#607d8b", color:"#fff", position:"sticky", top:0, zIndex:1 }}>
            <tr>
              <th style={{ padding:"6px", border:"1px solid #ccc" }}>Voucher</th>
              <th style={{ padding:"6px", border:"1px solid #ccc" }}>Date</th>
              <th style={{ padding:"6px", border:"1px solid #ccc" }}>Location</th>
              <th style={{ padding:"6px", border:"1px solid #ccc" }}>Employee</th>
              <th style={{ padding:"6px", border:"1px solid #ccc" }}>Product</th>
              <th style={{ padding:"6px", border:"1px solid #ccc" }}>Warehouse</th>
              <th style={{ padding:"6px", border:"1px solid #ccc" }}>Company</th>
              <th style={{ padding:"6px", border:"1px solid #ccc" }}>Account</th>
              <th style={{ padding:"6px", border:"1px solid #ccc" }}>Lorry</th>
              <th style={{ padding:"6px", border:"1px solid #ccc" }}>Weight</th>
              <th style={{ padding:"6px", border:"1px solid #ccc" }}>Labour</th>
              <th style={{ padding:"6px", border:"1px solid #ccc" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {outwards.map((row) => (
              <tr key={row.id} style={{ borderBottom:"1px solid #ddd" }}>
                <td style={{ padding:"6px", border:"1px solid #ccc" }}>{row.id}</td>
                <td style={{ padding:"6px", border:"1px solid #ccc" }}>{formatDisplayDate(row.date)}</td>
                <td style={{ padding:"6px", border:"1px solid #ccc" }}>{locations.find(l => l.id === row.location_id)?.name}</td>
                <td style={{ padding:"6px", border:"1px solid #ccc" }}>{employees.find(e => e.id === row.employee_id)?.name}</td>
                <td style={{ padding:"6px", border:"1px solid #ccc" }}>{products.find(p => p.id === row.product_id)?.name}</td>
                <td style={{ padding:"6px", border:"1px solid #ccc" }}>{warehouses.find(w => w.id === row.warehouse_id)?.name}</td>
                <td style={{ padding:"6px", border:"1px solid #ccc" }}>{companies.find(c => c.id === row.company_id)?.name}</td>
                <td style={{ padding:"6px", border:"1px solid #ccc" }}>{companyAccounts.find(a => a.id === row.company_account_id)?.account_name}</td>
                <td style={{ padding:"6px", border:"1px solid #ccc" }}>{row.lorry_no}</td>
                <td style={{ padding:"6px", border:"1px solid #ccc" }}>{row.weight}</td>
                <td style={{ padding:"6px", border:"1px solid #ccc" }}>{row.labour_charges}</td>
                <td style={{ padding:"6px", border:"1px solid #ccc", display:"flex", gap:"6px" }}>
                  <button onClick={()=>handleEdit(row)} style={{ padding:"4px 8px", background:"#2196f3", color:"#fff", border:"none", borderRadius:"4px", cursor:"pointer" }}>Edit</button>
                  <button onClick={()=>handleDelete(row.id)} style={{ padding:"4px 8px", background:"#f44336", color:"#fff", border:"none", borderRadius:"4px", cursor:"pointer" }}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
