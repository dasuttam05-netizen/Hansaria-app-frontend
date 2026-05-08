import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { formatDisplayDate } from "../utils/date";

export default function ERPReportPage() {
  const navigate = useNavigate();
  const API_BASE = "/api";

  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState({});
  const [groups, setGroups] = useState({
    byDate: {},
    byMonth: {},
    byWarehouse: {},
    byCompany: {},
    byEmployee: {},
  });

  const [companies, setCompanies] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [employees, setEmployees] = useState([]);

  const [filters, setFilters] = useState({
    report_type: "all",
    from_date: new Date(new Date().setDate(new Date().getDate() - 30))
      .toISOString()
      .split("T")[0],
    to_date: new Date().toISOString().split("T")[0],
    month: "",
    warehouse_id: "",
    company_id: "",
    employee_id: "",
  });

  const card = {
    background: "#ffffff",
    border: "1px solid #dbe4ea",
    borderRadius: 14,
    padding: 16,
    boxShadow: "0 8px 24px rgba(15, 23, 42, 0.06)",
  };

  const input = {
    padding: "10px 12px",
    border: "1px solid #cbd5e1",
    borderRadius: 8,
    fontSize: 14,
    minWidth: 150,
  };

  const button = {
    padding: "10px 16px",
    border: "none",
    borderRadius: 8,
    fontWeight: 700,
    cursor: "pointer",
  };

  const th = {
    background: "#0f766e",
    color: "#fff",
    padding: "10px 12px",
    border: "1px solid #d9e2ec",
    textAlign: "left",
  };

  const td = {
    padding: "10px 12px",
    border: "1px solid #e5e7eb",
    background: "#fff",
  };

  const num = (val) => Number(val || 0).toFixed(2);

  const fetchDropdowns = async () => {
    try {
      const [companyRes, warehouseRes, employeeRes] = await Promise.all([
        axios.get(`${API_BASE}/companies`),
        axios.get(`${API_BASE}/warehouses`),
        axios.get(`${API_BASE}/employees`),
      ]);

      setCompanies(companyRes.data || []);
      setWarehouses(warehouseRes.data || []);
      setEmployees(employeeRes.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchReport = async () => {
    try {
      const params = { ...filters };
      if (params.month) {
        params.from_date = "";
        params.to_date = "";
      }

      const res = await axios.get(`${API_BASE}/reports/erp-summary`, { params });
      setRecords(res.data.records || []);
      setSummary(res.data.summary || {});
      setGroups(
        res.data.groups || {
          byDate: {},
          byMonth: {},
          byWarehouse: {},
          byCompany: {},
          byEmployee: {},
        }
      );
    } catch (err) {
      console.error(err);
      setRecords([]);
      setSummary({});
    }
  };

  useEffect(() => {
    fetchDropdowns();
    fetchReport();
  }, []);

  const handleChange = (e) => {
    setFilters((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const exportCSV = () => {
    let csv =
      "Type,Date,Month,Voucher,Lorry,Product,Warehouse,Company,Employee,Weight,Remaining,Qty,Rate,Amount,Freight,Labour,Rent,Shortage,Buyer,Consignee,Status\n";

    records.forEach((r) => {
      csv += [
        r.entry_type,
        formatDisplayDate(r.date),
        r.month_key,
        r.voucher_no,
        r.lorry_no,
        r.product_name,
        r.warehouse_name,
        r.company_name,
        r.employee_name,
        r.weight,
        r.remaining_qty,
        r.quantity,
        r.rate,
        r.amount,
        r.total_freight,
        r.labour_charges,
        r.rent,
        r.shortage,
        r.buyer_name,
        r.consignee_name,
        r.status,
      ].join(",") + "\n";
    });

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ERP_Report.csv";
    a.click();
  };

  const printReport = () => {
    const content = document.getElementById("erp-report-print").innerHTML;
    const win = window.open("", "", "width=1200,height=800");
    win.document.write(`
      <html>
        <head>
          <title>ERP Report</title>
          <style>
            body { font-family: Segoe UI, Arial, sans-serif; padding: 20px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { border: 1px solid #ccc; padding: 6px 8px; }
            th { background: #0f766e; color: #fff; }
            h2, h3 { margin: 12px 0; }
          </style>
        </head>
        <body>${content}</body>
      </html>
    `);
    win.document.close();
    win.print();
  };

  const groupBlocks = useMemo(() => {
    const toRows = (obj) =>
      Object.entries(obj || {}).map(([name, vals]) => ({
        name,
        ...vals,
      }));

    return {
      byDate: toRows(groups.byDate),
      byMonth: toRows(groups.byMonth),
      byWarehouse: toRows(groups.byWarehouse),
      byCompany: toRows(groups.byCompany),
      byEmployee: toRows(groups.byEmployee),
    };
  }, [groups]);

  const GroupTable = ({ title, rows }) => (
    <div style={card}>
      <h3 style={{ marginTop: 0, color: "#0f172a" }}>{title}</h3>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={th}>Name</th>
              <th style={th}>Entries</th>
              <th style={th}>Inward Weight</th>
              <th style={th}>Outward Qty</th>
              <th style={th}>Amount</th>
              <th style={th}>Freight</th>
            </tr>
          </thead>
          <tbody>
            {rows.length > 0 ? (
              rows.map((row, idx) => (
                <tr key={idx}>
                  <td style={td}>{row.name}</td>
                  <td style={td}>{row.count}</td>
                  <td style={td}>{num(row.inward_weight)}</td>
                  <td style={td}>{num(row.outward_qty)}</td>
                  <td style={td}>{num(row.amount)}</td>
                  <td style={td}>{num(row.freight)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td style={td} colSpan="6">No data found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div style={{ padding: 20, background: "#f8fafc", minHeight: "100vh" }}>
      <div style={{ ...card, marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h2 style={{ margin: 0, color: "#0f172a" }}>ERP Business Report</h2>
          <p style={{ margin: "8px 0 0", color: "#475569" }}>
            Date-wise, month-wise, warehouse-wise, company-wise, employee-wise reporting dashboard
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
        <h3 style={{ marginTop: 0, color: "#0f172a" }}>Filters</h3>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <select name="report_type" value={filters.report_type} onChange={handleChange} style={input}>
            <option value="all">All</option>
            <option value="inward">Inward</option>
            <option value="outward">Outward</option>
          </select>

          <input type="date" name="from_date" value={filters.from_date} onChange={handleChange} style={input} />
          <input type="date" name="to_date" value={filters.to_date} onChange={handleChange} style={input} />
          <input type="month" name="month" value={filters.month} onChange={handleChange} style={input} />

          <select name="warehouse_id" value={filters.warehouse_id} onChange={handleChange} style={input}>
            <option value="">All Warehouses</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>

          <select name="company_id" value={filters.company_id} onChange={handleChange} style={input}>
            <option value="">All Companies</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <select name="employee_id" value={filters.employee_id} onChange={handleChange} style={input}>
            <option value="">All Employees</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>

          <button onClick={fetchReport} style={{ ...button, background: "#0f766e", color: "#fff" }}>
            Apply
          </button>
          <button onClick={exportCSV} style={{ ...button, background: "#2563eb", color: "#fff" }}>
            Export CSV
          </button>
          <button onClick={printReport} style={{ ...button, background: "#475569", color: "#fff" }}>
            Print
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 16 }}>
        <div style={card}>
          <div style={{ color: "#64748b" }}>Inward Weight</div>
          <div style={{ fontSize: 24, fontWeight: 700 }}>{num(summary.inward_weight)}</div>
        </div>
        <div style={card}>
          <div style={{ color: "#64748b" }}>Outward Qty</div>
          <div style={{ fontSize: 24, fontWeight: 700 }}>{num(summary.outward_qty)}</div>
        </div>
        <div style={card}>
          <div style={{ color: "#64748b" }}>Outward Amount</div>
          <div style={{ fontSize: 24, fontWeight: 700 }}>{num(summary.outward_amount)}</div>
        </div>
        <div style={card}>
          <div style={{ color: "#64748b" }}>Freight</div>
          <div style={{ fontSize: 24, fontWeight: 700 }}>{num(summary.total_freight)}</div>
        </div>
        <div style={card}>
          <div style={{ color: "#64748b" }}>Labour</div>
          <div style={{ fontSize: 24, fontWeight: 700 }}>{num(summary.labour_charges)}</div>
        </div>
        <div style={card}>
          <div style={{ color: "#64748b" }}>Rent</div>
          <div style={{ fontSize: 24, fontWeight: 700 }}>{num(summary.rent)}</div>
        </div>
      </div>

      <div style={{ display: "grid", gap: 16, marginBottom: 16 }}>
        <GroupTable title="Date Wise Summary" rows={groupBlocks.byDate} />
        <GroupTable title="Month Wise Summary" rows={groupBlocks.byMonth} />
        <GroupTable title="Warehouse Wise Summary" rows={groupBlocks.byWarehouse} />
        <GroupTable title="Company Wise Summary" rows={groupBlocks.byCompany} />
        <GroupTable title="Employee Wise Summary" rows={groupBlocks.byEmployee} />
      </div>

      <div id="erp-report-print" style={card}>
        <h3 style={{ marginTop: 0, color: "#0f172a" }}>Detailed Report</h3>
        <div style={{ overflowX: "auto", maxHeight: 500 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr>
                <th style={th}>Type</th>
                <th style={th}>Date</th>
                <th style={th}>Month</th>
                <th style={th}>Voucher</th>
                <th style={th}>Lorry</th>
                <th style={th}>Product</th>
                <th style={th}>Warehouse</th>
                <th style={th}>Company</th>
                <th style={th}>Employee</th>
                <th style={th}>Weight</th>
                <th style={th}>Remaining</th>
                <th style={th}>Qty</th>
                <th style={th}>Rate</th>
                <th style={th}>Amount</th>
                <th style={th}>Freight</th>
                <th style={th}>Labour</th>
                <th style={th}>Rent</th>
                <th style={th}>Shortage</th>
                <th style={th}>Buyer</th>
                <th style={th}>Consignee</th>
                <th style={th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {records.length > 0 ? (
                records.map((row, idx) => (
                  <tr key={idx}>
                    <td style={td}>{row.entry_type}</td>
                    <td style={td}>{formatDisplayDate(row.date)}</td>
                    <td style={td}>{row.month_key}</td>
                    <td style={td}>{row.voucher_no}</td>
                    <td style={td}>{row.lorry_no}</td>
                    <td style={td}>{row.product_name}</td>
                    <td style={td}>{row.warehouse_name}</td>
                    <td style={td}>{row.company_name}</td>
                    <td style={td}>{row.employee_name}</td>
                    <td style={td}>{num(row.weight)}</td>
                    <td style={td}>{num(row.remaining_qty)}</td>
                    <td style={td}>{num(row.quantity)}</td>
                    <td style={td}>{num(row.rate)}</td>
                    <td style={td}>{num(row.amount)}</td>
                    <td style={td}>{num(row.total_freight)}</td>
                    <td style={td}>{num(row.labour_charges)}</td>
                    <td style={td}>{num(row.rent)}</td>
                    <td style={td}>{num(row.shortage)}</td>
                    <td style={td}>{row.buyer_name}</td>
                    <td style={td}>{row.consignee_name}</td>
                    <td style={td}>{row.status}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td style={td} colSpan="21">No records found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
