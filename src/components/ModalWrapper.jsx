// src/components/ModalWrapper.jsx
import React from "react";

export default function ModalWrapper({ children, onClose, width = "50%" }) {
  return (
    <>
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          backdropFilter: "blur(6px)",
          backgroundColor: "rgba(0,0,0,0.35)",
          zIndex: 999,
        }}
        onClick={onClose}
      ></div>

      <div
        style={{
          position: "fixed",
          top: "5%",
          left: "50%",
          transform: "translateX(-50%)",
          background: "#fff",
          padding: "20px",
          borderRadius: "12px",
          width: width,
          maxHeight: "90vh",
          overflowY: "auto",
          zIndex: 1000,
        }}
      >
        {children}
      </div>
    </>
  );
}
