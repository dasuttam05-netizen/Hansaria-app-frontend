import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { FaSave, FaEdit, FaTrash, FaWhatsapp, FaTimes, FaFilePdf } from "react-icons/fa";
import { consigneeHasBuyer } from "../utils/consigneeBuyers";

export default function TransportBiltiPage() {
  const API_BASE = "/api";
  const KG_PER_MT = 1000;

  const [mode, setMode] = useState("outward");
  const [outwardList, setOutwardList] = useState([]);
  const [transporters, setTransporters] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [companyAccounts, setCompanyAccounts] = useState([]);
  const [buyers, setBuyers] = useState([]);
  const [consignees, setConsignees] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [selectedOutwardId, setSelectedOutwardId] = useState("");
  const [selectedSaleId, setSelectedSaleId] = useState("");
  const [sourceSearch, setSourceSearch] = useState("");
  const [sourceLoaded, setSourceLoaded] = useState({ outward: false, sale: false, saleCompleted: false });
  const [pendingSaleSourceList, setPendingSaleSourceList] = useState([]);
  const [completedSaleSourceList, setCompletedSaleSourceList] = useState([]);
  const [showCompletedSaleOnly, setShowCompletedSaleOnly] = useState(false);
  const [meta, setMeta] = useState(null);
  const [transportNameDisplay, setTransportNameDisplay] = useState("");

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
    advance_date: "",
    advance_amount: "",
    tds_percent: "0",
    round_off: "0",
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

  const getRecordId = (record) => record?._id || record?.id || "";
  const sameId = (left, right) => String(left ?? "") === String(right ?? "");

  // Transport Bilti must keep rendering even when an API returns an
  // object/error payload instead of the expected array.
  const asArray = (value) => {
    if (Array.isArray(value)) return value;
    if (Array.isArray(value?.data)) return value.data;
    if (Array.isArray(value?.rows)) return value.rows;
    if (Array.isArray(value?.items)) return value.items;
    return [];
  };

  const numberToWords = (value) => {
    const number = Number(value);
    if (!Number.isFinite(number)) return "Zero";

    // Use the same 2-decimal amount shown on the transport bill.
    // This prevents floating-point values such as 12410.9999999
    // from becoming "100/100" in the words.
    const roundedAmount = Math.round((Math.abs(number) + Number.EPSILON) * 100) / 100;
    const totalPaise = Math.round(roundedAmount * 100);
    const integerPart = Math.floor(totalPaise / 100);
    const fractionalPart = totalPaise % 100;

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
      // Indian numbering system: Thousand, Lakh, Crore.
      const parts = [];
      let remainder = Math.floor(num);
      const crore = Math.floor(remainder / 10000000);
      remainder %= 10000000;
      const lakh = Math.floor(remainder / 100000);
      remainder %= 100000;
      const thousand = Math.floor(remainder / 1000);
      remainder %= 1000;

      if (crore) parts.push(`${wordsForNumber(crore)} Crore`);
      if (lakh) parts.push(`${wordsForNumber(lakh)} Lakh`);
      if (thousand) parts.push(`${wordsForNumber(thousand)} Thousand`);
      if (remainder) parts.push(wordsForNumber(remainder));
      return parts.join(" ").trim();
    };

    const integerWords = integerPart === 0 ? "Zero" : wordsForNumber(integerPart);
    const fractionalWords = fractionalPart ? ` and ${fractionalPart}/100` : "";
    const sign = number < 0 ? "Minus " : "";
    return `${sign}${integerWords}${fractionalWords} only`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return String(dateStr);
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

  const loadStaticMasterData = async () => {
    const [
      transportRes,
      companyRes,
      accountRes,
      buyerRes,
      consigneeRes,
      warehouseRes,
    ] = await Promise.all([
      axios.get(`${API_BASE}/transporters`),
      axios.get(`${API_BASE}/companies`),
      axios.get(`${API_BASE}/company-accounts`),
      axios.get(`${API_BASE}/buyer-names`),
      axios.get(`${API_BASE}/consignee-names`),
      axios.get(`${API_BASE}/warehouses`),
    ]);

    setTransporters(asArray(transportRes.data));
    setCompanies(asArray(companyRes.data));
    setCompanyAccounts(asArray(accountRes.data));
    setBuyers(asArray(buyerRes.data));
    setConsignees(asArray(consigneeRes.data));
    setWarehouses(asArray(warehouseRes.data));
  };

  const loadSourceList = async (sourceMode, force = false, completedOverride = null, includeSavedOverride = false) => {
    if (sourceMode !== "outward" && sourceMode !== "sale") return;
    const completed = completedOverride === null ? showCompletedSaleOnly : Boolean(completedOverride);
    const includeSaved = sourceMode === "sale" && (includeSavedOverride || completed);
    const loadedKey = sourceMode === "sale" && completed ? "saleCompleted" : sourceMode;
    if (!force && sourceLoaded[loadedKey]) return;

    const endpoint = sourceMode === "outward"
      ? `${API_BASE}/transport-bilti/outward-list`
      : `${API_BASE}/transport-bilti/sale-list`;

    const res = await axios.get(
      endpoint,
      sourceMode === "sale"
        ? { params: { completed: completed ? "1" : "0", include_bilti: includeSaved ? "1" : "0" } }
        : undefined
    );
    const rows = asArray(res.data);
    if (sourceMode === "outward") {
      setOutwardList(rows);
    } else if (completed) {
      setCompletedSaleSourceList(rows);
    } else {
      setPendingSaleSourceList(rows);
    }
    setSourceLoaded((prev) => ({ ...prev, [loadedKey]: true }));
  };

  const refreshCurrentSource = async () => {
    if (mode === "outward" || mode === "sale") {
      try {
        await loadSourceList(mode, true, mode === "sale" ? showCompletedSaleOnly : null, mode === "sale" && showCompletedSaleOnly);
      } catch (err) {
        console.error(err);
        alert("Transport source refresh failed");
      }
    }
  };

  useEffect(() => {
    Promise.all([
      loadStaticMasterData(),
      loadSourceList("outward"),
    ]).catch((err) => {
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

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "F5") {
        event.preventDefault();
        refreshCurrentSource();
      }
      if (event.key === "F6") {
        event.preventDefault();
        loadCompletedWarehouseSales(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mode]);

  const resetForm = () => {
    setMeta(null);
    setTransportNameDisplay("");
    setSelectedOutwardId("");
    setSelectedSaleId("");
    setSourceSearch("");
    setFormData(emptyForm);
  };

  const clearSelection = () => {
    setMeta(null);
    setTransportNameDisplay("");
    setSelectedOutwardId("");
    setSelectedSaleId("");
    setFormData(emptyForm);
  };

  const closeEditorPopup = () => {
    setMeta(null);
    setShowTransportForm(false);
    setTransportNameDisplay("");
    setFormData(emptyForm);
    setSelectedOutwardId("");
    setSelectedSaleId("");
  };

  const returnAfterEditorSave = async () => {
    const params = new URLSearchParams(window.location.search);
    const isReportEdit = Boolean(params.get("edit"));

    // Return immediately; refresh the source list in the background so the
    // editor does not remain open while waiting for master/source requests.
    if (isReportEdit) {
      window.history.back();
    } else {
      closeEditorPopup();
    }

    try {
      if (mode === "outward" || mode === "sale") {
        await loadSourceList(
          mode,
          true,
          mode === "sale" ? showCompletedSaleOnly : null,
          mode === "sale" && showCompletedSaleOnly
        );
      }
    } catch (err) {
      console.warn("Transport source refresh after save failed", err);
    }
  };

  const switchMode = async (nextMode) => {
    setMode(nextMode);
    resetForm();
    if (nextMode === "sale") {
      setShowCompletedSaleOnly(false);
    }
    if (nextMode === "outward" || nextMode === "sale") {
      try {
        await loadSourceList(nextMode, false, nextMode === "sale" ? false : null);
      } catch (err) {
        console.error(err);
        alert("Transport source load failed");
      }
    }
  };

  const loadCompletedWarehouseSales = async (force = true) => {
    setMode("sale");
    resetForm();
    setShowCompletedSaleOnly(true);
    try {
      await loadSourceList("sale", force, true, true);
    } catch (err) {
      console.error(err);
      alert("Completed Warehouse Sale load failed");
    }
  };

  const loadBilti = async (id, source = "", seedRow = null) => {
    if (!id) return;

    try {
      let row = seedRow ? { ...seedRow } : {};

      if (source === "sale" && !seedRow) {
        try {
          const [biltiRes, saleRes] = await Promise.all([
            axios.get(`${API_BASE}/transport-bilti/${id}`, { params: { source } }),
            axios.get(`${API_BASE.replace(/\/$/, "")}/wh-vouchers/sale/${id}/summary`),
          ]);
          row = {
            ...(saleRes.data?.sale || saleRes.data || {}),
            ...(biltiRes.data || {}),
          };
        } catch (saleErr) {
          console.warn("Sale detail lookup unavailable; using Transport Bilti data", saleErr);
          const biltiRes = await axios.get(`${API_BASE}/transport-bilti/${id}`, { params: { source } });
          row = biltiRes.data || {};
        }
      } else {
        const res = await axios.get(`${API_BASE}/transport-bilti/${id}`, {
          params: source ? { source } : undefined,
        });
        row = res.data || {};
      }
      setMeta(row);

      const loadedTransporter = row.transporter_id
        ? transporters.find((item) => sameId(getRecordId(item), row.transporter_id))
        : null;
      setTransportNameDisplay(
        row.transporter_name ||
          row.transport_name ||
          loadedTransporter?.name ||
          ""
      );

      if (row.transporter_id) {
        setTransporters((prev) => {
          const exists = prev.some((item) => sameId(getRecordId(item), row.transporter_id));
          if (exists || !row.transporter_name) return prev;
          return [
            {
              id: row.transporter_id,
              _id: row.transporter_id,
              name: row.transporter_name,
              address: row.transporter_address || "",
              pan_no: row.transporter_pan_no || "",
              mobile: row.transporter_mobile || "",
            },
            ...prev,
          ];
        });
      }

      const sourceDate =
        row.outward_entry_date ||
        row.sale_entry_date ||
        row.outward_date ||
        row.date;
      // For a NEW Bilti created from Outward / Warehouse Sale, keep the
      // source/loading/outward quantity only. Dispatch Qty must start at 0
      // and remain manually editable by the user. Never replace the source
      // quantity with unloading/delivery quantity here.
      const isNewSourceBilti = Boolean(seedRow && !seedRow.bilti_id);
      const sourceQty =
        source === "sale"
          ? (row.sale_quantity ?? row.quantity ?? row.sale_unloading_qty ?? row.unloading_qty)
          : (row.outward_quantity ?? row.outward_weight ?? row.quantity ?? row.weight);
      const sourceDispatchQty =
        source === "sale"
          ? (row.sale_unloading_qty ?? row.unloading_qty ?? sourceQty)
          : (row.outward_qty ?? row.quantity ?? row.weight ?? sourceQty);
      const sourceRate = row.outward_master_rate || row.sale_master_rate;
      // Dispatch Date is the unloading date for Warehouse Sale; for Outward
      // use an unloading date when the source provides one, otherwise keep
      // the source/entry date.
      const dispatchDate =
        row.dispatch_date ||
        row.unloading_date ||
        row.sale_unloading_date ||
        sourceDate ||
        "";

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
        // New Bilti: source/loading quantity only; dispatch quantity starts at 0.
        // Existing Bilti edit: preserve the saved dispatch quantity exactly.
        outward_qty: row.outward_qty ?? num(sourceQty),
        dispatch_qty: isNewSourceBilti ? 0 : (row.dispatch_qty ?? num(sourceDispatchQty)),
        shortage_free_kg: String(row.shortage_free_kg ?? 100),
        outward_rate: row.outward_rate ?? num(sourceRate),
        transport_rate: row.transport_rate ?? "",
        detain_amount: row.detain_amount ?? "",
        others_exp: row.others_exp ?? "",
        advance_date: row.advance_date || row.adv_date || "",
        advance_amount: row.advance_amount ?? "",
        tds_percent: String(row.tds_percent ?? "0"),
        round_off: String(row.round_off ?? "0"),
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
    () => {
      const found = transporters.find((t) => String(t.id) === String(formData.transporter_id));
      if (found) return found;
      if (transportNameDisplay || meta?.transporter_name || meta?.transport_name) {
        return {
          id: formData.transporter_id,
          _id: formData.transporter_id,
          name: transportNameDisplay || meta?.transporter_name || meta?.transport_name || "",
          address: meta?.transporter_address || "",
          pan_no: meta?.transporter_pan_no || meta?.pan_no || "",
          gst_no: meta?.transporter_gst_no || meta?.gst_no || "",
          aadhar_no: meta?.transporter_aadhar_no || meta?.aadhar_no || "",
          mobile: meta?.transporter_mobile || meta?.mobile || "",
        };
      }
      return null;
    },
    [transporters, formData.transporter_id, transportNameDisplay]
  );

  const selectedAccount = useMemo(() => {
    const selectedCompany = companies.find((c) => sameId(getRecordId(c), formData.company_id)) || null;
    if (formData.company_account_id) {
      return (
        companyAccounts.find((a) => sameId(getRecordId(a), formData.company_account_id)) || null
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
    const sourceRows = showCompletedSaleOnly ? completedSaleSourceList : pendingSaleSourceList;
    return sourceRows.filter((row) => {
      const completed = Boolean(row.unloading_date && String(row.unloading_date).trim());
      if (!showCompletedSaleOnly) {
        // Pending Warehouse Sale must never show a completed unloading row,
        // even if an older cached response is still in memory.
        if (completed || row.bilti_id) return false;
      }
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
  }, [pendingSaleSourceList, completedSaleSourceList, showCompletedSaleOnly, sourceSearch]);

  const calculation = useMemo(() => {
    const outwardQty = num(formData.outward_qty);
    const dispatchQty = num(formData.dispatch_qty);
    const outwardRate = num(formData.outward_rate);
    const transportRate = num(formData.transport_rate);
    const detain = num(formData.detain_amount);
    const others = num(formData.others_exp);
    const advance = num(formData.advance_amount);
    const tdsPercent = num(formData.tds_percent);
    const roundOff = num(formData.round_off);

    const shortageQty = Math.max(outwardQty - dispatchQty, 0);
    const claimFreeQtyInMt = num(formData.shortage_free_kg) / KG_PER_MT;
    const chargeableShortageQty = Math.max(shortageQty - claimFreeQtyInMt, 0);
    const shortageAmount = chargeableShortageQty * outwardRate;
    const grossFreight = outwardQty * transportRate;
    const netAmount = grossFreight - shortageAmount + detain + others;
    const tdsAmount = netAmount * (tdsPercent / 100);
    const payableAmount = netAmount - advance - tdsAmount + roundOff;

    return {
      shortageQty,
      shortageAmount,
      grossFreight,
      netAmount,
      tdsAmount,
      roundOff,
      payableAmount,
    };
  }, [formData]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "transporter_id") {
      const transporter = transporters.find((item) => sameId(getRecordId(item), value));
      setTransportNameDisplay(transporter?.name || "");
    }

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
        const company = companies.find((c) => sameId(getRecordId(c), value));
        next.company_name = company?.name || "";
        next.company_id = getRecordId(company) || value;
        next.account_name = "";
        const matchingAccounts = companyAccounts.filter((a) => {
          const accountCompanyId = getRecordId({ _id: a.company_id, id: a.company_id });
          return (
            sameId(accountCompanyId, value) ||
            String(a.company_name || "").trim().toLowerCase() === String(company?.name || "").trim().toLowerCase()
          );
        });
        next.company_account_id = matchingAccounts[0] ? String(getRecordId(matchingAccounts[0])) : "";
        next.account_name = matchingAccounts[0]?.account_name || "";
      }

      if (mode === "manual" && name === "company_account_id") {
        const acc = companyAccounts.find((a) => sameId(getRecordId(a), value));
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
      const saved = res.data?.transporter || {
        id: res.data?.id,
        _id: res.data?._id,
        name: transportForm.name.trim(),
        address: transportForm.address || "",
        pan_no: transportForm.pan_no || "",
        gst_no: transportForm.gst_no || "",
        aadhar_no: transportForm.aadhar_no || "",
        mobile: transportForm.mobile || "",
      };
      setTransporters((prev) => [saved, ...prev.filter((item) => !sameId(getRecordId(item), saved.id || saved._id))]);
      setTransportNameDisplay(saved.name || transportForm.name.trim());
      setFormData((prev) => ({ ...prev, transporter_id: String(saved.id || saved._id || "") }));
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

    try {
      const res = await axios.post(`${API_BASE}/transport-bilti/save`, {
        ...formData,
        shortage_qty: calculation.shortageQty,
        shortage_amount: calculation.shortageAmount,
        gross_freight: calculation.grossFreight,
        net_amount: calculation.netAmount,
        tds_amount: calculation.tdsAmount,
        round_off: calculation.roundOff,
        payable_amount: calculation.payableAmount,
        outward_id: mode === "outward" ? selectedOutwardId : null,
        sale_id: mode === "sale" ? selectedSaleId : null,
      });
      await loadStaticMasterData();
      await returnAfterEditorSave();
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
        shortage_qty: calculation.shortageQty,
        shortage_amount: calculation.shortageAmount,
        gross_freight: calculation.grossFreight,
        net_amount: calculation.netAmount,
        tds_amount: calculation.tdsAmount,
        round_off: calculation.roundOff,
        payable_amount: calculation.payableAmount,
        outward_id: mode === "outward" ? selectedOutwardId : null,
        sale_id: mode === "sale" ? selectedSaleId : null,
      });
      await loadStaticMasterData();
      await returnAfterEditorSave();
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

const buildTransportPdf = () => {
  const doc = new jsPDF("l", "mm", "a4");
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 8;
  const leftX = margin;
  const rightX = pageWidth - margin;
  const contentWidth = pageWidth - margin * 2;

  const voucherNo = formData.voucher_no || meta?.outward_voucher_no || meta?.sale_voucher_no || meta?.voucher_no || "-";
  const billNo = meta?.bilti_no || formData.bilti_no || (formData.id ? `BLT-${formData.id}` : "DRAFT");
  const lrDate = formatDate(formData.dispatch_date || formData.outward_date || meta?.dispatch_date || meta?.outward_date);
  const advDate = formatDate(formData.advance_date || meta?.advance_date || meta?.adv_date || "");
  const transporterName = selectedTransporter?.name || formData.transporter_name || meta?.transporter_name || meta?.transport_name || "Transport Copy";
  const consigneeName = formData.consignee_name || meta?.consignee_name || "-";
  const consignorName = selectedAccount?.account_name || formData.account_name || meta?.account_name || meta?.company_name || "-";

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
  const money = (v) => Number(v || 0).toFixed(2);
  const claimAmount = Math.max(0, shortage);
  const netFreight = Math.max(0, gross - claimAmount + detain + others);
  const shortageQty = Math.max(outwardWeight - dispatchWeight, 0);
  const shortageDetail = `${money(outwardWeight)} - ${money(dispatchWeight)} = ${money(shortageQty)}`;
  const deductionAmount = advance;

  const safeText = (value) => String(value ?? "-");
  const wrap = (value, width, maxLines = 3) => {
    const lines = doc.splitTextToSize(safeText(value), Math.max(width, 10));
    return lines.slice(0, maxLines);
  };

  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pageWidth, pageHeight, "F");
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.45);
  doc.roundedRect(4, 4, pageWidth - 8, pageHeight - 8, 3, 3, "S");

  // Compact header
  const headerY = margin;
  const headerH = 13.5;
  doc.setFillColor(15, 118, 110);
  doc.roundedRect(leftX, headerY, contentWidth, headerH, 3, 3, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12.5);
  doc.setTextColor(255, 255, 255);
  doc.text("TRANSPORT PAYMENT ADVICE", pageWidth / 2, headerY + 8.7, { align: "center" });

  // General / party details
  const summaryY = headerY + headerH + 4;
  const summaryH = 42;
  const summaryCols = 4;
  const summaryColW = contentWidth / summaryCols;
  const summaryFields = [
    ["LR Date", lrDate || "-"],
    ["Voucher No", voucherNo],
    ["Transport", transporterName],
    ["Consignee", consigneeName],
    ["Buyer", formData.buyer_name || meta?.buyer_name || meta?.sale_buyer_name || "-"],
    ["Warehouse", formData.warehouse_name || meta?.warehouse_name || meta?.sale_warehouse_name || "-"],
    ["Destination", formData.destination || "-"],
    ["Vehicle", formData.lorry_no || meta?.lorry_no || meta?.sale_lorry_no || "-"],
    ["Product", formData.product_name || meta?.product_name || meta?.sale_product_name || "-"],
    ["ADV Date", advDate || "-"],
    ["Bilti No", billNo],
    ["Days", formData.days || "0"],
  ];

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(leftX, summaryY, contentWidth, summaryH, 3, 3, "FD");

  summaryFields.forEach((field, index) => {
    const col = index % summaryCols;
    const row = Math.floor(index / summaryCols);
    const x = leftX + col * summaryColW;
    const y = summaryY + 7 + row * 12.7;
    const innerW = summaryColW - 8;

    if (col > 0) {
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.2);
      doc.line(x, summaryY + 2, x, summaryY + summaryH - 2);
    }
    if (row > 0) {
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.2);
      doc.line(x + 3, y - 9, x + summaryColW - 3, y - 9);
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.2);
    doc.setTextColor(71, 85, 105);
    doc.text(field[0], x + 3, y);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.35);
    doc.setTextColor(15, 23, 42);
    const lines = wrap(field[1], innerW, 3);
    lines.forEach((line, lineIndex) => doc.text(line, x + 3, y + 3.7 + lineIndex * 3.1));
  });

  // Main transport table
  const tableY = summaryY + summaryH + 4;
  autoTable(doc, {
    startY: tableY,
    margin: { left: leftX, right: leftX },
    theme: "grid",
    tableWidth: contentWidth,
    styles: {
      font: "helvetica",
      fontSize: 6.4,
      cellPadding: 2.0,
      lineWidth: 0.18,
      lineColor: [203, 213, 225],
      textColor: [15, 23, 42],
      valign: "middle",
      overflow: "linebreak",
    },
    headStyles: {
      fillColor: [15, 118, 110],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      halign: "center",
      valign: "middle",
      minCellHeight: 9,
    },
    bodyStyles: {
      fillColor: [255, 255, 255],
      minCellHeight: 11,
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 16, halign: "center" },
      1: { cellWidth: 22, halign: "center" },
      2: { cellWidth: 39, halign: "left" },
      3: { cellWidth: 41, halign: "left" },
      4: { cellWidth: 21, halign: "center" },
      5: { cellWidth: 18, halign: "center" },
      6: { cellWidth: 22, halign: "right" },
      7: { cellWidth: 22, halign: "right" },
      8: { cellWidth: 19, halign: "right" },
      9: { cellWidth: 52, halign: "right" },
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
      safeText(billNo),
      safeText(voucherNo),
      safeText(consignorName),
      safeText(consigneeName),
      safeText(formData.lorry_no || meta?.lorry_no || meta?.sale_lorry_no || "-"),
      safeText(formData.product_name || meta?.product_name || meta?.sale_product_name || "-"),
      money(outwardWeight),
      money(dispatchWeight),
      money(rate),
      money(gross),
    ]],
  });

  // Financial sections: deductions left, payment right.
  const sectionY = doc.lastAutoTable.finalY + 4;
  const sectionGap = 6;
  const sectionWidth = (contentWidth - sectionGap) / 2;
  const sectionHeight = 69;
  const rightSectionX = leftX + sectionWidth + sectionGap;

  const drawSection = (x, title) => {
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);
    doc.roundedRect(x, sectionY, sectionWidth, sectionHeight, 3, 3, "FD");
    doc.setFillColor(15, 118, 110);
    doc.roundedRect(x, sectionY, sectionWidth, 9, 3, 3, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.8);
    doc.setTextColor(255, 255, 255);
    doc.text(title, x + 5, sectionY + 6.2);
  };

  drawSection(leftX, "DEDUCTION DETAILS");
  drawSection(rightSectionX, "PAYMENT DETAILS");

  const rowStart = sectionY + 16;
  const rowStep = 7.0;
  const leftLabelX = leftX + 5;
  const leftValueX = leftX + sectionWidth - 5;
  const leftRows = [
    ["Shortage Qty", shortageDetail],
    ["Free KG", money(formData.shortage_free_kg || 0)],
    ["Claim Amount", money(claimAmount)],
    ["Detain Charges", money(detain)],
    ["Other Charges", money(others)],
    ["Deduction Amount", money(deductionAmount)],
  ];

  leftRows.forEach((row, index) => {
    const y = rowStart + index * rowStep;
    const bold = row[0] === "Deduction Amount";
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(6.9);
    doc.setTextColor(15, 23, 42);
    doc.text(row[0], leftLabelX, y);
    doc.text(safeText(row[1]), leftValueX, y, { align: "right" });
  });

  const rightLabelX = rightSectionX + 5;
  const rightValueX = rightSectionX + sectionWidth - 5;
  const rightRows = [
    ["Gross Freight", money(gross)],
    ["Less: Claim Amount", money(claimAmount)],
    ["Add: Detain Charges", money(detain)],
    ["Add: Other Charges", money(others)],
    ["Net Freight", money(netFreight)],
    ["TDS Amount", money(tds)],
    ["Round Off", money(calculation.roundOff)],
  ];

  rightRows.forEach((row, index) => {
    const y = rowStart + index * rowStep;
    const bold = row[0] === "Net Freight";
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(6.9);
    doc.setTextColor(15, 23, 42);
    doc.text(row[0], rightLabelX, y);
    doc.text(safeText(row[1]), rightValueX, y, { align: "right" });
  });

  const dividerY = sectionY + sectionHeight - 17;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.35);
  doc.line(rightSectionX + 5, dividerY, rightSectionX + sectionWidth - 5, dividerY);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.2);
  doc.setTextColor(15, 23, 42);
  doc.text("Net Payable", rightLabelX, dividerY + 8);

  const payableBoxWidth = 42;
  const payableBoxHeight = 9;
  const payableBoxX = rightValueX - payableBoxWidth;
  const payableBoxY = dividerY + 1;
  doc.setFillColor(220, 252, 231);
  doc.setDrawColor(134, 239, 172);
  doc.roundedRect(payableBoxX, payableBoxY, payableBoxWidth, payableBoxHeight, 2, 2, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(22, 101, 52);
  doc.text(money(payable), rightValueX - 3, payableBoxY + 6.2, { align: "right" });

  // Footer: leave more room for the amount-in-words line and signature.
  const footerY = sectionY + sectionHeight + 8;
  const amountInWords = `Indian Rupees ${numberToWords(payable)}`;
  const wordsMaxWidth = contentWidth - 70;
  const wordsLines = wrap(amountInWords, wordsMaxWidth, 2);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.0);
  doc.setTextColor(15, 23, 42);
  doc.text("Amount in words:", leftX, footerY);
  doc.setFont("helvetica", "normal");
  wordsLines.forEach((line, index) => {
    doc.text(line, leftX + 27, footerY + index * 3.8);
  });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.0);
  doc.text("Authorized By:", rightX, footerY, { align: "right" });

  return doc;
};

