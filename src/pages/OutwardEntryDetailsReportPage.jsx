import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { formatDisplayDate } from "../utils/date";

const card = {
  background: "#fff",
  border: "1px solid #dbe4ea",
  borderRadius: 16,
  padding: 16,
  boxShadow: "0 8px 24px rgba(15, 23, 42, 0.06)",
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
  border: "1px solid #d9e2ec",
  textAlign: "left",
  whiteSpace: "nowrap",
};

const td = {
  padding: "10px 12px",
  border: "1px solid #e5e7eb",
  background: "#fff",
  verticalAlign: "top",
  color: "#0f172a",
};

const statValue = {
  fontSize: 22,
  fontWeight: 800,
  color: "#14532d",
  marginTop: 8,
};

const formatQty = (value) => Number(value || 0).toFixed(2);

const getMovement = (row) => {
  const outwardQty = Number(row.outward_qty || row.dispatch_qty || 0);
  const unloadingQty = Number(row.unloading_qty || 0);
  const adjustmentDetails = Array.isArray(row.adjustment_details) ? row.adjustment_details : [];
  const paltiQty = adjustmentDetails
    .filter((item) => String(item.source_type || "").toLowerCase() === "palti_lorry")
    .reduce((sum, item) => sum + (Number(item.settlement_weight) || 0), 0);
  const godownQty = Math.max(outwardQty - unloadingQty - paltiQty, 0);
  const balanceQty = Math.max(outwardQty - unloadingQty - paltiQty - godownQty, 0);

  return {
    outwardQty,
    unloadingQty,
    paltiQty,
    godownQty,
    balanceQty,
    adjustmentDetails,
  };
};

