import React, { useEffect, useState } from "react";
import axios from "axios";
import { formatDisplayDate } from "../utils/date";
import { ToastContainer, toast, Slide } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useNavigate } from "react-router-dom";
import PageBackCloseActions from "../components/PageBackCloseActions";

export default function ExpensePostedInwardPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadRows = async () => {
    setLoading(true);
    try {
      const res = await axios.get("/api/expenses/inward-posted");
      setRows(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error(error);
      toast.error(error?.response?.data?.error || "Failed to load expense to inward entries", {
        theme: "colored",
      });
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
        <h2 style={{ margin: 0, color: "#0f172a" }}>Expense to Inward Posted</h2>
        <PageBackCloseActions navigate={navigate} size="compact" />
      </div>

      <div style={listCardStyle}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr>
                <th style={tableHeadStyle}>Expense Voucher</th>
                <th style={tableHeadStyle}>Expense Date</th>
                <th style={tableHeadStyle}>Inward Voucher</th>
                <th style={tableHeadStyle}>Inward Date</th>
                <th style={tableHeadStyle}>Warehouse</th>
                <th style={tableHeadStyle}>Employee</th>
                <th style={tableHeadStyle}>Product</th>
                <th style={tableHeadStyle}>Party</th>
                <th style={tableHeadStyle}>Narration</th>
              </tr>
            </thead>
            <tbody>
              {rows.length > 0 ? (
                rows.map((row, index) => (
                  <tr key={`${row.expense_id}-${row.inward_id || index}`} style={{ background: index % 2 === 0 ? "#fff" : "#f8fafc" }}>
                    <td style={tableCellStyle}>{row.expense_voucher_no || "-"}</td>
                    <td style={tableCellStyle}>{formatDisplayDate(row.expense_date)}</td>
                    <td style={tableCellStyle}>{row.inward_voucher_no || "-"}</td>
                    <td style={tableCellStyle}>{formatDisplayDate(row.inward_date)}</td>
                    <td style={tableCellStyle}>{row.warehouse_name || "-"}</td>
                    <td style={tableCellStyle}>{row.employee_name || "-"}</td>
                    <td style={tableCellStyle}>{row.product_name || "-"}</td>
                    <td style={tableCellStyle}>{row.company_name || "-"}</td>
                    <td style={tableCellStyle}>{row.inward_narration || "-"}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="9" style={{ ...tableCellStyle, textAlign: "center" }}>
                    {loading ? "Loading..." : "No posted inward entries found"}
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
  padding: "10px 8px",
  border: "1px solid #0a5f58",
  fontSize: "13px",
  textAlign: "left",
  whiteSpace: "nowrap",
};

const tableCellStyle = {
  border: "1px solid #e2e8f0",
  padding: "8px",
  whiteSpace: "nowrap",
  color: "#0f172a",
};
