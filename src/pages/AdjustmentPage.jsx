import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import API from "./axiosInstance";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { formatDisplayDate } from "../utils/date";

export default function AdjustmentPage({ outward, onSaved, onDeleted, onClose }) {
  const [companyList, setCompanyList] = useState([]);
  const [companyId, setCompanyId] = useState("");
  const [sourceType, setSourceType] = useState("inward");
  const [inwardList, setInwardList] = useState([]);
  const [selectedInward, setSelectedInward] = useState(null);
  const [selectedInwardIds, setSelectedInwardIds] = useState([]);
  const [adjustQty, setAdjustQty] = useState("");
  const [adjustments, setAdjustments] = useState([]);
  const [adjustmentLog, setAdjustmentLog] = useState([]);
  const [buyerAdjustmentDetails, setBuyerAdjustmentDetails] = useState([]);
  const [alreadyAdjusted, setAlreadyAdjusted] = useState(0);
  const [editingLogId, setEditingLogId] = useState(null);
  const [editingQty, setEditingQty] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  
  // For cleanup on unmount
  const isMountedRef = React.useRef(true);
  const abortControllerRef = React.useRef(new AbortController());

  const outwardQty = Number(outward?.quantity) || 0;

  const parseNumber = (val) => {
    const raw = val == null ? "" : String(val).trim();
    const cleaned = raw.replace(/,/g, "").replace(/[^0-9.-]+/g, "");
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const num = (val) => Number(val || 0).toFixed(4);
  const pct = (val) => `${Number(val || 0).toFixed(2)}%`;
  const getAdjustmentKey = (item) =>
    item?.source_type === "palti_lorry"
      ? `palti:${item?.palti_lorry_id || item?.id || ""}`
      : `inward:${item?.inward_id || item?.id || ""}`;
  
  // Helper to round to 4 decimals to avoid floating point errors
  const roundTo4 = (val) => Math.round((val || 0) * 10000) / 10000;
  
  // Small tolerance to account for floating point rounding in comparisons
  const EPS = 0.01;

  const totalDraftAdjusted = useMemo(
    () => roundTo4(adjustments.reduce((sum, item) => sum + Number(item.qty || 0), 0)),
    [adjustments]
  );

  const totalConsigneeQty = useMemo(
    () =>
      roundTo4(
        buyerAdjustmentDetails.reduce((sum, item) => {
          const hasRate = Number(item.rate) > 0;
          if (!hasRate) return sum;
          return sum + parseNumber(item.weight ?? item.qty ?? 0);
        }, 0)
      ),
    [buyerAdjustmentDetails]
  );

  const effectiveOutwardQty = totalConsigneeQty > 0 ? totalConsigneeQty : outwardQty;

  const currentRemaining = roundTo4(effectiveOutwardQty - alreadyAdjusted);
  const remainingQty = roundTo4(currentRemaining - totalDraftAdjusted);
  const adjustmentTargetQty = currentRemaining;
  // Allow a small tolerance when comparing floats so tiny rounding
  // differences don't prevent final save from being enabled.
  const isDraftExactMatch =
    totalDraftAdjusted > 0 && Math.abs(totalDraftAdjusted - adjustmentTargetQty) < 0.01;

  const cardStyle = {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    padding: 16,
    boxShadow: "0 6px 18px rgba(15, 23, 42, 0.06)",
    marginTop: 16,
  };

  const sectionTitle = {
    margin: "0 0 12px",
    fontSize: 18,
    fontWeight: 800,
    color: "#14532d",
  };

  const tableStyle = {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: 14,
  };

  const thStyle = {
    background: "#0f766e",
    color: "#fff",
    padding: "10px 12px",
    textAlign: "left",
    border: "1px solid #d1d5db",
  };

  const tdStyle = {
    padding: "10px 12px",
    border: "1px solid #e5e7eb",
    background: "#fff",
    color: "#166534",
  };

  const inputStyle = {
    padding: "10px 12px",
    border: "1px solid #cbd5e1",
    borderRadius: 8,
    fontSize: 14,
  };

  const buttonStyle = {
    padding: "9px 14px",
    border: "none",
    borderRadius: 8,
    color: "#fff",
    cursor: "pointer",
    fontWeight: 600,
  };

  const strongText = {
    color: "#14532d",
    fontWeight: 800,
  };

  const mutedText = {
    color: "#166534",
    fontWeight: 700,
  };

  const buyerDisplay = useMemo(() => {
    const names = Array.from(
      new Set(
        buyerAdjustmentDetails
          .map((item) => String(item.buyer_name || "").trim())
          .filter(Boolean)
      )
    );
    if (names.length === 0) return outward?.buyer_name || "-";
    return names.length === 1 ? names[0] : "Multiple";
  }, [buyerAdjustmentDetails, outward?.buyer_name]);

  const rateDisplay = useMemo(() => {
    const rates = Array.from(
      new Set(
        buyerAdjustmentDetails
          .map((item) => (item.rate != null ? Number(item.rate).toFixed(2) : ""))
          .filter(Boolean)
      )
    );
    if (rates.length === 0) return outward?.rate != null ? Number(outward.rate).toFixed(2) : "-";
    return rates.length === 1 ? rates[0] : "Multiple";
  }, [buyerAdjustmentDetails, outward?.rate]);

  const buyerLines = useMemo(() => {
    if (buyerAdjustmentDetails.length > 0) {
      const grouped = buyerAdjustmentDetails.reduce((acc, item) => {
        const buyerName = String(item.buyer_name || "").trim() || "-";
        const rate = item.rate != null ? Number(item.rate).toFixed(2) : "-";
        const key = `${buyerName}|${rate}`;
        if (!acc[key]) {
          acc[key] = { buyer_name: buyerName, rate, qty: 0 };
        }
        acc[key].qty += parseNumber(item.weight ?? item.qty ?? 0);
        return acc;
      }, {});
      return Object.values(grouped);
    }

    if (outward?.buyer_name) {
      return [
        {
          buyer_name: outward.buyer_name,
          rate: outward?.rate != null ? Number(outward.rate).toFixed(2) : "-",
          qty: outwardQty,
        },
      ];
    }

    return [];
  }, [buyerAdjustmentDetails, outward, outwardQty]);

  const outwardQtyDisplay = effectiveOutwardQty;

  const isPaltiSource = sourceType === "palti_lorry";

  const getAdjustmentScope = () => {
    const useLocation = !!outward?.location_id;
    return {
      warehouse_id: useLocation ? "" : outward?.warehouse_id || "",
      location_id: outward?.location_id || "",
    };
  };

  const visibleInwardList = useMemo(() => {
    const hiddenKeys = new Set(
      adjustments.map((item) =>
        item.source_type === "palti_lorry"
          ? `palti:${item.palti_lorry_id}`
          : `inward:${item.inward_id}`
      )
    );

    return inwardList.filter((row) => {
      const rowKey =
        (row.source_type || "inward") === "palti_lorry"
          ? `palti:${row.id}`
          : `inward:${row.id}`;
      return !hiddenKeys.has(rowKey);
    });
  }, [inwardList, adjustments]);

  const selectedInwardCount = selectedInwardIds.length;

  const loadCompanyList = async () => {
    if (!outward?.warehouse_id && !outward?.location_id) return setCompanyList([]);
    try {
      const scope = getAdjustmentScope();
      const res = await API.get("/api/adjustment/parties", {
        params: {
          ...scope,
          product_id: outward.product_id,
        },
        signal: abortControllerRef.current.signal,
      });
      if (isMountedRef.current) {
        const rows = Array.isArray(res.data) ? res.data : [];
        const deduped = [];
        const seen = new Set();
        rows.forEach((row) => {
          const id = String(row?.id || "").trim();
          const source = String(row?.source_type || "inward").trim();
          const key = `${source}:${id}`;
          if (!id || seen.has(key)) return;
          seen.add(key);
          deduped.push(row);
        });
        setCompanyList(deduped);
      }
    } catch (err) {
      if (isMountedRef.current && err.name !== "CanceledError") {
        setCompanyList([]);
        toast.error("Company load failed", { theme: "colored", autoClose: 2000 });
      }
    }
  };

  const loadInwardStock = async (selectedCompanyId, selectedSourceType = sourceType) => {
    if (!outward || !selectedCompanyId) return setInwardList([]);
    try {
      const scope = getAdjustmentScope();
      const res = await API.get("/api/adjustment/inward/report", {
        params: {
          ...scope,
          company_id: selectedCompanyId,
          outward_date: outward.date,
          source_type: selectedSourceType,
        },
        signal: abortControllerRef.current.signal,
      });
      if (isMountedRef.current) {
        setInwardList(Array.isArray(res.data) ? res.data : []);
      }
    } catch (err) {
      if (isMountedRef.current && err.name !== "CanceledError") {
        setInwardList([]);
        toast.error("Inward load failed", { theme: "colored", autoClose: 2000 });
      }
    }
  };

  const loadAdjustmentLog = async () => {
    if (!outward?.id) return;
    try {
      const res = await API.get(`/api/adjustment/${outward.id}`, {
        signal: abortControllerRef.current.signal,
      });
      if (isMountedRef.current) {
        const rows = Array.isArray(res.data) ? res.data : [];
        setAdjustmentLog(rows);
        setAlreadyAdjusted(rows.reduce((sum, item) => sum + Number(item.qty || 0), 0));
      }
    } catch (err) {
      if (isMountedRef.current && err.name !== "CanceledError") {
        setAdjustmentLog([]);
        setAlreadyAdjusted(0);
      }
    }
  };

  const loadBuyerAdjustmentDetails = async () => {
    if (!outward?.id) return;
    try {
      const res = await API.get(`/api/buyer-adjustment/${outward.id}`, {
        signal: abortControllerRef.current.signal,
      });
      if (isMountedRef.current) {
        setBuyerAdjustmentDetails(Array.isArray(res.data) ? res.data : []);
      }
    } catch (err) {
      if (isMountedRef.current && err.name !== "CanceledError") {
        setBuyerAdjustmentDetails([]);
      }
    }
  };

  useEffect(() => {
    setCompanyId("");
    setSourceType("inward");
    setInwardList([]);
    setSelectedInward(null);
    setSelectedInwardIds([]);
    setAdjustQty("");
    setAdjustments([]);
    setAdjustmentLog([]);
    setBuyerAdjustmentDetails([]);
    setAlreadyAdjusted(0);
    setEditingLogId(null);
    setEditingQty("");

    if (outward) {
      loadCompanyList();
      loadAdjustmentLog();
      loadBuyerAdjustmentDetails();
    }
  }, [outward]);

  // Cleanup on component unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      // Cancel all pending requests
      abortControllerRef.current.abort();
    };
  }, []);

  const handleAddAdjustment = () => {
    if (!companyId) {
      toast.warning("Please select company first", { theme: "colored", autoClose: 2000 });
      return;
    }
    if (!selectedInward) {
      toast.warning("Please select inward / lorry first", { theme: "colored", autoClose: 2000 });
      return;
    }

    const qty = Number(adjustQty);
    if (!qty || qty <= 0) {
      toast.warning("Enter valid qty", { theme: "colored", autoClose: 2000 });
      return;
    }
    if (qty > Number(selectedInward.available_qty)) {
      toast.warning("Adjusted qty cannot be greater than the available qty", { theme: "colored", autoClose: 2000 });
      return;
    }
    if (qty > remainingQty + EPS) {
      toast.warning(`Only ${num(remainingQty)} qty remaining to adjust`, { theme: "colored", autoClose: 2000 });
      return;
    }

    const selectedKey = getAdjustmentKey({
      source_type: selectedInward.source_type || sourceType,
      inward_id: selectedInward.id,
      palti_lorry_id: selectedInward.id,
    });
    const existingIndex = adjustments.findIndex((item) => getAdjustmentKey(item) === selectedKey);

    if (existingIndex !== -1) {
      const updated = [...adjustments];
      const nextQty = Number(updated[existingIndex].qty) + qty;

      if (nextQty > Number(selectedInward.available_qty)) {
        toast.warning("Total qty cannot be greater than the available qty", { theme: "colored", autoClose: 2000 });
        return;
      }

      updated[existingIndex].qty = nextQty;
      setAdjustments(updated);
    } else {
      const selectedCompany = companyList.find((c) => String(c.id) === String(companyId));

      setAdjustments((prev) => [
        ...prev,
        {
          inward_id: isPaltiSource ? null : selectedInward.id,
          palti_lorry_id: isPaltiSource ? selectedInward.id : null,
          source_type: selectedInward.source_type || sourceType,
          voucher_no: selectedInward.voucher_no,
          lorry_no: selectedInward.lorry_no,
          company_id: Number(companyId),
          company_name: selectedCompany?.name || "",
          qty,
        },
      ]);
    }

    toast.success("✓ Adjustment added to draft list", { theme: "colored", autoClose: 2000 });
    setAdjustQty("");
    setSelectedInward(null);
  };

  const toggleInwardSelection = (row) => {
    const rowId = String(row?.id || "");
    if (!rowId) return;
    setSelectedInward(row);
    setAdjustQty(String(row?.available_qty || row?.net_opening_qty || ""));
    setSelectedInwardIds((prev) => {
      if (prev.includes(rowId)) return prev.filter((id) => id !== rowId);
      return [...prev, rowId];
    });
  };

  const addSelectedInwards = () => {
    if (!companyId) {
      toast.warning("Please select company first", { theme: "colored", autoClose: 2000 });
      return;
    }
    if (selectedInwardIds.length === 0) {
      toast.warning("Please select at least one inward row", { theme: "colored", autoClose: 2000 });
      return;
    }

    const rowsToAdd = visibleInwardList.filter((row) => selectedInwardIds.includes(String(row.id)));
    if (rowsToAdd.length === 0) {
      toast.warning("Selected rows are not available", { theme: "colored", autoClose: 2000 });
      return;
    }

    const selectedCompany = companyList.find((c) => String(c.id) === String(companyId));
    const nextAdjustments = [...adjustments];

    for (const row of rowsToAdd) {
      const rowId = String(row.id);
      const qty = Number(row.available_qty || 0);
      if (!qty || qty <= 0) continue;

      const rowKey = getAdjustmentKey({
        source_type: row.source_type || sourceType,
        inward_id: row.id,
        palti_lorry_id: row.id,
      });
      const existingIndex = nextAdjustments.findIndex((item) => getAdjustmentKey(item) === rowKey);
      if (existingIndex !== -1) {
        nextAdjustments[existingIndex].qty = qty;
      } else {
        nextAdjustments.push({
          inward_id: isPaltiSource ? null : row.id,
          palti_lorry_id: isPaltiSource ? row.id : null,
          source_type: row.source_type || sourceType,
          voucher_no: row.voucher_no,
          lorry_no: row.lorry_no,
          company_id: Number(companyId),
          company_name: selectedCompany?.name || "",
          qty,
        });
      }

      setSelectedInwardIds((prev) => prev.filter((id) => id !== rowId));
    }

    setAdjustments(nextAdjustments);
    setSelectedInward(null);
    setAdjustQty("");
    toast.success("Selected inward rows added with auto qty", { theme: "colored", autoClose: 2000 });
  };

  const handleSave = async () => {
    if (isSaving) return;
    if (!outward?.id) {
      toast.warning("Adjustment ID missing", { theme: "colored", autoClose: 3000 });
      return;
    }
    if (!companyId) {
      toast.warning("Please select company first", { theme: "colored", autoClose: 3000 });
      return;
    }
    if (!Array.isArray(adjustments) || adjustments.length === 0) {
      toast.warning("Please add adjustment first", { theme: "colored", autoClose: 3000 });
      return;
    }

    const invalidRow = adjustments.find((item) => {
      const qty = Number(item?.qty || 0);
      const hasVoucher = String(item?.voucher_no || "").trim();
      const hasLorry = String(item?.lorry_no || "").trim();
      const hasCompany = String(item?.company_id || "").trim();
      const hasSource = String(item?.source_type || "").trim();
      return !qty || qty <= 0 || !hasVoucher || !hasLorry || !hasCompany || !hasSource;
    });

    if (invalidRow) {
      toast.warning("One or more draft rows are incomplete", { theme: "colored", autoClose: 3000 });
      return;
    }

    if (totalDraftAdjusted <= 0) {
      toast.warning("Please add adjustment first", { theme: "colored", autoClose: 3000 });
      return;
    }
    if (totalDraftAdjusted > currentRemaining + EPS) {
      toast.warning(`Adjustment cannot exceed remaining ${num(currentRemaining)}`, { theme: "colored", autoClose: 3000 });
      return;
    }
    if (!isDraftExactMatch) {
      toast.warning(
        `Draft Adjustment List total must be exactly ${num(adjustmentTargetQty)} before final save`,
        { theme: "colored", autoClose: 3000 }
      );
      return;
    }

    try {
      setIsSaving(true);
      await API.post(
        "/api/adjustment/final-save",
        {
          outward_id: outward.id,
          adjustments,
        },
        { timeout: 30000 }
      );

      if (!isMountedRef.current) return;
      resetDraftState();
      if (typeof onSaved === "function") {
        onSaved();
      } else {
        toast.success("Adjustment saved successfully", { theme: "colored", autoClose: 3000 });
      }
      if (typeof onClose === "function") onClose();
      void loadCompanyList();
      void loadAdjustmentLog();
      void loadBuyerAdjustmentDetails();
    } catch (err) {
      if (isMountedRef.current && err.name !== "CanceledError") {
        const apiError = err?.response?.data || {};
        const details = apiError?.details;
        let message = apiError?.error || err?.message || "Save failed";
        if (details) {
          const parts = [];
          if (details.voucher_no) parts.push(`Voucher: ${details.voucher_no}`);
          if (details.lorry_no) parts.push(`Lorry: ${details.lorry_no}`);
          if (details.requested_qty != null) parts.push(`Requested: ${Number(details.requested_qty).toFixed(4)}`);
          if (details.available_qty != null) parts.push(`Available: ${Number(details.available_qty).toFixed(4)}`);
          if (details.difference != null) parts.push(`Excess: ${Number(details.difference).toFixed(4)}`);
          if (details.shortage_qty != null) parts.push(`Shortage: ${Number(details.shortage_qty).toFixed(4)}`);
          if (details.net_opening_qty != null) parts.push(`Net: ${Number(details.net_opening_qty).toFixed(4)}`);
          if (parts.length > 0) message = `${message} | ${parts.join(" | ")}`;
        }
        toast.error(message, { theme: "colored", autoClose: 3000 });
      }
    } finally {
      if (isMountedRef.current) {
        setIsSaving(false);
      }
    }
  };

  const handleDeleteLog = async (id) => {
    if (!window.confirm("Delete this adjustment log?")) return;
    try {
      try {
        await API.post(`/api/adjustment/log/${id}/delete`, null);
      } catch (deleteErr) {
        if (deleteErr?.response?.status !== 404) {
          throw deleteErr;
        }
      }

      if (!isMountedRef.current) return;
      resetDraftState();
      if (typeof onDeleted === "function") onDeleted();
      void loadAdjustmentLog();
      void loadBuyerAdjustmentDetails();
      void loadCompanyList();
    } catch (err) {
      if (isMountedRef.current && err.name !== "CanceledError") {
        toast.error(err?.response?.data?.error || "Delete failed", { theme: "colored", autoClose: 3000 });
      }
    }
  };

  const handleEditLog = (row) => {
    setEditingLogId(row.id);
    setEditingQty(String(row.qty || ""));
  };

  const handleUpdateLog = async () => {
    if (!editingLogId) return;
    const qtyValue = Number(editingQty);
    if (!qtyValue || qtyValue <= 0) {
      toast.warning("Enter a valid qty to update", { theme: "colored", autoClose: 3000 });
      return;
    }

    try {
      await API.put(`/api/adjustment/log/${editingLogId}`, {
        qty: qtyValue,
      });
      
      if (!isMountedRef.current) return;
      setEditingLogId(null);
      setEditingQty("");
      resetDraftState();
      if (typeof onSaved === "function") onSaved();
      void loadAdjustmentLog();
      void loadBuyerAdjustmentDetails();
      void loadCompanyList();
    } catch (err) {
      if (isMountedRef.current && err.name !== "CanceledError") {
        const errorMessage = err?.response?.data?.error || err?.message || "Update failed";
        toast.error(errorMessage, { theme: "colored", autoClose: 3000 });
      }
    }
  };

  const resetDraftState = () => {
    setAdjustments([]);
    setCompanyId("");
    setSourceType("inward");
    setInwardList([]);
    setSelectedInward(null);
    setAdjustQty("");
    setEditingLogId(null);
    setEditingQty("");
  };

  return (
    <div style={{ padding: 20, background: "#f8fafc", borderRadius: 16 }}>
      <div style={cardStyle}>
        <h2 style={{ margin: 0, color: "#14532d", fontWeight: 800 }}>Adjustment Entry</h2>
        <p style={{ margin: "10px 0 0", color: "#166534", fontWeight: 700 }}>
          Product: {outward?.product_name} | {outward?.warehouse_name ? `Warehouse: ${outward.warehouse_name}` : `Location: ${outward?.location_name || "-"}`}
        </p>
        <div style={{ margin: "6px 0 0", color: "#166534", fontWeight: 700 }}>
          Buyer:
        </div>
        {buyerLines.length > 0 ? (
          buyerLines.map((line, index) => (
            <div
              key={`${line.buyer_name}-${line.rate}-${index}`}
              style={{ margin: "4px 0 0 10px", color: "#166534", fontWeight: 700 }}
            >
              {line.buyer_name} | {num(line.qty)} | Rate: {line.rate}
            </div>
          ))
        ) : (
          <div style={{ margin: "4px 0 0 10px", color: "#166534", fontWeight: 700 }}>-</div>
        )}
        <div style={{ margin: "10px 0 0", color: "#166534", fontWeight: 700 }}>
          Consignee/Rate Weight: <span style={strongText}>{num(totalConsigneeQty)}</span>
        </div>
        <p style={{ margin: "8px 0 0", color: "#166534", fontWeight: 700 }}>
          Outward Date: {formatDisplayDate(outward?.date)} | Outward Qty{buyerLines.length > 0 ? " (Consignee)" : ""}: <span style={strongText}>{num(outwardQtyDisplay)}</span> | Already Adjusted: <span style={strongText}>{num(alreadyAdjusted)}</span> | Remaining: <span style={strongText}>{num(currentRemaining)}</span>
        </p>
      </div>
      <div style={cardStyle}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#0f766e", marginBottom: 10 }}>Consignee / Rate summary</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
          <div style={{ padding: 12, background: "#ffffff", border: "1px solid #d1d5db", borderRadius: 12 }}>
            <div style={{ fontSize: 12, color: "#475569" }}>Total Weight</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#14532d" }}>{num(totalConsigneeQty)}</div>
          </div>
          <div style={{ padding: 12, background: "#ffffff", border: "1px solid #d1d5db", borderRadius: 12 }}>
            <div style={{ fontSize: 12, color: "#475569" }}>Already Adjusted</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#14532d" }}>{num(alreadyAdjusted)}</div>
          </div>
          <div style={{ padding: 12, background: "#ffffff", border: "1px solid #d1d5db", borderRadius: 12 }}>
            <div style={{ fontSize: 12, color: "#475569" }}>Remaining</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#14532d" }}>{num(currentRemaining)}</div>
          </div>
        </div>
      </div>

      <div style={cardStyle}>
        <h3 style={sectionTitle}>Previous Adjustment Log</h3>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Voucher</th>
              <th style={thStyle}>Lorry No</th>
              <th style={thStyle}>Company</th>
              <th style={thStyle}>Qty</th>
              <th style={thStyle}>Action</th>
            </tr>
          </thead>
          <tbody>
            {adjustmentLog.length > 0 ? (
              adjustmentLog.map((row) => (
                <tr key={row.id}>
                  <td style={tdStyle}>{row.inward_voucher}</td>
                  <td style={tdStyle}>{row.lorry_no}</td>
                  <td style={tdStyle}>{row.company_name} {row.source_type === "palti_lorry" ? "(Palti)" : ""}</td>
                  <td style={tdStyle}>
                    {editingLogId === row.id ? (
                      <input
                        type="number"
                        value={editingQty}
                        onChange={(e) => setEditingQty(e.target.value)}
                        style={{ ...inputStyle, width: 100 }}
                      />
                    ) : (
                      num(row.qty)
                    )}
                  </td>
                  <td style={tdStyle}>
                    {editingLogId === row.id ? (
                      <>
                        <button
                          onClick={handleUpdateLog}
                          style={{ ...buttonStyle, background: "#2563eb", marginRight: 8 }}
                        >
                          Update
                        </button>
                        <button
                          onClick={() => {
                            setEditingLogId(null);
                            setEditingQty("");
                          }}
                          style={{ ...buttonStyle, background: "#64748b" }}
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => handleEditLog(row)}
                          style={{ ...buttonStyle, background: "#f59e0b", marginRight: 8 }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteLog(row.id)}
                          style={{ ...buttonStyle, background: "#dc2626" }}
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td style={tdStyle} colSpan="5">No previous adjustment</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div style={cardStyle}>
        <h3 style={sectionTitle}>Settlement Summary</h3>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 220px", background: "#ecfeff", border: "1px solid #67e8f9", borderRadius: 10, padding: 12 }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Settlement Items</div>
            <div>{adjustments.length} item{adjustments.length === 1 ? "" : "s"}</div>
          </div>
          <div style={{ flex: "1 1 220px", background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 10, padding: 12 }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Total Settlement Qty</div>
            <div>{num(totalDraftAdjusted)}</div>
          </div>
          <div style={{ flex: "1 1 220px", background: "#fef3c7", border: "1px solid #fde68a", borderRadius: 10, padding: 12 }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Remaining To Adjust</div>
            <div>{num(remainingQty)}</div>
          </div>
          <div style={{ flex: "1 1 220px", background: "#e0f2fe", border: "1px solid #7dd3fc", borderRadius: 10, padding: 12 }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Outward Remaining</div>
            <div>{num(currentRemaining)}</div>
          </div>
        </div>
      </div>

      <div style={cardStyle}>
        <h3 style={sectionTitle}>Select Company</h3>
        <select
          value={companyId ? `${sourceType}:${companyId}` : ""}
          onChange={(e) => {
            const [nextSourceType, nextCompanyId] = String(e.target.value || "").split(":");
            setSourceType(nextSourceType || "inward");
            setCompanyId(nextCompanyId || "");
            setSelectedInward(null);
            setSelectedInwardIds([]);
            setAdjustQty("");
            if (nextCompanyId) loadInwardStock(nextCompanyId, nextSourceType || "inward");
            else setInwardList([]);
          }}
          style={{ ...inputStyle, minWidth: 280 }}
        >
          <option value="">Select Company</option>
          {companyList.map((company) => (
            <option
              key={`${company.source_type}-${company.id}`}
              value={`${company.source_type}:${company.id}`}
            >
              {company.name} {company.source_type === "palti_lorry" ? "(Palti Lorry)" : "(Inward)"}
            </option>
          ))}
        </select>

        <div style={{ marginTop: 14, fontWeight: 800, color: "#14532d" }}>
          Draft Adjusted: <span style={strongText}>{num(totalDraftAdjusted)}</span> | Draft Remaining: <span style={strongText}>{num(remainingQty)}</span>
        </div>
        <div style={{ marginTop: 8, ...mutedText }}>
          Final save condition: Draft Adjustment List must be exactly <span style={strongText}>{num(adjustmentTargetQty)}</span>
        </div>
      </div>

      <div style={cardStyle}>
        <h3 style={sectionTitle}>
          {isPaltiSource ? "Available Palti Lorry List" : "Available Inward Lorry List"}
        </h3>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}></th>
              <th style={thStyle}>Voucher</th>
              <th style={thStyle}>Inward Date</th>
              <th style={thStyle}>Outward Date</th>
              <th style={thStyle}>Days Diff</th>
              <th style={thStyle}>Months</th>
              <th style={thStyle}>Lorry No</th>
              {isPaltiSource && <th style={thStyle}>Reg Lorry</th>}
              {isPaltiSource && <th style={thStyle}>New Lorry</th>}
              {isPaltiSource && <th style={thStyle}>New Weight</th>}
              <th style={thStyle}>Company</th>
              <th style={thStyle}>Location</th>
              <th style={thStyle}>Gross Qty</th>
              <th style={thStyle}>Shortage %</th>
              <th style={thStyle}>Shortage Qty</th>
              <th style={thStyle}>Net Opening</th>
              <th style={thStyle}>Already Adjusted</th>
              <th style={thStyle}>Available Balance</th>
            </tr>
          </thead>
          <tbody>
            {visibleInwardList.length > 0 ? (
              visibleInwardList.map((row) => (
                <tr
                  key={`${row.source_type || sourceType}-${row.id}`}
                  onClick={() => {
                    setSelectedInward(row);
                    setAdjustQty(String(row.available_qty || row.net_opening_qty || ""));
                  }}
                  style={{
                    cursor: "pointer",
                    background: selectedInwardIds.includes(String(row.id))
                      ? "#dbeafe"
                      : selectedInward?.id === row.id
                      ? "#dcfce7"
                      : "#fff",
                  }}
                >
                  <td style={tdStyle}>
                    <input
                      type="checkbox"
                      checked={selectedInwardIds.includes(String(row.id))}
                      onChange={() => toggleInwardSelection(row)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </td>
                  <td style={tdStyle}>{row.voucher_no}</td>
                  <td style={tdStyle}>{formatDisplayDate(row.date)}</td>
                  <td style={tdStyle}>{formatDisplayDate(row.outward_date)}</td>
                  <td style={tdStyle}>{row.days_diff}</td>
                  <td style={tdStyle}>{row.months_diff}</td>
                  <td style={tdStyle}>{row.display_lorry_no || row.lorry_no}</td>
                  {isPaltiSource && <td style={tdStyle}>{row.reg_lorry_no || "-"}</td>}
                  {isPaltiSource && <td style={tdStyle}>{row.new_lorry_no || "-"}</td>}
                  {isPaltiSource && <td style={tdStyle}>{row.new_weight != null ? num(row.new_weight) : "-"}</td>}
                  <td style={tdStyle}>{row.company_name}</td>
                  <td style={tdStyle}>{row.location_name || "-"}</td>
                  <td style={tdStyle}>{num(row.gross_qty)}</td>
                  <td style={tdStyle}>{pct(row.shortage_percent ?? 0)}</td>
                  <td style={tdStyle}>{num(row.shortage_qty)}</td>
                  <td style={tdStyle}>{num(row.net_opening_qty)}</td>
                  <td style={tdStyle}>{num(row.already_adjusted)}</td>
                  <td style={tdStyle}>{num(row.available_qty)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td style={tdStyle} colSpan={isPaltiSource ? 18 : 15}>
                  {isPaltiSource ? "No Palti Lorry found" : "No inward found"}
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {selectedInward && (
          <div style={{ marginTop: 16, padding: 14, background: "#f8fafc", borderRadius: 10, border: "1px solid #e2e8f0" }}>
            <div style={{ fontWeight: 800, color: "#14532d", marginBottom: 8 }}>
              Selected Lorry: {selectedInward.display_lorry_no || selectedInward.lorry_no || "-"} | Voucher: {selectedInward.voucher_no}
            </div>
            <div style={{ marginBottom: 8, color: "#166534", fontWeight: 700 }}>
              Days: {selectedInward.days_diff} | Months: {selectedInward.months_diff} | Gross: {num(selectedInward.gross_qty)} | Shortage %: {pct(selectedInward.shortage_percent ?? 0)} | Shortage Qty: {num(selectedInward.shortage_qty)} | Net Opening: {num(selectedInward.net_opening_qty)} | Already Adjusted: {num(selectedInward.already_adjusted)} | Available: {num(selectedInward.available_qty)}
            </div>
            {isPaltiSource && (
              <div style={{ marginBottom: 8, color: "#166534", fontWeight: 700 }}>
                Reg Lorry: {selectedInward.reg_lorry_no || "-"} | New Lorry: {selectedInward.new_lorry_no || "-"} | New Weight: {selectedInward.new_weight != null ? num(selectedInward.new_weight) : "-"}
              </div>
            )}
            <input
              type="number"
              placeholder="Enter Qty"
              value={adjustQty}
              onChange={(e) => setAdjustQty(e.target.value)}
              style={inputStyle}
            />
            <button
              onClick={handleAddAdjustment}
              style={{ ...buttonStyle, background: "#2563eb", marginLeft: 10 }}
            >
              Add Adjustment
            </button>
            <button
              onClick={addSelectedInwards}
              style={{ ...buttonStyle, background: "#0f766e", marginLeft: 10 }}
            >
              Add Selected ({selectedInwardCount})
            </button>
          </div>
        )}
      </div>

      <div style={cardStyle}>
        <h3 style={sectionTitle}>Settlement Draft List</h3>
        <div style={{ marginBottom: 10, color: isDraftExactMatch ? "#166534" : "#b45309", fontWeight: 800 }}>
          Required: {num(adjustmentTargetQty)} | Current Settlement Total: {num(totalDraftAdjusted)}
        </div>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Voucher</th>
              <th style={thStyle}>Lorry No</th>
              <th style={thStyle}>Company</th>
              <th style={thStyle}>Qty</th>
              <th style={thStyle}>Action</th>
            </tr>
          </thead>
          <tbody>
            {adjustments.length > 0 ? (
              adjustments.map((a, i) => (
                <tr key={i}>
                  <td style={tdStyle}>{a.voucher_no}</td>
                  <td style={tdStyle}>{a.lorry_no}</td>
                  <td style={tdStyle}>{a.company_name} {a.source_type === "palti_lorry" ? "(Palti)" : ""}</td>
                  <td style={tdStyle}>{num(a.qty)}</td>
                  <td style={tdStyle}>
                    <button
                      onClick={() => setAdjustments((prev) => prev.filter((_, idx) => idx !== i))}
                      style={{ ...buttonStyle, background: "#dc2626" }}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td style={tdStyle} colSpan="5">No draft adjustment added</td>
              </tr>
            )}
          </tbody>
        </table>

        <button
          onClick={handleSave}
          disabled={!isDraftExactMatch || isSaving}
          style={{
            ...buttonStyle,
            background: isDraftExactMatch && !isSaving ? "#16a34a" : "#94a3b8",
            marginTop: 14,
            cursor: isDraftExactMatch && !isSaving ? "pointer" : "not-allowed",
            opacity: isSaving ? 0.85 : 1,
          }}
        >
          {isSaving ? "Saving..." : "Save Settlement"}
        </button>
      </div>
    </div>
  );
}









