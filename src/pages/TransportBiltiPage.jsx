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
    background: "#0f766e",
    textAlign: "left",
    color: "#ffffff",
    fontSize: 12,
  };

  const sourceTd = {
    padding: "8px 10px",
    borderBottom: "1px solid #e2e8f0",
    color: "#000000",
    fontSize: 12,
  };

  const num = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  const numberToWords = (value) => {
    const number = Number(value);
    if (!Number.isFinite(number)) return "Zero";
    const absolute = Math.abs(number);
    const integerPart = Math.floor(absolute);
    const fractionalPart = Math.round((absolute - integerPart) * 100);

    const wordsForNumber = (num) => {
      const units = [
        "Zero",
        "One",
        "Two",
        "Three",
        "Four",
        "Five",
        "Six",
        "Seven",
        "Eight",
        "Nine",
        "Ten",
        "Eleven",
        "Twelve",
        "Thirteen",
        "Fourteen",
        "Fifteen",
        "Sixteen",
        "Seventeen",
        "Eighteen",
        "Nineteen",
      ];
      const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

      if (num < 20) return units[num];
      if (num < 100) {
        const tensName = tens[Math.floor(num / 10)];
        const unitName = num % 10 ? ` ${units[num % 10]}` : "";
        return `${tensName}${unitName}`;
      }
      if (num < 1000) {
        const hundreds = Math.floor(num / 100);
        const remainder = num % 100;
        return `${units[hundreds]} Hundred${remainder ? ` ${wordsForNumber(remainder)}` : ""}`;
      }
      const scales = ["Thousand", "Million", "Billion"];
      let scaleIndex = -1;
      let remainder = num;
      let result = "";

      while (remainder > 0) {
        const chunk = remainder % 1000;
        remainder = Math.floor(remainder / 1000);
        scaleIndex += 1;
        if (chunk) {
          const chunkText = wordsForNumber(chunk);
          result = `${chunkText} ${scales[scaleIndex]}${result ? ` ${result}` : ""}`.trim();
        }
      }
      return result;
    };

    const integerWords = integerPart === 0 ? "Zero" : wordsForNumber(integerPart);
    const fractionalWords = fractionalPart ? ` and ${fractionalPart}/100` : "";
    const sign = number < 0 ? "Minus " : "";
    return `${sign}${integerWords}${fractionalWords} only`;
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
    const selectedCompany = companies.find((c) => String(c.id) === String(formData.company_id)) || null;
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
  }, [companyAccounts, companies, formData.company_account_id, formData.account_name, formData.company_id]);

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
        next.account_name = "";
        const matchingAccounts = companyAccounts.filter(
          (a) =>
            String(a.company_id) === String(value) ||
            String(a.company_name || "").trim().toLowerCase() === String(company?.name || "").trim().toLowerCase()
        );
        next.company_account_id = matchingAccounts[0]?.id ? String(matchingAccounts[0].id) : "";
        next.account_name = matchingAccounts[0]?.account_name || "";
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
  const margin = 12;
  const leftX = margin;
  const rightX = pageWidth - margin;
  const contentWidth = pageWidth - margin * 2;

  const voucherNo = formData.voucher_no || meta?.outward_voucher_no || meta?.voucher_no || "-";
  const billNo = meta?.bilti_no || (formData.id ? `BLT-${formData.id}` : "DRAFT");
  const lrDate = formatDate(formData.dispatch_date || formData.outward_date);
  const transporterName = selectedTransporter?.name || "Transport Copy";
  const consigneeName = formData.consignee_name || "-";
  const consignorName = selectedAccount?.account_name || formData.account_name || "-";

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
  const shortageQty = calculation.shortageQty;
  const money = (v) => Number(v || 0).toFixed(2);
  const deductionTotal = Math.max(0, shortage + detain + others);
  const shortageDetail = `${money(outwardWeight)} - ${money(dispatchWeight)} = ${money(Math.max(outwardWeight - dispatchWeight, 0))}`;

  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pageWidth, pageHeight, "F");

  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.5);
  doc.roundedRect(4, 4, pageWidth - 8, pageHeight - 8, 4, 4, "S");

  const headerHeight = 26;
  doc.setFillColor(3, 105, 103);
  doc.roundedRect(leftX, margin, contentWidth, headerHeight, 4, 4, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.text("TRANSPORT PAYMENT ADVICE", leftX + 10, margin + 16);

  const topBlockY = margin + headerHeight + 8;
  const topBlockHeight = 24;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(leftX, topBlockY, contentWidth, topBlockHeight, 4, 4, "FD");

  const summaryFields = [
    ["LR Date", lrDate || "-"],
    ["Voucher No", voucherNo],
    ["Transport", transporterName],
    ["Consignee", consigneeName],
    ["Buyer", formData.buyer_name || "-"],
    ["Warehouse", formData.warehouse_name || "-"],
    ["Destination", formData.destination || "-"],
    ["Vehicle", formData.lorry_no || "-"],
    ["Product", formData.product_name || "-"],
    ["Days", formData.days || "0"],
  ];

  const cols = 5;
  const colWidth = contentWidth / cols;
  summaryFields.forEach((field, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    const x = leftX + col * colWidth;
    const y = topBlockY + 5 + row * 10;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(15, 23, 42);
    doc.text(field[0], x + 3, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    doc.text(String(field[1]), x + 3, y + 4);
    if (col < cols - 1) {
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.2);
      doc.line(x + colWidth, topBlockY + 4, x + colWidth, topBlockY + topBlockHeight - 4);
    }
  });

  const tableY = topBlockY + topBlockHeight + 10;
  autoTable(doc, {
    startY: tableY,
    margin: { left: leftX, right: leftX },
    theme: "grid",
    tableLineWidth: 0.22,
    tableLineColor: [148, 163, 184],
    styles: {
      fontSize: 7.8,
      cellPadding: 3.5,
      lineWidth: 0.22,
      lineColor: [203, 213, 225],
      textColor: [15, 23, 42],
      fillColor: [255, 255, 255],
    },
    headStyles: {
      fillColor: [3, 105, 103],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      halign: "center",
    },
    bodyStyles: {
      fillColor: [255, 255, 255],
      textColor: [15, 23, 42],
      minCellHeight: 10,
    },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    columnStyles: {
      2: { halign: "left" },
      3: { halign: "left" },
      4: { halign: "center" },
      5: { halign: "center" },
      6: { halign: "right" },
      7: { halign: "right" },
      8: { halign: "right" },
      9: { halign: "right" },
    },
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

  const sectionY = doc.lastAutoTable.finalY + 10;
  const sectionWidth = (contentWidth - 10) / 2;
  const sectionHeight = 78;

  doc.setDrawColor(203, 213, 225);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(leftX, sectionY, sectionWidth, sectionHeight, 4, 4, "FD");
  doc.roundedRect(leftX + sectionWidth + 10, sectionY, sectionWidth, sectionHeight, 4, 4, "FD");

  doc.setFillColor(3, 105, 103);
  doc.roundedRect(leftX, sectionY, sectionWidth, 12, 4, 4, "F");
  doc.roundedRect(leftX + sectionWidth + 10, sectionY, sectionWidth, 12, 4, 4, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text("DEDUCTION DETAILS", leftX + 5, sectionY + 8);
  doc.text("PAYMENT DETAILS", leftX + sectionWidth + 15, sectionY + 8);

  const leftCol1 = leftX + 5;
  const leftCol2 = leftX + sectionWidth * 0.45;
  const leftCol3 = leftX + sectionWidth - 4;
  let rowY = sectionY + 18;

  const leftRows = [
    ["Shortage Qty", shortageDetail, money(shortage)],
    ["Free KG", formData.shortage_free_kg || "-", ""],
    ["Claim Amt", "", money(shortage)],
    ["Detain Charges", "", money(detain)],
    ["Other Charges", "", money(others)],
  ];

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  leftRows.forEach((row) => {
    doc.text(row[0], leftCol1, rowY);
    doc.text(row[1], leftCol2, rowY);
    doc.text(row[2], leftCol3, rowY, { align: "right" });
    rowY += 7.5;
  });

  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.2);
  doc.line(leftX + 5, sectionY + sectionHeight - 20, leftX + sectionWidth - 5, sectionY + sectionHeight - 20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text("Total Deductions", leftCol1, sectionY + sectionHeight - 8);
  doc.text(money(deductionTotal), leftCol3, sectionY + sectionHeight - 8, { align: "right" });

  const rightCol1 = leftX + sectionWidth + 15;
  const rightCol2 = leftX + sectionWidth * 2 + 6;
  rowY = sectionY + 18;

  const rightRows = [
    ["Gross Freight", money(gross)],
    ["Less: Total Deductions", money(deductionTotal)],
    ["Net Freight", money(netAmount)],
    ["TDS Amount", money(tds)],
    ["Advance Paid", money(advance)],
  ];

  rightRows.forEach((row) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    doc.text(row[0], rightCol1, rowY);
    doc.text(row[1], rightCol2, rowY, { align: "right" });
    rowY += 7.5;
  });

  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.line(leftX + sectionWidth + 10, sectionY + sectionHeight - 20, leftX + sectionWidth * 2 + 10, sectionY + sectionHeight - 20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text("Net Payable", rightCol1, sectionY + sectionHeight - 10);

  const payableBoxWidth = 34;
  const payableBoxHeight = 10;
  const payableBoxX = rightCol2 - payableBoxWidth;
  const payableBoxY = sectionY + sectionHeight - 14.5;
  doc.setFillColor(188, 239, 188);
  doc.setDrawColor(188, 239, 188);
  doc.setLineWidth(0.4);
  doc.roundedRect(payableBoxX, payableBoxY, payableBoxWidth, payableBoxHeight, 2, 2, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(money(payable), rightCol2 - 2, sectionY + sectionHeight - 7, { align: "right" });

  const amountInWords = `Indian Rupees ${numberToWords(payable)}`;
  const footerY = sectionY + sectionHeight + 8;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text(`Amount in words: ${amountInWords}`, leftX, footerY);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("Authorized By:", rightX - 2, footerY, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text("This is a system generated document.", leftX, footerY + 8);

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
                        .filter((a) => {
                          if (!formData.company_id) return false;
                          const company = companies.find((c) => String(c.id) === String(formData.company_id));
                          return (
                            String(a.company_id) === String(formData.company_id) ||
                            String(a.company_name || "").trim().toLowerCase() === String(company?.name || "").trim().toLowerCase()
                          );
                        })
                        .map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.account_name}
                            {a.company_name ? ` - ${a.company_name}` : ""}
                          </option>
                        ))}
                      {formData.company_id &&
                        companyAccounts.filter((a) => {
                          const company = companies.find((c) => String(c.id) === String(formData.company_id));
                          return (
                            String(a.company_id) === String(formData.company_id) ||
                            String(a.company_name || "").trim().toLowerCase() === String(company?.name || "").trim().toLowerCase()
                          );
                        }).length === 0 && <option value="" disabled>No account found</option>}
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
