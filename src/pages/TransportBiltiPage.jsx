import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { consigneeHasBuyer } from "../utils/consigneeBuyers";

export default function TransportBiltiPage() {
  const API_BASE = "/api";
  const KG_PER_MT = 1000;

  const [mode, setMode] = useState("outward");
  const [outwardList, setOutwardList] = useState([]);
  const [saleList, setSaleList] = useState([]);
  const [transporters, setTransporters] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [companyAccounts, setCompanyAccounts] = useState([]);
  const [buyers, setBuyers] = useState([]);
  const [consignees, setConsignees] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [selectedOutwardId, setSelectedOutwardId] = useState("");
  const [selectedSaleId, setSelectedSaleId] = useState("");
  const [sourceSearch, setSourceSearch] = useState("");
  const [meta, setMeta] = useState(null);

  const emptyForm = {
    id: "",
    transporter_id: "",
    company_id: "",
    company_account_id: "",
    warehouse_id: "",
    dispatch_date: "",
    outward_date: "",
    destination: "",
    days: "",
    voucher_no: "",
    company_name: "",
    account_name: "",
    warehouse_name: "",
    product_name: "",
    lorry_no: "",
    buyer_name: "",
    consignee_name: "",
    outward_qty: "",
    dispatch_qty: "",
    shortage_free_kg: "100",
    outward_rate: "",
    transport_rate: "",
    detain_amount: "",
    others_exp: "",
    advance_amount: "",
    tds_percent: "0",
    narration: "",
  };

  const [formData, setFormData] = useState(emptyForm);

  const [showTransportForm, setShowTransportForm] = useState(false);
  const [transportForm, setTransportForm] = useState({
    name: "",
    address: "",
    pan_no: "",
    gst_no: "",
    aadhar_no: "",
    mobile: "",
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
    width: "100%",
  };

  const label = {
    fontSize: 13,
    color: "#475569",
    marginBottom: 6,
    display: "block",
  };

  const btn = {
    padding: "10px 18px",
    border: "none",
    borderRadius: 8,
    color: "#fff",
    fontWeight: 700,
    cursor: "pointer",
  };

  const sourceTh = {
    padding: "8px 10px",
    borderBottom: "1px solid #cbd5e1",
    background: "#f1f5f9",
    textAlign: "left",
    color: "#334155",
    fontSize: 12,
  };

  const sourceTd = {
    padding: "8px 10px",
    borderBottom: "1px solid #e2e8f0",
    color: "#0f172a",
    fontSize: 12,
  };

  const num = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return `${String(d.getDate()).padStart(2, "0")}-${String(
      d.getMonth() + 1
    ).padStart(2, "0")}-${d.getFullYear()}`;
  };

  const calcBiltiDays = (outwardDate, dispatchDate) => {
    if (!outwardDate || !dispatchDate) return "";
    const start = new Date(outwardDate);
    const end = new Date(dispatchDate);
    const msPerDay = 1000 * 60 * 60 * 24;
    const raw = Math.floor((end - start) / msPerDay);
    const inclusiveDays = raw + 1;
    const finalDays = inclusiveDays - 2;
    return finalDays < 0 ? 0 : finalDays;
  };

  const loadMasterData = async () => {
    const [
      outwardRes,
      saleRes,
      transportRes,
      companyRes,
      accountRes,
      buyerRes,
      consigneeRes,
      warehouseRes,
    ] = await Promise.all([
      axios.get(`${API_BASE}/transport-bilti/outward-list`),
      axios.get(`${API_BASE}/wh-vouchers/sale`),
      axios.get(`${API_BASE}/transporters`),
      axios.get(`${API_BASE}/companies`),
      axios.get(`${API_BASE}/company-accounts`),
      axios.get(`${API_BASE}/buyer-names`),
      axios.get(`${API_BASE}/consignee-names`),
      axios.get(`${API_BASE}/warehouses`),
    ]);

    setOutwardList(outwardRes.data || []);
    setSaleList(saleRes.data || []);
    setTransporters(transportRes.data || []);
    setCompanies(companyRes.data || []);
    setCompanyAccounts(accountRes.data || []);
    setBuyers(buyerRes.data || []);
    setConsignees(consigneeRes.data || []);
    setWarehouses(warehouseRes.data || []);
  };

  useEffect(() => {
    loadMasterData().catch((err) => {
      console.error(err);
      alert("Initial data load failed");
    });
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const editId = params.get("edit");
    if (!editId) return;

    loadBilti(editId);
  }, []);

  const resetForm = () => {
    setMeta(null);
    setSelectedOutwardId("");
    setSelectedSaleId("");
    setSourceSearch("");
    setFormData(emptyForm);
  };

  const clearSelection = () => {
    setMeta(null);
    setSelectedOutwardId("");
    setSelectedSaleId("");
    setFormData(emptyForm);
  };

  const switchMode = (nextMode) => {
    setMode(nextMode);
    resetForm();
  };

  const loadBilti = async (id, source = "") => {
    if (!id) return;

    try {
      const res = await axios.get(`${API_BASE}/transport-bilti/${id}`, {
        params: source ? { source } : undefined,
      });
      const row = res.data;
      setMeta(row);

      const sourceDate =
        row.outward_entry_date ||
        row.sale_entry_date ||
        row.outward_date;
      const sourceQty =
        row.outward_quantity ||
        row.outward_weight ||
        row.sale_unloading_qty ||
        row.sale_quantity;
      const sourceRate = row.outward_master_rate || row.sale_master_rate;
      const dispatchDate = row.dispatch_date || row.sale_unloading_date || sourceDate || "";

      setFormData({
        id: row.id || "",
        transporter_id: row.transporter_id || "",
        company_id: "",
        company_account_id: "",
        warehouse_id: "",
        dispatch_date: dispatchDate,
        outward_date: sourceDate || "",
        destination: row.destination || "",
        days:
          row.days !== undefined && row.days !== null && row.days !== ""
            ? row.days
            : calcBiltiDays(sourceDate, dispatchDate),
        voucher_no: row.outward_voucher_no || row.sale_voucher_no || row.voucher_no || "",
        company_name: row.outward_company_name || row.sale_buyer_name || row.company_name || "",
        account_name: row.outward_account_name || row.sale_account_name || row.account_name || "",
        warehouse_name: row.outward_warehouse_name || row.sale_warehouse_name || row.warehouse_name || "",
        product_name: row.outward_product_name || row.sale_product_name || row.product_name || "",
        lorry_no: row.outward_lorry_no || row.sale_lorry_no || row.lorry_no || "",
        buyer_name: row.outward_buyer_name || row.sale_buyer_name || row.buyer_name || "",
        consignee_name: row.outward_consignee_name || row.sale_consignee_name || row.consignee_name || "",
        outward_qty: row.outward_qty ?? num(sourceQty),
        dispatch_qty: row.dispatch_qty ?? num(sourceQty),
        shortage_free_kg: String(row.shortage_free_kg ?? 100),
        outward_rate: row.outward_rate ?? num(sourceRate),
        transport_rate: row.transport_rate ?? "",
        detain_amount: row.detain_amount ?? "",
        others_exp: row.others_exp ?? "",
        advance_amount: row.advance_amount ?? "",
        tds_percent: String(row.tds_percent ?? "0"),
        narration: row.narration || "",
      });

      if (row.sale_id) {
        setMode("sale");
        setSelectedSaleId(String(row.sale_id));
        setSelectedOutwardId("");
      } else if (row.outward_id) {
        setMode("outward");
        setSelectedOutwardId(String(row.outward_id));
        setSelectedSaleId("");
      } else {
        setMode("manual");
        setSelectedOutwardId("");
        setSelectedSaleId("");
      }
    } catch (err) {
      console.error(err);
      alert("Bilti load failed");
    }
  };

  const selectedTransporter = useMemo(
    () => transporters.find((t) => String(t.id) === String(formData.transporter_id)),
    [transporters, formData.transporter_id]
  );

  const selectedAccount = useMemo(() => {
    if (formData.company_account_id) {
      return (
        companyAccounts.find((a) => String(a.id) === String(formData.company_account_id)) ||
        null
      );
    }
    return (
      companyAccounts.find(
        (a) =>
          (a.account_name || "").trim().toLowerCase() ===
          (formData.account_name || "").trim().toLowerCase()
      ) || null
    );
  }, [companyAccounts, formData.company_account_id, formData.account_name]);

  const selectedConsignee = useMemo(
    () =>
      consignees.find(
        (c) =>
          (c.name || "").trim().toLowerCase() ===
          (formData.consignee_name || "").trim().toLowerCase()
      ) || null,
    [consignees, formData.consignee_name]
  );

  const selectedBuyer = useMemo(
    () =>
      buyers.find(
        (b) =>
          (b.name || "").trim().toLowerCase() ===
          (formData.buyer_name || "").trim().toLowerCase()
      ) || null,
    [buyers, formData.buyer_name]
  );

  const filteredConsignees = useMemo(() => {
    if (!selectedBuyer?.id) return consignees;
    return consignees.filter((c) => consigneeHasBuyer(c, selectedBuyer.id));
  }, [consignees, selectedBuyer]);

  const pendingOutwardList = useMemo(() => {
    const search = sourceSearch.trim().toLowerCase();
    return outwardList.filter((row) => {
      if (row.bilti_id) return false;
      const searchable = [
        row.voucher_no,
        row.company_name,
        row.account_name,
        row.warehouse_name,
        row.product_name,
        row.lorry_no,
        row.buyer_name,
        row.consignee_name,
      ].join(" ").toLowerCase();
      return !search || searchable.includes(search);
    });
  }, [outwardList, sourceSearch]);

  const pendingSaleList = useMemo(() => {
    const search = sourceSearch.trim().toLowerCase();
    return saleList.filter((row) => {
      if (row.bilti_id) return false;
      const searchable = [
        row.voucher_no,
        row.warehouse_name,
        row.product_name,
        row.lorry_no,
        row.buyer_name,
        row.consignee_name,
        row.account_name || row.company_account_name,
      ].join(" ").toLowerCase();
      return !search || searchable.includes(search);
    });
  }, [saleList, sourceSearch]);

  const calculation = useMemo(() => {
    const outwardQty = num(formData.outward_qty);
    const dispatchQty = num(formData.dispatch_qty);
    const outwardRate = num(formData.outward_rate);
    const transportRate = num(formData.transport_rate);
    const detain = num(formData.detain_amount);
    const others = num(formData.others_exp);
    const advance = num(formData.advance_amount);
    const tdsPercent = num(formData.tds_percent);

    const shortageQty = Math.max(outwardQty - dispatchQty, 0);
    const claimFreeQtyInMt = num(formData.shortage_free_kg) / KG_PER_MT;
    const chargeableShortageQty = Math.max(shortageQty - claimFreeQtyInMt, 0);
    const shortageAmount = chargeableShortageQty * outwardRate;
    const grossFreight = outwardQty * transportRate;
    const netAmount = grossFreight - shortageAmount + detain + others;
    const tdsAmount = netAmount * (tdsPercent / 100);
    const payableAmount = netAmount - advance - tdsAmount;

    return {
      shortageQty,
      shortageAmount,
      grossFreight,
      netAmount,
      tdsAmount,
      payableAmount,
    };
  }, [formData]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => {
      const next = { ...prev, [name]: value };

      if (name === "shortage_free_kg") {
        next.shortage_free_kg = value === "" ? "" : String(Math.max(num(value), 0));
      }

      if (name === "dispatch_date" && prev.outward_date) {
        next.days = calcBiltiDays(prev.outward_date, value);
      }

      if (name === "outward_date" && prev.dispatch_date) {
        next.days = calcBiltiDays(value, prev.dispatch_date);
      }

      if (mode === "manual" && name === "company_id") {
        const company = companies.find((c) => String(c.id) === String(value));
        next.company_name = company?.name || "";
        next.company_account_id = "";
        next.account_name = "";
      }

      if (mode === "manual" && name === "company_account_id") {
        const acc = companyAccounts.find((a) => String(a.id) === String(value));
        next.account_name = acc?.account_name || "";
      }

      if (mode === "manual" && name === "warehouse_id") {
        const wh = warehouses.find((w) => String(w.id) === String(value));
        next.warehouse_name = wh?.name || "";
      }

      if (name === "buyer_name") {
        next.consignee_name = "";
      }

      return next;
    });
  };

  const saveTransporter = async () => {
    if (!transportForm.name.trim()) return alert("Transport name required");

    try {
      const res = await axios.post(`${API_BASE}/transporters`, transportForm);
      await loadMasterData();
      setFormData((prev) => ({ ...prev, transporter_id: String(res.data.id) }));
      setTransportForm({ name: "", address: "", pan_no: "", gst_no: "", aadhar_no: "", mobile: "" });
      setShowTransportForm(false);
      alert("Transport saved successfully");
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.error || "Transport save failed");
    }
  };

  const saveBilti = async () => {
    if (!formData.transporter_id) return alert("Select transport name");
    const hasExistingBilti = Boolean(formData.id);
    if (hasExistingBilti) {
      return alert("Use 'Edit Bilti' button to update an existing bilti");
    }

    try {
      const res = await axios.post(`${API_BASE}/transport-bilti/save`, {
        ...formData,
        outward_id: mode === "outward" ? selectedOutwardId : null,
        sale_id: mode === "sale" ? selectedSaleId : null,
      });
      alert(res.data.message || "Bilti saved successfully");
      await loadMasterData();
      if (res.data.id) {
        loadBilti(res.data.id);
      }
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.error || "Bilti save failed");
    }
  };

  const editBilti = async () => {
    if (!formData.transporter_id) return alert("Select transport name");
    const hasExistingBilti = Boolean(formData.id);
    if (!hasExistingBilti) {
      return alert("Load an existing bilti first to edit");
    }

    try {
      const res = await axios.post(`${API_BASE}/transport-bilti/save`, {
        ...formData,
        outward_id: mode === "outward" ? selectedOutwardId : null,
        sale_id: mode === "sale" ? selectedSaleId : null,
      });
      alert("Bilti edited successfully");
      await loadMasterData();
      if (res.data.id) {
        loadBilti(res.data.id);
      } else if (mode === "outward" && selectedOutwardId) {
        loadBilti(selectedOutwardId);
      } else if (mode === "sale" && selectedSaleId) {
        loadBilti(selectedSaleId, "sale");
      }
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.error || "Bilti edit failed");
    }
  };

  const deleteBilti = async () => {
    if (!formData.id) return alert("No bilti selected");
    if (!window.confirm("Delete this bilti?")) return;

    try {
      await axios.delete(`${API_BASE}/transport-bilti/${formData.id}`);
      alert("Bilti deleted successfully");
      resetForm();
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.error || "Delete failed");
    }
  };

