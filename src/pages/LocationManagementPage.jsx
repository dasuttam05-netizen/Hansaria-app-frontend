import React, { useEffect, useState } from "react";
import axios from "axios";

const emptyForm = () => ({ name: "", address: "", abbr: "" });

export default function LocationManagementPage() {
  const [locations, setLocations] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const API_URL = "/api/locations";
  const getId = (item) =>
  item?._id || item?.id;
  
  const fetchLocations = async () => {
    try {
      const res = await axios.get(API_URL);
      setLocations(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
      alert("Failed to fetch locations");
    }
  };

  useEffect(() => {
    fetchLocations();
  }, []);

  const handleChange = (e) => setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const resetForm = () => {
    setShowForm(false);
    setEditId(null);
    setFormData(emptyForm());
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.address) {
      alert("Name and Address are required");
      return;
    }
    try {
      if (editId) {
        await axios.put(`${API_URL}/${editId}`, formData);
        alert("Location updated successfully");
      } else {
        await axios.post(API_URL, formData);
        alert("Location added successfully");
      }
      resetForm();
      fetchLocations();
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.error || "Error saving location");
    }
  };

  const handleEdit = (loc) => {
    setFormData({ name: loc.name || "", address: loc.address || "", abbr: loc.abbr || "" });
    setEditId(getId(loc));
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this location?")) return;
    try {
      await axios.delete(`${API_URL}/${id}`);
      fetchLocations();
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.error || "Error deleting location");
    }
  };

  return (
    <div style={{ fontFamily: "Segoe UI, Arial, sans-serif", padding: "8px" }}>
      {showForm ? (
        <div style={card}>
          <div style={headerRow}>
            <h2 style={titleStyle}>{editId ? "Edit Location" : "Add Location"}</h2>
            <button type="button" onClick={resetForm} style={btnPrimary}>Back To Location List</button>
          </div>
          <form onSubmit={handleSubmit}>
            <div style={formGrid}>
              <Field label="Location Name">
                <input name="name" value={formData.name} onChange={handleChange} placeholder="Location Name *" style={inp} />
              </Field>
              <Field label="Location Abbreviation">
                <input name="abbr" value={formData.abbr} onChange={handleChange} placeholder="e.g., S.L, NA, TA (used for employee ID format)" style={inp} />
              </Field>
              <Field label="Address">
                <input name="address" value={formData.address} onChange={handleChange} placeholder="Address *" style={inp} />
              </Field>
            </div>
            <div style={actionRow}>
              <button type="submit" style={btnPrimary}>Save</button>
              <button type="button" onClick={resetForm} style={btnPrimary}>Back To Location List</button>
            </div>
          </form>
        </div>
      ) : (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", gap: 10, flexWrap: "wrap" }}>
            <h2 style={titleStyle}>Location Management</h2>
            <button type="button" onClick={() => setShowForm(true)} style={{ ...btnPrimary, background: "#0f766e" }}>Add Location</button>
          </div>
          <div style={tableCard}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr style={{ background: "#0f766e", color: "#fff" }}>
                  <th style={th}>ID</th>
                  <th style={th}>Name</th>
                  <th style={th}>Abbreviation</th>
                  <th style={th}>Address</th>
                  <th style={th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {locations.map((loc, i) => (
                  <tr key={getId(loc)} style={{ background: i % 2 ? "#f8fafc" : "#fff" }}>
                    <td style={td}>{i + 1}</td>
                    <td style={td}>{loc.name || "-"}</td>
                    <td style={td}><strong>{loc.abbr || "-"}</strong></td>
                    <td style={td}>{loc.address || "-"}</td>
                    <td style={td}>
                      <button type="button" onClick={() => handleEdit(loc)} style={{ ...mini, background: "#2563eb" }}>Edit</button>{" "}
                      <button type="button" onClick={() => handleDelete(getId(loc))} style={{ ...mini, background: "#dc2626" }}>Delete</button>
                    </td>
                  </tr>
                ))}
                {locations.length === 0 ? (
                  <tr><td colSpan={5} style={{ ...td, textAlign: "center", padding: "20px" }}>No locations found.</td></tr>
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
const card = { background: "#fff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "20px", maxWidth: "900px", margin: "0 auto", boxShadow: "0 4px 14px rgba(15,23,42,0.06)" };
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
