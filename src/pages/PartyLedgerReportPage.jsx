import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import MultiSelectDropdown from "../components/MultiSelectDropdown";
import ReportSectionToggles from "../components/ReportSectionToggles";
import { formatDisplayDate } from "../utils/date";

export default function PartyLedgerReportPage() {
  const navigate = useNavigate();
  const API_BASE = "/api";

  const [summary, setSummary] = useState([]);
  const [details, setDetails] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [locations, setLocations] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);
  const [visibleSections, setVisibleSections] = useState(["totals", "summary", "details"]);

  const [filters, setFilters] = useState({
    from_date: "",
    to_date: "",
    company_id: "",
    location_ids: [],
    warehouse_ids: [],
    product_id: "",
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
    axios.get(`${API_BASE}/companies`).then((res) => setCompanies(res.data || [])).catch(() => setCompanies([]));
    axios.get(`${API_BASE}/locations`).then((res) => setLocations(res.data || [])).catch(() => setLocations([]));
    axios.get(`${API_BASE}/warehouses`).then((res) => setWarehouses(res.data || [])).catch(() => setWarehouses([]));
    axios.get(`${API_BASE}/products`).then((res) => setProducts(res.data || [])).catch(() => setProducts([]));
    fetchReport();
  }, []);

  const fetchReport = async () => {
    try {
      const res = await axios.get(`${API_BASE}/reports/party-ledger`, {
        params: {
          ...filters,
          location_ids: (filters.location_ids || []).join(","),
          warehouse_ids: (filters.warehouse_ids || []).join(","),
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

  const handleChange = (e) => {
    setFilters((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const exportCSV = () => {
    let csv = "Date,Party,Address,Mobile,Account,Warehouse,Product,Voucher,Lorry,Gross,Shortage,Net,Adjusted,Balance\n";
    details.forEach((row) => {
      csv += `${formatDisplayDate(row.date) || ""},${row.party_name || ""},${row.company_address || ""},${row.company_mobile || ""},${row.account_name || ""},${row.warehouse_name || ""},${row.product_name || ""},${row.voucher_no || ""},${row.lorry_no || ""},${num(row.gross_weight)},${num(row.shortage_qty)},${num(row.net_qty)},${num(row.adjusted_qty)},${num(row.balance_qty)}\n`;
    });
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "Party_Ledger_Report.csv";
    a.click();
  };

  const totals = useMemo(
    () =>
      details.reduce(
        (acc, r) => {
          acc.gross += Number(r.gross_weight) || 0;
          acc.shortage += Number(r.shortage_qty) || 0;
          acc.net += Number(r.net_qty) || 0;
          acc.adjusted += Number(r.adjusted_qty) || 0;
          acc.balance += Number(r.balance_qty) || 0;
          return acc;
        },
        { gross: 0, shortage: 0, net: 0, adjusted: 0, balance: 0 }
      ),
    [details]
  );

  return (
    <div style={{ padding: 20, background: "#f8fafc", minHeight: "100vh", fontFamily: "Segoe UI, Arial, sans-serif" }}>
      <div style={{ ...card, marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h2 style={{ margin: 0, color: "#0f172a" }}>Party Wise Inward Adjustment Ledger</h2>
          <p style={{ margin: "6px 0 0", color: "#64748b" }}>
            Detailed party (company) wise inward adjustment ledger with address, contact details, and stock adjustments. Includes Gross, Shortage, Net, Adjusted, and Balance.
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

          <select name="product_id" value={filters.product_id} onChange={handleChange} style={input}>
            <option value="">All Products</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

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
              { key: "summary", label: "Summary" },
              { key: "details", label: "Details" },
            ]}
          />
        </div>
      </div>

      {visibleSections.includes("totals") ? (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, marginBottom: 16 }}>
        <div style={card}><div>Gross</div><div style={{ fontSize: 24, fontWeight: 700 }}>{num(totals.gross)}</div></div>
        <div style={card}><div>Shortage</div><div style={{ fontSize: 24, fontWeight: 700 }}>{num(totals.shortage)}</div></div>
        <div style={card}><div>Net</div><div style={{ fontSize: 24, fontWeight: 700 }}>{num(totals.net)}</div></div>
        <div style={card}><div>Adjusted</div><div style={{ fontSize: 24, fontWeight: 700 }}>{num(totals.adjusted)}</div></div>
        <div style={card}><div>Balance</div><div style={{ fontSize: 24, fontWeight: 700 }}>{num(totals.balance)}</div></div>
      </div>
      ) : null}

      {visibleSections.includes("summary") ? (
      <div style={{ ...card, marginBottom: 16, overflowX: "auto" }}>
        <h3 style={{ margin: "0 0 12px", color: "#0f172a" }}>Summary by Party</h3>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr>
              <th style={th}>Party Name</th>
              <th style={th}>Address</th>
              <th style={th}>Mobile</th>
              <th style={th}>Gross</th>
              <th style={th}>Shortage</th>
              <th style={th}>Net</th>
              <th style={th}>Adjusted</th>
              <th style={th}>Balance</th>
            </tr>
          </thead>
          <tbody>
            {summary.length > 0 ? (
              summary.map((row, index) => (
                <tr key={`${row.party_name}-${index}`}>
                  <td style={td}>{row.party_name}</td>
                  <td style={td}>{row.company_address || "-"}</td>
                  <td style={td}>{row.company_mobile || "-"}</td>
                  <td style={td}>{num(row.gross_weight)}</td>
                  <td style={td}>{num(row.shortage_qty)}</td>
                  <td style={td}>{num(row.net_qty)}</td>
                  <td style={td}>{num(row.adjusted_qty)}</td>
                  <td style={td}>{num(row.balance_qty)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td style={td} colSpan="8">No summary records found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      ) : null}

      {visibleSections.includes("details") ? (
      <div style={{ ...card, overflow: "hidden" }}>
        <div style={{ overflowX: "auto", maxHeight: "72vh" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr>
                <th style={th}>Date</th>
                <th style={th}>Party</th>
                <th style={th}>Address</th>
                <th style={th}>Mobile</th>
                <th style={th}>Account</th>
                <th style={th}>Warehouse</th>
                <th style={th}>Product</th>
                <th style={th}>Voucher</th>
                <th style={th}>Lorry</th>
                <th style={th}>Gross</th>
                <th style={th}>Shortage</th>
                <th style={th}>Net</th>
                <th style={th}>Adjusted</th>
                <th style={th}>Balance</th>
              </tr>
            </thead>
            <tbody>
              {details.length > 0 ? (
                details.map((row) => (
                  <tr key={row.id}>
                    <td style={td}>{formatDisplayDate(row.date)}</td>
                    <td style={td}>{row.party_name}</td>
                    <td style={td}>{row.company_address || "-"}</td>
                    <td style={td}>{row.company_mobile || "-"}</td>
                    <td style={td}>{row.account_name || "-"}</td>
                    <td style={td}>{row.warehouse_name}</td>
                    <td style={td}>{row.product_name}</td>
                    <td style={td}>{row.voucher_no}</td>
                    <td style={td}>{row.lorry_no}</td>
                    <td style={td}>{num(row.gross_weight)}</td>
                    <td style={td}>{num(row.shortage_qty)}</td>
                    <td style={td}>{num(row.net_qty)}</td>
                    <td style={td}>{num(row.adjusted_qty)}</td>
                    <td style={td}>{num(row.balance_qty)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td style={td} colSpan="14">No records found</td>
                </tr>
              )}
            </tbody>
            {details.length > 0 && (
              <tfoot>
                <tr style={{ background: "#ecfdf5", fontWeight: 700 }}>
                  <td style={td} colSpan="9">Totals</td>
                  <td style={td}>{num(totals.gross)}</td>
                  <td style={td}>{num(totals.shortage)}</td>
                  <td style={td}>{num(totals.net)}</td>
                  <td style={td}>{num(totals.adjusted)}</td>
                  <td style={td}>{num(totals.balance)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
      ) : null}
    </div>
  );
}
