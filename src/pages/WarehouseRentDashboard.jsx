import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useLocation } from "react-router-dom";
import { formatDisplayDate, formatDisplayMonthLabel } from "../utils/date";

export default function WarehouseRentDashboard() {
  const API_BASE = "/api";
  const location = useLocation();

  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [companies, setCompanies] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [companyId, setCompanyId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [summary, setSummary] = useState([]);
  const [details, setDetails] = useState([]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const queryMonth = params.get("month");
    const queryCompanyId = params.get("company_id");
    const queryWarehouseId = params.get("warehouse_id");

    if (queryMonth) setMonth(queryMonth);
    if (queryCompanyId) setCompanyId(queryCompanyId);
    if (queryWarehouseId) setWarehouseId(queryWarehouseId);
  }, [location.search]);

  const dashboardView = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get("dashboard_view") === "1";
  }, [location.search]);

  const activeCompanyName = useMemo(
    () => companies.find((item) => String(item.id) === String(companyId))?.name || "",
    [companies, companyId]
  );

  const activeWarehouseName = useMemo(
    () => warehouses.find((item) => String(item.id) === String(warehouseId))?.name || "",
    [warehouses, warehouseId]
  );

  const card = {
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: 16,
    padding: 16,
    boxShadow: "0 10px 30px rgba(15, 23, 42, 0.08)",
  };

  const input = {
    padding: "10px 12px",
    border: "1px solid #cbd5e1",
    borderRadius: 8,
    fontSize: 14,
    minWidth: 160,
  };

  const button = {
    padding: "10px 16px",
    border: "none",
    borderRadius: 8,
    fontWeight: 700,
    cursor: "pointer",
    color: "#fff",
  };

  const th = {
    background: "#0f766e",
    color: "#fff",
    padding: "10px 12px",
    border: "1px solid #dbe4ea",
    textAlign: "left",
    whiteSpace: "nowrap",
  };

  const td = {
    padding: "10px 12px",
    border: "1px solid #e2e8f0",
    background: "#fff",
    whiteSpace: "nowrap",
  };

  const num = (v) => Number(v || 0).toFixed(2);
  useEffect(() => {
    axios.get(`${API_BASE}/companies`).then((res) => setCompanies(res.data || []));
    axios.get(`${API_BASE}/warehouses`).then((res) => setWarehouses(res.data || []));
  }, []);

  const fetchReport = async () => {
    try {
      const res = await axios.get(`${API_BASE}/reports/warehouse-rent-month-end`, {
        params: {
          month,
          company_id: companyId,
          warehouse_id: warehouseId,
        },
      });
      setSummary(res.data.summary || []);
      setDetails(res.data.details || []);
    } catch (err) {
      console.error(err);
      setSummary([]);
      setDetails([]);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [month, companyId, warehouseId]);

  const totals = useMemo(
    () =>
      summary.reduce(
        (acc, row) => {
          acc.weight += Number(row.total_weight) || 0;
          acc.rent += Number(row.total_rent) || 0;
          return acc;
        },
        { weight: 0, rent: 0 }
      ),
    [summary]
  );

  return (
    <div style={{ padding: 20, background: "#f8fafc", minHeight: "100vh", fontFamily: "Segoe UI, Arial, sans-serif" }}>
      <div style={{ ...card, marginBottom: 16 }}>
        <h2 style={{ margin: 0, color: "#0f172a" }}>Warehouse Rent Month End Report</h2>
        <p style={{ margin: "6px 0 0", color: "#64748b" }}>
          Month end party-wise and warehouse-wise rent details
        </p>
        {dashboardView ? (
          <div style={{ marginTop: 12, color: "#0f766e", fontWeight: 700, fontSize: 14 }}>
            Focused detail view
            {activeWarehouseName ? ` | Warehouse: ${activeWarehouseName}` : ""}
            {activeCompanyName ? ` | Party: ${activeCompanyName}` : ""}
            {month ? ` | Month: ${formatDisplayMonthLabel(month)}` : ""}
          </div>
        ) : null}
      </div>

      <div style={{ ...card, marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} style={input} />

          <select value={companyId} onChange={(e) => setCompanyId(e.target.value)} style={input}>
            <option value="">All Parties</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <select value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} style={input}>
            <option value="">All Warehouses</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>

          <button onClick={fetchReport} style={{ ...button, background: "#0f766e" }}>
            Apply
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, marginBottom: 16 }}>
        <div style={card}><div>Total Weight</div><div style={{ fontSize: 24, fontWeight: 700 }}>{num(totals.weight)}</div></div>
        <div style={card}><div>Total Rent</div><div style={{ fontSize: 24, fontWeight: 700 }}>{num(totals.rent)}</div></div>
      </div>

      {!dashboardView ? (
        <div style={{ ...card, marginBottom: 16 }}>
          <h3 style={{ marginTop: 0 }}>Summary</h3>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={th}>Month</th>
                  <th style={th}>Party</th>
                  <th style={th}>Warehouse</th>
                  <th style={th}>Entries</th>
                  <th style={th}>Total Weight</th>
                  <th style={th}>Total Rent</th>
                </tr>
              </thead>
              <tbody>
                {summary.length > 0 ? (
                  summary.map((row, idx) => (
                    <tr key={idx}>
                      <td style={td}>{row.month_label || formatDisplayMonthLabel(row.month)}</td>
                      <td style={td}>{row.party_name}</td>
                      <td style={td}>{row.warehouse_name}</td>
                      <td style={td}>{row.total_entries}</td>
                      <td style={td}>{num(row.total_weight)}</td>
                      <td style={td}>{num(row.total_rent)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td style={td} colSpan="6">No summary data found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      <div style={{ ...card, overflow: "hidden" }}>
        <h3 style={{ marginTop: 0 }}>{dashboardView ? "Filtered Details" : "Full Details"}</h3>
        <div style={{ overflowX: "auto", maxHeight: "60vh" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr>
                <th style={th}>Month End</th>
                <th style={th}>Inward Date</th>
                <th style={th}>Party</th>
                <th style={th}>Warehouse</th>
                <th style={th}>Voucher</th>
                <th style={th}>Lorry</th>
                <th style={th}>Weight</th>
                <th style={th}>Balance Qty</th>
                <th style={th}>Days</th>
                <th style={th}>Month Slab</th>
                <th style={th}>Rent Rate</th>
                <th style={th}>Adjusted Rent</th>
                <th style={th}>Balance Rent</th>
                <th style={th}>Rent Amount</th>
              </tr>
            </thead>
            <tbody>
              {details.length > 0 ? (
                details.map((row) => (
                  <tr key={row.id}>
                    <td style={td}>{row.month_label || formatDisplayMonthLabel(row.month || row.month_end_date)}</td>
                    <td style={td}>{formatDisplayDate(row.inward_date)}</td>
                    <td style={td}>{row.party_name}</td>
                    <td style={td}>{row.warehouse_name}</td>
                    <td style={td}>{row.voucher_no}</td>
                    <td style={td}>{row.lorry_no}</td>
                    <td style={td}>{num(row.original_weight)}</td>
                    <td style={td}>{num(row.balance_qty)}</td>
                    <td style={td}>{row.days_diff}</td>
                    <td style={td}>{row.month_slab}</td>
                    <td style={td}>{num(row.rent_rate)}</td>
                    <td style={td}>{num(row.adjusted_rent_amount)}</td>
                    <td style={td}>{num(row.balance_rent_amount)}</td>
                    <td style={td}>{num(row.rent_amount)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td style={td} colSpan="14">No details found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
