import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useSearchParams } from "react-router-dom";
import { FaFilePdf, FaWhatsapp } from "react-icons/fa";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { hasPermission, loadSession } from "../utils/auth";

const defaultForm = () => ({
  voucher_no: "",
  bill_no: "",
  date: new Date().toISOString().slice(0, 10),
  bill_date: new Date().toISOString().slice(0, 10),
  unloading_date: "",
  due_days: "",
  sale_type: "direct",
  warehouse_id: "",
  buyer_id: "",
  farmer_id: "",
  company_id: "",
  company_account_id: "",
  consignee_id: "",
  product_id: "",
  po_no: "",
  due_date: "",
  direct_purchase_rate: "",
  direct_purchase_amount: "",
  against_purchase_enabled: false,
  against_purchase_farmer_id: "",
  reference_type: "",
  reference_id: "",
  lorry_no: "",
  employee_id: "",
  location_id: "",
  quantity: "",
  shortage_quantity: "",
  unloading_qty: "",
  rate: "",
  amount: "",
  claim_amount: "",
  other_deduction: "",
  cd_percent: "",
  cd_amount: "",
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
  journey_note: "",
  journey_token: "",
  reject_qty: "",
});

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const getRecordId = (value) => value?._id || value?.id || value || "";
const formatDecimal4 = (value) => toNumber(value).toFixed(4);
const formatMoney = (value) => toNumber(value).toFixed(2);
const titleCase = (value) =>
  String(value || "")
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
const formatLedgerDate = (value) => {
  const raw = String(value || "").trim();
  const datePart = raw.includes("T") ? raw.split("T")[0] : raw;
  const match = datePart.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) return `${match[3]}-${match[2]}-${match[1]}`;
  return raw || "-";
};

const buildJourneyToken = () => {
  const stamp = new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 14);
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `JNY-${stamp}-${rand}`;
};

