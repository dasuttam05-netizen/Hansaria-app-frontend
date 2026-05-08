import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { formatDisplayDate } from "../utils/date";
import CashEntryForm from "../components/CashEntryForm";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:5000/api";

const card = {
  background: "#fff",
  borderRadius: 8,
  padding: 16,
  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
};

const th = {
  background: "#f8fafc",
  padding: "12px 8px",
  textAlign: "left",
  fontWeight: 600,
  fontSize: 13,
  color: "#374151",
  borderBottom: "1px solid #e5e7eb",
};

const td = {
  padding: "12px 8px",
  fontSize: 13,
  color: "#374151",
  borderBottom: "1px solid #f3f4f6",
};

const MainCashBookPage = () => {
  const navigate = useNavigate();
  const [entries, setEntries] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    warehouse_id: "",
    company_id: "",
    employee_id: "",
  });
  const [reportView, setReportView] = useState("active");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const emptyForm = () => ({
    entry_date: new Date().toISOString().split("T")[0],
    transaction_mode: "receipt",
    entry_type: "expense",
    warehouse_id: "",
    company_id: "",
    company_account_id: "",
    description: "",
    amount: "",
    payment_method: "Cash",
    fund_source: "main_cash",
    reference_no: "",
    narration: "",
    employee_id: "",
    journal_debit_employee_id: "",
    journal_credit_employee_id: "",
    status: "posted",
    auto_staff_entry: false,
  });

  const [formData, setFormData] = useState(emptyForm());
  const [agingRows, setAgingRows] = useState([]);
  const [adjustments, setAdjustments] = useState({});
  const [formLoading, setFormLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [entriesRes, warehousesRes, companiesRes, employeesRes] = await Promise.all([
        axios.get(`${API_BASE}/cash-entries`),
        axios.get(`${API_BASE}/warehouses`),
        axios.get(`${API_BASE}/companies`),
        axios.get(`${API_BASE}/employees`),
      ]);
      setEntries(entriesRes.data);
      setWarehouses(warehousesRes.data);
      setCompanies(companiesRes.data);
      setEmployees(employeesRes.data);
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const summary = useMemo(() => {
    const activeEntries = entries.filter((e) => e.status === "posted");
    const totalDr = activeEntries.reduce((sum, e) => sum + (e.drAmount || 0), 0);
    const totalCr = activeEntries.reduce((sum, e) => sum + (e.crAmount || 0), 0);
    return {
      totalDr,
      totalCr,
      balance: totalDr - totalCr,
    };
  }, [entries]);

  const filteredRows = useMemo(() => {
    let rows = entries.filter((e) => e.status === (reportView === "active" ? "posted" : "cancelled"));
    if (filters.warehouse_id) rows = rows.filter((e) => e.warehouse_id == filters.warehouse_id);
    if (filters.company_id) rows = rows.filter((e) => e.company_id == filters.company_id);
    if (filters.employee_id) rows = rows.filter((e) => e.employee_id == filters.employee_id);
    return rows.sort((a, b) => new Date(a.entry_date) - new Date(b.entry_date));
  }, [entries, filters, reportView]);

  const ledgerRows = useMemo(() => {
    let balance = 0;
    return filteredRows.map((entry) => {
      balance += (entry.drAmount || 0) - (entry.crAmount || 0);
      return { ...entry, balance };
    });
  }, [filteredRows]);

  const handleEdit = (entry) => {
    setEditingId(entry.id);
    setFormData({
      entry_date: entry.entry_date.split("T")[0],
      transaction_mode: entry.transaction_mode || "receipt",
      entry_type: entry.entry_type || "expense",
      warehouse_id: entry.warehouse_id ? String(entry.warehouse_id) : "",
      company_id: entry.company_id ? String(entry.company_id) : "",
      company_account_id: entry.company_account_id ? String(entry.company_account_id) : "",
      description: entry.description || "",
      amount: entry.amount || "",
      payment_method: entry.payment_method || "Cash",
      fund_source: entry.fund_source || "main_cash",
      reference_no: entry.reference_no || "",
      narration: entry.narration || "",
      employee_id: entry.employee_id ? String(entry.employee_id) : "",
      journal_debit_employee_id: entry.journal_debit_employee_id ? String(entry.journal_debit_employee_id) : "",
      journal_credit_employee_id: entry.journal_credit_employee_id ? String(entry.journal_credit_employee_id) : "",
      status: entry.status || "posted",
    });
    setShowForm(true);
    const existingAdjustments = Array.isArray(entry.adjustments)
      ? entry.adjustments.reduce((acc, item) => {
          const targetId = Number(item?.target_entry_id);
          const amount = Number(item?.adjusted_amount || 0);
          if (targetId > 0 && amount > 0) acc[targetId] = amount;
          return acc;
        }, {})
      : {};
    setAdjustments(existingAdjustments);
  };

  const handleFormChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData(emptyForm());
    setAgingRows([]);
    setAdjustments({});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      const adjustmentRows = Object.entries(adjustments)
        .map(([target_entry_id, value]) => ({
          target_entry_id: Number(target_entry_id),
          adjusted_amount: Number(value || 0),
        }))
        .filter((item) => item.adjusted_amount > 0);
      
      if (editingId) {
        // Update existing entry
        await axios.put(`${API_BASE}/cash-entries/${editingId}`, { ...formData, adjustments: adjustmentRows });
      } else {
        // Create new entry
        await axios.post(`${API_BASE}/cash-entries`, { ...formData, adjustments: adjustmentRows });
      }
      closeForm();
      fetchData();
    } catch (err) {
      alert(`Error ${editingId ? "updating" : "creating"} entry: ` + (err.response?.data?.error || err.message));
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (entry) => {
    const isActive = entry.status === "posted";
    const action = isActive ? "cancel" : "permanently delete";
    if (!window.confirm(`${isActive ? "Cancel" : "Permanently delete"} this cash book entry? ${!isActive ? "This action cannot be undone." : ""}`)) return;
    try {
      if (isActive) {
        await axios.patch(`${API_BASE}/cash-entries/${entry.id}`, { status: "cancelled" });
      } else {
        await axios.delete(`${API_BASE}/cash-entries/${entry.id}`);
      }
      fetchData();
    } catch (err) {
      alert(`Error ${action}ing entry: ` + (err.response?.data?.error || err.message));
    }
  };

  const handleCancelAllVisible = async () => {
    if (reportView === "cancelled") return;
    const ids = filteredRows.map((r) => r.id).filter(Boolean);
    if (!ids.length) {
      alert("No active entries to cancel.");
      return;
    }
    if (!window.confirm(`Cancel ${ids.length} visible entries?`)) return;
    try {
      await axios.patch(`${API_BASE}/cash-entries/bulk-cancel`, { ids });
      fetchData();
    } catch (err) {
      alert("Error cancelling entries: " + (err.response?.data?.error || err.message));
    }
  };

  const handleDeleteAllVisible = async () => {
    if (reportView === "active") return;
    const ids = filteredRows.map((r) => r.id).filter(Boolean);
    if (!ids.length) {
      alert("No cancelled entries to delete.");
      return;
    }
    if (!window.confirm(`Permanently delete ${ids.length} visible cancelled entries? This action cannot be undone.`)) return;
    try {
      for (const id of ids) {
        await axios.delete(`${API_BASE}/cash-entries/${id}`);
      }
      fetchData();
    } catch (err) {
      alert("Error deleting entries: " + (err.response?.data?.error || err.message));
    }
  };

  return (
    <div style={{ padding: 20, background: "#f8fafc", minHeight: "100vh", fontFamily: "Segoe UI, Arial, sans-serif" }}>
      <div style={{ ...card, marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div>
            <h2 style={{ margin: 0, color: "#0f172a" }}>Main Cash Book Report</h2>
            <p style={{ margin: "6px 0 0", color: "#64748b", fontSize: 13 }}>Posted cash income and expense entries in the main cash book</p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button style={{ padding: "8px 16px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 6, cursor: "default", fontSize: 13, fontWeight: 600 }}>Posted Entries</button>
            <button
              onClick={() => navigate("/dashboard")}
              style={{
                padding: "8px 16px",
                background: "#6366f1",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                fontSize: 13,
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              ← Back
            </button>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
          <button type="button" onClick={() => setReportView("active")} style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #cbd5e1", background: reportView === "active" ? "#dbeafe" : "#fff", cursor: "pointer", fontWeight: 600 }}>Active Entries</button>
          <button type="button" onClick={() => setReportView("cancelled")} style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #cbd5e1", background: reportView === "cancelled" ? "#fee2e2" : "#fff", cursor: "pointer", fontWeight: 600 }}>Cancelled Entries</button>
          {reportView === "active" ? (
            <button type="button" onClick={handleCancelAllVisible} style={{ marginLeft: "auto", padding: "6px 10px", borderRadius: 6, border: "none", background: "#b91c1c", color: "#fff", cursor: "pointer", fontWeight: 700 }}>Cancel All Visible</button>
          ) : (
            <button type="button" onClick={handleDeleteAllVisible} style={{ marginLeft: "auto", padding: "6px 10px", borderRadius: 6, border: "none", background: "#dc2626", color: "#fff", cursor: "pointer", fontWeight: 700 }}>Delete All Visible</button>
          )}
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, marginBottom: 16 }}>
        <div style={{ ...card, background: "linear-gradient(135deg, #ecfeff, #dbeafe)" }}>
          <div style={{ color: "#0f766e", fontSize: 12, fontWeight: 700, textTransform: "uppercase" }}>Total Dr</div>
          <div style={{ color: "#0f172a", fontSize: 28, fontWeight: 800, marginTop: 8 }}>{summary.totalDr.toFixed(2)}</div>
        </div>
        <div style={{ ...card, background: "linear-gradient(135deg, #fff7ed, #fee2e2)" }}>
          <div style={{ color: "#b45309", fontSize: 12, fontWeight: 700, textTransform: "uppercase" }}>Total Cr</div>
          <div style={{ color: "#0f172a", fontSize: 28, fontWeight: 800, marginTop: 8 }}>{summary.totalCr.toFixed(2)}</div>
        </div>
        <div style={{ ...card, background: "linear-gradient(135deg, #ecfdf5, #dcfce7)" }}>
          <div style={{ color: "#15803d", fontSize: 12, fontWeight: 700, textTransform: "uppercase" }}>Closing Balance</div>
          <div style={{ color: "#0f172a", fontSize: 28, fontWeight: 800, marginTop: 8 }}>{summary.balance.toFixed(2)}</div>
        </div>
      </div>
      <div style={{ ...card, marginBottom: 12, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
        <select value={filters.warehouse_id} onChange={(e) => setFilters((prev) => ({ ...prev, warehouse_id: e.target.value }))} style={{ padding: "8px", border: "1px solid #cbd5e1", borderRadius: 6 }}>
          <option value="">All Warehouses</option>
          {warehouses.map((w) => (
            <option key={w.id} value={w.id}>{w.name}</option>
          ))}
        </select>
        <select value={filters.company_id} onChange={(e) => setFilters((prev) => ({ ...prev, company_id: e.target.value }))} style={{ padding: "8px", border: "1px solid #cbd5e1", borderRadius: 6 }}>
          <option value="">All Parties</option>
          {companies.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select value={filters.employee_id} onChange={(e) => setFilters((prev) => ({ ...prev, employee_id: e.target.value }))} style={{ padding: "8px", border: "1px solid #cbd5e1", borderRadius: 6 }}>
          <option value="">All Employees</option>
          {employees.map((emp) => (
            <option key={emp.id} value={emp.id}>{emp.name}</option>
          ))}
        </select>
      </div>
      <div style={card}>
        {loading ? (
          <p style={{ textAlign: "center", color: "#64748b" }}>Loading posted cash entries...</p>
        ) : filteredRows.length === 0 ? (
          <p style={{ textAlign: "center", color: "#64748b" }}>No entries posted in Cash Book yet</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={th}>Date</th>
                  <th style={th}>Voucher</th>
                  <th style={th}>Type</th>
                  <th style={th}>Warehouse</th>
                  <th style={th}>Party</th>
                  <th style={th}>Employee</th>
                  <th style={th}>Description</th>
                  <th style={th}>Reference No</th>
                  <th style={th}>Payment Method</th>
                  <th style={{ ...th, textAlign: "right" }}>Dr</th>
                  <th style={{ ...th, textAlign: "right" }}>Cr</th>
                  <th style={{ ...th, textAlign: "right" }}>Balance</th>
                  <th style={{ ...th, textAlign: "center" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {ledgerRows.map((entry) => (
                  <tr key={entry.id}>
                    <td style={td}>{formatDisplayDate(entry.entry_date)}</td>
                    <td style={td}>{entry.journal_group_no || entry.voucher_no || "-"}</td>
                    <td style={{ ...td, textTransform: "capitalize" }}>{entry.entry_type || "-"}</td>
                    <td style={td}>{entry.warehouse_name || "-"}</td>
                    <td style={td}>{entry.company_name || "-"}</td>
                    <td style={td}>{entry.employee_name || "-"}</td>
                    <td style={td}>{entry.description || "-"}</td>
                    <td style={td}>{entry.reference_no || "-"}</td>
                    <td style={td}>{entry.payment_method || "-"}</td>
                    <td style={{ ...td, textAlign: "right", fontWeight: 600 }}>{entry.drAmount ? `Rs. ${entry.drAmount.toFixed(2)}` : "-"}</td>
                    <td style={{ ...td, textAlign: "right", fontWeight: 600 }}>{entry.crAmount ? `Rs. ${entry.crAmount.toFixed(2)}` : "-"}</td>
                    <td style={{ ...td, textAlign: "right", fontWeight: 700, color: "#0f766e" }}>Rs. {entry.balance.toFixed(2)}</td>
                    <td style={{ ...td, textAlign: "center" }}>
                      <div style={{ display: "flex", justifyContent: "center", gap: 8, flexWrap: "wrap" }}>
                        <button type="button" onClick={() => handleEdit(entry)} style={{ background: "#2563eb", color: "#fff", border: "none", padding: "6px 10px", borderRadius: 4, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Edit</button>
                        <button type="button" onClick={() => handleDelete(entry)} style={{ background: "#dc2626", color: "#fff", border: "none", padding: "6px 10px", borderRadius: 4, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>{entry.status === "posted" ? "Cancel" : "Delete"}</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <CashEntryForm
        isOpen={showForm}
        onClose={closeForm}
        onSubmit={handleSubmit}
        formData={formData}
        onFormChange={handleFormChange}
        isEditMode={!!editingId}
        warehouses={warehouses}
        companies={companies}
        employees={employees}
        agingRows={agingRows}
        adjustments={adjustments}
        onAdjustmentChange={setAdjustments}
        loading={formLoading}
      />
    </div>
  );
};

export default MainCashBookPage;
