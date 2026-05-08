import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { formatDisplayDate } from "../utils/date";

export default function InwardReportPage() {
  const navigate = useNavigate();
  const API_BASE = "/api";

  const [records, setRecords] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [filters, setFilters] = useState({
    company_id: "",
    warehouse_id: "",
    from: new Date(new Date().setDate(new Date().getDate() - 30))
      .toISOString()
      .split("T")[0],
    to: new Date().toISOString().split("T")[0],
  });

  useEffect(() => {
    axios.get(`${API_BASE}/companies`).then((res) => setCompanies(res.data || []));
    axios.get(`${API_BASE}/warehouses`).then((res) => setWarehouses(res.data || []));
  }, []);

  const fetchReport = async () => {
    try {
      const res = await axios.get(`${API_BASE}/inward/report`, { params: filters });
      setRecords(res.data || []);
    } catch (err) {
      console.error("Report fetch failed:", err);
      setRecords([]);
    }
  };

  useEffect(() => {
    fetchReport();
  }, []);

  const handleFilterChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  const handleApplyFilters = () => {
    fetchReport();
  };

  const exportCSV = () => {
    let csv = "Sl No,Voucher No,Date,Company,Warehouse,Employee,Product,Weight\n";

    records.forEach((r) => {
      csv += `${r.sl_no ?? ""},${r.voucher_no},${formatDisplayDate(r.date)},${r.company_name},${r.warehouse_name},${r.employee_name},${r.product_name},${r.weight}\n`;
    });

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "InwardReport.csv";
    a.click();
  };

  const printReport = () => {
    const content = document.getElementById("reportTableWrap").innerHTML;
    const printWindow = window.open("", "", "width=1200,height=800");
    printWindow.document.write(`
      <html>
        <head>
          <title>Inward Report</title>
          <style>
            body { font-family: Segoe UI, Arial, sans-serif; padding: 20px; }
            h2 { margin-bottom: 16px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { border: 1px solid #ccc; padding: 6px 8px; }
            th { background: #0f766e; color: #fff; }
            tfoot td { font-weight: bold; background: #ecfdf5; }
          </style>
        </head>
        <body>
          <h2>Inward Report</h2>
          ${content}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const totals = useMemo(
    () =>
      records.reduce(
        (acc, r) => {
          acc.weight += Number(r.weight) || 0;
          return acc;
        },
        { weight: 0 }
      ),
    [records]
  );

  const cardStyle = {
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: "16px",
    boxShadow: "0 10px 30px rgba(15, 23, 42, 0.08)",
  };

  const inputStyle = {
    padding: "10px 12px",
    borderRadius: "10px",
    border: "1px solid #cbd5e1",
    fontSize: "14px",
    minWidth: "180px",
    background: "#fff",
  };

  const btnStyle = {
    padding: "10px 16px",
    fontSize: "13px",
    borderRadius: "8px",
    border: "none",
    cursor: "pointer",
    fontWeight: 700,
    color: "#fff",
  };

  const thStyle = {
    padding: "11px 10px",
    border: "1px solid #dbe4ea",
    background: "#0f766e",
    color: "#fff",
    position: "sticky",
    top: 0,
    textAlign: "left",
    whiteSpace: "nowrap",
  };

  const tdStyle = {
    padding: "9px 10px",
    border: "1px solid #e2e8f0",
    background: "#fff",
    whiteSpace: "nowrap",
  };

  const tdRight = {
    ...tdStyle,
    textAlign: "right",
  };

  return (
    <div
      style={{
        padding: "20px",
        background: "#f8fafc",
        minHeight: "100vh",
        fontFamily: "Segoe UI, Arial, sans-serif",
      }}
    >
      <div
        style={{
          ...cardStyle,
          padding: "18px 20px",
          marginBottom: "16px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <h2 style={{ margin: 0, color: "#0f172a" }}>Inward Report</h2>
          <p style={{ margin: "6px 0 0", color: "#64748b", fontSize: "14px" }}>
            Date-wise inward report with company and warehouse filters
          </p>
        </div>
        <button
          onClick={() => navigate("/dashboard")}
          style={{
            padding: "8px 16px",
            background: "#6366f1",
            color: "#fff",
            border: "none",
            borderRadius: 4,
            fontSize: 14,
            cursor: "pointer",
            fontWeight: 600,
            whiteSpace: "nowrap",
          }}
        >
          ← Back
        </button>
      </div>

      <div
        style={{
          ...cardStyle,
          padding: "18px 20px",
          marginBottom: "16px",
        }}
      >
        <h3 style={{ marginTop: 0, color: "#0f172a" }}>Filters</h3>

        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <select
            name="company_id"
            value={filters.company_id}
            onChange={handleFilterChange}
            style={inputStyle}
          >
            <option value="">All Companies</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            name="warehouse_id"
            value={filters.warehouse_id}
            onChange={handleFilterChange}
            style={inputStyle}
          >
            <option value="">All Warehouses</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>

          <input
            type="date"
            name="from"
            value={filters.from}
            onChange={handleFilterChange}
            style={inputStyle}
          />

          <input
            type="date"
            name="to"
            value={filters.to}
            onChange={handleFilterChange}
            style={inputStyle}
          />

          <button
            onClick={handleApplyFilters}
            style={{ ...btnStyle, background: "#0f766e" }}
          >
            Apply
          </button>

          <button
            onClick={exportCSV}
            style={{ ...btnStyle, background: "#2563eb" }}
          >
            Export CSV
          </button>

          <button
            onClick={printReport}
            style={{ ...btnStyle, background: "#475569" }}
          >
            Print
          </button>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "16px",
          marginBottom: "16px",
        }}
      >
        <div style={{ ...cardStyle, padding: "16px" }}>
          <div style={{ color: "#64748b", fontSize: "13px" }}>Total Weight</div>
          <div style={{ fontSize: "24px", fontWeight: 700, color: "#0f172a", marginTop: "6px" }}>
            {totals.weight.toFixed(2)}
          </div>
        </div>
      </div>

      <div style={{ ...cardStyle, overflow: "hidden" }} id="reportTableWrap">
        <div style={{ overflowX: "auto", maxHeight: "70vh" }}>
          <table
            id="reportTable"
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "13px",
            }}
          >
            <thead>
              <tr>
                <th style={thStyle}>Sl No</th>
                <th style={thStyle}>Voucher No</th>
                <th style={thStyle}>Date</th>
                <th style={thStyle}>Company</th>
                <th style={thStyle}>Warehouse</th>
                <th style={thStyle}>Employee</th>
                <th style={thStyle}>Product</th>
                <th style={thStyle}>Weight</th>
              </tr>
            </thead>

            <tbody>
              {records.length > 0 ? (
                records.map((r, idx) => (
                  <tr
                    key={r.id}
                    style={{
                      background: idx % 2 === 0 ? "#ffffff" : "#f8fafc",
                    }}
                  >
                    <td style={tdStyle}>{r.sl_no ?? "—"}</td>
                    <td style={tdStyle}>{r.voucher_no}</td>
                    <td style={tdStyle}>{formatDisplayDate(r.date)}</td>
                    <td style={tdStyle}>{r.company_name}</td>
                    <td style={tdStyle}>{r.warehouse_name}</td>
                    <td style={tdStyle}>{r.employee_name}</td>
                    <td style={tdStyle}>{r.product_name}</td>
                    <td style={tdRight}>{Number(r.weight || 0).toFixed(2)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" style={{ ...tdStyle, textAlign: "center", color: "#64748b" }}>
                    No records found
                  </td>
                </tr>
              )}
            </tbody>

            {records.length > 0 && (
              <tfoot>
                <tr style={{ background: "#ecfdf5", fontWeight: "bold" }}>
                  <td colSpan="7" style={{ ...tdStyle, textAlign: "right" }}>
                    Totals:
                  </td>
                  <td style={tdRight}>{totals.weight.toFixed(2)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
