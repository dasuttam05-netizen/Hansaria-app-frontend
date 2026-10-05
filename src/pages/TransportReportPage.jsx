import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { FaFilePdf, FaWhatsapp, FaSyncAlt, FaBook } from "react-icons/fa";
import { formatDisplayDate } from "../utils/date";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function TransportReportPage() {
  const navigate = useNavigate();
  const API_BASE = "/api";
  const [records, setRecords] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
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

  const fetchReport = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE}/transport-bilti/report/list`, {
        params: { ...filters, _t: Date.now() },
        headers: {
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
      });
      setRecords(res.data || []);
    } catch (err) {
      console.error(err);
      setRecords([]);
    }
  }, [filters.from_date, filters.to_date]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "F5") {
        event.preventDefault();
        fetchReport();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [fetchReport]);

  const visibleRecords = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    if (!search) return records;

    return records.filter((row) => {
      const haystack = [
        row.transporter_name,
        row.bilti_no,
        row.voucher_no,
        row.outward_voucher_no,
        row.sale_voucher_no,
        row.lorry_no,
        row.outward_lorry_no,
        row.sale_lorry_no,
        row.company_name,
        row.outward_company_name,
        row.sale_buyer_name,
        row.warehouse_name,
        row.destination,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(search);
    });
  }, [records, searchTerm]);

  const totals = useMemo(
    () =>
      visibleRecords.reduce(
        (acc, row) => {
          acc.gross += Number(row.gross_freight) || 0;
          acc.net += Number(row.net_amount) || 0;
          acc.shortage += Number(row.shortage_amount) || 0;
          acc.detain += Number(row.detain_amount) || 0;
          acc.others += Number(row.others_exp) || 0;
          acc.advance += Number(row.advance_amount) || 0;
          acc.tds += Number(row.tds_amount) || 0;
          acc.payable += Number(row.payable_amount) || 0;
          return acc;
        },
        { gross: 0, net: 0, shortage: 0, detain: 0, others: 0, advance: 0, tds: 0, payable: 0 }
      ),
    [visibleRecords]
  );

  const buildReportPdf = (rows, title = "Transport Report") => {
    const doc = new jsPDF("l", "mm", "a4");
    doc.setFontSize(16);
    doc.text(title, 14, 14);
    doc.setFontSize(10);
    doc.text(`From: ${filters.from_date}   To: ${filters.to_date}`, 14, 21);

    const rowTotals = rows.reduce(
      (acc, row) => {
        acc.gross += Number(row.gross_freight) || 0;
        acc.net += Number(row.net_amount) || 0;
        acc.shortage += Number(row.shortage_amount) || 0;
        acc.detain += Number(row.detain_amount) || 0;
        acc.others += Number(row.others_exp) || 0;
        acc.advance += Number(row.advance_amount) || 0;
        acc.tds += Number(row.tds_amount) || 0;
        acc.payable += Number(row.payable_amount) || 0;
        return acc;
      },
      { gross: 0, net: 0, shortage: 0, detain: 0, others: 0, advance: 0, tds: 0, payable: 0 }
    );

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
        "Net Amount",
        "Shortage",
        "Detain",
        "Others",
        "Advance",
        "TDS",
        "Payable",
      ]],
      body: rows.map((row) => [
        row.bilti_no,
        row.transporter_name || "",
        formatDisplayDate(row.dispatch_date),
        row.voucher_no || row.outward_voucher_no || row.sale_voucher_no || "",
        row.company_name || row.outward_company_name || row.sale_buyer_name || "",
        row.lorry_no || row.outward_lorry_no || row.sale_lorry_no || "",
        row.destination || "",
        num(row.gross_freight),
        num(row.net_amount),
        num(row.shortage_amount),
        num(row.detain_amount),
        num(row.others_exp),
        num(row.advance_amount),
        num(row.tds_amount),
        num(row.payable_amount),
      ]),
      foot: [[
        "", "", "", "", "", "", "Totals",
        num(rowTotals.gross),
        num(rowTotals.net),
        num(rowTotals.shortage),
        num(rowTotals.detain),
        num(rowTotals.others),
        num(rowTotals.advance),
        num(rowTotals.tds),
        num(rowTotals.payable),
      ]],
    });

    return doc;
  };

  const makePdfFile = (rows, title, filename) => {
    const doc = buildReportPdf(rows, title);
    const blob = doc.output("blob");
    return {
      doc,
      file: new File([blob], filename, { type: "application/pdf" }),
    };
  };

  const downloadPDF = () => {
    const { doc } = makePdfFile(
      visibleRecords,
      "Transport Report",
      "Transport_Report.pdf"
    );
    doc.save("Transport_Report.pdf");
  };

  const sharePdf = async (rows, title, filename, whatsappText) => {
    const { file } = makePdfFile(rows, title, filename);
    try {
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title,
          text: whatsappText,
          files: [file],
        });
        return;
      }
    } catch (err) {
      console.error("PDF share failed", err);
    }

    window.open(
      `https://wa.me/?text=${encodeURIComponent(whatsappText)}`,
      "_blank"
    );
  };

  const shareReportWhatsApp = () => {
    sharePdf(
      visibleRecords,
      "Transport Report",
      "Transport_Report.pdf",
      `Transport Report\nFrom: ${filters.from_date}\nTo: ${filters.to_date}\nRows: ${visibleRecords.length}`
    );
  };

  const transportRows = (transportName) =>
    visibleRecords.filter(
      (row) =>
        String(row.transporter_name || "").trim().toLowerCase() ===
        String(transportName || "").trim().toLowerCase()
    );

  const buildTransportLedgerPdf = (row) => {
    const name = row?.transporter_name || "Transport";
    const rows = transportRows(name);
    const doc = new jsPDF("l", "mm", "a4");
    doc.setFontSize(16);
    doc.text(`Transport Ledger - ${name}`, 14, 14);
    doc.setFontSize(10);
    doc.text(`From: ${filters.from_date}   To: ${filters.to_date}`, 14, 21);

    autoTable(doc, {
      startY: 26,
      theme: "grid",
      headStyles: { fillColor: [15, 118, 110] },
      styles: { fontSize: 7 },
      head: [["Date", "Bilti", "Voucher", "Lorry", "Destination", "Gross", "Net", "Shortage", "Detain", "Others", "Advance", "TDS", "Payable"]],
      body: rows.map((item) => [
        formatDisplayDate(item.dispatch_date),
        item.bilti_no || "",
        item.voucher_no || item.outward_voucher_no || item.sale_voucher_no || "",
        item.lorry_no || item.outward_lorry_no || item.sale_lorry_no || "",
        item.destination || "",
        num(item.gross_freight),
        num(item.net_amount),
        num(item.shortage_amount),
        num(item.detain_amount),
        num(item.others_exp),
        num(item.advance_amount),
        num(item.tds_amount),
        num(item.payable_amount),
      ]),
    });

    return { doc, rows, name };
  };

  const downloadTransportLedger = (row) => {
    const { doc, name } = buildTransportLedgerPdf(row);
    doc.save(`Transport_Ledger_${name.replace(/[^a-z0-9]+/gi, "_")}.pdf`);
  };

  const shareTransportLedger = (row) => {
    const { doc, rows, name } = buildTransportLedgerPdf(row);
    const filename = `Transport_Ledger_${name.replace(/[^a-z0-9]+/gi, "_")}.pdf`;
    const pdfBlob = doc.output("blob");
    const pdfFile = new File([pdfBlob], filename, { type: "application/pdf" });
    const textMessage = `Transport Ledger\nTransport: ${name}\nFrom: ${filters.from_date}\nTo: ${filters.to_date}\nRows: ${rows.length}`;

    (async () => {
      try {
        if (navigator.share && navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
          await navigator.share({
            title: `Transport Ledger - ${name}`,
            text: textMessage,
            files: [pdfFile],
          });
          return;
        }
      } catch (err) {
        console.error("Transport ledger share failed", err);
      }
      window.open(`https://wa.me/?text=${encodeURIComponent(textMessage)}`, "_blank");
    })();
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
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search transport / bilti / voucher / lorry"
            style={{ ...input, minWidth: 300 }}
          />
          <button onClick={fetchReport} style={{ ...button, background: "#0f766e", display: "inline-flex", alignItems: "center", gap: 8 }}><FaSyncAlt /> F5 / Refresh</button>
          <button onClick={downloadPDF} style={{ ...button, background: "#2563eb", display: "inline-flex", alignItems: "center", gap: 8 }}><FaFilePdf /> Report PDF</button>
          <button onClick={shareReportWhatsApp} style={{ ...button, background: "#16a34a", display: "inline-flex", alignItems: "center", gap: 8 }}><FaWhatsapp /> WhatsApp Report</button>
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
                <th style={th}>Net Amount</th>
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
              {visibleRecords.length > 0 ? (
                visibleRecords.map((row) => (
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
                    <td style={td}>{num(row.net_amount)}</td>
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
                        <button
                          onClick={() => {
                            const { doc } = makePdfFile([row], `Transport Bilti - ${row.bilti_no || ""}`, `Transport_Bilti_${row.bilti_no || row.id}.pdf`);
                            doc.save(`Transport_Bilti_${row.bilti_no || row.id}.pdf`);
                          }}
                          style={{ ...button, background: "#475569", padding: "8px 10px", display: "inline-flex", alignItems: "center", gap: 6 }}
                        >
                          <FaFilePdf /> PDF
                        </button>
                        <button
                          onClick={() => sharePdf([row], `Transport Bilti - ${row.bilti_no || ""}`, `Transport_Bilti_${row.bilti_no || row.id}.pdf`, `Transport Bilti\nBilti: ${row.bilti_no || ""}\nTransport: ${row.transporter_name || ""}\nPayable: ${num(row.payable_amount)}`)}
                          style={{ ...button, background: "#16a34a", padding: "8px 10px", display: "inline-flex", alignItems: "center", gap: 6 }}
                        >
                          <FaWhatsapp /> WhatsApp
                        </button>
                        <button onClick={() => downloadTransportLedger(row)} style={{ ...button, background: "#7c3aed", padding: "8px 10px", display: "inline-flex", alignItems: "center", gap: 6 }}>
                          <FaBook /> Ledger PDF
                        </button>
                        <button onClick={() => shareTransportLedger(row)} style={{ ...button, background: "#059669", padding: "8px 10px", display: "inline-flex", alignItems: "center", gap: 6 }}>
                          <FaWhatsapp /> Ledger WhatsApp
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
                  <td style={td} colSpan="23">No records found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
