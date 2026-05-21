import React, { useEffect, useState } from "react";
import axios from "axios";
import { useSearchParams } from "react-router-dom";
import { hasPermission, loadSession } from "../utils/auth";

const defaultForm = () => ({
  voucher_no: "",
  date: new Date().toISOString().slice(0, 10),
  unloading_date: "",
  warehouse_id: "",
  farmer_id: "",
  company_id: "",
  company_account_id: "",
  consignee_id: "",
  product_id: "",
  reference_type: "",
  reference_id: "",
  employee_id: "",
  location_id: "",
  quantity: "",
  shortage_quantity: "",
  unloading_qty: "",
  rate: "",
  amount: "",
  claim_amount: "",
  other_deduction: "",
  adjustment_amount: "",
  tds_amount: "",
  net_amount: "",
  net_receivable_amount: "",
  fifo_rate: "",
  fifo_amount: "",
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
  round_off: "",
  debit_account: "",
  credit_account: "",
  description: "",
});

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const getRecordId = (value) => value?._id || value?.id || value || "";
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
  const [companyAccounts, setCompanyAccounts] = useState([]);
  const [consignees, setConsignees] = useState([]);
  const [products, setProducts] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [locations, setLocations] = useState([]);

  const [formData, setFormData] = useState(defaultForm());
  const [editId, setEditId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [list, setList] = useState([]);
  const [reportData, setReportData] = useState([]);
  const [partyOutstanding, setPartyOutstanding] = useState(null);
  const [voucherNumberLoading, setVoucherNumberLoading] = useState(false);
  const selectedWarehouse = warehouses.find((w) => String(w.id || w._id) === String(formData.warehouse_id));
  const selectedManualLocation = locations.find((l) => String(l.id || l._id) === String(formData.location_id));
  const selectedWarehouseLocation =
    locations.find((l) => String(l.id || l._id) === String(getRecordId(selectedWarehouse?.location_id)))?.name ||
    selectedManualLocation?.name ||
    selectedWarehouse?.location ||
    selectedWarehouse?.address ||
    "";
  const selectedEmployee = employees.find((e) => String(e.id || e._id) === String(formData.employee_id));
  const selectedFarmer = farmers.find((f) => String(f.id || f._id) === String(formData.farmer_id));
  const selectedEmployeeMobile = selectedEmployee?.mobile || selectedEmployee?.phone || selectedEmployee?.mobile_no || "";
  const selectedFarmerMobile = selectedFarmer?.mobile || selectedFarmer?.phone || selectedFarmer?.mobile_no || "";
  const selectedFarmerGst = selectedFarmer?.gst_no || selectedFarmer?.gst || "";
  const selectedFarmerPan = selectedFarmer?.pan_no || selectedFarmer?.pan || "";
  const selectedFarmerState = selectedFarmer?.state || "";
  const selectedLocationName = selectedWarehouseLocation || selectedManualLocation?.name || "";
  const getProductName = (item) =>
    item?.product_name ||
    products.find((p) => String(p.id || p._id) === String(item?.product_id))?.name ||
    item?.product ||
    "-";
  const getWarehouseName = (item) =>
    item?.warehouse_name ||
    warehouses.find((w) => String(w.id || w._id) === String(item?.warehouse_id))?.name ||
    "-";
  const getFarmerName = (item) =>
    item?.farmer_name ||
    farmers.find((f) => String(f.id || f._id) === String(item?.farmer_id))?.name ||
    "-";
  const purchaseDeductionTotal = purchaseDeductionFields.reduce((sum, field) => sum + toNumber(formData[field.key]), 0);
  const purchaseNetWeight =
    toNumber(formData.gross_weight) -
    toNumber(formData.tare_weight) -
    toNumber(formData.dhalta) -
    purchaseDeductionTotal;
  const safePurchaseNetWeight = Math.max(purchaseNetWeight, 0);
  const purchaseGrossAmount = safePurchaseNetWeight * toNumber(formData.rate);
  const purchaseTotalDeduction = toNumber(formData.bags_claim) + toNumber(formData.labour);
  const purchaseRoundOff = toNumber(formData.round_off);
  const purchaseNetPayable = Math.max(purchaseGrossAmount - purchaseTotalDeduction + purchaseRoundOff, 0);
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
  }, [searchParams]);

  // Load voucher list when type changes
  useEffect(() => {
    if (activeTab === "vouchers") {
      loadVouchers();
    }
  }, [activeTab, activeVoucherType]);

  useEffect(() => {
    if (activeTab === "vouchers") {
      fetchNextVoucherNo(activeVoucherType);
      setPartyOutstanding(null);
      setFormData((prev) => ({ ...prev, reference_type: "", reference_id: "" }));
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
      const [wRes, fRes, cRes, caRes, coRes, pRes, eRes, lRes] = await Promise.allSettled([
        axios.get("/api/warehouses"),
        axios.get("/api/farmers"),
        axios.get("/api/companies"),
        axios.get("/api/company-accounts"),
        axios.get("/api/consignee-names"),
        axios.get("/api/products"),
        axios.get("/api/employees"),
        axios.get("/api/locations"),
      ]);
      const dataOf = (result) => (result.status === "fulfilled" ? result.value.data : []);
      setWarehouses(Array.isArray(dataOf(wRes)) ? dataOf(wRes) : []);
      setFarmers(Array.isArray(dataOf(fRes)) ? dataOf(fRes) : []);
      setCompanies(Array.isArray(dataOf(cRes)) ? dataOf(cRes) : []);
      setCompanyAccounts(Array.isArray(dataOf(caRes)) ? dataOf(caRes) : []);
      setConsignees(Array.isArray(dataOf(coRes)) ? dataOf(coRes) : []);
      setProducts(Array.isArray(dataOf(pRes)) ? dataOf(pRes) : []);
      setEmployees(Array.isArray(dataOf(eRes)) ? dataOf(eRes) : []);
      setLocations(Array.isArray(dataOf(lRes)) ? dataOf(lRes) : []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchNextVoucherNo = async (type) => {
    try {
      setVoucherNumberLoading(true);
      const res = await axios.get(`/api/wh-vouchers/next-voucher-no`, { params: { type } });
      if (res.data?.voucher_no) {
        setFormData((prev) => ({ ...prev, voucher_no: prev.voucher_no || res.data.voucher_no }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setVoucherNumberLoading(false);
    }
  };

  const loadOutstanding = async (partyType, partyId, warehouseId = null) => {
    if (!partyType || !partyId) {
      setPartyOutstanding(null);
      return;
    }
    try {
      const params = { party_type: partyType, id: partyId };
      const warehouse = warehouseId || formData.warehouse_id;
      if (warehouse) params.warehouse_id = warehouse;
      const res = await axios.get(`/api/wh-vouchers/outstanding`, { params });
      setPartyOutstanding(res.data || null);
    } catch (err) {
      console.error(err);
      setPartyOutstanding(null);
    }
  };

  const loadVouchers = async () => {
    try {
      if (!hasPermission(user, voucherPermissionMap[activeVoucherType])) {
        setList([]);
        return;
      }
      const res = await axios.get(`/api/wh-vouchers/${activeVoucherType}`);
      const rows = Array.isArray(res.data) ? res.data : [];
      setList(
        rows.slice().sort((a, b) => {
          const dateSort = String(b.date || "").localeCompare(String(a.date || ""));
          if (dateSort) return dateSort;
          return Number(b.id || b._id || 0) - Number(a.id || a._id || 0);
        })
      );
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
      const rows = Array.isArray(res.data) ? res.data : [];
      if (activeReport === "purchase" && rows.length === 0 && hasPermission(user, voucherPermissionMap.purchase)) {
        const fallbackRes = await axios.get("/api/wh-vouchers/purchase");
        setReportData(Array.isArray(fallbackRes.data) ? fallbackRes.data : []);
        return;
      }
      setReportData(rows);
    } catch (err) {
      console.error(err);
      if (activeReport === "purchase" && hasPermission(user, voucherPermissionMap.purchase)) {
        try {
          const fallbackRes = await axios.get("/api/wh-vouchers/purchase");
          setReportData(Array.isArray(fallbackRes.data) ? fallbackRes.data : []);
          return;
        } catch (fallbackErr) {
          console.error(fallbackErr);
        }
      }
      setReportData([]);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const next = { ...prev, [name]: value };
      if (name === "warehouse_id") {
        const warehouse = warehouses.find((w) => String(w.id || w._id) === String(value));
        next.location_id = getRecordId(warehouse?.location_id);
        next.employee_id = getRecordId(warehouse?.employee_id) || prev.employee_id || "";
      }
      return next;
    });

    if (activeVoucherType === "payment" && name === "farmer_id") {
      loadOutstanding("farmer", value);
    }
    if (activeVoucherType === "receipt" && name === "company_id") {
      loadOutstanding("company", value);
    }
    if (name === "warehouse_id") {
      if (activeVoucherType === "payment" && formData.farmer_id) {
        loadOutstanding("farmer", formData.farmer_id, value);
      }
      if (activeVoucherType === "receipt" && formData.company_id) {
        loadOutstanding("company", formData.company_id, value);
      }
    }
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
        "shortage_quantity",
        "unloading_qty",
        "rate",
        "amount",
        "claim_amount",
        "other_deduction",
        "adjustment_amount",
        "tds_amount",
        "net_receivable_amount",
        "fifo_rate",
        "fifo_amount",
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
        "round_off",
      ];
      const payload = { ...formData };
      numericFields.forEach((field) => {
        payload[field] = formData[field] ? Number(formData[field]) : 0;
      });
      if (activeVoucherType === "purchase") {
        payload.quantity = safePurchaseNetWeight;
        payload.net_weight = safePurchaseNetWeight;
        payload.total_qty = safePurchaseNetWeight;
        payload.total_deduct_amount = 0;
        payload.total_deduction = purchaseTotalDeduction;
        payload.amount = purchaseNetPayable;
        payload.net_amount_payable = purchaseNetPayable;
        payload.location_id = payload.location_id || selectedWarehouse?.location_id || "";
      }
      if (activeVoucherType === "sale") {
        const claimAmount = Number(formData.claim_amount) || 0;
        const otherDeduction = Number(formData.other_deduction) || 0;
        const adjustmentAmount = Number(formData.adjustment_amount) || 0;
        const tdsAmount = Number(formData.tds_amount) || 0;
        const grossAmount = Number(formData.amount) || 0;
        const netAmount = grossAmount - claimAmount - otherDeduction - adjustmentAmount - tdsAmount;
        payload.net_amount = netAmount;
        payload.net_receivable_amount = netAmount;
        payload.outstanding = netAmount;
        const qtyForFifo = Number(formData.unloading_qty || formData.quantity) || 0;
        payload.fifo_rate = qtyForFifo > 0 ? grossAmount / qtyForFifo : 0;
        payload.fifo_amount = grossAmount;
      }
      
      const isEdit = editId && String(editId).trim();
      const url = isEdit ? `/api/wh-vouchers/${activeVoucherType}/${editId}` : `/api/wh-vouchers/${activeVoucherType}`;
      const method = isEdit ? "put" : "post";
      const res = isEdit ? await axios.put(url, payload) : await axios.post(url, payload);
      
      alert(`Voucher ${isEdit ? "updated" : "saved"} successfully`);
      if (res.data?.stats) {
        setPartyOutstanding(res.data.stats);
      }
      setFormData(defaultForm());
      setEditId(null);
      loadVouchers();
      fetchNextVoucherNo(activeVoucherType);
      if (activeVoucherType === "purchase") {
        setActiveTab("reports");
        setActiveReport("purchase");
        try {
          const reportRes = await axios.get("/api/wh-vouchers/report/purchase-summary");
          const rows = Array.isArray(reportRes.data) ? reportRes.data : [];
          if (rows.length) {
            setReportData(rows);
          } else {
            const fallbackRes = await axios.get("/api/wh-vouchers/purchase");
            setReportData(Array.isArray(fallbackRes.data) ? fallbackRes.data : []);
          }
        } catch (reportErr) {
          console.error(reportErr);
          const fallbackRes = await axios.get("/api/wh-vouchers/purchase");
          setReportData(Array.isArray(fallbackRes.data) ? fallbackRes.data : []);
        }
      }
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.error || `Failed to ${editId ? "update" : "save"} voucher`);
    } finally {
      setLoading(false);
    }
  };

  const isPurchaseVoucher = activeVoucherType === "purchase";

  const handleDeleteVoucher = async (voucherId) => {
    if (!window.confirm("Are you sure you want to delete this voucher?")) return;
    try {
      await axios.delete(`/api/wh-vouchers/${activeVoucherType}/${voucherId}`);
      alert("Voucher deleted successfully");
      loadVouchers();
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.error || "Failed to delete voucher");
    }
  };

  const handleEditVoucher = (voucherId) => {
    const voucher = list.find(v => String(v.id || v._id) === String(voucherId));
    if (voucher) {
      setFormData({ ...defaultForm(), ...voucher });
      setEditId(voucherId);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleEditPurchaseReport = (voucher) => {
    const voucherId = voucher?.id || voucher?._id;
    if (!voucherId) return;
    setActiveTab("vouchers");
    setActiveVoucherType("purchase");
    setFormData({ ...defaultForm(), ...voucher });
    setEditId(voucherId);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleGeneratePDF = async (voucherId) => {
    try {
      const response = await axios.get(`/api/wh-vouchers/${activeVoucherType}/${voucherId}/pdf`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Purchase-Voucher-${voucherId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (err) {
      console.error(err);
      alert("Failed to generate PDF");
    }
  };

  const handlePurchaseReportPDF = async (voucherId) => {
    try {
      const response = await axios.get(`/api/wh-vouchers/purchase/${voucherId}/pdf`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Purchase-Memo-${voucherId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (err) {
      console.error(err);
      alert("Failed to generate PDF");
    }
  };

  const renderAccountSelect = (style = inp) => (
    <select name="company_account_id" value={formData.company_account_id} onChange={handleChange} style={style}>
      <option value="">Select Account</option>
      {companyAccounts.map((account) => (
        <option key={account.id || account._id} value={account.id || account._id}>
          {account.account_name || account.name}
        </option>
      ))}
    </select>
  );

  const getAccountName = (item) =>
    item.company_account_name ||
    companyAccounts.find((account) => String(account.id || account._id) === String(item.company_account_id))?.account_name ||
    companyAccounts.find((account) => String(account.id || account._id) === String(item.company_account_id))?.name ||
    "-";

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
            <h3 style={{ marginTop: 0 }}>{editId ? "Edit" : "New"} {activeVoucherType.charAt(0).toUpperCase() + activeVoucherType.slice(1)} Voucher</h3>
            <form onSubmit={handleSubmit}>
              {isPurchaseVoucher ? (
                <div style={erpShell}>
                  <div style={erpTitleBar}>
                    <div style={erpTitleLeft}>
                      <span style={erpDocIcon}>P</span>
                      <span style={erpTitleText}>Purchase</span>
                    </div>
                    <div style={erpMetaLine}>
                      <span>Subdocument : <strong>Purchase</strong></span>
                      <span>Type : <strong>{editId ? "Regular [ Edit ]" : "Regular [ New ]"}</strong></span>
                      <span>Location</span>
                      <input value={selectedLocationName || ""} readOnly style={{ ...erpInput, width: 120 }} />
                    </div>
                  </div>

                  <div style={erpTopGrid}>
                    <div style={erpPanelWide}>
                      <div style={erpRow}>
                        <label style={erpLabel}>Name</label>
                        <select name="farmer_id" value={formData.farmer_id} onChange={handleChange} style={{ ...erpInput, ...erpFocusInput }}>
                          <option value="">Select Party</option>
                          {farmers.map((f) => (
                            <option key={f.id || f._id} value={f.id || f._id}>{f.name}</option>
                          ))}
                        </select>
                      </div>
                      <div style={erpRow}>
                        <label style={erpLabel}>Account</label>
                        {renderAccountSelect(erpInput)}
                      </div>
                      <div style={erpRow}>
                        <label style={erpLabel}>GSTIN</label>
                        <input value={selectedFarmerGst} readOnly style={erpInput} />
                        <label style={{ ...erpLabel, width: 42, textAlign: "right" }}>State</label>
                        <input value={selectedFarmerState} readOnly style={{ ...erpInput, width: 90 }} />
                      </div>
                      <div style={erpRow}>
                        <label style={erpLabel}>PAN No.</label>
                        <input value={selectedFarmerPan} readOnly style={erpInput} />
                        <label style={{ ...erpLabel, width: 50, textAlign: "right" }}>Mobile</label>
                        <input value={selectedFarmerMobile} readOnly style={{ ...erpInput, width: 110 }} />
                      </div>
                    </div>

                    <div style={erpPanelWide}>
                      <div style={erpRow}>
                        <label style={erpLabel}>Warehouse Name</label>
                        <select name="warehouse_id" value={formData.warehouse_id} onChange={handleChange} style={erpInput}>
                          <option value="">Select Warehouse</option>
                          {warehouses.map((w) => (
                            <option key={w.id || w._id} value={w.id || w._id}>{w.name}</option>
                          ))}
                        </select>
                      </div>
                      <div style={erpRow}>
                        <label style={erpLabel}>Employee Name</label>
                        <select name="employee_id" value={formData.employee_id} onChange={handleChange} style={erpInput}>
                          <option value="">Select Employee</option>
                          {employees.map((e) => (
                            <option key={e.id || e._id} value={e.id || e._id}>{e.name}</option>
                          ))}
                        </select>
                      </div>
                      <div style={erpRow}>
                        <label style={erpLabel}>Employee Mobile</label>
                        <input value={selectedEmployeeMobile} readOnly style={erpInput} />
                      </div>
                    </div>

                    <div style={erpDocPanel}>
                      <div style={erpRow}>
                        <label style={erpLabel}>Number</label>
                        <input name="voucher_no" value={formData.voucher_no} onChange={handleChange} placeholder="Voucher No *" style={erpInput} required />
                      </div>
                      <div style={erpRow}>
                        <label style={erpLabel}>Date</label>
                        <input name="date" type="date" value={formData.date} onChange={handleChange} style={erpInput} required />
                      </div>
                      <div style={erpRow}>
                        <label style={erpLabel}>R. S. T No</label>
                        <input name="reference_id" value={formData.reference_id} onChange={handleChange} placeholder="R. S. T No" style={erpInput} />
                      </div>
                    </div>
                  </div>

                  <div style={erpSectionLabel}>GOODS PURCHASE DETAILS</div>
                  <div style={erpGridWrap}>
                    <table style={erpItemsTable}>
                      <thead>
                        <tr>
                          <th style={{ ...erpTh, width: 54 }}>S.L No</th>
                          <th style={{ ...erpTh, minWidth: 250 }}>Product</th>
                          <th style={erpTh}>Packet</th>
                          <th style={erpTh}>Gross Wt</th>
                          <th style={erpTh}>Tare Wt</th>
                          <th style={erpTh}>Dhalta</th>
                          {purchaseDeductionFields.map((field) => (
                            <th key={field.key} style={erpTh}>{field.label}</th>
                          ))}
                          <th style={erpTh}>Net Qty (Auto)</th>
                          <th style={erpTh}>Rate</th>
                          <th style={erpTh}>Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td style={{ ...erpTd, textAlign: "center", fontWeight: 700 }}>1</td>
                          <td style={erpTd}>
                            <select name="product_id" value={formData.product_id} onChange={handleChange} style={erpCellInput}>
                              <option value="">Select Product</option>
                              {products.map((p) => (
                                <option key={p.id || p._id} value={p.id || p._id}>{p.name}</option>
                              ))}
                            </select>
                          </td>
                          <td style={erpTd}><input name="packet" type="number" step="0.01" value={formData.packet} onChange={handleChange} style={erpCellInput} /></td>
                          <td style={erpTd}><input name="gross_weight" type="number" step="0.01" value={formData.gross_weight} onChange={handleChange} style={erpCellInput} /></td>
                          <td style={erpTd}><input name="tare_weight" type="number" step="0.01" value={formData.tare_weight} onChange={handleChange} style={erpCellInput} /></td>
                          <td style={erpTd}><input name="dhalta" type="number" step="0.01" value={formData.dhalta} onChange={handleChange} style={erpCellInput} /></td>
                          {purchaseDeductionFields.map((field) => (
                            <td key={field.key} style={erpTd}>
                              <input name={field.key} type="number" step="0.01" value={formData[field.key]} onChange={handleChange} style={erpCellInput} />
                            </td>
                          ))}
                          <td style={erpTd}><input value={formatMoney(safePurchaseNetWeight)} readOnly style={{ ...erpCellInput, ...erpReadOnlyCell }} /></td>
                          <td style={erpTd}><input name="rate" type="number" step="0.01" value={formData.rate} onChange={handleChange} style={erpCellInput} /></td>
                          <td style={erpTd}><input value={formatMoney(purchaseGrossAmount)} readOnly style={{ ...erpCellInput, ...erpReadOnlyCell }} /></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div style={erpMiddleBar}>
                      <span>Net Qty = Gross Wt - Tare Wt - Dhalta - Less Bags Weight - Moistur - Dunki - Fungas - Disclour - Others</span>
                      <strong>Total Quantity : {formatMoney(safePurchaseNetWeight)}</strong>
                  </div>

                  <div style={erpBottomGrid}>
                    <div>
                      <table style={erpMiniTable}>
                        <thead>
                          <tr><th style={erpTh}>Particulars</th><th style={erpTh}>Amount</th></tr>
                        </thead>
                        <tbody>
                          <tr><td style={erpTd}>Bags Claim</td><td style={erpTd}><input name="bags_claim" type="number" step="0.01" value={formData.bags_claim} onChange={handleChange} style={erpCellInput} /></td></tr>
                          <tr><td style={erpTd}>Labour</td><td style={erpTd}><input name="labour" type="number" step="0.01" value={formData.labour} onChange={handleChange} style={erpCellInput} /></td></tr>
                          <tr><td style={{ ...erpTd, fontWeight: 700 }}>Total Deduction</td><td style={{ ...erpTd, fontWeight: 700 }}>{formatMoney(purchaseTotalDeduction)}</td></tr>
                          <tr><td style={erpTd}>Round Off</td><td style={erpTd}><input name="round_off" type="number" step="0.01" value={formData.round_off} onChange={handleChange} style={erpCellInput} /></td></tr>
                        </tbody>
                      </table>
                      <div style={erpRemarksRow}>
                        <label style={erpLabel}>Narration</label>
                        <textarea name="description" value={formData.description} onChange={handleChange} rows={2} style={erpTextarea} />
                      </div>
                    </div>

                    <div>
                      <table style={erpMiniTable}>
                        <thead>
                          <tr><th style={erpTh}>Purchase Summary</th><th style={erpTh}>Amount</th></tr>
                        </thead>
                        <tbody>
                          <tr><td style={erpTd}>Gross Amount</td><td style={erpTd}>{formatMoney(purchaseGrossAmount)}</td></tr>
                          <tr><td style={erpTd}>Total Deduction</td><td style={erpTd}>{formatMoney(purchaseTotalDeduction)}</td></tr>
                          <tr><td style={erpTd}>Round Off</td><td style={erpTd}>{formatMoney(purchaseRoundOff)}</td></tr>
                          <tr><td style={erpTd}>Net Amount Payable</td><td style={erpTd}>{formatMoney(purchaseNetPayable)}</td></tr>
                        </tbody>
                      </table>

                      <div style={erpTotalPanel}>
                        <span style={erpTotalLabel}>T O T A L</span>
                        <strong style={erpTotalAmount}>{formatMoney(purchaseNetPayable)}</strong>
                      </div>
                    </div>
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
                <Field label="Account">
                  {renderAccountSelect(inp)}
                </Field>

                {(activeVoucherType === "purchase" || activeVoucherType === "payment") && (
                  <>
                    <Field label="Farmer (Creditor)">
                      <select name="farmer_id" value={formData.farmer_id} onChange={handleChange} style={inp}>
                        <option value="">Select Farmer</option>
                        {farmers.map((f) => (
                          <option key={f._id} value={f._id}>{f.name}</option>
                        ))}
                      </select>
                    </Field>
                    {partyOutstanding && activeVoucherType === "payment" && (
                      <div style={{ marginTop: 8, fontSize: 13, color: "#444" }}>
                        Current outstanding: ₹{Number(partyOutstanding.outstanding || 0).toFixed(2)}
                      </div>
                    )}
                  </>
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
                    {partyOutstanding && activeVoucherType === "receipt" && (
                      <div style={{ marginTop: 8, fontSize: 13, color: "#444" }}>
                        Current outstanding: ₹{Number(partyOutstanding.outstanding || 0).toFixed(2)}
                      </div>
                    )}
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
                    <Field label={activeVoucherType === "sale" ? "Loading Date" : "Date"}>
                      <input name="date" type="date" value={formData.date} onChange={handleChange} style={inp} />
                    </Field>
                    {activeVoucherType === "sale" && (
                      <Field label="Unloading Date">
                        <input name="unloading_date" type="date" value={formData.unloading_date} onChange={handleChange} style={inp} />
                      </Field>
                    )}
                    <Field label="Quantity">
                      <input name="quantity" type="number" step="0.01" value={formData.quantity} onChange={handleChange} style={inp} />
                    </Field>
                    {activeVoucherType === "sale" && (
                      <Field label="Shortage Quantity">
                        <input name="shortage_quantity" type="number" step="0.01" value={formData.shortage_quantity} onChange={handleChange} style={inp} />
                      </Field>
                    )}
                    <Field label="Rate">
                      <input name="rate" type="number" step="0.01" value={formData.rate} onChange={handleChange} style={inp} />
                    </Field>
                    <Field label="Amount">
                      <input name="amount" type="number" step="0.01" value={formData.amount} onChange={handleChange} style={inp} />
                    </Field>
                    {activeVoucherType === "sale" && (
                      <>
                        <Field label="Claim Amount">
                          <input name="claim_amount" type="number" step="0.01" value={formData.claim_amount} onChange={handleChange} style={inp} />
                        </Field>
                        <Field label="Other Deduction">
                          <input name="other_deduction" type="number" step="0.01" value={formData.other_deduction} onChange={handleChange} style={inp} />
                        </Field>
                        <Field label="Adjustment Amount">
                          <input name="adjustment_amount" type="number" step="0.01" value={formData.adjustment_amount} onChange={handleChange} style={inp} />
                        </Field>
                        <Field label="TDS Amount">
                          <input name="tds_amount" type="number" step="0.01" value={formData.tds_amount} onChange={handleChange} style={inp} />
                        </Field>
                        <Field label="Unloading Qty">
                          <input name="unloading_qty" type="number" step="0.01" value={formData.unloading_qty} onChange={handleChange} style={inp} />
                        </Field>
                        <Field label="Net Receivable">
                          <input value={(toNumber(formData.amount) - toNumber(formData.claim_amount) - toNumber(formData.other_deduction) - toNumber(formData.adjustment_amount) - toNumber(formData.tds_amount)).toFixed(2)} readOnly style={readOnlyInp} />
                        </Field>
                        <Field label="FIFO Amount">
                          <input value={toNumber(formData.amount).toFixed(2)} readOnly style={readOnlyInp} />
                        </Field>
                        <div style={{ marginTop: 8, fontSize: 13, color: "#444" }}>
                          Outstanding: Rs.{(toNumber(formData.amount) - toNumber(formData.claim_amount) - toNumber(formData.other_deduction) - toNumber(formData.adjustment_amount) - toNumber(formData.tds_amount)).toFixed(2)}
                        </div>
                      </>
                    )}
                  </>
                )}

                {(activeVoucherType === "payment" || activeVoucherType === "receipt") && (
                  <>
                    <Field label="Reference Type">
                      <select name="reference_type" value={formData.reference_type} onChange={handleChange} style={inp}>
                        <option value="">Select Reference</option>
                        <option value="purchase">Purchase Bill</option>
                        <option value="sale">Sale Bill</option>
                        <option value="other">Other</option>
                      </select>
                    </Field>
                    <Field label="Reference ID">
                      <input name="reference_id" value={formData.reference_id} onChange={handleChange} style={inp} placeholder="Optional bill ID" />
                    </Field>
                    <Field label="Amount">
                      <input name="amount" type="number" step="0.01" value={formData.amount} onChange={handleChange} style={inp} required />
                    </Field>
                  </>
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
              <div style={{ marginTop: 16, display: "flex", gap: 10 }}>
                <button type="submit" disabled={loading} style={btnPrimary}>{loading ? "Saving..." : editId ? "Update Voucher" : "Save Voucher"}</button>
                {editId && (
                  <button type="button" onClick={() => { setEditId(null); setFormData(defaultForm()); }} style={{ ...btnPrimary, background: "#64748b" }}>Cancel</button>
                )}
              </div>
            </form>
          </div>

          {activeVoucherType !== "purchase" && (
          <div style={card}>
            <h3 style={{ marginTop: 0 }}>{activeVoucherType.charAt(0).toUpperCase() + activeVoucherType.slice(1)} Vouchers</h3>
            <div style={tableCard}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={reportHeaderRowStyle}>
                    <th style={th}>S.L No</th>
                    <th style={th}>Date</th>
                    <th style={th}>Voucher No</th>
                    <th style={th}>Warehouse</th>
                    <th style={th}>Account</th>
                    {(activeVoucherType === "purchase" || activeVoucherType === "payment") && <th style={th}>Farmer</th>}
                    {(activeVoucherType === "sale" || activeVoucherType === "receipt") && <th style={th}>Company</th>}
                    {(activeVoucherType === "purchase" || activeVoucherType === "sale") && <th style={th}>Product</th>}
                    {(activeVoucherType === "purchase" || activeVoucherType === "sale") && <th style={th}>Qty</th>}
                    {(activeVoucherType === "purchase" || activeVoucherType === "sale") && <th style={th}>Rate</th>}
                    <th style={th}>Amount</th>
                    <th style={th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((item, i) => (
                    <tr key={item.id || i} style={{ background: i % 2 ? "#f8fafc" : "#fff" }}>
                      <td style={td}>{i + 1}</td>
                      <td style={td}>{item.date}</td>
                      <td style={td}>{item.voucher_no}</td>
                      <td style={td}>{getWarehouseName(item)}</td>
                      <td style={td}>{getAccountName(item)}</td>
                      {(activeVoucherType === "purchase" || activeVoucherType === "payment") && (
                        <td style={td}>{getFarmerName(item)}</td>
                      )}
                      {(activeVoucherType === "sale" || activeVoucherType === "receipt") && (
                        <td style={td}>{companies.find(c => String(c.id || c._id) === String(item.company_id))?.name || "-"}</td>
                      )}
                      {(activeVoucherType === "purchase" || activeVoucherType === "sale") && (
                        <>
                          <td style={td}>{getProductName(item)}</td>
                          <td style={td}>{activeVoucherType === "purchase" ? item.total_qty || item.net_weight || item.quantity || 0 : item.unloading_qty || item.quantity || 0}</td>
                          <td style={td}>{item.rate || 0}</td>
                        </>
                      )}
                      <td style={td}>{activeVoucherType === "purchase" ? item.net_amount_payable || item.amount || 0 : item.net_receivable_amount || item.net_amount || item.amount || 0}</td>
                      <td style={td}>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button onClick={() => handleEditVoucher(item.id || item._id)} style={btnAction} title="Edit">Edit</button>
                          <button onClick={() => handleDeleteVoucher(item.id || item._id)} style={{ ...btnAction, background: "#dc2626" }} title="Delete">Delete</button>
                          {activeVoucherType === "sale" && (
                            <button onClick={() => handleGeneratePDF(item.id || item._id)} style={{ ...btnAction, background: "#ea580c" }} title="Download PDF">PDF</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {list.length === 0 && (
                    <tr><td colSpan={11} style={{ ...td, textAlign: "center", padding: 20 }}>No vouchers found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          )}
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
                  <tr style={reportHeaderRowStyle}>
                    {activeReport === "purchase" && <th style={th}>S.L No</th>}
                    {activeReport === "purchase" && <th style={th}>Date</th>}
                    {activeReport === "purchase" && <th style={th}>Voucher No</th>}
                    <th style={th}>Warehouse</th>
                    {activeReport === "purchase" && <th style={th}>Account</th>}
                    {activeReport === "purchase" && <th style={th}>Farmer</th>}
                    {activeReport === "purchase" && <th style={th}>Product</th>}
                    {activeReport === "purchase" && <th style={th}>Packet</th>}
                    {activeReport === "purchase" && <th style={th}>Gross Wt</th>}
                    {activeReport === "purchase" && <th style={th}>Tare Wt</th>}
                    {activeReport === "purchase" && <th style={th}>Dhalta</th>}
                    {activeReport === "purchase" && <th style={th}>Gross Amount</th>}
                    {activeReport === "purchase" && <th style={th}>Bags Claim</th>}
                    {activeReport === "purchase" && <th style={th}>Labour</th>}
                    {activeReport === "purchase" && <th style={th}>Deduction</th>}
                    {activeReport === "purchase" && <th style={th}>Round Off</th>}
                    {activeReport === "sale" && <th style={th}>Total Quantity</th>}
                    {activeReport === "sale" && <th style={th}>Total Amount</th>}
                    {activeReport === "purchase" && <th style={th}>Total Quantity</th>}
                    {activeReport === "purchase" && <th style={th}>Net Payable</th>}
                    {activeReport === "profit-loss" && <th style={th}>Sale Amount</th>}
                    {activeReport === "profit-loss" && <th style={th}>Purchase Amount</th>}
                    {activeReport === "profit-loss" && <th style={th}>Profit/Loss</th>}
                    {activeReport === "purchase" && <th style={th}>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {reportData.map((item, i) => (
                    <tr key={item.id || i} style={{ background: i % 2 ? "#f8fafc" : "#fff" }}>
                      {activeReport === "purchase" && <td style={td}>{i + 1}</td>}
                      {activeReport === "purchase" && <td style={td}>{item.date || "-"}</td>}
                      {activeReport === "purchase" && <td style={td}>{item.voucher_no || "-"}</td>}
                      <td style={td}>{item.warehouse_name || warehouses.find(w => String(w.id || w._id) === String(item.warehouse_id))?.name || "-"}</td>
                      {activeReport === "purchase" && <td style={td}>{getAccountName(item)}</td>}
                      {activeReport === "purchase" && <td style={td}>{item.farmer_name || getFarmerName(item)}</td>}
                      {activeReport === "purchase" && <td style={td}>{getProductName(item)}</td>}
                      {activeReport === "purchase" && <td style={td}>{item.packet || 0}</td>}
                      {activeReport === "purchase" && <td style={td}>{item.gross_weight || 0}</td>}
                      {activeReport === "purchase" && <td style={td}>{item.tare_weight || 0}</td>}
                      {activeReport === "purchase" && <td style={td}>{item.dhalta || 0}</td>}
                      {activeReport === "purchase" && <td style={td}>{formatMoney(item.gross_amount || 0)}</td>}
                      {activeReport === "purchase" && <td style={td}>{formatMoney(item.bags_claim || 0)}</td>}
                      {activeReport === "purchase" && <td style={td}>{formatMoney(item.labour || 0)}</td>}
                      {activeReport === "purchase" && <td style={td}>{formatMoney(item.total_deduction || 0)}</td>}
                      {activeReport === "purchase" && <td style={td}>{formatMoney(item.round_off || 0)}</td>}
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
                      {activeReport === "purchase" && (
                        <td style={td}>
                          <div style={{ display: "flex", gap: 6 }}>
                            <button onClick={() => handleEditPurchaseReport(item)} style={btnAction} title="Edit">Edit</button>
                            <button onClick={() => handlePurchaseReportPDF(item.id || item._id)} style={{ ...btnAction, background: "#ea580c" }} title="Download PDF">PDF</button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                  {reportData.length === 0 && (
                    <tr><td colSpan={activeReport === "purchase" ? 19 : 5} style={{ ...td, textAlign: "center", padding: 20 }}>No data available.</td></tr>
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
const activeTabStyle = { ...tabStyle, background: "#087a73", color: "#fff", borderColor: "#087a73" };
const voucherTypeRow = { display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" };
const voucherButtonStyle = { background: "#e2e8f0", color: "#0f172a", border: "none", padding: "8px 14px", borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 500 };
const activeVoucherButtonStyle = { ...voucherButtonStyle, background: "#087a73", color: "#fff" };
const card = { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 20, marginBottom: 18, boxShadow: "0 4px 14px rgba(15,23,42,0.06)" };
const formGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 };
const inp = { width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 14, boxSizing: "border-box" };
const readOnlyInp = { ...inp, background: "#f8fafc", color: "#475569" };
const btnPrimary = { background: "#2563eb", color: "#fff", border: "none", padding: "10px 18px", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 14 };
const th = { padding: "10px 8px", textAlign: "left", borderBottom: "1px solid #0d5c56" };
const td = { padding: "8px", borderBottom: "1px solid #e2e8f0" };
const tableCard = { overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: 10, background: "#fff" };
const reportHeaderRowStyle = { background: "#087a73", color: "#fff" };
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
const btnAction = { background: "#2563eb", color: "#fff", border: "none", padding: "6px 10px", borderRadius: 4, cursor: "pointer", fontWeight: 500, fontSize: 12 };

const erpShell = {
  background: "#f5f8f7",
  border: "1px solid #b9d0cc",
  borderRadius: 4,
  padding: 8,
  color: "#111827",
  fontFamily: "Arial, Segoe UI, sans-serif",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.7)",
};
const erpTitleBar = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  marginBottom: 6,
  flexWrap: "wrap",
};
const erpTitleLeft = { display: "flex", alignItems: "center", gap: 6 };
const erpDocIcon = {
  width: 18,
  height: 18,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#087a73",
  color: "#fff",
  fontSize: 14,
  fontWeight: 800,
};
const erpTitleText = { color: "#2f542c", fontSize: 22, fontWeight: 800, lineHeight: 1 };
const erpMetaLine = { display: "flex", alignItems: "center", gap: 10, fontSize: 12, color: "#111827", flexWrap: "wrap" };
const erpTopGrid = {
  display: "grid",
  gridTemplateColumns: "minmax(390px, 1.35fr) minmax(320px, 1.05fr) minmax(260px, 0.85fr)",
  gap: 4,
  alignItems: "stretch",
  marginBottom: 6,
};
const erpPanelWide = { border: "1px solid #c8d6d3", background: "#f7f7fb", borderRadius: 4, padding: 8 };
const erpPanelSmall = {
  border: "1px solid #c9c9d5",
  background: "#f2f2f7",
  borderRadius: 4,
  padding: 8,
  display: "grid",
  alignContent: "center",
  gap: 8,
};
const erpDocPanel = { border: "1px solid #c8d6d3", background: "#f7f7fb", borderRadius: 4, padding: 8 };
const erpRow = { display: "flex", alignItems: "center", gap: 6, minHeight: 26, marginBottom: 4 };
const erpLabel = { width: 88, fontSize: 12, color: "#111827", flex: "0 0 auto" };
const erpCheckLabel = { display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#111827" };
const erpCheck = { width: 16, height: 16, margin: 0 };
const erpInput = {
  height: 23,
  minWidth: 0,
  flex: 1,
  border: "1px solid #c9c9c9",
  background: "#fff",
  padding: "2px 6px",
  fontSize: 12,
  borderRadius: 0,
  boxSizing: "border-box",
};
const erpFocusInput = { borderColor: "#4d90fe", boxShadow: "inset 0 0 0 1px rgba(77,144,254,0.15)" };
const erpSectionLabel = { fontSize: 12, color: "#111827", margin: "3px 0 2px" };
const erpGridWrap = {
  overflowX: "auto",
  border: "1px solid #c3d8d5",
  background: "#fff",
};
const erpItemsTable = { width: "100%", minWidth: 1320, borderCollapse: "collapse", tableLayout: "fixed", fontSize: 12 };
const erpTh = {
  border: "1px solid #c3d8d5",
  background: "#e8f3f1",
  color: "#111827",
  padding: "2px 4px",
  fontWeight: 500,
  textAlign: "left",
  height: 20,
  whiteSpace: "nowrap",
};
const erpTd = {
  border: "1px solid #c3d8d5",
  background: "#fff",
  color: "#111827",
  padding: 0,
  height: 22,
  lineHeight: "20px",
  verticalAlign: "middle",
};
const erpCellInput = {
  width: "100%",
  height: 21,
  border: "none",
  background: "transparent",
  padding: "1px 4px",
  fontSize: 12,
  boxSizing: "border-box",
  outline: "none",
};
const erpReadOnlyCell = { background: "#f5f7fb", color: "#111827", fontWeight: 700 };
const erpMiddleBar = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  fontSize: 12,
  padding: "5px 2px 3px",
};
const erpBottomGrid = {
  display: "grid",
  gridTemplateColumns: "minmax(420px, 1fr) minmax(420px, 1fr)",
  gap: 10,
  alignItems: "start",
};
const erpMiniTable = { width: "100%", borderCollapse: "collapse", tableLayout: "fixed", fontSize: 12, background: "#fff" };
const erpRemarksRow = { display: "flex", alignItems: "stretch", gap: 6, marginTop: 8 };
const erpTextarea = {
  flex: 1,
  minHeight: 48,
  border: "1px solid #c9c9c9",
  resize: "vertical",
  padding: 6,
  fontSize: 12,
  fontFamily: "Arial, Segoe UI, sans-serif",
};
const erpTotalPanel = {
  marginTop: 8,
  minHeight: 46,
  border: "1px solid #c9c9d5",
  background: "#e8f3f1",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "0 14px",
  fontWeight: 900,
  fontSize: 18,
};
const erpTotalLabel = { letterSpacing: 8, color: "#2f542c" };
const erpTotalAmount = { letterSpacing: 0, color: "#2f542c", fontSize: 30 };
