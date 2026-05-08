import React from "react";

export default function ReportSectionToggles({ title = "Show Sections", options = [], value = [], onChange, accent = "#0f766e" }) {
  const selected = Array.isArray(value) ? value : [];

  const toggle = (key) => {
    const next = selected.includes(key) ? selected.filter((item) => item !== key) : [...selected, key];
    onChange?.(next);
  };

  return (
    <div
      style={{
        border: "1px solid #dbe4ea",
        borderRadius: 14,
        padding: 14,
        background: "#fff",
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 800, color: "#0f172a", marginBottom: 10 }}>{title}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        {options.map((option) => {
          const checked = selected.includes(option.key);
          return (
            <label
              key={option.key}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                border: `1px solid ${checked ? accent : "#cbd5e1"}`,
                color: checked ? accent : "#334155",
                background: checked ? `${accent}10` : "#f8fafc",
                borderRadius: 999,
                padding: "8px 12px",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggle(option.key)}
                style={{ accentColor: accent }}
              />
              <span>{option.label}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
