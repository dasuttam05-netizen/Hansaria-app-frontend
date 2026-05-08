import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import MultiSelectDropdown from "../components/MultiSelectDropdown";
import ReportSectionToggles from "../components/ReportSectionToggles";
import { formatDisplayDate } from "../utils/date";

export default function WarehouseRentLedgerPage() {
  const API_BASE = "/api";

  const [records, setRecords] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [locations, setLocations] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [visibleSections, setVisibleSections] = useState(["totals", "details"]);

  const [filters, setFilters] = useState({
    from_date: new Date(new Date().setDate(new Date().getDate() - 30))
      .toISOString()
      .split("T")[0],
    to_date: new Date().toISOString().split("T")[0],
    company_id: "",
    location_ids: [],
    warehouse_ids: [],
  });

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
    axios.get(`${API_BASE}/locations`).then((res) => setLocations(res.data || []));
    axios.get(`${API_BASE}/warehouses`).then((res) => setWarehouses(res.data || []));
    fetchReport();
  }, []);

  const fetchReport = async () => {
    try {
      const res = await axios.get(`${API_BASE}/reports/warehouse-rent-ledger`, {
        params: {
          ...filters,
          location_ids: (filters.location_ids || []).join(","),
          warehouse_ids: (filters.warehouse_ids || []).join(","),
        },
      });
      setRecords(res.data || []);
    } catch (err) {
      console.error(err);
      setRecords([]);
    }
  };

  const handleChange = (e) => {
    setFilters((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const exportCSV = () => {
    let csv =
      "Inward Date,Reference Date,Party,Warehouse,Voucher,Lorry,Weight,Days,Month Slab,Rent Rate,Rent Amount,Adjusted Qty,Balance Qty\n";
    records.forEach((r) => {
      csv += `${formatDisplayDate(r.inward_date)},${formatDisplayDate(r.reference_date)},${r.party_name},${r.warehouse_name},${r.voucher_no},${r.lorry_no},${r.original_weight},${r.days_diff},${r.month_slab},${r.rent_rate},${r.rent_amount},${r.adjusted_qty},${r.balance_qty}\n`;
    });
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "Warehouse_Rent_Ledger.csv";
    a.click();
  };

  const totals = useMemo(
    () =>
      records.reduce(
        (acc, r) => {
          acc.weight += Number(r.original_weight) || 0;
          acc.adjusted += Number(r.adjusted_qty) || 0;
          acc.balance += Number(r.balance_qty) || 0;
          acc.rent += Number(r.rent_amount) || 0;
          return acc;
        },
        { weight: 0, adjusted: 0, balance: 0, rent: 0 }
      ),
    [records]
  );

  return (
    <div style={{ padding: 20, background: "#f8fafc", minHeight: "100vh", fontFamily: "Segoe UI, Arial, sans-serif" }}>
      <div style={{ ...card, marginBottom: 16 }}>
        <h2 style={{ margin: 0, color: "#0f172a" }}>Warehouse Rent Ledger</h2>
        <p style={{ margin: "6px 0 0", color: "#64748b" }}>
          Party wise and warehouse wise detailed rent calculation
        </p>
      </div>

      <div style={{ ...card, marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <input type="date" name="from_date" value={filters.from_date} onChange={handleChange} style={input} />
          <input type="date" name="to_date" value={filters.to_date} onChange={handleChange} style={input} />

          <select name="company_id" value={filters.company_id} onChange={handleChange} style={input}>
            <option value="">All Parties</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <MultiSelectDropdown
            label="Locations"
            options={locations.map((item) => ({ value: String(item.id), label: item.name }))}
            value={filters.location_ids}
            onChange={(next) => handleChange({ target: { name: "location_ids", value: next } })}
            placeholder="All Locations"
          />

          <MultiSelectDropdown
            label="Warehouses"
            options={warehouses.map((item) => ({ value: String(item.id), label: item.name }))}
            value={filters.warehouse_ids}
            onChange={(next) => handleChange({ target: { name: "warehouse_ids", value: next } })}
            placeholder="All Warehouses"
          />

          <button onClick={fetchReport} style={{ ...button, background: "#0f766e" }}>
            Apply
          </button>

          <button onClick={exportCSV} style={{ ...button, background: "#2563eb" }}>
            Export CSV
          </button>
        </div>
        <div style={{ marginTop: 14 }}>
          <ReportSectionToggles
            title="Show Report Blocks"
            value={visibleSections}
            onChange={setVisibleSections}
            options={[
              { key: "totals", label: "Totals" },
              { key: "details", label: "Details" },
            ]}
          />
        </div>
      </div>

      {visibleSections.includes("totals") ? (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, marginBottom: 16 }}>
        <div style={card}><div>Total Weight</div><div style={{ fontSize: 24, fontWeight: 700 }}>{num(totals.weight)}</div></div>
        <div style={card}><div>Adjusted Qty</div><div style={{ fontSize: 24, fontWeight: 700 }}>{num(totals.adjusted)}</div></div>
        <div style={card}><div>Balance Qty</div><div style={{ fontSize: 24, fontWeight: 700 }}>{num(totals.balance)}</div></div>
        <div style={card}><div>Total Rent</div><div style={{ fontSize: 24, fontWeight: 700 }}>{num(totals.rent)}</div></div>
      </div>
      ) : null}

      {visibleSections.includes("details") ? (
      <div style={{ ...card, overflow: "hidden" }}>
        <div style={{ overflowX: "auto", maxHeight: "72vh" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr>
                <th style={th}>Inward Date</th>
                <th style={th}>Reference Date</th>
                <th style={th}>Party</th>
                <th style={th}>Warehouse</th>
                <th style={th}>Voucher</th>
                <th style={th}>Lorry</th>
                <th style={th}>Weight</th>
                <th style={th}>Days</th>
                <th style={th}>Month Slab</th>
                <th style={th}>Rent Rate</th>
                <th style={th}>Rent Amount</th>
                <th style={th}>Adjusted Qty</th>
                <th style={th}>Balance Qty</th>
              </tr>
            </thead>
            <tbody>
              {records.length > 0 ? (
                records.map((row) => (
                  <tr key={row.id}>
                    <td style={td}>{formatDisplayDate(row.inward_date)}</td>
                    <td style={td}>{formatDisplayDate(row.reference_date)}</td>
                    <td style={td}>{row.party_name}</td>
                    <td style={td}>{row.warehouse_name}</td>
                    <td style={td}>{row.voucher_no}</td>
                    <td style={td}>{row.lorry_no}</td>
                    <td style={td}>{num(row.original_weight)}</td>
                    <td style={td}>{row.days_diff}</td>
                    <td style={td}>{row.month_slab}</td>
                    <td style={td}>{num(row.rent_rate)}</td>
                    <td style={td}>{num(row.rent_amount)}</td>
                    <td style={td}>{num(row.adjusted_qty)}</td>
                    <td style={td}>{num(row.balance_qty)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td style={td} colSpan="13">No records found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      ) : null}
    </div>
  );
}
