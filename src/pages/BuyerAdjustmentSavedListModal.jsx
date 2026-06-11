import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";

export default function BuyerAdjustmentSavedListModal({ isOpen, onClose, onSelectOutward }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const API_BASE = "/api";

  useEffect(() => {
    if (isOpen) {
      fetchEntriesWithAdjustments();
    }
  }, [isOpen]);

  const fetchEntriesWithAdjustments = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await axios.get(`${API_BASE}/buyer-adjustment/with-adjustments`);
      setEntries(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Error fetching adjusted entries:", err);
      const message = err?.response?.data?.error || err?.message || "Failed to load adjusted entries";
      setError(message);
      toast.error(message, { theme: "colored" });
      setEntries([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredEntries = searchTerm
    ? entries.filter(
        (e) =>
          String(e.outward_id).includes(searchTerm) ||
          (e.voucher_no || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
          (e.buyer_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
          (e.product_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
          (e.warehouse_name || "").toLowerCase().includes(searchTerm.toLowerCase())
      )
    : entries;

  const handleSelectEntry = (entry) => {
    onSelectOutward({ ...entry, id: entry.outward_id });
    onClose();
  };

  if (!isOpen) return null;

  const modalStyle = {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(0, 0, 0, 0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
  };

  const contentStyle = {
    background: "#fff",
    borderRadius: 12,
    padding: 24,
    maxWidth: 1000,
    width: "90%",
    maxHeight: "80vh",
    overflowY: "auto",
    boxShadow: "0 20px 60px rgba(0, 0, 0, 0.2)",
  };

  const headerStyle = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  };

  const titleStyle = {
    margin: 0,
    fontSize: 24,
    fontWeight: 800,
    color: "#14532d",
  };

  const closeButtonStyle = {
    background: "none",
    border: "none",
    fontSize: 24,
    cursor: "pointer",
    color: "#666",
  };

  const searchStyle = {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 8,
    border: "1px solid #cbd5e1",
    fontSize: 14,
    marginBottom: 16,
  };

  const tableStyle = {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: 13,
  };

  const thStyle = {
    background: "#0f766e",
    color: "#fff",
    padding: "12px 10px",
    textAlign: "left",
    border: "1px solid #d1d5db",
    fontWeight: 700,
  };

  const tdStyle = {
    padding: "10px",
    border: "1px solid #e5e7eb",
    background: "#fff",
  };

  const rowStyle = {
    cursor: "pointer",
    transition: "background-color 0.2s",
  };

  return (
    <div style={modalStyle} onClick={onClose}>
      <div style={contentStyle} onClick={(e) => e.stopPropagation()}>
        <div style={headerStyle}>
          <h2 style={titleStyle}>Select Saved Buyer Adjustment Entry</h2>
          <button style={closeButtonStyle} onClick={onClose}>
            ×
          </button>
        </div>

        <input
          type="text"
          placeholder="Search by Outward ID, Voucher No, Buyer, Product, or Warehouse..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={searchStyle}
        />

        {loading ? (
          <div style={{ textAlign: "center", padding: "20px", color: "#666" }}>
            Loading adjusted entries...
          </div>
        ) : error ? (
          <div style={{ textAlign: "center", padding: "20px", color: "#dc2626" }}>
            {error}
          </div>
        ) : filteredEntries.length === 0 ? (
          <div style={{ textAlign: "center", padding: "20px", color: "#666" }}>
            {entries.length === 0 ? "No saved buyer adjustment entries found." : "No matching entries."}
          </div>
        ) : (
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Outward ID</th>
                <th style={thStyle}>Voucher No</th>
                <th style={thStyle}>Date</th>
                <th style={thStyle}>Product</th>
                <th style={thStyle}>Buyer</th>
                <th style={thStyle}>Qty</th>
                <th style={thStyle}>Shortage</th>
                <th style={thStyle}>Rate</th>
                <th style={thStyle}>Claim</th>
                <th style={thStyle}>Deduction</th>
                <th style={thStyle}>Warehouse</th>
                <th style={thStyle}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredEntries.map((entry) => (
                <tr
                  key={`${entry.outward_id}-${entry.adjustment_id}`}
                  style={rowStyle}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f0f9ff")}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                >
                  <td style={tdStyle}>{entry.outward_id}</td>
                  <td style={tdStyle}>{entry.voucher_no || "—"}</td>
                  <td style={tdStyle}>{entry.date ? new Date(entry.date).toLocaleDateString() : "—"}</td>
                  <td style={tdStyle}>{entry.product_name || "—"}</td>
                  <td style={tdStyle}>{entry.buyer_name || "—"}</td>
                  <td style={tdStyle}>{Number(entry.qty || 0).toFixed(2)}</td>
                  <td style={tdStyle}>{Number(entry.shortage || 0).toFixed(2)}</td>
                  <td style={tdStyle}>{Number(entry.rate || 0).toFixed(2)}</td>
                  <td style={tdStyle}>{Number(entry.claim || 0).toFixed(2)}</td>
                  <td style={tdStyle}>{Number(entry.other_deduction || 0).toFixed(2)}</td>
                  <td style={tdStyle}>{entry.warehouse_name || "—"}</td>
                  <td style={tdStyle}>
                    <button
                      onClick={() => handleSelectEntry(entry)}
                      style={{
                        padding: "6px 12px",
                        background: "#0f766e",
                        color: "#fff",
                        border: "none",
                        borderRadius: 6,
                        cursor: "pointer",
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      Select
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
