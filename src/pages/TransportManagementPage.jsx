import React, { useCallback, useEffect, useState } from "react";
import axios from "axios";

const emptyForm = () => ({
  name: "",
  address: "",
  pan_no: "",
  gst_no: "",
  aadhar_no: "",
  mobile: "",
});

export default function TransportManagementPage() {
  const API_BASE = "/api";

  const [rows, setRows] = useState([]);
  const [view, setView] = useState("list");
  const [editId, setEditId] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [linkStatus, setLinkStatus] = useState({ tone: "", text: "" });

  const fetchRows = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE}/transporters`);
      setRows(res.data || []);
    } catch (err) {
      console.error(err);
      alert("Transport list load failed");
    }
  }, []);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  const resetForm = () => {
    setFormData(emptyForm());
    setLinkStatus({ tone: "", text: "" });
    setEditId(null);
  };

  const goList = () => {
    setView("list");
    resetForm();
  };

  const goAdd = () => {
    resetForm();
    setView("form");
  };

  const handleEdit = (row) => {
    setEditId(row.id);
    setFormData({
      name: row.name || "",
      address: row.address || "",
      pan_no: row.pan_no || "",
      gst_no: row.gst_no || "",
      aadhar_no: row.aadhar_no || "",
      mobile: row.mobile || "",
    });
    setLinkStatus({ tone: "", text: "" });
    setView("form");
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      let nextValue = value;
      if (name === "pan_no" || name === "gst_no") nextValue = value.toUpperCase();
      if (name === "aadhar_no" || name === "mobile") nextValue = value.replace(/\D/g, "");
      return { ...prev, [name]: nextValue };
    });
    if (name === "pan_no" || name === "aadhar_no") {
      setLinkStatus({ tone: "", text: "" });
    }
  };

  const checkPanAadharLink = async () => {
    if (!formData.pan_no || !formData.aadhar_no) {
      setLinkStatus({ tone: "warn", text: "PAN No and Aadhar No দুটোই দিন" });
      return;
    }
    const pan = String(formData.pan_no || "").trim().toUpperCase();
    const aadhar = String(formData.aadhar_no || "").trim().replace(/\D/g, "");
    const panValid = /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan);
    const aadharValid = /^[0-9]{12}$/.test(aadhar);

    try {
      const res = await axios.post(`${API_BASE}/transporters/verify-pan-aadhaar-link`, {
        pan_no: pan,
        aadhar_no: aadhar,
      });
      setLinkStatus({
        tone: res.data?.linked ? "ok" : "warn",
        text: res.data?.message || "Verification complete",
      });
    } catch (err) {
      console.error(err);
      if (panValid && aadharValid) {
        setLinkStatus({
          tone: "ok",
          text: "PAN and Aadhar format valid (server verify unavailable)",
        });
        return;
      }
      setLinkStatus({
        tone: "err",
        text: err?.response?.data?.error || "Verification failed, PAN/Aadhar format check করুন",
      });
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim()) return alert("Transport name required");

    try {
      if (editId) {
        await axios.put(`${API_BASE}/transporters/${editId}`, formData);
        alert("Transport updated successfully");
      } else {
        await axios.post(`${API_BASE}/transporters`, formData);
        alert("Transport saved successfully");
      }
      goList();
      fetchRows();
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.error || "Save failed");
    }
  };

  const card = { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 20, maxWidth: 1000, margin: "0 auto", boxShadow: "0 4px 14px rgba(15,23,42,0.06)" };
  const input = { width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 14, boxSizing: "border-box" };
  const btn = { border: "none", color: "#fff", padding: "10px 16px", borderRadius: 8, cursor: "pointer", fontWeight: 700 };

  if (view === "form") {
    return (
      <div style={{ fontFamily: "Segoe UI, Arial, sans-serif", padding: 8 }}>
        <div style={card}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
            <h2 style={{ margin: 0, flex: 1, color: "#0f172a", fontSize: 18 }}>
              {editId ? "Edit Transport Details" : "Add Transport Details"}
            </h2>
            <button type="button" onClick={goList} style={{ ...btn, background: "#2563eb" }}>
              Back To Transport List
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
            <div>
              <label style={lbl}>Transport Name</label>
              <input name="name" value={formData.name} onChange={handleChange} placeholder="Transport Name" style={input} />
            </div>
            <div>
              <label style={lbl}>Mobile</label>
              <input name="mobile" value={formData.mobile} onChange={handleChange} placeholder="Mobile" style={input} />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={lbl}>Address</label>
              <textarea name="address" value={formData.address} onChange={handleChange} rows={3} placeholder="Enter address" style={{ ...input, resize: "vertical", minHeight: 72 }} />
            </div>
            <div>
              <label style={lbl}>GST No.</label>
              <input name="gst_no" value={formData.gst_no} onChange={handleChange} placeholder="Enter GST No." style={input} />
            </div>
            <div>
              <label style={lbl}>PAN No.</label>
              <input name="pan_no" value={formData.pan_no} onChange={handleChange} placeholder="Enter PAN No." style={input} />
            </div>
            <div>
              <label style={lbl}>Aadhar Card No.</label>
              <input name="aadhar_no" value={formData.aadhar_no} onChange={handleChange} placeholder="Enter Aadhar No." style={input} />
            </div>
          </div>

          <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <button type="button" onClick={checkPanAadharLink} style={{ ...btn, background: "#0f766e" }}>
              Check PAN-Aadhar Link
            </button>
            {linkStatus.text ? (
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color:
                    linkStatus.tone === "ok"
                      ? "#0f766e"
                      : linkStatus.tone === "warn"
                      ? "#b45309"
                      : "#b91c1c",
                }}
              >
                {linkStatus.text}
              </span>
            ) : null}
          </div>

          <div style={{ display: "flex", gap: 12, marginTop: 22, flexWrap: "wrap" }}>
            <button type="button" onClick={handleSave} style={{ ...btn, background: "#16a34a" }}>
              {editId ? "Update" : "Save"}
            </button>
            <button type="button" onClick={goList} style={{ ...btn, background: "#64748b" }}>
              Back To Transport List
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "Segoe UI, Arial, sans-serif", padding: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
        <h2 style={{ margin: 0, fontSize: 18, color: "#0f172a" }}>Transport names</h2>
        <button type="button" onClick={goAdd} style={{ ...btn, background: "#0f766e" }}>
          Add Transport
        </button>
      </div>

      <div style={{ overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: 10, background: "#fff" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "#0f766e", color: "#fff" }}>
              <th style={th}>ID</th>
              <th style={th}>Name</th>
              <th style={th}>Mobile</th>
              <th style={th}>GST No</th>
              <th style={th}>PAN No</th>
              <th style={th}>Aadhar No</th>
              <th style={th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={row.id} style={{ background: i % 2 ? "#f8fafc" : "#fff" }}>
                <td style={td}>{row.id}</td>
                <td style={td}>{row.name || "—"}</td>
                <td style={td}>{row.mobile || "—"}</td>
                <td style={td}>{row.gst_no || "—"}</td>
                <td style={td}>{row.pan_no || "—"}</td>
                <td style={td}>{row.aadhar_no || "—"}</td>
                <td style={td}>
                  <button
                    onClick={() => handleEdit(row)}
                    style={{ ...mini, background: "#2563eb" }}
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan="7" style={{ ...td, textAlign: "center", padding: "20px" }}>
                  No transport found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const lbl = { display: "block", marginBottom: 6, fontWeight: 600, fontSize: 13, color: "#334155" };
const th = { padding: "10px 8px", textAlign: "left", borderBottom: "1px solid #0d5c56" };
const td = { padding: "8px", borderBottom: "1px solid #e2e8f0" };
const mini = { border: "none", color: "#fff", padding: "5px 10px", borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontWeight: 600 };
