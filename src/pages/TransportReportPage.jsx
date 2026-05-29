import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { formatDisplayDate } from "../utils/date";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function TransportReportPage() {
  const navigate = useNavigate();
  const API_BASE = "/api";
  const [records, setRecords] = useState([]);
  const [filters, setFilters] = useState({
    from_date: new Date(new Date().setDate(new Date().getDate() - 30))
      .toISOString()
      .split("T")[0],
    to_date: new Date().toISOString().split("T")[0],
  });

  const card = {
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: 16,
    padding: 16,
    boxShadow: "0 10px 30px rgba(15, 23, 42, 0.08)",
  };

  const input = {
    padding: "10px 12px",
    border: "1px solid #cbd5e1",
    borderRadius: 8,
    fontSize: 14,
    minWidth: 160,
  };

  const button = {
    padding: "10px 16px",
    border: "none",
    borderRadius: 8,
    fontWeight: 700,
    cursor: "pointer",
    color: "#fff",
  };

  const th = {
    background: "#0f766e",
    color: "#fff",
    padding: "10px 12px",
    border: "1px solid #dbe4ea",
    textAlign: "left",
    whiteSpace: "nowrap",
  };

  const td = {
    padding: "10px 12px",
    border: "1px solid #e2e8f0",
    background: "#fff",
    whiteSpace: "nowrap",
  };

  const num = (v) => Number(v || 0).toFixed(2);

  const fetchReport = async () => {
    try {
      const res = await axios.get(`${API_BASE}/transport-bilti/report/list`, {
        params: filters,
      });
      setRecords(res.data || []);
    } catch (err) {
      console.error(err);
      setRecords([]);
    }
  };

  useEffect(() => {
    fetchReport();
  }, []);

  const totals = useMemo(
    () =>
      records.reduce(
        (acc, row) => {
          acc.gross += Number(row.gross_freight) || 0;
          acc.shortage += Number(row.shortage_amount) || 0;
          acc.detain += Number(row.detain_amount) || 0;
          acc.others += Number(row.others_exp) || 0;
          acc.advance += Number(row.advance_amount) || 0;
          acc.tds += Number(row.tds_amount) || 0;
          acc.payable += Number(row.payable_amount) || 0;
          return acc;
        },
        { gross: 0, shortage: 0, detain: 0, others: 0, advance: 0, tds: 0, payable: 0 }
      ),
    [records]
  );

  const downloadPDF = () => {
    const doc = new jsPDF("l", "mm", "a4");
    doc.setFontSize(16);
    doc.text("Transport Report", 14, 14);
    doc.setFontSize(10);
    doc.text(`From: ${filters.from_date}   To: ${filters.to_date}`, 14, 21);

    autoTable(doc, {
      startY: 26,
      theme: "grid",
      headStyles: { fillColor: [15, 118, 110] },
      styles: { fontSize: 7 },
      head: [[
        "Bilti",
        "Transport",
        "Dispatch",
        "Voucher",
        "Party",
        "Lorry",
        "Dest",
        "Gross",
        "Shortage",
        "Detain",
        "Others",
        "Advance",
        "TDS",
        "Payable",
      ]],
      body: records.map((row) => [
        row.bilti_no,
        row.transporter_name || "",
        formatDisplayDate(row.dispatch_date),
        row.voucher_no || row.outward_voucher_no || row.sale_voucher_no || "",
        row.company_name || row.outward_company_name || row.sale_buyer_name || "",
        row.lorry_no || row.outward_lorry_no || row.sale_lorry_no || "",
        row.destination,
        num(row.gross_freight),
        num(row.shortage_amount),
        num(row.detain_amount),
        num(row.others_exp),
        num(row.advance_amount),
        num(row.tds_amount),
        num(row.payable_amount),
      ]),
      foot: [[
        "",
        "",
        "",
        "",
        "",
        "",
        "Totals",
        num(totals.gross),
        num(totals.shortage),
        num(totals.detain),
        num(totals.others),
        num(totals.advance),
        num(totals.tds),
        num(totals.payable),
      ]],
    });

    doc.save("Transport_Report.pdf");
  };

  const handleEdit = (id) => {
    window.location.href = `/transport-bilti?edit=${id}`;
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this bilti?")) return;
    try {
      await axios.delete(`${API_BASE}/transport-bilti/${id}`);
      alert("Bilti deleted successfully");
      fetchReport();
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.error || "Delete failed");
    }
  };

  return (
    <div style={{ padding: 20, background: "#f8fafc", minHeight: "100vh", fontFamily: "Segoe UI, Arial, sans-serif" }}>
      <div style={{ ...card, marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ margin: 0, color: "#0f172a" }}>Transport Report</h2>
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
          ← Back
        </button>
      </div>

      <div style={{ ...card, marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <input type="date" name="from_date" value={filters.from_date} onChange={(e) => setFilters((p) => ({ ...p, from_date: e.target.value }))} style={input} />
          <input type="date" name="to_date" value={filters.to_date} onChange={(e) => setFilters((p) => ({ ...p, to_date: e.target.value }))} style={input} />
          <button onClick={fetchReport} style={{ ...button, background: "#0f766e" }}>Apply</button>
          <button onClick={downloadPDF} style={{ ...button, background: "#2563eb" }}>Download PDF</button>
        </div>
      </div>

      <div style={{ ...card, overflow: "hidden" }}>
        <div style={{ overflowX: "auto", maxHeight: "72vh" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr>
                <th style={th}>Bilti No</th>
                <th style={th}>Transport</th>
                <th style={th}>Dispatch Date</th>
                <th style={th}>Voucher</th>
                <th style={th}>Party</th>
                <th style={th}>Warehouse</th>
                <th style={th}>Lorry</th>
                <th style={th}>Destination</th>
                <th style={th}>Days</th>
                <th style={th}>Outward Qty</th>
                <th style={th}>Dispatch Qty</th>
                <th style={th}>Shortage Qty</th>
                <th style={th}>Rate</th>
                <th style={th}>Gross Freight</th>
                <th style={th}>Shortage Amount</th>
                <th style={th}>Detain</th>
                <th style={th}>Others Exp</th>
                <th style={th}>Advance</th>
                <th style={th}>TDS %</th>
                <th style={th}>TDS Amount</th>
                <th style={th}>Payable</th>
                <th style={th}>Action</th>
              </tr>
            </thead>
            <tbody>
              {records.length > 0 ? (
                records.map((row) => (
                  <tr key={row.id}>
                    <td style={td}>{row.bilti_no}</td>
                    <td style={td}>{row.transporter_name}</td>
                  <td style={td}>{formatDisplayDate(row.dispatch_date)}</td>
                    <td style={td}>{row.voucher_no || row.outward_voucher_no || row.sale_voucher_no || ""}</td>
                    <td style={td}>{row.company_name || row.outward_company_name || row.sale_buyer_name || ""}</td>
                    <td style={td}>{row.warehouse_name || row.outward_warehouse_name || row.sale_warehouse_name || ""}</td>
                    <td style={td}>{row.lorry_no || row.outward_lorry_no || row.sale_lorry_no || ""}</td>
                    <td style={td}>{row.destination}</td>
                    <td style={td}>{row.days}</td>
                    <td style={td}>{num(row.outward_qty)}</td>
                    <td style={td}>{num(row.dispatch_qty)}</td>
                    <td style={td}>{num(row.shortage_qty)}</td>
                    <td style={td}>{num(row.transport_rate)}</td>
                    <td style={td}>{num(row.gross_freight)}</td>
                    <td style={td}>{num(row.shortage_amount)}</td>
                    <td style={td}>{num(row.detain_amount)}</td>
                    <td style={td}>{num(row.others_exp)}</td>
                    <td style={td}>{num(row.advance_amount)}</td>
                    <td style={td}>{num(row.tds_percent)}</td>
                    <td style={td}>{num(row.tds_amount)}</td>
                    <td style={td}>{num(row.payable_amount)}</td>
                    <td style={td}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => handleEdit(row.id)} style={{ ...button, background: "#2563eb", padding: "8px 10px" }}>
                          Edit
                        </button>
                        <button onClick={() => handleDelete(row.id)} style={{ ...button, background: "#dc2626", padding: "8px 10px" }}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td style={td} colSpan="22">No records found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