export default function OutwardEntryDetailsReportPage() {
  const navigate = useNavigate();
  const API_BASE = "/api";

  const [records, setRecords] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    from_date: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split("T")[0],
    to_date: new Date().toISOString().split("T")[0],
    company_id: "",
    warehouse_id: "",
  });

  const fetchDropdowns = async () => {
    try {
      const [companyRes, warehouseRes] = await Promise.all([
        axios.get(`${API_BASE}/companies`),
        axios.get(`${API_BASE}/warehouses`),
      ]);
      setCompanies(Array.isArray(companyRes.data) ? companyRes.data : []);
      setWarehouses(Array.isArray(warehouseRes.data) ? warehouseRes.data : []);
    } catch (err) {
      console.error(err);
      setCompanies([]);
      setWarehouses([]);
    }
  };

  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/outward-settlement/report/list`, { params: filters });
      setRecords(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDropdowns();
    fetchReport();
  }, []);

  const totals = useMemo(
    () =>
      records.reduce(
        (acc, row) => {
          const movement = getMovement(row);
          acc.outward += movement.outwardQty;
          acc.unloading += movement.unloadingQty;
          acc.palti += movement.paltiQty;
          acc.godown += movement.godownQty;
          acc.balance += movement.balanceQty;
          acc.settlement += Number(row.settlement_weight) || 0;
          acc.shortage += Number(row.shortage_qty) || 0;
          acc.net += Number(row.receivable_amount) || 0;
          return acc;
        },
        { outward: 0, unloading: 0, palti: 0, godown: 0, balance: 0, settlement: 0, shortage: 0, net: 0 }
      ),
    [records]
  );

  const applyFilters = () => fetchReport();

  return (
    <div style={{ padding: 20, background: "#f8fafc", minHeight: "100vh", fontFamily: "Segoe UI, Arial, sans-serif" }}>
      <div style={{ ...card, marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, color: "#0f172a" }}>Outward Entry Details Report</h2>
          <p style={{ margin: "6px 0 0", color: "#475569" }}>
            Outward load, unloading, palti, report-only godown balance, and narration in one place
          </p>
        </div>
        <button
          onClick={() => navigate("/dashboard")}
          style={{ ...button, background: "#6366f1", whiteSpace: "nowrap" }}
        >
          Back
        </button>
      </div>

      <div style={{ ...card, marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <input
            type="date"
            value={filters.from_date}
            onChange={(e) => setFilters((p) => ({ ...p, from_date: e.target.value }))}
            style={input}
          />
          <input
            type="date"
            value={filters.to_date}
            onChange={(e) => setFilters((p) => ({ ...p, to_date: e.target.value }))}
            style={input}
          />
          <select
            value={filters.company_id}
            onChange={(e) => setFilters((p) => ({ ...p, company_id: e.target.value }))}
            style={input}
          >
            <option value="">All Companies</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            value={filters.warehouse_id}
            onChange={(e) => setFilters((p) => ({ ...p, warehouse_id: e.target.value }))}
            style={input}
          >
            <option value="">All Warehouses</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
          <button onClick={applyFilters} style={{ ...button, background: "#0f766e" }}>
            Apply
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 14, marginBottom: 16 }}>
        <div style={card}><div>Outward Qty</div><div style={statValue}>{formatQty(totals.outward)}</div></div>
        <div style={card}><div>Unloading Qty</div><div style={statValue}>{formatQty(totals.unloading)}</div></div>
        <div style={card}><div>Palti Qty</div><div style={statValue}>{formatQty(totals.palti)}</div></div>
        <div style={card}><div>Godown Qty</div><div style={statValue}>{formatQty(totals.godown)}</div></div>
        <div style={card}><div>Balance</div><div style={statValue}>{formatQty(totals.balance)}</div></div>
        <div style={card}><div>Settlement Wt</div><div style={statValue}>{formatQty(totals.settlement)}</div></div>
        <div style={card}><div>Shortage</div><div style={statValue}>{formatQty(totals.shortage)}</div></div>
        <div style={card}><div>Net Receivable</div><div style={statValue}>{formatQty(totals.net)}</div></div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {loading ? (
          <div style={card}>Loading report...</div>
        ) : records.length === 0 ? (
          <div style={card}>No outward records found.</div>
        ) : (
          records.map((row) => {
            const movement = getMovement(row);

            return (
              <div key={row.id || row.outward_id} style={card}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div>
                    <h3 style={{ margin: 0, color: "#0f172a" }}>
                      {row.voucher_no || `OUT-${row.outward_id}`} | {row.account_name || row.company_name || "-"}
                    </h3>
                    <div style={{ color: "#475569", marginTop: 6 }}>
                      Date: {formatDisplayDate(row.date)} | Warehouse: {row.warehouse_name || "-"} | Location: {row.location_name || "-"}
                    </div>
                    <div style={{ color: "#475569", marginTop: 4 }}>
                      Buyer: {row.buyer_name || "-"} | Consignee: {row.consignee_name || "-"} | Product: {row.product_name || "-"} | Lorry: {row.lorry_no || "-"}
                    </div>
                    {row.narration ? (
                      <div style={{ color: "#475569", marginTop: 4 }}>
                        Narration: {row.narration}
                      </div>
                    ) : null}
                  </div>
                  <div style={{ minWidth: 280, color: "#0f172a", fontSize: 14 }}>
                    <div>Load Qty: {formatQty(movement.outwardQty)}</div>
                    <div>Unloading Qty: {formatQty(movement.unloadingQty)}</div>
                    <div>Palti Qty: {formatQty(movement.paltiQty)}</div>
                    <div>Godown Qty: {formatQty(movement.godownQty)}</div>
                    <div>Balance: {formatQty(movement.balanceQty)}</div>
                  </div>
                </div>

                <div style={{ marginTop: 14, overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead>
                      <tr>
                        <th style={th}>Sr</th>
                        <th style={th}>Company</th>
                        <th style={th}>Loading Type</th>
                        <th style={th}>Lorry No</th>
                        <th style={th}>Inward Voucher</th>
                        <th style={th}>Settlement Wt</th>
                        <th style={th}>Company Rate</th>
                        <th style={th}>Amount</th>
                        <th style={th}>Net Payable</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(movement.adjustmentDetails || []).length > 0 ? (
                        movement.adjustmentDetails.map((item, index) => {
                          const dispatchQty = Number(row.dispatch_qty) || 0;
                          const shortageQty = Number(row.shortage_qty) || 0;
                          const weight = Number(item.settlement_weight) || 0;
                          const companyRate = Number(item.company_rate || row.company_rate || 0);
                          const shortQty = dispatchQty > 0 ? (weight / dispatchQty) * shortageQty : 0;
                          const freight = Number(item.freight) || 0;
                          const labour = Number(item.labour_charges) || 0;
                          const other = Number(item.other_charges) || 0;
                          const amount = Number(item.amount) || weight * companyRate;
                          const shortAmount = Number(item.shortAmount) || shortQty * companyRate;
                          const netPayable = Number(item.net_payable) || amount - freight - labour - other - shortAmount;

                          return (
                            <tr key={item.id || `${row.outward_id}-${index}`}>
                              <td style={td}>{index + 1}</td>
                              <td style={td}>{item.company_name || "-"}</td>
                              <td style={td}>{String(item.source_type || "").toLowerCase() === "palti_lorry" ? "Palti Lorry" : "Warehouse Loading"}</td>
                              <td style={td}>{item.lorry_no || "-"}</td>
                              <td style={td}>{item.inward_voucher_no || "-"}</td>
                              <td style={td}>{formatQty(weight)}</td>
                              <td style={td}>{formatQty(companyRate)}</td>
                              <td style={td}>{formatQty(amount)}</td>
                              <td style={td}>{formatQty(netPayable)}</td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td style={td} colSpan="9">
                            No adjusted details found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
