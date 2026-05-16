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
  packet: "",
  gross_weight: "",
  tare_weight: "",
  dhalta: "",
  less_bags_weight: "",
  moisture: "",
  dunki: "",
  fungus: "",
  discolour: "",
  others: "",
  net_weight: "",
  bags_claim: "",
  labour: "",
  total_deduct_amount: "",
  total_qty: "",
  total_deduction: "",
  net_amount_payable: "",
  debit_account: "",
  credit_account: "",
  description: "",
});

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatMoney = (value) => toNumber(value).toFixed(2);

const purchaseDeductionFields = [
  { key: "less_bags_weight", label: "Less Bags Weight" },
  { key: "moisture", label: "Moistur" },
  { key: "dunki", label: "Dunki" },
  { key: "fungus", label: "Fungas" },
  { key: "discolour", label: "Disclour" },
  { key: "others", label: "Others" },
];

const purchaseParticulars = [
  { key: "product_id", label: "Product Name", type: "product" },
  { key: "packet", label: "Packet" },
  { key: "gross_weight", label: "Gross Weight" },
  { key: "tare_weight", label: "Tear Weight" },
  { key: "dhalta", label: "Dhalta" },
  ...purchaseDeductionFields,
  { key: "net_weight", label: "Net Weight", readOnly: true },
];

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
  const selectedWarehouse = warehouses.find((w) => String(w.id || w._id) === String(formData.warehouse_id));
  const selectedManualLocation = locations.find((l) => String(l.id || l._id) === String(formData.location_id));
  const selectedWarehouseLocation =
    locations.find((l) => String(l.id || l._id) === String(selectedWarehouse?.location_id))?.name ||
    selectedManualLocation?.name ||
    selectedWarehouse?.location ||
    selectedWarehouse?.address ||
    "";
  const selectedEmployee = employees.find((e) => String(e.id || e._id) === String(formData.employee_id));
  const selectedEmployeeMobile = selectedEmployee?.mobile || selectedEmployee?.phone || selectedEmployee?.mobile_no || "";
  const purchaseDeductionTotal = purchaseDeductionFields.reduce((sum, field) => sum + toNumber(formData[field.key]), 0);
  const purchaseNetWeight =
    toNumber(formData.gross_weight) -
    toNumber(formData.tare_weight) -
    toNumber(formData.dhalta) -
    purchaseDeductionTotal;
  const safePurchaseNetWeight = Math.max(purchaseNetWeight, 0);
  const purchaseGrossAmount = safePurchaseNetWeight * toNumber(formData.rate);
  const purchaseTotalDeduction = toNumber(formData.bags_claim) + toNumber(formData.labour) + toNumber(formData.total_deduct_amount);
  const purchaseNetPayable = Math.max(purchaseGrossAmount - purchaseTotalDeduction, 0);
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
      const numericFields = [
        "quantity",
        "rate",
        "amount",
        "packet",
        "gross_weight",
        "tare_weight",
        "dhalta",
        "less_bags_weight",
        "moisture",
        "dunki",
        "fungus",
        "discolour",
        "others",
        "net_weight",
        "bags_claim",
        "labour",
        "total_deduct_amount",
        "total_qty",
        "total_deduction",
        "net_amount_payable",
      ];
      const payload = { ...formData };
      numericFields.forEach((field) => {
        payload[field] = formData[field] ? Number(formData[field]) : 0;
      });
      if (activeVoucherType === "purchase") {
        payload.quantity = safePurchaseNetWeight;
        payload.net_weight = safePurchaseNetWeight;
        payload.total_qty = safePurchaseNetWeight;
        payload.total_deduction = purchaseTotalDeduction;
        payload.amount = purchaseNetPayable;
        payload.net_amount_payable = purchaseNetPayable;
        payload.location_id = payload.location_id || selectedWarehouse?.location_id || "";
      }
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

  const isPurchaseVoucher = activeVoucherType === "purchase";

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
              {isPurchaseVoucher ? (
                <div style={memoShell}>
                  <div style={memoHeader}>
                    <div>
                      <h2 style={memoTitle}>PURCHASE MEMO</h2>
                      <div style={memoSubTitle}>Warehouse Location: {selectedWarehouseLocation || "-"}</div>
                    </div>
                    <div style={memoHeaderFields}>
                      <Field label="Serial No.">
                        <input name="voucher_no" value={formData.voucher_no} onChange={handleChange} placeholder="Serial No *" style={inp} required />
                      </Field>
                      <Field label="Date">
                        <input name="date" type="date" value={formData.date} onChange={handleChange} style={inp} required />
                      </Field>
                    </div>
                  </div>

                  <div style={memoInfoGrid}>
                    <div style={memoPanel}>
                      <div style={memoPanelTitle}>Party Information</div>
                      <Field label="Name of Party">
                        <select name="farmer_id" value={formData.farmer_id} onChange={handleChange} style={inp}>
                          <option value="">Select Party</option>
                          {farmers.map((f) => (
                            <option key={f.id || f._id} value={f.id || f._id}>{f.name}</option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Warehouse">
                        <select name="warehouse_id" value={formData.warehouse_id} onChange={handleChange} style={inp}>
                          <option value="">Select Warehouse</option>
                          {warehouses.map((w) => (
                            <option key={w.id || w._id} value={w.id || w._id}>{w.name}</option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Mobile No.">
                        <input value={selectedEmployeeMobile} placeholder="Employee mobile" style={readOnlyInp} readOnly />
                      </Field>
                      <Field label="Employee">
                        <select name="employee_id" value={formData.employee_id} onChange={handleChange} style={inp}>
                          <option value="">Select Employee</option>
                          {employees.map((e) => (
                            <option key={e.id || e._id} value={e.id || e._id}>{e.name}</option>
                          ))}
                        </select>
                      </Field>
                    </div>

                    <div style={memoPanel}>
                      <div style={memoPanelTitle}>Document Information</div>
                      <Field label="Location">
                        <input value={selectedWarehouseLocation} placeholder="Warehouse location" style={readOnlyInp} readOnly />
                      </Field>
                      <Field label="Manual Location">
                        <select name="location_id" value={formData.location_id} onChange={handleChange} style={inp}>
                          <option value="">Select Location</option>
                          {locations.map((l) => (
                            <option key={l.id || l._id} value={l.id || l._id}>{l.name}</option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Remarks">
                        <textarea name="description" value={formData.description} onChange={handleChange} rows={3} style={{ ...inp, resize: "vertical" }} />
                      </Field>
                    </div>
                  </div>

                  <div style={memoMainGrid}>
                    <div style={memoPanel}>
                      <div style={memoPanelTitle}>Remarks</div>
                      <textarea name="description" value={formData.description} onChange={handleChange} rows={12} style={{ ...inp, minHeight: 332, resize: "vertical" }} />
                    </div>
                    <div style={tableCard}>
                      <table style={memoTable}>
                        <thead>
                          <tr>
                            <th style={memoTh}>#</th>
                            <th style={memoTh}>Particulars</th>
                            <th style={memoTh}>Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {purchaseParticulars.map((item, index) => (
                            <tr key={item.key}>
                              <td style={memoTd}>{index + 1}</td>
                              <td style={memoTd}>{item.label}</td>
                              <td style={memoTd}>
                                {item.type === "product" ? (
                                  <select name="product_id" value={formData.product_id} onChange={handleChange} style={tableInput}>
                                    <option value="">Select Product</option>
                                    {products.map((p) => (
                                      <option key={p.id || p._id} value={p.id || p._id}>{p.name}</option>
                                    ))}
                                  </select>
                                ) : item.readOnly ? (
                                  <input value={formatMoney(safePurchaseNetWeight)} style={tableInput} readOnly />
                                ) : (
                                  <input name={item.key} type="number" step="0.01" value={formData[item.key]} onChange={handleChange} style={tableInput} />
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div style={memoBottomGrid}>
                    <SummaryInput label="Purchase Kg." value={formatMoney(safePurchaseNetWeight)} readOnly />
                    <SummaryInput label="Rate" name="rate" value={formData.rate} onChange={handleChange} />
                    <SummaryInput label="Bags Claim" name="bags_claim" value={formData.bags_claim} onChange={handleChange} />
                    <SummaryInput label="Labour" name="labour" value={formData.labour} onChange={handleChange} />
                    <SummaryInput label="Total Deduct Amount" name="total_deduct_amount" value={formData.total_deduct_amount} onChange={handleChange} />
                  </div>

                  <div style={memoTotals}>
                    <div style={totalLine}><span>Total Qnt</span><strong>{formatMoney(safePurchaseNetWeight)}</strong></div>
                    <div style={totalLine}><span>Total Deduction</span><strong>{formatMoney(purchaseTotalDeduction)}</strong></div>
                    <div style={payableLine}><span>Net Amount Payable</span><strong>{formatMoney(purchaseNetPayable)}</strong></div>
                  </div>
                </div>
              ) : (
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
              )}
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
                      <td style={td}>{warehouses.find(w => String(w.id || w._id) === String(item.warehouse_id))?.name || "-"}</td>
                      {(activeVoucherType === "purchase" || activeVoucherType === "payment") && (
                        <td style={td}>{farmers.find(f => String(f.id || f._id) === String(item.farmer_id))?.name || "-"}</td>
                      )}
                      {(activeVoucherType === "sale" || activeVoucherType === "receipt") && (
                        <td style={td}>{companies.find(c => String(c.id || c._id) === String(item.company_id))?.name || "-"}</td>
                      )}
                      {(activeVoucherType === "purchase" || activeVoucherType === "sale") && (
                        <>
                          <td style={td}>{products.find(p => String(p.id || p._id) === String(item.product_id))?.name || "-"}</td>
                          <td style={td}>{activeVoucherType === "purchase" ? item.total_qty || item.net_weight || item.quantity || 0 : item.quantity || 0}</td>
                          <td style={td}>{item.rate || 0}</td>
                        </>
                      )}
                      <td style={td}>{activeVoucherType === "purchase" ? item.net_amount_payable || item.amount || 0 : item.amount || 0}</td>
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
                      <td style={td}>{item.warehouse_name || warehouses.find(w => String(w.id || w._id) === String(item.warehouse_id))?.name || "-"}</td>
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

function SummaryInput({ label, name, value, onChange, readOnly = false }) {
  return (
    <div style={summaryBox}>
      <label style={summaryLabel}>{label}</label>
      <input
        name={name}
        type={readOnly ? "text" : "number"}
        step="0.01"
        value={value}
        onChange={onChange}
        readOnly={readOnly}
        style={readOnly ? summaryReadOnlyInput : summaryInput}
      />
    </div>
  );
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
const readOnlyInp = { ...inp, background: "#f8fafc", color: "#475569" };
const btnPrimary = { background: "#2563eb", color: "#fff", border: "none", padding: "10px 18px", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 14 };
const th = { padding: "10px 8px", textAlign: "left", borderBottom: "1px solid #0d5c56" };
const td = { padding: "8px", borderBottom: "1px solid #e2e8f0" };
const tableCard = { overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: 10, background: "#fff" };
const lbl = { display: "block", marginBottom: 6, fontWeight: 600, fontSize: 13, color: "#334155" };
const memoShell = { border: "1px solid #d7dee8", borderRadius: 10, padding: 18, background: "#fbfdff" };
const memoHeader = { display: "flex", justifyContent: "space-between", gap: 18, alignItems: "flex-start", borderBottom: "2px solid #ea580c", paddingBottom: 14, marginBottom: 16, flexWrap: "wrap" };
const memoTitle = { margin: 0, color: "#0b2a5b", fontSize: 28, letterSpacing: 0, fontWeight: 800 };
const memoSubTitle = { marginTop: 8, color: "#334155", fontSize: 14, fontWeight: 600 };
const memoHeaderFields = { display: "grid", gridTemplateColumns: "repeat(2, minmax(150px, 1fr))", gap: 12, minWidth: 320 };
const memoInfoGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16, marginBottom: 16 };
const memoMainGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16, marginBottom: 18 };
const memoPanel = { border: "1px solid #d7dee8", borderRadius: 8, padding: 16, background: "#fff" };
const memoPanelTitle = { background: "#0b2a5b", color: "#fff", fontWeight: 800, textTransform: "uppercase", fontSize: 13, padding: "8px 12px", borderRadius: 6, margin: "-16px -16px 14px -16px" };
const memoTable = { width: "100%", borderCollapse: "collapse", fontSize: 14 };
const memoTh = { background: "#0b2a5b", color: "#fff", padding: "10px 8px", textAlign: "left", border: "1px solid #173a70" };
const memoTd = { padding: "7px 8px", border: "1px solid #e2e8f0", verticalAlign: "middle" };
const tableInput = { width: "100%", border: "1px solid #cbd5e1", borderRadius: 6, padding: "7px 8px", boxSizing: "border-box", fontSize: 13 };
const memoBottomGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10, marginBottom: 16 };
const summaryBox = { border: "1px solid #d7dee8", borderRadius: 8, background: "#fff", overflow: "hidden" };
const summaryLabel = { display: "block", padding: "9px 10px", color: "#0b2a5b", fontSize: 12, fontWeight: 800, textTransform: "uppercase", borderBottom: "1px solid #e2e8f0" };
const summaryInput = { width: "100%", border: "none", padding: "12px 10px", color: "#ea580c", fontWeight: 800, fontSize: 15, textAlign: "center", boxSizing: "border-box" };
const summaryReadOnlyInput = { ...summaryInput, background: "#f8fafc" };
const memoTotals = { width: "min(100%, 420px)", marginLeft: "auto", border: "1px solid #d7dee8", borderRadius: 8, overflow: "hidden", background: "#fff" };
const totalLine = { display: "flex", justifyContent: "space-between", gap: 12, padding: "12px 16px", borderBottom: "1px solid #e2e8f0", color: "#0f172a", fontWeight: 700 };
const payableLine = { ...totalLine, borderBottom: "none", background: "#0b2a5b", color: "#fff" };
