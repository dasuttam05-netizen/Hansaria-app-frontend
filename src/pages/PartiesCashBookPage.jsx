import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { formatDisplayDate } from "../utils/date";
import CashEntryForm from "../components/CashEntryForm";
import { useNavigate } from "react-router-dom";
import PageBackCloseActions from "../components/PageBackCloseActions";
import { exportLedgerExcel, exportLedgerPDF } from "../utils/ledgerExport";

const API_BASE = "/api";

const panel = {
  background: "#fff",
  border: "1px solid #d1d5db",
  borderRadius: 6,
  padding: 16,
};

const label = {
  display: "block",
  fontSize: 16,
  fontWeight: 700,
  color: "#374151",
  marginBottom: 8,
};

const input = {
  width: "100%",
  padding: "10px 12px",
  border: "1px solid #cfd4dc",
  borderRadius: 4,
  fontSize: 16,
  background: "#fff",
  boxSizing: "border-box",
};

const th = {
  padding: "10px 8px",
  background: "#f3f4f6",
  borderBottom: "1px solid #d1d5db",
  textAlign: "left",
  color: "#374151",
  fontSize: 16,
  fontWeight: 700,
  whiteSpace: "nowrap",
};

const td = {
  padding: "10px 8px",
  borderBottom: "1px solid #e5e7eb",
  color: "#374151",
  fontSize: 16,
  whiteSpace: "nowrap",
};

const getWarehouseLabel = (w) => w?.name || w?.warehouse_name || w?.title || (w?.id ? `Warehouse ${w.id}` : "Unknown Warehouse");
const getCompanyLabel = (c) => c?.name || c?.company_name || c?.company || (c?.id ? `Party ${c.id}` : "Unknown Party");
const getRecordId = (row) => row?.id || row?._id || "";
const getEntryAmounts = (entry) => {
  const amount = Number(entry?.amount || 0);
  const isIncome = String(entry?.entry_type || "").toLowerCase() === "income";
  const dr = isIncome ? amount : 0;
  const cr = isIncome ? 0 : amount;
  return { dr, cr, signed: dr - cr };
};
const getSignedOpening = (row) => {
  const amount = Number(row?.opening_balance || 0);
  const type = String(row?.opening_balance_type || "dr").toLowerCase();
  return type === "cr" ? -Math.abs(amount) : Math.abs(amount);
};
const isPartyLedgerEntry = (entry) => {
  const source = String(entry?.fund_source || "main_cash");
  return source === "party_cash" || (!!entry?.company_id && source !== "employee_cash");
};
const isActiveLedgerStatus = (entry) =>
  String(entry?.status || "posted").toLowerCase() !== "cancelled" &&
  !(
    Number(entry?.source_expense_id || 0) > 0 &&
    String(entry?.status || "").toLowerCase() === "pending"
  );