const diffDays = (start, end) => {
  const s = String(start || "").trim();
  const e = String(end || "").trim();
  if (!s || !e) return 0;
  const startDate = new Date(`${(s.includes("T") ? s.split("T")[0] : s)}T00:00:00Z`);
  const endDate = new Date(`${(e.includes("T") ? e.split("T")[0] : e)}T00:00:00Z`);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return 0;
  return Math.max(0, Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24)));
};

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
  const [accountFarmers, setAccountFarmers] = useState([]);
  const [buyerNames, setBuyerNames] = useState([]);
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
  const [warehouseStockReport, setWarehouseStockReport] = useState([]);
  const [availableSaleStock, setAvailableSaleStock] = useState(null);
  const [reportFilters, setReportFilters] = useState({
    farmer_id: "",
    company_account_id: "",
    sale_buyer_id: "",
    sale_company_account_id: "",
    sale_journey_token: "",
    sale_lorry_no: "",
    sale_bill_no: "",
  });
  const [saleFollowupFilter, setSaleFollowupFilter] = useState("all");
  const [selectedLedgerBillId, setSelectedLedgerBillId] = useState("");
  const [partyOutstanding, setPartyOutstanding] = useState(null);
  const [showPaymentAdjustPopup, setShowPaymentAdjustPopup] = useState(false);
  const [paymentAdjustments, setPaymentAdjustments] = useState([]);
  const [selectedPaymentId, setSelectedPaymentId] = useState(null);
  const [showReceiptAdjustPopup, setShowReceiptAdjustPopup] = useState(false);
  const [receiptAdjustments, setReceiptAdjustments] = useState([]);
  const [selectedReceiptId, setSelectedReceiptId] = useState(null);
  const [stockDrilldown, setStockDrilldown] = useState(null);
  const [stockDrilldownFromDate, setStockDrilldownFromDate] = useState("");
  const [stockDrilldownToDate, setStockDrilldownToDate] = useState("");
  const [showPurchaseBillWise, setShowPurchaseBillWise] = useState(false);
  const [showSaleBillWise, setShowSaleBillWise] = useState(false);
  const [selectedSaleLedgerBillId, setSelectedSaleLedgerBillId] = useState("");
  const [importingPurchase, setImportingPurchase] = useState(false);
  const [voucherNumberLoading, setVoucherNumberLoading] = useState(false);
  const [showSaleDeductionModal, setShowSaleDeductionModal] = useState(false);
  const [saleBillSearch, setSaleBillSearch] = useState("");
  const [journeyTemplateId, setJourneyTemplateId] = useState("");
  const [showSaleAdjustedModal, setShowSaleAdjustedModal] = useState(false);
  const [salePurchaseRows, setSalePurchaseRows] = useState([]);
  const [salePurchaseLinks, setSalePurchaseLinks] = useState([]);
  const selectedVoucher = list.find((item) => String(item.id || item._id) === String(selectedPaymentId));
  const selectedReceiptVoucher = list.find((item) => String(item.id || item._id) === String(selectedReceiptId));
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
  const selectedBuyer = buyerNames.find((b) => String(b.id || b._id) === String(formData.buyer_id || formData.company_id));
  const selectedConsignee = consignees.find((c) => String(c.id || c._id) === String(formData.consignee_id));
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
  const getBuyerId = (item) => item?.buyer_id || item?.company_id || "";
  const getBuyerName = (item) =>
    item?.buyer_name ||
    buyerNames.find((b) => String(b.id || b._id) === String(getBuyerId(item)))?.name ||
    item?.company_name ||
    companies.find((c) => String(c.id || c._id) === String(item?.company_id))?.name ||
    "-";
  const saleQtyFromData = (data) => {
    const newWeight = Math.max(toNumber(data.gross_weight) - toNumber(data.tare_weight), 0);
    return newWeight || toNumber(data.quantity) || toNumber(data.unloading_qty);
  };
  const saleDispatchQtyFromData = (data) => {
    const newWeight = Math.max(toNumber(data.gross_weight) - toNumber(data.tare_weight), 0);
    return toNumber(data.dispatch_qty) || toNumber(data.quantity) || newWeight || toNumber(data.unloading_qty);
  };
  const saleGrossAmountFromData = (data) => saleDispatchQtyFromData(data) * toNumber(data.rate);
  const saleBillAmountFromData = (data) => toNumber(data.amount) || saleGrossAmountFromData(data);
  const filteredConsignees = useMemo(() => {
    const buyerId = String(formData.buyer_id || formData.company_id || "");
    if (!buyerId) return consignees;
    return consignees.filter((c) => String(c.buyer_id || "") === buyerId);
  }, [consignees, formData.buyer_id, formData.company_id]);
  const openStockDrilldown = (item, mode) => {
    setStockDrilldownFromDate("");
    setStockDrilldownToDate("");
    setStockDrilldown({ item, mode });
  };
  const openSaleJourneyReport = () => {
    setReportFilters((prev) => ({
      ...prev,
      sale_journey_token: formData.journey_token || selectedSalePassBill?.journey_token || "",
      sale_lorry_no: selectedSalePassBill?.lorry_no || formData.lorry_no || "",
      sale_bill_no: selectedSalePassBill?.voucher_no || selectedSalePassBill?.bill_no || formData.bill_no || "",
    }));
    setActiveTab("reports");
    setActiveReport("sale-journey");
  };
  const purchaseDeductionTotal = purchaseDeductionFields.reduce((sum, field) => sum + toNumber(formData[field.key]), 0);
  const purchaseNewWeight = toNumber(formData.gross_weight) - toNumber(formData.tare_weight);
  const safePurchaseNewWeight = Math.max(purchaseNewWeight, 0);
  const purchaseNetWeight =
    safePurchaseNewWeight -
    toNumber(formData.dhalta) -
    purchaseDeductionTotal;
  const safePurchaseNetWeight = Math.max(purchaseNetWeight, 0);
  const purchaseGrossAmount = safePurchaseNetWeight * toNumber(formData.rate);
  const purchaseTotalDeduction = toNumber(formData.bags_claim) + toNumber(formData.labour);
  const purchaseRoundOff = toNumber(formData.round_off);
  const purchaseNetPayable = Math.max(purchaseGrossAmount - purchaseTotalDeduction + purchaseRoundOff, 0);
  const paymentAdjustmentTotal = paymentAdjustments.reduce(
    (sum, item) => sum + toNumber(item.adjusted_amount),
    0
  );
  const receiptAdjustmentTotal = receiptAdjustments.reduce(
    (sum, item) => sum + toNumber(item.adjusted_amount),
    0
  );
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
    "purchase-party-ledger": "warehouse.trading.report.purchase",
    "sale-party-ledger": "warehouse.trading.report.sale",
    "sale-followup": "warehouse.trading.report.sale",
    "sale-journey": "warehouse.trading.report.sale",
    "warehouse-stock": "warehouse.trading.report.purchase",
    "fifo-stock": "warehouse.trading.report.purchase",
    "profit-loss": "warehouse.trading.report.profitLoss",
  };
  const reportEndpointMap = {
    sale: "sale-summary",
    purchase: "purchase-summary",
    "purchase-party-ledger": "purchase-party-ledger",
    "sale-party-ledger": "sale-party-ledger",
    "sale-followup": "sale-followup",
    "sale-journey": "sale-journey",
    "warehouse-stock": "warehouse-stock",
    "fifo-stock": "fifo-stock",
    "profit-loss": "profit-loss",
  };
  const reportLabels = {
    sale: "Sale Summary",
    purchase: "Purchase Detail",
    "purchase-party-ledger": "Purchase Party Ledger",
    "sale-party-ledger": "Sale Party Ledger",
    "sale-followup": "Sale Follow-up",
    "sale-journey": "Sale Journey Report",
    "warehouse-stock": "Warehouse Stock",
    "fifo-stock": "FIFO Stock",
    "profit-loss": "Profit/Loss",
  };
  const allowedVoucherTypes = Object.keys(voucherPermissionMap).filter((type) => hasPermission(user, voucherPermissionMap[type]));
  const allowedReports = Object.keys(reportPermissionMap).filter((type) => hasPermission(user, reportPermissionMap[type]));
  const saleDispatchQty = toNumber(formData.dispatch_qty) || toNumber(formData.quantity) || toNumber(formData.unloading_qty);
  const saleUnloadingQty = toNumber(formData.unloading_qty);
  const saleRejectQty = toNumber(formData.reject_qty);
  const saleShortageQty = Math.max(saleDispatchQty - saleUnloadingQty, 0);
  const saleShortageAmount = saleShortageQty * toNumber(formData.rate);
  const saleQualityDeduction =
    toNumber(formData.moisture) +
    toNumber(formData.dunki) +
    toNumber(formData.fungus) +
    toNumber(formData.discolour) +
    toNumber(formData.others);
  const saleCashDiscountAmount = Number((saleBillAmountFromData(formData) * toNumber(formData.cd_percent) / 100).toFixed(2));
  const partySaleTotal = list
    .filter((item) => {
      const sameBuyer = String(getBuyerId(item) || "") === String(formData.buyer_id || formData.company_id || "");
      const sameAccount = String(item.company_account_id || "") === String(formData.company_account_id || "");
      return sameBuyer && (!formData.company_account_id || sameAccount);
    })
    .reduce((sum, item) => sum + toNumber(item.total_amount || item.net_receivable_amount || item.net_amount || item.amount), 0);
  const tdsEligible = partySaleTotal > 5000000;
  const autoTdsAmount = tdsEligible
    ? Math.max(saleBillAmountFromData(formData) - saleShortageAmount - saleQualityDeduction - saleCashDiscountAmount - toNumber(formData.adjustment_amount), 0) * 0.001
    : 0;
  const selectedBuyerSaleRows = list.filter((item) => {
    const sameBuyer = String(getBuyerId(item) || "") === String(formData.buyer_id || formData.company_id || "");
    const sameAccount = !formData.company_account_id || String(item.company_account_id || "") === String(formData.company_account_id || "");
    return activeVoucherType === "sale" && sameBuyer && sameAccount;
  });
  const selectedBuyerSaleQty = selectedBuyerSaleRows.reduce((sum, item) => sum + toNumber(item.quantity || item.total_quantity || item.unloading_qty), 0);
  const selectedBuyerSaleAmount = selectedBuyerSaleRows.reduce((sum, item) => sum + toNumber(item.net_receivable_amount || item.net_amount || item.amount), 0);
  const selectedBuyerPendingAmount = (partyOutstanding?.sales || []).reduce((sum, item) => sum + toNumber(item.pending_amount), 0);
  const selectedBuyerBalanceAmount = toNumber(partyOutstanding?.stats?.outstanding ?? partyOutstanding?.outstanding ?? selectedBuyerPendingAmount);
  const selectedWarehouseStockRow = warehouseStockReport.find((item) =>
    String(item.warehouse_id || "") === String(formData.warehouse_id || "") &&
    String(item.product_id || "") === String(formData.product_id || "")
  );
  const selectedWarehouseBalanceQty = availableSaleStock !== null
    ? toNumber(availableSaleStock)
    : selectedWarehouseStockRow
      ? toNumber(selectedWarehouseStockRow.stock_qty)
      : null;
  const againstPurchaseRows = salePurchaseRows
    .filter((item) => {
      if (formData.against_purchase_farmer_id && String(item.farmer_id || "") !== String(formData.against_purchase_farmer_id)) return false;
      if (formData.company_account_id && String(item.company_account_id || "") !== String(formData.company_account_id)) return false;
      if (formData.product_id && String(item.product_id || "") !== String(formData.product_id)) return false;
      if (formData.warehouse_id && String(item.warehouse_id || "") !== String(formData.warehouse_id)) return false;
      return true;
    })
    .slice()
    .sort((a, b) => String(a.date || "").localeCompare(String(b.date || "")));
  const againstPurchaseLinkMap = new Map(salePurchaseLinks.map((item) => [String(item.purchase_id), item]));
  const againstPurchaseTotalQty = salePurchaseLinks.reduce((sum, item) => sum + toNumber(item.quantity), 0);
  const againstPurchaseTotalAmount = salePurchaseLinks.reduce((sum, item) => sum + toNumber(item.amount), 0);
  const saleNetReceivablePreview =
    saleGrossAmountFromData(formData) -
    toNumber(formData.claim_amount) -
    toNumber(formData.other_deduction) -
    saleCashDiscountAmount -
    toNumber(formData.adjustment_amount) -
    (tdsEligible ? autoTdsAmount : toNumber(formData.tds_amount)) +
    toNumber(formData.round_off);

  const updateSalePurchaseLink = (purchase, quantityValue) => {
    const purchaseId = String(purchase.id || purchase._id || "");
    const quantity = Math.max(0, toNumber(quantityValue));
    const rate = toNumber(purchase.rate);
    setSalePurchaseLinks((prev) => {
      const others = prev.filter((item) => String(item.purchase_id) !== purchaseId);
      if (!purchaseId || quantity <= 0) return others;
      return [
        ...others,
        {
          purchase_id: purchaseId,
          voucher_no: purchase.voucher_no || "",
          farmer_id: String(purchase.farmer_id || formData.against_purchase_farmer_id || ""),
          quantity,
          rate,
          amount: Number((quantity * rate).toFixed(2)),
        },
      ];
    });
  };
  const saleVoucherPassBills = list.filter((item) => {
    const sameWarehouse = !formData.warehouse_id || String(item.warehouse_id || "") === String(formData.warehouse_id);
    const sameAccount = !formData.company_account_id || String(item.company_account_id || "") === String(formData.company_account_id);
    const hasNoUnloadingDetails =
      !item.unloading_date &&
      toNumber(item.shortage_quantity) === 0 &&
      toNumber(item.claim_amount) === 0 &&
      toNumber(item.other_deduction) === 0 &&
      toNumber(item.cd_amount) === 0 &&
      toNumber(item.tds_amount) === 0;
    const search = saleBillSearch.trim().toLowerCase();
    const searchable = [
      item.voucher_no,
      item.lorry_no,
      item.reference_id,
      getBuyerName(item),
      item.consignee_name,
      getProductName(item),
    ].join(" ").toLowerCase();
    // Ensure we only show sale vouchers here. Prefer explicit `voucher_type` when available,
    // otherwise fall back to presence of buyer/company fields which indicate sale.
    const isSaleType = String(item.voucher_type || "").toLowerCase() === "sale" || Boolean(item.buyer_id || item.company_id);
    return isSaleType && sameWarehouse && sameAccount && hasNoUnloadingDetails && (!search || searchable.includes(search));
  });
  const selectedSalePassBill =
    list.find((row) => String(row.id || row._id) === String(editId)) ||
    saleVoucherPassBills.find((row) => String(row.id || row._id) === String(editId)) ||
    null;
  const selectedSalePassJourneyKey = String(
    selectedSalePassBill?.journey_token ||
      selectedSalePassBill?.journey_id ||
      selectedSalePassBill?.journey_group_no ||
      formData.journey_token ||
      ""
  ).trim();
  const selectedSalePassJourneyRows = selectedSalePassJourneyKey
    ? list.filter((row) => String(row.journey_token || row.journey_id || row.journey_group_no || "") === selectedSalePassJourneyKey)
    : (selectedSalePassBill || formData.lorry_no)
      ? list.filter((row) => {
          const sameLorry = String(row.lorry_no || "") === String(selectedSalePassBill?.lorry_no || formData.lorry_no || "");
          const sameDate = selectedSalePassBill?.date ? String(row.date || "") === String(selectedSalePassBill.date || "") : true;
          return sameLorry && sameDate;
        })
      : [];
  const selectedSalePassJourneyRemainingQty = Math.max(
    saleDispatchQty - selectedSalePassJourneyRows.reduce((sum, row) => sum + toNumber(row.unloading_qty || row.quantity || row.total_quantity || 0), 0),
    0
  );

  useEffect(() => {
    if (activeTab !== "vouchers" || activeVoucherType !== "sale" || !showSaleDeductionModal) return;
    if (editId && selectedSalePassBill) return;
    const preferredLorry = String(formData.lorry_no || "").trim();
    const preferredToken = String(formData.journey_token || "").trim();
    const autoSelected =
      saleVoucherPassBills.find((row) => preferredToken && String(row.journey_token || row.journey_id || row.journey_group_no || "") === preferredToken) ||
      saleVoucherPassBills.find((row) => preferredLorry && String(row.lorry_no || "") === preferredLorry) ||
      saleVoucherPassBills[0] ||
      null;
    if (autoSelected && String(editId || "") !== String(autoSelected.id || autoSelected._id || "")) {
      selectSaleVoucherForPass(autoSelected.id || autoSelected._id);
    }
  }, [activeTab, activeVoucherType, showSaleDeductionModal, editId, selectedSalePassBill, saleVoucherPassBills, formData.lorry_no, formData.journey_token]);

  const saleAdjustedBills = list.filter((item) => {
    const sameWarehouse = !formData.warehouse_id || String(item.warehouse_id || "") === String(formData.warehouse_id);
    const sameAccount = !formData.company_account_id || String(item.company_account_id || "") === String(formData.company_account_id);
    const hasAdjustment =
      toNumber(item.shortage_quantity) > 0 ||
      toNumber(item.claim_amount) > 0 ||
      toNumber(item.other_deduction) > 0 ||
      toNumber(item.cd_amount) > 0 ||
      toNumber(item.adjustment_amount) > 0 ||
      toNumber(item.tds_amount) > 0 ||
      Boolean(item.unloading_date);
    const search = saleBillSearch.trim().toLowerCase();
    const searchable = [
      item.voucher_no,
      item.lorry_no,
      item.reference_id,
      getBuyerName(item),
      item.consignee_name,
      getProductName(item),
    ].join(" ").toLowerCase();
    return sameWarehouse && sameAccount && hasAdjustment && (!search || searchable.includes(search));
  });

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
    if (activeTab === "vouchers" && activeVoucherType === "sale") {
      loadSalePurchaseRows();
    }
  }, [activeTab, activeVoucherType]);

  useEffect(() => {
    if (activeTab === "vouchers") {
      fetchNextVoucherNo(activeVoucherType);
      setPartyOutstanding(null);
      setPaymentAdjustments([]);
      setSelectedPaymentId(null);
      setShowPaymentAdjustPopup(false);
      setReceiptAdjustments([]);
      setSelectedReceiptId(null);
      setShowReceiptAdjustPopup(false);
      setSalePurchaseLinks([]);
      setFormData((prev) => ({ ...prev, reference_type: "", reference_id: "" }));
    }
  }, [activeTab, activeVoucherType]);

  // Load report when type changes
  useEffect(() => {
    if (activeTab === "reports") {
      loadReport();
    }
  }, [activeTab, activeReport, reportFilters.farmer_id, reportFilters.company_account_id, reportFilters.sale_buyer_id, reportFilters.sale_company_account_id, reportFilters.sale_journey_token, reportFilters.sale_lorry_no, reportFilters.sale_bill_no]);

  useEffect(() => {
    if (activeReport !== "purchase-party-ledger") setShowPurchaseBillWise(false);
    if (activeReport !== "sale-party-ledger") setShowSaleBillWise(false);
  }, [activeReport]);

  useEffect(() => {
    const handleLedgerRefresh = (event) => {
      if (event.key !== "F5" || activeTab !== "reports") return;
      if (activeReport !== "purchase-party-ledger" && activeReport !== "sale-party-ledger") return;
      event.preventDefault();
      if (activeReport === "purchase-party-ledger") setShowPurchaseBillWise(true);
      if (activeReport === "sale-party-ledger") setShowSaleBillWise(true);
      loadReport();
    };
    window.addEventListener("keydown", handleLedgerRefresh);
    return () => window.removeEventListener("keydown", handleLedgerRefresh);
  }, [activeTab, activeReport, reportFilters.farmer_id, reportFilters.company_account_id, reportFilters.sale_buyer_id, reportFilters.sale_company_account_id, reportFilters.sale_journey_token, reportFilters.sale_lorry_no, reportFilters.sale_bill_no]);

  useEffect(() => {
    const handleF2Key = (event) => {
      if (event.key !== "F2" || activeTab !== "vouchers" || activeVoucherType !== "sale") return;
      event.preventDefault();
      setShowSaleDeductionModal(true);
    };
    window.addEventListener("keydown", handleF2Key);
    return () => window.removeEventListener("keydown", handleF2Key);
  }, [activeTab, activeVoucherType]);

  useEffect(() => {
    const handleF5SaleKey = (event) => {
      if (event.key !== "F5" || activeTab !== "vouchers" || activeVoucherType !== "sale") return;
      event.preventDefault();
      setShowSaleAdjustedModal(true);
    };
    window.addEventListener("keydown", handleF5SaleKey);
    return () => window.removeEventListener("keydown", handleF5SaleKey);
  }, [activeTab, activeVoucherType]);

  useEffect(() => {
    if (activeTab !== "vouchers" || activeVoucherType !== "sale" || formData.sale_type === "direct" || !formData.warehouse_id || !formData.product_id) {
      setAvailableSaleStock(null);
      return;
    }

    let cancelled = false;
    axios
      .get("/api/wh-vouchers/available-sale-stock", {
        params: {
          warehouse_id: formData.warehouse_id,
          product_id: formData.product_id,
          exclude_sale_id: editId || undefined,
        },
      })
      .then((res) => {
        if (!cancelled) setAvailableSaleStock(res.data?.stock_qty ?? null);
      })
      .catch(() => {
        if (!cancelled) setAvailableSaleStock(null);
      });

    return () => {
      cancelled = true;
    };
  }, [activeTab, activeVoucherType, formData.sale_type, formData.warehouse_id, formData.product_id, editId]);

  const loadData = async () => {
    try {
      const [wRes, fRes, bRes, cRes, caRes, coRes, pRes, eRes, lRes] = await Promise.allSettled([
        axios.get("/api/warehouses"),
        axios.get("/api/farmers"),
        axios.get("/api/buyer-names"),
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
      setBuyerNames(Array.isArray(dataOf(bRes)) ? dataOf(bRes) : []);
      setCompanies(Array.isArray(dataOf(cRes)) ? dataOf(cRes) : []);
      setCompanyAccounts(Array.isArray(dataOf(caRes)) ? dataOf(caRes) : []);
      setConsignees(Array.isArray(dataOf(coRes)) ? dataOf(coRes) : []);
      setProducts(Array.isArray(dataOf(pRes)) ? dataOf(pRes) : []);
      setEmployees(Array.isArray(dataOf(eRes)) ? dataOf(eRes) : []);
      setLocations(Array.isArray(dataOf(lRes)) ? dataOf(lRes) : []);
      axios
        .get("/api/wh-vouchers/report/warehouse-stock")
        .then((res) => setWarehouseStockReport(Array.isArray(res.data) ? res.data : []))
        .catch(() => setWarehouseStockReport([]));
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

  const loadOutstanding = async (partyType, partyId, warehouseId = null, excludePaymentId = null, companyAccountId = null) => {
    if (!partyType || !partyId) {
      setPartyOutstanding(null);
      return;
    }
    try {
      const params = { party_type: partyType, id: partyId };
      const warehouse = warehouseId || formData.warehouse_id;
      if (warehouse) params.warehouse_id = warehouse;
      if (excludePaymentId) params.exclude_payment_id = excludePaymentId;
      if (companyAccountId) params.company_account_id = companyAccountId;
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

  const loadSalePurchaseRows = async () => {
    try {
      if (!hasPermission(user, voucherPermissionMap.purchase)) {
        setSalePurchaseRows([]);
        return;
      }
      const res = await axios.get("/api/wh-vouchers/purchase");
      const rows = Array.isArray(res.data) ? res.data : [];
      setSalePurchaseRows(rows);
    } catch (err) {
      console.error(err);
      setSalePurchaseRows([]);
    }
  };

  const loadReport = async () => {
    try {
      if (!hasPermission(user, reportPermissionMap[activeReport])) {
        setReportData([]);
        return;
      }
      const endpoint = reportEndpointMap[activeReport] || activeReport;
      const params = {};
      if (activeReport === "purchase-party-ledger" && reportFilters.farmer_id) {
        params.farmer_id = reportFilters.farmer_id;
      }
      if (activeReport === "sale-party-ledger" && reportFilters.sale_buyer_id) {
        params.buyer_id = reportFilters.sale_buyer_id;
      }
      if (activeReport === "sale-journey") {
        if (reportFilters.sale_journey_token) params.journey_token = reportFilters.sale_journey_token;
        if (reportFilters.sale_lorry_no) params.lorry_no = reportFilters.sale_lorry_no;
        if (reportFilters.sale_bill_no) params.bill_no = reportFilters.sale_bill_no;
      }
      if (reportFilters.company_account_id || reportFilters.sale_company_account_id) {
        params.company_account_id = reportFilters.company_account_id || reportFilters.sale_company_account_id;
      }
      const res = await axios.get(`/api/wh-vouchers/report/${endpoint}`, { params });
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
    const { name, type, checked, value } = e.target;
    const fieldValue = type === "checkbox" ? checked : value;
    setFormData((prev) => {
      const next = { ...prev, [name]: fieldValue };
      if (name === "warehouse_id") {
        const warehouse = warehouses.find((w) => String(w.id || w._id) === String(value));
        next.location_id = getRecordId(warehouse?.location_id);
        next.employee_id = getRecordId(warehouse?.employee_id) || prev.employee_id || "";
      }
      if (activeVoucherType === "sale" && name === "buyer_id") {
        next.company_id = value;
        next.consignee_id = "";
      }
      if (activeVoucherType === "sale" && name === "consignee_id") {
        const consignee = consignees.find((c) => String(c.id || c._id) === String(value));
        if (consignee?.buyer_id) {
          next.buyer_id = String(consignee.buyer_id);
          next.company_id = String(consignee.buyer_id);
        }
      }
      if (name === "voucher_no") {
        next.bill_no = value;
      }
      if (name === "date") {
        next.bill_date = value;
      }
      if (name === "description") {
        next.journey_note = value;
      }
      if (name === "lorry_no" && !next.journey_token && editId) {
        next.journey_token = buildJourneyToken();
      }
      if ((name === "date" || name === "bill_date") && !next.journey_token && editId) {
        next.journey_token = buildJourneyToken();
      }
      if (activeVoucherType === "sale" && name === "unloading_date") {
        const dueDays = toNumber(prev.due_days);
        if (value && dueDays > 0) {
          const parsed = new Date(`${value}T00:00:00Z`);
          if (!Number.isNaN(parsed.getTime())) {
            parsed.setUTCDate(parsed.getUTCDate() + dueDays);
            next.due_date = parsed.toISOString().slice(0, 10);
          }
        } else if (!dueDays) {
          next.due_date = "";
        }
      }
      if (activeVoucherType === "sale" && name === "due_days") {
        const unloadingDate = prev.unloading_date || "";
        next.due_date = unloadingDate && value ? (() => {
          const parsed = new Date(`${unloadingDate}T00:00:00Z`);
          if (Number.isNaN(parsed.getTime())) return unloadingDate;
          parsed.setUTCDate(parsed.getUTCDate() + toNumber(value));
          return parsed.toISOString().slice(0, 10);
        })() : next.due_date;
      }
      if (
        activeVoucherType === "sale" &&
        !editId &&
        ["gross_weight", "tare_weight", "quantity", "unloading_qty", "shortage_quantity", "rate"].includes(name)
      ) {
        next.amount = saleGrossAmountFromData(next).toFixed(2);
      }
      if (activeVoucherType === "sale" && name === "cd_percent") {
        const gross = saleGrossAmountFromData(next);
        next.cd_amount = (gross * toNumber(value) / 100).toFixed(2);
      }
      if (activeVoucherType === "sale" && name === "sale_type") {
        next.against_purchase_enabled = false;
        next.against_purchase_farmer_id = "";
        if (value === "direct") next.warehouse_id = "";
      }
      return next;
    });

    if (
      activeVoucherType === "sale" &&
      ["sale_type", "against_purchase_enabled", "against_purchase_farmer_id", "company_account_id", "product_id", "warehouse_id"].includes(name)
    ) {
      setSalePurchaseLinks([]);
    }

    if (activeVoucherType === "payment" && name === "company_account_id") {
      if (value) {
        axios
          .get(`/api/wh-vouchers/farmers-by-account/${value}`, {
            params: { warehouse_id: formData.warehouse_id || undefined },
          })
          .then((res) => {
            const farmersWithOutstanding = Array.isArray(res.data) ? res.data : [];
            setAccountFarmers(farmersWithOutstanding);
          })
          .catch((err) => {
            console.error("Failed to load farmers for account:", err);
            setAccountFarmers([]);
          });
        setFormData((prev) => ({ ...prev, farmer_id: "" }));
        setPartyOutstanding(null);
        setPaymentAdjustments([]);
        setShowPaymentAdjustPopup(false);
      } else {
        setAccountFarmers([]);
        setPartyOutstanding(null);
        setPaymentAdjustments([]);
        setShowPaymentAdjustPopup(false);
      }
    }
    if (activeVoucherType === "payment" && name === "farmer_id") {
      if (value) {
        loadOutstanding("farmer", value, formData.warehouse_id, editId, formData.company_account_id).then(() => {
          if (toNumber(formData.amount) > 0) {
            setShowPaymentAdjustPopup(true);
          }
        });
      } else {
        setPartyOutstanding(null);
      }
    }
    if (activeVoucherType === "receipt" && name === "company_id") {
      if (value) {
        loadOutstanding("company", value, formData.warehouse_id, null, formData.company_account_id).then(() => {
          if (toNumber(formData.amount) > 0) {
            setShowReceiptAdjustPopup(true);
          }
        });
      } else {
        setPartyOutstanding(null);
        setReceiptAdjustments([]);
        setShowReceiptAdjustPopup(false);
      }
    }
    if (activeVoucherType === "sale" && (name === "buyer_id" || name === "company_id")) {
      if (value) {
        loadOutstanding("company", value, formData.warehouse_id, null, formData.company_account_id);
      } else {
        setPartyOutstanding(null);
      }
    }
    if (name === "warehouse_id") {
      if (activeVoucherType === "payment" && formData.farmer_id) {
        loadOutstanding("farmer", formData.farmer_id, value, editId, formData.company_account_id).then(() => {
          if (toNumber(formData.amount) > 0) {
            setShowPaymentAdjustPopup(true);
          }
        });
      }
      if (activeVoucherType === "receipt" && formData.company_id) {
        loadOutstanding("company", formData.company_id, value, null, formData.company_account_id);
      }
      if (activeVoucherType === "sale" && (formData.buyer_id || formData.company_id)) {
        loadOutstanding("company", formData.buyer_id || formData.company_id, value, null, formData.company_account_id);
      }
    }
    if ((activeVoucherType === "receipt" || activeVoucherType === "sale") && name === "company_account_id" && (formData.company_id || formData.buyer_id)) {
      loadOutstanding("company", formData.company_id || formData.buyer_id, formData.warehouse_id, null, value);
    }
    if (activeVoucherType === "receipt" && name === "amount") {
      if (toNumber(value) > 0 && formData.company_id) {
        setShowReceiptAdjustPopup(true);
      } else {
        setReceiptAdjustments([]);
        setShowReceiptAdjustPopup(false);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.voucher_no || !formData.date) {
      alert("Voucher no. and date are required");
      return;
    }
    if (activeVoucherType === "payment") {
      const paymentAmount = toNumber(formData.amount);
      if (!formData.farmer_id) {
        alert("Please select farmer");
        return;
      }
      if (paymentAmount <= 0) {
        alert("Please enter payment amount first");
        return;
      }
      if (Math.abs(paymentAdjustmentTotal - paymentAmount) > 0.0001) {
        setShowPaymentAdjustPopup(true);
        alert("Payment amount and adjustment amount must match before saving");
        return;
      }
    }
    if (activeVoucherType === "receipt") {
      const receiptAmount = toNumber(formData.amount);
      if (!formData.company_id) {
        alert("Please select company");
        return;
      }
      if (receiptAmount <= 0) {
        alert("Please enter receipt amount first");
        return;
      }
      if (Math.abs(receiptAdjustmentTotal - receiptAmount) > 0.0001) {
        setShowReceiptAdjustPopup(true);
        alert("Receipt amount and adjustment amount must match before saving");
        return;
      }
    }
    if (activeVoucherType === "sale") {
      if (formData.sale_type !== "direct" && !formData.warehouse_id) {
        alert("Please select warehouse");
        return;
      }
      if (formData.sale_type === "direct") {
        if (!formData.location_id) {
          alert("Please select location for direct sale");
          return;
        }
        if (!formData.farmer_id) {
          alert("Please select farmer for direct sale purchase entry");
          return;
        }
        if (toNumber(formData.direct_purchase_rate) <= 0) {
          alert("Please enter purchase rate for direct sale");
          return;
        }
      }
      if (!formData.company_account_id) {
        alert("Please select account");
        return;
      }
      if (formData.sale_type !== "direct" && formData.against_purchase_enabled) {
        if (!formData.against_purchase_farmer_id) {
          alert("Please select farmer for Against Purchase Bill");
          return;
        }
        if (salePurchaseLinks.length === 0 || againstPurchaseTotalQty <= 0) {
          alert("Please enter quantity against at least one farmer purchase bill");
          return;
        }
        const saleQty = saleDispatchQtyFromData(formData);
        if (againstPurchaseTotalQty > saleQty + 0.0001) {
          alert("Against purchase quantity cannot exceed sale quantity");
          return;
        }
      }
    }
    setLoading(true);
    try {
      const numericFields = [
        "quantity",
        "dispatch_qty",
        "shortage_quantity",
        "unloading_qty",
        "rate",
        "amount",
        "claim_amount",
        "other_deduction",
        "cd_percent",
        "cd_amount",
        "adjustment_amount",
        "tds_amount",
        "direct_purchase_rate",
        "direct_purchase_amount",
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
        payload.buyer_id = payload.buyer_id || payload.company_id || "";
        payload.company_id = payload.buyer_id;
        payload.dispatch_qty = saleDispatchQtyFromData(formData);
        payload.quantity = payload.dispatch_qty;
        payload.unloading_qty = payload.quantity;
        payload.amount = saleGrossAmountFromData(formData);
        const grossAmount = payload.amount;
        const claimAmount = Number(formData.claim_amount) || 0;
        const otherDeduction = Number(formData.other_deduction) || 0;
        const cdAmount = Number(payload.cd_amount) || Number((grossAmount * (Number(formData.cd_percent) || 0) / 100).toFixed(2)) || 0;
        const adjustmentAmount = Number(formData.adjustment_amount) || 0;
        const tdsAmount = Number(formData.tds_amount) || 0;
        const roundOff = Number(formData.round_off) || 0;
        payload.cd_amount = cdAmount;
        const netAmount = grossAmount - claimAmount - otherDeduction - cdAmount - adjustmentAmount - tdsAmount + roundOff;
        payload.net_amount = netAmount;
        payload.net_amount_payable = netAmount;
        payload.net_receivable_amount = netAmount;
        payload.outstanding = netAmount;
        const qtyForFifo = Number(payload.unloading_qty || payload.quantity) || 0;
        payload.fifo_rate = qtyForFifo > 0 ? grossAmount / qtyForFifo : 0;
        payload.fifo_amount = grossAmount;
        payload.sale_type = formData.sale_type === "direct" ? "direct" : "warehouse";
        payload.direct_purchase_amount = payload.sale_type === "direct"
          ? Number((payload.quantity * toNumber(formData.direct_purchase_rate)).toFixed(2))
          : 0;
        payload.against_purchase_enabled = payload.sale_type !== "direct" && Boolean(formData.against_purchase_enabled && salePurchaseLinks.length);
        payload.against_purchase_farmer_id = payload.sale_type === "direct" ? formData.farmer_id : (formData.against_purchase_farmer_id || "");
        payload.against_purchase_links = payload.against_purchase_enabled ? salePurchaseLinks : [];
        if (payload.sale_type === "direct") payload.warehouse_id = "";
        if (editId) payload.deduction_only = true;
      }
      if (activeVoucherType === "payment") {
        payload.adjustments = paymentAdjustments
          .filter((item) => toNumber(item.adjusted_amount) > 0)
          .map((item) => ({
            purchase_id: item.purchase_id,
            voucher_no: item.voucher_no || item.purchase_voucher_no || "",
            adjusted_amount: toNumber(item.adjusted_amount),
          }));
        payload.reference_type = "purchase";
        payload.reference_id = paymentAdjustments
          .map((item) => item.voucher_no || item.purchase_voucher_no || item.purchase_id)
          .filter(Boolean)
          .join(", ");
      }
      if (activeVoucherType === "receipt") {
        payload.adjustments = receiptAdjustments
          .filter((item) => toNumber(item.adjusted_amount) > 0)
          .map((item) => ({
            sale_id: item.sale_id,
            voucher_no: item.voucher_no || item.sale_voucher_no || "",
            adjusted_amount: toNumber(item.adjusted_amount),
          }));
        payload.reference_type = "sale";
        payload.reference_id = receiptAdjustments
          .map((item) => item.voucher_no || item.sale_voucher_no || item.sale_id)
          .filter(Boolean)
          .join(", ");
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
      setPaymentAdjustments([]);
      setReceiptAdjustments([]);
      setSalePurchaseLinks([]);
      setPartyOutstanding(null);
      setShowPaymentAdjustPopup(false);
      setShowReceiptAdjustPopup(false);
      setEditId(null);
      loadVouchers();
      fetchNextVoucherNo(activeVoucherType);
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.error || `Failed to ${editId ? "update" : "save"} voucher`);
    } finally {
      setLoading(false);
    }
  };

  const isPurchaseVoucher = activeVoucherType === "purchase";
  const isSaleVoucher = activeVoucherType === "sale";

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

  const handleEditVoucher = async (voucherId) => {
    const voucher = list.find((v) => String(v.id || v._id) === String(voucherId));
    if (!voucher) return;

    try {
      if (activeVoucherType === "receipt") {
        setLoading(true);
        const res = await axios.get(`/api/wh-vouchers/receipt/${voucherId}`);
        const receipt = res.data;
        setFormData({ ...defaultForm(), ...receipt });
        const existingAdjustments = Array.isArray(receipt.adjustments)
          ? receipt.adjustments.map((item) => ({
              sale_id: String(item.sale_id || item.id || ""),
              voucher_no: item.voucher_no || item.sale_voucher_no || "",
              adjusted_amount: toNumber(item.adjusted_amount),
            })).filter((item) => item.sale_id && item.adjusted_amount > 0)
          : [];
        setReceiptAdjustments(existingAdjustments);
        if (receipt.company_id) {
          loadOutstanding("company", receipt.company_id, receipt.warehouse_id, null, receipt.company_account_id);
        }
      } else {
        setFormData({
          ...defaultForm(),
          ...voucher,
          due_date: voucher.due_date || voucher.unloading_date || "",
        });
        if (activeVoucherType === "sale") {
          const existingLinks = Array.isArray(voucher.against_purchase_links)
            ? voucher.against_purchase_links.map((item) => ({
                purchase_id: String(item.purchase_id || item.id || ""),
                voucher_no: item.voucher_no || item.purchase_voucher_no || "",
                farmer_id: String(item.farmer_id || voucher.against_purchase_farmer_id || ""),
                quantity: toNumber(item.quantity),
                rate: toNumber(item.rate),
                amount: toNumber(item.amount),
              })).filter((item) => item.purchase_id && item.quantity > 0)
            : [];
          setSalePurchaseLinks(existingLinks);
        }
        if (activeVoucherType === "payment") {
          const existingAdjustments = Array.isArray(voucher.adjustments)
            ? voucher.adjustments.map((item) => ({
                purchase_id: String(item.purchase_id || item.id || ""),
                voucher_no: item.purchase_voucher_no || item.voucher_no || "",
                adjusted_amount: toNumber(item.adjusted_amount),
              })).filter((item) => item.purchase_id && item.adjusted_amount > 0)
            : [];
          setPaymentAdjustments(existingAdjustments);
          if (voucher.farmer_id) {
            loadOutstanding("farmer", voucher.farmer_id, voucher.warehouse_id, voucherId, voucher.company_account_id);
          }
        }
      }
      setEditId(voucherId);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.error || "Failed to load voucher for edit");
    } finally {
      setLoading(false);
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
      link.setAttribute("download", `${activeVoucherType === "sale" ? "Sale" : "Purchase"}-Voucher-${voucherId}.pdf`);
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

  const downloadPurchaseImportTemplate = async () => {
    try {
      const response = await axios.get("/api/wh-vouchers/purchase/import-template", {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "purchase_voucher_import_format.xlsx");
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.error || "Failed to download import format");
    }
  };

  const handlePurchaseExcelImport = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith(".xlsx") && !fileName.endsWith(".xls")) {
      alert("Please select an Excel file (.xlsx or .xls)");
      return;
    }
    const uploadForm = new FormData();
    uploadForm.append("file", file);
    setImportingPurchase(true);
    try {
      const res = await axios.post("/api/wh-vouchers/purchase/import-xlsx", uploadForm, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const imported = Number(res.data?.imported || 0);
      const failed = Number(res.data?.failed || 0);
      const errors = Array.isArray(res.data?.errors) ? res.data.errors : [];
      const errorText = errors
        .slice(0, 8)
        .map((item) => `Row ${item.row}: ${item.error}`)
        .join("\n");
      alert(`Purchase import complete.\nImported: ${imported}\nFailed: ${failed}${errorText ? `\n\n${errorText}` : ""}`);
      setActiveVoucherType("purchase");
      await loadVouchers();
      if (activeTab === "reports") await loadReport();
      fetchNextVoucherNo("purchase");
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.error || "Purchase import failed");
    } finally {
      setImportingPurchase(false);
    }
  };

  const openPaymentAdjustmentPopup = async () => {
    if (activeVoucherType !== "payment") return;
    if (toNumber(formData.amount) <= 0) {
      alert("Please enter amount first");
      return;
    }
    if (!formData.farmer_id) {
      alert("Please select farmer");
      return;
    }
    await loadOutstanding("farmer", formData.farmer_id, formData.warehouse_id, editId, formData.company_account_id);
    setShowPaymentAdjustPopup(true);
  };

  const openReceiptAdjustmentPopup = async () => {
    if (activeVoucherType !== "receipt") return;
    if (toNumber(formData.amount) <= 0) {
      alert("Please enter amount first");
      return;
    }
    if (!formData.company_id) {
      alert("Please select company");
      return;
    }
    await loadOutstanding("company", formData.company_id, formData.warehouse_id, null, formData.company_account_id);
    setShowReceiptAdjustPopup(true);
  };

  const selectSaleVoucherForPass = (voucherId) => {
    const voucher = list.find((item) => String(item.id || item._id) === String(voucherId));
    if (!voucher) return;
    const existingUnloadingDate = voucher.unloading_date || "";
    const existingDueDays = voucher.due_days !== undefined && voucher.due_days !== null && String(voucher.due_days).trim() !== ""
      ? toNumber(voucher.due_days)
      : "";
    const rawDueDate = voucher.due_date || "";
    const computedDueDate = existingUnloadingDate && existingDueDays > 0
      ? (() => {
          const parsed = new Date(`${existingUnloadingDate}T00:00:00Z`);
          if (Number.isNaN(parsed.getTime())) return rawDueDate;
          parsed.setUTCDate(parsed.getUTCDate() + existingDueDays);
          return parsed.toISOString().slice(0, 10);
        })()
      : rawDueDate;
    const derivedDueDays = existingDueDays !== "" ? existingDueDays : (computedDueDate && existingUnloadingDate ? diffDays(existingUnloadingDate, computedDueDate) : "");
    setFormData({
      ...defaultForm(),
      ...voucher,
      bill_no: voucher.bill_no || voucher.voucher_no || "",
      bill_date: voucher.bill_date || voucher.date || "",
      journey_token: voucher.journey_token || "",
      buyer_id: voucher.buyer_id || voucher.company_id || "",
      company_id: voucher.company_id || voucher.buyer_id || "",
      lorry_no: voucher.lorry_no || voucher.reference_id || "",
      dispatch_qty: formatDecimal4(toNumber(voucher.dispatch_qty || voucher.quantity || voucher.total_quantity || voucher.unloading_qty || 0)),
      unloading_qty: "",
      unloading_date: existingUnloadingDate || new Date().toISOString().slice(0, 10),
      due_days: derivedDueDays,
      due_date: computedDueDate || "",
      moisture: voucher.moisture || "",
      dunki: voucher.dunki || "",
      fungus: voucher.fungus || "",
      discolour: voucher.discolour || "",
      others: voucher.others || "",
      claim_amount: voucher.claim_amount || "",
      other_deduction: voucher.other_deduction || "",
      cd_percent: voucher.cd_percent || "",
      cd_amount: voucher.cd_amount || "",
      tds_amount: voucher.tds_amount || "",
      journey_note: voucher.journey_note || voucher.description || "",
    });
    setEditId(voucher.id || voucher._id);
  };

  const applyJourneyTemplate = (templateId) => {
    setJourneyTemplateId(templateId);
    const template = selectedSalePassJourneyRows.find((row) => String(row.id || row._id) === String(templateId));
    if (!template) return;

    setFormData((prev) => ({
      ...prev,
      buyer_id: template.buyer_id || template.company_id || prev.buyer_id || prev.company_id || "",
      company_id: template.company_id || template.buyer_id || prev.company_id || prev.buyer_id || "",
      consignee_id: template.consignee_id || prev.consignee_id || "",
      lorry_no: template.lorry_no || template.reference_id || prev.lorry_no || "",
      rate: template.rate || prev.rate || "",
      dispatch_qty: formatDecimal4(toNumber(template.dispatch_qty || template.quantity || template.total_quantity || template.unloading_qty || saleDispatchQty)),
      unloading_qty: template.unloading_qty || "",
    }));
  };

  const saveSaleVoucherPass = async () => {
    if (!editId) {
      alert("Please select sale bill");
      return;
    }
    if (!formData.unloading_date) {
      alert("Please enter unloading date");
      return;
    }
    if (saleUnloadingQty <= 0) {
      alert("Please enter unloading weight");
      return;
    }

    const finalTdsAmount = tdsEligible ? autoTdsAmount : toNumber(formData.tds_amount);
    const finalCdAmount = Number((saleBillAmountFromData(formData) * toNumber(formData.cd_percent) / 100).toFixed(2));
    const unloadingDate = formData.unloading_date || "";
    const dueDays = formData.due_days !== undefined && formData.due_days !== null && String(formData.due_days).trim() !== "" ? toNumber(formData.due_days) : "";
    const dueDate = formData.due_date || (unloadingDate && dueDays !== "" ? (() => {
      const parsed = new Date(`${unloadingDate}T00:00:00Z`);
      if (Number.isNaN(parsed.getTime())) return "";
      parsed.setUTCDate(parsed.getUTCDate() + toNumber(dueDays));
      return parsed.toISOString().slice(0, 10);
    })() : "");
    const payload = {
      ...formData,
      deduction_only: true,
      voucher_no: formData.voucher_no || null,
      date: formData.date || null,
      bill_no: formData.bill_no || formData.voucher_no || null,
      bill_date: formData.bill_date || formData.date || null,
      journey_token: formData.journey_token || buildJourneyToken(),
      unloading_date: unloadingDate,
      due_days: dueDays,
      due_date: dueDate,
      unloading_qty: saleUnloadingQty,
      shortage_quantity: saleShortageQty,
      shortage_amount: saleShortageAmount,
      claim_amount: saleShortageAmount,
      other_deduction: saleQualityDeduction,
      cd_amount: finalCdAmount,
      total_deduction: saleQualityDeduction + finalCdAmount,
      tds_amount: finalTdsAmount,
      reject_qty: toNumber(formData.reject_qty),
      amount: saleBillAmountFromData(formData),
    };

    setLoading(true);
    try {
      await axios.put(`/api/wh-vouchers/sale/${editId}`, payload);
      alert("Sale voucher pass saved successfully");
      const remainingQtyAfterSave = Math.max(saleDispatchQty - saleUnloadingQty, 0);
      const nextVoucherNo = await axios
        .get(`/api/wh-vouchers/next-voucher-no`, { params: { type: "sale" } })
        .then((res) => res.data?.voucher_no || "")
        .catch(() => "");
      setShowSaleDeductionModal(false);
      setFormData({
        ...defaultForm(),
        warehouse_id: formData.warehouse_id || "",
        company_account_id: formData.company_account_id || "",
        employee_id: formData.employee_id || "",
        location_id: formData.location_id || "",
        lorry_no: formData.lorry_no || "",
        journey_token: formData.journey_token || buildJourneyToken(),
        bill_no: nextVoucherNo || "",
        voucher_no: nextVoucherNo || "",
        bill_date: new Date().toISOString().slice(0, 10),
        date: new Date().toISOString().slice(0, 10),
        dispatch_qty: remainingQtyAfterSave > 0 ? remainingQtyAfterSave.toFixed(4) : "",
        unloading_qty: "",
        company_id: "",
        buyer_id: "",
        consignee_id: "",
        rate: "",
        unloading_date: "",
        due_days: "",
        due_date: "",
      });
      setEditId(null);
      await loadVouchers();
      if (activeTab === "reports") await loadReport();
      fetchNextVoucherNo(activeVoucherType);
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.error || "Failed to save sale voucher pass");
    } finally {
      setLoading(false);
    }
  };

  const saveSaleVoucherPassAndNew = async () => {
    if (!editId) {
      alert("Please select sale bill");
      return;
    }
    if (!formData.unloading_date) {
      alert("Please enter unloading date");
      return;
    }
    if (saleUnloadingQty <= 0) {
      alert("Please enter unloading weight");
      return;
    }

    const finalTdsAmount = tdsEligible ? autoTdsAmount : toNumber(formData.tds_amount);
    const finalCdAmount = Number((saleBillAmountFromData(formData) * toNumber(formData.cd_percent) / 100).toFixed(2));
    const unloadingDate = formData.unloading_date || "";
    const dueDays = formData.due_days !== undefined && formData.due_days !== null && String(formData.due_days).trim() !== "" ? toNumber(formData.due_days) : "";
    const dueDate = formData.due_date || (unloadingDate && dueDays !== "" ? (() => {
      const parsed = new Date(`${unloadingDate}T00:00:00Z`);
      if (Number.isNaN(parsed.getTime())) return "";
      parsed.setUTCDate(parsed.getUTCDate() + toNumber(dueDays));
      return parsed.toISOString().slice(0, 10);
    })() : "");
    const payload = {
      ...formData,
      deduction_only: true,
      voucher_no: formData.voucher_no || null,
      date: formData.date || null,
      bill_no: formData.bill_no || formData.voucher_no || null,
      bill_date: formData.bill_date || formData.date || null,
      journey_token: formData.journey_token || buildJourneyToken(),
      unloading_date: unloadingDate,
      due_days: dueDays,
      due_date: dueDate,
      unloading_qty: saleUnloadingQty,
      shortage_quantity: saleShortageQty,
      shortage_amount: saleShortageAmount,
      claim_amount: saleShortageAmount,
      other_deduction: saleQualityDeduction,
      cd_amount: finalCdAmount,
      total_deduction: saleQualityDeduction + finalCdAmount,
      tds_amount: finalTdsAmount,
      reject_qty: toNumber(formData.reject_qty),
      amount: saleBillAmountFromData(formData),
    };

    setLoading(true);
    try {
      await axios.put(`/api/wh-vouchers/sale/${editId}`, payload);
      alert("Sale voucher pass saved successfully");
      const remainingQtyAfterSave = Math.max(saleDispatchQty - saleUnloadingQty, 0);
      const nextVoucherNo = await axios
        .get(`/api/wh-vouchers/next-voucher-no`, { params: { type: "sale" } })
        .then((res) => res.data?.voucher_no || "")
        .catch(() => "");
      setFormData((prev) => ({
        ...defaultForm(),
        warehouse_id: prev.warehouse_id || "",
        company_account_id: prev.company_account_id || "",
        employee_id: prev.employee_id || "",
        location_id: prev.location_id || "",
        lorry_no: selectedSalePassBill?.lorry_no || prev.lorry_no || "",
        journey_token: prev.journey_token || buildJourneyToken(),
        bill_no: nextVoucherNo || "",
        voucher_no: nextVoucherNo || "",
        bill_date: new Date().toISOString().slice(0, 10),
        date: new Date().toISOString().slice(0, 10),
        dispatch_qty: remainingQtyAfterSave > 0 ? remainingQtyAfterSave.toFixed(4) : "",
        unloading_qty: "",
        company_id: selectedSalePassBill?.buyer_id || selectedSalePassBill?.company_id || "",
        buyer_id: selectedSalePassBill?.buyer_id || selectedSalePassBill?.company_id || "",
        consignee_id: "",
        rate: "",
        unloading_date: "",
        due_days: "",
        due_date: "",
      }));
      setEditId(editId);
      await loadVouchers();
      if (activeTab === "reports") await loadReport();
      fetchNextVoucherNo(activeVoucherType);
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.error || "Failed to save sale voucher pass");
    } finally {
      setLoading(false);
    }
  };

  const setPaymentAdjustmentAmount = (purchase, value) => {
    const purchaseId = String(purchase.id || purchase._id);
    const amount = Math.max(0, toNumber(value));
    const pending = toNumber(purchase.pending_amount ?? purchase.amount);
    const safeAmount = Math.min(amount, pending);
    setPaymentAdjustments((prev) => {
      const others = prev.filter((item) => String(item.purchase_id) !== purchaseId);
      if (safeAmount <= 0) return others;
      return [
        ...others,
        {
          purchase_id: purchaseId,
          voucher_no: purchase.voucher_no,
          adjusted_amount: safeAmount,
        },
      ];
    });
  };

  const autoFillPaymentAdjustments = () => {
    let remaining = toNumber(formData.amount);
    const next = [];
    (partyOutstanding?.purchases || [])
      .filter((row) => toNumber(row.pending_amount) > 0)
      .forEach((row) => {
        if (remaining <= 0) return;
        const adjusted = Math.min(remaining, toNumber(row.pending_amount));
        if (adjusted > 0) {
          next.push({
            purchase_id: String(row.id || row._id),
            voucher_no: row.voucher_no,
            adjusted_amount: adjusted,
          });
          remaining -= adjusted;
        }
      });
    setPaymentAdjustments(next);
  };

  const selectedAdjustmentFor = (purchaseId) =>
    paymentAdjustments.find((item) => String(item.purchase_id) === String(purchaseId))?.adjusted_amount || "";

  const setReceiptAdjustmentAmount = (sale, value) => {
    const saleId = String(sale.id || sale._id);
    const amount = Math.max(0, toNumber(value));
    const pending = toNumber(sale.pending_amount ?? sale.amount);
    const safeAmount = Math.min(amount, pending);
    setReceiptAdjustments((prev) => {
      const others = prev.filter((item) => String(item.sale_id) !== saleId);
      if (safeAmount <= 0) return others;
      return [
        ...others,
        {
          sale_id: saleId,
          voucher_no: sale.voucher_no,
          adjusted_amount: safeAmount,
        },
      ];
    });
  };

  const autoFillReceiptAdjustments = () => {
    let remaining = toNumber(formData.amount);
    const next = [];
    (partyOutstanding?.sales || [])
      .filter((row) => toNumber(row.pending_amount) > 0)
      .forEach((row) => {
        if (remaining <= 0) return;
        const adjusted = Math.min(remaining, toNumber(row.pending_amount));
        if (adjusted > 0) {
          next.push({
            sale_id: String(row.id || row._id),
            voucher_no: row.voucher_no,
            adjusted_amount: adjusted,
          });
          remaining -= adjusted;
        }
      });
    setReceiptAdjustments(next);
  };

  const selectedAdjustmentForReceipt = (saleId) =>
    receiptAdjustments.find((item) => String(item.sale_id) === String(saleId))?.adjusted_amount || "";

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

  const getAccountName = (item) => {
    const accountId = String(item.company_account_id || item.account_id || item.companyAccountId || "");
    const account = companyAccounts.find((account) => String(account.id || account._id) === accountId);
    return account?.account_name || account?.name || item.company_account_name || item.account_name || item.account || "-";
  };

  const getCompanyName = (item) =>
    item?.company_name ||
    companies.find((c) => String(c.id || c._id) === String(item?.company_id))?.name ||
    "-";

  const reportColumns = {
    purchase: [
      ["sl", "S.L No", (_item, i) => i + 1],
      ["date", "Date", (item) => item.date || "-"],
      ["voucher_no", "Voucher No", (item) => item.voucher_no || "-"],
      ["warehouse", "Warehouse", (item) => getWarehouseName(item)],
      ["account", "Account", (item) => getAccountName(item)],
      ["farmer", "Farmer", (item) => item.farmer_name || getFarmerName(item)],
      ["product", "Product", (item) => getProductName(item)],
      ["packet", "Packet", (item) => formatDecimal4(item.packet || 0)],
      ["gross_weight", "Gross Wt", (item) => formatDecimal4(item.gross_weight || 0)],
      ["tare_weight", "Tare Wt", (item) => formatDecimal4(item.tare_weight || 0)],
      ["new_weight", "New Wt", (item) => formatDecimal4(Math.max(toNumber(item.gross_weight) - toNumber(item.tare_weight), 0))],
      ["dhalta", "Dhalta", (item) => formatDecimal4(item.dhalta || 0)],
      ["gross_amount", "Gross Amount", (item) => formatMoney(item.gross_amount || 0)],
      ["deduction", "Deduction", (item) => formatMoney(item.total_deduction || 0)],
      ["total_quantity", "Net Qty", (item) => formatDecimal4(item.total_quantity || 0)],
      ["total_amount", "Net Payable", (item) => formatMoney(item.total_amount || item.net_amount_payable || 0)],
      ["actions", "Actions", (item) =>
        item.legacy_purchase_entry ? (
          <span style={{ color: "#64748b" }}>Old Entry</span>
        ) : (
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={() => handleEditPurchaseReport(item)} style={btnAction} title="Edit">Edit</button>
            <button onClick={() => handlePurchaseReportPDF(item.id || item._id)} style={{ ...btnAction, background: "#ea580c" }} title="Download PDF">PDF</button>
          </div>
        )
      ],
    ],
    sale: [
      ["date", "Date", (item) => formatLedgerDate(item.date)],
      ["voucher_no", "Voucher No", (item) => item.voucher_no || "-"],
      ["po_no", "P.O No", (item) => item.po_no || "-"],
      ["due_date", "Due Date", (item) => formatLedgerDate(item.due_date)],
      ["buyer", "Buyer", (item) => getBuyerName(item)],
      ["consignee", "Consignee", (item) => item.consignee_name || consignees.find((c) => String(c.id || c._id) === String(item.consignee_id))?.name || "-"],
      ["account", "Account", (item) => getAccountName(item)],
      ["warehouse", "Warehouse", (item) => getWarehouseName(item)],
      ["product", "Product", (item) => getProductName(item)],
      ["against_purchase", "Against Purchase", (item) => item.against_purchase_enabled ? `${item.against_purchase_links?.length || 0} bill` : "-"],
      ["total_quantity", "Total Quantity", (item) => formatDecimal4(item.total_quantity || 0)],
      ["total_amount", "Total Amount", (item) => formatMoney(item.total_amount || 0)],
    ],
    "purchase-party-ledger": [
      ["date", "Date", (item) => (item.row_type === "closing" ? "" : formatLedgerDate(item.date))],
      ["farmer", "Farmer", (item) => (item.row_type === "closing" ? `Closing Balance (${item.closing_side})` : (item.farmer_name || getFarmerName(item) || "-"))],
      ["account", "Account", (item) => (item.row_type === "closing" ? "" : getAccountName(item))],
      ["voucher_type", "Type", (item) => (item.row_type === "closing" ? "" : (item.voucher_type || "-"))],
      ["voucher_no", "Voucher No", (item) => (item.row_type === "closing" ? "" : (item.voucher_no || "-"))],
      ["particulars", "Particulars", (item) => (item.row_type === "closing" ? "" : (item.particulars || "-"))],
      ["adjustment_details", "Adjustment Details", (item) => (item.row_type === "closing" ? "" : (item.adjustment_details || "-"))],
      ["warehouse", "Warehouse", (item) => (item.row_type === "closing" ? "" : getWarehouseName(item))],
      ["debit", "Debit", (item) => formatMoney(item.debit || 0)],
      ["credit", "Credit", (item) => formatMoney(item.credit || 0)],
      ["balance", "Balance", (item) => {
        return formatMoney(Math.abs(item.balance || 0));
      }],
    ],
    "sale-party-ledger": [
      ["date", "Date", (item) => (item.row_type === "closing" ? "" : formatLedgerDate(item.date))],
      ["party", "Party", (item) => (item.row_type === "closing" ? `Closing Balance (${item.closing_side})` : (item.party_name || item.company_name || "-"))],
      ["account", "Account", (item) => (item.row_type === "closing" ? "" : getAccountName(item))],
      ["voucher_type", "Type", (item) => (item.row_type === "closing" ? "" : (item.voucher_type || "-"))],
      ["voucher_no", "Voucher No", (item) => (item.row_type === "closing" ? "" : (item.voucher_no || "-"))],
      ["due_date", "Due Date", (item) => (item.row_type === "closing" ? "" : formatLedgerDate(item.due_date || item.unloading_date || ""))],
      ["due_days", "Due Days", (item) => (item.row_type === "closing" ? "" : (item.due_days !== undefined ? item.due_days : ""))],
      ["days_overdue", "Days Overdue", (item) => (item.row_type === "closing" ? "" : (item.days_overdue || ""))],
      ["followup_status_label", "Status", (item) => (item.row_type === "closing" ? "" : (item.followup_status_label || item.followup_status || "-"))],
      ["adjustment_details", "Adjustment Details", (item) => (item.row_type === "closing" ? "" : (item.adjustment_details || "-"))],
      ["warehouse", "Warehouse", (item) => (item.row_type === "closing" ? "" : getWarehouseName(item))],
      ["debit", "Debit", (item) => formatMoney(item.debit || 0)],
      ["credit", "Credit", (item) => formatMoney(item.credit || 0)],
      ["balance", "Balance", (item) => formatMoney(Math.abs(item.balance || 0))],
    ],
    "sale-followup": [
      ["date", "Date", (item) => formatLedgerDate(item.date)],
      ["party", "Buyer", (item) => (item.party_name || item.buyer_name || item.company_name || "-")],
      ["account", "Account", (item) => getAccountName(item)],
      ["voucher_no", "Voucher No", (item) => (item.voucher_no || "-")],
      ["unloading_date", "Unloading Date", (item) => formatLedgerDate(item.unloading_date || "")],
      ["due_date", "Due Date", (item) => formatLedgerDate(item.due_date || item.unloading_date || "")],
      ["due_days", "Due Days", (item) => (item.due_days !== undefined ? item.due_days : diffDays(item.unloading_date, item.due_date))],
      ["days_overdue", "Days Overdue", (item) => (item.days_overdue !== undefined ? item.days_overdue : diffDays(item.due_date, new Date().toISOString().slice(0, 10)))],
      ["followup_status_label", "Status", (item) => (item.followup_status_label || item.followup_status || "-")],
      ["balance", "Balance", (item) => formatMoney(Math.abs(item.balance || item.bill_balance || item.outstanding || 0))],
      ["actions", "Actions", (item) => {
        const email = String(item.contact_email || item.buyer_email || item.consignee_email || "").trim();
        const mobileRaw = String(item.contact_mobile || item.buyer_mobile || item.consignee_mobile || "").trim();
        const mobile = mobileRaw.replace(/\D/g, "");
        const whatsappNumber = mobile.length === 10 ? `91${mobile}` : mobile;
        const dueDate = item.due_date || item.unloading_date || "";
        const body = encodeURIComponent(
          [
            `Dear ${item.party_name || item.buyer_name || item.company_name || "Party"},`,
            "",
            `Your outstanding balance is ${formatMoney(Math.abs(item.balance || 0))}.`,
            dueDate ? `Due Date: ${formatLedgerDate(dueDate)}` : "",
            item.due_days !== undefined ? `Due Days: ${item.due_days}` : "",
            item.days_overdue !== undefined ? `Days Overdue: ${item.days_overdue}` : "",
            "",
            "Please clear the pending amount at the earliest.",
            `Voucher No: ${item.voucher_no || "-"}`,
          ].filter(Boolean).join("\n")
        );
        return (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <a
              href={email ? `mailto:${email}?subject=${encodeURIComponent(`Outstanding follow-up for ${item.voucher_no || ""}`.trim())}&body=${body}` : "#"}
              onClick={(event) => {
                if (!email) event.preventDefault();
              }}
              style={{
                ...btnAction,
                background: email ? "#0f766e" : "#cbd5e1",
                padding: "6px 10px",
                textDecoration: "none",
                color: "#fff",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              Mail
            </a>
            <a
              href={whatsappNumber ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent([
                `Dear ${item.party_name || item.buyer_name || item.company_name || "Party"},`,
                `Your outstanding balance is ${formatMoney(Math.abs(item.balance || 0))}.`,
                dueDate ? `Due Date: ${formatLedgerDate(dueDate)}` : "",
                item.due_days !== undefined ? `Due Days: ${item.due_days}` : "",
                item.days_overdue !== undefined ? `Days Overdue: ${item.days_overdue}` : "",
                `Voucher No: ${item.voucher_no || "-"}`,
              ].filter(Boolean).join(" "))}` : "#"}
              onClick={(event) => {
                if (!whatsappNumber) event.preventDefault();
              }}
              target="_blank"
              rel="noreferrer"
              style={{
                ...btnAction,
                background: whatsappNumber ? "#15803d" : "#cbd5e1",
                padding: "6px 10px",
                textDecoration: "none",
                color: "#fff",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              WhatsApp
            </a>
          </div>
        );
      }],
    ],
    "warehouse-stock": [
      ["warehouse", "Warehouse", (item) => getWarehouseName(item)],
      ["account", "Account Name", (item) => getAccountName(item)],
      ["product", "Product", (item) => getProductName(item)],
      ["purchase_qty", "Purchase Qty", (item) => (
        <button type="button" onClick={() => openStockDrilldown(item, "purchase")} style={linkButtonStyle}>
          {formatDecimal4(item.purchase_qty || 0)}
        </button>
      )],
      ["sale_qty", "Sale Qty", (item) => (
        <button type="button" onClick={() => openStockDrilldown(item, "sale")} style={linkButtonStyle}>
          {formatDecimal4(item.sale_qty || 0)}
        </button>
      )],
      ["stock_qty", "Stock Qty", (item) => (
        <button type="button" onClick={() => openStockDrilldown(item, "stock")} style={linkButtonStyle}>
          {formatDecimal4(item.stock_qty || 0)}
        </button>
      )],
      ["avg_rate", "Avg Rate", (item) => formatMoney(item.avg_rate || 0)],
      ["stock_amount", "Stock Amount", (item) => formatMoney(item.stock_amount || 0)],
    ],
    "fifo-stock": [
      ["date", "Purchase Date", (item) => item.date || "-"],
      ["voucher_no", "Voucher No", (item) => item.voucher_no || "-"],
      ["warehouse", "Warehouse", (item) => getWarehouseName(item)],
      ["product", "Product", (item) => getProductName(item)],
      ["purchase_qty", "Purchase Qty", (item) => formatDecimal4(item.purchase_qty || 0)],
      ["remaining_qty", "FIFO Balance Qty", (item) => formatDecimal4(item.remaining_qty || 0)],
      ["gross_weight", "Gross Wt", (item) => formatDecimal4(item.gross_weight || 0)],
      ["rate", "FIFO Rate", (item) => formatMoney(item.rate || 0)],
      ["amount", "FIFO Amount", (item) => formatMoney(item.amount || 0)],
    ],
    "profit-loss": [
      ["warehouse", "Warehouse", (item) => item.warehouse_name || getWarehouseName(item)],
      ["sale_amount", "Sale Amount", (item) => formatMoney(item.sale_amount || 0)],
      ["purchase_amount", "Purchase Amount", (item) => formatMoney(item.purchase_amount || 0)],
      ["profit_loss", "Profit/Loss", (item) => (
        <span style={{ color: Number(item.profit_loss || 0) >= 0 ? "#16a34a" : "#dc2626" }}>
          {formatMoney(item.profit_loss || 0)}
        </span>
      )],
    ],
  };

  const activeReportColumns = reportColumns[activeReport] || (activeReport === "sale-journey" ? reportColumns["sale-party-ledger"] : reportColumns.sale);
  const displayReportData = useMemo(() => {
    if (activeReport === "sale-followup") {
      const rows = Array.isArray(reportData) ? reportData : [];
      if (saleFollowupFilter === "all") return rows;
      return rows.filter((row) => String(row.followup_status || "pending").toLowerCase() === saleFollowupFilter);
    }
    if (activeReport !== "purchase-party-ledger" && activeReport !== "sale-party-ledger") return reportData;
    const entries = (Array.isArray(reportData) ? reportData : []).filter((row) => row.row_type !== "closing");
    const ledgerPartyName = (row) => activeReport === "purchase-party-ledger"
      ? (row.farmer_name || getFarmerName(row) || "Unknown Farmer")
      : (row.party_name || row.buyer_name || row.company_name || "Unknown Party");
    const ledgerGroupKey = (row) => `${ledgerPartyName(row)}::${row.company_account_id || row.company_account_name || row.account_name || ""}`;
    const sorted = entries.slice().sort((a, b) => {
      const leftParty = ledgerGroupKey(a);
      const rightParty = ledgerGroupKey(b);
      const partyCmp = String(leftParty).localeCompare(String(rightParty));
      if (partyCmp) return partyCmp;
      const dateCmp = String(a.date || "").localeCompare(String(b.date || ""));
      if (dateCmp) return dateCmp;
      return String(a.voucher_no || "").localeCompare(String(b.voucher_no || ""));
    });
    const grouped = [];
    let currentGroup = null;
    let currentParty = null;
    let currentAccount = null;
    let running = 0;
    let farmerDebit = 0;
    let farmerCredit = 0;
    const pushClosing = () => {
      if (!currentGroup) return;
      grouped.push({
        row_type: "closing",
        farmer_name: currentParty,
        party_name: currentParty,
        company_account_name: currentAccount,
        debit: farmerDebit,
        credit: farmerCredit,
        balance: running,
        closing_side: running > 0 ? "DR" : "CR",
      });
    };
    sorted.forEach((row) => {
      const partyName = ledgerPartyName(row);
      const groupKey = ledgerGroupKey(row);
      if (currentGroup && groupKey !== currentGroup) {
        pushClosing();
        running = 0;
        farmerDebit = 0;
        farmerCredit = 0;
      }
      currentGroup = groupKey;
      currentParty = partyName;
      currentAccount = getAccountName(row);
      const debit = toNumber(row.debit || 0);
      const credit = toNumber(row.credit || 0);
      running += debit - credit;
      farmerDebit += debit;
      farmerCredit += credit;
      grouped.push({
        ...row,
        farmer_name: activeReport === "purchase-party-ledger" ? partyName : row.farmer_name,
        party_name: activeReport === "sale-party-ledger" ? partyName : row.party_name,
        balance: Number(running.toFixed(4)),
        row_type: "entry",
      });
    });
    pushClosing();
    return grouped;
  }, [activeReport, reportData, farmers, buyerNames, companyAccounts, saleFollowupFilter]);
  const saleFollowupRows = activeReport === "sale-followup" ? displayReportData : [];
  const saleFollowupCounts = useMemo(() => {
    const counts = { all: saleFollowupRows.length, payment_done: 0, unloading_pending: 0, pending: 0, overdue: 0 };
    saleFollowupRows.forEach((row) => {
      const status = String(row.followup_status || "pending").toLowerCase();
      if (counts[status] !== undefined) counts[status] += 1;
    });
    return counts;
  }, [saleFollowupRows]);
  const saleFollowupStatusMeta = {
    all: { label: "All Bills", bg: "#0f172a", color: "#fff" },
    payment_done: { label: "Payment Done", bg: "#dcfce7", color: "#166534" },
    unloading_pending: { label: "Unloading Pending", bg: "#fef3c7", color: "#92400e" },
    pending: { label: "Payment Pending", bg: "#dbeafe", color: "#1d4ed8" },
    overdue: { label: "Overdue", bg: "#fee2e2", color: "#b91c1c" },
  };
  const purchaseBillRows = activeReport === "purchase-party-ledger"
    ? displayReportData.filter((row) => row.row_type === "entry" && row.voucher_type === "Purchase")
    : [];
  const selectedBill = purchaseBillRows.find((row) => String(row.purchase_id || row.voucher_no) === String(selectedLedgerBillId)) || purchaseBillRows[0] || null;
  const saleBillRows = activeReport === "sale-party-ledger" || activeReport === "sale-journey"
    ? displayReportData.filter((row) => row.row_type === "entry" && row.voucher_type === "Sale")
    : [];
  const selectedSaleBill = saleBillRows.find((row) => String(row.sale_id || row.voucher_no) === String(selectedSaleLedgerBillId)) || saleBillRows[0] || null;
  const selectedSaleJourneyKey = String(selectedSaleBill?.journey_token || selectedSaleBill?.journey_id || selectedSaleBill?.journey_group_no || "").trim();
  const selectedSaleJourneyRows = selectedSaleJourneyKey
    ? saleBillRows.filter((row) => String(row.journey_token || row.journey_id || row.journey_group_no || "") === selectedSaleJourneyKey)
    : selectedSaleBill
      ? saleBillRows.filter((row) => String(row.lorry_no || "") === String(selectedSaleBill.lorry_no || "") && String(row.date || "") === String(selectedSaleBill.date || ""))
      : [];
  const selectedSaleJourneyTotalQty = selectedSaleJourneyRows.reduce((sum, row) => sum + toNumber(row.quantity || row.total_quantity || row.unloading_qty || 0), 0);
  const selectedSaleJourneyTotalAmount = selectedSaleJourneyRows.reduce((sum, row) => sum + toNumber(row.amount || row.total_amount || row.net_receivable_amount || 0), 0);
  const selectedSaleJourneyBalanceQty = Math.max(
    toNumber(selectedSaleBill?.total_quantity || selectedSaleBill?.quantity || selectedSaleBill?.unloading_qty || 0) - selectedSaleJourneyTotalQty,
    0
  );

  const getAccountDetails = (item) => {
    const accountId = String(item.company_account_id || item.account_id || item.companyAccountId || "");
    return companyAccounts.find((account) => String(account.id || account._id) === accountId) || {};
  };

  const getLedgerPartyDetails = (row, ledgerType = activeReport) => {
    if (row.row_type === "closing") return { name: row.party_name || row.farmer_name || "-", address: "", mobile: "", email: "", gst: "", pan: "" };
    if (ledgerType === "purchase-party-ledger") {
      const farmerId = String(row.farmer_id || "");
      const farmer = farmers.find((item) => String(item.id || item._id) === farmerId) || {};
      return {
        name: row.farmer_name || farmer.name || getFarmerName(row) || "-",
        address: row.farmer_address || farmer.address || farmer.village || "",
        mobile: row.farmer_mobile || farmer.mobile || "",
        email: row.farmer_email || farmer.email || "",
        gst: row.farmer_gst || farmer.gst_no || farmer.gst || "",
        pan: row.farmer_pan || farmer.pan_no || farmer.pan || "",
      };
    }
    const buyerId = String(row.buyer_id || row.company_id || "");
    const buyer = buyerNames.find((item) => String(item.id || item._id) === buyerId) || {};
    return {
      name: row.party_name || row.buyer_name || row.company_name || buyer.name || "-",
      address: row.buyer_address || row.company_address || buyer.address || buyer.location || "",
      mobile: row.buyer_mobile || row.company_mobile || buyer.mobile || "",
      email: row.buyer_email || row.company_email || buyer.email || "",
      gst: row.buyer_gst || row.company_gst || buyer.gst_no || buyer.gst || "",
      pan: row.buyer_pan || row.company_pan || buyer.pan_no || buyer.pan || "",
    };
  };

  const getLedgerAccountDetails = (row) => {
    const account = getAccountDetails(row);
    return {
      name: getAccountName(row),
      address: row.company_account_address || row.account_address || account.address || "",
      mobile: row.company_account_mobile || row.account_mobile || account.mobile || "",
      email: row.company_account_email || row.account_email || account.email || "",
      gst: row.company_account_gst || row.account_gst || account.gst_no || account.gst || "",
      pan: row.company_account_pan || row.account_pan || account.pan_no || account.pan || "",
    };
  };

  const formatLedgerContact = ({ address, mobile, email, gst, pan }) =>
    [
      address ? `Address: ${address}` : "",
      mobile ? `Phone: ${mobile}` : "",
      email ? `Mail: ${email}` : "",
      gst ? `GST: ${gst}` : "",
      pan ? `PAN: ${pan}` : "",
    ].filter(Boolean).join(" | ") || "-";

  const buildLedgerPdf = (ledgerType) => {
    const title = ledgerType === "sale-party-ledger" ? "Sale Party Ledger" : "Purchase Party Ledger";
    const partyLabel = ledgerType === "sale-party-ledger" ? "Party" : "Farmer";
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(14);
    doc.text(title, 14, 14);
    doc.setFontSize(9);
    doc.text(`Generated: ${formatLedgerDate(new Date().toISOString().slice(0, 10))}`, 14, 20);
    const firstEntry = (displayReportData || []).find((row) => row.row_type !== "closing") || {};
    const reportParty = getLedgerPartyDetails(firstEntry, ledgerType);
    const reportAccount = getLedgerAccountDetails(firstEntry);
    doc.setFontSize(10);
    doc.text(`${reportAccount.name || "-"}`, 14, 26);
    doc.setFontSize(8.5);
    doc.text(formatLedgerContact(reportAccount), 14, 31);
    doc.setFontSize(10);
    doc.text(`${reportParty.name || "-"}`, 14, 37);
    doc.setFontSize(8.5);
    doc.text(formatLedgerContact(reportParty), 14, 42);
    const saleOnlyColumns = ledgerType === "sale-party-ledger"
      ? [
          "Date",
          "Type",
          "Voucher No",
          "Adjustment & Details",
          "Particulars",
        "Due Date",
        "Due Days",
        "Days Overdue",
        "Dr",
        "Cr",
        "Balance",
      ]
      : [
          "Date",
          partyLabel,
          "Party Details",
          "Account",
          "Account Details",
          "Type",
          "Voucher No",
          "Adjustment Details",
          "Warehouse",
          "Due Date",
          "Due Days",
          "Days Overdue",
          "Dr",
          "Cr",
          "Balance",
        ];
    autoTable(doc, {
      startY: 48,
      styles: { fontSize: 7, cellPadding: 2, overflow: "linebreak" },
      head: [saleOnlyColumns],
      body: displayReportData.map((row) => {
        const party = getLedgerPartyDetails(row, ledgerType);
        const account = getLedgerAccountDetails(row);
        if (ledgerType === "sale-party-ledger") {
          const saleDetailParts = [
            `Qty: ${formatDecimal4(row.quantity || row.unloading_qty || 0)}`,
            `Rate: ${formatMoney(row.rate || 0)}`,
            `Lorry No: ${row.lorry_no || row.reference_id || "-"}`,
          ];
          const adjustmentDetails = String(row.adjustment_details || row.journal_details?.map?.((j) => `${j.voucher_no || "-"}: ${j.type || "Journal"} Rs.${formatMoney(j.amount || 0)}`)?.join("\n") || "").trim();
          const deductionDetails = String(row.deduction_details || row.description || "").trim();
          const adjustmentText = [adjustmentDetails, deductionDetails].filter(Boolean).join("\n");
          const particularsText = [
            row.row_type === "closing" ? "" : (row.voucher_type || ""),
            row.row_type === "closing" ? "" : (row.particulars || row.adjustment_details || row.description || "-"),
          ].filter(Boolean).join("\n");
          return [
            row.row_type === "closing" ? "" : formatLedgerDate(row.date),
            row.row_type === "closing" ? "" : (row.voucher_type || ""),
            row.row_type === "closing" ? "" : (row.voucher_no || ""),
            row.row_type === "closing" ? "" : saleDetailParts.filter(Boolean).join("\n"),
            row.row_type === "closing" ? "" : particularsText,
            row.row_type === "closing" ? "" : formatLedgerDate(row.due_date || row.unloading_date || ""),
            row.row_type === "closing" ? "" : (row.due_days !== undefined ? row.due_days : ""),
            row.row_type === "closing" ? "" : (row.days_overdue !== undefined ? row.days_overdue : ""),
            formatMoney(row.debit || 0),
            formatMoney(row.credit || 0),
            formatMoney(Math.abs(row.balance || 0)),
          ];
        }
        return [
          row.row_type === "closing" ? "" : formatLedgerDate(row.date),
          row.row_type === "closing" ? `Closing Balance (${row.closing_side})` : party.name,
          row.row_type === "closing" ? "" : formatLedgerContact(party),
          row.row_type === "closing" ? "" : account.name,
          row.row_type === "closing" ? "" : formatLedgerContact(account),
          row.row_type === "closing" ? "" : (row.voucher_type || ""),
          row.row_type === "closing" ? "" : (row.voucher_no || ""),
          row.row_type === "closing" ? "" : (row.adjustment_details || row.particulars || ""),
          row.row_type === "closing" ? "" : getWarehouseName(row),
          row.row_type === "closing" ? "" : formatLedgerDate(row.due_date || row.unloading_date || ""),
          row.row_type === "closing" ? "" : (row.due_days !== undefined ? row.due_days : ""),
          row.row_type === "closing" ? "" : (row.days_overdue !== undefined ? row.days_overdue : ""),
          formatMoney(row.debit || 0),
          formatMoney(row.credit || 0),
          formatMoney(Math.abs(row.balance || 0)),
        ];
      }),
      columnStyles: {
        ...(ledgerType === "sale-party-ledger"
          ? {
              3: { cellWidth: 70 },
              4: { cellWidth: 62 },
              8: { cellWidth: 40 },
              9: { cellWidth: 22 },
              10: { cellWidth: 22 },
            }
          : {
              2: { cellWidth: 38 },
              4: { cellWidth: 36 },
              5: { cellWidth: 24 },
              6: { cellWidth: 22 },
              7: { cellWidth: 22 },
            }),
      },
    });
    return { doc, title };
  };

  const downloadLedgerPdf = (ledgerType = activeReport) => {
    if ((ledgerType !== "purchase-party-ledger" && ledgerType !== "sale-party-ledger") || !displayReportData.length) {
      alert("No ledger data available");
      return;
    }
    const { doc } = buildLedgerPdf(ledgerType);
    doc.save(`${ledgerType}-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const downloadPurchaseLedgerPdf = () => downloadLedgerPdf("purchase-party-ledger");
  const downloadSaleLedgerPdf = () => downloadLedgerPdf("sale-party-ledger");

  const shareLedgerWhatsapp = async (ledgerType = activeReport) => {
    if ((ledgerType !== "purchase-party-ledger" && ledgerType !== "sale-party-ledger") || !displayReportData.length) {
      alert("No ledger data available");
      return;
    }
    const title = ledgerType === "sale-party-ledger" ? "Sale Party Ledger" : "Purchase Party Ledger";
    const closingRows = displayReportData.filter((row) => row.row_type === "closing");
    const summary = closingRows
      .map((row) => {
        const party = getLedgerPartyDetails(row, ledgerType);
        const account = getLedgerAccountDetails(row);
        return `${party.name} | ${account.name}: ${row.closing_side} ${formatMoney(Math.abs(row.balance || 0))}`;
      })
      .join("\n");
    const detailLines = displayReportData
      .filter((row) => row.row_type !== "closing")
      .slice(0, 20)
      .map((row) => {
        const party = getLedgerPartyDetails(row, ledgerType);
        const account = getLedgerAccountDetails(row);
        return [
          `${formatLedgerDate(row.date)} ${row.voucher_no || ""} ${row.voucher_type || ""}`,
          `${party.name} (${formatLedgerContact(party)})`,
          `Account: ${account.name} (${formatLedgerContact(account)})`,
          `Dr ${formatMoney(row.debit || 0)} Cr ${formatMoney(row.credit || 0)} Bal ${formatMoney(Math.abs(row.balance || 0))}`,
        ].join("\n");
      })
      .join("\n\n");
    const message = `${title}\n\nSummary\n${summary || "No closing rows"}\n\nDetails\n${detailLines || "No ledger rows"}`;

    const { doc } = buildLedgerPdf(ledgerType);
    const fileName = `${ledgerType}-${new Date().toISOString().slice(0, 10)}.pdf`;
    const pdfBlob = doc.output("blob");
    const pdfFile = new File([pdfBlob], fileName, { type: "application/pdf" });
    if (navigator.canShare?.({ files: [pdfFile] })) {
      await navigator.share({ title, text: message, files: [pdfFile] });
      return;
    }

    doc.save(fileName);
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank");
  };

  const sharePurchaseLedgerWhatsapp = () => shareLedgerWhatsapp("purchase-party-ledger");
  const shareSaleLedgerWhatsapp = () => shareLedgerWhatsapp("sale-party-ledger");

  const stockPurchaseRows = useMemo(() => stockDrilldown?.item?.purchase_details || [], [stockDrilldown]);
  const stockSaleRows = useMemo(() => stockDrilldown?.item?.sale_details || [], [stockDrilldown]);
  const stockDrilldownAllRows = useMemo(() => {
    if (!stockDrilldown?.item) return [];

    const rows = [
      ...stockPurchaseRows.map((row) => ({
        ...row,
        type: "Purchase",
        inward_qty: toNumber(row.qty),
        outward_qty: 0,
        inward_rate: toNumber(row.rate),
        outward_rate: 0,
        inward_amount: toNumber(row.amount),
        outward_amount: 0,
      })),
      ...stockSaleRows.map((row) => ({
        ...row,
        type: "Sale",
        inward_qty: 0,
        outward_qty: toNumber(row.qty),
        inward_rate: 0,
        outward_rate: toNumber(row.rate),
        inward_amount: 0,
        outward_amount: toNumber(row.amount),
      })),
    ].sort((a, b) => {
      const dateCmp = String(a.date || "").localeCompare(String(b.date || ""));
      if (dateCmp) return dateCmp;
      const typeCmp = a.type === b.type ? 0 : a.type === "Purchase" ? -1 : 1;
      if (typeCmp) return typeCmp;
      return String(a.voucher_no || "").localeCompare(String(b.voucher_no || ""));
    });

    let runningQty = 0;
    let runningPurchaseQty = 0;
    let runningPurchaseAmount = 0;
    return rows.map((row) => {
      runningQty += toNumber(row.inward_qty) - toNumber(row.outward_qty);
      runningPurchaseQty += toNumber(row.inward_qty);
      runningPurchaseAmount += toNumber(row.inward_amount);
      const avgRate = runningPurchaseQty > 0 ? runningPurchaseAmount / runningPurchaseQty : 0;
      return {
        ...row,
        balance_qty: Number(runningQty.toFixed(4)),
        day_avg_rate: Number(avgRate.toFixed(2)),
        stock_value: Number((runningQty * avgRate).toFixed(2)),
      };
    });
  }, [stockDrilldown, stockPurchaseRows, stockSaleRows]);

  const stockDrilldownRows = stockDrilldownAllRows.filter((row) => {
    if (stockDrilldown?.mode === "purchase" && row.type !== "Purchase") return false;
    if (stockDrilldown?.mode === "sale" && row.type !== "Sale") return false;
    const date = String(row.date || "").slice(0, 10);
    if (stockDrilldownFromDate && date < stockDrilldownFromDate) return false;
    if (stockDrilldownToDate && date > stockDrilldownToDate) return false;
    return true;
  });

  const stockDrilldownTotals = stockDrilldownRows.reduce(
    (acc, row) => {
      acc.inward_qty += toNumber(row.inward_qty);
      acc.outward_qty += toNumber(row.outward_qty);
      acc.inward_amount += toNumber(row.inward_amount);
      acc.outward_amount += toNumber(row.outward_amount);
      acc.balance_qty = toNumber(row.balance_qty);
      acc.avg_rate = toNumber(row.day_avg_rate);
      acc.stock_value = toNumber(row.stock_value);
      return acc;
    },
    { inward_qty: 0, outward_qty: 0, inward_amount: 0, outward_amount: 0, balance_qty: 0, avg_rate: 0, stock_value: 0 }
  );

  const stockDrilldownTitle =
    stockDrilldown?.mode === "purchase"
      ? "Purchase Qty / Inward Details"
      : stockDrilldown?.mode === "sale"
        ? "Sale Qty / Outward Details"
        : "Stock Qty Full Details";
  const isStockDrilldownPurchase = stockDrilldown?.mode === "purchase";
  const isStockDrilldownSale = stockDrilldown?.mode === "sale";
  const isStockDrilldownCombined = !isStockDrilldownPurchase && !isStockDrilldownSale;

  const downloadStockDrilldownPdf = () => {
    if (!stockDrilldown) return;
    const doc = new jsPDF({ orientation: "landscape" });
    const title = stockDrilldownTitle;
    const subtitle = `${getWarehouseName(stockDrilldown.item)} | ${getAccountName(stockDrilldown.item)} | ${getProductName(stockDrilldown.item)}`;
    doc.setFontSize(14);
    doc.text(title, 14, 14);
    doc.setFontSize(9);
    doc.text(subtitle, 14, 20);
    const filterText = [
      stockDrilldownFromDate ? `From: ${formatLedgerDate(stockDrilldownFromDate)}` : "",
      stockDrilldownToDate ? `To: ${formatLedgerDate(stockDrilldownToDate)}` : "",
    ].filter(Boolean).join("  ");
    if (filterText) doc.text(filterText, 14, 26);

    const headRow = [
      "Date",
      "Type",
      "Voucher No",
      "Party",
      ...(isStockDrilldownSale ? [] : ["Inward Qty", "In Rate", "In Value"]),
      ...(isStockDrilldownPurchase ? [] : ["Outward Qty", "Out Rate", "Out Value"]),
      isStockDrilldownCombined ? "Stock Qty" : "Balance Qty",
      "Purchase Avg Rate",
      "Stock Value",
    ];
    const bodyRows = stockDrilldownRows.map((row) => [
      formatLedgerDate(row.date),
      row.type,
      row.voucher_no || "-",
      row.party_name || "-",
      ...(isStockDrilldownSale ? [] : [
        row.inward_qty ? formatDecimal4(row.inward_qty) : "",
        row.inward_rate ? formatMoney(row.inward_rate) : "",
        row.inward_amount ? formatMoney(row.inward_amount) : "",
      ]),
      ...(isStockDrilldownPurchase ? [] : [
        row.outward_qty ? formatDecimal4(row.outward_qty) : "",
        row.outward_rate ? formatMoney(row.outward_rate) : "",
        row.outward_amount ? formatMoney(row.outward_amount) : "",
      ]),
      formatDecimal4(row.balance_qty),
      formatMoney(row.day_avg_rate),
      formatMoney(row.stock_value),
    ]);
    const footRow = [
      "Total",
      "",
      "",
      "",
      ...(isStockDrilldownSale ? [] : [
        formatDecimal4(stockDrilldownTotals.inward_qty),
        "",
        formatMoney(stockDrilldownTotals.inward_amount),
      ]),
      ...(isStockDrilldownPurchase ? [] : [
        formatDecimal4(stockDrilldownTotals.outward_qty),
        "",
        formatMoney(stockDrilldownTotals.outward_amount),
      ]),
      formatDecimal4(stockDrilldownTotals.balance_qty),
      formatMoney(stockDrilldownTotals.avg_rate),
      formatMoney(stockDrilldownTotals.stock_value),
    ];

    autoTable(doc, {
      startY: filterText ? 31 : 26,
      styles: { fontSize: 7, cellPadding: 1.8, overflow: "linebreak" },
      headStyles: { fillColor: [8, 122, 115], textColor: 255 },
      footStyles: { fillColor: [239, 246, 255], textColor: 15, fontStyle: "bold" },
      head: [headRow],
      body: bodyRows,
      foot: [footRow],
      columnStyles: {
        3: { cellWidth: 42 },
      },
    });
    doc.save(`stock-qty-details-${new Date().toISOString().slice(0, 10)}.pdf`);
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
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
              <h3 style={{ margin: 0 }}>{editId ? "Edit" : "New"} {activeVoucherType.charAt(0).toUpperCase() + activeVoucherType.slice(1)} Voucher</h3>
              {isPurchaseVoucher && hasPermission(user, "warehouse.trading.purchase.manage") && (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button type="button" onClick={downloadPurchaseImportTemplate} style={{ ...btnAction, background: "#0f766e" }}>
                    Download Excel Format
                  </button>
                  <label style={{ ...btnAction, background: importingPurchase ? "#94a3b8" : "#2563eb", cursor: importingPurchase ? "not-allowed" : "pointer" }}>
                    {importingPurchase ? "Importing..." : "Import Excel"}
                    <input
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handlePurchaseExcelImport}
                      disabled={importingPurchase}
                      style={{ display: "none" }}
                    />
                  </label>
                </div>
              )}
            </div>
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
                          <th style={erpTh}>New Wt</th>
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
                          <td style={erpTd}><input name="packet" type="number" step="0.0001" value={formData.packet} onChange={handleChange} style={erpCellInput} /></td>
                          <td style={erpTd}><input name="gross_weight" type="number" step="0.0001" value={formData.gross_weight} onChange={handleChange} style={erpCellInput} /></td>
                          <td style={erpTd}><input name="tare_weight" type="number" step="0.0001" value={formData.tare_weight} onChange={handleChange} style={erpCellInput} /></td>
                          <td style={erpTd}><input value={formatDecimal4(safePurchaseNewWeight)} readOnly style={{ ...erpCellInput, ...erpReadOnlyCell }} /></td>
                          <td style={erpTd}><input name="dhalta" type="number" step="0.0001" value={formData.dhalta} onChange={handleChange} style={erpCellInput} /></td>
                          {purchaseDeductionFields.map((field) => (
                            <td key={field.key} style={erpTd}>
                              <input name={field.key} type="number" step="0.0001" value={formData[field.key]} onChange={handleChange} style={erpCellInput} />
                            </td>
                          ))}
                          <td style={erpTd}><input value={formatDecimal4(safePurchaseNetWeight)} readOnly style={{ ...erpCellInput, ...erpReadOnlyCell }} /></td>
                          <td style={erpTd}><input name="rate" type="number" step="0.0001" value={formData.rate} onChange={handleChange} style={erpCellInput} /></td>
                          <td style={erpTd}><input value={formatMoney(purchaseGrossAmount)} readOnly style={{ ...erpCellInput, ...erpReadOnlyCell }} /></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div style={erpMiddleBar}>
                      <span></span>
                      <strong>Total Quantity : {formatDecimal4(safePurchaseNetWeight)}</strong>
                  </div>

                  <div style={erpBottomGrid}>
                    <div>
                      <table style={erpMiniTable}>
                        <thead>
                          <tr><th style={erpTh}>Particulars</th><th style={erpTh}>Amount</th></tr>
                        </thead>
                        <tbody>
                          <tr><td style={erpTd}>Bags Claim</td><td style={erpTd}><input name="bags_claim" type="number" step="0.0001" value={formData.bags_claim} onChange={handleChange} style={erpCellInput} /></td></tr>
                          <tr><td style={erpTd}>Labour</td><td style={erpTd}><input name="labour" type="number" step="0.0001" value={formData.labour} onChange={handleChange} style={erpCellInput} /></td></tr>
                          <tr><td style={{ ...erpTd, fontWeight: 700 }}>Total Deduction</td><td style={{ ...erpTd, fontWeight: 700 }}>{formatMoney(purchaseTotalDeduction)}</td></tr>
                          <tr><td style={erpTd}>Round Off</td><td style={erpTd}><input name="round_off" type="number" step="0.0001" value={formData.round_off} onChange={handleChange} style={erpCellInput} /></td></tr>
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
              ) : isSaleVoucher ? (
                <div style={erpShell}>
                  <div style={erpTitleBar}>
                    <div style={erpTitleLeft}>
                      <span style={erpDocIcon}>S</span>
                      <span style={erpTitleText}>Sale</span>
                    </div>
                    <div style={erpMetaLine}>
                      <span>Subdocument : <strong>Sale</strong></span>
                      <span>Type : <strong>{editId ? "Regular [ Edit ]" : "Regular [ New ]"}</strong></span>
                      <span>Location</span>
                      <input value={selectedLocationName || ""} readOnly style={{ ...erpInput, width: 120 }} />
                    </div>
                  </div>

                  <div style={erpTopGrid}>
                    <div style={erpPanelWide}>
                      <div style={erpRow}>
                        <label style={erpLabel}>Buyer Name</label>
                        <select name="buyer_id" value={formData.buyer_id || formData.company_id} onChange={handleChange} style={{ ...erpInput, ...erpFocusInput }}>
                          <option value="">Select Buyer</option>
                          {buyerNames.map((buyer) => (
                            <option key={buyer.id || buyer._id} value={buyer.id || buyer._id}>{buyer.name}</option>
                          ))}
                        </select>
                      </div>
                      <div style={erpRow}>
                        <label style={erpLabel}>Account</label>
                        {renderAccountSelect(erpInput)}
                      </div>
                      <div style={erpRow}>
                        <label style={erpLabel}>Consignee</label>
                        <select name="consignee_id" value={formData.consignee_id} onChange={handleChange} style={erpInput}>
                          <option value="">{formData.buyer_id || formData.company_id ? "Select Consignee" : "Select Buyer First"}</option>
                          {filteredConsignees.map((c) => (
                            <option key={c.id || c._id} value={c.id || c._id}>{c.name}</option>
                          ))}
                        </select>
                      </div>
                      <div style={erpRow}>
                        <label style={erpLabel}>GSTIN</label>
                        <input value={selectedBuyer?.gst_no || selectedConsignee?.gst_no || ""} readOnly style={erpInput} />
                        <label style={{ ...erpLabel, width: 42, textAlign: "right" }}>State</label>
                        <input value={selectedBuyer?.state || selectedConsignee?.state || ""} readOnly style={{ ...erpInput, width: 90 }} />
                      </div>
                      <div style={erpRow}>
                        <label style={erpLabel}>PAN No.</label>
                        <input value={selectedBuyer?.pan_no || selectedConsignee?.pan_no || ""} readOnly style={erpInput} />
                        <label style={{ ...erpLabel, width: 50, textAlign: "right" }}>Mobile</label>
                        <input value={selectedBuyer?.mobile || selectedConsignee?.mobile || ""} readOnly style={{ ...erpInput, width: 110 }} />
                      </div>
                      {formData.sale_type === "direct" && (
                        <>
                          <div style={erpRow}>
                            <label style={erpLabel}>Location</label>
                            <select name="location_id" value={formData.location_id} onChange={handleChange} style={erpInput}>
                              <option value="">Select Location</option>
                              {locations.map((location) => (
                                <option key={location.id || location._id} value={location.id || location._id}>{location.name}</option>
                              ))}
                            </select>
                          </div>
                          <div style={erpRow}>
                            <label style={erpLabel}>Farmer</label>
                            <select name="farmer_id" value={formData.farmer_id} onChange={handleChange} style={erpInput}>
                              <option value="">Select Farmer</option>
                              {farmers.map((farmer) => (
                                <option key={farmer.id || farmer._id} value={farmer.id || farmer._id}>{farmer.name}</option>
                              ))}
                            </select>
                          </div>
                          <div style={erpRow}>
                            <label style={erpLabel}>Purchase Rate</label>
                            <input name="direct_purchase_rate" type="number" step="0.0001" value={formData.direct_purchase_rate} onChange={handleChange} style={erpInput} />
                          </div>
                          <div style={erpRow}>
                            <label style={erpLabel}>Purchase Amount</label>
                            <input value={formatMoney(saleDispatchQtyFromData(formData) * toNumber(formData.direct_purchase_rate))} readOnly style={erpInput} />
                          </div>
                        </>
                      )}
                    </div>

                    <div style={erpPanelWide}>
                      {formData.sale_type !== "direct" && (
                        <div style={erpRow}>
                          <label style={erpLabel}>Warehouse Name</label>
                          <select name="warehouse_id" value={formData.warehouse_id} onChange={handleChange} style={erpInput}>
                            <option value="">Select Warehouse</option>
                            {warehouses.map((w) => (
                              <option key={w.id || w._id} value={w.id || w._id}>{w.name}</option>
                            ))}
                          </select>
                        </div>
                      )}
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
                        <label style={erpLabel}>Sale Type</label>
                        <select name="sale_type" value={formData.sale_type || "direct"} onChange={handleChange} style={erpInput}>
                          <option value="direct">Direct Farmer Loading Sale</option>
                          <option value="warehouse">Warehouse Sale</option>
                        </select>
                      </div>
                      <div style={erpRow}>
                        <label style={erpLabel}>Number</label>
                        <input name="voucher_no" value={formData.voucher_no} onChange={handleChange} placeholder="Voucher No *" style={erpInput} required />
                      </div>
                      <div style={erpRow}>
                        <label style={erpLabel}>Date</label>
                        <input name="date" type="date" value={formData.date} onChange={handleChange} style={erpInput} required />
                      </div>
                      <div style={erpRow}>
                        <label style={erpLabel}>Unloading Date</label>
                        <input name="unloading_date" type="date" value={formData.unloading_date} onChange={handleChange} style={erpInput} />
                      </div>
                      <div style={erpRow}>
                        <label style={erpLabel}>Due Days</label>
                        <input name="due_days" type="number" min="0" value={formData.due_days} onChange={handleChange} style={erpInput} />
                      </div>
                      <div style={erpRow}>
                        <label style={erpLabel}>P.O No</label>
                        <input name="po_no" value={formData.po_no} onChange={handleChange} style={erpInput} />
                      </div>
                      <div style={erpRow}>
                        <label style={erpLabel}>Due Date</label>
                        <input name="due_date" type="date" value={formData.due_date} onChange={handleChange} style={erpInput} />
                      </div>
                      <div style={erpRow}>
                        <label style={erpLabel}>R. S. T No</label>
                        <input name="reference_id" value={formData.reference_id} onChange={handleChange} placeholder="R. S. T No" style={erpInput} />
                      </div>
                    </div>
                  </div>

                  <div style={erpSectionLabel}>GOODS SALE DETAILS</div>
                  <div style={erpGridWrap}>
                    <table style={erpItemsTable}>
                      <thead>
                        <tr>
                          <th style={{ ...erpTh, width: 54 }}>S.L No</th>
                          <th style={{ ...erpTh, minWidth: 250 }}>Product</th>
                          <th style={erpTh}>Packet</th>
                          <th style={erpTh}>Gross Wt</th>
                          <th style={erpTh}>Tare Wt</th>
                          <th style={erpTh}>New Wt</th>
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
                          <td style={erpTd}><input name="packet" type="number" step="0.0001" value={formData.packet} onChange={handleChange} style={erpCellInput} /></td>
                          <td style={erpTd}><input name="gross_weight" type="number" step="0.0001" value={formData.gross_weight} onChange={handleChange} style={erpCellInput} /></td>
                          <td style={erpTd}><input name="tare_weight" type="number" step="0.0001" value={formData.tare_weight} onChange={handleChange} style={erpCellInput} /></td>
                          <td style={erpTd}><input value={formatDecimal4(toNumber(formData.gross_weight) - toNumber(formData.tare_weight))} readOnly style={{ ...erpCellInput, ...erpReadOnlyCell }} /></td>
                          <td style={erpTd}><input value={formatDecimal4(saleQtyFromData(formData))} readOnly style={{ ...erpCellInput, ...erpReadOnlyCell }} /></td>
                          <td style={erpTd}><input name="rate" type="number" step="0.0001" value={formData.rate} onChange={handleChange} style={erpCellInput} /></td>
                          <td style={erpTd}><input value={formatMoney(saleGrossAmountFromData(formData))} readOnly style={{ ...erpCellInput, ...erpReadOnlyCell }} /></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div style={erpMiddleBar}>
                      <span></span>
                      <strong>Sale Date : {formData.date || "Not Set"}</strong>
                  </div>

                  <div style={erpBottomGrid}>
                    <div>
                      <table style={erpMiniTable}>
                        <thead>
                          <tr><th style={erpTh}>Particulars</th><th style={erpTh}>Amount</th></tr>
                        </thead>
                        <tbody>
                          <tr><td style={erpTd}>Lorry No</td><td style={erpTd}><input name="lorry_no" value={formData.lorry_no} onChange={handleChange} style={erpCellInput} /></td></tr>
                          <tr><td style={erpTd}>Other Deduction</td><td style={erpTd}><input name="other_deduction" type="number" step="0.0001" value={formData.other_deduction} onChange={handleChange} style={erpCellInput} /></td></tr>
                          <tr>
                            <td style={erpTd}>CD %</td>
                            <td style={erpTd}>
                              <div style={{ display: "grid", gridTemplateColumns: "80px 1fr", gap: 6 }}>
                                <input name="cd_percent" type="number" step="0.0001" value={formData.cd_percent} onChange={handleChange} style={erpCellInput} />
                                <input value={formatMoney(saleCashDiscountAmount)} readOnly style={{ ...erpCellInput, ...erpReadOnlyCell }} />
                              </div>
                            </td>
                          </tr>
                          <tr><td style={erpTd}>Claim/TDS</td><td style={erpTd}><input name="claim_amount" type="number" step="0.0001" value={formData.claim_amount} onChange={handleChange} style={erpCellInput} /></td></tr>
                          <tr><td style={{ ...erpTd, fontWeight: 700 }}>Total Deduction</td><td style={{ ...erpTd, fontWeight: 700 }}>{formatMoney(toNumber(formData.other_deduction) + toNumber(formData.claim_amount) + saleCashDiscountAmount)}</td></tr>
                          <tr><td style={erpTd}>Round Off</td><td style={erpTd}><input name="round_off" type="number" step="0.0001" value={formData.round_off} onChange={handleChange} style={erpCellInput} /></td></tr>
                          <tr><td style={erpTd}>F2 Voucher Pass</td><td style={erpTd}><button type="button" onClick={() => setShowSaleDeductionModal(true)} style={{ ...btnAction, background: "#0f766e", width: "100%" }}>F2 Voucher Pass</button></td></tr>
                        </tbody>
                      </table>
                      <div style={erpRemarksRow}>
                        <label style={erpLabel}>Narration</label>
                        <textarea name="description" value={formData.description} onChange={handleChange} rows={2} style={erpTextarea} />
                      </div>
                      {activeVoucherType === "sale" && (
                        <div style={smartInfoGridStyle}>
                          <div style={smartInfoBoxStyle}>
                            <span>Buyer Sale Qty</span>
                            <strong>{formatDecimal4(selectedBuyerSaleQty)}</strong>
                          </div>
                          <div style={smartInfoBoxStyle}>
                            <span>Balance Amount</span>
                            <strong>{formatMoney(selectedBuyerBalanceAmount)}</strong>
                          </div>
                          <div style={smartInfoBoxStyle}>
                            <span>Pending Amount</span>
                            <strong>{formatMoney(selectedBuyerPendingAmount)}</strong>
                          </div>
                          {formData.sale_type !== "direct" && (
                            <div style={smartInfoBoxStyle}>
                              <span>Warehouse Balance Qty</span>
                              <strong>{selectedWarehouseBalanceQty === null ? "-" : formatDecimal4(selectedWarehouseBalanceQty)}</strong>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div>
                      <table style={erpMiniTable}>
                        <thead>
                          <tr><th style={erpTh}>Sale Summary</th><th style={erpTh}>Amount</th></tr>
                        </thead>
                        <tbody>
                          <tr><td style={erpTd}>Gross Amount</td><td style={erpTd}>{formatMoney(saleGrossAmountFromData(formData))}</td></tr>
                          <tr><td style={erpTd}>Cash Discount</td><td style={erpTd}>{formatMoney(saleCashDiscountAmount)}</td></tr>
                          <tr><td style={erpTd}>Total Deduction</td><td style={erpTd}>{formatMoney(toNumber(formData.other_deduction) + toNumber(formData.claim_amount) + saleCashDiscountAmount)}</td></tr>
                          <tr><td style={erpTd}>Round Off</td><td style={erpTd}>{formatMoney(toNumber(formData.round_off))}</td></tr>
                          <tr><td style={erpTd}>Net Amount Payable</td><td style={erpTd}>{formatMoney(saleNetReceivablePreview)}</td></tr>
                        </tbody>
                      </table>

                      <div style={erpTotalPanel}>
                        <span style={erpTotalLabel}>T O T A L</span>
                        <strong style={erpTotalAmount}>{formatMoney(saleNetReceivablePreview)}</strong>
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
                {activeVoucherType === "sale" && (
                  <Field label="Sale Type">
                    <select name="sale_type" value={formData.sale_type || "direct"} onChange={handleChange} style={inp}>
                      <option value="direct">Direct Farmer Loading Sale</option>
                      <option value="warehouse">Warehouse Sale</option>
                    </select>
                  </Field>
                )}
                {(activeVoucherType !== "sale" || formData.sale_type !== "direct") && (
                  <Field label="Warehouse">
                    <select name="warehouse_id" value={formData.warehouse_id} onChange={handleChange} style={inp}>
                      <option value="">Select Warehouse</option>
                      {warehouses.map((w) => (
                        <option key={w.id || w._id} value={w.id || w._id}>{w.name}</option>
                      ))}
                    </select>
                  </Field>
                )}
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
                {activeVoucherType === "sale" && formData.sale_type === "direct" && (
                  <>
                    <Field label="Farmer">
                      <select name="farmer_id" value={formData.farmer_id} onChange={handleChange} style={inp}>
                        <option value="">Select Farmer</option>
                        {farmers.map((farmer) => (
                          <option key={farmer.id || farmer._id} value={farmer.id || farmer._id}>{farmer.name}</option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Purchase Rate">
                      <input name="direct_purchase_rate" type="number" step="0.0001" value={formData.direct_purchase_rate} onChange={handleChange} style={inp} />
                    </Field>
                    <Field label="Purchase Amount">
                      <input value={formatMoney(saleDispatchQtyFromData(formData) * toNumber(formData.direct_purchase_rate))} readOnly style={readOnlyInp} />
                    </Field>
                  </>
                )}

                {(activeVoucherType === "purchase" || activeVoucherType === "payment") && (
                  <>
                    {activeVoucherType === "payment" && (
                      <Field label="Amount">
                        <input
                          name="amount"
                          type="number"
                          step="0.0001"
                          value={formData.amount}
                          onChange={(event) => {
                            handleChange(event);
                            setPaymentAdjustments([]);
                          }}
                          style={inp}
                          required
                        />
                      </Field>
                    )}
                    <Field label="Farmer (Creditor)">
                      <select name="farmer_id" value={formData.farmer_id} onChange={handleChange} style={inp}>
                        <option value="">Select Farmer</option>
                        {(activeVoucherType === "payment" && formData.company_account_id
                          ? accountFarmers
                          : farmers
                        ).map((f) => (
                          <option key={f.id || f._id} value={f.id || f._id}>
                            {f.name}
                            {activeVoucherType === "payment" && formData.company_account_id && f.outstanding !== undefined
                              ? ` (Balance: ${formatMoney(f.outstanding)})`
                              : ""}
                          </option>
                        ))}
                        {activeVoucherType === "payment" && formData.company_account_id && accountFarmers.length === 0 && (
                          <option value="" disabled>
                            No farmers with outstanding balance for this account
                          </option>
                        )}
                      </select>
                    </Field>
                    {partyOutstanding && activeVoucherType === "payment" && (
                      <div style={{ marginTop: 8, fontSize: 13, color: "#444", display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                        <span>Party: <strong>{formData.company_account_id ? companyAccounts.find(ca => String(ca.id || ca._id) === String(formData.company_account_id))?.account_name || "-" : "-"}</strong></span>
                        <span>Farmer Bill: <strong>Rs.{formatMoney(partyOutstanding.stats?.total_purchase ?? partyOutstanding.total_purchase ?? 0)}</strong></span>
                        <span>Paid: <strong>Rs.{formatMoney(partyOutstanding.stats?.total_payment ?? partyOutstanding.total_payment ?? 0)}</strong></span>
                        <span>Balance: <strong>Rs.{formatMoney(partyOutstanding.stats?.outstanding ?? partyOutstanding.outstanding ?? 0)}</strong></span>
                        <button type="button" onClick={openPaymentAdjustmentPopup} style={{ ...btnAction, background: "#2563eb" }}>
                          Adjust Bills
                        </button>
                        <span>Adjusted: <strong>Rs.{formatMoney(paymentAdjustmentTotal)}</strong></span>
                      </div>
                    )}
                  </>
                )}

                {(activeVoucherType === "sale" || activeVoucherType === "receipt") && (
                  <>
                    {activeVoucherType === "sale" ? (
                      <Field label="Buyer Name">
                        <select name="buyer_id" value={formData.buyer_id || formData.company_id} onChange={handleChange} style={inp}>
                          <option value="">Select Buyer</option>
                          {buyerNames.map((buyer) => (
                            <option key={buyer.id || buyer._id} value={buyer.id || buyer._id}>{buyer.name}</option>
                          ))}
                        </select>
                      </Field>
                    ) : (
                      <Field label="Buyer (Debtor)">
                        <select name="company_id" value={formData.company_id} onChange={handleChange} style={inp}>
                          <option value="">Select Buyer</option>
                          {buyerNames.map((c) => (
                            <option key={c.id || c._id} value={c.id || c._id}>{c.name}</option>
                          ))}
                        </select>
                      </Field>
                    )}
                    {partyOutstanding && activeVoucherType === "receipt" && (
                      <div style={{ marginTop: 8, fontSize: 13, color: "#444" }}>
                        Current outstanding: Rs.{formatMoney(partyOutstanding.stats?.outstanding ?? partyOutstanding.outstanding ?? 0)}
                      </div>
                    )}
                    <Field label="Consignee">
                      <div style={{ fontSize: 12, color: "#0f766e", fontWeight: 700, marginBottom: 4 }}>
                        {activeVoucherType === "sale" && (formData.buyer_id || formData.company_id)
                          ? `Buyer: ${getCompanyName({ company_id: formData.company_id || formData.buyer_id })}`
                          : "Select a buyer first"}
                      </div>
                      <select name="consignee_id" value={formData.consignee_id} onChange={handleChange} style={inp}>
                        <option value="">{activeVoucherType === "sale" && !(formData.buyer_id || formData.company_id) ? "Select Buyer First" : "Select Consignee"}</option>
                        {(activeVoucherType === "sale" ? filteredConsignees : consignees).map((c) => (
                          <option key={c.id || c._id} value={c.id || c._id}>{c.name}</option>
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
                    {activeVoucherType === "sale" && formData.sale_type !== "direct" && (
                      <div style={{ gridColumn: "1 / -1", border: "1px solid #dbe3ef", borderRadius: 8, padding: 12, background: "#f8fafc" }}>
                        <label style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, color: "#334155" }}>
                          <input
                            name="against_purchase_enabled"
                            type="checkbox"
                            checked={Boolean(formData.against_purchase_enabled)}
                            onChange={handleChange}
                          />
                          Against Purchase Bill / Farmer Bill
                        </label>
                        {formData.against_purchase_enabled && (
                          <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                            <Field label="Farmer">
                              <select name="against_purchase_farmer_id" value={formData.against_purchase_farmer_id} onChange={handleChange} style={inp}>
                                <option value="">Select Farmer</option>
                                {farmers.map((farmer) => (
                                  <option key={farmer.id || farmer._id} value={farmer.id || farmer._id}>{farmer.name}</option>
                                ))}
                              </select>
                            </Field>
                            <div style={{ overflowX: "auto" }}>
                              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, background: "#fff" }}>
                                <thead>
                                  <tr style={reportHeaderRowStyle}>
                                    <th style={th}>Purchase Bill</th>
                                    <th style={th}>Date</th>
                                    <th style={th}>Farmer</th>
                                    <th style={th}>Qty</th>
                                    <th style={th}>Rate</th>
                                    <th style={th}>Against Qty</th>
                                    <th style={th}>Amount</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {againstPurchaseRows.map((purchase) => {
                                    const purchaseId = String(purchase.id || purchase._id || "");
                                    const link = againstPurchaseLinkMap.get(purchaseId) || {};
                                    const qty = toNumber(link.quantity);
                                    return (
                                      <tr key={purchaseId}>
                                        <td style={td}>{purchase.voucher_no || "-"}</td>
                                        <td style={td}>{formatLedgerDate(purchase.date)}</td>
                                        <td style={td}>{getFarmerName(purchase)}</td>
                                        <td style={td}>{formatDecimal4(purchase.total_qty || purchase.net_weight || purchase.quantity || 0)}</td>
                                        <td style={td}>{formatMoney(purchase.rate || 0)}</td>
                                        <td style={td}>
                                          <input
                                            type="number"
                                            step="0.0001"
                                            min="0"
                                            value={qty || ""}
                                            onChange={(event) => updateSalePurchaseLink(purchase, event.target.value)}
                                            style={{ ...inp, minWidth: 110 }}
                                          />
                                        </td>
                                        <td style={td}>{formatMoney(qty * toNumber(purchase.rate))}</td>
                                      </tr>
                                    );
                                  })}
                                  {againstPurchaseRows.length === 0 && (
                                    <tr><td colSpan={7} style={{ ...td, textAlign: "center", padding: 14 }}>No matching purchase bill found.</td></tr>
                                  )}
                                </tbody>
                              </table>
                            </div>
                            <div style={{ display: "flex", gap: 14, flexWrap: "wrap", fontSize: 13, color: "#334155" }}>
                              <strong>Against Qty: {formatDecimal4(againstPurchaseTotalQty)}</strong>
                              <strong>Purchase Amount: Rs.{formatMoney(againstPurchaseTotalAmount)}</strong>
                              <strong>Sale Qty: {formatDecimal4(saleDispatchQtyFromData(formData))}</strong>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    <Field label={activeVoucherType === "sale" ? "Loading Date" : "Date"}>
                      <input name="date" type="date" value={formData.date} onChange={handleChange} style={inp} />
                    </Field>
                    {activeVoucherType === "sale" && (
                      <Field label="Unloading Date">
                        <input name="unloading_date" type="date" value={formData.unloading_date} onChange={handleChange} style={inp} />
                      </Field>
                    )}
                    {activeVoucherType === "sale" && (
                      <>
                        <Field label="P.O No">
                          <input name="po_no" value={formData.po_no} onChange={handleChange} style={inp} />
                        </Field>
                        <Field label="Due Days">
                          <input name="due_days" type="number" min="0" value={formData.due_days} onChange={handleChange} style={inp} />
                        </Field>
                        <Field label="Due Date">
                          <input name="due_date" type="date" value={formData.due_date} onChange={handleChange} style={inp} />
                        </Field>
                      </>
                    )}
                    <Field label="Quantity">
                      <input name="quantity" type="number" step="0.0001" value={formData.quantity} onChange={handleChange} style={inp} />
                    </Field>
                    {activeVoucherType === "sale" && (
                      <Field label="Shortage Quantity">
                        <input name="shortage_quantity" type="number" step="0.0001" value={formData.shortage_quantity} onChange={handleChange} style={inp} />
                      </Field>
                    )}
                    <Field label="Rate">
                      <input name="rate" type="number" step="0.0001" value={formData.rate} onChange={handleChange} style={inp} />
                    </Field>
                    <Field label="Amount">
                      <input name="amount" type="number" step="0.0001" value={activeVoucherType === "sale" ? formatMoney(saleGrossAmountFromData(formData)) : formData.amount} onChange={handleChange} style={activeVoucherType === "sale" ? readOnlyInp : inp} readOnly={activeVoucherType === "sale"} />
                    </Field>
                    {activeVoucherType === "sale" && (
                      <>
                        <Field label="Claim Amount">
                          <input name="claim_amount" type="number" step="0.0001" value={formData.claim_amount} onChange={handleChange} style={inp} />
                        </Field>
                        <Field label="Other Deduction">
                          <input name="other_deduction" type="number" step="0.0001" value={formData.other_deduction} onChange={handleChange} style={inp} />
                        </Field>
                        <Field label="CD %">
                          <input name="cd_percent" type="number" step="0.0001" value={formData.cd_percent} onChange={handleChange} style={inp} />
                        </Field>
                        <Field label="CD Amount">
                          <input value={formatMoney(saleCashDiscountAmount)} readOnly style={readOnlyInp} />
                        </Field>
                        <Field label="Adjustment Amount">
                          <input name="adjustment_amount" type="number" step="0.0001" value={formData.adjustment_amount} onChange={handleChange} style={inp} />
                        </Field>
                        <Field label="TDS Amount">
                          <input name="tds_amount" type="number" step="0.0001" value={formData.tds_amount} onChange={handleChange} style={inp} />
                        </Field>
                        <Field label="Unloading Qty">
                          <input name="unloading_qty" type="number" step="0.0001" value={formData.unloading_qty} onChange={handleChange} style={inp} />
                        </Field>
                        <Field label="Net Receivable">
                          <input value={formatMoney(saleNetReceivablePreview)} readOnly style={readOnlyInp} />
                        </Field>
                        <Field label="FIFO Amount">
                          <input value={formatMoney(saleGrossAmountFromData(formData))} readOnly style={readOnlyInp} />
                        </Field>
                        <div style={{ marginTop: 8, fontSize: 13, color: "#444" }}>
                          Outstanding: Rs.{formatMoney(saleNetReceivablePreview)}
                        </div>
                        <div style={smartInfoGridStyle}>
                          <div style={smartInfoBoxStyle}><span>Buyer Sale Qty</span><strong>{formatDecimal4(selectedBuyerSaleQty)}</strong></div>
                          <div style={smartInfoBoxStyle}><span>Balance Amount</span><strong>{formatMoney(selectedBuyerBalanceAmount)}</strong></div>
                          <div style={smartInfoBoxStyle}><span>Pending Amount</span><strong>{formatMoney(selectedBuyerPendingAmount)}</strong></div>
                          {formData.sale_type !== "direct" && (
                            <div style={smartInfoBoxStyle}><span>Warehouse Balance Qty</span><strong>{selectedWarehouseBalanceQty === null ? "-" : formatDecimal4(selectedWarehouseBalanceQty)}</strong></div>
                          )}
                        </div>
                      </>
                    )}
                  </>
                )}

                {(activeVoucherType === "payment" || activeVoucherType === "receipt") && (
                  <>
                    <Field label="Reference Type">
                      <select
                        name="reference_type"
                        value={activeVoucherType === "payment" ? "purchase" : formData.reference_type}
                        onChange={handleChange}
                        style={activeVoucherType === "payment" ? readOnlyInp : inp}
                        disabled={activeVoucherType === "payment"}
                      >
                        <option value="">Select Reference</option>
                        <option value="purchase">Purchase Bill</option>
                        <option value="sale">Sale Bill</option>
                        <option value="other">Other</option>
                      </select>
                    </Field>
                    <Field label="Reference ID">
                      <input
                        name="reference_id"
                        value={activeVoucherType === "payment" ? paymentAdjustments.map((item) => item.voucher_no || item.purchase_voucher_no || item.purchase_id).filter(Boolean).join(", ") : formData.reference_id}
                        onChange={handleChange}
                        style={activeVoucherType === "payment" ? readOnlyInp : inp}
                        placeholder={activeVoucherType === "payment" ? "Auto from adjusted purchase bill" : "Optional bill ID"}
                        readOnly={activeVoucherType === "payment"}
                      />
                    </Field>
                    {activeVoucherType === "receipt" && (
                      <Field label="Amount">
                        <input name="amount" type="number" step="0.0001" value={formData.amount} onChange={handleChange} style={inp} required />
                      </Field>
                    )}
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
                      <input name="amount" type="number" step="0.0001" value={formData.amount} onChange={handleChange} style={inp} required />
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
                <button type="submit" disabled={loading} style={btnPrimary}>
                  {loading ? "Saving..." : editId ? (activeVoucherType === "sale" ? "Save Deductions" : "Update Voucher") : "Save Voucher"}
                </button>
                {editId && (
                  <button type="button" onClick={() => { setEditId(null); setFormData(defaultForm()); setPaymentAdjustments([]); setReceiptAdjustments([]); setSalePurchaseLinks([]); setPartyOutstanding(null); }} style={{ ...btnPrimary, background: "#64748b" }}>Cancel</button>
                )}
              </div>
            </form>
          </div>

          <div style={card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <h3 style={{ marginTop: 0 }}>{activeVoucherType.charAt(0).toUpperCase() + activeVoucherType.slice(1)} Vouchers</h3>
              {activeVoucherType === "sale" && (
                <button type="button" onClick={() => setShowSaleAdjustedModal(true)} style={{ ...btnAction, background: "#0f766e" }}>
                  F5 Adjusted Sales
                </button>
              )}
            </div>
            <div style={tableCard}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={reportHeaderRowStyle}>
                    <th style={th}>S.L No</th>
                    <th style={th}>Date</th>
                    <th style={th}>Voucher No</th>
                    {activeVoucherType === "sale" && <th style={th}>P.O No</th>}
                    {activeVoucherType === "sale" && <th style={th}>Due Date</th>}
                    <th style={th}>Warehouse</th>
                    <th style={th}>Account</th>
                    {(activeVoucherType === "purchase" || activeVoucherType === "payment") && <th style={th}>Farmer</th>}
                    {(activeVoucherType === "sale" || activeVoucherType === "receipt") && <th style={th}>{activeVoucherType === "sale" ? "Buyer" : "Company"}</th>}
                    {activeVoucherType === "sale" && <th style={th}>Consignee</th>}
                    {activeVoucherType === "sale" && <th style={th}>Against Purchase</th>}
                    {(activeVoucherType === "purchase" || activeVoucherType === "sale") && <th style={th}>Product</th>}
                    {(activeVoucherType === "purchase" || activeVoucherType === "sale") && <th style={th}>{activeVoucherType === "sale" ? "Dispatch Qty" : "Qty"}</th>}
                    {activeVoucherType === "sale" && <th style={th}>Un. Date</th>}
                    {activeVoucherType === "sale" && <th style={th}>U. Qty</th>}
                    {(activeVoucherType === "purchase" || activeVoucherType === "sale") && <th style={th}>Rate</th>}
                    <th style={th}>Amount</th>
                    {activeVoucherType === "sale" && <th style={th}>Shortage Amount</th>}
                    {activeVoucherType === "sale" && <th style={th}>Total Deduction</th>}
                    {activeVoucherType === "sale" && <th style={th}>N. Receivable</th>}
                    <th style={th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((item, i) => {
                    const isSelectedRow = activeVoucherType === "payment" && String(item.id || item._id) === String(selectedPaymentId);
                    const saleShortageValue = toNumber(item.claim_amount);
                    const saleTotalDeductionValue =
                      saleShortageValue +
                      toNumber(item.other_deduction) +
                      toNumber(item.cd_amount) +
                      toNumber(item.adjustment_amount) +
                      toNumber(item.tds_amount);
                    return (
                      <tr key={item.id || i} style={{ background: isSelectedRow ? "#e0f2fe" : i % 2 ? "#f8fafc" : "#fff" }}>
                        <td style={td}>{i + 1}</td>
                        <td style={td}>{item.date}</td>
                        <td style={td}>{item.voucher_no}</td>
                        {activeVoucherType === "sale" && <td style={td}>{item.po_no || "-"}</td>}
                        {activeVoucherType === "sale" && <td style={td}>{formatLedgerDate(item.due_date)}</td>}
                        <td style={td}>{getWarehouseName(item)}</td>
                        <td style={td}>{getAccountName(item)}</td>
                        {(activeVoucherType === "purchase" || activeVoucherType === "payment") && (
                          <td style={td}>{getFarmerName(item)}</td>
                        )}
                        {(activeVoucherType === "sale" || activeVoucherType === "receipt") && (
                          <td style={td}>{activeVoucherType === "sale" ? getBuyerName(item) : (buyerNames.find(c => String(c.id || c._id) === String(item.company_id))?.name || companies.find(c => String(c.id || c._id) === String(item.company_id))?.name || "-")}</td>
                        )}
                        {activeVoucherType === "sale" && (
                          <td style={td}>{item.consignee_name || consignees.find((c) => String(c.id || c._id) === String(item.consignee_id))?.name || "-"}</td>
                        )}
                        {activeVoucherType === "sale" && (
                          <td style={td}>{item.against_purchase_enabled ? `${item.against_purchase_links?.length || 0} bill` : "-"}</td>
                        )}
                        {(activeVoucherType === "purchase" || activeVoucherType === "sale") && (
                          <>
                            <td style={td}>{getProductName(item)}</td>
                            <td style={td}>{formatDecimal4(activeVoucherType === "purchase" ? item.total_qty || item.net_weight || item.quantity || 0 : item.quantity || item.total_quantity || 0)}</td>
                            {activeVoucherType === "sale" && <td style={td}>{formatLedgerDate(item.unloading_date)}</td>}
                            {activeVoucherType === "sale" && <td style={td}>{formatDecimal4(item.unloading_qty || 0)}</td>}
                            <td style={td}>{item.rate || 0}</td>
                          </>
                        )}
                        <td style={td}>{formatMoney(activeVoucherType === "purchase" ? item.net_amount_payable || item.amount || 0 : item.amount || item.total_amount || 0)}</td>
                        {activeVoucherType === "sale" && <td style={td}>{formatMoney(saleShortageValue)}</td>}
                        {activeVoucherType === "sale" && <td style={td}>{formatMoney(saleTotalDeductionValue)}</td>}
                        {activeVoucherType === "sale" && <td style={td}>{formatMoney(item.net_receivable_amount || item.net_amount || item.amount || 0)}</td>}
                        <td style={td}>
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                            <button onClick={() => handleEditVoucher(item.id || item._id)} style={btnAction} title="Edit">Edit</button>
                            <button onClick={() => handleDeleteVoucher(item.id || item._id)} style={{ ...btnAction, background: "#dc2626" }} title="Delete">Delete</button>
                            {activeVoucherType === "payment" && (
                              <button type="button" onClick={() => setSelectedPaymentId(item.id || item._id)} style={{ ...btnAction, background: "#2563eb" }} title="Show Details">
                                {isSelectedRow ? "Selected" : "Details"}
                              </button>
                            )}
                            {activeVoucherType === "sale" && (
                              <button onClick={() => handleGeneratePDF(item.id || item._id)} style={{ ...btnAction, background: "#ea580c" }} title="Download PDF">PDF</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {list.length === 0 && (
                    <tr><td colSpan={activeVoucherType === "sale" ? 20 : 11} style={{ ...td, textAlign: "center", padding: 20 }}>No vouchers found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            {activeVoucherType === "payment" && selectedVoucher && (
              <div style={{ marginTop: 14, padding: 14, border: "1px solid #cbd5e1", borderRadius: 8, background: "#f8fafc" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <strong>Selected Payment Voucher</strong>
                  <span style={{ color: "#0f766e", fontSize: 13 }}>{selectedVoucher.voucher_no || "-"}</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10, marginTop: 10, fontSize: 13 }}>
                  <div><strong>Date:</strong> {selectedVoucher.date || "-"}</div>
                  <div><strong>Account:</strong> {getAccountName(selectedVoucher)}</div>
                  <div><strong>Farmer:</strong> {getFarmerName(selectedVoucher)}</div>
                  <div><strong>Amount:</strong> Rs.{formatMoney(selectedVoucher.amount || selectedVoucher.net_amount || selectedVoucher.amount || 0)}</div>
                  <div><strong>Reference:</strong> {selectedVoucher.reference_id || selectedVoucher.reference_type || "-"}</div>
                </div>
                <div style={{ marginTop: 12 }}>
                  <strong>Adjustments</strong>
                  {(selectedVoucher.adjustments || []).length > 0 ? (
                    (selectedVoucher.adjustments || []).map((item, index) => (
                      <div key={`${item.purchase_id || item.voucher_no}-${index}`} style={{ display: "flex", justifyContent: "space-between", gap: 8, padding: "8px 0", borderBottom: index < (selectedVoucher.adjustments || []).length - 1 ? "1px solid #e2e8f0" : "none" }}>
                        <span>{item.voucher_no || item.purchase_voucher_no || item.purchase_id}</span>
                        <strong>Rs.{formatMoney(item.adjusted_amount || 0)}</strong>
                      </div>
                    ))
                  ) : (
                    <div style={{ color: "#475569", marginTop: 8 }}>No purchase bill adjustments available.</div>
                  )}
                </div>
              </div>
            )}
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
                {reportLabels[type] || titleCase(type)}
              </button>
            ))}
          </div>
          <div style={card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <h3 style={{ marginTop: 0, marginBottom: 0 }}>{reportLabels[activeReport] || titleCase(activeReport)}</h3>
              {(activeReport === "purchase-party-ledger" || activeReport === "sale-party-ledger") && (
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    onClick={activeReport === "sale-party-ledger" ? downloadSaleLedgerPdf : downloadPurchaseLedgerPdf}
                    style={{ ...btnAction, background: "#b45309", display: "inline-flex", alignItems: "center", gap: 6 }}
                  >
                    <FaFilePdf /> PDF
                  </button>
                  <button
                    type="button"
                    onClick={activeReport === "sale-party-ledger" ? shareSaleLedgerWhatsapp : sharePurchaseLedgerWhatsapp}
                    style={{ ...btnAction, background: "#15803d", display: "inline-flex", alignItems: "center", gap: 6 }}
                  >
                    <FaWhatsapp /> WhatsApp
                  </button>
                </div>
              )}
            </div>
            {activeReport === "purchase-party-ledger" && (
              <div style={{ display: "flex", gap: 12, alignItems: "end", flexWrap: "wrap", marginBottom: 14 }}>
                <Field label="Farmer Filter">
                  <select
                    value={reportFilters.farmer_id}
                    onChange={(event) => setReportFilters((prev) => ({ ...prev, farmer_id: event.target.value }))}
                    style={{ ...inp, minWidth: 260 }}
                  >
                    <option value="">All Farmers</option>
                    {farmers.map((farmer) => (
                      <option key={farmer.id || farmer._id} value={farmer.id || farmer._id}>
                        {farmer.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Account Filter">
                  <select
                    value={reportFilters.company_account_id}
                    onChange={(event) => setReportFilters((prev) => ({ ...prev, company_account_id: event.target.value }))}
                    style={{ ...inp, minWidth: 260 }}
                  >
                    <option value="">All Accounts</option>
                    {companyAccounts.map((account) => (
                      <option key={account.id || account._id} value={account.id || account._id}>
                        {account.account_name || account.name}
                      </option>
                    ))}
                  </select>
                </Field>
                {(reportFilters.farmer_id || reportFilters.company_account_id) && (
                  <button
                    type="button"
                    onClick={() => setReportFilters({ farmer_id: "", company_account_id: "", sale_buyer_id: "", sale_company_account_id: "", sale_journey_token: "", sale_lorry_no: "", sale_bill_no: "" })}
                    style={{ ...btnAction, background: "#64748b", marginBottom: 1 }}
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            )}
            {activeReport === "sale-party-ledger" && (
              <div style={{ display: "flex", gap: 12, alignItems: "end", flexWrap: "wrap", marginBottom: 14 }}>
                <Field label="Buyer Filter">
                  <select
                    value={reportFilters.sale_buyer_id}
                    onChange={(event) => setReportFilters((prev) => ({ ...prev, sale_buyer_id: event.target.value }))}
                    style={{ ...inp, minWidth: 260 }}
                  >
                    <option value="">All Buyers</option>
                    {buyerNames.map((buyer) => (
                      <option key={buyer.id || buyer._id} value={buyer.id || buyer._id}>
                        {buyer.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Account Filter">
                  <select
                    value={reportFilters.sale_company_account_id}
                    onChange={(event) => setReportFilters((prev) => ({ ...prev, sale_company_account_id: event.target.value }))}
                    style={{ ...inp, minWidth: 260 }}
                  >
                    <option value="">All Accounts</option>
                    {companyAccounts.map((account) => (
                      <option key={account.id || account._id} value={account.id || account._id}>
                        {account.account_name || account.name}
                      </option>
                    ))}
                  </select>
                </Field>
                {(reportFilters.sale_buyer_id || reportFilters.sale_company_account_id) && (
                  <button
                    type="button"
                    onClick={() => setReportFilters((prev) => ({ ...prev, sale_buyer_id: "", sale_company_account_id: "", sale_journey_token: "", sale_lorry_no: "", sale_bill_no: "" }))}
                    style={{ ...btnAction, background: "#64748b", marginBottom: 1 }}
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            )}
            {activeReport === "sale-followup" && (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10, marginBottom: 14 }}>
                  {[
                    ["all", saleFollowupCounts.all],
                    ["payment_done", saleFollowupCounts.payment_done],
                    ["unloading_pending", saleFollowupCounts.unloading_pending],
                    ["pending", saleFollowupCounts.pending],
                    ["overdue", saleFollowupCounts.overdue],
                  ].map(([key, count]) => {
                    const meta = saleFollowupStatusMeta[key];
                    const active = saleFollowupFilter === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setSaleFollowupFilter(key)}
                        style={{
                          border: active ? `1px solid ${meta.color}` : "1px solid #e2e8f0",
                          background: active ? meta.bg : "#fff",
                          borderRadius: 14,
                          padding: "14px 16px",
                          cursor: "pointer",
                          textAlign: "left",
                          boxShadow: active ? "0 10px 24px rgba(15, 23, 42, 0.08)" : "none",
                        }}
                      >
                        <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b", marginBottom: 6 }}>{meta.label}</div>
                        <div style={{ fontSize: 24, fontWeight: 800, color: meta.color }}>{count}</div>
                      </button>
                    );
                  })}
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
                  {["all", "payment_done", "unloading_pending", "pending", "overdue"].map((key) => {
                    const meta = saleFollowupStatusMeta[key];
                    const active = saleFollowupFilter === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setSaleFollowupFilter(key)}
                        style={{
                          ...btnAction,
                          background: active ? meta.color : "#e2e8f0",
                          color: active ? "#fff" : "#0f172a",
                        }}
                      >
                        {meta.label}
                      </button>
                    );
                  })}
                  {saleFollowupFilter !== "all" && (
                    <button type="button" onClick={() => setSaleFollowupFilter("all")} style={{ ...btnAction, background: "#64748b" }}>
                      Clear Filter
                    </button>
                  )}
                </div>
              </>
            )}
            {activeReport === "purchase-party-ledger" ? (
              <div style={ledgerSplitStyle}>
                <div style={tableCard}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={reportHeaderRowStyle}>
                        {activeReportColumns.map(([key, label]) => (
                          <th key={key} style={th}>{label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {displayReportData.map((item, i) => (
                        <tr key={item.id || `${item.voucher_type || item.row_type}-${item.voucher_no || i}-${i}`} style={{ background: item.row_type === "closing" ? "#eef6ff" : (i % 2 ? "#f8fafc" : "#fff"), fontWeight: item.row_type === "closing" ? 700 : 400 }}>
                          {activeReportColumns.map(([key, _label, render]) => (
                            <td key={key} style={td}>{render(item, i)}</td>
                          ))}
                        </tr>
                      ))}
                      {displayReportData.length === 0 && (
                        <tr><td colSpan={activeReportColumns.length} style={{ ...td, textAlign: "center", padding: 20 }}>No data available.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
                {showPurchaseBillWise && (
                <div style={billWisePanelStyle}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", marginBottom: 10 }}>
                    <strong>Bill Wise Report</strong>
                    <button type="button" onClick={loadReport} style={{ ...btnAction, background: "#0f766e" }}>F5 Refresh</button>
                  </div>
                  <div style={{ ...tableCard, maxHeight: 330 }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                      <thead>
                        <tr style={reportHeaderRowStyle}>
                          <th style={th}>Bill</th>
                          <th style={th}>Farmer</th>
                          <th style={th}>Account</th>
                          <th style={th}>Purchase</th>
                          <th style={th}>Payment</th>
                          <th style={th}>Journal</th>
                          <th style={th}>Receipt</th>
                          <th style={th}>Balance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {purchaseBillRows.map((row) => {
                          const rowKey = String(row.purchase_id || row.voucher_no);
                          const isSelected = selectedBill && rowKey === String(selectedBill.purchase_id || selectedBill.voucher_no);
                          return (
                            <tr key={rowKey} style={{ background: isSelected ? "#e0f2fe" : "#fff" }}>
                              <td style={td}>{row.voucher_no || "-"}</td>
                              <td style={td}>{row.farmer_name || getFarmerName(row) || "-"}</td>
                              <td style={td}>{getAccountName(row)}</td>
                              <td style={td}>{formatMoney(row.purchase_amount || row.credit || 0)}</td>
                              <td style={td}>
                                <button
                                  type="button"
                                  onClick={() => setSelectedLedgerBillId(rowKey)}
                                  style={linkButtonStyle}
                                >
                                  {formatMoney(row.payment_amount || 0)}
                                </button>
                              </td>
                              <td style={td}>{formatMoney(row.journal_amount || 0)}</td>
                              <td style={td}>{formatMoney(row.receipt_amount || 0)}</td>
                              <td style={{ ...td, fontWeight: 700, color: toNumber(row.bill_balance) > 0 ? "#b45309" : "#15803d" }}>
                                {formatMoney(row.bill_balance || 0)}
                              </td>
                            </tr>
                          );
                        })}
                        {purchaseBillRows.length === 0 && (
                          <tr><td colSpan={8} style={{ ...td, textAlign: "center", padding: 18 }}>No purchase bill found.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div style={paymentDetailBoxStyle}>
                    <strong>{selectedBill?.voucher_no || "Select a bill"}</strong>
                    <div style={{ color: "#64748b", fontSize: 12, margin: "4px 0 8px" }}>Payment details</div>
                    {(selectedBill?.payment_details || []).length > 0 ? (
                      (selectedBill.payment_details || []).map((detail, index) => (
                        <div key={`${detail.payment_voucher_no}-${index}`} style={paymentDetailRowStyle}>
                          <span>{detail.payment_date || "-"}</span>
                          <span>{detail.payment_voucher_no || "-"}</span>
                          <strong>Rs.{formatMoney(detail.adjusted_amount || 0)}</strong>
                        </div>
                      ))
                    ) : (
                      <div style={{ color: "#64748b", fontSize: 13 }}>No payment adjusted against this bill.</div>
                    )}
                  </div>
                </div>
                )}
              </div>
            ) : activeReport === "sale-party-ledger" || activeReport === "sale-followup" || activeReport === "sale-journey" ? (
              <div style={ledgerSplitStyle}>
                <div style={tableCard}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={reportHeaderRowStyle}>
                        {activeReportColumns.map(([key, label]) => (
                          <th key={key} style={th}>{label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {displayReportData.map((item, i) => {
                        const statusKey = String(item.followup_status || "").toLowerCase();
                        const followupBg =
                          activeReport === "sale-followup"
                            ? (statusKey === "payment_done" ? "#ecfdf5" : statusKey === "unloading_pending" ? "#fffbeb" : statusKey === "overdue" ? "#fef2f2" : "#eff6ff")
                            : null;
                        return (
                          <tr key={item.id || `${item.voucher_type || item.row_type}-${item.voucher_no || i}-${i}`} style={{ background: item.row_type === "closing" ? "#eef6ff" : followupBg || (i % 2 ? "#f8fafc" : "#fff"), fontWeight: item.row_type === "closing" ? 700 : 400 }}>
                            {activeReportColumns.map(([key, _label, render]) => (
                              <td key={key} style={td}>{render(item, i)}</td>
                            ))}
                          </tr>
                        );
                      })}
                      {displayReportData.length === 0 && (
                        <tr><td colSpan={activeReportColumns.length} style={{ ...td, textAlign: "center", padding: 20 }}>No data available.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {showSaleBillWise && activeReport === "sale-party-ledger" && (
                  <div style={billWisePanelStyle}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", marginBottom: 10 }}>
                      <strong>Bill Wise Report</strong>
                      <button type="button" onClick={loadReport} style={{ ...btnAction, background: "#0f766e" }}>F5 Refresh</button>
                    </div>
                    <div style={{ ...tableCard, maxHeight: 330 }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                        <thead>
                          <tr style={reportHeaderRowStyle}>
                            <th style={th}>Bill</th>
                            <th style={th}>Party</th>
                            <th style={th}>Sale</th>
                            <th style={th}>Receipt</th>
                            <th style={th}>Deduction</th>
                            <th style={th}>Balance</th>
                          </tr>
                        </thead>
                        <tbody>
                          {saleBillRows.map((row) => {
                            const rowKey = String(row.sale_id || row.voucher_no);
                            const isSelected = selectedSaleBill && rowKey === String(selectedSaleBill.sale_id || selectedSaleBill.voucher_no);
                            return (
                              <tr key={rowKey} style={{ background: isSelected ? "#e0f2fe" : "#fff" }}>
                                <td style={td}>{row.voucher_no || "-"}</td>
                                <td style={td}>{row.party_name || row.company_name || "-"}</td>
                                <td style={td}>{formatMoney(row.sale_amount || row.debit || 0)}</td>
                                <td style={td}>
                                  <button
                                    type="button"
                                    onClick={() => setSelectedSaleLedgerBillId(rowKey)}
                                    style={linkButtonStyle}
                                  >
                                    {formatMoney(row.receipt_amount || 0)}
                                  </button>
                                </td>
                                <td style={td}>{formatMoney(row.journal_amount || 0)}</td>
                                <td style={{ ...td, fontWeight: 700, color: toNumber(row.bill_balance) > 0 ? "#b45309" : "#15803d" }}>
                                  {formatMoney(row.bill_balance || 0)}
                                </td>
                              </tr>
                            );
                          })}
                          {saleBillRows.length === 0 && (
                            <tr><td colSpan={6} style={{ ...td, textAlign: "center", padding: 18 }}>No sale bill found.</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    <div style={paymentDetailBoxStyle}>
                      <strong>{selectedSaleBill?.voucher_no || "Select a bill"}</strong>
                      <div style={{ color: "#64748b", fontSize: 12, margin: "4px 0 8px" }}>Receipt details</div>
                      {(selectedSaleBill?.payment_details || []).length > 0 ? (
                        (selectedSaleBill.payment_details || []).map((detail, index) => (
                          <div key={`${detail.receipt_voucher_no}-${index}`} style={paymentDetailRowStyle}>
                            <span>{detail.receipt_date || "-"}</span>
                            <span>{detail.receipt_voucher_no || "-"}{detail.inferred_adjustment ? " (auto)" : ""}</span>
                            <strong>Rs.{formatMoney(detail.adjusted_amount || 0)}</strong>
                          </div>
                        ))
                      ) : (
                        <div style={{ color: "#64748b", fontSize: 13 }}>No receipt adjusted against this bill.</div>
                      )}
                      <div style={{ color: "#64748b", fontSize: 12, margin: "10px 0 8px" }}>Deduction details</div>
                      {(selectedSaleBill?.journal_details || []).length > 0 ? (
                        (selectedSaleBill.journal_details || []).map((detail, index) => (
                          <div key={`${detail.voucher_no}-${index}`} style={paymentDetailRowStyle}>
                            <span>{detail.date || "-"}</span>
                            <span>{detail.type || "-"}</span>
                            <strong>Rs.{formatMoney(detail.amount || 0)}</strong>
                          </div>
                        ))
                      ) : (
                        <div style={{ color: "#64748b", fontSize: 13 }}>No deduction posted against this bill.</div>
                      )}
                    </div>

                    <div style={{ ...paymentDetailBoxStyle, marginTop: 12 }}>
                      <strong>Journey Details</strong>
                      <div style={{ color: "#64748b", fontSize: 12, margin: "4px 0 8px" }}>
                        Same journey token wise full leg summary
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 8, marginBottom: 10 }}>
                        <div style={smartInfoBoxStyle}>
                          <span>Leg Count</span>
                          <strong>{selectedSaleJourneyRows.length}</strong>
                        </div>
                        <div style={smartInfoBoxStyle}>
                          <span>Total Qty</span>
                          <strong>{formatDecimal4(selectedSaleJourneyTotalQty)}</strong>
                        </div>
                        <div style={smartInfoBoxStyle}>
                          <span>Total Amount</span>
                          <strong>{formatMoney(selectedSaleJourneyTotalAmount)}</strong>
                        </div>
                        <div style={smartInfoBoxStyle}>
                          <span>Balance Qty</span>
                          <strong>{formatDecimal4(selectedSaleJourneyBalanceQty)}</strong>
                        </div>
                      </div>
                      {selectedSaleJourneyRows.length > 0 ? (
                        <div style={{ overflowX: "auto" }}>
                          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                            <thead>
                              <tr style={reportHeaderRowStyle}>
                                <th style={th}>Bill No</th>
                                <th style={th}>Bill Date</th>
                                <th style={th}>Consignee</th>
                                <th style={th}>Qty</th>
                                <th style={th}>Rate</th>
                                <th style={th}>Amount</th>
                              </tr>
                            </thead>
                            <tbody>
                              {selectedSaleJourneyRows.map((row, index) => (
                                <tr key={`${row.voucher_no || row.sale_id || index}-${index}`} style={{ background: index % 2 ? "#f8fafc" : "#fff" }}>
                                  <td style={td}>{row.voucher_no || "-"}</td>
                                  <td style={td}>{formatLedgerDate(row.date || "")}</td>
                                  <td style={td}>{row.consignee_name || row.party_name || row.company_name || "-"}</td>
                                  <td style={td}>{formatDecimal4(row.quantity || row.total_quantity || row.unloading_qty || 0)}</td>
                                  <td style={td}>{formatMoney(row.rate || 0)}</td>
                                  <td style={td}>{formatMoney(row.amount || row.total_amount || row.net_receivable_amount || 0)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div style={{ color: "#64748b", fontSize: 13 }}>No journey entries found for this bill.</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div style={tableCard}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={reportHeaderRowStyle}>
                      {activeReportColumns.map(([key, label]) => (
                        <th key={key} style={th}>{label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {displayReportData.map((item, i) => (
                      <tr key={item.id || i} style={{ background: i % 2 ? "#f8fafc" : "#fff" }}>
                        {activeReportColumns.map(([key, _label, render]) => (
                          <td key={key} style={td}>{render(item, i)}</td>
                        ))}
                      </tr>
                    ))}
                    {displayReportData.length === 0 && (
                      <tr><td colSpan={activeReportColumns.length} style={{ ...td, textAlign: "center", padding: 20 }}>No data available.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
      {showPaymentAdjustPopup && (
        <div style={modalOverlayStyle}>
          <div style={paymentAdjustModalStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
              <div>
                <h3 style={{ margin: 0 }}>Payment Adjustment</h3>
                <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>
                  Farmer and warehouse wise pending purchase bills
                </div>
              </div>
              <button type="button" onClick={() => setShowPaymentAdjustPopup(false)} style={{ ...btnAction, background: "#64748b" }}>
                Close
              </button>
            </div>

            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 14, fontSize: 13 }}>
              <strong>Payment: Rs.{formatMoney(formData.amount)}</strong>
              <strong>Adjusted: Rs.{formatMoney(paymentAdjustmentTotal)}</strong>
              <strong style={{ color: Math.abs(paymentAdjustmentTotal - toNumber(formData.amount)) <= 0.0001 ? "#15803d" : "#dc2626" }}>
                Difference: Rs.{formatMoney(toNumber(formData.amount) - paymentAdjustmentTotal)}
              </strong>
              <button type="button" onClick={autoFillPaymentAdjustments} style={{ ...btnAction, background: "#0f766e" }}>
                Auto Adjust
              </button>
            </div>

            <div style={{ ...tableCard, marginTop: 14, maxHeight: "55vh" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={reportHeaderRowStyle}>
                    <th style={th}>Date</th>
                    <th style={th}>Voucher No</th>
                    <th style={th}>Warehouse</th>
                    <th style={th}>Bill Amount</th>
                    <th style={th}>Adjusted</th>
                    <th style={th}>Pending</th>
                    <th style={th}>Adjustment Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {(partyOutstanding?.purchases || [])
                    .filter((row) => toNumber(row.pending_amount) > 0)
                    .map((row) => (
                      <tr key={row.id || row._id}>
                        <td style={td}>{row.date || "-"}</td>
                        <td style={td}>{row.voucher_no || "-"}</td>
                        <td style={td}>{getWarehouseName(row)}</td>
                        <td style={td}>{formatMoney(row.amount || 0)}</td>
                        <td style={td}>{formatMoney(row.adjusted_amount || 0)}</td>
                        <td style={td}>{formatMoney(row.pending_amount || 0)}</td>
                        <td style={td}>
                          <input
                            type="number"
                            step="0.0001"
                            min="0"
                            max={row.pending_amount || row.amount || 0}
                            value={selectedAdjustmentFor(row.id || row._id)}
                            onChange={(event) => setPaymentAdjustmentAmount(row, event.target.value)}
                            style={{ ...inp, padding: "7px 8px" }}
                          />
                        </td>
                      </tr>
                    ))}
                  {(partyOutstanding?.purchases || []).filter((row) => toNumber(row.pending_amount) > 0).length === 0 && (
                    <tr>
                      <td colSpan={7} style={{ ...td, textAlign: "center", padding: 20 }}>
                        No pending purchase bills found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 14 }}>
              <button type="button" onClick={() => setPaymentAdjustments([])} style={{ ...btnPrimary, background: "#64748b" }}>
                Clear
              </button>
              <button
                type="button"
                onClick={() => setShowPaymentAdjustPopup(false)}
                disabled={Math.abs(paymentAdjustmentTotal - toNumber(formData.amount)) > 0.0001}
                style={{
                  ...btnPrimary,
                  opacity: Math.abs(paymentAdjustmentTotal - toNumber(formData.amount)) > 0.0001 ? 0.55 : 1,
                  cursor: Math.abs(paymentAdjustmentTotal - toNumber(formData.amount)) > 0.0001 ? "not-allowed" : "pointer",
                }}
              >
                Confirm Adjustment
              </button>
            </div>
          </div>
        </div>
      )}
      {showReceiptAdjustPopup && (
        <div style={modalOverlayStyle}>
          <div style={paymentAdjustModalStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
              <div>
                <h3 style={{ margin: 0 }}>Receipt Adjustment</h3>
                <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>
                  Company and warehouse wise pending sale bills
                </div>
              </div>
              <button type="button" onClick={() => setShowReceiptAdjustPopup(false)} style={{ ...btnAction, background: "#64748b" }}>
                Close
              </button>
            </div>

            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 14, fontSize: 13 }}>
              <strong>Receipt: Rs.{formatMoney(formData.amount)}</strong>
              <strong>Adjusted: Rs.{formatMoney(receiptAdjustmentTotal)}</strong>
              <strong style={{ color: Math.abs(receiptAdjustmentTotal - toNumber(formData.amount)) <= 0.0001 ? "#15803d" : "#dc2626" }}>
                Difference: Rs.{formatMoney(toNumber(formData.amount) - receiptAdjustmentTotal)}
              </strong>
              <button type="button" onClick={autoFillReceiptAdjustments} style={{ ...btnAction, background: "#0f766e" }}>
                Auto Adjust
              </button>
            </div>

            <div style={{ ...tableCard, marginTop: 14, maxHeight: "55vh" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={reportHeaderRowStyle}>
                    <th style={th}>Date</th>
                    <th style={th}>Voucher No</th>
                    <th style={th}>Warehouse</th>
                    <th style={th}>Bill Amount</th>
                    <th style={th}>Adjusted</th>
                    <th style={th}>Pending</th>
                    <th style={th}>Adjustment Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {(partyOutstanding?.sales || [])
                    .filter((row) => toNumber(row.pending_amount) > 0)
                    .map((row) => (
                      <tr key={row.id || row._id}>
                        <td style={td}>{row.date || "-"}</td>
                        <td style={td}>{row.voucher_no || "-"}</td>
                        <td style={td}>{getWarehouseName(row)}</td>
                        <td style={td}>{formatMoney(row.amount || 0)}</td>
                        <td style={td}>{formatMoney(row.adjusted_amount || 0)}</td>
                        <td style={td}>{formatMoney(row.pending_amount || 0)}</td>
                        <td style={td}>
                          <input
                            type="number"
                            step="0.0001"
                            min="0"
                            max={row.pending_amount || row.amount || 0}
                            value={selectedAdjustmentForReceipt(row.id || row._id)}
                            onChange={(event) => setReceiptAdjustmentAmount(row, event.target.value)}
                            style={{ ...inp, padding: "7px 8px" }}
                          />
                        </td>
                      </tr>
                    ))}
                  {(partyOutstanding?.sales || []).filter((row) => toNumber(row.pending_amount) > 0).length === 0 && (
                    <tr>
                      <td colSpan={7} style={{ ...td, textAlign: "center", padding: 20 }}>
                        No pending sale bills found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 14 }}>
              <button type="button" onClick={() => setReceiptAdjustments([])} style={{ ...btnPrimary, background: "#64748b" }}>
                Clear
              </button>
              <button
                type="button"
                onClick={() => setShowReceiptAdjustPopup(false)}
                disabled={Math.abs(receiptAdjustmentTotal - toNumber(formData.amount)) > 0.0001}
                style={{
                  ...btnPrimary,
                  opacity: Math.abs(receiptAdjustmentTotal - toNumber(formData.amount)) > 0.0001 ? 0.55 : 1,
                  cursor: Math.abs(receiptAdjustmentTotal - toNumber(formData.amount)) > 0.0001 ? "not-allowed" : "pointer",
                }}
              >
                Confirm Adjustment
              </button>
            </div>
          </div>
        </div>
      )}
      {showSaleDeductionModal && (
        <div style={modalOverlayStyle}>
          <div style={paymentAdjustModalStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
              <div>
                <h3 style={{ margin: 0 }}>Sale Voucher Pass</h3>
                <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>
                  Select a sale bill, enter unloading, then save shortage, deduction and TDS separately.
                </div>
              </div>
              <button type="button" onClick={() => setShowSaleDeductionModal(false)} style={{ ...btnAction, background: "#64748b" }}>
                Close
              </button>
            </div>

            <div style={{ marginTop: 14, padding: "10px 12px", border: "1px solid #d7dce4", borderRadius: 8, background: "#f8fafc" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#0f766e", marginBottom: 4 }}>F2 Journey Setup</div>
              <div style={{ fontSize: 12, color: "#475569", lineHeight: 1.5 }}>
                First leg can stay auto. Later consignee legs can be entered manually using the same journey link.
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginTop: 14 }}>
              <div style={{ gridColumn: "1 / -1", fontSize: 12, fontWeight: 700, color: "#334155" }}>Bill Details</div>
              <div>
                <label style={lbl}>Warehouse</label>
                <select name="warehouse_id" value={formData.warehouse_id} onChange={handleChange} style={inp}>
                  <option value="">Select Warehouse</option>
                  {warehouses.map((w) => (
                    <option key={w.id || w._id} value={w.id || w._id}>{w.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={lbl}>Location</label>
                <input value={selectedLocationName || ""} readOnly style={readOnlyInp} />
              </div>
              <div>
                <label style={lbl}>Employee</label>
                <select name="employee_id" value={formData.employee_id} onChange={handleChange} style={inp}>
                  <option value="">Select Employee</option>
                  {employees.map((e) => (
                    <option key={e.id || e._id} value={e.id || e._id}>{e.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={lbl}>Account</label>
                {renderAccountSelect(inp)}
              </div>
              <div style={{ gridColumn: "1 / -1", border: "1px solid #dbe3ef", borderRadius: 8, background: "#fff", padding: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#0f766e", marginBottom: 6 }}>Selected Bill Summary</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 8, fontSize: 12 }}>
                  <div><strong>Buyer:</strong> {selectedSalePassBill ? getBuyerName(selectedSalePassBill) : "-"}</div>
                  <div><strong>Consignee:</strong> {selectedSalePassBill?.consignee_name || "-"}</div>
                  <div><strong>Lorry No:</strong> {selectedSalePassBill?.lorry_no || formData.lorry_no || "-"}</div>
                  <div><strong>Remaining Qty:</strong> {formatDecimal4(Math.max(saleDispatchQty - saleUnloadingQty, 0))}</div>
                </div>
              </div>
              <div style={{ gridColumn: "1 / -1", border: "1px solid #cfe6e2", borderRadius: 8, background: "#f7fffd", padding: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#0f766e", marginBottom: 3 }}>Journey Chain</div>
                    <div style={{ fontSize: 12, color: "#475569" }}>
                      First to last unloading, transfer, palti or godown move in one chain.
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <button type="button" onClick={openSaleJourneyReport} style={{ ...btnAction, background: "#0f766e" }} disabled={!selectedSalePassBill && !formData.lorry_no}>
                      Open Journey Report
                    </button>
                    <select value={journeyTemplateId} onChange={(e) => applyJourneyTemplate(e.target.value)} style={inp} disabled={!selectedSalePassJourneyRows.length} >
                      <option value="">Use previous leg</option>
                      {selectedSalePassJourneyRows.map((row, index) => (
                        <option key={row.id || row._id || index} value={row.id || row._id}>
                          {`${index + 1}. ${row.voucher_no || row.bill_no || "-"} | ${row.lorry_no || "-"} | ${getBuyerName(row)} | ${row.consignee_name || "-"}`}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div style={{ marginTop: 10, overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead>
                      <tr>
                        <th style={th}>Leg</th>
                        <th style={th}>Voucher</th>
                        <th style={th}>Date</th>
                        <th style={th}>Lorry</th>
                        <th style={th}>Buyer</th>
                        <th style={th}>Consignee</th>
                        <th style={th}>Dispatch</th>
                        <th style={th}>Unload</th>
                        <th style={th}>Remain</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedSalePassJourneyRows.length > 0 ? (
                        selectedSalePassJourneyRows.map((row, index) => {
                          const dispatchQty = toNumber(row.dispatch_qty || row.quantity || row.total_quantity || row.unloading_qty || 0);
                          const unloadQty = toNumber(row.unloading_qty || 0);
                          const remainQty = Math.max(dispatchQty - unloadQty, 0);
                          return (
                            <tr key={row.id || row._id || index}>
                              <td style={td}>{index + 1}</td>
                              <td style={td}>{row.voucher_no || row.bill_no || "-"}</td>
                              <td style={td}>{formatLedgerDate(row.date || row.bill_date || "")}</td>
                              <td style={td}>{row.lorry_no || row.reference_id || "-"}</td>
                              <td style={td}>{getBuyerName(row)}</td>
                              <td style={td}>{row.consignee_name || "-"}</td>
                              <td style={td}>{formatDecimal4(dispatchQty)}</td>
                              <td style={td}>{formatDecimal4(unloadQty)}</td>
                              <td style={td}>{formatDecimal4(remainQty)}</td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={9} style={{ ...td, textAlign: "center", padding: 12 }}>
                            No journey history found yet for this lorry.
                          </td>
                        </tr>
                      )}
                    </tbody>
                    {selectedSalePassJourneyRows.length > 0 && (
                      <tfoot>
                        <tr style={{ background: "#ecfeff", fontWeight: 800 }}>
                          <td style={td} colSpan={6}>Total</td>
                          <td style={td}>{formatDecimal4(selectedSalePassJourneyRows.reduce((sum, row) => sum + toNumber(row.dispatch_qty || row.quantity || row.total_quantity || row.unloading_qty || 0), 0))}</td>
                          <td style={td}>{formatDecimal4(selectedSalePassJourneyRows.reduce((sum, row) => sum + toNumber(row.unloading_qty || 0), 0))}</td>
                          <td style={td}>{formatDecimal4(selectedSalePassJourneyRemainingQty)}</td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={lbl}>Sale Bill</label>
                <input
                  value={saleBillSearch}
                  onChange={(e) => setSaleBillSearch(e.target.value)}
                  style={inp}
                  placeholder="Search by bill no, lorry no, buyer, consignee"
                />
                <div style={{ ...tableCard, maxHeight: 240, marginTop: 8 }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead>
                      <tr>
                        <th style={th}>S.L</th>
                        <th style={th}>Bill</th>
                        <th style={th}>Date</th>
                        <th style={th}>Lorry No</th>
                        <th style={th}>Buyer</th>
                        <th style={th}>Consignee</th>
                        <th style={th}>Qty</th>
                        <th style={th}>Rate</th>
                        <th style={th}>Amount</th>
                        <th style={th}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {saleVoucherPassBills.map((row, index) => {
                        const rowId = row.id || row._id;
                        const selected = String(rowId) === String(editId);
                        return (
                          <tr key={rowId} style={{ background: selected ? "#dcfce7" : index % 2 ? "#f8fafc" : "#fff" }}>
                            <td style={td}>{index + 1}</td>
                            <td style={td}>{row.voucher_no || "-"}</td>
                            <td style={td}>{formatLedgerDate(row.date)}</td>
                            <td style={td}>{row.lorry_no || row.reference_id || "-"}</td>
                            <td style={td}>{getBuyerName(row)}</td>
                            <td style={td}>{row.consignee_name || "-"}</td>
                            <td style={td}>{formatDecimal4(row.quantity || row.total_quantity || 0)}</td>
                            <td style={td}>{formatMoney(row.rate || 0)}</td>
                            <td style={td}>{formatMoney(row.total_amount || row.amount || 0)}</td>
                            <td style={td}>
                              <button type="button" onClick={() => selectSaleVoucherForPass(rowId)} style={{ ...btnAction, background: selected ? "#15803d" : "#2563eb" }}>
                                {selected ? "Selected" : "Select"}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      {saleVoucherPassBills.length === 0 && (
                        <tr>
                          <td colSpan={10} style={{ ...td, textAlign: "center", padding: 14 }}>
                            No sale bill found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
              <div>
                <label style={lbl}>Bill No</label>
                <input
                  type="text"
                  value={formData.bill_no || formData.voucher_no}
                  onChange={(e) => setFormData(prev => ({ ...prev, voucher_no: e.target.value, bill_no: e.target.value }))}
                  style={inp}
                  placeholder="Manual bill no or leave blank for auto"
                />
              </div>
              <div>
                <label style={lbl}>Bill Date</label>
                <input
                  type="date"
                  value={formData.bill_date || formData.date}
                  onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value, bill_date: e.target.value }))}
                  style={inp}
                />
              </div>
              <div>
                <label style={lbl}>Lorry No</label>
                <input
                  type="text"
                  value={formData.lorry_no}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    lorry_no: e.target.value,
                    journey_token: prev.journey_token || "",
                  }))}
                  style={inp}
                  placeholder="Lorry / Trip"
                />
              </div>
              <div>
                <label style={lbl}>Journey Note</label>
                <input
                  type="text"
                  value={formData.journey_note || formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value, journey_note: e.target.value }))}
                  style={inp}
                  placeholder="Loading / reject / palti / godown note"
                />
              </div>
              <div style={{ gridColumn: "1 / -1", fontSize: 12, fontWeight: 700, color: "#334155" }}>Unloading / Leg Details</div>
              <div>
                <label style={lbl}>Dispatch Weight</label>
                <input type="text" value={formatDecimal4(saleDispatchQty)} readOnly style={readOnlyInp} />
              </div>
              <div>
                <label style={lbl}>Unloading Date</label>
                <input 
                  type="date" 
                  value={formData.unloading_date} 
                  onChange={(e) => setFormData(prev => {
                    const unloading_date = e.target.value;
                    const due_days = toNumber(prev.due_days);
                    let due_date = prev.due_date;
                    if (unloading_date && due_days > 0) {
                      const parsed = new Date(`${unloading_date}T00:00:00Z`);
                      if (!Number.isNaN(parsed.getTime())) {
                        parsed.setUTCDate(parsed.getUTCDate() + due_days);
                        due_date = parsed.toISOString().slice(0, 10);
                      }
                    } else if (!due_days) {
                      due_date = "";
                    }
                    return { ...prev, unloading_date, due_date };
                  })}
                  style={inp}
                />
              </div>
              <div>
                <label style={lbl}>Due Days</label>
                <input
                  type="number"
                  min="0"
                  value={formData.due_days || ""}
                  onChange={(e) => setFormData(prev => {
                    const due_days = e.target.value;
                    const unloading_date = prev.unloading_date || "";
                    let due_date = prev.due_date;
                    if (unloading_date && due_days > 0) {
                      const parsed = new Date(`${unloading_date}T00:00:00Z`);
                      if (!Number.isNaN(parsed.getTime())) {
                        parsed.setUTCDate(parsed.getUTCDate() + toNumber(due_days));
                        due_date = parsed.toISOString().slice(0, 10);
                      }
                    } else if (!due_days) {
                      due_date = "";
                    }
                    return { ...prev, due_days, due_date };
                  })}
                  style={inp}
                />
              </div>
              <div>
                <label style={lbl}>Due Date</label>
                <input type="date" value={formData.due_date} readOnly style={readOnlyInp} />
              </div>
              <div>
                <label style={lbl}>Unloading Weight (Qty)</label>
                <input 
                  type="number"
                  step="0.0001"
                  value={formData.unloading_qty}
                  onChange={(e) => setFormData(prev => ({ ...prev, unloading_qty: e.target.value }))}
                  style={inp}
                  placeholder="Weight"
                />
              </div>
              <div>
                <label style={lbl}>Reject Qty</label>
                <input
                  type="number"
                  step="0.0001"
                  value={formData.reject_qty || ""}
                  onChange={(e) => setFormData(prev => ({ ...prev, reject_qty: e.target.value }))}
                  style={inp}
                  placeholder="Reject quantity"
                />
              </div>
              <div>
                <label style={lbl}>Shortage Weight</label>
                <input type="text" value={formatDecimal4(saleShortageQty)} readOnly style={readOnlyInp} />
              </div>
              <div>
                <label style={lbl}>Shortage Amount</label>
                <input type="text" value={formatMoney(saleShortageAmount)} readOnly style={readOnlyInp} />
              </div>
              <div>
                <label style={lbl}>Moisture</label>
                <input 
                  type="number"
                  step="0.0001"
                  value={formData.moisture}
                  onChange={(e) => setFormData(prev => ({ ...prev, moisture: e.target.value }))}
                  style={inp}
                  placeholder="Moisture %"
                />
              </div>
              <div>
                <label style={lbl}>Dunky</label>
                <input 
                  type="number"
                  step="0.0001"
                  value={formData.dunki}
                  onChange={(e) => setFormData(prev => ({ ...prev, dunki: e.target.value }))}
                  style={inp}
                  placeholder="Dunky %"
                />
              </div>
              <div>
                <label style={lbl}>Fungus</label>
                <input 
                  type="number"
                  step="0.0001"
                  value={formData.fungus}
                  onChange={(e) => setFormData(prev => ({ ...prev, fungus: e.target.value }))}
                  style={inp}
                  placeholder="Fungus %"
                />
              </div>
              <div>
                <label style={lbl}>Discolour</label>
                <input 
                  type="number"
                  step="0.0001"
                  value={formData.discolour}
                  onChange={(e) => setFormData(prev => ({ ...prev, discolour: e.target.value }))}
                  style={inp}
                  placeholder="Discolour %"
                />
              </div>
              <div>
                <label style={lbl}>Others</label>
                <input 
                  type="number"
                  step="0.0001"
                  value={formData.others}
                  onChange={(e) => setFormData(prev => ({ ...prev, others: e.target.value }))}
                  style={inp}
                  placeholder="Others %"
                />
              </div>
              <div>
                <label style={lbl}>Total Deduction (Auto)</label>
                <input 
                  type="text"
                  value={formatMoney(saleQualityDeduction + saleCashDiscountAmount)}
                  readOnly
                  style={readOnlyInp}
                />
              </div>
              <div>
                <label style={lbl}>CD %</label>
                <input
                  type="number"
                  step="0.0001"
                  value={formData.cd_percent}
                  onChange={(e) => setFormData(prev => ({ ...prev, cd_percent: e.target.value, cd_amount: (saleBillAmountFromData(prev) * toNumber(e.target.value) / 100).toFixed(2) }))}
                  style={inp}
                />
              </div>
              <div>
                <label style={lbl}>CD Amount</label>
                <input type="text" value={formatMoney(saleCashDiscountAmount)} readOnly style={readOnlyInp} />
              </div>
              <div>
                <label style={lbl}>TDS</label>
                <input
                  type="number"
                  step="0.0001"
                  value={tdsEligible ? formatMoney(autoTdsAmount) : formData.tds_amount}
                  onChange={(e) => setFormData(prev => ({ ...prev, tds_amount: e.target.value }))}
                  readOnly={tdsEligible}
                  style={tdsEligible ? readOnlyInp : inp}
                />
              </div>
              <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <div style={{ fontSize: 12, color: "#475569" }}>
                  Same lorry can carry multiple bills. Keep each leg as a separate bill entry if needed.
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#0f766e" }}>
                  Remaining after this leg: {formatDecimal4(Math.max(saleDispatchQty - saleUnloadingQty, 0))}
                </div>
              </div>
            </div>

            <div style={{ marginTop: 16, padding: 12, background: "#f8fafc", borderRadius: 8, border: "1px solid #cbd5e1" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, fontSize: 13 }}>
                <div>
                  <strong>Gross Amount:</strong> Rs.{formatMoney(saleBillAmountFromData(formData))}
                </div>
                <div>
                  <strong>Shortage:</strong> Rs.{formatMoney(saleShortageAmount)}
                </div>
                <div>
                  <strong>Deduction:</strong> Rs.{formatMoney(saleQualityDeduction)}
                </div>
                <div>
                  <strong>Cash Discount:</strong> Rs.{formatMoney(saleCashDiscountAmount)}
                </div>
                <div>
                  <strong>TDS:</strong> Rs.{formatMoney(tdsEligible ? autoTdsAmount : formData.tds_amount)}
                </div>
                <div>
                  <strong>Round Off:</strong> Rs.{formatMoney(formData.round_off)}
                </div>
                <div style={{ fontWeight: 700, color: "#0f766e", fontSize: 14 }}>
                  <strong>Net Receivable:</strong> Rs.{formatMoney(saleNetReceivablePreview)}
                </div>
              </div>
              {tdsEligible && (
                <div style={{ marginTop: 8, color: "#92400e", fontSize: 13 }}>
                  Party sale total crossed Rs.50,00,000, so TDS is auto-calculated at 0.1%.
                </div>
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 14 }}>
              <button type="button" onClick={saveSaleVoucherPass} disabled={loading} style={btnPrimary}>
                {loading ? "Saving..." : "Final Save"}
              </button>
              <button type="button" onClick={saveSaleVoucherPassAndNew} disabled={loading} style={{ ...btnPrimary, background: "#0f766e" }}>
                {loading ? "Saving..." : "Save & New"}
              </button>
            </div>
          </div>
        </div>
      )}
      {showSaleAdjustedModal && (
        <div style={modalOverlayStyle}>
          <div style={paymentAdjustModalStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
              <div>
                <h3 style={{ margin: 0 }}>Adjusted Sale Vouchers</h3>
                <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>
                  Press F5 to open adjusted sale items or select a row to edit its voucher.
                </div>
              </div>
              <button type="button" onClick={() => setShowSaleAdjustedModal(false)} style={{ ...btnAction, background: "#64748b" }}>
                Close
              </button>
            </div>

            <div style={{ ...tableCard, maxHeight: 420, overflow: "auto", marginTop: 12 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={reportHeaderRowStyle}>
                    <th style={th}>Bill</th>
                    <th style={th}>Date</th>
                    <th style={th}>Lorry</th>
                    <th style={th}>Buyer</th>
                    <th style={th}>Consignee</th>
                    <th style={th}>Qty</th>
                    <th style={th}>Rate</th>
                    <th style={th}>Claim</th>
                    <th style={th}>Deduction</th>
                    <th style={th}>TDS</th>
                    <th style={th}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {saleAdjustedBills.map((row, index) => {
                    const rowId = row.id || row._id;
                    return (
                      <tr key={rowId} style={{ background: index % 2 ? "#f8fafc" : "#fff" }}>
                        <td style={td}>{row.voucher_no || "-"}</td>
                        <td style={td}>{row.date || "-"}</td>
                        <td style={td}>{row.lorry_no || row.reference_id || "-"}</td>
                        <td style={td}>{getBuyerName(row)}</td>
                        <td style={td}>{row.consignee_name || "-"}</td>
                        <td style={td}>{formatDecimal4(row.quantity || row.unloading_qty || 0)}</td>
                        <td style={td}>{formatMoney(row.rate || 0)}</td>
                        <td style={td}>{formatMoney(row.claim_amount || 0)}</td>
                        <td style={td}>{formatMoney(row.other_deduction || row.adjustment_amount || 0)}</td>
                        <td style={td}>{formatMoney(row.tds_amount || 0)}</td>
                        <td style={td}>
                          <button
                            type="button"
                            onClick={() => {
                              setShowSaleAdjustedModal(false);
                              handleEditVoucher(rowId);
                            }}
                            style={{ ...btnAction, background: "#2563eb" }}
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {saleAdjustedBills.length === 0 && (
                    <tr>
                      <td colSpan={11} style={{ ...td, textAlign: "center", padding: 18 }}>
                        No adjusted sale vouchers found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      {stockDrilldown && (
        <div style={modalOverlayStyle}>
          <div style={stockDrilldownModalStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", marginBottom: 14 }}>
              <div>
                <h3 style={{ margin: 0 }}>{stockDrilldownTitle}</h3>
                <div style={{ color: "#475569", fontSize: 13, marginTop: 5 }}>
                  {getWarehouseName(stockDrilldown.item)} | {getAccountName(stockDrilldown.item)} | {getProductName(stockDrilldown.item)}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                <button type="button" onClick={downloadStockDrilldownPdf} style={{ ...btnAction, background: "#0f766e" }}>
                  PDF
                </button>
                <button type="button" onClick={() => setStockDrilldown(null)} style={{ ...btnAction, background: "#64748b" }}>
                  Close
                </button>
              </div>
            </div>

            <div style={stockSummaryGridStyle}>
              {isStockDrilldownSale ? null : (
                <div style={stockMetricStyle}><span>Purchase / Inward Qty</span><strong>{formatDecimal4(stockDrilldownTotals.inward_qty || 0)}</strong></div>
              )}
              {isStockDrilldownPurchase ? null : (
                <div style={stockMetricStyle}><span>Sale / Outward Qty</span><strong>{formatDecimal4(stockDrilldownTotals.outward_qty || 0)}</strong></div>
              )}
              <div style={stockMetricStyle}><span>{isStockDrilldownCombined ? "Stock Qty" : "Balance Qty"}</span><strong>{formatDecimal4(stockDrilldownTotals.balance_qty || 0)}</strong></div>
              <div style={stockMetricStyle}><span>Purchase Avg Rate</span><strong>{formatMoney(stockDrilldownTotals.avg_rate || 0)}</strong></div>
              <div style={stockMetricStyle}><span>Stock Amount</span><strong>{formatMoney(stockDrilldownTotals.stock_value || 0)}</strong></div>
            </div>

            <div style={stockFilterBarStyle}>
              <Field label="From Date">
                <input
                  type="date"
                  value={stockDrilldownFromDate}
                  onChange={(event) => setStockDrilldownFromDate(event.target.value)}
                  style={inp}
                />
              </Field>
              <Field label="To Date">
                <input
                  type="date"
                  value={stockDrilldownToDate}
                  onChange={(event) => setStockDrilldownToDate(event.target.value)}
                  style={inp}
                />
              </Field>
              <button
                type="button"
                onClick={() => {
                  setStockDrilldownFromDate("");
                  setStockDrilldownToDate("");
                }}
                style={{ ...btnAction, background: "#475569", alignSelf: "end", minHeight: 38 }}
              >
                Reset Filter
              </button>
            </div>

            <div style={{ ...tableCard, maxHeight: "66vh", marginTop: 14 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={reportHeaderRowStyle}>
                    <th style={th}>Date</th>
                    <th style={th}>Type</th>
                    <th style={th}>Voucher No</th>
                    <th style={th}>Party</th>
                    {isStockDrilldownSale ? null : (
                      <>
                        <th style={th}>Inward Qty</th>
                        <th style={th}>In Rate</th>
                        <th style={th}>In Value</th>
                      </>
                    )}
                    {isStockDrilldownPurchase ? null : (
                      <>
                        <th style={th}>Outward Qty</th>
                        <th style={th}>Out Rate</th>
                        <th style={th}>Out Value</th>
                      </>
                    )}
                    <th style={th}>{isStockDrilldownCombined ? "Stock Qty" : "Balance Qty"}</th>
                    <th style={th}>Purchase Avg Rate</th>
                    <th style={th}>Stock Value</th>
                  </tr>
                </thead>
                <tbody>
                  {stockDrilldownRows.map((row, index) => (
                    <tr key={`${row.type}-${row.voucher_no || index}-${index}`} style={{ background: index % 2 ? "#f8fafc" : "#fff" }}>
                      <td style={td}>{formatLedgerDate(row.date)}</td>
                      <td style={{ ...td, fontWeight: 700, color: row.type === "Purchase" ? "#0f766e" : "#b45309" }}>{row.type}</td>
                      <td style={td}>{row.voucher_no || "-"}</td>
                      <td style={td}>{row.party_name || "-"}</td>
                      {isStockDrilldownSale ? null : (
                        <>
                          <td style={td}>{row.inward_qty ? formatDecimal4(row.inward_qty) : ""}</td>
                          <td style={td}>{row.inward_rate ? formatMoney(row.inward_rate) : ""}</td>
                          <td style={td}>{row.inward_amount ? formatMoney(row.inward_amount) : ""}</td>
                        </>
                      )}
                      {isStockDrilldownPurchase ? null : (
                        <>
                          <td style={td}>{row.outward_qty ? formatDecimal4(row.outward_qty) : ""}</td>
                          <td style={td}>{row.outward_rate ? formatMoney(row.outward_rate) : ""}</td>
                          <td style={td}>{row.outward_amount ? formatMoney(row.outward_amount) : ""}</td>
                        </>
                      )}
                      <td style={{ ...td, fontWeight: 800 }}>{formatDecimal4(row.balance_qty || 0)}</td>
                      <td style={td}>{formatMoney(row.day_avg_rate || 0)}</td>
                      <td style={{ ...td, fontWeight: 800 }}>{formatMoney(row.stock_value || 0)}</td>
                    </tr>
                  ))}
                  {stockDrilldownRows.length === 0 && (
                    <tr><td colSpan={isStockDrilldownCombined ? 13 : 10} style={{ ...td, textAlign: "center", padding: 20 }}>No stock detail available.</td></tr>
                  )}
                </tbody>
                {stockDrilldownRows.length > 0 && (
                  <tfoot>
                    <tr style={{ background: "#f1f5f9", fontWeight: 800 }}>
                      <td style={td} colSpan={4}>Total</td>
                      {isStockDrilldownSale ? null : (
                        <>
                          <td style={td}>{formatDecimal4(stockDrilldownTotals.inward_qty)}</td>
                          <td style={td}></td>
                          <td style={td}>{formatMoney(stockDrilldownTotals.inward_amount)}</td>
                        </>
                      )}
                      {isStockDrilldownPurchase ? null : (
                        <>
                          <td style={td}>{formatDecimal4(stockDrilldownTotals.outward_qty)}</td>
                          <td style={td}></td>
                          <td style={td}>{formatMoney(stockDrilldownTotals.outward_amount)}</td>
                        </>
                      )}
                      <td style={td}>{formatDecimal4(stockDrilldownTotals.balance_qty)}</td>
                      <td style={td}>{formatMoney(stockDrilldownTotals.avg_rate)}</td>
                      <td style={td}>{formatMoney(stockDrilldownTotals.stock_value)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
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
        step="0.0001"
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
const ledgerSplitStyle = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(360px, 100%), 1fr))", gap: 14, alignItems: "start" };
const billWisePanelStyle = { border: "1px solid #dbe4ef", borderRadius: 10, padding: 12, background: "#f8fafc" };
const linkButtonStyle = { border: "none", background: "transparent", color: "#2563eb", cursor: "pointer", padding: 0, fontWeight: 700, textDecoration: "underline" };
const paymentDetailBoxStyle = { marginTop: 10, border: "1px solid #dbe4ef", borderRadius: 8, background: "#fff", padding: 10, maxWidth: 460 };
const paymentDetailRowStyle = { display: "grid", gridTemplateColumns: "90px 1fr auto", gap: 8, padding: "6px 0", borderBottom: "1px solid #edf2f7", fontSize: 12 };
const modalOverlayStyle = {
  position: "fixed",
  inset: 0,
  background: "rgba(15, 23, 42, 0.48)",
  zIndex: 50,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 16,
};
const paymentAdjustModalStyle = {
  width: "min(980px, 96vw)",
  maxHeight: "90vh",
  overflow: "auto",
  background: "#fff",
  borderRadius: 8,
  border: "1px solid #cbd5e1",
  boxShadow: "0 20px 45px rgba(15, 23, 42, 0.25)",
  padding: 18,
};
const stockDrilldownModalStyle = {
  width: "min(1380px, 98vw)",
  maxHeight: "96vh",
  overflow: "auto",
  background: "#fff",
  borderRadius: 8,
  border: "1px solid #cbd5e1",
  boxShadow: "0 20px 45px rgba(15, 23, 42, 0.25)",
  padding: 20,
};
const stockSummaryGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
  gap: 10,
};
const stockFilterBarStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 12,
  alignItems: "end",
  marginTop: 14,
  padding: 12,
  border: "1px solid #dbe4ef",
  borderRadius: 8,
  background: "#f8fafc",
};
const stockMetricStyle = {
  border: "1px solid #dbe4ef",
  borderRadius: 6,
  background: "#f8fafc",
  padding: "10px 12px",
  display: "grid",
  gap: 5,
};
const smartInfoGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
  gap: 8,
  marginTop: 10,
};
const smartInfoBoxStyle = {
  border: "1px solid #bbf7d0",
  borderRadius: 8,
  background: "#f0fdf4",
  padding: "8px 10px",
  display: "grid",
  gap: 4,
  color: "#14532d",
  fontSize: 12,
};
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
