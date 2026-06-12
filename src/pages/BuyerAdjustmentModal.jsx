import React from "react";
import BuyerAdjustmentForm from "./BuyerAdjustmentForm";

export default function BuyerAdjustmentModal({ isOpen, outward, onClose, buyerNames = [], consigneeNames = [], onSave }) {
  if (!isOpen || !outward) return null;

  const modalStyle = {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(0, 0, 0, 0.6)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10000,
    overflowY: "auto",
    padding: 20,
  };

  const contentStyle = {
    background: "#fff",
    borderRadius: 12,
    padding: 0,
    maxWidth: 1200,
    width: "100%",
    boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
  };

  return (
    <div style={modalStyle} onClick={onClose}>
      <div style={contentStyle} onClick={(e) => e.stopPropagation()}>
        <BuyerAdjustmentForm
          outward={outward}
          onClose={onClose}
          buyerNames={buyerNames}
          consigneeNames={consigneeNames}
          onSave={onSave}
        />
      </div>
    </div>
  );
}