const PartiesCashBookPage = () => {
  const navigate = useNavigate();
  const [entries, setEntries] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [showDeleted, setShowDeleted] = useState(false);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState({
    warehouse_id: "",
    company_id: "",
    start_date: "",
    end_date: "",
  });
  const [appliedFilters, setAppliedFilters] = useState(filters);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [agingRows, setAgingRows] = useState([]);
  const [adjustments, setAdjustments] = useState({});
  const emptyForm = () => ({
    entry_date: new Date().toISOString().split("T")[0],
    transaction_mode: "receipt",
    entry_type: "expense",
    warehouse_id: "",
    company_id: "",
    employee_id: "",
    company_account_id: "",
    description: "",
    amount: "",
    payment_method: "Cash",
    fund_source: "party_cash",
    reference_no: "",
    narration: "",
    status: "posted",
  });
  const [formData, setFormData] = useState(emptyForm());

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [entriesRes, warehousesRes, companiesRes, employeesRes] = await Promise.all([
        axios.get(`${API_BASE}/cash-entries`),
        axios.get(`${API_BASE}/warehouses`),
        axios.get(`${API_BASE}/companies`),
        axios.get(`${API_BASE}/employees`),
      ]);
      setEntries(Array.isArray(entriesRes.data) ? entriesRes.data : []);
      setWarehouses(Array.isArray(warehousesRes.data) ? warehousesRes.data : []);
      setCompanies(Array.isArray(companiesRes.data) ? companiesRes.data : []);
      setEmployees(Array.isArray(employeesRes.data) ? employeesRes.data : []);
    } catch (err) {
      console.error("Error fetching data:", err);
      setEntries([]);
      setWarehouses([]);
      setCompanies([]);
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredRows = useMemo(() => {
    return entries
      .filter((e) => e.company_id)
      .filter(isPartyLedgerEntry)
      .filter((e) => (showDeleted ? String(e.status || "").toLowerCase() === "cancelled" : isActiveLedgerStatus(e)))
      .filter((e) => !appliedFilters.warehouse_id || String(e.warehouse_id || "") === String(appliedFilters.warehouse_id))
      .filter((e) => !appliedFilters.company_id || String(e.company_id || "") === String(appliedFilters.company_id))
      .filter((e) => {
        const d = e.entry_date ? new Date(e.entry_date) : null;
        if (appliedFilters.start_date && d && d < new Date(appliedFilters.start_date)) return false;
        if (appliedFilters.end_date && d && d > new Date(appliedFilters.end_date)) return false;
        return true;
      })
      .sort((a, b) => new Date(a.entry_date) - new Date(b.entry_date));
  }, [entries, appliedFilters, showDeleted]);

  const openingBalance = useMemo(() => {
    const selectedCompanyEntry = entries.find(
      (e) => String(e.company_id || "") === String(appliedFilters.company_id)
    );
    const selectedCompanies = appliedFilters.company_id
      ? companies.filter(
          (c) =>
            String(getRecordId(c)) === String(appliedFilters.company_id) ||
            getCompanyLabel(c) === selectedCompanyEntry?.company_name
        )
      : companies;
    const masterOpening = selectedCompanies.reduce((sum, c) => sum + getSignedOpening(c), 0);

    if (!appliedFilters.start_date) return masterOpening;
    const from = new Date(appliedFilters.start_date);
    const entryOpening = entries
      .filter((e) => e.company_id)
      .filter(isPartyLedgerEntry)
      .filter(isActiveLedgerStatus)
      .filter((e) => !appliedFilters.warehouse_id || String(e.warehouse_id || "") === String(appliedFilters.warehouse_id))
      .filter((e) => !appliedFilters.company_id || String(e.company_id || "") === String(appliedFilters.company_id))
      .filter((e) => {
        const d = e.entry_date ? new Date(e.entry_date) : null;
        return d && d < from;
      })
      .reduce((sum, e) => sum + getEntryAmounts(e).signed, 0);
    return masterOpening + entryOpening;
  }, [entries, companies, appliedFilters]);

  const handleView = (entry) => {
    const details = [
      `Date: ${formatDisplayDate(entry.entry_date)}`,
      `Voucher: ${entry.journal_group_no || entry.voucher_no || "-"}`,
      `Type: ${entry.entry_type || "-"}`,
      `Warehouse: ${entry.warehouse_name || "-"}`,
      `Employee: ${entry.employee_name || "-"}`,
      `Party: ${entry.company_name || "-"}`,
      `Description: ${entry.description || "-"}`,
      `Ref No: ${entry.reference_no || "-"}`,
      `Payment Mode: ${entry.payment_method || "-"}`,
      `Amount: ${Number(entry.amount || 0).toFixed(2)}`,
    ];
    alert(details.join("\n"));
  };

  const ledgerRows = useMemo(() => {
    let balance = openingBalance;
    return filteredRows.map((entry) => {
      const amounts = getEntryAmounts(entry);
      balance += amounts.signed;
      return { ...entry, ...amounts, balance };
    });
  }, [filteredRows, openingBalance]);

  const totals = useMemo(() => {
    const totalDr = ledgerRows.reduce((sum, e) => sum + Number(e.dr || 0), 0);
    const totalCr = ledgerRows.reduce((sum, e) => sum + Number(e.cr || 0), 0);
    return { totalDr, totalCr, closing: openingBalance + totalDr - totalCr };
  }, [ledgerRows, openingBalance]);

  const warehouseOptions = useMemo(() => {
    const map = new Map();
    warehouses.forEach((w) => {
      if (w?.id != null) map.set(String(w.id), getWarehouseLabel(w));
    });
    entries.forEach((e) => {
      if (e?.warehouse_id == null || e?.warehouse_id === "") return;
      const key = String(e.warehouse_id);
      if (!map.has(key)) map.set(key, e.warehouse_name || `Warehouse ${key}`);
    });
    return Array.from(map.entries()).map(([value, label]) => ({ value, label }));
  }, [warehouses, entries]);

  const companyOptions = useMemo(() => {
    const map = new Map();
    companies.forEach((c) => {
      if (c?.id != null) map.set(String(c.id), getCompanyLabel(c));
    });
    entries.forEach((e) => {
      if (e?.company_id == null || e?.company_id === "") return;
      const key = String(e.company_id);
      if (!map.has(key)) map.set(key, e.company_name || e.company || `Party ${key}`);
    });
    return Array.from(map.entries()).map(([value, label]) => ({ value, label }));
  }, [companies, entries]);

  const ledgerTitle = useMemo(() => {
    const wh = warehouseOptions.find((w) => String(w.value) === String(appliedFilters.warehouse_id));
    const co = companyOptions.find((c) => String(c.value) === String(appliedFilters.company_id));
    return [wh ? `Warehouse: ${wh.label}` : null, co ? `Party: ${co.label}` : null].filter(Boolean).join(" | ") || "All Parties";
  }, [appliedFilters, warehouseOptions, companyOptions]);

  const loadAgingForCompany = useCallback(
    async ({ companyId, entryType, sourceEntryId, existingAdjustments = {} }) => {
      if (!companyId) {
        setAgingRows([]);
        setAdjustments(existingAdjustments || {});
        return;
      }

      try {
        const res = await axios.get(`${API_BASE}/cash-entries/aging/company/${companyId}`, {
          params: {
            entry_type: entryType,
            source_entry_id: sourceEntryId || undefined,
          },
        });
        setAgingRows(Array.isArray(res.data) ? res.data : []);
        setAdjustments(existingAdjustments || {});
      } catch (err) {
        console.error("Aging load failed:", err);
        setAgingRows([]);
        setAdjustments(existingAdjustments || {});
      }
    },
    []
  );

  const handleEdit = async (entry) => {
    let detail = entry;
    try {
      const detailRes = await axios.get(`${API_BASE}/cash-entries/${entry.id}`);
      detail = detailRes?.data || entry;
      const existingAdjustments = Array.isArray(detail.adjustments)
        ? detail.adjustments.reduce((acc, item) => {
            const targetId = Number(item?.target_entry_id);
            const amount = Number(item?.adjusted_amount || 0);
            if (targetId > 0 && amount > 0) acc[targetId] = amount;
            return acc;
          }, {})
        : {};

      setEditingId(detail.id);
      setFormData({
        id: detail.id,
        entry_date: String(detail.entry_date || "").split("T")[0],
        transaction_mode: detail.transaction_mode || "receipt",
        entry_type: detail.entry_type || "expense",
        warehouse_id: detail.warehouse_id ? String(detail.warehouse_id) : "",
        warehouse_name: detail.warehouse_name || "",
        company_id: detail.company_id ? String(detail.company_id) : "",
        company_name: detail.company_name || "",
        employee_id: detail.employee_id ? String(detail.employee_id) : "",
        employee_name: detail.employee_name || "",
        company_account_id: detail.company_account_id ? String(detail.company_account_id) : "",
        description: detail.description || "",
        amount: detail.amount || "",
        payment_method: detail.payment_method || "Cash",
        fund_source: detail.fund_source || "party_cash",
        reference_no: detail.reference_no || "",
        narration: detail.narration || "",
        status: detail.status || "posted",
      });
      setShowForm(true);
      await loadAgingForCompany({
        companyId: detail.company_id,
        entryType: detail.entry_type,
        sourceEntryId: detail.id,
        existingAdjustments,
      });
    } catch (err) {
      console.error("Error loading entry details:", err);
      alert("Entry details load korte problem hoyeche, report row data diye form khola holo.");
      setEditingId(detail.id);
      setFormData({
        id: detail.id,
        entry_date: String(detail.entry_date || "").split("T")[0],
        transaction_mode: detail.transaction_mode || "receipt",
        entry_type: detail.entry_type || "expense",
        warehouse_id: detail.warehouse_id ? String(detail.warehouse_id) : "",
        warehouse_name: detail.warehouse_name || "",
        company_id: detail.company_id ? String(detail.company_id) : "",
        company_name: detail.company_name || "",
        employee_id: detail.employee_id ? String(detail.employee_id) : "",
        employee_name: detail.employee_name || "",
        company_account_id: detail.company_account_id ? String(detail.company_account_id) : "",
        description: detail.description || "",
        amount: detail.amount || "",
        payment_method: detail.payment_method || "Cash",
        fund_source: detail.fund_source || "party_cash",
        reference_no: detail.reference_no || "",
        narration: detail.narration || "",
        status: detail.status || "posted",
      });
      setShowForm(true);
    }
  };

  const handleFormChange = async (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (name === "company_id" || name === "entry_type") {
      await loadAgingForCompany({
        companyId: name === "company_id" ? value : formData.company_id,
        entryType: name === "entry_type" ? value : formData.entry_type,
        sourceEntryId: editingId,
        existingAdjustments: {},
      });
    }
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData(emptyForm());
    setAgingRows([]);
    setAdjustments({});
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      const adjustmentRows = Object.entries(adjustments)
        .map(([target_entry_id, value]) => ({ target_entry_id: Number(target_entry_id), adjusted_amount: Number(value || 0) }))
        .filter((item) => item.adjusted_amount > 0);
      await axios.put(`${API_BASE}/cash-entries/${editingId}`, { ...formData, adjustments: adjustmentRows });
      closeForm();
      fetchData();
    } catch (err) {
      alert("Error updating entry: " + (err.response?.data?.error || err.message));
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (entry) => {
    const message = showDeleted
      ? "Restore this deleted entry?"
      : "Delete this entry? You can restore it later from Show Deleted.";
    if (!window.confirm(message)) return;
    try {
      await axios.patch(`${API_BASE}/cash-entries/${entry.id}`, {
        status: showDeleted ? "posted" : "cancelled",
      });
      fetchData();
    } catch (err) {
      alert("Error deleting entry: " + (err.response?.data?.error || err.message));
    }
  };

  const applyFilters = () => setAppliedFilters(filters);
  const clearFilters = () => {
    const reset = { warehouse_id: "", company_id: "", start_date: "", end_date: "" };
    setFilters(reset);
    setAppliedFilters(reset);
  };

  const exportHeaders = [
    "Date",
    "Voucher",
    "Type",
    "Warehouse Name",
    "Employee",
    "Party",
    "Description",
    "Ref No",
    "Payment Mode",
    "Dr",
    "Cr",
  ];

  const exportRows = useMemo(
    () =>
      ledgerRows.map((entry) => [
        formatDisplayDate(entry.entry_date),
        entry.journal_group_no || entry.voucher_no || "-",
        entry.entry_type || "-",
        entry.warehouse_name || "-",
        entry.employee_name || "-",
        entry.company_name || "-",
        entry.description || "-",
        entry.reference_no || "-",
        entry.payment_method || "-",
        entry.dr ? Number(entry.dr).toFixed(2) : "-",
        entry.cr ? Number(entry.cr).toFixed(2) : "-",
      ]),
    [ledgerRows]
  );

  const handleExportExcel = () => {
    exportLedgerExcel({
      title: "Party Cash Book Ledger",
      fileName: `party-cash-book-ledger-${showDeleted ? "deleted" : "active"}.xls`,
      ledgerTitle,
      dateFrom: appliedFilters.start_date,
      dateTo: appliedFilters.end_date,
      headers: exportHeaders,
      rows: exportRows,
      openingBalance,
      totalDr: totals.totalDr,
      totalCr: totals.totalCr,
      closingBalance: totals.closing,
    });
  };

  const handleExportPDF = () => {
    exportLedgerPDF({
      title: "Party Cash Book Ledger",
      fileName: `party-cash-book-ledger-${showDeleted ? "deleted" : "active"}.pdf`,
      ledgerTitle,
      dateFrom: appliedFilters.start_date,
      dateTo: appliedFilters.end_date,
      headers: exportHeaders,
      rows: exportRows,
      openingBalance,
      totalDr: totals.totalDr,
      totalCr: totals.totalCr,
      closingBalance: totals.closing,
    });
  };

  return (
    <div style={{ background: "#f3f4f6", minHeight: "100vh", padding: 20, fontFamily: "Segoe UI, Arial, sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
      <h1 style={{ margin: 0, fontSize: 42, color: "#111827", fontWeight: 500 }}>Report - Ledger Statement</h1>
      <PageBackCloseActions navigate={navigate} />
      </div>

      <div style={panel}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 2fr 1fr 1fr", gap: 12 }}>
          <div>
            <label style={label}>Warehouse</label>
            <select value={filters.warehouse_id} onChange={(e) => setFilters((p) => ({ ...p, warehouse_id: e.target.value }))} style={input}>
              <option value="">All Warehouses</option>
              {warehouseOptions.map((w) => (
                <option key={w.value} value={w.value}>
                  {w.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={label}>Party</label>
            <select value={filters.company_id} onChange={(e) => setFilters((p) => ({ ...p, company_id: e.target.value }))} style={input}>
              <option value="">All Parties</option>
              {companyOptions.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={label}>Start Date</label>
            <input type="date" value={filters.start_date} onChange={(e) => setFilters((p) => ({ ...p, start_date: e.target.value }))} style={input} />
          </div>
          <div>
            <label style={label}>End Date</label>
            <input type="date" value={filters.end_date} onChange={(e) => setFilters((p) => ({ ...p, end_date: e.target.value }))} style={input} />
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 12, alignItems: "center" }}>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <button type="button" onClick={handleExportExcel} style={{ border: "none", borderRadius: 4, background: "#2563eb", color: "#fff", padding: "10px 20px", fontSize: 16, cursor: "pointer" }}>
              Export Excel
            </button>
            <button type="button" onClick={handleExportPDF} style={{ border: "none", borderRadius: 4, background: "#334155", color: "#fff", padding: "10px 20px", fontSize: 16, cursor: "pointer" }}>
              Export PDF
            </button>
            <button
              type="button"
              onClick={() => setShowDeleted((prev) => !prev)}
              style={{
                border: "none",
                borderRadius: 4,
                background: showDeleted ? "#16a34a" : "#64748b",
                color: "#fff",
                padding: "10px 20px",
                fontSize: 16,
                cursor: "pointer",
              }}
            >
              {showDeleted ? "Show Active" : "Show Deleted"}
            </button>
            <button type="button" onClick={applyFilters} style={{ border: "none", borderRadius: 4, background: "#3b82f6", color: "#fff", padding: "10px 20px", fontSize: 16, cursor: "pointer" }}>Submit</button>
            <button type="button" onClick={clearFilters} style={{ border: "none", borderRadius: 4, background: "#ef4444", color: "#fff", padding: "10px 20px", fontSize: 16, cursor: "pointer" }}>Clear</button>
          </div>
        </div>
      </div>

      <div style={{ ...panel, marginTop: 14 }}>
        <div style={{ fontSize: 20, color: "#4b5563", marginBottom: 12 }}>
          Ledger statement for {ledgerTitle}
          {appliedFilters.start_date ? ` from ${formatDisplayDate(appliedFilters.start_date)}` : ""}
          {appliedFilters.end_date ? ` to ${formatDisplayDate(appliedFilters.end_date)}` : ""}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", marginBottom: 8 }}>
          <div style={{ border: "1px solid #d1d5db", padding: 8, background: "#fefce8", fontSize: 16, color: "#4b5563" }}>Ledger account</div>
          <div style={{ border: "1px solid #d1d5db", padding: 8, background: "#fefce8", fontSize: 16, color: "#4b5563" }}>{ledgerTitle}</div>
          <div style={{ border: "1px solid #d1d5db", padding: 8, background: "#fefce8", fontSize: 16, color: "#4b5563" }}>Opening balance</div>
          <div style={{ border: "1px solid #d1d5db", padding: 8, background: "#fefce8", fontSize: 16, color: "#4b5563" }}>Rs. {openingBalance.toFixed(2)}</div>
          <div style={{ border: "1px solid #d1d5db", padding: 8, background: "#fefce8", fontSize: 16, color: "#4b5563" }}>Closing balance</div>
          <div style={{ border: "1px solid #d1d5db", padding: 8, background: "#fefce8", fontSize: 16, color: "#4b5563" }}>Rs. {totals.closing.toFixed(2)}</div>
        </div>

        {loading ? (
          <p style={{ color: "#6b7280", textAlign: "center", margin: "14px 0" }}>Loading ledger...</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={th}>Date</th>
                  <th style={th}>Voucher</th>
                  <th style={th}>Type</th>
                  <th style={th}>Warehouse Name</th>
                  <th style={th}>Employee</th>
                  <th style={th}>Party</th>
                  <th style={th}>Description</th>
                  <th style={th}>Ref No</th>
                  <th style={th}>Payment Mode</th>
                  <th style={{ ...th, textAlign: "right" }}>Dr</th>
                  <th style={{ ...th, textAlign: "right" }}>Cr</th>
                  <th style={{ ...th, textAlign: "center" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ background: "#f9fafb" }}>
                  <td style={{ ...td, fontWeight: 700 }} colSpan={9}>Current opening balance</td>
                  <td style={{ ...td, textAlign: "right" }}>{openingBalance > 0 ? `Rs. ${openingBalance.toFixed(2)}` : "-"}</td>
                  <td style={{ ...td, textAlign: "right" }}>{openingBalance < 0 ? `Rs. ${Math.abs(openingBalance).toFixed(2)}` : "-"}</td>
                  <td style={td}>-</td>
                </tr>
                {ledgerRows.length === 0 ? (
                  <tr>
                    <td colSpan="12" style={{ ...td, textAlign: "center" }}>No ledger entries found.</td>
                  </tr>
                ) : (
                  ledgerRows.map((entry) => (
                    <tr key={entry.id}>
                      <td style={td}>{formatDisplayDate(entry.entry_date)}</td>
                      <td style={td}>{entry.journal_group_no || entry.voucher_no || "-"}</td>
                      <td style={td}>{entry.entry_type || "-"}</td>
                      <td style={td}>{entry.warehouse_name || "-"}</td>
                      <td style={td}>{entry.employee_name || "-"}</td>
                      <td style={td}>{entry.company_name || "-"}</td>
                      <td style={td}>{entry.description || "-"}</td>
                      <td style={td}>{entry.reference_no || "-"}</td>
                      <td style={td}>{entry.payment_method || "-"}</td>
                      <td style={{ ...td, textAlign: "right" }}>{entry.dr ? `Rs. ${Number(entry.dr).toFixed(2)}` : "-"}</td>
                      <td style={{ ...td, textAlign: "right" }}>{entry.cr ? `Rs. ${Number(entry.cr).toFixed(2)}` : "-"}</td>
                      <td style={{ ...td, textAlign: "center" }}>
                        <div style={{ display: "flex", justifyContent: "center", gap: 8 }}>
                          <button type="button" onClick={() => handleView(entry)} style={{ background: "#0ea5e9", color: "#fff", border: "none", padding: "6px 10px", borderRadius: 4, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>View</button>
                          <button type="button" onClick={() => handleEdit(entry)} style={{ background: "#2563eb", color: "#fff", border: "none", padding: "6px 10px", borderRadius: 4, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Edit</button>
                          <button type="button" onClick={() => handleDelete(entry)} style={{ background: "#dc2626", color: "#fff", border: "none", padding: "6px 10px", borderRadius: 4, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>{showDeleted ? "Restore" : "Delete"}</button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
                <tr style={{ background: "#f9fafb" }}>
                  <td style={{ ...td, fontWeight: 700 }} colSpan={9}>Current closing balance</td>
                  <td style={{ ...td, textAlign: "right", fontWeight: 700 }}>Rs. {totals.totalDr.toFixed(2)}</td>
                  <td style={{ ...td, textAlign: "right", fontWeight: 700 }}>Rs. {totals.totalCr.toFixed(2)}</td>
                  <td style={td}>-</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      <CashEntryForm
        isOpen={showForm}
        onClose={closeForm}
        onSubmit={handleSubmitForm}
        formData={formData}
        onFormChange={handleFormChange}
        isEditMode={!!editingId}
        warehouses={warehouses}
        companies={companies}
        employees={employees}
        agingRows={agingRows}
        adjustments={adjustments}
        onAdjustmentChange={setAdjustments}
        onEditVoucher={handleEdit}
        loading={formLoading}
      />
    </div>
  );
};

export default PartiesCashBookPage;
