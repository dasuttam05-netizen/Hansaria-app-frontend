import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { toast } from "react-toastify";

const createEmptyAdjustment = (outward) => ({
  buyer_id: "",
  buyer_name: "",
  consignee_name: "",
  qty: "",
  rate: "",
  claim: "",
  other_deduction: "",
  shortage: "",
  shortage_amount: "",
});

const normalizeAdjustmentRow = (item, outward) => ({
  ...item,
  buyer_name: item?.buyer_name || "",
  consignee_name: item?.consignee_name || outward?.consignee_name || outward?.consignee || "",
  rate: Number(item?.rate) || 0,
  qty: Number(item?.qty) || 0,
  claim: Number(item?.claim) || 0,
  other_deduction: Number(item?.other_deduction) || 0,
  shortage: Number(item?.shortage) || 0,
  shortage_amount: Number(item?.shortage_amount) || 0,
});

const buildAdjustmentPayload = (outwardId, unloadingDate, adj) => ({
  outward_id: outwardId,
  buyer_id: adj.buyer_id || null,
  buyer_name: adj.buyer_name || null,
  consignee_name: adj.consignee_name || null,
  unloading_date: unloadingDate,
  weight: Number(adj.weight) || Number(adj.qty) || 0,
  qty: Number(adj.qty) || 0,
  rate: Number(adj.rate) || 0,
  claim: Number(adj.claim) || 0,
  other_deduction: Number(adj.other_deduction) || 0,
  shortage: Number(adj.shortage) || 0,
  shortage_amount: Number(adj.shortage_amount) || 0,
  status: "Pending",
});

