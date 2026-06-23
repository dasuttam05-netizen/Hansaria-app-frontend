import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { formatDisplayDate } from "../utils/date";

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

function toSignedEntry(entry) {
  const amount = Number(entry.amount || 0);
  return String(entry.entry_type || "").toLowerCase() === "income" ? amount : -amount;
}

function isEmployeeCompanionEntry(entry) {
  return String(entry.fund_source || "").toLowerCase() === "employee_cash";
}

function isPartyLedgerEntry(entry) {
  return String(entry.company_id || "").trim() !== "" && !isEmployeeCompanionEntry(entry);
}

function getVoucherPairKey(entry) {
  const voucher = String(entry?.voucher_no || "").trim();
  if (voucher) {
    return voucher.replace(/-(PARTY|EMP)$/i, "");
  }
  return String(entry?.journal_group_no || entry?.linked_entry_id || entry?.id || "");
}

function keepPreferredLedgerRow(existing, incoming) {
  const existingSource = String(existing?.fund_source || "").toLowerCase();
  const incomingSource = String(incoming?.fund_source || "").toLowerCase();
  if (existingSource === incomingSource) return existing;
  if (incomingSource === "main_cash") return incoming;
  if (existingSource === "main_cash") return existing;
  return incoming;
}

function getPartyLedgerKey(entry) {
  const voucherKey = getVoucherPairKey(entry);
  const companyId = String(entry?.company_id || "").trim();
  return `${voucherKey}::${companyId}`;
}

const getRecordId = (record) => {
  if (!record) return "";
  if (typeof record === "string" || typeof record === "number") return String(record);
  return String(record.id || record._id || "");
};

