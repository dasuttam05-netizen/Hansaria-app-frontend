import React, { useEffect, useState } from "react";
import axios from "axios";
import { formatDisplayDate } from "../utils/date";
import { ToastContainer, toast, Slide } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useNavigate } from "react-router-dom";
import PageBackCloseActions from "../components/PageBackCloseActions";

export default function PaltiLorryPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hoveredId, setHoveredId] = useState(null);
  const navigate = useNavigate();

  const loadRows = async () => {
    setLoading(true);
    try {
      const res = await axios.get("/api/palti-lorry");
      setRows(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error(error);
      toast.error(error?.response?.data?.error || "Failed to load Palti Lorry entries", { theme: "colored" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRows();
  }, []);

  return (
    <div style={pageStyle}>
      <ToastContainer position="top-right" autoClose={2500} hideProgressBar transition={Slide} />
      <div style={{ ...headerCardStyle, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ margin: 0, color: "#0f172a" }}>Palti Lorry</h2>
          <p style={{ margin: "6px 0 0", color: "#64748b", fontSize: "14px" }}>
            Posted Palti Lorry entries
          </p>
                </div>
        <PageBackCloseActions navigate={navigate} size="compact" />
      </div>

      <div style={listCardStyle}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: tableFontSize }}>
            <thead>
              <tr>
                <th style={thStyle}>Voucher</th>
                <th style={thStyle}>Date</th>
                <th style={thStyle}>Warehouse</th>
                <th style={thStyle}>Employee</th>
                <th style={thStyle}>Product</th>
                <th style={thStyle}>Company</th>
                <th style={thStyle}>Reg From</th>
                <th style={thStyle}>Reject Lorry</th>
                <th style={thStyle}>Balance</th>
                <th style={thStyle}>Palti Lorry</th>
                <th style={thStyle}>New Weight</th>
                <th style={thActionsStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.length > 0 ? (
                rows.map((row, index) => {
                  const rowBg = hoveredId === row.id ? rowHoverBg : index % 2 === 0 ? "#fff" : "#f8fafc";
                  const cellBase = { ...tdStyle, background: rowBg };
                  const cellRight = { ...tdStyleRight, background: rowBg };
                  const actionsCell = {
                    ...tdStyle,
                    background: rowBg,
                    position: "sticky",
                    right: 0,
                    zIndex: 2,
                    minWidth: "170px",
                    boxShadow: "-10px 0 18px rgba(15, 23, 42, 0.06)",
                  };

                  return (
                    <tr
                      key={row.id}
                      onMouseEnter={() => setHoveredId(row.id)}
                      onMouseLeave={() => setHoveredId(null)}
                    >
                      <td style={cellBase}>{row.voucher_no || "-"}</td>
                      <td style={cellBase}>{formatDisplayDate(row.expense_date)}</td>
                      <td style={cellBase}>{row.warehouse_name || "-"}</td>
                      <td style={cellBase}>{row.employee_name || "-"}</td>
                      <td style={cellBase}>{row.product_name || "-"}</td>
                      <td style={cellBase}>{row.company_name || "-"}</td>
                      <td style={cellBase}>{row.reg_from_name || "-"}</td>
                      <td style={cellBase}>{row.reg_lorry_no || "-"}</td>
                      <td style={cellRight}>{Number(row.balance || 0).toFixed(2)}</td>
                      <td style={cellBase}>{row.display_lorry_no || row.new_lorry_no || row.reg_lorry_no || "-"}</td>
                      <td style={cellRight}>{Number(row.new_weight || 0).toFixed(2)}</td>
                      <td style={actionsCell}>
                        <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                          <button
                            type="button"
                            onClick={() => {
                              toast.info("Opening expense details for edit", { theme: "colored" });
                              navigate(`/expenses?edit=${row.expense_id || row.id}`);
                            }}
                            style={{ ...actionBtnStyle, background: "#3b82f6", color: "#fff", boxShadow: "0 10px 18px rgba(59, 130, 246, 0.28)" }}
                            title="Open Expense page"
                          >
                            <span style={actionIconStyle}>✎</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              toast.info("Open Expense page for delete", { theme: "colored" });
                              navigate("/expenses");
                            }}
                            style={{ ...actionBtnStyle, background: "#ef4444", color: "#fff", boxShadow: "0 10px 18px rgba(239, 68, 68, 0.26)" }}
                            title="Open Expense page"
                          >
                            <span style={actionIconStyle}>🗑</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="12" style={{ ...tdStyle, textAlign: "center" }}>
                    {loading ? "Loading..." : "No Palti Lorry entries found"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const pageStyle = {
  padding: "20px",
  background: "#f8fafc",
  minHeight: "100vh",
  fontFamily: "Segoe UI, Arial, sans-serif",
};

const headerCardStyle = {
  background: "#fff",
  border: "1px solid #e2e8f0",
  borderRadius: "16px",
  boxShadow: "0 10px 24px rgba(15, 23, 42, 0.08)",
  padding: "18px 20px",
  marginBottom: "16px",
};

const listCardStyle = {
  background: "#fff",
  border: "1px solid #e2e8f0",
  borderRadius: "16px",
  boxShadow: "0 10px 24px rgba(15, 23, 42, 0.08)",
  overflow: "hidden",
};

const tableFontSize = "13px";
const rowHoverBg = "#e0f4ff";

const thStyle = {
  padding: "7px 8px",
  border: "1px solid #dbe7f1",
  background: "#0f766e",
  color: "#fff",
  position: "sticky",
  top: 0,
  zIndex: 3,
  textAlign: "center",
  whiteSpace: "nowrap",
  fontSize: "13px",
  fontWeight: 700,
  lineHeight: 1,
};

const thActionsStyle = {
  ...thStyle,
  right: 0,
  zIndex: 4,
  minWidth: "170px",
  boxShadow: "-10px 0 18px rgba(15, 23, 42, 0.08)",
};

const tdStyle = {
  padding: "3px 6px",
  border: "1px solid #edf2f7",
  verticalAlign: "middle",
  background: "#fff",
  whiteSpace: "nowrap",
  fontSize: "12px",
  lineHeight: 1.05,
  fontWeight: 500,
  color: "#0f172a",
  textAlign: "center",
};

const tdStyleRight = {
  ...tdStyle,
  textAlign: "right",
};

const actionIconStyle = {
  fontSize: "13px",
  lineHeight: 1,
};

const actionBtnStyle = {
  width: "32px",
  height: "32px",
  padding: 0,
  fontSize: "13px",
  borderRadius: "8px",
  border: "none",
  cursor: "pointer",
  fontWeight: 600,
  flexShrink: 0,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
};


