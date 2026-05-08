import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { formatDisplayDate } from "../utils/date";
import PageBackCloseActions from "../components/PageBackCloseActions";

export default function PaltiLorryAdjustmentReportPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState({});
  const [companies, setCompanies] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(false);

  const [filters, setFilters] = useState({
    from_date: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split("T")[0],
    to_date: new Date().toISOString().split("T")[0],
    company_id: "",
    warehouse_id: "",
  });

  const card = {
    background: "#fff",
    border: "1px solid #d1d5db",
    borderRadius: 14,
    padding: 16,
    boxShadow: "0 6px 18px rgba(15, 23, 42, 0.06)",
  };

  const input = {
    padding: "10px 12px",
    border: "1px solid #cbd5e1",
    borderRadius: 8,
    minWidth: 150,
    fontSize: 14,
  };

  const th = {
    background: "#0f766e",
    color: "#fff",
    border: "1px solid #cbd5e1",
    padding: "8px 10px",
    textAlign: "left",
    whiteSpace: "nowrap",
    fontSize: 12,
  };

  const td = {
    border: "1px solid #e2e8f0",
    padding: "8px 10px",
    background: "#fff",
    whiteSpace: "nowrap",
    fontSize: 12,
    color: "#0f172a",
  };

  const num = (val) => Number(val || 0).toFixed(4);

  const fetchDropdowns = async () => {
    try {
      const [companyRes, warehouseRes] = await Promise.all([
        axios.get("/api/companies"),
        axios.get("/api/warehouses"),
      ]);
      setCompanies(companyRes.data || []);
      setWarehouses(warehouseRes.data || []);
    } catch (error) {
      console.error(error);
      setCompanies([]);
      setWarehouses([]);
    }
  };

  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await axios.get("/api/reports/palti-lorry-adjustment", { params: filters });
      setRows(res.data?.details || []);
      setSummary(res.data?.summary || {});
    } catch (error) {
      console.error(error);
      setRows([]);
      setSummary({});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDropdowns();
    fetchReport();
  }, []);

  const uniquePaltiCount = useMemo(() => {
    return new Set((rows || []).map((row) => row.palti_id)).size;
  }, [rows]);

  return (
    <div style={{ padding: 20, background: "#f8fafc", minHeight: "100vh", fontFamily: "Segoe UI, Arial, sans-serif" }}>
      <div style={{ ...card, marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h2 style={{ margin: 0, color: "#0f172a" }}>Palti Lorry Adjustment Report</h2>
          <p style={{ margin: "8px 0 0", color: "#475569" }}>
            Full details of Palti Lorry balance, adjustment rows, and outward mapping
          </p>
        </div>
        <PageBackCloseActions navigate={navigate} size="compact" />
      </div>

      <div style={{ ...card, marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <input
            type="date"
            value={filters.from_date}
            onChange={(e) => setFilters((prev) => ({ ...prev, from_date: e.target.value }))}
            style={input}
          />
          <input
            type="date"
            value={filters.to_date}
            onChange={(e) => setFilters((prev) => ({ ...prev, to_date: e.target.value }))}
            style={input}
          />
          <select
            value={filters.company_id}
            onChange={(e) => setFilters((prev) => ({ ...prev, company_id: e.target.value }))}
            style={input}
          >
            <option value="">All Companies</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
          </select>
          <select
            value={filters.warehouse_id}
            onChange={(e) => setFilters((prev) => ({ ...prev, warehouse_id: e.target.value }))}
            style={input}
          >
            <option value="">All Warehouses</option>
            {warehouses.map((warehouse) => (
              <option key={warehouse.id} value={warehouse.id}>
                {warehouse.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={fetchReport}
            style={{ ...input, background: "#0f766e", color: "#fff", border: "none", cursor: "pointer", fontWeight: 700 }}
          >
            Apply
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 16 }}>
        <div style={card}><div>Total Palti Entries</div><strong>{summary.total_palti_entries || uniquePaltiCount || 0}</strong></div>
        <div style={card}><div>Total Palti Balance</div><strong>{num(summary.total_palti_balance)}</strong></div>
        <div style={card}><div>Total Adjusted Qty</div><strong>{num(summary.total_adjusted_qty)}</strong></div>
        <div style={card}><div>Total Available Balance</div><strong>{num(summary.total_available_balance)}</strong></div>
        <div style={card}><div>Total Adjustment Rows</div><strong>{summary.total_adjustment_rows || 0}</strong></div>
        <div style={card}><div>Dispatched Adjusted Qty</div><strong>{num(summary.total_adjusted_dispatched)}</strong></div>
      </div>

      <div style={card}>
        <div style={{ overflowX: "auto", maxHeight: "70vh" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={th}>Palti Voucher</th>
                <th style={th}>Palti Date</th>
                <th style={th}>Warehouse</th>
                <th style={th}>Product</th>
                <th style={th}>Company</th>
                <th style={th}>Reg From</th>
                <th style={th}>Reject Lorry</th>
                <th style={th}>Palti Lorry</th>
                <th style={th}>New Weight</th>
                <th style={th}>Palti Balance</th>
                <th style={th}>Total Adjusted</th>
                <th style={th}>Available Balance</th>
                <th style={th}>Outward Voucher</th>
                <th style={th}>Outward Date</th>
                <th style={th}>Outward Party</th>
                <th style={th}>Outward Lorry</th>
                <th style={th}>Adjusted Qty</th>
                <th style={th}>Adjusted At</th>
              </tr>
            </thead>
            <tbody>
              {rows.length > 0 ? (
                rows.map((row, index) => (
                  <tr key={`${row.palti_id}-${row.adjustment_id || "none"}-${index}`}>
                    <td style={td}>{row.palti_voucher_no || "-"}</td>
                    <td style={td}>{formatDisplayDate(row.palti_date)}</td>
                    <td style={td}>{row.warehouse_name || "-"}</td>
                    <td style={td}>{row.product_name || "-"}</td>
                    <td style={td}>{row.company_name || "-"}</td>
                    <td style={td}>{row.reg_from_name || "-"}</td>
                    <td style={td}>{row.reg_lorry_no || "-"}</td>
                    <td style={td}>{row.display_lorry_no || "-"}</td>
                    <td style={td}>{num(row.new_weight)}</td>
                    <td style={td}>{num(row.palti_balance)}</td>
                    <td style={td}>{num(row.total_adjusted_qty)}</td>
                    <td style={td}>{num(row.available_balance)}</td>
                    <td style={td}>{row.outward_voucher_no || "-"}</td>
                    <td style={td}>{formatDisplayDate(row.outward_date)}</td>
                    <td style={td}>{row.outward_party_name || "-"}</td>
                    <td style={td}>{row.outward_lorry_no || "-"}</td>
                    <td style={td}>{num(row.adjusted_qty)}</td>
                    <td style={td}>{row.adjusted_at ? String(row.adjusted_at) : "-"}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td style={td} colSpan="18">
                    {loading ? "Loading..." : "No Palti Lorry adjustment records found"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