export default function CashReportPage() {
  const navigate = useNavigate();
  const [cashEntries, setCashEntries] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  const [ledgerAccount, setLedgerAccount] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [appliedFilters, setAppliedFilters] = useState({
    ledgerAccount: "all",
    startDate: "",
    endDate: "",
  });

  useEffect(() => {
    setLoading(true);
    axios
      .all([axios.get(`${API_BASE}/cash-entries`), axios.get(`${API_BASE}/companies`), axios.get(`${API_BASE}/employees`)])
      .then(
        axios.spread((entriesRes, companiesRes, employeesRes) => {
          setCashEntries(Array.isArray(entriesRes.data) ? entriesRes.data : []);
          setCompanies(Array.isArray(companiesRes.data) ? companiesRes.data : []);
          setEmployees(Array.isArray(employeesRes.data) ? employeesRes.data : []);
        })
      )
      .catch(() => {
        setCashEntries([]);
        setCompanies([]);
        setEmployees([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const matchesLedger = (entry, accountValue) => {
    if (accountValue === "all") return true;
    if (accountValue.startsWith("company:")) {
      return isPartyLedgerEntry(entry) && String(entry.company_id || "") === accountValue.split(":")[1];
    }
    if (accountValue.startsWith("employee:")) {
      return isEmployeeCompanionEntry(entry) && String(entry.employee_id || "") === accountValue.split(":")[1];
    }
    return true;
  };

  const allLedgerOptions = useMemo(() => {
    const options = [{ value: "all", label: "All Ledger Accounts" }];
    const companyMap = new Map();
    const employeeMap = new Map();

    companies.forEach((c) => {
      const id = getRecordId(c);
      if (id) companyMap.set(id, c.name || "Unknown");
    });
    employees.forEach((e) => {
      const id = getRecordId(e);
      if (id) employeeMap.set(id, e.name || "Unknown");
    });
    cashEntries.forEach((entry) => {
      if (entry.company_id && isPartyLedgerEntry(entry) && !companyMap.has(String(entry.company_id))) {
        companyMap.set(String(entry.company_id), entry.company_name || `Party ${entry.company_id}`);
      }
      if (entry.employee_id && isEmployeeCompanionEntry(entry) && !employeeMap.has(String(entry.employee_id))) {
        employeeMap.set(String(entry.employee_id), entry.employee_name || `Employee ${entry.employee_id}`);
      }
    });

    companyMap.forEach((label, id) => options.push({ value: `company:${id}`, label: `[Party] ${label}` }));
    employeeMap.forEach((label, id) => options.push({ value: `employee:${id}`, label: `[Employee] ${label}` }));
    return options;
  }, [cashEntries, companies, employees]);

  const filteredRows = useMemo(() => {
    const rows = cashEntries
      .filter((entry) => entry.status === "posted")
      .filter((entry) => matchesLedger(entry, appliedFilters.ledgerAccount))
      .filter((entry) => {
        if (!appliedFilters.startDate && !appliedFilters.endDate) return true;
        const d = entry.entry_date ? new Date(entry.entry_date) : null;
        if (!d) return false;
        if (appliedFilters.startDate && d < new Date(appliedFilters.startDate)) return false;
        if (appliedFilters.endDate && d > new Date(appliedFilters.endDate)) return false;
        return true;
      })
      .sort((a, b) => new Date(a.entry_date) - new Date(b.entry_date));

    const deduped = [];
    const indexByKey = new Map();

    rows.forEach((row) => {
      const key = getPartyLedgerKey(row);
      if (!key) {
        deduped.push(row);
        return;
      }
      if (!indexByKey.has(key)) {
        indexByKey.set(key, deduped.length);
        deduped.push(row);
        return;
      }
      const idx = indexByKey.get(key);
      deduped[idx] = keepPreferredLedgerRow(deduped[idx], row);
    });

    return deduped;
  }, [cashEntries, appliedFilters]);

  const openingBalance = useMemo(() => {
    if (!appliedFilters.startDate) return 0;
    const from = new Date(appliedFilters.startDate);
    return cashEntries
      .filter((entry) => entry.status === "posted")
      .filter((entry) => matchesLedger(entry, appliedFilters.ledgerAccount))
      .filter((entry) => {
        const d = entry.entry_date ? new Date(entry.entry_date) : null;
        return d && d < from;
      })
      .reduce((sum, entry) => sum + toSignedEntry(entry), 0);
  }, [cashEntries, appliedFilters]);

  const ledgerRows = useMemo(() => {
    let running = openingBalance;
    return filteredRows.map((entry) => {
      const signed = toSignedEntry(entry);
      running += signed;
      const dr = signed > 0 ? signed : 0;
      const cr = signed < 0 ? Math.abs(signed) : 0;
      return { ...entry, dr, cr, balance: running };
    });
  }, [filteredRows, openingBalance]);

  const totals = useMemo(() => {
    const totalDr = ledgerRows.reduce((sum, row) => sum + row.dr, 0);
    const totalCr = ledgerRows.reduce((sum, row) => sum + row.cr, 0);
    return {
      totalDr,
      totalCr,
      closing: openingBalance + totalDr - totalCr,
    };
  }, [ledgerRows, openingBalance]);

  const ledgerLabel = useMemo(() => {
    const match = allLedgerOptions.find((o) => o.value === appliedFilters.ledgerAccount);
    return match ? match.label : "All Ledger Accounts";
  }, [allLedgerOptions, appliedFilters.ledgerAccount]);

  const handleSubmit = () => {
    setAppliedFilters({
      ledgerAccount,
      startDate,
      endDate,
    });
  };

  const handleClear = () => {
    setLedgerAccount("all");
    setStartDate("");
    setEndDate("");
    setAppliedFilters({
      ledgerAccount: "all",
      startDate: "",
      endDate: "",
    });
  };

  return (
    <div style={{ background: "#f3f4f6", minHeight: "100vh", padding: 20, fontFamily: "Segoe UI, Arial, sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h1 style={{ margin: 0, fontSize: 42, color: "#111827", fontWeight: 500 }}>Report - Ledger Statement</h1>
        <button
          onClick={() => navigate("/dashboard")}
          style={{
            padding: "8px 16px",
            background: "#6366f1",
            color: "#fff",
            border: "none",
            borderRadius: 4,
            fontSize: 14,
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          ← Back to Dashboard
        </button>
      </div>

      <div style={panel}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 14 }}>
          <div>
            <label style={label}>Ledger Account</label>
            <select value={ledgerAccount} onChange={(e) => setLedgerAccount(e.target.value)} style={input}>
              {allLedgerOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={label}>Start Date</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={input} />
          </div>
          <div>
            <label style={label}>End Date</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={input} />
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
          <button
            type="button"
            onClick={handleSubmit}
            style={{ border: "none", borderRadius: 4, background: "#3b82f6", color: "#fff", padding: "10px 20px", fontSize: 16, cursor: "pointer" }}
          >
            Submit
          </button>
          <button
            type="button"
            onClick={handleClear}
            style={{ border: "none", borderRadius: 4, background: "#ef4444", color: "#fff", padding: "10px 20px", fontSize: 16, cursor: "pointer" }}
          >
            Clear
          </button>
        </div>
      </div>

      <div style={{ ...panel, marginTop: 14 }}>
        <div style={{ fontSize: 20, color: "#4b5563", marginBottom: 12 }}>
          Ledger statement for {ledgerLabel}
          {appliedFilters.startDate ? ` from ${formatDisplayDate(appliedFilters.startDate)}` : ""}
          {appliedFilters.endDate ? ` to ${formatDisplayDate(appliedFilters.endDate)}` : ""}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", marginBottom: 8 }}>
          <div style={{ border: "1px solid #d1d5db", padding: 8, background: "#fefce8", fontSize: 16, color: "#4b5563" }}>Ledger account</div>
          <div style={{ border: "1px solid #d1d5db", padding: 8, background: "#fefce8", fontSize: 16, color: "#4b5563" }}>{ledgerLabel}</div>
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
                  <th style={th}>Number</th>
                  <th style={th}>Ledger</th>
                  <th style={{ ...th, textAlign: "right" }}>Dr Amount (Rs)</th>
                  <th style={{ ...th, textAlign: "right" }}>Cr Amount (Rs)</th>
                  <th style={{ ...th, textAlign: "right" }}>Balance (Rs)</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ background: "#f9fafb" }}>
                  <td style={td}>-</td>
                  <td style={td}>-</td>
                  <td style={{ ...td, fontWeight: 700 }}>Current opening balance</td>
                  <td style={{ ...td, textAlign: "right" }}>{openingBalance > 0 ? `Rs. ${openingBalance.toFixed(2)}` : "-"}</td>
                  <td style={{ ...td, textAlign: "right" }}>{openingBalance < 0 ? `Rs. ${Math.abs(openingBalance).toFixed(2)}` : "-"}</td>
                  <td style={{ ...td, textAlign: "right", fontWeight: 700 }}>Rs. {openingBalance.toFixed(2)}</td>
                </tr>

                {ledgerRows.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ ...td, textAlign: "center" }}>
                      No ledger entries found.
                    </td>
                  </tr>
                ) : (
                  ledgerRows.map((row) => (
                    <tr key={row.id}>
                      <td style={td}>{formatDisplayDate(row.entry_date)}</td>
                      <td style={td}>{row.voucher_no || "-"}</td>
                      <td style={td}>
                        {(row.company_name || row.company || row.employee_name || row.description || "Cash Entry").slice(0, 60)}
                      </td>
                      <td style={{ ...td, textAlign: "right" }}>{row.dr ? `Rs. ${row.dr.toFixed(2)}` : "-"}</td>
                      <td style={{ ...td, textAlign: "right" }}>{row.cr ? `Rs. ${row.cr.toFixed(2)}` : "-"}</td>
                      <td style={{ ...td, textAlign: "right", fontWeight: 700 }}>Rs. {row.balance.toFixed(2)}</td>
                    </tr>
                  ))
                )}

                <tr style={{ background: "#f9fafb" }}>
                  <td style={td}>-</td>
                  <td style={td}>-</td>
                  <td style={{ ...td, fontWeight: 700 }}>Current closing balance</td>
                  <td style={{ ...td, textAlign: "right", fontWeight: 700 }}>Rs. {totals.totalDr.toFixed(2)}</td>
                  <td style={{ ...td, textAlign: "right", fontWeight: 700 }}>Rs. {totals.totalCr.toFixed(2)}</td>
                  <td style={{ ...td, textAlign: "right", fontWeight: 700 }}>Rs. {totals.closing.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
