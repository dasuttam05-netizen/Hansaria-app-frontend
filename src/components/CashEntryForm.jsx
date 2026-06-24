import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import ModalWrapper from "./ModalWrapper";
import { getApiOrigin } from "../utils/api";

const API_BASE = getApiOrigin();

const ENTRY_MODES = [
  { key: "journal", label: "Journal" },
  { key: "receipt", label: "Receipt" },
  { key: "payment", label: "Payment" },
];

const shellStyle = {
  border: "1px solid #d7dce4",
  borderRadius: 10,
  background: "#f8fafc",
  overflow: "hidden",
};

const topBarStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 10,
  padding: "8px 12px",
  borderBottom: "1px solid #d7dce4",
  background: "#ffffff",
  flexWrap: "wrap",
};

const tabButtonStyle = (active) => ({
  border: active ? "1px solid #0f766e" : "1px solid #cbd5e1",
  background: active ? "#dff6f0" : "#fff",
  color: active ? "#0f766e" : "#334155",
  borderRadius: 16,
  padding: "4px 12px",
  fontSize: 12,
  fontWeight: 700,
  cursor: "pointer",
});

const titleStyle = {
  margin: 0,
  fontSize: 22,
  lineHeight: 1,
  color: "#446b24",
  fontWeight: 700,
  letterSpacing: 0.3,
  fontFamily: "Georgia, Times New Roman, serif",
};

const topMetaStyle = {
  fontSize: 13,
  color: "#334155",
  display: "flex",
  gap: 16,
  flexWrap: "wrap",
  alignItems: "center",
};

const sectionStyle = {
  borderTop: "1px solid #d7dce4",
  padding: 10,
  background: "#ffffff",
};
const topControlRowStyle = {
  display: "flex",
  justifyContent: "flex-start",
  alignItems: "center",
  gap: 10,
  padding: "8px 12px",
  background: "#f8fafc",
  borderBottom: "1px solid #d7dce4",
  flexWrap: "wrap",
};

const cardGridStyle = {
  display: "grid",
  gridTemplateColumns: "minmax(380px, 1fr) minmax(280px, 0.7fr)",
  gap: 10,
};

const cardStyle = {
  border: "1px solid #d7dce4",
  borderRadius: 8,
  padding: 10,
  background: "#f8fafc",
};

const rowStyle = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 10,
  marginBottom: 8,
};

const entryAmountRowStyle = {
  display: "grid",
  gridTemplateColumns: "1fr 210px",
  gap: 10,
  marginBottom: 6,
};

const detailsGridStyle = {
  display: "grid",
  gridTemplateColumns: "1fr 320px",
  gap: 10,
  alignItems: "start",
};

const receivedBoxWrapStyle = {
  border: "1px solid #d7dce4",
  borderRadius: 8,
  background: "#ffffff",
  padding: 10,
};

const receivedAmountStyle = {
  border: "1px solid #d7dce4",
  borderRadius: 8,
  background: "#f8fafc",
  textAlign: "right",
  fontSize: 28,
  fontWeight: 700,
  letterSpacing: 0.5,
  color: "#1e293b",
  padding: "6px 8px",
  marginTop: 6,
};

const inputStyle = {
  width: "100%",
  padding: "6px 8px",
  border: "1px solid #cbd5e1",
  borderRadius: 4,
  fontSize: 12,
  marginBottom: 4,
  fontFamily: "inherit",
  background: "#ffffff",
};

const labelStyle = {
  display: "block",
  fontSize: 11,
  fontWeight: 600,
  marginBottom: 2,
  color: "#334155",
};

const buttonRowStyle = {
  display: "flex",
  gap: 8,
  marginTop: 8,
};

const submitButtonStyle = (loading) => ({
  flex: 1,
  padding: "8px 10px",
  background: "#117a1e",
  color: "#fff",
  border: "none",
  borderRadius: 4,
  fontWeight: 600,
  cursor: "pointer",
  fontSize: 13,
  opacity: loading ? 0.6 : 1,
});

