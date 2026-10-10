import React, { useMemo, useRef, useState } from "react";

export default function MultiSelectDropdown({
  label,
  options = [],
  value = [],
  onChange,
  placeholder = "Select items",
  accent = "#0f766e",
  searchable = true,
  maxHeight = 220,
  containerStyle = {},
  openOnType = false,
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const rootRef = useRef(null);

  const normalizedOptions = useMemo(
    () =>
      (options || []).map((option) => ({
        ...option,
        value: String(option?.value ?? "").trim(),
        label: String(option?.label ?? "").trim(),
      })),
    [options]
  );

  const selectedValues = useMemo(() => {
    if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
    if (value === null || value === undefined || value === "") return [];
    return [String(value).trim()].filter(Boolean);
  }, [value]);

  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return normalizedOptions;
    return normalizedOptions.filter((option) => option.label.toLowerCase().includes(query));
  }, [normalizedOptions, search]);

  const selectedLabels = useMemo(
    () =>
      normalizedOptions
        .filter((option) => selectedValues.includes(String(option.value)))
        .map((option) => option.label),
    [normalizedOptions, selectedValues]
  );

  const toggleValue = (nextValue) => {
    const safeValue = String(nextValue);
    const nextSelected = selectedValues.includes(safeValue)
      ? selectedValues.filter((item) => item !== safeValue)
      : [...selectedValues, safeValue];
    onChange?.(nextSelected);
  };

  const clearAll = () => {
    onChange?.([]);
    if (openOnType) {
      setSearch("");
    }
  };

  return (
    <div ref={rootRef} style={{ position: "relative", minWidth: 220, flex: "1 1 220px", ...containerStyle }}>
      {label ? (
        <div style={{ marginBottom: 6, fontSize: 12, fontWeight: 700, color: "#475569" }}>{label}</div>
      ) : null}
      {openOnType ? (
        <>
          <input
            type="text"
            value={search}
            onChange={(event) => {
              const query = event.target.value;
              setSearch(query);
              setOpen(true);
            }}
            onClick={() => setOpen(true)}
            onFocus={() => setOpen(true)}
            placeholder={placeholder}
            aria-label={`Search ${label || placeholder}`}
            style={{
              width: "100%",
              boxSizing: "border-box",
              height: 42,
              padding: "9px 12px",
              borderRadius: 10,
              border: `1px solid ${open ? accent : "#cbd5e1"}`,
              background: "#fff",
              color: "#0f172a",
              fontSize: 14,
              outline: "none",
              boxShadow: open ? `0 0 0 3px ${accent}22` : "none",
            }}
          />
          {selectedLabels.length ? (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginTop: 6, color: "#166534", fontSize: 11 }}>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {selectedLabels.length} selected: {selectedLabels.join(", ")}
              </span>
              <button
                type="button"
                onClick={clearAll}
                style={{ flexShrink: 0, padding: 0, border: 0, background: "transparent", color: "#15803d", cursor: "pointer", fontWeight: 700 }}
              >
                Clear
              </button>
            </div>
          ) : null}
        </>
      ) : (
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          style={{
            width: "100%",
            padding: "11px 12px",
            borderRadius: 10,
            border: "1px solid #cbd5e1",
            background: "#fff",
            fontSize: 14,
            textAlign: "left",
            cursor: "pointer",
            boxShadow: open ? `0 0 0 3px ${accent}22` : "none",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
            <span style={{ color: selectedLabels.length ? "#0f172a" : "#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {selectedLabels.length ? selectedLabels.join(", ") : placeholder}
            </span>
            <span style={{ color: accent, fontWeight: 700 }}>{selectedLabels.length || 0}</span>
          </div>
        </button>
      )}

      {open ? (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            left: 0,
            right: 0,
            zIndex: 30,
            background: "#f0fdf4",
            border: "1px solid #86c9a5",
            borderRadius: 12,
            boxShadow: "0 18px 40px rgba(15, 23, 42, 0.14)",
            overflow: "hidden",
          }}
        >
          <div style={{ padding: 12, borderBottom: "1px solid #bbf7d0", background: "#dcfce7" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
              <strong style={{ fontSize: 13, color: "#0f172a" }}>{label || placeholder}</strong>
              <button
                type="button"
                onClick={clearAll}
                style={{ border: "none", background: "transparent", color: accent, cursor: "pointer", fontWeight: 700 }}
              >
                Clear
              </button>
            </div>
            {searchable && !openOnType ? (
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..."
                style={{
                  width: "100%",
                  marginTop: 10,
                  padding: "9px 10px",
                  border: "1px solid #cbd5e1",
                  borderRadius: 8,
                  fontSize: 13,
                  boxSizing: "border-box",
                }}
              />
            ) : null}
          </div>

          <div style={{ maxHeight, overflowY: "auto", padding: 8 }}>
            {filteredOptions.length ? (
              filteredOptions.map((option) => {
                const checked = selectedValues.includes(option.value);
                return (
                  <label
                    key={option.value}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "8px 10px",
                      borderRadius: 8,
                      cursor: "pointer",
                      background: checked ? `${accent}12` : "transparent",
                      color: "#0f172a",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleValue(option.value)}
                      style={{ accentColor: accent }}
                    />
                    <span>{option.label}</span>
                  </label>
                );
              })
            ) : (
              <div style={{ padding: "10px 12px", color: "#64748b", fontSize: 13 }}>No items found</div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