const downloadPDF = () => {
  const doc = new jsPDF("l", "mm", "a4");
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const leftX = 8;
  const topY = 8;
  const contentWidth = pageWidth - 16;

  const voucherNo = formData.voucher_no || meta?.outward_voucher_no || meta?.voucher_no || "-";
  const billNo = meta?.bilti_no || (formData.id ? `BLT-${formData.id}` : "DRAFT");
  const lrDate = formatDate(formData.dispatch_date || formData.outward_date);
  const transporterName = selectedTransporter?.name || "Transport Copy";
  const transporterAddress = selectedTransporter?.address || "-";
  const transporterPan = selectedTransporter?.pan_no || "-";
  const consigneeName = formData.consignee_name || "-";
  const consignorName = selectedAccount?.account_name || formData.account_name || "-";
  const consignorAddress = selectedAccount?.address || "-";
  const consigneeAddress = selectedConsignee?.address || "-";
  const warehouseName = formData.warehouse_name || "-";

  const dispatchWeight = num(formData.dispatch_qty);
  const outwardWeight = num(formData.outward_qty);
  const rate = num(formData.transport_rate);
  const gross = calculation.grossFreight;
  const shortage = calculation.shortageAmount;
  const detain = num(formData.detain_amount);
  const others = num(formData.others_exp);
  const tds = calculation.tdsAmount;
  const advance = num(formData.advance_amount);
  const payable = calculation.payableAmount;
  const netAmount = calculation.netAmount;

  const money = (v) => Number(v || 0).toFixed(2);

  const drawPanel = ({ x, y, w, h, fill, border, title, rows, titleColor = [255, 255, 255] }) => {
    doc.setDrawColor(border[0], border[1], border[2]);
    doc.setLineWidth(0.25);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(x, y, w, h, 4, 4, "FD");
    doc.setFillColor(fill[0], fill[1], fill[2]);
    doc.roundedRect(x, y, w, 10, 4, 4, "F");
    doc.rect(x, y + 4, w, 6, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(titleColor[0], titleColor[1], titleColor[2]);
    doc.text(title, x + 4, y + 6.5);

    let rowY = y + 14;
    rows.forEach((row, index) => {
      doc.setFillColor(index % 2 === 0 ? 246 : 255, index % 2 === 0 ? 246 : 255, index % 2 === 0 ? 246 : 255);
      doc.roundedRect(x + 2.5, rowY - 3.8, w - 5, 7.2, 1.8, 1.8, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.2);
      doc.setTextColor(90, 90, 90);
      doc.text(row[0], x + 5, rowY);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(35, 35, 35);
      doc.text(String(row[1]), x + w - 5, rowY, { align: "right" });
      rowY += 8;
    });
  };

  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pageWidth, pageHeight, "F");

  doc.setFillColor(245, 245, 245);
  doc.circle(34, pageHeight - 12, 18, "F");
  doc.setFillColor(236, 236, 236);
  doc.circle(pageWidth - 20, 16, 16, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(25, 25, 25);
  doc.text("Transport Payment Advice", leftX, topY + 13);

  const statStartX = 175;
  const statWidth = 34;
  const statGap = 8;
  const stats = [
    ["Net Payable", money(payable), [60, 60, 60]],
    ["Gross Freight", money(gross), [60, 60, 60]],
    ["LR Date", lrDate || "-", [60, 60, 60]],
  ];

  stats.forEach((stat, index) => {
    const x = statStartX + index * (statWidth + statGap);
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(210, 210, 210);
    doc.roundedRect(x, topY + 10, statWidth, 22, 3.5, 3.5, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.8);
    doc.setTextColor(stat[2][0], stat[2][1], stat[2][2]);
    doc.text(stat[1], x + statWidth / 2, topY + 19, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.2);
    doc.setTextColor(71, 85, 105);
    doc.text(stat[0], x + statWidth / 2, topY + 26, { align: "center" });
  });

  doc.setDrawColor(190, 190, 190);
  doc.setLineWidth(0.25);
  doc.line(leftX, topY + 36, pageWidth - leftX, topY + 36);

  const infoY = topY + 41;
  drawPanel({
    x: leftX,
    y: infoY,
    w: 90,
    h: 48,
    fill: [245, 245, 245],
    border: [205, 205, 205],
    title: "GENERAL DETAILS",
    titleColor: [40, 40, 40],
    rows: [
      ["Bilti No", billNo],
      ["Voucher No", voucherNo],
      ["Transporter", transporterName],
      ["Vehicle", formData.lorry_no || "-"],
    ],
  });

  drawPanel({
    x: leftX + 94,
    y: infoY,
    w: 90,
    h: 48,
    fill: [248, 248, 248],
    border: [205, 205, 205],
    title: "PARTY DETAILS",
    titleColor: [40, 40, 40],
    rows: [
      ["Consignor", consignorName],
      ["Consignee", consigneeName],
      ["Buyer", formData.buyer_name || "-"],
    ],
  });

  drawPanel({
    x: leftX + 188,
    y: infoY,
    w: 92,
    h: 48,
    fill: [245, 245, 245],
    border: [205, 205, 205],
    title: "TRIP DATA",
    titleColor: [40, 40, 40],
    rows: [
      ["Dispatch", lrDate || "-"],
      ["Days", formData.days || "0"],
      ["Destination", formData.destination || "-"],
      ["Warehouse", warehouseName],
    ],
  });

  autoTable(doc, {
    startY: infoY + 54,
    margin: { left: leftX, right: leftX },
    theme: "grid",
    styles: { fontSize: 7.1, cellPadding: 1.8, lineWidth: 0.18, lineColor: [200, 200, 200], textColor: [35, 35, 35] },
    headStyles: { fillColor: [238, 238, 238], textColor: [25, 25, 25], fontStyle: "bold" },
    head: [[
      "Bilti No",
      "Voucher",
      "Consignor / Party",
      "Consignee",
      "Lorry No",
      "Product",
      "Outward Wt.",
      "Dispatch Wt.",
      "Rate",
      "Gross Freight",
    ]],
    body: [[
      billNo,
      voucherNo,
      consignorName,
      consigneeName,
      formData.lorry_no || "-",
      formData.product_name || "-",
      money(outwardWeight),
      money(dispatchWeight),
      money(rate),
      money(gross),
    ]],
  });

  const lowerY = doc.lastAutoTable.finalY + 6;
  drawPanel({
    x: leftX,
    y: lowerY,
    w: 90,
    h: 42,
    fill: [246, 246, 246],
    border: [205, 205, 205],
    title: "SHORTAGE",
    titleColor: [40, 40, 40],
    rows: [
      ["Shortage Qty", money(calculation.shortageQty)],
      ["Free KG", money(num(formData.shortage_free_kg))],
      ["Claim Amt", money(shortage)],
    ],
  });

  drawPanel({
    x: leftX + 94,
    y: lowerY,
    w: 90,
    h: 42,
    fill: [248, 248, 248],
    border: [205, 205, 205],
    title: "CHARGES BREAKUP",
    titleColor: [40, 40, 40],
    rows: [
      ["Detain Charges", money(detain)],
      ["Other Charges", money(others)],
      ["Transport Rate", money(rate)],
    ],
  });

  drawPanel({
    x: leftX + 188,
    y: lowerY,
    w: 92,
    h: 42,
    fill: [246, 246, 246],
    border: [205, 205, 205],
    title: "PAYMENT DETAILS",
    titleColor: [40, 40, 40],
    rows: [
      ["Current Payment", money(netAmount)],
      ["TDS Amount", money(tds)],
      ["Advance Paid", money(advance)],
      ["Net Payable", money(payable)],
    ],
  });

  const kpiY = lowerY + 49;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(90, 90, 90);
  doc.text("Total consolidated transport payable:", 170, kpiY);
  doc.text("Estimated chargeable freight after deductions:", 234, kpiY);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(35, 35, 35);
  doc.text(`${money(payable)}`, 181, kpiY + 12);
  doc.text(`${money(netAmount)}`, 247, kpiY + 12);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(90, 90, 90);
  doc.text("Remark:", leftX, pageHeight - 12);
  doc.setFont("helvetica", "normal");
  doc.text(formData.narration || "-", leftX + 18, pageHeight - 12, { maxWidth: 130 });
  doc.setFont("helvetica", "bold");
  doc.text("Authorized Signatory", pageWidth - 48, pageHeight - 12);

  doc.save(`Transport_Payment_Advice_${voucherNo !== "-" ? voucherNo : billNo}.pdf`);
};



  return (
    <div style={{ padding: 20, background: "#f8fafc", minHeight: "100vh", fontFamily: "Segoe UI, Arial, sans-serif" }}>
      <div style={{ ...card, marginBottom: 16 }}>
        <h2 style={{ margin: 0, color: "#0f172a" }}>Create Transport Bilti</h2>
      </div>

      <div style={{ ...card, marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button onClick={() => switchMode("outward")} style={{ ...btn, background: mode === "outward" ? "#0f766e" : "#64748b" }}>
            From Outward
          </button>
          <button onClick={() => switchMode("sale")} style={{ ...btn, background: mode === "sale" ? "#0f766e" : "#64748b" }}>
            From Warehouse Sale
          </button>
          <button onClick={() => switchMode("manual")} style={{ ...btn, background: mode === "manual" ? "#0f766e" : "#64748b" }}>
            Manual Bilti
          </button>
        </div>
      </div>

      {mode === "outward" && (
        <div style={{ ...card, marginBottom: 16 }}>
          <label style={label}>Pending Outward</label>
          <input
            value={sourceSearch}
            onChange={(e) => setSourceSearch(e.target.value)}
            style={{ ...input, marginBottom: 10 }}
            placeholder="Search by voucher, lorry no, party, warehouse"
          />
          {selectedOutwardId && (
            <div style={{ position: "relative", marginBottom: 14, padding: 12, borderRadius: 12, border: "1px solid #fecaca", background: "#fef2f2" }}>
              <button
                type="button"
                onClick={clearSelection}
                style={{ position: "absolute", top: 10, right: 10, border: "none", background: "transparent", color: "#dc2626", fontSize: 18, cursor: "pointer", lineHeight: 1 }}
              >
                ×
              </button>
              <div style={{ fontWeight: 700, color: "#991b1b", marginBottom: 6 }}>
                Selected Outward: {formData.voucher_no || "-"}
              </div>
              <div style={{ color: "#475569", fontSize: 13 }}>
                {formData.warehouse_name || "-"} • {formData.buyer_name || "-"} • {formData.lorry_no || "-"}
              </div>
            </div>
          )}
          <div style={{ overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: 8 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 860 }}>
              <thead>
                <tr>
                  <th style={sourceTh}>S.L</th>
                  <th style={sourceTh}>Voucher</th>
                  <th style={sourceTh}>Date</th>
                  <th style={sourceTh}>Lorry No</th>
                  <th style={sourceTh}>Party</th>
                  <th style={sourceTh}>Warehouse</th>
                  <th style={sourceTh}>Product</th>
                  <th style={sourceTh}>Weight</th>
                  <th style={sourceTh}>Rate</th>
                  <th style={sourceTh}>Action</th>
                </tr>
              </thead>
              <tbody>
                {pendingOutwardList.map((row, index) => (
                  <tr key={row.id} style={{ background: index % 2 ? "#f8fafc" : "#fff" }}>
                    <td style={sourceTd}>{index + 1}</td>
                    <td style={sourceTd}>{row.voucher_no || `OUT-${row.id}`}</td>
                    <td style={sourceTd}>{formatDate(row.date)}</td>
                    <td style={sourceTd}>{row.lorry_no || "-"}</td>
                    <td style={sourceTd}>{row.company_name || row.account_name || "-"}</td>
                    <td style={sourceTd}>{row.warehouse_name || "-"}</td>
                    <td style={sourceTd}>{row.product_name || "-"}</td>
                    <td style={sourceTd}>{num(row.quantity || row.weight).toFixed(4)}</td>
                    <td style={sourceTd}>{num(row.rate).toFixed(2)}</td>
                    <td style={sourceTd}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedOutwardId(String(row.id));
                          loadBilti(row.id);
                        }}
                        style={{ ...btn, background: "#2563eb", padding: "7px 12px" }}
                      >
                        Select
                      </button>
                    </td>
                  </tr>
                ))}
                {pendingOutwardList.length === 0 && (
                  <tr>
                    <td colSpan={10} style={{ ...sourceTd, textAlign: "center", padding: 14 }}>
                      No pending outward found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {mode === "sale" && (
        <div style={{ ...card, marginBottom: 16 }}>
          <label style={label}>Pending Warehouse Sale</label>
          <input
            value={sourceSearch}
            onChange={(e) => setSourceSearch(e.target.value)}
            style={{ ...input, marginBottom: 10 }}
            placeholder="Search by bill no, lorry no, buyer, consignee, warehouse"
          />
          {selectedSaleId && (
            <div style={{ position: "relative", marginBottom: 14, padding: 12, borderRadius: 12, border: "1px solid #fecaca", background: "#fef2f2" }}>
              <button
                type="button"
                onClick={clearSelection}
                style={{ position: "absolute", top: 10, right: 10, border: "none", background: "transparent", color: "#dc2626", fontSize: 18, cursor: "pointer", lineHeight: 1 }}
              >
                ×
              </button>
              <div style={{ fontWeight: 700, color: "#991b1b", marginBottom: 6 }}>
                Selected Sale Bill: {formData.voucher_no || "-"}
              </div>
              <div style={{ color: "#475569", fontSize: 13 }}>
                {formData.warehouse_name || "-"} • {formData.buyer_name || "-"} • {formData.lorry_no || "-"}
              </div>
            </div>
          )}
          <div style={{ overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: 8 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 920 }}>
              <thead>
                <tr>
                  <th style={sourceTh}>S.L</th>
                  <th style={sourceTh}>Bill</th>
                  <th style={sourceTh}>Date</th>
                  <th style={sourceTh}>Lorry No</th>
                  <th style={sourceTh}>Buyer</th>
                  <th style={sourceTh}>Consignee</th>
                  <th style={sourceTh}>Warehouse</th>
                  <th style={sourceTh}>Product</th>
                  <th style={sourceTh}>Qty</th>
                  <th style={sourceTh}>Rate</th>
                  <th style={sourceTh}>Action</th>
                </tr>
              </thead>
              <tbody>
                {pendingSaleList.map((row, index) => (
                  <tr key={row.id} style={{ background: index % 2 ? "#f8fafc" : "#fff" }}>
                    <td style={sourceTd}>{index + 1}</td>
                    <td style={sourceTd}>{row.voucher_no || `SAL-${row.id}`}</td>
                    <td style={sourceTd}>{formatDate(row.date)}</td>
                    <td style={sourceTd}>{row.lorry_no || "-"}</td>
                    <td style={sourceTd}>{row.buyer_name || "-"}</td>
                    <td style={sourceTd}>{row.consignee_name || "-"}</td>
                    <td style={sourceTd}>{row.warehouse_name || "-"}</td>
                    <td style={sourceTd}>{row.product_name || "-"}</td>
                    <td style={sourceTd}>{num(row.unloading_qty || row.quantity).toFixed(4)}</td>
                    <td style={sourceTd}>{num(row.rate).toFixed(2)}</td>
                    <td style={sourceTd}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedSaleId(String(row.id));
                          loadBilti(row.id, "sale");
                        }}
                        style={{ ...btn, background: "#2563eb", padding: "7px 12px" }}
                      >
                        Select
                      </button>
                    </td>
                  </tr>
                ))}
                {pendingSaleList.length === 0 && (
                  <tr>
                    <td colSpan={11} style={{ ...sourceTd, textAlign: "center", padding: 14 }}>
                      No pending warehouse sale found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {(mode === "manual" || meta) && (
        <>
          <div style={{ ...card, marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <label style={{ ...label, marginBottom: 0 }}>Transport Name</label>
              <button onClick={() => setShowTransportForm((p) => !p)} style={{ ...btn, background: "#2563eb", padding: "8px 14px" }}>
                New Transport
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12, marginBottom: 14 }}>
              <select name="transporter_id" value={formData.transporter_id} onChange={handleChange} style={input}>
                <option value="">Select Transport</option>
                {transporters.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
              <input value={selectedTransporter?.pan_no || ""} readOnly placeholder="PAN No" style={{ ...input, background: "#f8fafc" }} />
            </div>

            {showTransportForm && (
              <div style={{ border: "1px solid #dbe4ea", borderRadius: 12, padding: 12, marginBottom: 14, background: "#f8fafc" }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
                  <input placeholder="Transport Name" value={transportForm.name} onChange={(e) => setTransportForm((p) => ({ ...p, name: e.target.value }))} style={input} />
                  <input placeholder="Address" value={transportForm.address} onChange={(e) => setTransportForm((p) => ({ ...p, address: e.target.value }))} style={input} />
                  <input placeholder="PAN No" value={transportForm.pan_no} onChange={(e) => setTransportForm((p) => ({ ...p, pan_no: e.target.value }))} style={input} />
                  <input placeholder="GST No" value={transportForm.gst_no} onChange={(e) => setTransportForm((p) => ({ ...p, gst_no: e.target.value.toUpperCase() }))} style={input} />
                  <input placeholder="Aadhar No" value={transportForm.aadhar_no} onChange={(e) => setTransportForm((p) => ({ ...p, aadhar_no: e.target.value.replace(/\D/g, "") }))} style={input} />
                  <input placeholder="Mobile No" value={transportForm.mobile} onChange={(e) => setTransportForm((p) => ({ ...p, mobile: e.target.value }))} style={input} />
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 12 }}>
                  <button onClick={saveTransporter} style={{ ...btn, background: "#16a34a" }}>
                    Save Transport
                  </button>
                </div>
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
              <div>
                <label style={label}>Voucher No</label>
                <input name="voucher_no" value={formData.voucher_no} onChange={handleChange} style={input} />
              </div>
              <div>
                <label style={label}>Outward Date</label>
                <input type="date" name="outward_date" value={formData.outward_date} onChange={handleChange} style={input} />
              </div>
              <div>
                <label style={label}>Dispatch Date</label>
                <input type="date" name="dispatch_date" value={formData.dispatch_date} onChange={handleChange} style={input} />
              </div>
              <div>
                <label style={label}>Destination</label>
                <input name="destination" value={formData.destination} onChange={handleChange} style={input} />
              </div>
              <div>
                <label style={label}>Days</label>
                <input type="number" name="days" value={formData.days} readOnly style={{ ...input, background: "#f8fafc" }} />
              </div>

              {mode === "manual" ? (
                <>
                  <div>
                    <label style={label}>Party</label>
                    <select name="company_id" value={formData.company_id} onChange={handleChange} style={input}>
                      <option value="">Select Party</option>
                      {companies.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={label}>Account</label>
                    <select name="company_account_id" value={formData.company_account_id} onChange={handleChange} style={input}>
                      <option value="">Select Account</option>
                      {companyAccounts
                        .filter((a) => String(a.company_id) === String(formData.company_id))
                        .map((a) => (
                          <option key={a.id} value={a.id}>{a.account_name}</option>
                        ))}
                    </select>
                  </div>
                  <div>
                    <label style={label}>Warehouse</label>
                    <select name="warehouse_id" value={formData.warehouse_id} onChange={handleChange} style={input}>
                      <option value="">Select Warehouse</option>
                      {warehouses.map((w) => (
                        <option key={w.id} value={w.id}>{w.name}</option>
                      ))}
                    </select>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label style={label}>Party</label>
                    <input value={formData.company_name} readOnly style={{ ...input, background: "#f8fafc" }} />
                  </div>
                  <div>
                    <label style={label}>Account</label>
                    <input value={formData.account_name} readOnly style={{ ...input, background: "#f8fafc" }} />
                  </div>
                  <div>
                    <label style={label}>Warehouse</label>
                    <input value={formData.warehouse_name} readOnly style={{ ...input, background: "#f8fafc" }} />
                  </div>
                </>
              )}

              <div>
                <label style={label}>Product Name</label>
                <input name="product_name" value={formData.product_name} onChange={handleChange} style={input} />
              </div>
              <div>
                <label style={label}>Lorry No</label>
                <input name="lorry_no" value={formData.lorry_no} onChange={handleChange} style={input} />
              </div>
              <div>
                <label style={label}>Buyer</label>
                <select name="buyer_name" value={formData.buyer_name} onChange={handleChange} style={input}>
                  <option value="">Select Buyer</option>
                  {formData.buyer_name &&
                    !buyers.some((b) => b.name === formData.buyer_name) && (
                      <option value={formData.buyer_name}>{formData.buyer_name}</option>
                    )}
                  {buyers.map((b) => (
                    <option key={b.id} value={b.name}>{b.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={label}>Consignee</label>
                <select name="consignee_name" value={formData.consignee_name} onChange={handleChange} style={input}>
                  <option value="">Select Consignee</option>
                  {formData.consignee_name &&
                    !filteredConsignees.some((c) => c.name === formData.consignee_name) && (
                      <option value={formData.consignee_name}>{formData.consignee_name}</option>
                    )}
                  {filteredConsignees.map((c) => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={label}>Outward Weight</label>
                <input type="number" name="outward_qty" value={formData.outward_qty} onChange={handleChange} style={input} />
              </div>
              <div>
                <label style={label}>Unloading / Dispatch Weight</label>
                <input type="number" name="dispatch_qty" value={formData.dispatch_qty} onChange={handleChange} style={input} />
              </div>
              <div>
                <label style={label}>Outward Rate</label>
                <input type="number" name="outward_rate" value={formData.outward_rate} onChange={handleChange} style={input} />
              </div>
              <div>
                <label style={label}>Shortage Free (KG)</label>
                <input
                  type="number"
                  name="shortage_free_kg"
                  value={formData.shortage_free_kg}
                  onChange={handleChange}
                  list="shortage-free-options"
                  min="0"
                  step="1"
                  style={input}
                />
                <datalist id="shortage-free-options">
                  <option value="50" />
                  <option value="100" />
                  <option value="150" />
                </datalist>
              </div>
              <div>
                <label style={label}>Transport Rate</label>
                <input
                  type="number"
                  name="transport_rate"
                  value={formData.transport_rate}
                  onChange={handleChange}
                  style={input}
                />
                <div style={{ marginTop: 6, fontSize: 12, color: "#64748b" }}>
                  Manual entry
                </div>
              </div>
              <div>
                <label style={label}>Gross Freight</label>
                <input
                  type="number"
                  value={calculation.grossFreight.toFixed(2)}
                  readOnly
                  style={{ ...input, background: "#f8fafc" }}
                />
              </div>
              <div>
                <label style={label}>Detain</label>
                <input type="number" name="detain_amount" value={formData.detain_amount} onChange={handleChange} style={input} />
              </div>
              <div>
                <label style={label}>Others Exp</label>
                <input type="number" name="others_exp" value={formData.others_exp} onChange={handleChange} style={input} />
              </div>
              <div>
                <label style={label}>Advance</label>
                <input type="number" name="advance_amount" value={formData.advance_amount} onChange={handleChange} style={input} />
              </div>
              <div>
                <label style={label}>TDS</label>
                <select name="tds_percent" value={formData.tds_percent} onChange={handleChange} style={input}>
                  <option value="0">0%</option>
                  <option value="1">1%</option>
                  <option value="2">2%</option>
                </select>
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={label}>Narration</label>
                <input name="narration" value={formData.narration} onChange={handleChange} style={input} />
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, marginBottom: 16 }}>
            <div style={card}><div>Shortage Weight</div><div style={{ fontSize: 24, fontWeight: 700 }}>{calculation.shortageQty.toFixed(2)}</div></div>
            <div style={card}><div>Shortage Amount</div><div style={{ fontSize: 24, fontWeight: 700 }}>{calculation.shortageAmount.toFixed(2)}</div></div>
            <div style={card}><div>Gross Freight</div><div style={{ fontSize: 24, fontWeight: 700 }}>{calculation.grossFreight.toFixed(2)}</div></div>
            <div style={card}><div>Net Amount</div><div style={{ fontSize: 24, fontWeight: 700 }}>{calculation.netAmount.toFixed(2)}</div></div>
            <div style={card}><div>TDS Amount</div><div style={{ fontSize: 24, fontWeight: 700 }}>{calculation.tdsAmount.toFixed(2)}</div></div>
            <div style={card}><div>Payable Amount</div><div style={{ fontSize: 24, fontWeight: 700 }}>{calculation.payableAmount.toFixed(2)}</div></div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button onClick={saveBilti} style={{ ...btn, background: "#16a34a" }}>
              Save Bilti
            </button>
            <button onClick={editBilti} style={{ ...btn, background: "#2563eb" }}>
              Edit Bilti
            </button>
            <button onClick={deleteBilti} style={{ ...btn, background: "#dc2626" }}>
              Delete
            </button>
            <button onClick={downloadPDF} style={{ ...btn, background: "#475569" }}>
              PDF
            </button>
          </div>
        </>
      )}
    </div>
  );
}
