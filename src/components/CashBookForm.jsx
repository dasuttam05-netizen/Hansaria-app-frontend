import React, { useEffect, useState } from "react";
import axios from "axios";
import ModalWrapper from "./ModalWrapper";

export default function CashBookForm({ isOpen, onClose, onSubmit, entry, warehouses, companies, loading }) {
  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(e);
  };

  const inputStyle = {
    width: "100%",
    padding: "8px 10px",
    border: "1px solid #cbd5e1",
    borderRadius: 6,
    fontSize: 13,
    marginBottom: 8,
    fontFamily: "inherit",
  };

  const labelStyle = {
    display: "block",
    fontSize: 12,
    fontWeight: 600,
    marginBottom: 3,
    color: "#1e293b",
  };

  const rowStyle = {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 10,
    marginBottom: 8,
  };

  const fullWidthStyle = { gridColumn: "1 / -1" };

  return (
    <ModalWrapper onClose={onClose} width="48%">
      <div style={{ marginBottom: 16 }}>
        <h3 style={{ margin: "0 0 4px", fontSize: 16, color: "#1e293b", fontWeight: 600 }}>
          Cash Entry
        </h3>
        <p style={{ margin: 0, color: "#64748b", fontSize: 12 }}>
          Record cash income or expense
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={rowStyle}>
          <div>
            <label style={labelStyle}>Date *</label>
            <input
              type="date"
              name="entry_date"
              value={entry.entry_date}
              onChange={(e) => entry.entry_date = e.target.value}
              style={inputStyle}
              required
            />
          </div>
          <div>
            <label style={labelStyle}>Type *</label>
            <select
              name="entry_type"
              value={entry.entry_type}
              onChange={(e) => entry.entry_type = e.target.value}
              style={inputStyle}
              required
            >
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </select>
          </div>
        </div>

        <div style={rowStyle}>
          <div>
            <label style={labelStyle}>Amount *</label>
            <input
              type="number"
              name="amount"
              placeholder="0.00"
              value={entry.amount}
              onChange={(e) => entry.amount = e.target.value}
              style={inputStyle}
              required
              step="0.01"
            />
          </div>
          <div>
            <label style={labelStyle}>Warehouse</label>
            <select
              name="warehouse_id"
              value={entry.warehouse_id}
              onChange={(e) => entry.warehouse_id = e.target.value}
              style={inputStyle}
            >
              <option value="">Select Warehouse</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={rowStyle}>
          <div>
            <label style={labelStyle}>Company/Party</label>
            <select
              name="company_id"
              value={entry.company_id}
              onChange={(e) => entry.company_id = e.target.value}
              style={inputStyle}
            >
              <option value="">Select Company</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Payment Method</label>
            <select
              name="payment_method"
              value={entry.payment_method}
              onChange={(e) => entry.payment_method = e.target.value}
              style={inputStyle}
            >
              <option value="Cash">Cash</option>
              <option value="Check">Check</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="Online">Online</option>
            </select>
          </div>
        </div>

        <div>
          <label style={labelStyle}>Description *</label>
          <input
            type="text"
            name="description"
            placeholder="Entry description"
            value={entry.description}
            onChange={(e) => entry.description = e.target.value}
            style={inputStyle}
            required
          />
        </div>

        <div style={rowStyle}>
          <div>
            <label style={labelStyle}>Reference No</label>
            <input
              type="text"
              name="reference_no"
              placeholder="Check/Bank ref"
              value={entry.reference_no}
              onChange={(e) => entry.reference_no = e.target.value}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Voucher No</label>
            <input
              type="text"
              name="voucher_no"
              placeholder="Auto-generated"
              value={entry.voucher_no}
              onChange={(e) => entry.voucher_no = e.target.value}
              style={inputStyle}
            />
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <button
            type="submit"
            disabled={loading}
            style={{
              flex: 1,
              padding: "8px 14px",
              background: "#0f766e",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              fontWeight: 600,
              cursor: "pointer",
              fontSize: 13,
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? "Saving..." : "Save Entry"}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            style={{
              flex: 1,
              padding: "8px 14px",
              background: "#94a3b8",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              fontWeight: 600,
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            Cancel
          </button>
        </div>
      </form>
    </ModalWrapper>
  );
}