export default function BuyerAdjustmentForm({ outward, onClose, buyerNames = [], consigneeNames = [], onSave }) {
  const [unloadingDate, setUnloadingDate] = useState("");
  const [buyerAdjustments, setBuyerAdjustments] = useState([]);
  const [removedAdjustmentIds, setRemovedAdjustmentIds] = useState([]);
  const [newAdjustment, setNewAdjustment] = useState(() => createEmptyAdjustment(outward));
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const API_BASE = "/api";
  const outwardQty = Number(outward?.quantity || outward?.qty || 0);
  const unloadingTargetQty = Number(outward?.unloading_qty || outward?.settlement?.unloading_qty || outwardQty) || outwardQty;

  useEffect(() => {
    if (outward?.date) {
      setUnloadingDate(new Date(outward.date).toISOString().slice(0, 10));
    }

    const loadExistingAdjustments = async () => {
      if (!outward?.id) {
        setBuyerAdjustments([]);
        setRemovedAdjustmentIds([]);
        return;
      }

      try {
        const res = await axios.get(`${API_BASE}/buyer-adjustment/${outward.id}`);
        const items = Array.isArray(res.data) ? res.data : [];
        setBuyerAdjustments(items.map((item) => normalizeAdjustmentRow(item, outward)));
        setRemovedAdjustmentIds([]);
      } catch (err) {
        console.error("Error loading existing buyer adjustments:", err);
        setBuyerAdjustments([]);
        setRemovedAdjustmentIds([]);
      }
    };

    loadExistingAdjustments();
  }, [outward]);

  const totalAdjustedQty = useMemo(
    () => buyerAdjustments.reduce((sum, item) => sum + (Number(item.qty) || 0), 0),
    [buyerAdjustments]
  );

  const totalClaim = useMemo(
    () => buyerAdjustments.reduce((sum, item) => sum + (Number(item.claim) || 0), 0),
    [buyerAdjustments]
  );

  const totalOtherDeduction = useMemo(
    () => buyerAdjustments.reduce((sum, item) => sum + (Number(item.other_deduction) || 0), 0),
    [buyerAdjustments]
  );

  const totalShortage = useMemo(
    () => buyerAdjustments.reduce((sum, item) => sum + (Number(item.shortage) || 0), 0),
    [buyerAdjustments]
  );

  const totalShortageAmount = useMemo(
    () => buyerAdjustments.reduce((sum, item) => sum + (Number(item.shortage_amount) || 0), 0),
    [buyerAdjustments]
  );

  const totalAmount = useMemo(
    () => totalClaim + totalOtherDeduction + totalShortageAmount,
    [totalClaim, totalOtherDeduction, totalShortageAmount]
  );

  const averageRate = useMemo(() => {
    const itemsWithRate = buyerAdjustments.filter((item) => Number(item.rate) > 0);
    if (itemsWithRate.length === 0) return 0;

    const totalQtyWithRate = itemsWithRate.reduce((sum, item) => sum + (Number(item.qty) || 0), 0);
    if (totalQtyWithRate <= 0) return 0;

    const weightedSum = itemsWithRate.reduce(
      (sum, item) => sum + (Number(item.rate) || 0) * (Number(item.qty) || 0),
      0
    );
    return weightedSum / totalQtyWithRate;
  }, [buyerAdjustments]);

  const isWithinTargetQty = totalAdjustedQty <= unloadingTargetQty + 0.0001;
  const remainingQty = Math.max(unloadingTargetQty - totalAdjustedQty, 0);

  const handleAddAdjustment = () => {
    if (!newAdjustment.buyer_id && !newAdjustment.buyer_name) {
      toast.error("Please select or enter a buyer name", { theme: "colored" });
      return;
    }

    if (!newAdjustment.qty || Number(newAdjustment.qty) <= 0) {
      toast.error("Quantity must be greater than 0", { theme: "colored" });
      return;
    }

    if (editingId === null && Number(newAdjustment.qty) > remainingQty) {
      toast.error(`Quantity exceeds remaining ${remainingQty.toFixed(2)}`, { theme: "colored" });
      return;
    }

    const row = {
      id: editingId || `temp-${Date.now()}`,
      buyer_id: newAdjustment.buyer_id,
      buyer_name: newAdjustment.buyer_name,
      consignee_name: newAdjustment.consignee_name,
      qty: newAdjustment.qty,
      rate: newAdjustment.rate,
      claim: newAdjustment.claim,
      other_deduction: newAdjustment.other_deduction,
      shortage: newAdjustment.shortage,
      shortage_amount: newAdjustment.shortage_amount,
    };

    if (editingId !== null) {
      setBuyerAdjustments((prev) => prev.map((item) => (item.id === editingId ? row : item)));
      setEditingId(null);
    } else {
      setBuyerAdjustments((prev) => [...prev, row]);
    }

    resetNewAdjustment();
  };

  const resetNewAdjustment = () => {
    setNewAdjustment(createEmptyAdjustment(outward));
  };

  const handleEditAdjustment = (id) => {
    const item = buyerAdjustments.find((a) => a.id === id);
    if (item) {
      setNewAdjustment(item);
      setEditingId(id);
    }
  };

  const handleDeleteAdjustment = (id) => {
    setBuyerAdjustments((prev) => prev.filter((item) => item.id !== id));
    if (typeof id === "number") {
      setRemovedAdjustmentIds((prev) => [...prev, id]);
    }
    if (editingId === id) {
      resetNewAdjustment();
      setEditingId(null);
    }
  };

  const handleBuyerChange = (buyerId) => {
    const buyer = buyerNames.find((b) => String(b.id) === String(buyerId));
    setNewAdjustment((prev) => ({
      ...prev,
      buyer_id: buyerId,
      buyer_name: buyer?.name || "",
      consignee_name: "",
      rate: "",
      shortage_amount: "",
    }));
  };

  const handleSave = async () => {
    if (buyerAdjustments.length === 0) {
      toast.error("Add at least one buyer adjustment", { theme: "colored" });
      return;
    }

    if (!isWithinTargetQty) {
      toast.error(
        `Total unloading qty (${totalAdjustedQty.toFixed(2)}) cannot exceed target qty (${unloadingTargetQty.toFixed(2)})`,
        { theme: "colored" }
      );
      return;
    }

    setLoading(true);
    try {
      for (const deleteId of removedAdjustmentIds) {
        await axios.delete(`${API_BASE}/buyer-adjustment/${deleteId}`);
      }

      for (const adj of buyerAdjustments) {
        const payload = buildAdjustmentPayload(outward.id, unloadingDate, adj);

        if (typeof adj.id === "number") {
          await axios.put(`${API_BASE}/buyer-adjustment/${adj.id}`, payload);
        } else {
          await axios.post(`${API_BASE}/buyer-adjustment`, payload);
        }
      }

      toast.success("Buyer adjustments saved successfully", { theme: "colored" });
      if (onSave) onSave();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.error || "Failed to save adjustments", { theme: "colored" });
    } finally {
      setLoading(false);
    }
  };

  const cardStyle = {
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  };

  const labelStyle = {
    display: "block",
    fontSize: 12,
    fontWeight: 700,
    color: "#334155",
    marginBottom: 6,
  };

  const inputStyle = {
    padding: "10px 12px",
    border: "1px solid #cbd5e1",
    borderRadius: 8,
    fontSize: 13,
    boxSizing: "border-box",
  };

  const buttonStyle = {
    padding: "9px 14px",
    background: "#0f766e",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
    fontWeight: 600,
    fontSize: 13,
  };

  const gridStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
    gap: 12,
    marginBottom: 12,
  };

  const tableStyle = {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: 13,
  };

  const thStyle = {
    background: "#0f766e",
    color: "#fff",
    padding: "10px 8px",
    textAlign: "left",
    border: "1px solid #d1d5db",
  };

  const tdStyle = {
    padding: "8px",
    border: "1px solid #e5e7eb",
  };

  return (
    <div style={{ background: "#f8f9fa", padding: 20, borderRadius: 12 }}>
      <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 800, color: "#14532d" }}>
        Buyer Adjustment: {outward?.voucher_no} ({outwardQty.toFixed(2)} qty)
      </h3>
      <div style={{ marginBottom: 12, color: "#475569", fontSize: 13, fontWeight: 600 }}>
        Unloading target: {unloadingTargetQty.toFixed(2)} qty | Balance will be shown in the outward report
      </div>

      <div style={cardStyle}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <span style={labelStyle}>Outward Qty</span>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#14532d" }}>{outwardQty.toFixed(2)}</div>
          </div>
          <div>
            <span style={labelStyle}>Unloading Date</span>
            <input type="date" value={unloadingDate} onChange={(e) => setUnloadingDate(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <span style={labelStyle}>Warehouse (Unloading)</span>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#14532d" }}>{outward?.warehouse_name || outward?.warehouse || "—"}</div>
          </div>
          <div>
            <span style={labelStyle}>Product</span>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#14532d" }}>{outward?.product_name || outward?.product || "—"}</div>
          </div>
          <div>
            <span style={labelStyle}>Buyer</span>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#14532d" }}>
              {newAdjustment.buyer_name || outward?.buyer_name || outward?.buyer || "—"}
            </div>
          </div>
          <div>
            <span style={labelStyle}>Consignee</span>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#14532d" }}>
              {outward?.consignee_name || outward?.consignee || "—"}
            </div>
          </div>
          <div>
            <span style={labelStyle}>Lorry No</span>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#14532d" }}>{outward?.lorry_no || outward?.vehicle_no || "—"}</div>
          </div>
        </div>
      </div>

      <div style={cardStyle}>
        <h4 style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 700, color: "#14532d" }}>
          {editingId ? "Edit Adjustment" : "Add Buyer Adjustment"}
        </h4>

        <div style={gridStyle}>
          <div>
            <span style={labelStyle}>Buyer</span>
            <select value={newAdjustment.buyer_id} onChange={(e) => handleBuyerChange(e.target.value)} style={inputStyle}>
              <option value="">Select Buyer</option>
              {buyerNames.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <span style={labelStyle}>or Enter Name</span>
            <input
              type="text"
              value={newAdjustment.buyer_name}
              onChange={(e) =>
                setNewAdjustment((prev) => ({
                  ...prev,
                  buyer_name: e.target.value,
                  buyer_id: "",
                  consignee_name: "",
                  rate: "",
                  shortage_amount: "",
                }))
              }
              placeholder="Buyer name"
              style={inputStyle}
            />
          </div>
          <div>
            <span style={labelStyle}>Consignee *</span>
            <select
              value={newAdjustment.consignee_name}
              onChange={(e) => setNewAdjustment((prev) => ({ ...prev, consignee_name: e.target.value }))}
              style={inputStyle}
            >
              <option value="">{newAdjustment.buyer_id ? "Select consignee" : "Select buyer first"}</option>
              {(consigneeNames || [])
                .filter((item) => {
                  if (!newAdjustment.buyer_id) return true;
                  return String(item.buyer_id || "") === String(newAdjustment.buyer_id);
                })
                .map((item) => (
                  <option key={item.id} value={item.name}>
                    {item.name}
                  </option>
                ))}
            </select>
          </div>
          <div>
            <span style={labelStyle}>Unloading Qty *</span>
            <input
              type="number"
              value={newAdjustment.qty}
              onChange={(e) => setNewAdjustment((prev) => ({ ...prev, qty: e.target.value }))}
              placeholder="0.00"
              step="0.01"
              style={inputStyle}
            />
          </div>
          <div>
            <span style={labelStyle}>Shortage</span>
            <input
              type="number"
              value={newAdjustment.shortage}
              onChange={(e) => {
                const shortageValue = Number(e.target.value) || 0;
                const rateValue = Number(newAdjustment.rate) || 0;
                setNewAdjustment((prev) => ({
                  ...prev,
                  shortage: e.target.value,
                  shortage_amount: (shortageValue * rateValue).toFixed(2),
                }));
              }}
              placeholder="0.00"
              step="0.01"
              style={inputStyle}
            />
          </div>
          <div>
            <span style={labelStyle}>Shortage Amount (Auto)</span>
            <input
              type="number"
              value={newAdjustment.shortage_amount}
              onChange={(e) => setNewAdjustment((prev) => ({ ...prev, shortage_amount: e.target.value }))}
              placeholder="0.00"
              step="0.01"
              style={{ ...inputStyle, backgroundColor: "#f3f4f6", color: "#6b7280" }}
            />
          </div>
          <div>
            <span style={labelStyle}>Rate</span>
            <input
              type="number"
              value={newAdjustment.rate}
              onChange={(e) => {
                const rateValue = Number(e.target.value) || 0;
                const shortageValue = Number(newAdjustment.shortage) || 0;
                setNewAdjustment((prev) => ({
                  ...prev,
                  rate: e.target.value,
                  shortage_amount: shortageValue > 0 ? (shortageValue * rateValue).toFixed(2) : prev.shortage_amount,
                }));
              }}
              placeholder="0.00"
              step="0.01"
              style={inputStyle}
            />
          </div>
          <div>
            <span style={labelStyle}>Claim</span>
            <input
              type="number"
              value={newAdjustment.claim}
              onChange={(e) => setNewAdjustment((prev) => ({ ...prev, claim: e.target.value }))}
              placeholder="0.00"
              step="0.01"
              style={inputStyle}
            />
          </div>
          <div>
            <span style={labelStyle}>Other Deduction</span>
            <input
              type="number"
              value={newAdjustment.other_deduction}
              onChange={(e) => setNewAdjustment((prev) => ({ ...prev, other_deduction: e.target.value }))}
              placeholder="0.00"
              step="0.01"
              style={inputStyle}
            />
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button onClick={handleAddAdjustment} style={buttonStyle}>
            {editingId ? "Update" : "Add"}
          </button>
          {editingId && (
            <button
              onClick={() => {
                resetNewAdjustment();
                setEditingId(null);
              }}
              style={{ ...buttonStyle, background: "#6b7280" }}
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {buyerAdjustments.length > 0 && (
        <div style={cardStyle}>
          <h4 style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 700, color: "#14532d" }}>
            Adjustments ({buyerAdjustments.length})
          </h4>

          <div style={{ overflowX: "auto" }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>SL</th>
                  <th style={thStyle}>Buyer</th>
                  <th style={thStyle}>Consignee</th>
                  <th style={thStyle}>Unloading Qty</th>
                  <th style={thStyle}>Shortage</th>
                  <th style={thStyle}>Shortage Amt</th>
                  <th style={thStyle}>Rate</th>
                  <th style={thStyle}>Claim</th>
                  <th style={thStyle}>Deduction</th>
                  <th style={thStyle}>Net Amount</th>
                  <th style={thStyle}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {buyerAdjustments.map((adj, index) => {
                  const netAmount = Number(adj.claim || 0) + Number(adj.other_deduction || 0) + Number(adj.shortage_amount || 0);
                  return (
                    <tr key={adj.id}>
                      <td style={tdStyle}>{index + 1}</td>
                      <td style={tdStyle}>{adj.buyer_name || "—"}</td>
                      <td style={tdStyle}>{adj.consignee_name || "—"}</td>
                      <td style={tdStyle}>{Number(adj.qty || 0).toFixed(2)}</td>
                      <td style={tdStyle}>{Number(adj.shortage || 0).toFixed(2)}</td>
                      <td style={tdStyle}>{Number(adj.shortage_amount || 0).toFixed(2)}</td>
                      <td style={tdStyle}>{Number(adj.rate || 0).toFixed(2)}</td>
                      <td style={tdStyle}>{Number(adj.claim || 0).toFixed(2)}</td>
                      <td style={tdStyle}>{Number(adj.other_deduction || 0).toFixed(2)}</td>
                      <td style={tdStyle}>{netAmount.toFixed(2)}</td>
                      <td style={tdStyle}>
                        <button
                          onClick={() => handleEditAdjustment(adj.id)}
                          style={{
                            padding: "4px 8px",
                            marginRight: 4,
                            background: "#0f766e",
                            color: "#fff",
                            border: "none",
                            borderRadius: 4,
                            cursor: "pointer",
                            fontSize: 11,
                          }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteAdjustment(adj.id)}
                          style={{
                            padding: "4px 8px",
                            background: "#dc2626",
                            color: "#fff",
                            border: "none",
                            borderRadius: 4,
                            cursor: "pointer",
                            fontSize: 11,
                          }}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
            <tr style={{ background: "#f0fdf4" }}>
              <td style={{ ...tdStyle, fontWeight: 700 }}>Total</td>
              <td style={{ ...tdStyle, fontWeight: 700 }}></td>
              <td style={{ ...tdStyle, fontWeight: 700, color: isWithinTargetQty ? "#0f766e" : "#dc2626" }}>
                    {totalAdjustedQty.toFixed(2)}
                  </td>
                  <td style={{ ...tdStyle, fontWeight: 700 }}>{totalShortage.toFixed(2)}</td>
                  <td style={{ ...tdStyle, fontWeight: 700 }}>{totalShortageAmount.toFixed(2)}</td>
                  <td style={{ ...tdStyle, fontWeight: 700 }}>{averageRate.toFixed(2)}</td>
                  <td style={{ ...tdStyle, fontWeight: 700 }}>{totalClaim.toFixed(2)}</td>
                  <td style={{ ...tdStyle, fontWeight: 700 }}>{totalOtherDeduction.toFixed(2)}</td>
                  <td style={{ ...tdStyle, fontWeight: 700 }}>{totalAmount.toFixed(2)}</td>
                  <td style={tdStyle}></td>
                </tr>
                {remainingQty > 0.0001 && (
                  <tr style={{ background: "#fef2f2" }}>
                    <td colSpan={10} style={{ ...tdStyle, color: "#dc2626", fontWeight: 700, textAlign: "center" }}>
                      Remaining: {remainingQty.toFixed(2)} qty
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        <button
          onClick={handleSave}
          disabled={!isWithinTargetQty || buyerAdjustments.length === 0 || loading}
          style={{
            ...buttonStyle,
            background: isWithinTargetQty && buyerAdjustments.length > 0 ? "#0f766e" : "#cbd5e1",
            cursor: isWithinTargetQty && buyerAdjustments.length > 0 && !loading ? "pointer" : "not-allowed",
          }}
        >
          {loading ? "Saving..." : "Save Adjustments"}
        </button>
        <button onClick={onClose} style={{ ...buttonStyle, background: "#6b7280" }}>
          Close
        </button>
      </div>
    </div>
  );
}

