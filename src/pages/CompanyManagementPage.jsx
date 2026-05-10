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
  const [formData, setFormData] = useState(emptyForm());
  const [editId, setEditId] = useState(null);

  const API_URL = "/api/companies";

  // ================= FETCH =================
  const fetchCompanies = async () => {
    try {
      const res = await axios.get(API_URL);

      if (Array.isArray(res.data)) {
        setCompanies(res.data);
      } else {
        setCompanies([]);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to fetch companies");
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  // ================= INPUT CHANGE =================
  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  // ================= RESET =================
  const resetForm = () => {
    setFormData(emptyForm());
    setEditId(null);
    setShowForm(false);
  };

  // ================= SUBMIT =================
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name || !formData.mobile) {
      alert("Company Name and Mobile No are required");
      return;
    }

    try {
      // ===== UPDATE =====
      if (editId) {
        await axios.put(`${API_URL}/${editId}`, {
          ...formData,
          opening_balance: Number(formData.opening_balance || 0),
        });

        alert("Company updated successfully");
      }

      // ===== ADD =====
      else {
        await axios.post(API_URL, {
          ...formData,
          opening_balance: Number(formData.opening_balance || 0),
        });

        alert("Company added successfully");
      }

      resetForm();
      fetchCompanies();
    } catch (err) {
      console.error(err);

      alert(err?.response?.data?.error || "Error saving company");
    }
  };

  // ================= EDIT =================
  const handleEdit = (comp) => {
    setFormData({
      name: comp.name || "",
      address: comp.address || "",
      mobile: comp.mobile || "",
      opening_balance: String(comp.opening_balance || 0),
      opening_balance_type: comp.opening_balance_type || "dr",
    });

    setEditId(comp._id || comp.id);

    setShowForm(true);
  };

  // ================= DELETE =================
  const handleDelete = async (id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this company?"
    );

    if (!confirmDelete) return;

    try {
      await axios.delete(`${API_URL}/${id}`);

      alert("Company deleted successfully");

      fetchCompanies();
    } catch (err) {
      console.error(err);

      alert(err?.response?.data?.error || "Error deleting company");
    }
  };

  return (
    <div
      style={{
        fontFamily: "Segoe UI, Arial, sans-serif",
        padding: "10px",
      }}
    >
      {/* ================= FORM ================= */}
      {showForm ? (
        <div style={card}>
          <div style={headerRow}>
            <h2 style={titleStyle}>
              {editId ? "Edit Company" : "Add Company"}
            </h2>

            <button
              type="button"
              onClick={resetForm}
              style={btnGray}
            >
              Back To List
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div style={formGrid}>
              {/* COMPANY NAME */}
              <Field label="Company Name">
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Company Name"
                  style={inp}
                />
              </Field>

              {/* MOBILE */}
              <Field label="Mobile">
                <input
                  type="text"
                  name="mobile"
                  value={formData.mobile}
                  onChange={handleChange}
                  placeholder="Mobile Number"
                  style={inp}
                />
              </Field>

              {/* OPENING BALANCE */}
              <Field label="Opening Balance">
                <input
                  type="number"
                  step="0.01"
                  name="opening_balance"
                  value={formData.opening_balance}
                  onChange={handleChange}
                  placeholder="0.00"
                  style={inp}
                />
              </Field>

              {/* BALANCE TYPE */}
              <Field label="Balance Type">
                <select
                  name="opening_balance_type"
                  value={formData.opening_balance_type}
                  onChange={handleChange}
                  style={inp}
                >
                  <option value="dr">DR</option>
                  <option value="cr">CR</option>
                </select>
              </Field>

              {/* ADDRESS */}
              <div style={{ gridColumn: "1 / -1" }}>
                <Field label="Address">
                  <textarea
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    rows={3}
                    style={{
                      ...inp,
                      resize: "vertical",
                      minHeight: "80px",
                    }}
                  />
                </Field>
              </div>
            </div>

            {/* BUTTONS */}
            <div style={actionRow}>
              <button type="submit" style={btnPrimary}>
                {editId ? "Update Company" : "Save Company"}
              </button>

              <button
                type="button"
                onClick={resetForm}
                style={btnGray}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      ) : (
        <>
          {/* ================= HEADER ================= */}
          <div style={topBar}>
            <h2 style={titleStyle}>Company Management</h2>

            <button
              type="button"
              onClick={() => {
                resetForm();
                setShowForm(true);
              }}
              style={{
                ...btnPrimary,
                background: "#0f766e",
              }}
            >
              Add Company
            </button>
          </div>

          {/* ================= TABLE ================= */}
          <div style={tableCard}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "13px",
              }}
            >
              <thead>
                <tr style={theadRow}>
                  <th style={th}>Company ID</th>
                  <th style={th}>Company Name</th>
                  <th style={th}>Address</th>
                  <th style={th}>Mobile</th>
                  <th style={th}>Opening Balance</th>
                  <th style={th}>Actions</th>
                </tr>
              </thead>

              <tbody>
                {companies.length > 0 ? (
                  companies.map((comp, index) => {
                    const mongoId = comp._id || comp.id;

                    return (
                      <tr
                        key={mongoId}
                        style={{
                          background:
                            index % 2 === 0
                              ? "#fff"
                              : "#f8fafc",
                        }}
                      >
                        {/* CUSTOM COMPANY ID */}
                        <td style={td}>
                          {comp.company_id || "-"}
                        </td>

                        <td style={td}>
                          {comp.name || "-"}
                        </td>

                        <td style={td}>
                          {comp.address || "-"}
                        </td>

                        <td style={td}>
                          {comp.mobile || "-"}
                        </td>

                        <td style={td}>
                          ₹
                          {Number(
                            comp.opening_balance || 0
                          ).toFixed(2)}{" "}
                          {String(
                            comp.opening_balance_type || "dr"
                          ).toUpperCase()}
                        </td>

                        <td style={td}>
                          <div
                            style={{
                              display: "flex",
                              gap: "6px",
                              flexWrap: "wrap",
                            }}
                          >
                            <button
                              type="button"
                              onClick={() =>
                                handleEdit(comp)
                              }
                              style={{
                                ...miniBtn,
                                background: "#2563eb",
                              }}
                            >
                              Edit
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                handleDelete(mongoId)
                              }
                              style={{
                                ...miniBtn,
                                background: "#dc2626",
                              }}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td
                      colSpan={6}
                      style={{
                        ...td,
                        textAlign: "center",
                        padding: "20px",
                      }}
                    >
                      No companies found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

// ================= FIELD =================
function Field({ label, children }) {
  return (
    <div>
      <label style={lbl}>{label}</label>
      {children}
    </div>
  );
}

// ================= STYLES =================
const titleStyle = {
  margin: 0,
  fontSize: "20px",
  color: "#0f172a",
  fontWeight: "700",
};

const card = {
  background: "#fff",
  border: "1px solid #e2e8f0",
  borderRadius: "14px",
  padding: "20px",
  maxWidth: "1000px",
  margin: "0 auto",
  boxShadow: "0 4px 14px rgba(15,23,42,0.06)",
};

const topBar = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "15px",
  gap: "10px",
  flexWrap: "wrap",
};

const headerRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "20px",
  gap: "10px",
  flexWrap: "wrap",
};

const formGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "16px",
};

const actionRow = {
  display: "flex",
  gap: "10px",
  marginTop: "20px",
  flexWrap: "wrap",
};

const tableCard = {
  overflowX: "auto",
  border: "1px solid #e2e8f0",
  borderRadius: "12px",
  background: "#fff",
};

const theadRow = {
  background: "#0f766e",
  color: "#fff",
};

const inp = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: "8px",
  border: "1px solid #cbd5e1",
  fontSize: "14px",
  boxSizing: "border-box",
};

const lbl = {
  display: "block",
  marginBottom: "6px",
  fontWeight: "600",
  fontSize: "13px",
  color: "#334155",
};

const btnPrimary = {
  background: "#2563eb",
  color: "#fff",
  border: "none",
  padding: "10px 18px",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: "600",
  fontSize: "14px",
};

const btnGray = {
  background: "#64748b",
  color: "#fff",
  border: "none",
  padding: "10px 18px",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: "600",
  fontSize: "14px",
};

const th = {
  padding: "12px 10px",
  textAlign: "left",
  borderBottom: "1px solid #0d5c56",
  whiteSpace: "nowrap",
};

const td = {
  padding: "10px",
  borderBottom: "1px solid #e2e8f0",
  verticalAlign: "top",
};

const miniBtn = {
  border: "none",
  color: "#fff",
  padding: "6px 10px",
  borderRadius: "6px",
  cursor: "pointer",
  fontSize: "12px",
  fontWeight: "600",
};
