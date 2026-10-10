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
  const [adjustmentDetails, setAdjustmentDetails] = useState(null);
  const [loadingAdjustmentDetails, setLoadingAdjustmentDetails] = useState(false);
  const [adjustmentDetailsError, setAdjustmentDetailsError] = useState("");

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

  const openInwardEntry = (row) => {
    const inwardId =
      row.inward_id ||
      row.inwardId ||
      row._id ||
      row.id;
    if (!inwardId) return;

    const params = new URLSearchParams(location.search);
    [
      "from_date",
      "to_date",
      "employee_id",
      "company_id",
      "account_id",
      "product_id",
      "location_ids",
      "warehouse_ids",
      "location_id",
      "warehouse_id",
    ].forEach((key) => params.delete(key));

    Object.entries({
      from_date: filters.from_date,
      to_date: filters.to_date,
      employee_id: filters.employee_id,
      company_id: filters.company_id,
      account_id: filters.account_id,
      product_id: filters.product_id,
      location_ids: normalizeIdList(filters.location_ids).join(","),
      warehouse_ids: normalizeIdList(filters.warehouse_ids).join(","),
    }).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });

    const query = params.toString();
    const returnTo = `${location.pathname}${query ? `?${query}` : ""}${location.hash}`;

    navigate("/inward", {
      state: {
        partyStockEditInwardId: String(inwardId),
        partyStockReturnTo: returnTo,
      },
    });
  };

  const showAdjustmentDetails = async (row) => {
    const inwardId = row.inward_id || row.inwardId || row._id || row.id;
    if (!inwardId) return;

    setAdjustmentDetails({ row, entries: [] });
    setAdjustmentDetailsError("");
    setLoadingAdjustmentDetails(true);
    try {
      const response = await axios.get(`${API_BASE}/reports/party-stock/adjustment-details`, {
        params: { inward_id: inwardId },
      });
      const entries = Array.isArray(response.data?.entries) ? response.data.entries : [];
      setAdjustmentDetails({ row, entries });
    } catch (error) {
      setAdjustmentDetailsError(
        error?.response?.data?.error || "Could not load adjustment entry details."
      );
    } finally {
      setLoadingAdjustmentDetails(false);
    }
  };

  const card = {
    background: "#fff",
    border: "1px solid #dbe4ea",
    borderRadius: 16,
    padding: 18,
    boxShadow: "0 12px 32px rgba(15, 23, 42, 0.07)",
  };

  const input = {
    width: "100%",
    boxSizing: "border-box",
    height: 42,
    padding: "9px 12px",
    border: "1px solid #cbd5e1",
    borderRadius: 10,
    fontSize: 14,
    minWidth: 0,
    background: "#fff",
    color: "#0f172a",
  };

  const filterField = {
    minWidth: 0,
    padding: 10,
    border: "1px solid #bbf7d0",
    borderRadius: 12,
    background: "#f0fdf4",
    color: "#166534",
    fontSize: 12,
    fontWeight: 700,
  };

  const filterInput = {
    ...input,
    display: "block",
    marginTop: 6,
    borderColor: "#86c9a5",
    background: "#fbfffc",
  };

  const button = {
    padding: "10px 16px",
    border: "none",
    borderRadius: 10,
    fontWeight: 700,
    cursor: "pointer",
    color: "#fff",
  };

  const th = {
    position: "sticky",
    top: 0,
    zIndex: 3,
    background: "#0f766e",
    color: "#fff",
    padding: "12px 12px",
    border: "1px solid #0d665f",
    textAlign: "left",
    whiteSpace: "nowrap",
    boxShadow: "0 2px 4px rgba(15,23,42,0.12)",
    fontSize: 12,
    letterSpacing: "0.2px",
  };

  const td = {
    padding: "11px 12px",
    border: "1px solid #e2e8f0",
    background: "transparent",
    whiteSpace: "nowrap",
    color: "#334155",
  };

  const tdHover = {
    ...td,
    cursor: "pointer",
    transition: "background-color 0.2s ease",
  };

  const num = (v) => Number(v || 0).toFixed(2);

  const normalizePartyStockRow = (row) => ({
    ...row,
    company_name: row.company_name || row.party_name || row.account_name || "",
    party_name: row.party_name || row.company_name || row.account_name || "",
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
            if (!cancelled) {
              const rows = Array.isArray(journalRes.data?.rows) ? journalRes.data.rows : [];
              setJournalRows(rows);

              // Journal Entry is an actual party-stock transfer.  Reflect the
              // transfer back on the source Inward lot so Party Stock Report
              // shows the Journal date as Outward Date and includes the
              // journal quantity in Already Adjusted / Available Balance.
              // We prefer the exact inward id; older report payloads may not
              // expose it, so use the source voucher/lorry/date as safe fallbacks.
              const journalBySource = new Map();
              const addSourceMovement = (key, row) => {
                if (!key) return;
                const current = journalBySource.get(key) || { qty: 0, latestDate: "" };
                current.qty += Number(row.qty || 0);
                const d = row.date || "";
                if (!current.latestDate || String(d) > String(current.latestDate)) current.latestDate = d;
                journalBySource.set(key, current);
              };

              rows.forEach((row) => {
                const inwardId = row.inward_id ?? row.inwardId ?? row.source_inward_id;
                const inwardVoucher = row.inward_voucher_no || row.inward_no || "";
                if (inwardId !== undefined && inwardId !== null && String(inwardId)) {
                  addSourceMovement(`id:${String(inwardId)}`, row);
                }
                if (inwardVoucher) addSourceMovement(`voucher:${String(inwardVoucher)}`, row);
                if (row.lorry_no) {
                  addSourceMovement(
                    `fallback:${String(row.lorry_no)}|${String(row.product_id || "")}|${String(row.from_party_id || "")}`,
                    row
                  );
                }
              });

              const journalForDetail = (detail) => {
                const candidates = [
                  detail.inward_id,
                  detail.inwardId,
                  detail.source_inward_id,
                  detail._id,
                  detail.id,
                ].filter((v) => v !== undefined && v !== null && String(v));
                for (const id of candidates) {
                  const hit = journalBySource.get(`id:${String(id)}`);
                  if (hit) return hit;
                }

                const vouchers = [detail.voucher_no, detail.inward_voucher_no, detail.inward_no].filter(Boolean);
                for (const voucher of vouchers) {
                  const hit = journalBySource.get(`voucher:${String(voucher)}`);
                  if (hit) return hit;
                }

                if (detail.lorry_no) {
                  const hit = journalBySource.get(
                    `fallback:${String(detail.lorry_no)}|${String(detail.product_id || "")}|${String(detail.company_account_id || detail.account_id || "")}`
                  );
                  if (hit) return hit;
                }
                return null;
              };

              const mergedDetails = normalizedDetails.map((detail) => {
                const movement = journalForDetail(detail);
                if (!movement) return detail;
                const journalQty = Number(movement.qty || 0);
                const adjusted = Number(detail.already_adjusted_qty || 0) + journalQty;
                const balance = Math.max(0, Number(detail.net_opening_qty || 0) - adjusted);
                return {
                  ...detail,
                  outward_date: movement.latestDate || detail.outward_date || "",
                  already_adjusted_qty: adjusted,
                  available_balance_qty: balance,
                  journal_adjusted_qty: journalQty,
                };
              });

              // Rebuild Summary by Party from the detail rows after applying
              // Journal adjustments. This keeps Summary, Details and Journal
              // movement totals consistent.
              const grouped = new Map();
              mergedDetails.forEach((row) => {
                const key = `${String(row.company_id || row.company_name || row.party_name || "")}::${String(row.account_id || row.company_account_id || row.account_name || "")}`;
                const existing = grouped.get(key);
                if (existing) {
                  existing.gross_qty += Number(row.gross_qty || 0);
                  existing.shortage_qty += Number(row.shortage_qty || 0);
                  existing.net_opening_qty += Number(row.net_opening_qty || 0);
                  existing.already_adjusted_qty += Number(row.already_adjusted_qty || 0);
                  existing.available_balance_qty += Number(row.available_balance_qty || 0);
                } else {
                  grouped.set(key, {
                    ...row,
                    gross_qty: Number(row.gross_qty || 0),
                    shortage_qty: Number(row.shortage_qty || 0),
                    net_opening_qty: Number(row.net_opening_qty || 0),
                    already_adjusted_qty: Number(row.already_adjusted_qty || 0),
                    available_balance_qty: Number(row.available_balance_qty || 0),
                  });
                }
              });

              setDetails(mergedDetails);
              setSummary(Array.from(grouped.values()));
            }
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
      csv += `${formatDisplayDate(row.date) || ""},${row.journal_no || ""},${row.warehouse_name || ""},${row.product_name || ""},${row.from_party_name || ""},${row.to_party_name || ""},${num(row.qty)},${num(row.cost_rate)},${num(row.cost_amount)},${num(row.sale_rate)},${num(row.sale_amount)},${num(row.profit_loss)},${row.lorry_no || ""},${row.employee_name || ""}\n`;
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
    <div style={{ padding: 20, background: "linear-gradient(180deg, #f1f5f9 0%, #f8fafc 280px)", minHeight: "100vh", fontFamily: "Segoe UI, Arial, sans-serif" }}>
      <div style={{ ...card, marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap", padding: "22px 24px", background: "linear-gradient(115deg, #0f172a 0%, #134e4a 74%, #0f766e 100%)", border: "none", color: "#fff" }}>
        <div>
          <div style={{ color: "#99f6e4", fontSize: 11, fontWeight: 800, letterSpacing: 1.4, textTransform: "uppercase", marginBottom: 5 }}>
            Stock & Party Overview
          </div>
          <h2 style={{ margin: 0, color: "#fff" }}>Party Wise Stock Report</h2>
          <p style={{ margin: "6px 0 0", color: "#cbd5e1", maxWidth: 900, lineHeight: 1.5 }}>
            Detailed party (company) wise stock report with address, contact details, and stock calculations. Includes Gross Qty, Shortage, Net Opening, Already Adjusted, and Available Balance.
          </p>
          {dashboardView ? (
            <div style={{ marginTop: 12, color: "#99f6e4", fontWeight: 700, fontSize: 14 }}>
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
            background: "rgba(255,255,255,0.12)",
            color: "#fff",
            border: "1px solid rgba(255,255,255,0.28)",
            borderRadius: 10,
            fontSize: 14,
            cursor: "pointer",
            fontWeight: 600,
            whiteSpace: "nowrap",
          }}
        >
          ← Back
        </button>
      </div>

      <div style={{ ...card, marginBottom: 16, borderTop: "4px solid #0f766e", background: "linear-gradient(145deg, #ffffff 0%, #f8fafc 100%)" }}>
        <div style={{ marginBottom: 16 }}>
          <div style={{ color: "#0f766e", fontSize: 11, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase" }}>
            Refine report
          </div>
          <h3 style={{ margin: "4px 0 0", color: "#0f172a", fontSize: 18 }}>Filters</h3>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))", gap: 14, alignItems: "stretch" }}>
          <div style={{ ...filterField, gridColumn: "1 / -1" }}>
            <div style={{ marginBottom: 8 }}>Date Range</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))", gap: 12 }}>
              <label>
                From Date
                <input type="date" name="from_date" value={filters.from_date} onChange={handleChange} style={filterInput} />
              </label>
              <label>
                To Date
                <input type="date" name="to_date" value={filters.to_date} onChange={handleChange} style={filterInput} />
              </label>
            </div>
          </div>

          <label style={{ ...filterField, display: "block" }}>
            Employee
            <select name="employee_id" value={filters.employee_id} onChange={handleChange} style={filterInput}>
              <option value="">All Employees</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
          </label>

          <label style={{ ...filterField, display: "block" }}>
            Party
            <select name="company_id" value={filters.company_id} onChange={handleChange} style={filterInput}>
              <option value="">All Parties</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </label>

          <MultiSelectDropdown
            label="Locations"
            containerStyle={{ ...filterField, flex: "none", width: "100%" }}
            openOnType
            options={locations.map((item) => ({ value: String(item.id ?? item._id ?? ""), label: item.name || "" }))}
            value={filters.location_ids}
            onChange={(next) => handleChange({ target: { name: "location_ids", value: next } })}
            placeholder="All Locations"
          />

          <MultiSelectDropdown
            label="Warehouses"
            containerStyle={{ ...filterField, flex: "none", width: "100%" }}
            openOnType
            options={warehouses.map((item) => ({ value: String(item.id ?? item._id ?? ""), label: item.name || "" }))}
            value={filters.warehouse_ids}
            onChange={(next) => handleChange({ target: { name: "warehouse_ids", value: next } })}
            placeholder="All Warehouses"
          />

          <label style={{ ...filterField, display: "block" }}>
            Product
            <select name="product_id" value={filters.product_id} onChange={handleChange} style={filterInput}>
              <option value="">All Products</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </label>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, flexWrap: "wrap", marginTop: 16, paddingTop: 14, borderTop: "1px solid #e2e8f0" }}>
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
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 16 }}>
      {[
        { label: "Gross Qty", value: totals.gross, accent: "#2563eb", tint: "#eff6ff" },
        { label: "Shortage", value: totals.shortage, accent: "#ea580c", tint: "#fff7ed" },
        { label: "Net Opening", value: totals.net, accent: "#0f766e", tint: "#f0fdfa" },
        { label: "Already Adjusted", value: totals.adjusted, accent: "#7c3aed", tint: "#f5f3ff" },
        { label: "Available Balance", value: totals.balance, accent: "#047857", tint: "#ecfdf5" },
      ].map((metric) => (
        <div key={metric.label} style={{ ...card, padding: "15px 17px", borderLeft: `4px solid ${metric.accent}`, background: metric.tint }}>
          <div style={{ color: "#64748b", fontSize: 11, fontWeight: 800, letterSpacing: 0.6, textTransform: "uppercase" }}>{metric.label}</div>
          <div style={{ color: "#172033", fontSize: 21, fontWeight: 800, marginTop: 7 }}>{num(metric.value)}</div>
        </div>
      ))}
      </div>
      ) : null}

      {!dashboardView && visibleSections.includes("summary") ? (
        <div style={{ ...card, marginBottom: 16, overflow: "hidden", padding: 0 }}>
          <div style={{ padding: "17px 18px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <div>
              <div style={{ color: "#0f766e", fontSize: 11, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>Party Summary</div>
              <h3 style={{ margin: 0, color: "#0f172a" }}>Summary by Party</h3>
            </div>
            <span style={{ padding: "6px 10px", borderRadius: 999, background: "#f0fdfa", color: "#0f766e", fontSize: 12, fontWeight: 800 }}>{summary.length} records</span>
          </div>
          <div style={{ overflow: "auto", maxHeight: "65vh" }}>
          <table style={{ width: "100%", minWidth: 980, borderCollapse: "separate", borderSpacing: 0, fontSize: 13 }}>
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
                  <tr key={`${row.party_name}-${row.warehouse_name}-${index}`} style={{ background: index % 2 === 0 ? "#fff" : "#f8fafc" }}>
                    <td style={{ ...td, fontWeight: 800, color: "#0f766e" }}>{row.party_name}</td>
                    <td style={td}>{row.company_address || "-"}</td>
                    <td style={td}>{row.warehouse_name || "-"}</td>
                    <td style={{ ...td, textAlign: "right" }}>{num(row.gross_qty)}</td>
                    <td style={{ ...td, textAlign: "right", color: "#c2410c" }}>{num(row.shortage_qty)}</td>
                    <td style={{ ...td, textAlign: "right" }}>{num(row.net_opening_qty)}</td>
                    <td style={{ ...td, textAlign: "right", color: "#7c3aed" }}>{num(row.already_adjusted_qty)}</td>
                    <td style={{ ...td, textAlign: "right", fontWeight: 800, color: "#047857" }}>{num(row.available_balance_qty)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td style={td} colSpan="8">No summary records found</td>
                </tr>
              )}
              {summary.length > 0 && (
                <tr style={{ background: "#e6fffb", fontWeight: 800 }}>
                  <td style={{ ...td, background: "#e6fffb" }} colSpan="3">Total Weight</td>
                  <td style={{ ...td, background: "#e6fffb", textAlign: "right" }}>{num(summaryTotals.gross)}</td>
                  <td style={{ ...td, background: "#e6fffb", textAlign: "right" }}>{num(summaryTotals.shortage)}</td>
                  <td style={{ ...td, background: "#e6fffb", textAlign: "right" }}>{num(summaryTotals.net)}</td>
                  <td style={{ ...td, background: "#e6fffb", textAlign: "right" }}>{num(summaryTotals.adjusted)}</td>
                  <td style={{ ...td, background: "#e6fffb", textAlign: "right" }}>{num(summaryTotals.balance)}</td>
                </tr>
              )}
            </tbody>
          </table>
          </div>
        </div>
      ) : null}

      {visibleSections.includes("details") ? (
      <div style={{ ...card, overflow: "hidden", padding: 0, marginBottom: 16 }}>
        <div style={{ padding: "17px 18px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div>
            <div style={{ color: "#2563eb", fontSize: 11, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>Stock Detail Register</div>
            <h3 style={{ margin: 0, color: "#0f172a" }}>
              {dashboardView ? "Filtered Details" : "Full Details"}
            </h3>
          </div>
          <span style={{ padding: "6px 10px", borderRadius: 999, background: "#eff6ff", color: "#1d4ed8", fontSize: 12, fontWeight: 800 }}>{details.length} records</span>
        </div>
        <div style={{ overflow: "auto", maxHeight: "72vh" }}>
          <table style={{ width: "100%", minWidth: 1500, borderCollapse: "separate", borderSpacing: 0, fontSize: 13 }}>
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
                details.map((row, index) => (
                  <tr key={row.id} style={{ background: index % 2 === 0 ? "#fff" : "#f8fafc" }}>
                    <td style={{ ...td, fontWeight: 800, color: "#0f766e" }}>{row.company_name || row.account_name || "Unknown Party"}</td>
                    <td style={td}>{row.account_name || "-"}</td>
                    <td style={td}>{row.lorry_no}</td>
                    <td style={td}>{row.employee_name}</td>
                    <td style={td}>{row.warehouse_name || "-"}</td>
                    <td style={td}>{row.location_name}</td>
                    <td style={td}>{row.product_name}</td>
                    <td style={td}>{formatDisplayDate(row.date)}</td>
                    <td style={td}>{formatDisplayDate(row.outward_date) || "-"}</td>
                    <td style={td}>{row.days_diff}</td>
                    <td style={{ ...td, textAlign: "right" }}>
                      <button
                        type="button"
                        onClick={() => openInwardEntry(row)}
                        title="Open and edit this inward entry"
                        style={{
                          border: "1px solid #bfdbfe",
                          borderRadius: 7,
                          padding: "5px 8px",
                          background: "#eff6ff",
                          color: "#1d4ed8",
                          fontWeight: 800,
                          cursor: "pointer",
                        }}
                      >
                        {num(row.gross_qty)}
                      </button>
                    </td>
                    <td style={{ ...td, textAlign: "right", color: "#c2410c" }}>{num(row.shortage_qty)}</td>
                    <td style={{ ...td, textAlign: "right" }}>{num(row.net_opening_qty)}</td>
                    <td style={{ ...td, textAlign: "right" }}>
                      <button
                        type="button"
                        onClick={() => showAdjustmentDetails(row)}
                        title="View all adjustment entries for this inward"
                        style={{
                          border: "1px solid #ddd6fe",
                          borderRadius: 7,
                          padding: "5px 8px",
                          background: "#f5f3ff",
                          color: "#7c3aed",
                          fontWeight: 800,
                          cursor: "pointer",
                        }}
                      >
                        {num(row.already_adjusted_qty)}
                      </button>
                    </td>
                    <td style={{ ...td, textAlign: "right", fontWeight: 800, color: "#047857" }}>{num(row.available_balance_qty)}</td>
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
                <tr style={{ background: "#e6fffb", fontWeight: 800 }}>
                  <td style={{ ...td, background: "#e6fffb" }} colSpan="10">Totals</td>
                  <td style={{ ...td, background: "#e6fffb", textAlign: "right" }}>{num(totals.gross)}</td>
                  <td style={{ ...td, background: "#e6fffb", textAlign: "right" }}>{num(totals.shortage)}</td>
                  <td style={{ ...td, background: "#e6fffb", textAlign: "right" }}>{num(totals.net)}</td>
                  <td style={{ ...td, background: "#e6fffb", textAlign: "right" }}>{num(totals.adjusted)}</td>
                  <td style={{ ...td, background: "#e6fffb", textAlign: "right" }}>{num(totals.balance)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
      ) : null}

      {visibleSections.includes("journal") ? (
        <div style={{ ...card, marginTop: 16, overflow: "hidden", padding: 0 }}>
          <div style={{ padding: "17px 18px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <div>
              <div style={{ color: "#7c3aed", fontSize: 11, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>Movement History</div>
              <h3 style={{ margin: 0, color: "#0f172a" }}>Stock Journal / Party Stock Movement</h3>
              <div style={{ marginTop: 4, color: "#64748b", fontSize: 12 }}>
                Existing Inward/Outward logic remains unchanged. This journal records the actual FIFO stock movement.
              </div>
            </div>
            <button onClick={exportJournalCSV} style={{ ...button, background: "#7c3aed" }}>Export Journal CSV</button>
          </div>
          <div style={{ overflow: "auto", maxHeight: "72vh" }}>
            <table style={{ width: "100%", minWidth: 1300, borderCollapse: "separate", borderSpacing: 0, fontSize: 13 }}>
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
                  <tr key={`${row.journal_no || row.outward_id}-${row.inward_id}-${index}`} style={{ background: index % 2 === 0 ? "#fff" : "#f8fafc" }}>
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
                    <td style={{ ...td, background: "#f3e8ff" }} colSpan="6">Journal Totals</td>
                    <td style={{ ...td, background: "#f3e8ff" }}>{num(journalTotals.qty)}</td>
                    <td style={{ ...td, background: "#f3e8ff" }}>-</td>
                    <td style={{ ...td, background: "#f3e8ff" }}>{num(journalTotals.cost)}</td>
                    <td style={{ ...td, background: "#f3e8ff" }}>-</td>
                    <td style={{ ...td, background: "#f3e8ff" }}>{num(journalTotals.sale)}</td>
                    <td style={{ ...td, background: "#f3e8ff" }}>{num(journalTotals.profit)}</td>
                    <td style={{ ...td, background: "#f3e8ff" }} colSpan="2">-</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      ) : null}

      {adjustmentDetails && (
        <div
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setAdjustmentDetails(null);
          }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1200,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            background: "rgba(15,23,42,0.58)",
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="party-stock-adjustment-title"
            style={{
              width: "min(1000px, 100%)",
              maxHeight: "90vh",
              overflow: "hidden",
              borderRadius: 16,
              background: "#fff",
              boxShadow: "0 24px 70px rgba(15,23,42,0.3)",
              border: "1px solid #ddd6fe",
            }}
          >
            <header
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
                padding: "18px 20px",
                color: "#fff",
                background: "linear-gradient(110deg, #4c1d95, #7c3aed)",
              }}
            >
              <div>
                <div style={{ color: "#ddd6fe", fontSize: 11, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase" }}>
                  Outward Adjustment Breakdown
                </div>
                <h3 id="party-stock-adjustment-title" style={{ margin: "4px 0 0", color: "#fff" }}>
                  {adjustmentDetails.row.company_name || adjustmentDetails.row.account_name || "Stock adjustment details"}
                </h3>
                <div style={{ marginTop: 4, color: "#ede9fe", fontSize: 13 }}>
                  Outward entries that consumed this stock
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAdjustmentDetails(null)}
                aria-label="Close adjustment details"
                style={{
                  border: "1px solid rgba(255,255,255,0.4)",
                  borderRadius: 9,
                  padding: "8px 12px",
                  background: "rgba(255,255,255,0.12)",
                  color: "#fff",
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                Close
              </button>
            </header>

            <div style={{ padding: 20, overflowY: "auto", maxHeight: "calc(90vh - 90px)" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 10, marginBottom: 16 }}>
                <div style={{ padding: 13, borderRadius: 10, background: "#f5f3ff", border: "1px solid #ddd6fe" }}>
                  <div style={{ color: "#6d28d9", fontSize: 11, fontWeight: 800, textTransform: "uppercase" }}>Already Adjusted</div>
                  <div style={{ color: "#4c1d95", fontSize: 20, fontWeight: 800, marginTop: 5 }}>{num(adjustmentDetails.row.already_adjusted_qty)}</div>
                </div>
                <div style={{ padding: 13, borderRadius: 10, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                  <div style={{ color: "#64748b", fontSize: 11, fontWeight: 800, textTransform: "uppercase" }}>Adjustment Entries</div>
                  <div style={{ color: "#172033", fontSize: 20, fontWeight: 800, marginTop: 5 }}>
                    {loadingAdjustmentDetails ? "…" : adjustmentDetails.entries.length}
                  </div>
                </div>
                <div style={{ padding: 13, borderRadius: 10, background: "#ecfdf5", border: "1px solid #a7f3d0" }}>
                  <div style={{ color: "#047857", fontSize: 11, fontWeight: 800, textTransform: "uppercase" }}>Entry Quantity Total</div>
                  <div style={{ color: "#065f46", fontSize: 20, fontWeight: 800, marginTop: 5 }}>
                    {num(adjustmentDetails.entries.reduce((total, entry) => total + (Number(entry.quantity) || 0), 0))}
                  </div>
                </div>
              </div>

              {loadingAdjustmentDetails ? (
                <div style={{ padding: 32, textAlign: "center", color: "#64748b" }}>Loading adjustment entries...</div>
              ) : adjustmentDetailsError ? (
                <div role="alert" style={{ padding: 14, borderRadius: 9, background: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c" }}>
                  {adjustmentDetailsError}
                </div>
              ) : adjustmentDetails.entries.length === 0 ? (
                <div style={{ padding: 24, textAlign: "center", borderRadius: 10, background: "#f8fafc", color: "#64748b" }}>
                  No individual adjustment entries were found for this inward record.
                </div>
              ) : (
                <div style={{ overflow: "auto", border: "1px solid #e2e8f0", borderRadius: 10, maxHeight: "52vh" }}>
                  <table style={{ width: "100%", minWidth: 1350, borderCollapse: "separate", borderSpacing: 0, fontSize: 13 }}>
                    <thead>
                      <tr>
                        {["Type", "Outward Date", "Outward Voucher", "Destination Account", "Consignee", "Location", "Warehouse", "Lorry No", "Outward Total Qty", "Adjusted Qty"].map((heading) => (
                          <th key={heading} style={{ ...th, position: "sticky", top: 0, background: "#4c1d95" }}>{heading}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {adjustmentDetails.entries.map((entry, index) => (
                        <tr key={entry.id || `${entry.reference}-${index}`} style={{ background: index % 2 === 0 ? "#fff" : "#faf8ff" }}>
                          <td style={td}>
                            <span style={{ display: "inline-block", padding: "4px 8px", borderRadius: 999, background: entry.type === "Stock Journal" ? "#eff6ff" : "#f5f3ff", color: entry.type === "Stock Journal" ? "#1d4ed8" : "#6d28d9", fontWeight: 700 }}>
                              {entry.type}
                            </span>
                          </td>
                          <td style={td}>{formatDisplayDate(entry.date) || "-"}</td>
                          <td style={{ ...td, fontWeight: 700 }}>{entry.reference || "-"}</td>
                          <td style={{ ...td, fontWeight: 700, color: "#4c1d95" }}>{entry.account || "-"}</td>
                          <td style={td}>{entry.consignee || "-"}</td>
                          <td style={td}>{entry.location || "-"}</td>
                          <td style={td}>{entry.warehouse || "-"}</td>
                          <td style={td}>{entry.lorry || "-"}</td>
                          <td style={{ ...td, textAlign: "right", fontWeight: 700, color: "#1d4ed8" }}>
                            {entry.outward_quantity == null ? "-" : num(entry.outward_quantity)}
                          </td>
                          <td style={{ ...td, textAlign: "right", fontWeight: 800, color: "#6d28d9" }}>{num(entry.quantity)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
