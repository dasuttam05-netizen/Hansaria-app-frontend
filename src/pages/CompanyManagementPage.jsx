import React, { useEffect, useState } from "react";
import axios from "axios";

const emptyForm = () => ({
  name: "",
  address: "",
  mobile: "",
  opening_balance: "0",
  opening_balance_type: "dr",
});

export default function CompanyManagementPage() {
  const [companies, setCompanies] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const API_URL = "/api/companies";

  const fetchCompanies = async () => {
    try {
      const res = await axios.get(API_URL);
      setCompanies(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
      alert("Failed to fetch companies");
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  const handleChange = (e) => setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const resetForm = () => {
    setShowForm(false);
    setEditId(null);
    setFormData(emptyForm());
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.mobile) {
      alert("Company Name and Mobile No. are required");
      return;
    }
    try {
      if (editId) {
        await axios.put(`${API_URL}/${editId}`, formData);
        alert("Company updated successfully");
      } else {
        await axios.post(API_URL, formData);
        alert("Company added successfully");
      }
      resetForm();
      fetchCompanies();
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.error || "Error saving company");
    }
  };

  const handleEdit = (comp) => {
    setFormData({
      name: comp.name || "",
      address: comp.address || "",
      mobile: comp.mobile || "",
      opening_balance: String(comp.opening_balance ?? 0),
      opening_balance_type: String(comp.opening_balance_type || "dr"),
    });
    setEditId(comp._id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this company?")) return;
    try {
      await axios.delete(`${API_URL}/${id}`);
      fetchCompanies();
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.error || "Error deleting company");
    }
  };

  return (
    <div style={{ fontFamily: "Segoe UI, Arial, sans-serif", padding: "8px" }}>
      {showForm ? (
        <div style={card}>
          <div style={headerRow}>
            <h2 style={titleStyle}>{editId ? "Edit Company" : "Add Company"}</h2>
            <button type="button" onClick={resetForm} style={btnPrimary}>Back To Company List</button>
          </div>
          <form onSubmit={handleSubmit}>
            <div style={formGrid}>
              <Field label="Company Name">
                <input name="name" value={formData.name} onChange={handleChange} placeholder="Company Name *" style={inp} />
              </Field>
              <Field label="Mobile">
                <input name="mobile" value={formData.mobile} onChange={handleChange} placeholder="Mobile No. *" style={inp} />
              </Field>
              <Field label="Opening Balance">
                <input name="opening_balance" value={formData.opening_balance} onChange={handleChange} type="number" step="0.01" style={inp} />
              </Field>
              <Field label="Balance Type">
                <select name="opening_balance_type" value={formData.opening_balance_type} onChange={handleChange} style={inp}>
                  <option value="dr">Dr</option>
                  <option value="cr">Cr</option>
                </select>
              </Field>
              <div style={{ gridColumn: "1 / -1" }}>
                <Field label="Address">
                  <textarea name="address" value={formData.address} onChange={handleChange} rows={3} style={{ ...inp, minHeight: 72, resize: "vertical" }} />
                </Field>
              </div>
            </div>
            <div style={actionRow}>
              <button type="submit" style={btnPrimary}>Save</button>
              <button type="button" onClick={resetForm} style={btnPrimary}>Back To Company List</button>
            </div>
          </form>
        </div>
      ) : (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", gap: 10, flexWrap: "wrap" }}>
            <h2 style={titleStyle}>Company Management</h2>
            <button type="button" onClick={() => setShowForm(true)} style={{ ...btnPrimary, background: "#0f766e" }}>Add Company</button>
          </div>
          <div style={tableCard}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr style={{ background: "#0f766e", color: "#fff" }}>
                  <th style={th}>ID</th>
                  <th style={th}>Company Name</th>
                  <th style={th}>Address</th>
                  <th style={th}>Mobile</th>
                  <th style={th}>Opening Balance</th>
                  <th style={th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {companies.map((comp, i) => {
                  const openingBalance = Number(comp.opening_balance ?? 0);
                  const openingType = String(comp.opening_balance_type || "dr").toUpperCase();
                  return (
                    <tr key={comp._id} style={{ background: i % 2 ? "#f8fafc" : "#fff" }}>
                      <td style={td}>{String(i + 1).padStart(2, "0")}</td>
                      <td style={td}>{comp.name || "-"}</td>
                      <td style={td}>{comp.address || "-"}</td>
                      <td style={td}>{comp.mobile || "-"}</td>
                      <td style={td}>{openingBalance.toFixed(2)} {openingType}</td>
                      <td style={td}>
                        <button type="button" onClick={() => handleEdit(comp)} style={{ ...mini, background: "#2563eb" }}>Edit</button>{" "}
                        <button type="button" onClick={() => handleDelete(comp._id)} style={{ ...mini, background: "#dc2626" }}>Delete</button>
                      </td>
                    </tr>
                  );
                })}
                {companies.length === 0 ? (
                  <tr><td colSpan={6} style={{ ...td, textAlign: "center", padding: "20px" }}>No companies found.</td></tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function Field({ label, children }) {
  return <div><label style={lbl}>{label}</label>{children}</div>;
}

const titleStyle = { margin: 0, fontSize: "18px", color: "#0f172a" };
const card = { background: "#fff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "20px", maxWidth: "1000px", margin: "0 auto", boxShadow: "0 4px 14px rgba(15,23,42,0.06)" };
const tableCard = { overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: "10px", background: "#fff" };
const headerRow = { display: "flex", flexWrap: "wrap", alignItems: "center", gap: "12px", marginBottom: "20px", justifyContent: "space-between" };
const formGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", alignItems: "start" };
const actionRow = { display: "flex", gap: "12px", marginTop: "22px", flexWrap: "wrap" };
const inp = { width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "14px", boxSizing: "border-box" };
const lbl = { display: "block", marginBottom: "6px", fontWeight: 600, fontSize: "13px", color: "#334155" };
const btnPrimary = { background: "#2563eb", color: "#fff", border: "none", padding: "10px 18px", borderRadius: "8px", cursor: "pointer", fontWeight: 600, fontSize: "14px" };
const th = { padding: "10px 8px", textAlign: "left", borderBottom: "1px solid #0d5c56" };
const td = { padding: "8px", borderBottom: "1px solid #e2e8f0" };
const mini = { border: "none", color: "#fff", padding: "5px 10px", borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontWeight: 600 };
