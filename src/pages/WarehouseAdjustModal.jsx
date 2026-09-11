import React, { useEffect, useMemo, useRef, useState } from "react";

function WarehouseAdjustModal({
  title,
  subtitle,
  summaryItems,
  controls,
  actionButton,
  tableCard,
  reportHeaderRowStyle,
  th,
  td,
  rows,
  columns,
  emptyText,
  onClose,
  onClear,
  onConfirm,
  confirmDisabled,
  onAutoAdjust,
  autoAdjustLabel = "Auto Adjust",
  billSearch = "",
  onBillSearchChange,
  selectedRowKey = "",
  onRowSelect,
  onEnterAdjust,
  getRowSearchText,
  getRowKey,
}) {
  const searchInputRef = useRef(null);
  const [localSearch, setLocalSearch] = useState(billSearch || "");
  const [keyboardIndex, setKeyboardIndex] = useState(-1);

  useEffect(() => {
    setLocalSearch(billSearch || "");
  }, [billSearch]);

  const getKey = (row, index) => {
    if (getRowKey) {
      const value = getRowKey(row, index);
      if (value !== undefined && value !== null && String(value).trim()) {
        return String(value);
      }
    }

    return String(
      row?.key ??
      row?.id ??
      row?._id ??
      row?.purchase_id ??
      row?.voucher_no ??
      row?.bill_no ??
      index
    );
  };

  const getSearchValue = (row, index) => {
    if (getRowSearchText) {
      return String(getRowSearchText(row, index) || "").toLowerCase();
    }

    return [
      row?.voucher_no,
      row?.bill_no,
      row?.purchase_voucher_no,
      row?.purchase_bill_no,
      row?.farmer_name,
      row?.party_name,
      row?.company_name,
      row?.company_account_name,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
  };

  const filteredRows = useMemo(() => {
    const query = String(localSearch || "").trim().toLowerCase();
    const sourceRows = Array.isArray(rows) ? rows : [];

    if (!query) return sourceRows;

    return sourceRows.filter((row, index) =>
      getSearchValue(row, index).includes(query)
    );
  }, [rows, localSearch]);

  const selectedIndex = useMemo(() => {
    if (!selectedRowKey) return -1;

    return filteredRows.findIndex(
      (row, index) => getKey(row, index) === String(selectedRowKey)
    );
  }, [filteredRows, selectedRowKey]);

  useEffect(() => {
    if (!filteredRows.length) {
      setKeyboardIndex(-1);
      return;
    }

    if (selectedIndex >= 0) {
      setKeyboardIndex(selectedIndex);
      return;
    }

    setKeyboardIndex((current) => {
      if (current < 0) return 0;
      return Math.min(current, filteredRows.length - 1);
    });
  }, [filteredRows, selectedIndex]);

  const selectRow = (row, index, { enter = false } = {}) => {
    if (!row) return;

    const key = getKey(row, index);
    setKeyboardIndex(index);

    if (onRowSelect) {
      onRowSelect(row, key);
    }

    if (enter && onEnterAdjust) {
      onEnterAdjust(row, key);
    }
  };

  const handleSearchChange = (event) => {
    const value = event.target.value;
    setLocalSearch(value);
    setKeyboardIndex(value ? 0 : -1);

    if (onBillSearchChange) {
      onBillSearchChange(value);
    }
  };

  const handleSearchKeyDown = (event) => {
    if (!filteredRows.length) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      const next = keyboardIndex < 0
        ? 0
        : Math.min(keyboardIndex + 1, filteredRows.length - 1);
      setKeyboardIndex(next);
      selectRow(filteredRows[next], next);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      const next = keyboardIndex <= 0 ? 0 : keyboardIndex - 1;
      setKeyboardIndex(next);
      selectRow(filteredRows[next], next);
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      const index = selectedIndex >= 0
        ? selectedIndex
        : keyboardIndex >= 0
          ? keyboardIndex
          : 0;
      selectRow(filteredRows[index], index, { enter: true });
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      searchInputRef.current?.blur();
    }
  };

  const handleAutoAdjust = () => {
    const index = selectedIndex >= 0
      ? selectedIndex
      : keyboardIndex >= 0
        ? keyboardIndex
        : 0;
    const selectedRow = filteredRows[index] || null;
    onAutoAdjust?.(selectedRow);
  };

  return (
    <div style={tableCard}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <div>
          <h3 style={{ margin: 0 }}>{title}</h3>
          <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>{subtitle}</div>
        </div>
        <button type="button" onClick={onClose} style={{ ...actionButton, background: "#64748b" }}>
          Close
        </button>
      </div>

      {controls}

      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
        <label style={{ fontSize: 13, fontWeight: 700, color: "#334155", whiteSpace: "nowrap" }}>
          Bill No Search
        </label>
        <input
          ref={searchInputRef}
          type="text"
          value={localSearch}
          onChange={handleSearchChange}
          onKeyDown={handleSearchKeyDown}
          placeholder="Type Bill No..."
          autoComplete="off"
          style={{
            height: 36,
            minWidth: 220,
            flex: "1 1 240px",
            border: "1px solid #cbd5e1",
            borderRadius: 7,
            padding: "0 10px",
            fontSize: 13,
            outline: "none",
          }}
        />
        <span style={{ fontSize: 12, color: "#64748b", whiteSpace: "nowrap" }}>
          ↑ ↓ Select · Enter Adjust
        </span>
      </div>

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: controls ? 10 : 14, fontSize: 13 }}>
        {summaryItems}
      </div>

      <div style={{ marginTop: 14, maxHeight: "55vh", overflow: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={reportHeaderRowStyle}>
              <th style={{ ...th, width: 42, textAlign: "center" }}>Sel</th>
              {columns.map((col) => (
                <th key={col.key} style={th}>{col.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row, index) => {
              const rowKey = getKey(row, index);
              const isSelected = String(selectedRowKey || "") === rowKey;
              const isKeyboardSelected = keyboardIndex === index;

              return (
                <tr
                  key={rowKey}
                  onClick={() => selectRow(row, index)}
                  style={{
                    cursor: "pointer",
                    background: isSelected ? "#ecfdf5" : isKeyboardSelected ? "#f8fafc" : "transparent",
                    outline: isSelected ? "2px solid #10b981" : "none",
                    outlineOffset: -2,
                  }}
                >
                  <td style={{ ...td, width: 42, textAlign: "center", fontWeight: 800, color: isSelected ? "#059669" : "#94a3b8" }}>
                    {isSelected ? "▶" : ""}
                  </td>
                  {columns.map((col) => (
                    <td key={col.key} style={td}>{col.render(row)}</td>
                  ))}
                </tr>
              );
            })}
            {filteredRows.length === 0 && (
              <tr>
                <td colSpan={columns.length + 1} style={{ ...td, textAlign: "center", padding: 20 }}>
                  {localSearch ? "No matching pending bill found." : emptyText}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 8 }}>
          {onAutoAdjust && (
            <button type="button" onClick={handleAutoAdjust} style={{ ...actionButton, background: "#0f766e" }}>
              {autoAdjustLabel}
            </button>
          )}
          <button type="button" onClick={onClear} style={{ ...actionButton, background: "#64748b" }}>
            Clear
          </button>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            onClick={onConfirm}
            disabled={confirmDisabled}
            style={{
              ...actionButton,
              background: "#2563eb",
              opacity: confirmDisabled ? 0.55 : 1,
              cursor: confirmDisabled ? "not-allowed" : "pointer",
            }}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

export default React.memo(WarehouseAdjustModal);
