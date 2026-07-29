import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useLocation, useNavigate } from "react-router-dom";
import MultiSelectDropdown from "../components/MultiSelectDropdown";
import ReportSectionToggles from "../components/ReportSectionToggles";
import { formatDisplayDate } from "../utils/date";

export default function PartyStockReportPage() {
  const API_BASE = "/api";
  const location = useLocation();
  const navigate = useNavigate();
  const [summary, setSummary] = useState([]);
  const [details, setDetails] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [locations, setLocations] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);
  const [visibleSections, setVisibleSections] = useState(["totals", "summary", "details"]);

  const [filters, setFilters] = useState({
    from_date: "",
    to_date: "",
    employee_id: "",
    company_id: "",
    location_ids: [],
    warehouse_ids: [],
    product_id: "",
  });

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const warehouseId = params.get("warehouse_id") || "";
    const locationId = params.get("location_id") || "";
    const locationIds = (params.get("location_ids") || "").split(",").map((item) => item.trim()).filter(Boolean);
    const warehouseIds = (params.get("warehouse_ids") || "").split(",").map((item) => item.trim()).filter(Boolean);
    const companyId = params.get("company_id") || "";
    const fromDate = params.get("from_date") || "";
    const toDate = params.get("to_date") || "";
    const employeeId = params.get("employee_id") || "";
    const productId = params.get("product_id") || "";

    setFilters((prev) => ({
      ...prev,
      location_ids: locationIds.length ? locationIds : locationId ? [locationId] : [],
      warehouse_ids: warehouseIds.length ? warehouseIds : warehouseId ? [warehouseId] : [],
      company_id: companyId,
      from_date: fromDate,
      to_date: toDate,
      employee_id: employeeId,
      product_id: productId,
    }));
  }, [location.search]);

  const dashboardView = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get("dashboard_view") === "1";
  }, [location.search]);

  const activeWarehouseName = useMemo(
    () =>
      warehouses
        .filter((item) => (filters.warehouse_ids || []).includes(String(item.id)))
        .map((item) => item.name)
        .join(", "),
    [warehouses, filters.warehouse_ids]
  );

  const activeCompanyName = useMemo(
    () => companies.find((item) => String(item.id) === String(filters.company_id))?.name || "",
    [companies, filters.company_id]
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

  const tdHover = {
    ...td,
    cursor: "pointer",
    transition: "background-color 0.2s ease",
  };

  const num = (v) => Number(v || 0).toFixed(2);

  useEffect(() => {
    axios.get(`${API_BASE}/employees`).then((res) => setEmployees(res.data || [])).catch(() => setEmployees([]));
    axios.get(`${API_BASE}/companies`).then((res) => setCompanies(res.data || [])).catch(() => setCompanies([]));
    axios.get(`${API_BASE}/locations`).then((res) => setLocations(res.data || [])).catch(() => setLocations([]));
    axios.get(`${API_BASE}/warehouses`).then((res) => setWarehouses(res.data || [])).catch(() => setWarehouses([]));
    axios.get(`${API_BASE}/products`).then((res) => setProducts(res.data || [])).catch(() => setProducts([]));
  }, []);

  useEffect(() => {
    fetchReport();
  }, [filters]);

  const fetchReport = async () => {
    try {
      const res = await axios.get(`${API_BASE}/reports/party-stock`, {
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
    const nextValue = Array.isArray(e.target.value) ? e.target.value.map(String) : e.target.value;
    setFilters((prev) => ({ ...prev, [e.target.name]: nextValue }));
  };

  const exportCSV = () => {
    let csv = "Party,Account,Lorry,Employee,Warehouse,Location,Product,Inward Date,Outward Date,Days,Gross Qty,Shortage,Net Opening,Already Adjusted,Available Balance\n";
    details.forEach((row) => {
      csv += `${row.company_name || ""},${row.account_name || ""},${row.lorry_no || ""},${row.employee_name || ""},${row.warehouse_name || ""},${row.location_name || ""},${row.product_name || ""},${formatDisplayDate(row.date) || ""},${formatDisplayDate(row.outward_date) || ""},${row.days_diff},${num(row.gross_qty)},${num(row.shortage_qty)},${num(row.net_opening_qty)},${num(row.already_adjusted_qty)},${num(row.available_balance_qty)}\n`;
    });
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "Party_Stock_Report.csv";
    a.click();
  };

  const totals = useMemo(
    () =>
      details.reduce(
        (acc, row) => {
          acc.gross += Number(row.gross_qty) || 0;
          acc.shortage += Number(row.shortage_qty) || 0;
          acc.net += Number(row.net_opening_qty) || 0;
          acc.adjusted += Number(row.already_adjusted_qty) || 0;
          acc.balance += Number(row.available_balance_qty) || 0;
          return acc;
        },
        { gross: 0, shortage: 0, net: 0, adjusted: 0, balance: 0 }
      ),
    [details]
  );

  const summaryTotals = useMemo(
    () =>
      summary.reduce(
        (acc, row) => {
          acc.gross += Number(row.gross_qty) || 0;
          acc.shortage += Number(row.shortage_qty) || 0;
          acc.net += Number(row.net_opening_qty) || 0;
          acc.adjusted += Number(row.already_adjusted_qty) || 0;
          acc.balance += Number(row.available_balance_qty) || 0;
          return acc;
        },
        { gross: 0, shortage: 0, net: 0, adjusted: 0, balance: 0 }
      ),
    [summary]
  );

  return (
    <div style={{ padding: 20, background: "#f8fafc", minHeight: "100vh", fontFamily: "Segoe UI, Arial, sans-serif" }}>
      <div style={{ ...card, marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h2 style={{ margin: 0, color: "#0f172a" }}>Party Wise Stock Report</h2>
          <p style={{ margin: "6px 0 0", color: "#64748b" }}>
            Detailed party (company) wise stock report with address, contact details, and stock calculations. Includes Gross Qty, Shortage, Net Opening, Already Adjusted, and Available Balance.
          </p>
          {dashboardView ? (
            <div style={{ marginTop: 12, color: "#0f766e", fontWeight: 700, fontSize: 14 }}>
              Focused detail view
              {activeWarehouseName ? ` | Warehouse: ${activeWarehouseName}` : ""}
              {activeCompanyName ? ` | Party: ${activeCompanyName}` : ""}
            </div>
          ) : null}
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

          <select name="employee_id" value={filters.employee_id} onChange={handleChange} style={input}>
            <option value="">All Employees</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>

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
        <div style={card}><div>Gross Qty</div><div style={{ fontSize: 24, fontWeight: 700 }}>{num(totals.gross)}</div></div>
        <div style={card}><div>Shortage</div><div style={{ fontSize: 24, fontWeight: 700 }}>{num(totals.shortage)}</div></div>
        <div style={card}><div>Net Opening</div><div style={{ fontSize: 24, fontWeight: 700 }}>{num(totals.net)}</div></div>
        <div style={card}><div>Already Adjusted</div><div style={{ fontSize: 24, fontWeight: 700 }}>{num(totals.adjusted)}</div></div>
        <div style={card}><div>Available Balance</div><div style={{ fontSize: 24, fontWeight: 700 }}>{num(totals.balance)}</div></div>
      </div>
      ) : null}

      {!dashboardView && visibleSections.includes("summary") ? (
        <div style={{ ...card, marginBottom: 16, overflowX: "auto" }}>
          <h3 style={{ margin: "0 0 12px", color: "#0f172a" }}>Summary by Party</h3>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr>
                <th style={th}>Party Name</th>
                <th style={th}>Address</th>
                <th style={th}>Warehouse Name</th>
                <th style={th}>Gross Qty</th>
                <th style={th}>Shortage</th>
                <th style={th}>Net Opening</th>
                <th style={th}>Already Adjusted</th>
                <th style={th}>Available Balance</th>
              </tr>
            </thead>
            <tbody>
              {summary.length > 0 ? (
                summary.map((row, index) => (
                  <tr key={`${row.party_name}-${row.warehouse_name}-${index}`} style={{ transition: "background-color 0.2s ease" }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#87ceeb'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fff'}>
                    <td style={td}>{row.party_name}</td>
                    <td style={td}>{row.company_address || "-"}</td>
                    <td style={td}>{row.warehouse_name || "-"}</td>
                    <td style={td}>{num(row.gross_qty)}</td>
                    <td style={td}>{num(row.shortage_qty)}</td>
                    <td style={td}>{num(row.net_opening_qty)}</td>
                    <td style={td}>{num(row.already_adjusted_qty)}</td>
                    <td style={td}>{num(row.available_balance_qty)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td style={td} colSpan="8">No summary records found</td>
                </tr>
              )}
              {summary.length > 0 && (
                <tr style={{ backgroundColor: "#87ceeb", fontWeight: 700 }}>
                  <td style={td} colSpan="3">Total Weight</td>
                  <td style={td}>{num(summaryTotals.gross)}</td>
                  <td style={td}>{num(summaryTotals.shortage)}</td>
                  <td style={td}>{num(summaryTotals.net)}</td>
                  <td style={td}>{num(summaryTotals.adjusted)}</td>
                  <td style={td}>{num(summaryTotals.balance)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : null}

      {visibleSections.includes("details") ? (
      <div style={{ ...card, overflow: "hidden" }}>
        <h3 style={{ marginTop: 0, marginBottom: 12, color: "#0f172a" }}>
          {dashboardView ? "Filtered Details" : "Full Details"}
        </h3>
        <div style={{ overflowX: "auto", maxHeight: "72vh" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr>
                <th style={th}>Party</th>
                <th style={th}>Account</th>
                <th style={th}>Lorry</th>
                <th style={th}>Employee</th>
                <th style={th}>Warehouse</th>
                <th style={th}>Location</th>
                <th style={th}>Product</th>
                <th style={th}>Inward Date</th>
                <th style={th}>Outward Date</th>
                <th style={th}>Days</th>
                <th style={th}>Gross Qty</th>
                <th style={th}>Shortage</th>
                <th style={th}>Net Opening</th>
                <th style={th}>Already Adjusted</th>
                <th style={th}>Available Balance</th>
              </tr>
            </thead>
            <tbody>
              {details.length > 0 ? (
                details.map((row) => (
                  <tr key={row.id} style={{ transition: "background-color 0.2s ease" }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#87ceeb'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fff'}>
                    <td style={td}>{row.company_name || row.account_name || "Unknown Party"}</td>
                    <td style={td}>{row.account_name || "-"}</td>
                    <td style={td}>{row.lorry_no}</td>
                    <td style={td}>{row.employee_name}</td>
                    <td style={td}>{row.warehouse_name || "-"}</td>
                    <td style={td}>{row.location_name}</td>
                    <td style={td}>{row.product_name}</td>
                    <td style={td}>{formatDisplayDate(row.date)}</td>
                    <td style={td}>{formatDisplayDate(row.outward_date) || "-"}</td>
                    <td style={td}>{row.days_diff}</td>
                    <td style={td}>{num(row.gross_qty)}</td>
                    <td style={td}>{num(row.shortage_qty)}</td>
                    <td style={td}>{num(row.net_opening_qty)}</td>
                    <td style={td}>{num(row.already_adjusted_qty)}</td>
                    <td style={td}>{num(row.available_balance_qty)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td style={td} colSpan="15">No records found</td>
                </tr>
              )}
            </tbody>
            {details.length > 0 && (
              <tfoot>
                <tr style={{ background: "#ecfdf5", fontWeight: 700 }}>
                  <td style={td} colSpan="10">Totals</td>
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
