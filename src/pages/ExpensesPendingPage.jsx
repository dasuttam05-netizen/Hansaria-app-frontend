import React, { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { formatDisplayDate } from "../utils/date";
import PageBackCloseActions from "../components/PageBackCloseActions";
import { hasPermission, loadSession } from "../utils/auth";

export default function ExpensesPendingPage() {
  const API_BASE = "/api";
  const navigate = useNavigate();
  const { user } = loadSession();
  const canPostEntry = hasPermission(user, "cash.edit");
  const [loading, setLoading] = useState(false);
  const [pendingExpenses, setPendingExpenses] = useState([]);
  const [selectedEntryId, setSelectedEntryId] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get(
        `${API_BASE}/cash-entries?status=pending&entry_type=expense`
      );
      const rows = Array.isArray(response.data) ? response.data : [];
      setPendingExpenses(rows);
      setSelectedEntryId((currentId) =>
        currentId && rows.some((entry) => String(entry.id) === String(currentId))
          ? currentId
          : rows[0]?.id || null
      );
    } catch (err) {
      console.error("Error fetching pending expenses:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handlePostEntry = async (id) => {
    if (!window.confirm("Post this entry to Cash Book?")) return;
    try {
      await axios.patch(`${API_BASE}/cash-entries/${id}`, { status: "posted" });
      alert("Entry posted successfully!");
      fetchData();
    } catch (err) {
      alert("Error posting entry: " + (err.response?.data?.error || err.message));
    }
  };

  const calculateAge = (date) => {
    if (!date) return 0;
    const entryDate = new Date(date);
    if (Number.isNaN(entryDate.getTime())) return 0;
    return Math.max(0, Math.floor((new Date() - entryDate) / (1000 * 60 * 60 * 24)));
  };

  const formatAmount = (value) =>
    Number(value || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const getVoucherLabel = (entry) =>
    entry.source_expense_voucher_no || entry.voucher_no || `EXP-${entry.id}`;

  const getAmountLabel = (entry) => `Rs. ${formatAmount(entry.pending_amount || entry.amount)}`;

  const getPartyName = (entry) => entry.company_name || entry.account_name || "-";

  const getWorkDescription = (entry) =>
    entry.source_expense_work_description || entry.description || "-";

  const stopCardClick = (event) => {
    event.stopPropagation();
  };

  return (
    <div style={pageStyle}>
      <div style={headerCardStyle}>
        <div style={headerContentStyle}>
          <div>
            <h2 style={{ margin: 0, color: "#0f172a" }}>Expenses Pending</h2>
            <p style={{ margin: "6px 0 0", color: "#64748b" }}>
              Pending expense entries awaiting Cash Book posting
            </p>
          </div>
          <PageBackCloseActions navigate={navigate} size="compact" />
        </div>
      </div>

      <div style={listCardStyle}>
        {loading ? (
          <div style={emptyPendingStyle}>
            Loading pending expenses...
          </div>
        ) : pendingExpenses.length === 0 ? (
          <div style={emptyPendingStyle}>
            No pending expense entries found
          </div>
        ) : (
          <>
            <div style={pendingHeaderStyle}>
              <div>
                <div style={{ fontWeight: 800, color: "#0f172a" }}>Pending Approval</div>
                <div style={{ color: "#64748b", fontSize: 13 }}>Select an expense to view actions.</div>
              </div>
              <span style={pendingCountStyle}>{pendingExpenses.length}</span>
            </div>

            <div style={expenseCardListStyle}>
              {pendingExpenses.map((entry) => {
                const selected = String(selectedEntryId || "") === String(entry.id);

                return (
                  <div
                    key={entry.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedEntryId(entry.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setSelectedEntryId(entry.id);
                      }
                    }}
                    style={{
                      ...expenseCardStyle,
                      borderColor: selected ? "#93c5fd" : "#dbe4ea",
                      boxShadow: selected ? "0 0 0 3px rgba(59,130,246,0.12)" : "none",
                      background: selected ? "#f8fbff" : "#f6f9fd",
                    }}
                  >
                    <div style={expenseCardTopStyle}>
                      <div style={expenseVoucherStyle}>{getVoucherLabel(entry)}</div>
                      <span style={amountBadgeStyle}>{getAmountLabel(entry)}</span>
                    </div>

                    <div style={expenseCardLineStyle}>
                      <strong>Date:</strong> {formatDisplayDate(entry.entry_date) || "-"}
                    </div>
                    <div style={expenseCardLineStyle}>
                      <strong>Party:</strong> {getPartyName(entry)}
                    </div>
                    <div style={expenseCardLineStyle}>
                      <strong>Reference No:</strong> {entry.reference_no || "-"}
                    </div>

                    {selected ? (
                      <div style={selectedPanelStyle}>
                        <div style={detailGridStyle}>
                          <div><strong>Age:</strong> {calculateAge(entry.entry_date)} days</div>
                          <div><strong>Warehouse:</strong> {entry.warehouse_name || "-"}</div>
                          <div><strong>Employee:</strong> {entry.source_expense_employee_name || entry.employee_name || "-"}</div>
                          <div><strong>Work:</strong> {getWorkDescription(entry)}</div>
                          <div><strong>Paid By:</strong> {entry.source_expense_paid_by || "-"}</div>
                          <div><strong>Grand Total:</strong> {formatAmount(entry.source_expense_amount || entry.amount)}</div>
                          <div><strong>Pending Amount:</strong> {formatAmount(entry.pending_amount || entry.amount)}</div>
                          <div><strong>Net Expense:</strong> {formatAmount(entry.amount)}</div>
                        </div>

                        <div style={selectedActionStyle} onClick={stopCardClick}>
                          {canPostEntry ? (
                            <button
                              onClick={() => handlePostEntry(entry.id)}
                              style={{ ...miniButtonStyle, background: "#16a34a" }}
                            >
                              Post Entry
                            </button>
                          ) : (
                            <span style={viewOnlyStyle}>View Only</span>
                          )}
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const pageStyle = {
  padding: 20,
  background: "#f8fafc",
  minHeight: "100vh",
  fontFamily: "Segoe UI, Arial, sans-serif",
};

const headerCardStyle = {
  background: "#fff",
  border: "1px solid #e2e8f0",
  borderRadius: 16,
  padding: 16,
  boxShadow: "0 10px 24px rgba(15, 23, 42, 0.08)",
  marginBottom: 16,
};

const headerContentStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap",
};

const listCardStyle = {
  background: "#fff",
  border: "1px solid #e2e8f0",
  borderRadius: 16,
  boxShadow: "0 10px 24px rgba(15, 23, 42, 0.08)",
  overflow: "hidden",
};

const pendingHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  padding: "16px 16px 0",
  marginBottom: 14,
  flexWrap: "wrap",
};

const pendingCountStyle = {
  minWidth: 36,
  height: 30,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 999,
  background: "#dbeafe",
  color: "#1d4ed8",
  fontWeight: 900,
  fontSize: 13,
};

const expenseCardListStyle = {
  display: "grid",
  gap: 10,
  padding: "0 16px 16px",
};

const expenseCardStyle = {
  border: "1px solid #dbe4ea",
  borderRadius: 8,
  padding: "14px 14px 12px",
  cursor: "pointer",
  transition: "border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease",
  outline: "none",
};

const expenseCardTopStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  marginBottom: 10,
};

const expenseVoucherStyle = {
  color: "#1d4ed8",
  fontWeight: 900,
  fontSize: 15,
};

const amountBadgeStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 20,
  padding: "3px 10px",
  borderRadius: 999,
  background: "#dbeafe",
  color: "#1d4ed8",
  fontWeight: 900,
  fontSize: 11,
  whiteSpace: "nowrap",
};

const expenseCardLineStyle = {
  color: "#0f172a",
  fontSize: 12,
  lineHeight: 1.45,
};

const selectedPanelStyle = {
  marginTop: 12,
  paddingTop: 12,
  borderTop: "1px solid #dbe4ea",
};

const detailGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
  gap: "8px 14px",
  color: "#334155",
  fontSize: 12,
};

const selectedActionStyle = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
  marginTop: 12,
};

const miniButtonStyle = {
  border: "none",
  color: "#fff",
  borderRadius: 8,
  padding: "7px 11px",
  cursor: "pointer",
  fontWeight: 700,
  fontSize: 12,
};

const viewOnlyStyle = {
  color: "#64748b",
  fontSize: 12,
  fontWeight: 700,
  padding: "7px 0",
};

const emptyPendingStyle = {
  margin: 16,
  padding: "26px 12px",
  textAlign: "center",
  color: "#64748b",
  border: "1px dashed #cbd5e1",
  borderRadius: 8,
  background: "#f8fafc",
};