const downloadPDF = () => {
  const voucherNo = formData.voucher_no || meta?.outward_voucher_no || meta?.voucher_no || "-";
  const billNo = meta?.bilti_no || (formData.id ? `BLT-${formData.id}` : "DRAFT");
  const doc = buildTransportPdf();
  doc.save(`Transport_Payment_Advice_${voucherNo !== "-" ? voucherNo : billNo}.pdf`);
};

const shareToWhatsApp = async () => {
  const voucherNo = formData.voucher_no || meta?.outward_voucher_no || meta?.voucher_no || "-";
  const billNo = meta?.bilti_no || (formData.id ? `BLT-${formData.id}` : "DRAFT");
  const payable = calculation.payableAmount;
  const pdfName = `Transport_Payment_Advice_${voucherNo !== "-" ? voucherNo : billNo}.pdf`;
  const doc = buildTransportPdf();
  const pdfBlob = doc.output("blob");
  const pdfFile = new File([pdfBlob], pdfName, { type: "application/pdf" });
  const textMessage = `Transport Payment Advice\nBill No: ${billNo}\nVoucher: ${voucherNo}\nPayable Amount: ${Number(payable || 0).toFixed(2)}`;

  try {
    if (navigator.share && navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
      await navigator.share({
        title: "Transport Payment Advice",
        text: textMessage,
        files: [pdfFile],
      });
      return;
    }
  } catch (err) {
    console.error("WhatsApp share failed", err);
  }

  window.open(`https://wa.me/?text=${encodeURIComponent(textMessage)}`, "_blank");
};



  return (
    <div style={{ padding: 20, background: "#f8fafc", minHeight: "100vh", fontFamily: "Segoe UI, Arial, sans-serif" }}>
      <div style={{ ...card, marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
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
          <button type="button" onClick={() => loadCompletedWarehouseSales(true)} style={{ ...btn, background: showCompletedSaleOnly ? "#7c3aed" : "#64748b" }}>
            F6 Completed Sale
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
                          const outwardId = String(row.id);
                          setSelectedOutwardId(outwardId);
                          if (row.bilti_id) {
                            loadBilti(String(row.bilti_id));
                          } else {
                            loadBilti(outwardId, "outward", row);
                          }
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
          <label style={label}>{showCompletedSaleOnly ? "Completed Warehouse Sale (F6)" : "Pending Warehouse Sale"}</label>
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
                    <td style={sourceTd}>{num(row.quantity ?? row.unloading_qty).toFixed(4)}</td>
                    <td style={sourceTd}>{num(row.rate).toFixed(2)}</td>
                    <td style={sourceTd}>
                      <button
                        type="button"
                        onClick={() => {
                          const saleId = String(row.id);
                          setSelectedSaleId(saleId);
                          if (row.bilti_id) {
                            loadBilti(String(row.bilti_id));
                          } else {
                            loadBilti(saleId, "sale", row);
                          }
                          setShowCompletedSaleOnly(Boolean(showCompletedSaleOnly));
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
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "linear-gradient(135deg, rgba(15,23,42,.72), rgba(2,132,199,.28))",
            backdropFilter: "blur(5px)",
            WebkitBackdropFilter: "blur(5px)",
            padding: 16,
            overflowY: "auto",
          }}
          role="dialog"
          aria-modal="true"
        >
          <div
            style={{
              maxWidth: 1320,
              margin: "0 auto",
              background: "#fff",
              borderRadius: 20,
              boxShadow: "0 25px 80px rgba(15,23,42,.30)",
              overflow: "hidden",
              border: "1px solid rgba(255,255,255,.7)",
            }}
          >
            <div
              style={{
                position: "sticky",
                top: 0,
                zIndex: 3,
                padding: "14px 18px",
                background: "linear-gradient(135deg,#0f766e,#0e7490)",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 19, fontWeight: 800 }}>Transport Bilti</div>
                <div style={{ marginTop: 3, fontSize: 12, opacity: 0.9 }}>
                  {mode === "sale" ? "Warehouse Sale" : mode === "outward" ? "Outward" : "Manual Bilti"}
                  {transportNameDisplay ? ` • ${transportNameDisplay}` : ""}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <button
                  type="button"
                  onClick={closeEditorPopup}
                  aria-label="Close transport bilti"
                  title="Close"
                  style={{
                    width: 42,
                    height: 42,
                    minWidth: 42,
                    borderRadius: "50%",
                    border: "2px solid #fecaca",
                    background: "#dc2626",
                    color: "#fff",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 24,
                    lineHeight: 1,
                    fontWeight: 800,
                    cursor: "pointer",
                    boxShadow: "0 8px 18px rgba(220,38,38,.28)",
                  }}
                >
                  ×
                </button>
              </div>
            </div>

            <div style={{ padding: 18 }}>
          <div style={{ ...card, marginBottom: 16, borderRadius: 16, boxShadow: "0 8px 26px rgba(15,23,42,.07)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: .5 }}>Transport Name</div>
                <div style={{ marginTop: 4, fontSize: 18, fontWeight: 800, color: "#0f172a" }}>
                  {transportNameDisplay || selectedTransporter?.name || "Select Transport"}
                </div>
              </div>
              <button onClick={() => setShowTransportForm((p) => !p)} style={{ ...btn, background: "#2563eb", padding: "8px 14px" }}>
                New Transport
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12, marginBottom: 14 }}>
              <select name="transporter_id" value={formData.transporter_id} onChange={handleChange} style={input}>
                <option value="">Select Transport</option>
                {formData.transporter_id && transportNameDisplay && !transporters.some((t) => sameId(getRecordId(t), formData.transporter_id)) && (
                  <option value={formData.transporter_id}>{transportNameDisplay}</option>
                )}
                {transporters.map((t) => (
                  <option key={getRecordId(t)} value={getRecordId(t)}>{t.name}</option>
                ))}
              </select>
              <input value={selectedTransporter?.pan_no || meta?.transporter_pan_no || meta?.pan_no || ""} readOnly placeholder="PAN No" style={{ ...input, background: "#f8fafc" }} />
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
                        <option key={getRecordId(c)} value={getRecordId(c)}>{c.name}</option>
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
                          const company = companies.find((c) => sameId(getRecordId(c), formData.company_id));
                          const accountCompanyId = getRecordId({ _id: a.company_id, id: a.company_id });
                          return (
                            sameId(accountCompanyId, formData.company_id) ||
                            String(a.company_name || "").trim().toLowerCase() === String(company?.name || "").trim().toLowerCase()
                          );
                        })
                        .map((a) => (
                          <option key={getRecordId(a)} value={getRecordId(a)}>
                            {a.account_name}
                            {a.company_name ? ` - ${a.company_name}` : ""}
                          </option>
                        ))}
                      {formData.company_id &&
                        companyAccounts.filter((a) => {
                          const company = companies.find((c) => sameId(getRecordId(c), formData.company_id));
                          const accountCompanyId = getRecordId({ _id: a.company_id, id: a.company_id });
                          return (
                            sameId(accountCompanyId, formData.company_id) ||
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
                <label style={label}>ADV Date</label>
                <input
                  type="date"
                  name="advance_date"
                  value={formData.advance_date || ""}
                  onChange={handleChange}
                  style={input}
                />
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
              <div>
                <label style={label}>Round Off</label>
                <input type="number" step="0.01" name="round_off" value={formData.round_off} onChange={handleChange} style={input} />
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

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, flexWrap: "wrap" }}>
            <button onClick={saveBilti} style={{ ...btn, background: "#16a34a", display: "inline-flex", alignItems: "center", gap: 8 }}>
              <FaSave /> Save
            </button>
            <button onClick={editBilti} style={{ ...btn, background: "#2563eb", display: "inline-flex", alignItems: "center", gap: 8 }}>
              <FaEdit /> Edit
            </button>
            <button onClick={deleteBilti} style={{ ...btn, background: "#dc2626", display: "inline-flex", alignItems: "center", gap: 8 }}>
              <FaTrash /> Delete
            </button>
            <button onClick={downloadPDF} style={{ ...btn, background: "#475569", display: "inline-flex", alignItems: "center", gap: 8 }}>
              <FaFilePdf /> PDF
            </button>
            <button onClick={shareToWhatsApp} style={{ ...btn, background: "#25D366", display: "inline-flex", alignItems: "center", gap: 8 }}>
              <FaWhatsapp /> WhatsApp
            </button>
          </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
