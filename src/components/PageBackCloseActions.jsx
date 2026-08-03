import React from "react";

function defaultCanGoBack() {
  return typeof window !== "undefined" && window.history.length > 1;
}

function handleCloseWithFallback(fallbackNavigate) {
  if (typeof window !== "undefined" && window.opener) {
    window.close();
    if (!window.closed) {
      fallbackNavigate();
    }
    return;
  }
  fallbackNavigate();
}

export default function PageBackCloseActions({
  navigate,
  fallbackPath = "/dashboard",
  size = "regular",
}) {
  const compact = size === "compact";
  const buttonBaseStyle = compact
    ? {
        padding: "8px 14px",
        borderRadius: 6,
        fontSize: 13,
      }
    : {
        padding: "10px 16px",
        borderRadius: 8,
        fontSize: 14,
      };

  const goFallback = () => navigate(fallbackPath);
  const goBack = () => {
    if (defaultCanGoBack()) {
      navigate(-1);
      return;
    }
    goFallback();
  };
  const closePage = () => handleCloseWithFallback(goFallback);

  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      <button
        type="button"
        onClick={goBack}
        style={{
          ...buttonBaseStyle,
          background: "#6366f1",
          color: "#fff",
          border: "none",
          cursor: "pointer",
          fontWeight: 700,
          whiteSpace: "nowrap",
        }}
      >
        Back
      </button>
      <button
        type="button"
        onClick={closePage}
        style={{
          ...buttonBaseStyle,
          background: "#dc2626",
          color: "#fff",
          border: "1px solid #b91c1c",
          cursor: "pointer",
          fontWeight: 800,
          whiteSpace: "nowrap",
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          boxShadow: "0 2px 6px rgba(220, 38, 38, 0.22)",
        }}
        title="Close page"
      >
        <span aria-hidden="true" style={{ fontSize: 15, lineHeight: 1 }}>✕</span>
        <span>Close</span>
      </button>
    </div>
  );
}
