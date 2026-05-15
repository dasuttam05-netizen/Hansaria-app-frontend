import React, { useEffect, useState } from "react";
import axios from "axios";

const emptyForm = () => ({
  name: "",
  mobile: "",
  email: "",
  address: "",
  village: "",
  state: "",
  gst_no: "",
  pan_no: "",
  location: "",
});

export default function FarmerManagementPage() {
  const [farmers, setFarmers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const API_URL = "/api/farmers";

  const fetchFarmers = async () => {
    try {
      const res = await axios.get(API_URL);
      setFarmers(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
      alert("Failed to fetch farmers");
    }
  };

  useEffect(() => {
    fetchFarmers();
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
      alert("Farmer Name and Mobile No. are required");
      return;
    }

    try {
      if (editId) {
        await axios.put(`${API_URL}/${editId}`, formData);
        alert("Farmer updated successfully");
      } else {
        await axios.post(API_URL, formData);
        alert("Farmer added successfully");
      }
      resetForm();
      fetchFarmers();
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.error || "Error saving farmer");
    }
  };

  const handleEdit = (farmer) => {
    setFormData({
      name: farmer.name || "",
      mobile: farmer.mobile || "",
      email: farmer.email || "",
      address: farmer.address || "",
      village: farmer.village || "",
      state: farmer.state || "",
      gst_no: farmer.gst_no || "",
      pan_no: farmer.pan_no || "",
      location: farmer.location || "",
    });
    setEditId(farmer._id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this farmer?")) return;
    try {
      await axios.delete(`${API_URL}/${id}`);
      fetchFarmers();
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.error || "Error deleting farmer");
    }
  };

  return (
    <div style={{ fontFamily: "Segoe UI, Arial, sans-serif", padding: "8px" }}>
      {showForm ? (
        <div style={card}>
          <div style={headerRow}>
            <h2 style={titleStyle}>{editId ? "Edit Farmer" : "Add Farmer"}</h2>
            <button type="button" onClick={resetForm} style={btnPrimary}>Back To Farmer List</button>
          </div>
          <form onSubmit={handleSubmit}>
            <div style={formGrid}>
              <Field label="Farmer Name">
                <input name="name" value={formData.name} onChange={handleChange} placeholder="Farmer Name *" style={inp} />
              </Field>
              <Field label="Mobile">
                <input name="mobile" value={formData.mobile} onChange={handleChange} placeholder="Mobile No. *" style={inp} />
              </Field>
              <Field label="Email">
                <input name="email" value={formData.email} onChange={handleChange} placeholder="Email" style={inp} />
              </Field>
              <Field label="Gst No">
                <input name="gst_no" value={formData.gst_no} onChange={handleChange} placeholder="GST No." style={inp} />
              </Field>
              <Field label="Pan No">
                <input name="pan_no" value={formData.pan_no} onChange={handleChange} placeholder="PAN No." style={inp} />
              </Field>
              <Field label="State">
                <input name="state" value={formData.state} onChange={handleChange} placeholder="State" style={inp} />
              </Field>
              <Field label="Location">
                <input name="location" value={formData.location} onChange={handleChange} placeholder="Location" style={inp} />
              </Field>
              <Field label="Village">
                <input name="village" value={formData.village} onChange={handleChange} placeholder="Village" style={inp} />
              </Field>
              <div style={{ gridColumn: "1 / -1" }}>
                <Field label="Address">
                  <textarea name="address" value={formData.address} onChange={handleChange} rows={3} style={{ ...inp, minHeight: 72, resize: "vertical" }} />
                </Field>
              </div>
            </div>
            <div style={actionRow}>
              <button type="submit" style={btnPrimary}>Save</button>
              <button type="button" onClick={resetForm} style={btnPrimary}>Back To Farmer List</button>
            </div>
          </form>
        </div>
      ) : (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", gap: 10, flexWrap: "wrap" }}>
            <h2 style={titleStyle}>Farmer Master</h2>
            <button type="button" onClick={() => setShowForm(true)} style={{ ...btnPrimary, background: "#0f766e" }}>Add Farmer</button>
          </div>
          <div style={tableCard}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr style={{ background: "#0f766e", color: "#fff" }}>
                  <th style={th}>ID</th>
                  <th style={th}>Farmer Name</th>
                  <th style={th}>Mobile</th>
                  <th style={th}>Location</th>
                  <th style={th}>Village</th>
                  <th style={th}>State</th>
                  <th style={th}>GST No.</th>
                  <th style={th}>PAN No.</th>
                  <th style={th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {farmers.map((farmer, i) => (
                  <tr key={farmer._id || i} style={{ background: i % 2 ? "#f8fafc" : "#fff" }}>
                    <td style={td}>{String(i + 1).padStart(2, "0")}</td>
                    <td style={td}>{farmer.name || "-"}</td>
                    <td style={td}>{farmer.mobile || "-"}</td>
                    <td style={td}>{farmer.location || "-"}</td>
                    <td style={td}>{farmer.village || "-"}</td>
                    <td style={td}>{farmer.state || "-"}</td>
                    <td style={td}>{farmer.gst_no || "-"}</td>
                    <td style={td}>{farmer.pan_no || "-"}</td>
                    <td style={td}>
                      <button type="button" onClick={() => handleEdit(farmer)} style={{ ...mini, background: "#2563eb" }}>Edit</button>{" "}
                      <button type="button" onClick={() => handleDelete(farmer._id)} style={{ ...mini, background: "#dc2626" }}>Delete</button>
                    </td>
                  </tr>
                ))}
                {farmers.length === 0 ? (
                  <tr><td colSpan={9} style={{ ...td, textAlign: "center", padding: "20px" }}>No farmers found.</td></tr>
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
