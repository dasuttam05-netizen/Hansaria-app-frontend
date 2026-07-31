import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import PageBackCloseActions from "../components/PageBackCloseActions";
import { formatDisplayDate } from "../utils/date";

export default function InwardReportPage() {
  const navigate = useNavigate();
  const API_BASE = "/api";

  const [records, setRecords] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [filters, setFilters] = useState({
    company_id: "",
    warehouse_id: "",
    from: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split("T")[0],
    to: new Date().toISOString().split("T")[0],
  });

  const cardStyle = {
    background: "linear-gradient(180deg, #ffffff 0%, #f8fffe 100%)",
    border: "1px solid #dbe7e4",
    borderRadius: 16,
    boxShadow: "0 12px 30px rgba(15, 118, 110, 0.08)",
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

  const tdRight = { ...tdStyle, textAlign: "right" };

  useEffect(() => {
    axios.get(`${API_BASE}/companies`).then((res) => setCompanies(res.data || [])).catch(() => setCompanies([]));
    axios.get(`${API_BASE}/warehouses`).then((res) => setWarehouses(res.data || [])).catch(() => setWarehouses([]));
  }, []);

  const fetchReport = async () => {
    try {
      const res = await axios.get(`${API_BASE}/reports/party-stock`, { params: {
        from_date: filters.from,
        to_date: filters.to,
        company_id: filters.company_id,
        warehouse_id: filters.warehouse_id,
      } });
      setRecords(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Report fetch failed:", err);
      setRecords([]);
    }
  };

  useEffect(() => {
    fetchReport();
  }, []);

  const totals = useMemo(
    () =>
      records.reduce(
        (acc, r) => {
          acc.weight += Number(r.gross_weight ?? r.weight ?? 0) || 0;
          return acc;
        },
        { weight: 0 }
      ),
    [records]
  );

  const filteredRecords = useMemo(() => {
    const s = searchText.trim().toLowerCase();
    if (!s) return records;
    return records.filter((r) =>
      [r.sl_no, r.voucher_no, r.inward_date || r.date, r.company_name, r.warehouse_name, r.employee_name, r.product_name, r.gross_weight ?? r.weight]
        .join(" ")
        .toLowerCase()
        .includes(s)
    );
  }, [records, searchText]);

  const exportCSV = () => {
    let csv = "Sl No,Voucher No,Date,Company,Warehouse,Employee,Product,Weight\n";
    filteredRecords.forEach((r) => {
      csv += `${r.sl_no ?? ""},${r.voucher_no ?? ""},${formatDisplayDate(r.inward_date || r.date)},${r.company_name ?? ""},${r.warehouse_name ?? ""},${r.employee_name ?? ""},${r.product_name ?? ""},${r.gross_weight ?? r.weight ?? ""}\n`;
    });
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "InwardReport.csv";
    a.click();
  };

  return (
    <div style={{ padding: 20, background: "#f8fafc", minHeight: "100vh", fontFamily: "Segoe UI, Arial, sans-serif" }}>
      <div style={{ ...cardStyle, padding: "18px 20px", marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, color: "#0f172a" }}>Inward Report</h2>
          <p style={{ margin: "6px 0 0", color: "#64748b", fontSize: 14 }}>Date-wise inward report with company and warehouse filters</p>
        </div>
        <PageBackCloseActions navigate={navigate} size="compact" />
      </div>

      <div style={{ ...cardStyle, padding: "18px 20px", marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "end" }}>
          <select name="company_id" value={filters.company_id} onChange={(e) => setFilters((p) => ({ ...p, company_id: e.target.value }))} style={inputStyle}>
            <option value="">All Companies</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <select name="warehouse_id" value={filters.warehouse_id} onChange={(e) => setFilters((p) => ({ ...p, warehouse_id: e.target.value }))} style={inputStyle}>
            <option value="">All Warehouses</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>

          <input type="date" name="from" value={filters.from} onChange={(e) => setFilters((p) => ({ ...p, from: e.target.value }))} style={inputStyle} />
          <input type="date" name="to" value={filters.to} onChange={(e) => setFilters((p) => ({ ...p, to: e.target.value }))} style={inputStyle} />

          <button onClick={fetchReport} style={{ ...btnStyle, background: "#0f766e" }}>Apply</button>
          <button onClick={exportCSV} style={{ ...btnStyle, background: "#2563eb" }}>Export CSV</button>
        </div>

        <div style={{ marginTop: 14 }}>
          <label style={{ display: "block", marginBottom: 6, fontWeight: 700, color: "#0f766e" }}>Search</label>
          <input
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Search voucher, company, warehouse, employee, product..."
            style={{ ...inputStyle, width: "100%" }}
          />
        </div>
      </div>

      <div style={{ ...cardStyle, padding: 16, marginBottom: 16 }}>
        <div style={{ color: "#64748b", fontSize: 13 }}>Total Weight</div>
        <div style={{ fontSize: 24, fontWeight: 700, color: "#0f172a", marginTop: 6 }}>{totals.weight.toFixed(2)}</div>
      </div>

      <div style={{ ...cardStyle, overflow: "hidden" }} id="reportTableWrap">
        <div style={{ overflowX: "auto", maxHeight: "70vh" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
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
              {filteredRecords.length > 0 ? (
                filteredRecords.map((r, idx) => (
                  <tr key={r.id || idx} style={{ background: idx % 2 === 0 ? "#ffffff" : "#f8fafc" }}>
                    <td style={tdStyle}>{r.sl_no ?? "—"}</td>
                    <td style={tdStyle}>{r.voucher_no}</td>
                    <td style={tdStyle}>{formatDisplayDate(r.inward_date || r.date)}</td>
                    <td style={tdStyle}>{r.company_name}</td>
                    <td style={tdStyle}>{r.warehouse_name}</td>
                    <td style={tdStyle}>{r.employee_name}</td>
                    <td style={tdStyle}>{r.product_name}</td>
                    <td style={tdRight}>{Number(r.gross_weight ?? r.weight ?? 0).toFixed(2)}</td>
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
            {filteredRecords.length > 0 && (
              <tfoot>
                <tr style={{ background: "#ecfdf5", fontWeight: 700 }}>
                  <td colSpan="7" style={{ ...tdStyle, textAlign: "right" }}>Totals:</td>
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
