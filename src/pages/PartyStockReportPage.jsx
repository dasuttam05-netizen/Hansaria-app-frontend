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
  const [journalRows, setJournalRows] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [locations, setLocations] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);
  const [visibleSections, setVisibleSections] = useState(["totals", "summary", "details", "journal"]);
  const [filtersReady, setFiltersReady] = useState(false);

  const [filters, setFilters] = useState({
    from_date: "",
    to_date: "",
    employee_id: "",
    company_id: "",
    account_id: "",
    location_ids: [],
    warehouse_ids: [],
    product_id: "",
  });

  const normalizeIdList = (input) => {
    if (Array.isArray(input)) {
      return input
        .flatMap((item) => String(item || "").split(","))
        .map((item) => item.trim())
        .filter(Boolean);
    }
    if (input === null || input === undefined || input === "") {
      return [];
    }
    const text = String(input).trim();
    if (!text) return [];
    return text
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  };

  const parseQueryIdValues = (params, key) => {
    const values = params.getAll(key);
    return normalizeIdList(values.length ? values : params.get(key));
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const warehouseId = params.get("warehouse_id") || "";
    const locationId = params.get("location_id") || "";
    const locationIds = parseQueryIdValues(params, "location_ids");
    const warehouseIds = parseQueryIdValues(params, "warehouse_ids");
    const companyId = params.get("company_id") || "";
    const fromDate = params.get("from_date") || "";
    const toDate = params.get("to_date") || "";
    const employeeId = params.get("employee_id") || "";
    const productId = params.get("product_id") || "";
    const accountId = params.get("account_id") || "";

    setFilters((prev) => ({
      ...prev,
      location_ids: locationIds.length ? locationIds : locationId ? [locationId] : [],
      warehouse_ids: warehouseIds.length ? warehouseIds : warehouseId ? [warehouseId] : [],
      company_id: companyId,
      account_id: accountId,
      from_date: fromDate,
      to_date: toDate,
      employee_id: employeeId,
      product_id: productId,
    }));
    setFiltersReady(true);
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

  const normalizePartyStockRow = (row) => ({
    ...row,
    company_name: row.company_name || row.party_name || row.company_name || row.account_name || "",
    account_name: row.account_name || "",
    company_address: row.company_address || row.address || "",
    lorry_no: row.lorry_no || "",
    employee_name: row.employee_name || "",
    warehouse_name: row.warehouse_name || row.warehouse || "",
    location_name: row.location_name || "",
    product_name: row.product_name || "",
    gross_qty: Number(row.gross_qty ?? row.gross_weight ?? 0),
    shortage_qty: Number(row.shortage_qty ?? 0),
    net_opening_qty: Number(row.net_opening_qty ?? row.net_qty ?? 0),
    already_adjusted_qty: Number(row.already_adjusted_qty ?? row.adjusted_qty ?? 0),
    available_balance_qty: Number(row.available_balance_qty ?? row.balance_qty ?? 0),
    date: row.date || row.inward_date || "",
    outward_date: row.outward_date || "",
    days_diff: row.days_diff ?? 0,
  });

  useEffect(() => {
    axios.get(`${API_BASE}/employees`).then((res) => setEmployees(res.data || [])).catch(() => setEmployees([]));
    axios.get(`${API_BASE}/companies`).then((res) => setCompanies(res.data || [])).catch(() => setCompanies([]));
    axios.get(`${API_BASE}/locations`).then((res) => setLocations(res.data || [])).catch(() => setLocations([]));
    axios.get(`${API_BASE}/warehouses`).then((res) => setWarehouses(res.data || [])).catch(() => setWarehouses([]));
    axios.get(`${API_BASE}/products`).then((res) => setProducts(res.data || [])).catch(() => setProducts([]));
  }, []);

  useEffect(() => {
    if (!filtersReady) return undefined;
    const controller = new AbortController();
    let cancelled = false;
    const run = async () => {
      try {
        const locList = normalizeIdList(filters.location_ids);
        const whList = normalizeIdList(filters.warehouse_ids);

        const params = {
          from_date: filters.from_date,
          to_date: filters.to_date,
          employee_id: filters.employee_id,
          company_id: filters.company_id,
          account_id: filters.account_id,
          product_id: filters.product_id,
          location_ids: locList.join(","),
          warehouse_ids: whList.join(","),
        };
        if (locList.length === 1) params.location_id = locList[0];
        if (whList.length === 1) params.warehouse_id = whList[0];

        // Debug: show what we're sending to the API
        try {
          // eslint-disable-next-line no-console
          console.debug("Fetching /reports/party-stock with params:", params);
        } catch (e) {}

        const res = await axios.get(`${API_BASE}/reports/party-stock`, { params, signal: controller.signal });
        if (!cancelled) {
          const normalizedSummary = (res.data.summary || []).map(normalizePartyStockRow);
          const normalizedDetails = (res.data.details || []).map(normalizePartyStockRow);
          setSummary(normalizedSummary);
          setDetails(normalizedDetails);

          try {
            const journalParams = {
              from_date: filters.from_date,
              to_date: filters.to_date,
              employee_id: filters.employee_id,
              product_id: filters.product_id,
              location_id: locList.length === 1 ? locList[0] : "",
              warehouse_id: whList.length === 1 ? whList[0] : "",
            };
            const journalRes = await axios.get(`${API_BASE}/outward/stock-journal`, {
              params: journalParams,
              signal: controller.signal,
            });
            if (!cancelled) setJournalRows(Array.isArray(journalRes.data?.rows) ? journalRes.data.rows : []);
          } catch (journalErr) {
            if (journalErr?.code !== "ERR_CANCELED" && journalErr?.name !== "CanceledError") {
              console.error(journalErr);
              if (!cancelled) setJournalRows([]);
            }
          }
        }
      } catch (err) {
        if (err?.code === "ERR_CANCELED" || err?.name === "CanceledError") return;
        if (!cancelled) {
          console.error(err);
          setSummary([]);
          setDetails([]);
        }
      }
    };

    run();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [filters, filtersReady]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "location_ids" || name === "warehouse_ids") {
      const normalized = normalizeIdList(value);
      setFilters((prev) => ({ ...prev, [name]: normalized }));
      return;
    }
    setFilters((prev) => ({ ...prev, [name]: String(value || "") }));
  };

  const normalizedJournalRows = useMemo(
    () =>
      (journalRows || []).map((row) => ({
        ...row,
        qty: Number(row.qty || 0),
        cost_rate: Number(row.cost_rate || 0),
        cost_amount: Number(row.cost_amount || 0),
        sale_rate: Number(row.sale_rate || 0),
        sale_amount: Number(row.sale_amount || 0),
        profit_loss: Number(row.profit_loss || 0),
      })),
    [journalRows]
  );

  const journalTotals = useMemo(
    () =>
      normalizedJournalRows.reduce(
        (acc, row) => {
          acc.qty += row.qty;
          acc.cost += row.cost_amount;
          acc.sale += row.sale_amount;
          acc.profit += row.profit_loss;
          return acc;
        },
        { qty: 0, cost: 0, sale: 0, profit: 0 }
      ),
    [normalizedJournalRows]
  );

  const exportJournalCSV = () => {
    let csv = "Date,Journal No,Warehouse,Product,From Party,To Party,Qty,Cost Rate,Cost Amount,Sale Rate,Sale Amount,Profit/Loss,Lorry No,Employee\n";
    normalizedJournalRows.forEach((row) => {
      csv += `${formatDisplayDate(row.date) || ""},${row.journal_no || ""},${row.warehouse_name || ""},${row.product_name || ""},${row.from_party_name || ""},${row.to_party_name || ""},${num(row.qty)},${num(row.cost_rate)},${num(row.cost_amount)},${num(row.sale_rate)},${num(row.sale_amount)},${num(row.profit_loss)},${row.lorry_no || ""},${row.employee_name || ""}
`;
    });
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "Party_Stock_Journal_Report.csv";
    a.click();
    window.URL.revokeObjectURL(url);
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
            options={locations.map((item) => ({ value: String(item.id ?? item._id ?? ""), label: item.name || "" }))}
            value={filters.location_ids}
            onChange={(next) => handleChange({ target: { name: "location_ids", value: next } })}
            placeholder="All Locations"
          />

          <MultiSelectDropdown
            label="Warehouses"
            options={warehouses.map((item) => ({ value: String(item.id ?? item._id ?? ""), label: item.name || "" }))}
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
          <button onClick={exportJournalCSV} style={{ ...button, background: "#7c3aed" }}>
            Journal CSV
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
              { key: "journal", label: "Stock Journal" },
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

      {visibleSections.includes("journal") ? (
        <div style={{ ...card, marginTop: 16, overflow: "hidden" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
            <div>
              <h3 style={{ margin: 0, color: "#0f172a" }}>Stock Journal / Party Stock Movement</h3>
              <div style={{ marginTop: 4, color: "#64748b", fontSize: 12 }}>
                Existing Inward/Outward logic remains unchanged. This journal records the actual FIFO stock movement.
              </div>
            </div>
            <button onClick={exportJournalCSV} style={{ ...button, background: "#7c3aed" }}>Export Journal CSV</button>
          </div>
          <div style={{ overflowX: "auto", maxHeight: "72vh" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={th}>Date</th>
                  <th style={th}>Journal No</th>
                  <th style={th}>Warehouse</th>
                  <th style={th}>Product</th>
                  <th style={th}>From Party</th>
                  <th style={th}>To Party</th>
                  <th style={th}>Qty</th>
                  <th style={th}>Cost Rate</th>
                  <th style={th}>Cost Amount</th>
                  <th style={th}>Sale Rate</th>
                  <th style={th}>Sale Amount</th>
                  <th style={th}>Profit / Loss</th>
                  <th style={th}>Lorry No</th>
                  <th style={th}>Employee</th>
                </tr>
              </thead>
              <tbody>
                {normalizedJournalRows.length > 0 ? normalizedJournalRows.map((row, index) => (
                  <tr key={`${row.journal_no || row.outward_id}-${row.inward_id}-${index}`}>
                    <td style={td}>{formatDisplayDate(row.date)}</td>
                    <td style={td}>{row.journal_no || "-"}</td>
                    <td style={td}>{row.warehouse_name || "-"}</td>
                    <td style={td}>{row.product_name || "-"}</td>
                    <td style={td}>{row.from_party_name || "-"}</td>
                    <td style={td}>{row.to_party_name || "-"}</td>
                    <td style={td}>{num(row.qty)}</td>
                    <td style={td}>{num(row.cost_rate)}</td>
                    <td style={td}>{num(row.cost_amount)}</td>
                    <td style={td}>{num(row.sale_rate)}</td>
                    <td style={td}>{num(row.sale_amount)}</td>
                    <td style={{ ...td, fontWeight: 700 }}>{num(row.profit_loss)}</td>
                    <td style={td}>{row.lorry_no || "-"}</td>
                    <td style={td}>{row.employee_name || "-"}</td>
                  </tr>
                )) : (
                  <tr><td style={td} colSpan="14">No stock journal records found. Journal is created when an Outward is completed through the existing FIFO adjustment.</td></tr>
                )}
              </tbody>
              {normalizedJournalRows.length > 0 && (
                <tfoot>
                  <tr style={{ background: "#f3e8ff", fontWeight: 700 }}>
                    <td style={td} colSpan="6">Journal Totals</td>
                    <td style={td}>{num(journalTotals.qty)}</td>
                    <td style={td}>-</td>
                    <td style={td}>{num(journalTotals.cost)}</td>
                    <td style={td}>-</td>
                    <td style={td}>{num(journalTotals.sale)}</td>
                    <td style={td}>{num(journalTotals.profit)}</td>
                    <td style={td} colSpan="2">-</td>
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
