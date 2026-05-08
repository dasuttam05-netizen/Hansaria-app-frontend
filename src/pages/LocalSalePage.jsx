import React, { useEffect, useState } from "react";
import axios from "axios";
import { formatDisplayDate } from "../utils/date";
import { ToastContainer, toast, Slide } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useNavigate } from "react-router-dom";
import PageBackCloseActions from "../components/PageBackCloseActions";

export default function LocalSalePage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hoveredId, setHoveredId] = useState(null);
  const navigate = useNavigate();

  const loadRows = async () => {
    setLoading(true);
    try {
      const res = await axios.get("/api/local-sale");
      setRows(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error(error);
      toast.error(error?.response?.data?.error || "Failed to load Local Sale entries", { theme: "colored" });
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
          <h2 style={{ margin: 0, color: "#0f172a" }}>Local Sale</h2>
          <p style={{ margin: "6px 0 0", color: "#64748b", fontSize: "14px" }}>
            Posted Local Sale details from Expense Entry
          </p>
                </div>
        <PageBackCloseActions navigate={navigate} size="compact" />
      </div>

      <div style={listCardStyle}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr>
                <th style={tableHeadStyle}>Voucher</th>
                <th style={tableHeadStyle}>Date</th>
                <th style={tableHeadStyle}>Location</th>
                <th style={tableHeadStyle}>Employee</th>
                <th style={tableHeadStyle}>Product</th>
                <th style={tableHeadStyle}>Party (Company)</th>
                <th style={tableHeadStyle}>Lorry No</th>
                <th style={tableHeadStyle}>Balance Qty</th>
                <th style={tableHeadStyle}>Status</th>
                <th style={actionsHeadStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.length > 0 ? (
                rows.map((row, index) => {
                  const bgColor = hoveredId === row.id ? "#e0f4ff" : index % 2 === 0 ? "#fff" : "#f8fafc";
                  const cellStyle = { ...tableCellStyle, background: bgColor };
                  const actionsCellStyle = {
                    ...cellStyle,
                    position: "sticky",
                    right: 0,
                    zIndex: 2,
                    minWidth: "110px",
                    boxShadow: "-10px 0 18px rgba(15, 23, 42, 0.06)",
                    textAlign: "center",
                  };
                  return (
                    <tr
                      key={row.id}
                      style={{ background: bgColor }}
                      onMouseEnter={() => setHoveredId(row.id)}
                      onMouseLeave={() => setHoveredId(null)}
                    >
                      <td style={cellStyle}>{row.voucher_no}</td>
                      <td style={cellStyle}>{formatDisplayDate(row.expense_date)}</td>
                      <td style={cellStyle}>{row.location_name || "-"}</td>
                      <td style={cellStyle}>{row.employee_name || "-"}</td>
                      <td style={cellStyle}>{row.product_name || "-"}</td>
                      <td style={cellStyle}>{row.company_name || "-"}</td>
                      <td style={cellStyle}>{row.reg_lorry_no || "-"}</td>
                      <td style={{ ...cellStyle, textAlign: "right" }}>{Number(row.balance || 0).toFixed(2)}</td>
                      <td style={cellStyle}>{row.status || "-"}</td>
                      <td style={actionsCellStyle}>
                        <button
                          type="button"
                          onClick={() => {
                            toast.info("Opening expense details for edit", { theme: "colored" });
                            navigate(`/expenses?edit=${row.id}`);
                          }}
                          style={actionBtnStyle}
                          title="Open Expense page"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="10" style={{ ...tableCellStyle, textAlign: "center" }}>
                    {loading ? "Loading..." : "No Local Sale entries found"}
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

const tableHeadStyle = {
  background: "#0f766e",
  color: "#fff",
  padding: "12px",
  textAlign: "left",
  fontWeight: 600,
  fontSize: "13px",
};

const actionsHeadStyle = {
  ...tableHeadStyle,
  position: "sticky",
  right: 0,
  zIndex: 3,
  minWidth: "110px",
  boxShadow: "-10px 0 18px rgba(15, 23, 42, 0.08)",
};

const tableCellStyle = {
  padding: "10px 12px",
  borderBottom: "1px solid #e2e8f0",
  color: "#0f172a",
};

const actionBtnStyle = {
  border: "none",
  borderRadius: "8px",
  background: "#3b82f6",
  color: "#fff",
  padding: "8px 14px",
  cursor: "pointer",
  fontWeight: 600,
  boxShadow: "0 10px 18px rgba(59, 130, 246, 0.28)",
};