const cancelButtonStyle = {
  flex: 1,
  padding: "8px 10px",
  background: "#64748b",
  color: "#fff",
  border: "none",
  borderRadius: 4,
  fontWeight: 600,
  cursor: "pointer",
  fontSize: 13,
};

const getRecordId = (record) => {
  if (!record) return "";
  if (typeof record === "string" || typeof record === "number") return String(record);
  return String(record.id || record._id || "");
};

export default function CashEntryForm({
  isOpen,
  onClose,
  onSubmit,
  formData,
  onFormChange,
  isEditMode,
  warehouses = [],
  companies = [],
  employees = [],
  agingRows = [],
  adjustments = {},
  onAdjustmentChange = () => {},
  onEditVoucher = null,
  loading,
}) {
  const [showAdjustmentPanel, setShowAdjustmentPanel] = useState(false);
  const [adjustmentTab, setAdjustmentTab] = useState("pending");
  const [pendingVoucherRows, setPendingVoucherRows] = useState([]);
  const [allVoucherRows, setAllVoucherRows] = useState([]);
  const [allVoucherLoading, setAllVoucherLoading] = useState(false);
  const journalNameOptions = [
    ...companies.map((c) => ({ value: `party:${getRecordId(c)}`, label: `Party: ${c.name}` })),
    ...employees.map((e) => ({ value: `employee:${getRecordId(e)}`, label: `Employee: ${e.name}` })),
  ];
  const hasOptionValue = (rows, value) =>
    !!value && rows.some((row) => String(getRecordId(row)) === String(value));
  const currentCompanyFallback =
    formData.company_id && !hasOptionValue(companies, formData.company_id)
      ? {
          value: String(formData.company_id),
          label: formData.company_name || formData.company || `Party ${formData.company_id}`,
        }
      : null;
  const currentWarehouseFallback =
    formData.warehouse_id && !hasOptionValue(warehouses, formData.warehouse_id)
      ? {
          value: String(formData.warehouse_id),
          label: formData.warehouse_name || `Warehouse ${formData.warehouse_id}`,
        }
      : null;
  const currentEmployeeFallback =
    formData.employee_id && !hasOptionValue(employees, formData.employee_id)
      ? {
          value: String(formData.employee_id),
          label: formData.employee_name || `Employee ${formData.employee_id}`,
        }
      : null;

  const selectedMode = formData.transaction_mode || "receipt";
  const modeLabel = ENTRY_MODES.find((m) => m.key === selectedMode)?.label || "Receipt";
  const isExpense = formData.entry_type === "expense";
  const isJournal = selectedMode === "journal";
  const isEmployeeTransfer = formData.journal_transfer_kind === "employee_to_employee";
  const effectiveJournalOptions = isEmployeeTransfer
    ? employees.map((e) => ({ value: `employee:${getRecordId(e)}`, label: `Employee: ${e.name}` }))
    : journalNameOptions;
  const employeeAccent =
    selectedMode === "journal"
      ? { borderColor: "#0f766e", background: "#ecfeff" }
      : selectedMode === "payment"
      ? { borderColor: "#b45309", background: "#fff7ed" }
      : { borderColor: "#15803d", background: "#ecfdf5" };
  const employeePillStyle = {
    ...tabButtonStyle(Boolean(formData.employee_id)),
    ...employeeAccent,
    padding: "0",
    overflow: "hidden",
    display: "flex",
    alignItems: "center",
    minHeight: 30,
  };

  const setFieldValue = (name, value) => {
    onFormChange({ target: { name, value } });
  };

  const handleModeChange = (mode) => {
    setFieldValue("transaction_mode", mode);
    if (mode === "receipt") setFieldValue("entry_type", "income");
    if (mode === "payment") setFieldValue("entry_type", "expense");
    if (mode === "journal") setFieldValue("entry_type", "journal");
    if (mode !== "journal") {
      setFieldValue("journal_transfer_kind", "");
      setFieldValue("journal_debit_name", "");
      setFieldValue("journal_credit_name", "");
    }
  };
  const handleEmployeeTransferMode = () => {
    setFieldValue("transaction_mode", "journal");
    setFieldValue("entry_type", "journal");
    setFieldValue("journal_transfer_kind", "employee_to_employee");
    setFieldValue("journal_debit_name", "");
    setFieldValue("journal_credit_name", "");
  };

  const amountNum = Number(formData.amount || 0);
  const amountDisplay = Number.isFinite(amountNum)
    ? amountNum.toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : "0.00";

  const locationDisplay =
    warehouses.find((w) => String(w.id) === String(formData.warehouse_id))?.name || "Select";

  const totalAdjusted = Object.values(adjustments || {}).reduce(
    (sum, value) => sum + Number(value || 0),
    0
  );
  const unallocatedAmount = Math.max(0, amountNum - totalAdjusted);
  const selectedAdjustmentRows = (agingRows || [])
    .map((row) => {
      const adjustNow = Number(adjustments?.[row.id] || 0);
      const pending = Number(row.pending_amount || 0);
      return {
        ...row,
        adjust_now: adjustNow,
        pending_after: Math.max(0, pending - adjustNow),
      };
    })
    .filter((row) => row.adjust_now > 0);
  const effectivePendingRows = pendingVoucherRows.length ? pendingVoucherRows : agingRows;
  const totalOutstanding = (effectivePendingRows || []).reduce(
    (sum, row) => sum + Number(row.pending_amount || 0),
    0
  );
  const adjustmentPanelRows = adjustmentTab === "all" ? allVoucherRows : effectivePendingRows;
  const displayRows = useMemo(
    () =>
      (adjustmentPanelRows || []).map((row) => {
        const adjustNow = Number(adjustments?.[row.id] || 0);
        const pending = Number(row.pending_amount || 0);
        return {
          ...row,
          adjust_now: adjustNow,
          pending_after: Math.max(0, pending - adjustNow),
        };
      }),
    [adjustmentPanelRows, adjustments]
  );

  const loadVoucherRows = async (tab = "pending") => {
    if (!formData.company_id) {
      if (tab === "all") setAllVoucherRows([]);
      else setPendingVoucherRows([]);
      return;
    }
    setAllVoucherLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/cash-entries/aging/company/${formData.company_id}`, {
        params: {
          entry_type: formData.entry_type || undefined,
          source_entry_id: formData.id || undefined,
          include_all: tab === "all" ? 1 : 0,
        },
      });
      if (tab === "all") setAllVoucherRows(Array.isArray(res.data) ? res.data : []);
      else setPendingVoucherRows(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Voucher load failed:", err);
      if (tab === "all") setAllVoucherRows([]);
      else setPendingVoucherRows([]);
    } finally {
      setAllVoucherLoading(false);
    }
  };

  const openAdjustmentPanel = async (tab = "pending") => {
    setAdjustmentTab(tab);
    setShowAdjustmentPanel(true);
    await loadVoucherRows(tab);
  };

  useEffect(() => {
    const onKeyDown = (event) => {
      if (!isOpen) return;
      if (event.key === "F2") {
        event.preventDefault();
        openAdjustmentPanel("pending");
      }
      if (event.key === "F5") {
        event.preventDefault();
        openAdjustmentPanel("pending");
      }
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  });

  useEffect(() => {
    setPendingVoucherRows([]);
    setAllVoucherRows([]);
  }, [formData.company_id, formData.entry_type]);

  if (!isOpen) return null;

  const handleAdjustmentInput = (entryId, pendingAmount, value) => {
    const nextValue = Number(value || 0);
    const safeValue = Number.isFinite(nextValue)
      ? Math.max(0, Math.min(nextValue, Number(pendingAmount || 0)))
      : 0;
    onAdjustmentChange((prev) => ({
      ...prev,
      [entryId]: safeValue,
    }));
  };

  return (
    <ModalWrapper onClose={onClose} width="70%">
      <div style={shellStyle}>
        <div style={topBarStyle}>
          <div>
            <h3 style={titleStyle}>{modeLabel}</h3>
            <div style={{ ...topMetaStyle, marginTop: 4 }}>
              <span>
                Mode: <strong>Cash Bank Entry</strong>
              </span>
              <span>
                Subdocument: <strong>{modeLabel}</strong>
              </span>
              <span>
                Type: <strong>Regular [ View ]</strong>
              </span>
              <span>
                Location: <strong>{locationDisplay}</strong>
              </span>
            </div>
          </div>
        </div>

        <form onSubmit={onSubmit}>
          <div style={topControlRowStyle}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {ENTRY_MODES.map((mode) => (
                <button
                  key={mode.key}
                  type="button"
                  onClick={() => handleModeChange(mode.key)}
                  style={tabButtonStyle(selectedMode === mode.key)}
                >
                  {mode.label}
                </button>
              ))}
            </div>
            <div style={employeePillStyle}>
              <span style={{ padding: "0 10px", fontSize: 12, fontWeight: 700, whiteSpace: "nowrap" }}>
                Employee
              </span>
              <select
                name="employee_id"
                value={formData.employee_id || ""}
                onChange={onFormChange}
                style={{
                  border: "none",
                  outline: "none",
                  background: "transparent",
                  fontSize: 12,
                  fontWeight: 700,
                  padding: "4px 10px",
                  minWidth: 160,
                  cursor: "pointer",
                }}
              >
                <option value="">Select Employee</option>
                {currentEmployeeFallback ? (
                  <option value={currentEmployeeFallback.value}>{currentEmployeeFallback.label}</option>
                ) : null}
                {employees.map((emp) => (
                  <option key={getRecordId(emp)} value={getRecordId(emp)}>
                    {emp.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={handleEmployeeTransferMode}
              style={tabButtonStyle(isEmployeeTransfer)}
            >
              Employee To Employee Transfer
            </button>
          </div>

          <div style={{ ...sectionStyle, borderTop: "none" }}>
            <div style={cardGridStyle}>
              <div style={cardStyle}>
                <div style={rowStyle}>
                  <div>
                    <label style={labelStyle}>Date *</label>
                    <input
                      type="date"
                      name="entry_date"
                      value={formData.entry_date}
                      onChange={onFormChange}
                      style={inputStyle}
                      required
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Number</label>
                    <input
                      type="text"
                      name="voucher_no"
                      placeholder="REC000001"
                      value={formData.voucher_no}
                      onChange={onFormChange}
                      style={inputStyle}
                    />
                  </div>
                </div>

                {isJournal ? (
                  <>
                    <div style={rowStyle}>
                      <div>
                        <label style={labelStyle}>
                          {isEmployeeTransfer ? "Debit Employee (Dr)" : "Debit Name (Dr)"}
                        </label>
                        <select
                          name="journal_debit_name"
                          value={formData.journal_debit_name || ""}
                          onChange={onFormChange}
                          style={inputStyle}
                        >
                          <option value="">{isEmployeeTransfer ? "Select Employee" : "Select Party / Employee"}</option>
                          {effectiveJournalOptions.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label style={labelStyle}>
                          {isEmployeeTransfer ? "Credit Employee (Cr)" : "Credit Name (Cr)"}
                        </label>
                        <select
                          name="journal_credit_name"
                          value={formData.journal_credit_name || ""}
                          onChange={onFormChange}
                          style={inputStyle}
                        >
                          <option value="">{isEmployeeTransfer ? "Select Employee" : "Select Party / Employee"}</option>
                          {effectiveJournalOptions.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div style={entryAmountRowStyle}>
                      <div>
                        <label style={labelStyle}>Cash or Bank</label>
                        <select
                          name="payment_method"
                          value={formData.payment_method}
                          onChange={onFormChange}
                          style={inputStyle}
                        >
                          <option value="Cash">Cash</option>
                          <option value="Bank">Bank</option>
                        </select>
                      </div>
                      <div>
                        <label style={labelStyle}>Amount (Dr/Cr) *</label>
                        <input
                          type="number"
                          name="amount"
                          placeholder="0.00"
                          value={formData.amount}
                          onChange={onFormChange}
                          style={inputStyle}
                          required
                          step="0.01"
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <div style={entryAmountRowStyle}>
                    <div>
                      <label style={labelStyle}>Cash or Bank</label>
                      <select
                        name="payment_method"
                        value={formData.payment_method}
                        onChange={onFormChange}
                        style={inputStyle}
                      >
                        <option value="Cash">Cash</option>
                        <option value="Bank">Bank</option>
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>{isExpense ? "Debit" : "Credit"}</label>
                      <input
                        type="number"
                        name="amount"
                        placeholder="0.00"
                        value={formData.amount}
                        onChange={onFormChange}
                        style={inputStyle}
                        required
                        step="0.01"
                      />
                    </div>
                  </div>
                )}

                {isJournal ? (
                  <div>
                    <label style={labelStyle}>Type</label>
                    <input
                      type="text"
                      value="Journal"
                      readOnly
                      style={{ ...inputStyle, background: "#f1f5f9", fontWeight: 600 }}
                    />
                  </div>
                ) : (
                  <div style={rowStyle}>
                    <div>
                      <label style={labelStyle}>Payor or Income</label>
                      <select
                        name="company_id"
                        value={formData.company_id}
                        onChange={onFormChange}
                        style={inputStyle}
                      >
                        <option value="">Select Company</option>
                        {currentCompanyFallback ? (
                          <option value={currentCompanyFallback.value}>{currentCompanyFallback.label}</option>
                        ) : null}
                        {companies.map((c) => (
                          <option key={getRecordId(c)} value={getRecordId(c)}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                      <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 4, flexWrap: "wrap" }}>
                        <button
                          type="button"
                          onClick={() => openAdjustmentPanel("pending")}
                          style={{ ...tabButtonStyle(false), borderRadius: 4, padding: "4px 8px" }}
                        >
                          F2 Outstanding
                        </button>
                        <button
                          type="button"
                          onClick={() => openAdjustmentPanel("pending")}
                          style={{ ...tabButtonStyle(false), borderRadius: 4, padding: "4px 8px" }}
                        >
                          F5 Adjustment
                        </button>
                        <span style={{ fontSize: 11, color: "#475569", fontWeight: 700 }}>
                          Outstanding: {totalOutstanding.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                    <div>
                      <label style={labelStyle}>Type</label>
                      <input
                        type="text"
                        value={formData.entry_type === "expense" ? "Expense" : "Income"}
                        readOnly
                        style={{ ...inputStyle, background: "#f1f5f9", fontWeight: 600 }}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div style={cardStyle}>
                <div>
                  <label style={labelStyle}>Warehouse / Location</label>
                  <select
                    name="warehouse_id"
                    value={formData.warehouse_id}
                    onChange={onFormChange}
                    style={inputStyle}
                  >
                    <option value="">Select Warehouse</option>
                    {currentWarehouseFallback ? (
                      <option value={currentWarehouseFallback.value}>{currentWarehouseFallback.label}</option>
                    ) : null}
                    {warehouses.map((w) => (
                      <option key={getRecordId(w)} value={getRecordId(w)}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Fund Source</label>
                  <select
                    name="fund_source"
                    value={formData.fund_source || "main_cash"}
                    onChange={onFormChange}
                    style={inputStyle}
                  >
                    <option value="main_cash">Main Cash</option>
                    <option value="employee_cash">Employee Cash</option>
                    <option value="party_cash">Party Cash</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Reference No</label>
                  <input
                    type="text"
                    name="reference_no"
                    placeholder="Cheque / Transaction Number"
                    value={formData.reference_no}
                    onChange={onFormChange}
                    style={inputStyle}
                  />
                </div>
              </div>
            </div>
          </div>

          <div style={sectionStyle}>
            <div
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: "#334155",
                marginBottom: 10,
              }}
            >
              OTHER TRANSACTION DETAILS
            </div>

            <div style={detailsGridStyle}>
              <div>
                <div style={rowStyle}>
                  <div>
                    <label style={labelStyle}>Narration</label>
                    <textarea
                      name="narration"
                      placeholder="Additional notes"
                      value={formData.narration}
                      onChange={onFormChange}
                      style={{ ...inputStyle, minHeight: 70, resize: "vertical" }}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Payment Mode</label>
                    <select
                      name="payment_method"
                      value={formData.payment_method}
                      onChange={onFormChange}
                      style={inputStyle}
                    >
                      <option value="Cash">Cash</option>
                      <option value="Bank">Bank</option>
                    </select>
                    <label style={labelStyle}>Cheque / Transaction Number</label>
                    <input
                      type="text"
                      name="reference_no"
                      placeholder="Txn ID / Cheque No"
                      value={formData.reference_no}
                      onChange={onFormChange}
                      style={inputStyle}
                    />
                  </div>
                </div>

                <div>
                  <label style={labelStyle}>Description or Reference *</label>
                  <input
                    type="text"
                    name="description"
                    placeholder="CASH RECEIVED FROM CUSTOMER"
                    value={formData.description}
                    onChange={onFormChange}
                    style={inputStyle}
                    required
                  />
                </div>

                {!isJournal && formData.employee_id ? (
                  <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8 }}>
                    <input
                      type="checkbox"
                      id="auto_staff_entry"
                      name="auto_staff_entry"
                      checked={formData.auto_staff_entry || false}
                      onChange={(e) => setFieldValue("auto_staff_entry", e.target.checked)}
                      style={{ cursor: "pointer", width: 16, height: 16 }}
                    />
                    <label 
                      htmlFor="auto_staff_entry" 
                      style={{ 
                        ...labelStyle, 
                        marginBottom: 0, 
                        cursor: "pointer",
                        fontSize: 12,
                        fontWeight: 500 
                      }}
                    >
                      {selectedMode === "payment"
                        ? "✓ Create automatic income entry in staff account"
                        : "✓ Create automatic expense entry in staff account"}
                    </label>
                  </div>
                ) : null}

                {!isJournal ? <div style={{ marginTop: 10 }}>
                  <label style={{ ...labelStyle, marginBottom: 6 }}>
                    Previous Pending (Aging) - Auto Adjust
                  </label>
                  <div
                    style={{
                      border: "1px solid #d7dce4",
                      borderRadius: 6,
                      overflow: "hidden",
                      background: "#fff",
                    }}
                  >
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                      <thead>
                        <tr style={{ background: "#eef2f7", color: "#334155" }}>
                          <th style={{ textAlign: "left", padding: "6px 8px" }}>Voucher</th>
                          <th style={{ textAlign: "left", padding: "6px 8px" }}>Type</th>
                          <th style={{ textAlign: "left", padding: "6px 8px" }}>Date</th>
                          <th style={{ textAlign: "right", padding: "6px 8px" }}>Pending</th>
                          <th style={{ textAlign: "right", padding: "6px 8px" }}>Aging</th>
                          <th style={{ textAlign: "right", padding: "6px 8px" }}>Adjust Now</th>
                        </tr>
                      </thead>
                      <tbody>
                        {agingRows.length > 0 ? (
                          agingRows.map((row) => (
                            <tr key={row.id} style={{ borderTop: "1px solid #e2e8f0" }}>
                              <td style={{ padding: "6px 8px" }}>
                                {row.voucher_no || `CE-${row.id}`}
                              </td>
                              <td style={{ padding: "6px 8px", textTransform: "capitalize" }}>
                                {row.entry_type}
                              </td>
                              <td style={{ padding: "6px 8px" }}>{row.entry_date}</td>
                              <td style={{ padding: "6px 8px", textAlign: "right" }}>
                                {Number(row.pending_amount || 0).toLocaleString("en-IN", {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </td>
                              <td style={{ padding: "6px 8px", textAlign: "right" }}>
                                {row.age_days || 0} d
                              </td>
                              <td style={{ padding: "6px 8px", textAlign: "right" }}>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={adjustments?.[row.id] || ""}
                                  onChange={(e) =>
                                    handleAdjustmentInput(row.id, row.pending_amount, e.target.value)
                                  }
                                  style={{
                                    width: 110,
                                    padding: "4px 6px",
                                    border: "1px solid #cbd5e1",
                                    borderRadius: 4,
                                    textAlign: "right",
                                  }}
                                />
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td
                              colSpan={6}
                              style={{
                                padding: "8px",
                                color: "#64748b",
                                textAlign: "center",
                              }}
                            >
                              No previous pending entry for adjustment.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div> : null}

                {!isJournal ? (
                  <div style={{ marginTop: 10 }}>
                    <label style={{ ...labelStyle, marginBottom: 6 }}>
                      Selected Adjustment Details
                    </label>
                    <div
                      style={{
                        border: "1px solid #d7dce4",
                        borderRadius: 6,
                        overflow: "hidden",
                        background: "#fff",
                      }}
                    >
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                        <thead>
                          <tr style={{ background: "#f1f5f9", color: "#334155" }}>
                            <th style={{ textAlign: "left", padding: "6px 8px" }}>Voucher</th>
                            <th style={{ textAlign: "left", padding: "6px 8px" }}>Type</th>
                            <th style={{ textAlign: "left", padding: "6px 8px" }}>Date</th>
                            <th style={{ textAlign: "right", padding: "6px 8px" }}>Pending</th>
                            <th style={{ textAlign: "right", padding: "6px 8px" }}>Adjust</th>
                            <th style={{ textAlign: "right", padding: "6px 8px" }}>Remaining</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedAdjustmentRows.length > 0 ? (
                            selectedAdjustmentRows.map((row) => (
                              <tr key={`selected-${row.id}`} style={{ borderTop: "1px solid #e2e8f0" }}>
                                <td style={{ padding: "6px 8px" }}>{row.voucher_no || `CE-${row.id}`}</td>
                                <td style={{ padding: "6px 8px", textTransform: "capitalize" }}>{row.entry_type || "-"}</td>
                                <td style={{ padding: "6px 8px" }}>{row.entry_date || "-"}</td>
                                <td style={{ padding: "6px 8px", textAlign: "right" }}>
                                  {Number(row.pending_amount || 0).toLocaleString("en-IN", {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}
                                </td>
                                <td style={{ padding: "6px 8px", textAlign: "right" }}>
                                  {Number(row.adjust_now || 0).toLocaleString("en-IN", {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}
                                </td>
                                <td style={{ padding: "6px 8px", textAlign: "right", fontWeight: 700 }}>
                                  {Number(row.pending_after || 0).toLocaleString("en-IN", {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td
                                colSpan={6}
                                style={{
                                  padding: "8px",
                                  color: "#64748b",
                                  textAlign: "center",
                                }}
                              >
                                No selected adjustment yet.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : null}
              </div>

              <div style={receivedBoxWrapStyle}>
                <div style={{ fontSize: 20, color: "#0f172a", fontWeight: 700 }}>
                  {selectedMode === "payment" ? "Payment" : "Received"}
                </div>
                <div style={receivedAmountStyle}>{amountDisplay}</div>

                <div style={{ marginTop: 8, fontSize: 12, color: "#475569" }}>
                  Bill: Not Allocated {unallocatedAmount.toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </div>

                <div style={buttonRowStyle}>
                  <button type="submit" disabled={loading} style={submitButtonStyle(loading)}>
                    {loading ? "Saving..." : isEditMode ? "Update" : "OK"}
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={loading}
                    style={cancelButtonStyle}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
      {showAdjustmentPanel ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15,23,42,0.35)",
            zIndex: 10000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
          onClick={() => setShowAdjustmentPanel(false)}
        >
          <div
            style={{
              width: "min(1050px, 96vw)",
              maxHeight: "82vh",
              overflow: "hidden",
              background: "#fff",
              borderRadius: 8,
              border: "1px solid #cbd5e1",
              boxShadow: "0 20px 55px rgba(15,23,42,0.25)",
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <div style={{ ...topBarStyle, alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 800, color: "#0f172a" }}>Party Adjustment</div>
                <div style={{ fontSize: 12, color: "#475569", marginTop: 2 }}>
                  Pending: {totalOutstanding.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} | Selected: {totalAdjusted.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} | Not Allocated: {unallocatedAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <button type="button" onClick={() => openAdjustmentPanel("pending")} style={tabButtonStyle(adjustmentTab === "pending")}>Pending</button>
                <button type="button" onClick={() => openAdjustmentPanel("all")} style={tabButtonStyle(adjustmentTab === "all")}>All Voucher</button>
                <button type="button" onClick={() => setShowAdjustmentPanel(false)} style={cancelButtonStyle}>Close</button>
              </div>
            </div>
            <div style={{ maxHeight: "66vh", overflow: "auto", padding: 10 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ background: "#eef2f7", color: "#334155" }}>
                    <th style={{ textAlign: "left", padding: "7px 8px" }}>Voucher</th>
                    <th style={{ textAlign: "left", padding: "7px 8px" }}>Type</th>
                    <th style={{ textAlign: "left", padding: "7px 8px" }}>Date</th>
                    <th style={{ textAlign: "left", padding: "7px 8px" }}>Description</th>
                    <th style={{ textAlign: "right", padding: "7px 8px" }}>Amount</th>
                    <th style={{ textAlign: "right", padding: "7px 8px" }}>Adjusted</th>
                    <th style={{ textAlign: "right", padding: "7px 8px" }}>Pending</th>
                    <th style={{ textAlign: "right", padding: "7px 8px" }}>Adjust Now</th>
                    <th style={{ textAlign: "center", padding: "7px 8px" }}>Edit</th>
                  </tr>
                </thead>
                <tbody>
                  {!formData.company_id ? (
                    <tr>
                      <td colSpan={9} style={{ padding: 12, textAlign: "center", color: "#b45309", fontWeight: 700 }}>
                        Please select Payor or Income party first.
                      </td>
                    </tr>
                  ) : allVoucherLoading ? (
                    <tr>
                      <td colSpan={9} style={{ padding: 12, textAlign: "center", color: "#64748b" }}>Loading vouchers...</td>
                    </tr>
                  ) : displayRows.length > 0 ? (
                    displayRows.map((row) => (
                      <tr key={`adj-panel-${row.id}`} style={{ borderTop: "1px solid #e2e8f0" }}>
                        <td style={{ padding: "7px 8px" }}>{row.voucher_no || `CE-${row.id}`}</td>
                        <td style={{ padding: "7px 8px", textTransform: "capitalize" }}>{row.entry_type || "-"}</td>
                        <td style={{ padding: "7px 8px" }}>{row.entry_date || "-"}</td>
                        <td style={{ padding: "7px 8px", maxWidth: 260, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{row.description || "-"}</td>
                        <td style={{ padding: "7px 8px", textAlign: "right" }}>{Number(row.amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td style={{ padding: "7px 8px", textAlign: "right" }}>{Number(row.adjusted_total || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td style={{ padding: "7px 8px", textAlign: "right", fontWeight: 700 }}>{Number(row.pending_amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td style={{ padding: "7px 8px", textAlign: "right" }}>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            disabled={Number(row.pending_amount || 0) <= 0 || String(row.entry_type) === String(formData.entry_type)}
                            value={adjustments?.[row.id] || ""}
                            onChange={(e) => handleAdjustmentInput(row.id, row.pending_amount, e.target.value)}
                            style={{ width: 110, padding: "5px 6px", border: "1px solid #cbd5e1", borderRadius: 4, textAlign: "right" }}
                          />
                        </td>
                        <td style={{ padding: "7px 8px", textAlign: "center" }}>
                          {onEditVoucher ? (
                            <button
                              type="button"
                              onClick={() => {
                                setShowAdjustmentPanel(false);
                                onEditVoucher(row);
                              }}
                              style={{ ...tabButtonStyle(false), borderRadius: 4, padding: "4px 8px" }}
                            >
                              Edit
                            </button>
                          ) : "-"}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={9} style={{ padding: 12, color: "#64748b", textAlign: "center" }}>
                        No voucher found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}
    </ModalWrapper>
  );
}
