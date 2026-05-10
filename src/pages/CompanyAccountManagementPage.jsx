import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { loadSession } from "../utils/auth";
const emptyForm = () => ({
  account_name: "",
  address: "",
  company_id: "",
  pan_no: "",
  mobile: "",
});

export default function CompanyAccountsPage() {
  const [accounts, setAccounts] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [view, setView] = useState("list");
  const [formData, setFormData] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [importing, setImporting] = useState(false);

  const API_URL = "/api/company-accounts";
  const { user } = loadSession();
  const isAdmin = user?.role === "admin";
  const COMP_API = "/api/companies";

  const fetchAccounts = useCallback(async () => {
    try {
      const res = await axios.get(API_URL);
      setAccounts(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
      alert("Failed to fetch accounts");
    }
  }, []);

  const fetchCompanies = useCallback(async () => {
    try {
      const res = await axios.get(COMP_API);
      setCompanies(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
      alert("Failed to fetch companies");
    }
  }, []);

  useEffect(() => {
    fetchAccounts();
    fetchCompanies();
  }, [fetchAccounts, fetchCompanies]);

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const goList = () => {
    setView("list");
    setEditId(null);
    setFormData(emptyForm());
  };

  const goAdd = () => {
    setEditId(null);
    setFormData(emptyForm());
    setView("form");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.account_name || !formData.company_id || !formData.pan_no || !formData.mobile) {
      alert("Account Name, Company, PAN & Mobile are required");
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
      goList();
      fetchAccounts();
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.error || "Error saving account");
    }
  };

  const handleEdit = (acc) => {
    setFormData({
      account_name: acc.account_name || "",
      address: acc.address || "",
      company_id: acc.company_id ? String(acc.company_id) : "",
      pan_no: acc.pan_no || "",
      mobile: acc.mobile || "",
    });
    setEditId(acc._id);
    setView("form");
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this account?")) return;
    try {
      await axios.delete(`${API_URL}/${id}`);
      fetchAccounts();
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.error || "Error deleting account");
    }
  };

  const downloadImportFormat = () => {
    const header = "company_name,account_name,address,pan_no,mobile";
    const sample = "ABC COMPANY,Main A/C,Head Office Address,ABCDE1234F,9876543210";
    const csv = `${header}\n${sample}\n`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "company_accounts_import_format.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  const parseCsvLine = (line) => {
    const out = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i += 1) {
      const ch = line[i];
      if (ch === "\"") {
        if (inQuotes && line[i + 1] === "\"") {
          cur += "\"";
          i += 1;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === "," && !inQuotes) {
        out.push(cur.trim());
        cur = "";
      } else {
        cur += ch;
      }
    }
    out.push(cur.trim());
    return out;
  };

  const parseCsvText = (text) => {
    const lines = String(text || "")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    if (lines.length < 2) return [];

    const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase());
    return lines.slice(1).map((line) => {
      const values = parseCsvLine(line);
      const row = {};
      headers.forEach((h, idx) => {
        row[h] = values[idx] || "";
      });
      return {
        company_name: row.company_name || "",
        company_id: row.company_id || "",
        account_name: row.account_name || "",
        address: row.address || "",
        pan_no: row.pan_no || "",
        mobile: row.mobile || "",
      };
    });
  };

  const handleImportFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      setImporting(true);
      const fileName = String(file.name || "").toLowerCase();
      let res;
      if (fileName.endsWith(".xlsx")) {
        const uploadForm = new FormData();
        uploadForm.append("file", file);
        res = await axios.post(`${API_URL}/import-xlsx`, uploadForm, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } else {
        const text = await file.text();
        const rows = parseCsvText(text);
        if (rows.length === 0) {
          alert("No valid rows found. Please use the import format file.");
          return;
        }
        res = await axios.post(`${API_URL}/import`, { rows });
      }
      const data = res.data || {};
      alert(
        `Import complete.\nTotal: ${data.total || 0}\nInserted: ${data.inserted || 0}\nSkipped: ${data.skipped || 0}`
      );
      fetchAccounts();
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.error || "Import failed");
    } finally {
      setImporting(false);
    }
  };

  const btnPrimary = {
    background: "#2563eb",
    color: "#fff",
    border: "none",
    padding: "10px 18px",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: "14px",
  };

  const card = {
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: "12px",
    padding: "20px",
    maxWidth: "1000px",
    margin: "0 auto",
    boxShadow: "0 4px 14px rgba(15,23,42,0.06)",
  };

  if (view === "form") {
    return (
      <div style={{ fontFamily: "Segoe UI, Arial, sans-serif", padding: "8px" }}>
        <div style={card}>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
            <h2 style={{ margin: 0, flex: 1, color: "#0f172a", fontSize: "18px" }}>
              {editId ? "Edit Company Account" : "Add Company Account"}
            </h2>
            <button type="button" onClick={goList} style={btnPrimary}>
              Back To Account List
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "16px",
                alignItems: "start",
              }}
            >
              <Field label="Account Name">
                <input name="account_name" value={formData.account_name} onChange={handleChange} placeholder="Account Name *" style={inp} />
              </Field>
              <Field label="Company">
                <select name="company_id" value={formData.company_id} onChange={handleChange} style={inp}>
                  <option value="">Select Company *</option>
                  {companies.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="PAN No">
                <input name="pan_no" value={formData.pan_no} onChange={handleChange} placeholder="PAN No *" style={inp} />
              </Field>
              <Field label="Mobile">
                <input name="mobile" value={formData.mobile} onChange={handleChange} placeholder="Mobile No *" style={inp} />
              </Field>
              <Field label="Address">
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Address"
                  rows={3}
                  style={{ ...inp, resize: "vertical", minHeight: "72px" }}
                />
              </Field>
            </div>

            <div style={{ display: "flex", gap: "12px", marginTop: "22px", flexWrap: "wrap" }}>
              <button type="submit" style={btnPrimary}>
                Save
              </button>
              <button type="button" onClick={goList} style={btnPrimary}>
                Back To Account List
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "Segoe UI, Arial, sans-serif", padding: "8px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", flexWrap: "wrap", gap: "10px" }}>
        <h2 style={{ margin: 0, fontSize: "18px", color: "#0f172a" }}>Company Account Management</h2>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {isAdmin && (
            <>
              <button type="button" onClick={downloadImportFormat} style={{ ...btnPrimary, background: "#2563eb" }}>
                Download Import Format
              </button>
              <label
                style={{
                  ...btnPrimary,
                  background: importing ? "#94a3b8" : "#0f766e",
                  cursor: importing ? "not-allowed" : "pointer",
                }}
              >
                {importing ? "Importing..." : "Import CSV/XLSX"}
                <input
                  type="file"
                  accept=".csv,.xlsx"
                  onChange={handleImportFile}
                  disabled={importing}
                  style={{ display: "none" }}
                />
              </label>
            </>
          )}
          <button type="button" onClick={goAdd} style={{ ...btnPrimary, background: "#0f766e" }}>
            Add New Account
          </button>
        </div>
      </div>

      <div style={{ overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: "10px", background: "#fff" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
          <thead>
            <tr style={{ background: "#0f766e", color: "#fff" }}>
              <th style={th}>ID</th>
              <th style={th}>Account Name</th>
              <th style={th}>Company</th>
              <th style={th}>PAN</th>
              <th style={th}>Mobile</th>
              <th style={th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((acc, i) => (
              <tr key={acc.id} style={{ background: i % 2 ? "#f8fafc" : "#fff" }}>
                <td style={td}>{acc.id}</td>
                <td style={td}>{acc.account_name || "-"}</td>
                <td style={td}>{acc.company_name || "-"}</td>
                <td style={td}>{acc.pan_no || "-"}</td>
                <td style={td}>{acc.mobile || "-"}</td>
                <td style={td}>
                  <button type="button" onClick={() => handleEdit(acc)} style={{ ...mini, background: "#2563eb" }}>
                    Edit
                  </button>{" "}
                  <button type="button" onClick={() => handleDelete(acc.id)} style={{ ...mini, background: "#dc2626" }}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {accounts.length === 0 && (
              <tr>
                <td colSpan={6} style={{ ...td, textAlign: "center", padding: "20px" }}>
                  No accounts found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label style={lbl}>{label}</label>
      {children}
    </div>
  );
}

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
  fontWeight: 600,
  fontSize: "13px",
  color: "#334155",
};

const th = { padding: "10px 8px", textAlign: "left", borderBottom: "1px solid #0d5c56" };
const td = { padding: "8px", borderBottom: "1px solid #e2e8f0" };
const mini = {
  border: "none",
  color: "#fff",
  padding: "5px 10px",
  borderRadius: "6px",
  cursor: "pointer",
  fontSize: "12px",
  fontWeight: 600,
};

