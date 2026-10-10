import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";

const today = () => new Date().toISOString().slice(0, 10);
const money = (value) => (Number(value) || 0).toFixed(2);

export default function WarehouseRentPaymentEntry() {
  const [companies, setCompanies] = useState([]);
  const [bills, setBills] = useState([]);
  const [payments, setPayments] = useState([]);
  const [companyId, setCompanyId] = useState("");
  const [form, setForm] = useState({
    voucher_no: "",
    date: today(),
    amount: "",
    payment_method: "Cash",
    narration: "",
  });
  const [adjustments, setAdjustments] = useState({});
  const [adjustmentMode, setAdjustmentMode] = useState("auto");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadPayments = async () => {
    const response = await axios.get("/api/warehouse-rent-payments");
    setPayments(Array.isArray(response.data?.rows) ? response.data.rows : []);
  };

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const [companyResponse, paymentResponse] = await Promise.all([
          axios.get("/api/warehouse-rent-payments/companies"),
          axios.get("/api/warehouse-rent-payments"),
        ]);
        if (!active) return;
        setCompanies(Array.isArray(companyResponse.data) ? companyResponse.data : []);
        setPayments(Array.isArray(paymentResponse.data?.rows) ? paymentResponse.data.rows : []);
      } catch (loadError) {
        if (active) setError(loadError?.response?.data?.error || "Could not load rent payment data.");
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    const loadPendingBills = async () => {
      setBills([]);
      setAdjustments({});
      if (!companyId) return;
      setLoading(true);
      setError("");
      try {
        const response = await axios.get("/api/warehouse-rent-payments/pending", {
          params: { company_id: companyId },
        });
        if (!active) return;
        const rows = Array.isArray(response.data?.bills) ? response.data.bills : [];
        setBills(rows);
        const nextAdjustments = {};
        rows.forEach((bill) => { nextAdjustments[bill.id] = 0; });
        setAdjustments(nextAdjustments);
      } catch (loadError) {
        if (active) setError(loadError?.response?.data?.error || "Could not load pending warehouse rent bills.");
      } finally {
        if (active) setLoading(false);
      }
    };
    loadPendingBills();
    return () => { active = false; };
  }, [companyId]);

  const orderedBills = useMemo(
    () => [...bills].sort((a, b) =>
      String(a.rent_month || "").localeCompare(String(b.rent_month || "")) ||
      String(a.date || "").localeCompare(String(b.date || ""))
    ),
    [bills]
  );

  useEffect(() => {
    if (adjustmentMode !== "auto") return;
    let remaining = Math.max(0, Number(form.amount) || 0);
    const next = {};
    orderedBills.forEach((bill) => {
      const applied = Math.min(remaining, Number(bill.pending_amount) || 0);
      next[bill.id] = applied > 0 ? applied.toFixed(2) : "";
      remaining = Math.max(0, remaining - applied);
    });
    setAdjustments(next);
  }, [form.amount, orderedBills, adjustmentMode]);

  const allocatedTotal = useMemo(
    () => Object.values(adjustments).reduce((sum, amount) => sum + (Number(amount) || 0), 0),
    [adjustments]
  );

  const pendingTotal = useMemo(
    () => bills.reduce((sum, bill) => sum + (Number(bill.pending_amount) || 0), 0),
    [bills]
  );

  const filteredPayments = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return payments;
    return payments.filter((payment) => [
      payment.voucher_no,
      payment.date,
      payment.company_name,
      payment.amount,
      payment.payment_method,
      ...(payment.allocations || []).map((item) => item.warehouse_name),
    ].some((value) => String(value ?? "").toLowerCase().includes(query)));
  }, [payments, search]);

  const savePayment = async () => {
    setError("");
    setMessage("");
    const amount = Number(form.amount) || 0;
    const allocations = orderedBills
      .map((bill) => ({
        booking_id: bill.id,
        adjusted_amount: Math.round((Number(adjustments[bill.id]) || 0) * 100) / 100,
      }))
      .filter((item) => item.adjusted_amount > 0);
    const sum = Math.round(allocations.reduce((total, item) => total + item.adjusted_amount, 0) * 100) / 100;
    if (!companyId) return setError("Select rent payee company.");
    if (!form.date) return setError("Date is required.");
    if (amount <= 0) return setError("Amount must be greater than zero.");
    if (!allocations.length) return setError("Allocate payment to at least one warehouse rent bill.");
    if (Math.abs(sum - amount) > 0.009) return setError("Allocated amounts must equal payment amount.");
    if (sum > pendingTotal + 0.009) return setError("Payment amount exceeds total pending rent.");

    try {
      setSaving(true);
      const response = await axios.post("/api/warehouse-rent-payments", {
        ...form,
        company_id: companyId,
        allocations,
      });
      setMessage(response.data?.message || "Warehouse rent payment saved.");
      setForm({ voucher_no: "", date: today(), amount: "", payment_method: "Cash", narration: "" });
      setAdjustmentMode("auto");
      try {
        const [pendingResponse, paymentResponse] = await Promise.all([
          axios.get("/api/warehouse-rent-payments/pending", { params: { company_id: companyId } }),
          axios.get("/api/warehouse-rent-payments"),
        ]);
        const pendingRows = Array.isArray(pendingResponse.data?.bills) ? pendingResponse.data.bills : [];
        setBills(pendingRows);
        setAdjustments(Object.fromEntries(pendingRows.map((bill) => [bill.id, 0])));
        setPayments(Array.isArray(paymentResponse.data?.rows) ? paymentResponse.data.rows : []);
      } catch (refreshError) {
        setError(refreshError?.response?.data?.error || "Payment saved, but rent data refresh failed. Please refresh the lists.");
      }
    } catch (saveError) {
      setError(saveError?.response?.data?.error || "Could not save warehouse rent payment.");
    } finally {
      setSaving(false);
    }
  };

  const fieldStyle = {
    display: "block",
    width: "100%",
    boxSizing: "border-box",
    marginTop: 6,
    padding: "10px 12px",
    border: "1px solid #cbd5e1",
    borderRadius: 9,
    background: "#fff",
    color: "#0f172a",
    fontSize: 14,
  };
  const labelStyle = { display: "block", color: "#475569", fontSize: 12, fontWeight: 700 };
  const tableHead = { padding: "11px 10px", background: "#0f766e", color: "#fff", textAlign: "left", whiteSpace: "nowrap" };
  const tableCell = { padding: "10px", borderBottom: "1px solid #e2e8f0", whiteSpace: "nowrap" };

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <section style={{ padding: 20, border: "1px solid #fed7aa", borderTop: "5px solid #ea580c", borderRadius: 16, background: "linear-gradient(135deg, #fff7ed 0%, #fff 55%)", boxShadow: "0 12px 30px rgba(154,52,18,0.08)" }}>
        <div style={{ marginBottom: 18 }}>
          <div style={{ color: "#9a3412", fontSize: 11, fontWeight: 800, letterSpacing: 1.2, textTransform: "uppercase" }}>Voucher Entry / Warehouse Rent</div>
          <h3 style={{ margin: "5px 0 0", color: "#7c2d12", fontSize: 21 }}>Warehouse Rent Payment</h3>
          <div style={{ marginTop: 5, color: "#78716c", fontSize: 13 }}>Pay one bill or distribute the payment across multiple warehouse bills for the selected company.</div>
        </div>

        {message ? <div role="status" style={{ marginBottom: 14, padding: 12, border: "1px solid #86efac", borderRadius: 9, background: "#dcfce7", color: "#166534", fontWeight: 700 }}>{message}</div> : null}
        {error ? <div role="alert" style={{ marginBottom: 14, padding: 12, border: "1px solid #fecaca", borderRadius: 9, background: "#fee2e2", color: "#991b1b", fontWeight: 700 }}>{error}</div> : null}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))", gap: 14, alignItems: "end" }}>
          <label style={labelStyle}>Voucher No
            <div style={{ display: "flex", gap: 6 }}>
              <input value={form.voucher_no} onChange={(event) => setForm((prev) => ({ ...prev, voucher_no: event.target.value }))} placeholder="Auto" style={fieldStyle} />
              <button type="button" onClick={() => setForm((prev) => ({ ...prev, voucher_no: "" }))} style={{ marginTop: 6, padding: "0 11px", border: 0, borderRadius: 8, background: "#ea580c", color: "#fff", fontWeight: 700 }}>Auto</button>
            </div>
          </label>
          <label style={labelStyle}>Date
            <input type="date" value={form.date} onChange={(event) => setForm((prev) => ({ ...prev, date: event.target.value }))} style={fieldStyle} />
          </label>
          <label style={labelStyle}>Rent Payee Company
            <select value={companyId} onChange={(event) => setCompanyId(event.target.value)} style={fieldStyle}>
              <option value="">Select Company</option>
              {companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}
            </select>
          </label>
          <label style={labelStyle}>Payment Amount
            <input type="number" min="0" step="0.01" value={form.amount} onChange={(event) => setForm((prev) => ({ ...prev, amount: event.target.value }))} placeholder="0.00" style={fieldStyle} />
          </label>
          <label style={labelStyle}>Payment Mode
            <select value={form.payment_method} onChange={(event) => setForm((prev) => ({ ...prev, payment_method: event.target.value }))} style={fieldStyle}>
              {["Cash", "Bank", "UPI", "Cheque"].map((mode) => <option key={mode} value={mode}>{mode}</option>)}
            </select>
          </label>
          <label style={labelStyle}>Narration
            <input value={form.narration} onChange={(event) => setForm((prev) => ({ ...prev, narration: event.target.value }))} placeholder="Optional payment note" style={fieldStyle} />
          </label>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginTop: 20, paddingTop: 16, borderTop: "1px solid #fed7aa" }}>
          <div>
            <div style={{ color: "#64748b", fontSize: 12, fontWeight: 700 }}>Pending rent bills · {bills.length}</div>
            <div style={{ color: "#9a3412", fontSize: 18, fontWeight: 800, marginTop: 3 }}>₹ {money(pendingTotal)}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ color: "#64748b", fontSize: 12, fontWeight: 700 }}>Adjustment:</span>
            {["auto", "manual"].map((mode) => (
              <button key={mode} type="button" onClick={() => setAdjustmentMode(mode)} style={{ padding: "8px 12px", border: 0, borderRadius: 8, background: adjustmentMode === mode ? "#ea580c" : "#ffedd5", color: adjustmentMode === mode ? "#fff" : "#9a3412", fontWeight: 800, cursor: "pointer" }}>
                {mode === "auto" ? "Auto Adjust" : "Manual Adjust"}
              </button>
            ))}
            <button type="button" onClick={savePayment} disabled={saving || loading} style={{ padding: "11px 18px", border: 0, borderRadius: 9, background: saving ? "#94a3b8" : "#ea580c", color: "#fff", fontWeight: 800, cursor: saving ? "wait" : "pointer" }}>
              {saving ? "Saving..." : "Save Rent Payment"}
            </button>
          </div>
        </div>

        <div style={{ overflowX: "auto", marginTop: 14, border: "1px solid #fed7aa", borderRadius: 10 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead><tr><th style={tableHead}>Bill No</th><th style={tableHead}>Month</th><th style={tableHead}>Warehouse</th><th style={tableHead}>Bill Amount</th><th style={tableHead}>Paid</th><th style={tableHead}>Pending</th><th style={tableHead}>Adjustment</th></tr></thead>
            <tbody>
              {orderedBills.map((bill, index) => (
                <tr key={bill.id} style={{ background: index % 2 ? "#fffaf5" : "#fff" }}>
                  <td style={tableCell}>{bill.bill_no}</td>
                  <td style={tableCell}>{bill.rent_month}</td>
                  <td style={tableCell}>{bill.warehouse_name || "-"}</td>
                  <td style={tableCell}>₹ {money(bill.bill_amount)}</td>
                  <td style={tableCell}>₹ {money(bill.paid_amount)}</td>
                  <td style={{ ...tableCell, color: "#9a3412", fontWeight: 800 }}>₹ {money(bill.pending_amount)}</td>
                  <td style={tableCell}>
                    <input type="number" min="0" max={bill.pending_amount} step="0.01" disabled={adjustmentMode === "auto"} value={adjustments[bill.id] ?? ""} onChange={(event) => setAdjustments((prev) => ({ ...prev, [bill.id]: event.target.value }))} style={{ ...fieldStyle, width: 145, marginTop: 0, background: adjustmentMode === "auto" ? "#f8fafc" : "#fff" }} />
                  </td>
                </tr>
              ))}
              {!orderedBills.length ? <tr><td colSpan={7} style={{ ...tableCell, padding: 20, color: "#64748b", textAlign: "center" }}>{loading ? "Loading rent bills..." : companyId ? "No pending rent bills for this company." : "Select a rent payee company to view its bills."}</td></tr> : null}
            </tbody>
            {orderedBills.length ? <tfoot><tr style={{ background: "#fff7ed", fontWeight: 800 }}><td style={tableCell} colSpan={6}>Allocated Total</td><td style={{ ...tableCell, color: Math.abs(allocatedTotal - (Number(form.amount) || 0)) <= 0.009 ? "#166534" : "#b91c1c" }}>₹ {money(allocatedTotal)}</td></tr></tfoot> : null}
          </table>
        </div>
      </section>

      <section style={{ overflow: "hidden", border: "1px solid #dbe4ea", borderRadius: 16, background: "#fff", boxShadow: "0 8px 24px rgba(15,23,42,0.06)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", padding: "17px 20px", borderBottom: "1px solid #e2e8f0" }}>
          <div>
            <div style={{ color: "#0f766e", fontSize: 11, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase" }}>Payment history</div>
            <h3 style={{ margin: "4px 0 0", color: "#0f172a" }}>Saved Warehouse Rent Payments ({payments.length})</h3>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search voucher, company, date, warehouse..." style={{ ...fieldStyle, width: "min(100%, 340px)", marginTop: 0 }} />
            <button type="button" onClick={async () => { try { setLoading(true); setError(""); await loadPayments(); } catch (loadError) { setError(loadError?.response?.data?.error || "Could not refresh payment history."); } finally { setLoading(false); } }} disabled={loading} style={{ padding: "9px 14px", border: 0, borderRadius: 8, background: "#0f766e", color: "#fff", fontWeight: 700 }}>Refresh</button>
          </div>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead><tr><th style={tableHead}>Voucher No</th><th style={tableHead}>Date</th><th style={tableHead}>Company</th><th style={tableHead}>Warehouse Bills</th><th style={tableHead}>Amount</th><th style={tableHead}>Mode</th></tr></thead>
            <tbody>
              {filteredPayments.map((payment, index) => (
                <tr key={payment._id || payment.id} style={{ background: index % 2 ? "#f8fafc" : "#fff" }}>
                  <td style={tableCell}>{payment.voucher_no || "-"}</td>
                  <td style={tableCell}>{payment.date || "-"}</td>
                  <td style={tableCell}>{payment.company_name || "-"}</td>
                  <td style={{ ...tableCell, whiteSpace: "normal", minWidth: 220 }}>{(payment.allocations || []).map((item) => `${item.warehouse_name || "Warehouse"} (${item.bill_no || "-"})`).join(", ") || "-"}</td>
                  <td style={{ ...tableCell, fontWeight: 800 }}>₹ {money(payment.amount)}</td>
                  <td style={tableCell}>{payment.payment_method || "-"}</td>
                </tr>
              ))}
              {!filteredPayments.length ? <tr><td colSpan={6} style={{ ...tableCell, padding: 20, color: "#64748b", textAlign: "center" }}>{payments.length ? "No rent payments match your search." : "No warehouse rent payments saved yet."}</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
