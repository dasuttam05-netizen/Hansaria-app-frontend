import React, { useEffect, useState } from "react";
import axios from "axios";
import { useSearchParams } from "react-router-dom";
import { hasPermission, loadSession } from "../utils/auth";

const defaultForm = () => ({
  voucher_no: "",
  date: new Date().toISOString().slice(0, 10),
  warehouse_id: "",
  farmer_id: "",
  company_id: "",
  consignee_id: "",
  product_id: "",
  employee_id: "",
  location_id: "",
  quantity: "",
  rate: "",
  amount: "",
  debit_account: "",
  credit_account: "",
  description: "",
});

export default function WarehouseTradingPage() {
  const { user } = loadSession();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState("vouchers");
  const [activeVoucherType, setActiveVoucherType] = useState("purchase");
  const [activeReport, setActiveReport] = useState("sale");

  const [warehouses, setWarehouses] = useState([]);
  const [farmers, setFarmers] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [consignees, setConsignees] = useState([]);
  const [products, setProducts] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [locations, setLocations] = useState([]);

  const [formData, setFormData] = useState(defaultForm());
  const [editId, setEditId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [list, setList] = useState([]);
  const [reportData, setReportData] = useState([]);
  const voucherPermissionMap = {
    purchase: "warehouse.trading.purchase.view",
    sale: "warehouse.trading.sale.view",
    payment: "warehouse.trading.payment.view",
    receipt: "warehouse.trading.receipt.view",
    journal: "warehouse.trading.journal.view",
  };
  const reportPermissionMap = {
    sale: "warehouse.trading.report.sale",
    purchase: "warehouse.trading.report.purchase",
    "profit-loss": "warehouse.trading.report.profitLoss",
  };
  const allowedVoucherTypes = Object.keys(voucherPermissionMap).filter((type) => hasPermission(user, voucherPermissionMap[type]));
  const allowedReports = Object.keys(reportPermissionMap).filter((type) => hasPermission(user, reportPermissionMap[type]));

  // Load initial data
  useEffect(() => {
    const requestedType = searchParams.get("type");
    const requestedTab = searchParams.get("tab");
    const requestedReport = searchParams.get("report");
    const validVoucherTypes = allowedVoucherTypes;
    const validReports = allowedReports;

    if (validVoucherTypes.includes(requestedType)) {
      setActiveTab("vouchers");
      setActiveVoucherType(requestedType);
    } else if (requestedTab === "reports" || validReports.includes(requestedReport)) {
      setActiveTab("reports");
      setActiveReport(validReports.includes(requestedReport) ? requestedReport : validReports[0] || "sale");
    } else if (validVoucherTypes.length) {
      setActiveTab("vouchers");
      setActiveVoucherType(validVoucherTypes[0]);
    } else if (validReports.length) {
      setActiveTab("reports");
      setActiveReport(validReports[0]);
    }

    loadData();
  }, [searchParams, user]);

  // Load voucher list when type changes
  useEffect(() => {
    if (activeTab === "vouchers") {
      loadVouchers();
    }
  }, [activeTab, activeVoucherType]);

  // Load report when type changes
  useEffect(() => {
    if (activeTab === "reports") {
      loadReport();
    }
  }, [activeTab, activeReport]);

  const loadData = async () => {
    try {
      const [wRes, fRes, cRes, coRes, pRes, eRes, lRes] = await Promise.allSettled([
        axios.get("/api/warehouses"),
        axios.get("/api/farmers"),
        axios.get("/api/companies"),
        axios.get("/api/consignee-names"),
        axios.get("/api/products"),
        axios.get("/api/employees"),
        axios.get("/api/locations"),
      ]);
      const dataOf = (result) => (result.status === "fulfilled" ? result.value.data : []);
      setWarehouses(Array.isArray(dataOf(wRes)) ? dataOf(wRes) : []);
      setFarmers(Array.isArray(dataOf(fRes)) ? dataOf(fRes) : []);
      setCompanies(Array.isArray(dataOf(cRes)) ? dataOf(cRes) : []);
      setConsignees(Array.isArray(dataOf(coRes)) ? dataOf(coRes) : []);
      setProducts(Array.isArray(dataOf(pRes)) ? dataOf(pRes) : []);
      setEmployees(Array.isArray(dataOf(eRes)) ? dataOf(eRes) : []);
      setLocations(Array.isArray(dataOf(lRes)) ? dataOf(lRes) : []);
    } catch (err) {
      console.error(err);
    }
  };

  const loadVouchers = async () => {
    try {
      if (!hasPermission(user, voucherPermissionMap[activeVoucherType])) {
        setList([]);
        return;
      }
      const res = await axios.get(`/api/wh-vouchers/${activeVoucherType}`);
      setList(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
    }
  };

  const loadReport = async () => {
    try {
      if (!hasPermission(user, reportPermissionMap[activeReport])) {
        setReportData([]);
        return;
      }
      const endpoint = activeReport === "sale" ? "sale-summary" : activeReport === "purchase" ? "purchase-summary" : "profit-loss";
      const res = await axios.get(`/api/wh-vouchers/report/${endpoint}`);
      setReportData(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.voucher_no || !formData.date) {
      alert("Voucher no. and date are required");
      return;
    }
    setLoading(true);
    try {
      const payload = {
        ...formData,
        quantity: formData.quantity ? Number(formData.quantity) : null,
        rate: formData.rate ? Number(formData.rate) : null,
        amount: formData.amount ? Number(formData.amount) : null,
      };
      await axios.post(`/api/wh-vouchers/${activeVoucherType}`, payload);
      alert("Voucher saved successfully");
      setFormData(defaultForm());
      loadVouchers();
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.error || "Failed to save voucher");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ fontFamily: "Segoe UI, Arial, sans-serif", padding: "16px" }}>
      <div style={headerRow}>
        <div>
          <h2 style={titleStyle}>Warehouse Trading</h2>
          <p style={subtitleStyle}>Manage trading vouchers and view reports</p>
        </div>
        <div style={tabRow}>
          <button onClick={() => setActiveTab("vouchers")} style={activeTab === "vouchers" ? activeTabStyle : tabStyle}>Vouchers</button>
          <button onClick={() => setActiveTab("reports")} style={activeTab === "reports" ? activeTabStyle : tabStyle}>Reports</button>
        </div>
      </div>

      {activeTab === "vouchers" ? (
        <>
          <div style={voucherTypeRow}>
            {allowedVoucherTypes.map((type) => (
              <button
                key={type}
                onClick={() => setActiveVoucherType(type)}
                style={activeVoucherType === type ? activeVoucherButtonStyle : voucherButtonStyle}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>

          <div style={card}>
            <h3 style={{ marginTop: 0 }}>New {activeVoucherType.charAt(0).toUpperCase() + activeVoucherType.slice(1)} Voucher</h3>
            <form onSubmit={handleSubmit}>
              <div style={formGrid}>
                <Field label="Voucher No">
                  <input name="voucher_no" value={formData.voucher_no} onChange={handleChange} placeholder="Voucher No *" style={inp} required />
                </Field>
                <Field label="Date">
                  <input name="date" type="date" value={formData.date} onChange={handleChange} style={inp} required />
                </Field>
                <Field label="Warehouse">
                  <select name="warehouse_id" value={formData.warehouse_id} onChange={handleChange} style={inp}>
                    <option value="">Select Warehouse</option>
                    {warehouses.map((w) => (
                      <option key={w.id || w._id} value={w.id || w._id}>{w.name}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Location">
                  <select name="location_id" value={formData.location_id} onChange={handleChange} style={inp}>
                    <option value="">Select Location</option>
                    {locations.map((l) => (
                      <option key={l.id || l._id} value={l.id || l._id}>{l.name}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Employee">
                  <select name="employee_id" value={formData.employee_id} onChange={handleChange} style={inp}>
                    <option value="">Select Employee</option>
                    {employees.map((e) => (
                      <option key={e.id || e._id} value={e.id || e._id}>{e.name}</option>
                    ))}
                  </select>
                </Field>

                {(activeVoucherType === "purchase" || activeVoucherType === "payment") && (
                  <Field label="Farmer (Creditor)">
                    <select name="farmer_id" value={formData.farmer_id} onChange={handleChange} style={inp}>
                      <option value="">Select Farmer</option>
                      {farmers.map((f) => (
                        <option key={f._id} value={f._id}>{f.name}</option>
                      ))}
                    </select>
                  </Field>
                )}

                {(activeVoucherType === "sale" || activeVoucherType === "receipt") && (
                  <>
                    <Field label="Company (Debtor)">
                      <select name="company_id" value={formData.company_id} onChange={handleChange} style={inp}>
                        <option value="">Select Company</option>
                        {companies.map((c) => (
                          <option key={c._id} value={c._id}>{c.name}</option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Consignee">
                      <select name="consignee_id" value={formData.consignee_id} onChange={handleChange} style={inp}>
                        <option value="">Select Consignee</option>
                        {consignees.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </Field>
                  </>
                )}

                {(activeVoucherType === "purchase" || activeVoucherType === "sale") && (
                  <>
                    <Field label="Product">
                      <select name="product_id" value={formData.product_id} onChange={handleChange} style={inp}>
                        <option value="">Select Product</option>
                        {products.map((p) => (
                          <option key={p.id || p._id} value={p.id || p._id}>{p.name}</option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Quantity">
                      <input name="quantity" type="number" step="0.01" value={formData.quantity} onChange={handleChange} style={inp} />
                    </Field>
                    <Field label="Rate">
                      <input name="rate" type="number" step="0.01" value={formData.rate} onChange={handleChange} style={inp} />
                    </Field>
                    <Field label="Amount">
                      <input name="amount" type="number" step="0.01" value={formData.amount} onChange={handleChange} style={inp} />
                    </Field>
                  </>
                )}

                {(activeVoucherType === "payment" || activeVoucherType === "receipt") && (
                  <Field label="Amount">
                    <input name="amount" type="number" step="0.01" value={formData.amount} onChange={handleChange} style={inp} required />
                  </Field>
                )}

                {activeVoucherType === "journal" && (
                  <>
                    <Field label="Debit Account">
                      <input name="debit_account" value={formData.debit_account} onChange={handleChange} placeholder="Debit Account" style={inp} />
                    </Field>
                    <Field label="Credit Account">
                      <input name="credit_account" value={formData.credit_account} onChange={handleChange} placeholder="Credit Account" style={inp} />
                    </Field>
                    <Field label="Amount">
                      <input name="amount" type="number" step="0.01" value={formData.amount} onChange={handleChange} style={inp} required />
                    </Field>
                  </>
                )}

                <div style={{ gridColumn: "1 / -1" }}>
                  <Field label="Description">
                    <textarea name="description" value={formData.description} onChange={handleChange} rows={2} style={{ ...inp, minHeight: 60, resize: "vertical" }} />
                  </Field>
                </div>
              </div>
              <div style={{ marginTop: 16 }}>
                <button type="submit" disabled={loading} style={btnPrimary}>{loading ? "Saving..." : "Save Voucher"}</button>
              </div>
            </form>
          </div>

          <div style={card}>
            <h3 style={{ marginTop: 0 }}>{activeVoucherType.charAt(0).toUpperCase() + activeVoucherType.slice(1)} Vouchers</h3>
            <div style={tableCard}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "#0f766e", color: "#fff" }}>
                    <th style={th}>Date</th>
                    <th style={th}>Voucher No</th>
                    <th style={th}>Warehouse</th>
                    {(activeVoucherType === "purchase" || activeVoucherType === "payment") && <th style={th}>Farmer</th>}
                    {(activeVoucherType === "sale" || activeVoucherType === "receipt") && <th style={th}>Company</th>}
                    {(activeVoucherType === "purchase" || activeVoucherType === "sale") && <th style={th}>Product</th>}
                    {(activeVoucherType === "purchase" || activeVoucherType === "sale") && <th style={th}>Qty</th>}
                    {(activeVoucherType === "purchase" || activeVoucherType === "sale") && <th style={th}>Rate</th>}
                    <th style={th}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((item, i) => (
                    <tr key={item.id || i} style={{ background: i % 2 ? "#f8fafc" : "#fff" }}>
                      <td style={td}>{item.date}</td>
                      <td style={td}>{item.voucher_no}</td>
                      <td style={td}>{warehouses.find(w => (w.id || w._id) === item.warehouse_id)?.name || "-"}</td>
                      {(activeVoucherType === "purchase" || activeVoucherType === "payment") && (
                        <td style={td}>{farmers.find(f => f._id === item.farmer_id)?.name || "-"}</td>
                      )}
                      {(activeVoucherType === "sale" || activeVoucherType === "receipt") && (
                        <td style={td}>{companies.find(c => c._id === item.company_id)?.name || "-"}</td>
                      )}
                      {(activeVoucherType === "purchase" || activeVoucherType === "sale") && (
                        <>
                          <td style={td}>{products.find(p => (p.id || p._id) === item.product_id)?.name || "-"}</td>
                          <td style={td}>{item.quantity || 0}</td>
                          <td style={td}>{item.rate || 0}</td>
                        </>
                      )}
                      <td style={td}>{item.amount || 0}</td>
                    </tr>
                  ))}
                  {list.length === 0 && (
                    <tr><td colSpan={9} style={{ ...td, textAlign: "center", padding: 20 }}>No vouchers found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <>
          <div style={voucherTypeRow}>
            {allowedReports.map((type) => (
              <button
                key={type}
                onClick={() => setActiveReport(type)}
                style={activeReport === type ? activeVoucherButtonStyle : voucherButtonStyle}
              >
                {type === "profit-loss" ? "Profit/Loss" : type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>

          <div style={card}>
            <h3 style={{ marginTop: 0 }}>{activeReport === "profit-loss" ? "Profit/Loss" : activeReport.charAt(0).toUpperCase() + activeReport.slice(1)} Report</h3>
            <div style={tableCard}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "#0f766e", color: "#fff" }}>
                    <th style={th}>Warehouse</th>
                    {activeReport === "sale" && <th style={th}>Total Quantity</th>}
                    {activeReport === "sale" && <th style={th}>Total Amount</th>}
                    {activeReport === "purchase" && <th style={th}>Total Quantity</th>}
                    {activeReport === "purchase" && <th style={th}>Total Amount</th>}
                    {activeReport === "profit-loss" && <th style={th}>Sale Amount</th>}
                    {activeReport === "profit-loss" && <th style={th}>Purchase Amount</th>}
                    {activeReport === "profit-loss" && <th style={th}>Profit/Loss</th>}
                  </tr>
                </thead>
                <tbody>
                  {reportData.map((item, i) => (
                    <tr key={item.id || i} style={{ background: i % 2 ? "#f8fafc" : "#fff" }}>
                      <td style={td}>{item.warehouse_name || warehouses.find(w => (w.id || w._id) === item.warehouse_id)?.name || "-"}</td>
                      {(activeReport === "sale" || activeReport === "purchase") && (
                        <>
                          <td style={td}>{item.total_quantity || 0}</td>
                          <td style={td}>{item.total_amount || 0}</td>
                        </>
                      )}
                      {activeReport === "profit-loss" && (
                        <>
                          <td style={td}>{item.sale_amount || 0}</td>
                          <td style={td}>{item.purchase_amount || 0}</td>
                          <td style={{ ...td, color: item.profit_loss >= 0 ? "#16a34a" : "#dc2626" }}>{item.profit_loss || 0}</td>
                        </>
                      )}
                    </tr>
                  ))}
                  {reportData.length === 0 && (
                    <tr><td colSpan={5} style={{ ...td, textAlign: "center", padding: 20 }}>No data available.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Field({ label, children }) {
  return <div><label style={lbl}>{label}</label>{children}</div>;
}

const headerRow = { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, marginBottom: 18, flexWrap: "wrap" };
const subtitleStyle = { margin: 0, color: "#475569" };
const titleStyle = { margin: 0, fontSize: 22, color: "#0f172a" };
const tabRow = { display: "flex", gap: 10 };
const tabStyle = { border: "1px solid #cbd5e1", background: "#fff", color: "#0f172a", padding: "10px 16px", borderRadius: 8, cursor: "pointer" };
const activeTabStyle = { ...tabStyle, background: "#0f766e", color: "#fff", borderColor: "#0f766e" };
const voucherTypeRow = { display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" };
const voucherButtonStyle = { background: "#e2e8f0", color: "#0f172a", border: "none", padding: "8px 14px", borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 500 };
const activeVoucherButtonStyle = { ...voucherButtonStyle, background: "#2563eb", color: "#fff" };
const card = { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 20, marginBottom: 18, boxShadow: "0 4px 14px rgba(15,23,42,0.06)" };
const formGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 };
const inp = { width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 14, boxSizing: "border-box" };
const btnPrimary = { background: "#2563eb", color: "#fff", border: "none", padding: "10px 18px", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 14 };
const th = { padding: "10px 8px", textAlign: "left", borderBottom: "1px solid #0d5c56" };
const td = { padding: "8px", borderBottom: "1px solid #e2e8f0" };
const tableCard = { overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: 10, background: "#fff" };
const lbl = { display: "block", marginBottom: 6, fontWeight: 600, fontSize: 13, color: "#334155" };
