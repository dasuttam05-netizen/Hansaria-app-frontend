import React, { useState, useEffect } from "react";
import axios from "axios";

export default function CompanyAccountManagementPage() {
  const [accounts, setAccounts] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    accountNumber: "",
    bankName: "",
  });
  const [editId, setEditId] = useState(null);

  const API_URL = "/api/company-accounts";

  // 🔹 Fetch Accounts
  const fetchAccounts = async () => {
    try {
      const res = await axios.get(API_URL);
      setAccounts(res.data);
    } catch (err) {
      console.error(err);
      alert("Failed to fetch accounts");
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  // 🔹 Handle Input Change
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // 🔹 Save Account
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.accountNumber || !formData.bankName) {
      alert("All fields are required");
      return;
    }

    try {
      if (editId) {
        await axios.put(`${API_URL}/${editId}`, formData);
        alert("Account updated successfully");
      } else {
        await axios.post(API_URL, formData);
        alert("Account added successfully");
      }
      setFormData({ name: "", accountNumber: "", bankName: "" });
      setEditId(null);
      setShowForm(false);
      fetchAccounts();
    } catch (err) {
      console.error(err);
      alert("Error saving account");
    }
  };

  // 🔹 Edit Account
  const handleEdit = (acc) => {
    setFormData({
      name: acc.name,
      accountNumber: acc.accountNumber,
      bankName: acc.bankName,
    });
    setEditId(acc.id);
    setShowForm(true);
  };

  // 🔹 Delete Account
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this account?")) return;
    try {
      await axios.delete(`${API_URL}/${id}`);
      fetchAccounts();
    } catch (err) {
      console.error(err);
      alert("Error deleting account");
    }
  };

  return (
    <div style={{ fontFamily: "Segoe UI, Arial, sans-serif" }}>
      <h2 style={{ fontSize: "20px", fontWeight: "bold", marginBottom: "12px" }}>
        Company Account Management
      </h2>

      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          style={{
            background: "#4caf50",
            color: "#fff",
            padding: "6px 14px",
            borderRadius: "6px",
            border: "none",
            cursor: "pointer",
            marginBottom: "12px",
            fontSize: "14px",
          }}
        >
          ➕ Add Account
        </button>
      )}

      {/* 🔹 Popup Form */}
      {showForm && (
        <>
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              backdropFilter: "blur(6px)",
              backgroundColor: "rgba(0,0,0,0.35)",
              zIndex: 999,
            }}
            onClick={() => setShowForm(false)}
          ></div>

          <div
            style={{
              position: "fixed",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              background: "#fff",
              padding: "18px",
              borderRadius: "14px",
              boxShadow: "0 8px 25px rgba(0,0,0,0.25)",
              width: "400px",
              maxWidth: "95%",
              zIndex: 1000,
              transition: "all 0.3s ease",
            }}
          >
            <h3
              style={{
                fontSize: "16px",
                marginBottom: "12px",
                fontWeight: "600",
                textAlign: "center",
              }}
            >
              {editId ? "✏️ Edit Account" : "➕ New Account"}
            </h3>

            <form onSubmit={handleSubmit}>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                  marginBottom: "14px",
                }}
              >
                <input
                  type="text"
                  name="name"
                  placeholder="Account Name"
                  value={formData.name}
                  onChange={handleChange}
                  style={{
                    padding: "7px 10px",
                    borderRadius: "8px",
                    border: "1px solid #bbb",
                    fontSize: "14px",
                  }}
                />
                <input
                  type="text"
                  name="accountNumber"
                  placeholder="Account Number"
                  value={formData.accountNumber}
                  onChange={handleChange}
                  style={{
                    padding: "7px 10px",
                    borderRadius: "8px",
                    border: "1px solid #bbb",
                    fontSize: "14px",
                  }}
                />
                <input
                  type="text"
                  name="bankName"
                  placeholder="Bank Name"
                  value={formData.bankName}
                  onChange={handleChange}
                  style={{
                    padding: "7px 10px",
                    borderRadius: "8px",
                    border: "1px solid #bbb",
                    fontSize: "14px",
                  }}
                />
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "10px",
                }}
              >
                <button
                  type="submit"
                  style={{
                    background: "#4caf50",
                    color: "#fff",
                    padding: "6px 14px",
                    borderRadius: "8px",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "14px",
                  }}
                >
                  ✅ Save
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setFormData({ name: "", accountNumber: "", bankName: "" });
                    setEditId(null);
                  }}
                  style={{
                    background: "#f44336",
                    color: "#fff",
                    padding: "6px 14px",
                    borderRadius: "8px",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "14px",
                  }}
                >
                  ❌ Cancel
                </button>
              </div>
            </form>
          </div>
        </>
      )}

      {/* 🔹 Accounts Table */}
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: "14px",
          marginTop: "15px",
        }}
      >
        <thead>
          <tr
            style={{ background: "#607d8b", color: "#fff", height: "32px" }}
          >
            <th style={{ padding: "6px", border: "1px solid #ccc" }}>ID</th>
            <th style={{ padding: "6px", border: "1px solid #ccc" }}>Name</th>
            <th style={{ padding: "6px", border: "1px solid #ccc" }}>Account Number</th>
            <th style={{ padding: "6px", border: "1px solid #ccc" }}>Bank Name</th>
            <th style={{ padding: "6px", border: "1px solid #ccc" }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {accounts.map((acc) => (
            <tr key={acc.id} style={{ textAlign: "center", height: "28px" }}>
              <td style={{ padding: "4px", border: "1px solid #ccc" }}>
                {acc.id}
              </td>
              <td style={{ padding: "4px", border: "1px solid #ccc" }}>
                {acc.name}
              </td>
              <td style={{ padding: "4px", border: "1px solid #ccc" }}>
                {acc.accountNumber}
              </td>
              <td style={{ padding: "4px", border: "1px solid #ccc" }}>
                {acc.bankName}
              </td>
              <td style={{ padding: "4px", border: "1px solid #ccc" }}>
                <button
                  onClick={() => handleEdit(acc)}
                  style={{
                    background: "#2196f3",
                    color: "#fff",
                    padding: "3px 8px",
                    borderRadius: "6px",
                    border: "none",
                    cursor: "pointer",
                    marginRight: "4px",
                    fontSize: "12px",
                  }}
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(acc.id)}
                  style={{
                    background: "#f44336",
                    color: "#fff",
                    padding: "3px 8px",
                    borderRadius: "6px",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "12px",
                  }}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
          {accounts.length === 0 && (
            <tr>
              <td colSpan="5" style={{ padding: "8px", textAlign: "center" }}>
                No accounts found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
