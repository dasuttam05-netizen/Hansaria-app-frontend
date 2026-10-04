import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getApiUrl } from "../utils/api";

const API_BASE = getApiUrl("/api");

const money = (value) => Number(value || 0).toLocaleString("en-IN", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const asId = (row) => String(row?.id ?? row?._id ?? row?.legacy_id ?? "");

const emptyForm = () => ({
  voucher_no: "",
  auto_voucher: true,
  date: new Date().toISOString().slice(0, 10),
  warehouse_id: "",
  warehouse_name: "",
  sale_id: "",
  sale_voucher_no: "",
  outward_id: "",
  outward_voucher_no: "",
  transporter_id: "",
  transporter_name: "",
  amount: "",
  payment_method: "Cash",
  fund_source: "main_cash",
  advance_amount: "",
  on_account_amount: "",
  narration: "",
});

const styles = {
  page: {
    minHeight: "100vh",
    background: "#f8fafc",
    padding: 18,
    fontFamily: "Segoe UI, Arial, sans-serif",
    color: "#0f172a",
  },
  shell: {
    maxWidth: 1400,
    margin: "0 auto",
  },
  card: {
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: 14,
    boxShadow: "0 8px 25px rgba(15,23,42,.06)",
  },
  header: {
    padding: 16,
    display: "flex",
    justifyContent: "space-between",
    gap: 14,
    alignItems: "center",
    flexWrap: "wrap",
  },
  tabs: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
    marginTop: 14,
  },
  tab: (active) => ({
    border: active ? "1px solid #0f766e" : "1px solid #cbd5e1",
    background: active ? "#ccfbf1" : "#fff",
    color: active ? "#0f766e" : "#334155",
    padding: "9px 14px",
    borderRadius: 9,
    cursor: "pointer",
    fontWeight: 800,
    fontSize: 13,
  }),
  content: {
    padding: 16,
    borderTop: "1px solid #e2e8f0",
  },
  grid4: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(160px, 1fr))",
    gap: 10,
  },
  grid2: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(220px, 1fr))",
    gap: 10,
  },
  field: { display: "flex", flexDirection: "column", gap: 5 },
  label: { fontSize: 11, fontWeight: 800, color: "#475569" },
  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "9px 10px",
    border: "1px solid #cbd5e1",
    borderRadius: 8,
    fontSize: 13,
    background: "#fff",
  },
  readOnly: { background: "#f1f5f9" },
  section: {
    marginTop: 14,
    padding: 12,
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    background: "#f8fafc",
  },
  sectionTitle: { fontSize: 13, fontWeight: 900, marginBottom: 9 },
  actionRow: { display: "flex", gap: 8, flexWrap: "wrap" },
  primary: {
    border: 0,
    borderRadius: 8,
    padding: "10px 15px",
    background: "#0f766e",
    color: "#fff",
    fontWeight: 900,
    cursor: "pointer",
  },
  secondary: {
    border: "1px solid #cbd5e1",
    borderRadius: 8,
    padding: "10px 15px",
    background: "#fff",
    color: "#334155",
    fontWeight: 800,
    cursor: "pointer",
  },
  danger: {
    border: "1px solid #fecaca",
    borderRadius: 8,
    padding: "9px 12px",
    background: "#fff1f2",
    color: "#be123c",
    fontWeight: 800,
    cursor: "pointer",
  },
  stat: {
    border: "1px solid #cbd5e1",
    borderRadius: 10,
    background: "#fff",
    padding: 10,
  },
};

export default function VoucherEntryPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeType, setActiveType] = useState(searchParams.get("type") || "payment");
  const [form, setForm] = useState(emptyForm());
  const [transporters, setTransporters] = useState([]);
  const [pendingBills, setPendingBills] = useState([]);
  const [pendingTotal, setPendingTotal] = useState(0);
  const [adjustments, setAdjustments] = useState({});
  const [transportSearch, setTransportSearch] = useState("");
  const [showTransportPopup, setShowTransportPopup] = useState(false);
  const [loadingMasters, setLoadingMasters] = useState(false);
  const [loadingBills, setLoadingBills] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const filteredTransporters = useMemo(() => {
    const q = transportSearch.trim().toLowerCase();
    if (!q) return transporters.slice(0, 100);
    return transporters
      .filter((t) => `${t?.name || ""} ${t?.mobile || ""}`.toLowerCase().includes(q))
      .slice(0, 100);
  }, [transporters, transportSearch]);

  const totalAdjusted = useMemo(
    () => Object.values(adjustments).reduce((sum, value) => sum + Number(value || 0), 0),
    [adjustments]
  );

  const amount = Number(form.amount || 0);
  const advance = Number(form.advance_amount || 0);
  const onAccount = Number(form.on_account_amount || 0);
  const allocated = totalAdjusted + advance + onAccount;
  const unallocated = amount - allocated;

  const selectedTransporter = useMemo(
    () => transporters.find((t) => asId(t) === String(form.transporter_id)),
    [transporters, form.transporter_id]
  );

  useEffect(() => {
    setActiveType(searchParams.get("type") || "payment");
  }, [searchParams]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoadingMasters(true);
        const res = await axios.get(`${API_BASE}/transporters`);
        setTransporters(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        setError(err?.response?.data?.error || err?.message || "Transport list load failed");
      } finally {
        setLoadingMasters(false);
      }
    };
    load();
  }, []);

  const setField = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const loadPendingBills = async (transporterId) => {
    if (!transporterId) {
      setPendingBills([]);
      setPendingTotal(0);
      setAdjustments({});
      return;
    }
    try {
      setLoadingBills(true);
      const res = await axios.get(`${API_BASE}/transport-payments/pending`, {
        params: { transporter_id: transporterId },
      });
      const bills = Array.isArray(res.data?.bills) ? res.data.bills : [];
      setPendingBills(bills);
      setPendingTotal(Number(res.data?.total_pending || 0));
      setAdjustments((prev) => {
        const next = {};
        bills.forEach((bill) => {
          const id = String(bill.bilti_id);
          if (prev[id]) next[id] = Math.min(Number(prev[id]), Number(bill.pending_amount || 0));
        });
        return next;
      });
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || "Pending transport bills load failed");
      setPendingBills([]);
      setPendingTotal(0);
    } finally {
      setLoadingBills(false);
    }
  };

  const selectTransporter = async (transporter) => {
    const transporterId = asId(transporter);
    setField("transporter_id", transporterId);
    setField("transporter_name", transporter?.name || "");
    setShowTransportPopup(true);
    setMessage("");
    setError("");
    await loadPendingBills(transporterId);
  };

  const setAdjustment = (bill, value) => {
    const key = String(bill.bilti_id);
    const max = Number(bill.pending_amount || 0);
    const next = Math.max(0, Math.min(Number(value || 0), max));
    setAdjustments((prev) => ({ ...prev, [key]: next }));

    if (!form.amount && next > 0) {
      setField("amount", next.toFixed(2));
    }

    if (pendingBills.filter((item) => Number(prevAdjustedValue(adjustments, item.bilti_id)) > 0).length === 0 && next > 0) {
      setField("warehouse_id", bill.warehouse_id || "");
      setField("warehouse_name", bill.warehouse_name || "");
      setField("sale_id", bill.sale_id || "");
      setField("sale_voucher_no", bill.sale_voucher_no || "");
      setField("outward_id", bill.outward_id || "");
      setField("outward_voucher_no", bill.outward_voucher_no || "");
    }
  };

  const fillMaximum = (bill) => setAdjustment(bill, bill.pending_amount);

  const clearSelected = () => {
    setAdjustments({});
    setField("warehouse_id", "");
    setField("warehouse_name", "");
    setField("sale_id", "");
    setField("sale_voucher_no", "");
    setField("outward_id", "");
    setField("outward_voucher_no", "");
  };

  const handleSave = async () => {
    setMessage("");
    setError("");
    if (!form.transporter_id) {
      setError("Transport Name is required");
      return;
    }
    if (!form.date) {
      setError("Date is required");
      return;
    }
    if (!amount || amount <= 0) {
      setError("Amount must be greater than 0");
      return;
    }
    if (Math.abs(unallocated) > 0.009) {
      setError(`Amount allocation mismatch. Remaining: ₹${money(Math.abs(unallocated))}`);
      return;
    }

    const rows = Object.entries(adjustments)
      .filter(([, value]) => Number(value || 0) > 0)
      .map(([biltiId, value]) => ({ bilti_id: biltiId, adjusted_amount: Number(value) }));

    try {
      setSaving(true);
      const res = await axios.post(`${API_BASE}/transport-payments`, {
        voucher_no: form.auto_voucher ? "" : form.voucher_no,
        date: form.date,
        warehouse_id: form.warehouse_id || null,
        warehouse_name: form.warehouse_name || "",
        sale_id: form.sale_id || null,
        sale_voucher_no: form.sale_voucher_no || "",
        outward_id: form.outward_id || null,
        outward_voucher_no: form.outward_voucher_no || "",
        transporter_id: form.transporter_id,
        amount,
        payment_method: form.payment_method,
        fund_source: form.fund_source,
        advance_amount: advance,
        on_account_amount: onAccount,
        narration: form.narration,
        adjustments: rows,
      });

      setMessage(`${res.data?.message || "Payment saved"} — ${res.data?.voucher_no || ""}`);
      setForm(emptyForm());
      setAdjustments({});
      setPendingBills([]);
      setPendingTotal(0);
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || "Transport payment save failed");
      if (form.transporter_id) await loadPendingBills(form.transporter_id);
    } finally {
      setSaving(false);
    }
  };

  if (activeType === "receipt") {
    return (
      <div style={styles.page}>
        <div style={styles.shell}>
          <div style={{ ...styles.card, ...styles.header }}>
            <div>
              <div style={{ fontSize: 22, fontWeight: 900 }}>Voucher</div>
              <div style={{ color: "#64748b", fontSize: 13, marginTop: 4 }}>Receipt Entry</div>
              <div style={styles.tabs}>
                <button style={styles.tab(false)} onClick={() => setActiveType("payment")}>Payment Entry</button>
                <button style={styles.tab(true)} onClick={() => setActiveType("receipt")}>Receipt Entry</button>
                <button style={styles.tab(false)} onClick={() => setActiveType("journal")}>Journal Entry</button>
              </div>
            </div>
          </div>
          <div style={{ ...styles.card, marginTop: 12, padding: 12 }}>
            <div style={{ marginBottom: 8, fontWeight: 800 }}>Existing Receipt Voucher</div>
            <button style={styles.primary} onClick={() => navigate("/cash-entries")}>Open Receipt / Payment / Journal Entry</button>
          </div>
        </div>
      </div>
    );
  }

  if (activeType === "journal") {
    return (
      <div style={styles.page}>
        <div style={styles.shell}>
          <div style={{ ...styles.card, ...styles.header }}>
            <div>
              <div style={{ fontSize: 22, fontWeight: 900 }}>Voucher</div>
              <div style={{ color: "#64748b", fontSize: 13, marginTop: 4 }}>Journal Entry</div>
              <div style={styles.tabs}>
                <button style={styles.tab(false)} onClick={() => setActiveType("payment")}>Payment Entry</button>
                <button style={styles.tab(false)} onClick={() => setActiveType("receipt")}>Receipt Entry</button>
                <button style={styles.tab(true)} onClick={() => setActiveType("journal")}>Journal Entry</button>
              </div>
            </div>
          </div>
          <div style={{ ...styles.card, marginTop: 12, padding: 12 }}>
            <div style={{ marginBottom: 8, fontWeight: 800 }}>Existing Journal Voucher</div>
            <button style={styles.primary} onClick={() => navigate("/cash-entries")}>Open Receipt / Payment / Journal Entry</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.shell}>
        <div style={styles.card}>
          <div style={styles.header}>
            <div>
              <div style={{ fontSize: 22, fontWeight: 900 }}>Voucher</div>
              <div style={{ fontSize: 13, color: "#64748b", marginTop: 3 }}>
                Payment Entry / Receipt Entry / Journal Entry
              </div>
              <div style={styles.tabs}>
                <button style={styles.tab(true)} onClick={() => setActiveType("payment")}>Payment Entry</button>
                <button style={styles.tab(false)} onClick={() => setActiveType("receipt")}>Receipt Entry</button>
                <button style={styles.tab(false)} onClick={() => setActiveType("journal")}>Journal Entry</button>
              </div>
            </div>
            <div style={styles.actionRow}>
              <button style={styles.secondary} onClick={() => navigate("/dashboard")}>Back</button>
              <button style={styles.secondary} onClick={() => navigate("/cash-entries")}>General Cash Voucher</button>
            </div>
          </div>

          <div style={styles.content}>
            <div style={{ ...styles.section, marginTop: 0 }}>
              <div style={styles.sectionTitle}>Transport Payment</div>
              <div style={styles.grid4}>
                <div style={styles.field}>
                  <label style={styles.label}>Voucher No</label>
                  <div style={{ display: "flex", gap: 6 }}>
                    <input
                      style={{ ...styles.input, ...(form.auto_voucher ? styles.readOnly : {}) }}
                      value={form.auto_voucher ? "AUTO" : form.voucher_no}
                      readOnly={form.auto_voucher}
                      onChange={(e) => setField("voucher_no", e.target.value)}
                      placeholder="TPAY000001"
                    />
                    <label style={{ fontSize: 11, display: "flex", alignItems: "center", gap: 4, whiteSpace: "nowrap" }}>
                      <input
                        type="checkbox"
                        checked={form.auto_voucher}
                        onChange={(e) => setField("auto_voucher", e.target.checked)}
                      />
                      Auto
                    </label>
                  </div>
                </div>

                <div style={styles.field}>
                  <label style={styles.label}>Date *</label>
                  <input style={styles.input} type="date" value={form.date} onChange={(e) => setField("date", e.target.value)} />
                </div>

                <div style={styles.field}>
                  <label style={styles.label}>Transport Name *</label>
                  <button style={{ ...styles.input, textAlign: "left", cursor: "pointer", background: "#fff" }} onClick={() => setShowTransportPopup(true)} type="button">
                    {selectedTransporter?.name || form.transporter_name || "Search Transport Name"}
                  </button>
                </div>

                <div style={styles.field}>
                  <label style={styles.label}>Amount *</label>
                  <input style={styles.input} type="number" min="0" step="0.01" value={form.amount} onChange={(e) => setField("amount", e.target.value)} placeholder="0.00" />
                </div>
              </div>

              <div style={{ ...styles.grid4, marginTop: 10 }}>
                <div style={styles.field}>
                  <label style={styles.label}>Warehouse</label>
                  <input style={{ ...styles.input, ...styles.readOnly }} value={form.warehouse_name || ""} readOnly placeholder="From selected bill" />
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>Sale Voucher</label>
                  <input style={{ ...styles.input, ...styles.readOnly }} value={form.sale_voucher_no || ""} readOnly placeholder="From selected bill" />
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>Outward Voucher</label>
                  <input style={{ ...styles.input, ...styles.readOnly }} value={form.outward_voucher_no || ""} readOnly placeholder="From selected bill" />
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>Payment Mode</label>
                  <select style={styles.input} value={form.payment_method} onChange={(e) => setField("payment_method", e.target.value)}>
                    <option>Cash</option>
                    <option>Bank</option>
                    <option>UPI</option>
                    <option>Other</option>
                  </select>
                </div>
              </div>
            </div>

            <div style={styles.section}>
              <div style={styles.sectionTitle}>Pending Transport Bills — Search / Adjust</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <button type="button" style={styles.primary} onClick={() => setShowTransportPopup(true)}>
                  🔎 Search Transport & Pending Bills
                </button>
                {form.transporter_name ? (
                  <button type="button" style={styles.secondary} onClick={clearSelected}>Clear Adjustments</button>
                ) : null}
                <div style={styles.stat}><b>Transport Pending:</b> ₹{money(pendingTotal)}</div>
                <div style={styles.stat}><b>Adjusted:</b> ₹{money(totalAdjusted)}</div>
                <div style={styles.stat}><b>Advance:</b> ₹{money(advance)}</div>
                <div style={styles.stat}><b>On Account:</b> ₹{money(onAccount)}</div>
                <div style={{ ...styles.stat, color: Math.abs(unallocated) < 0.01 ? "#047857" : "#b45309" }}><b>Balance to Allocate:</b> ₹{money(unallocated)}</div>
              </div>

              {pendingBills.length > 0 ? (
                <div style={{ overflowX: "auto", marginTop: 10 }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff", border: "1px solid #e2e8f0" }}>
                    <thead>
                      <tr style={{ background: "#0f766e", color: "#fff" }}>
                        {['Bilti', 'Date', 'Warehouse', 'Sale', 'Outward', 'Lorry', 'Bill Amount', 'Pending', 'Adjust'].map((head) => <th key={head} style={{ padding: 8, fontSize: 11, textAlign: head === 'Bill Amount' || head === 'Pending' || head === 'Adjust' ? 'right' : 'left' }}>{head}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {pendingBills.map((bill) => {
                        const value = Number(adjustments[String(bill.bilti_id)] || 0);
                        return (
                          <tr key={bill.bilti_id}>
                            <td style={tdStyle}>{bill.bilti_no || bill.bilti_id}</td>
                            <td style={tdStyle}>{bill.date ? new Date(bill.date).toLocaleDateString('en-GB') : '-'}</td>
                            <td style={tdStyle}>{bill.warehouse_name || '-'}</td>
                            <td style={tdStyle}>{bill.sale_voucher_no || '-'}</td>
                            <td style={tdStyle}>{bill.outward_voucher_no || '-'}</td>
                            <td style={tdStyle}>{bill.lorry_no || '-'}</td>
                            <td style={{ ...tdStyle, textAlign: 'right' }}>₹{money(bill.bill_amount)}</td>
                            <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 900 }}>₹{money(bill.pending_amount)}</td>
                            <td style={{ ...tdStyle, minWidth: 190 }}>
                              <div style={{ display: 'flex', gap: 5, justifyContent: 'flex-end' }}>
                                <input
                                  type="number"
                                  min="0"
                                  max={bill.pending_amount}
                                  step="0.01"
                                  value={value}
                                  onChange={(e) => setAdjustment(bill, e.target.value)}
                                  style={{ ...styles.input, width: 120, textAlign: 'right' }}
                                />
                                <button type="button" style={styles.secondary} onClick={() => fillMaximum(bill)}>Max</button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ marginTop: 10, padding: 12, borderRadius: 9, background: '#fff', border: '1px dashed #cbd5e1', color: '#64748b' }}>
                  {loadingBills ? 'Loading pending bills...' : form.transporter_name ? 'No pending transport bills found for this transporter.' : 'Select a transport name to see pending bills.'}
                </div>
              )}
            </div>

            <div style={styles.section}>
              <div style={styles.sectionTitle}>Advance / On Account</div>
              <div style={styles.grid2}>
                <div style={styles.field}>
                  <label style={styles.label}>Advance</label>
                  <input style={styles.input} type="number" min="0" step="0.01" value={form.advance_amount} onChange={(e) => setField("advance_amount", e.target.value)} placeholder="0.00" />
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>On Account</label>
                  <input style={styles.input} type="number" min="0" step="0.01" value={form.on_account_amount} onChange={(e) => setField("on_account_amount", e.target.value)} placeholder="0.00" />
                </div>
              </div>
              <div style={{ marginTop: 9, fontSize: 12, color: '#475569' }}>
                Payment amount = Bill Adjustment + Advance + On Account.
              </div>
            </div>

            <div style={styles.section}>
              <div style={styles.field}>
                <label style={styles.label}>Narration</label>
                <textarea style={{ ...styles.input, minHeight: 70, resize: 'vertical' }} value={form.narration} onChange={(e) => setField('narration', e.target.value)} placeholder="Transport payment narration" />
              </div>
            </div>

            {error ? <div style={{ marginTop: 10, padding: 10, borderRadius: 8, background: '#fef2f2', color: '#b91c1c', fontWeight: 700 }}>{error}</div> : null}
            {message ? <div style={{ marginTop: 10, padding: 10, borderRadius: 8, background: '#ecfdf5', color: '#047857', fontWeight: 700 }}>{message}</div> : null}

            <div style={{ ...styles.actionRow, marginTop: 12 }}>
              <button type="button" style={styles.primary} onClick={handleSave} disabled={saving || loadingMasters}>
                {saving ? 'Saving...' : 'Save Transport Payment'}
              </button>
              <button type="button" style={styles.secondary} onClick={() => { setForm(emptyForm()); setAdjustments({}); setPendingBills([]); setPendingTotal(0); setError(''); setMessage(''); }}>
                Reset
              </button>
            </div>
          </div>
        </div>
      </div>

      {showTransportPopup ? (
        <div style={overlayStyle} onMouseDown={() => setShowTransportPopup(false)}>
          <div style={popupStyle} onMouseDown={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 17, fontWeight: 900 }}>Transport Search</div>
                <div style={{ fontSize: 12, color: '#64748b' }}>Name লিখুন, তারপর transport select করলে pending bill দেখা যাবে.</div>
              </div>
              <button style={styles.danger} onClick={() => setShowTransportPopup(false)}>Close</button>
            </div>
            <input
              autoFocus
              style={{ ...styles.input, marginBottom: 10 }}
              value={transportSearch}
              onChange={(e) => setTransportSearch(e.target.value)}
              placeholder="Search transport name..."
            />

            <div style={{ maxHeight: 230, overflow: 'auto', border: '1px solid #e2e8f0', borderRadius: 9 }}>
              {filteredTransporters.length === 0 ? <div style={{ padding: 12, color: '#64748b' }}>No transport name found.</div> : filteredTransporters.map((t) => {
                const id = asId(t);
                const active = String(form.transporter_id) === id;
                return (
                  <button key={id} type="button" onClick={() => selectTransporter(t)} style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 10, border: 0, borderBottom: '1px solid #eef2f7', background: active ? '#ecfeff' : '#fff', cursor: 'pointer', textAlign: 'left' }}>
                    <span><b>{t?.name || 'Unnamed'}</b><span style={{ display: 'block', fontSize: 11, color: '#64748b' }}>{t?.mobile || ''}</span></span>
                    <span style={{ fontSize: 11, fontWeight: 800, color: active ? '#0f766e' : '#64748b' }}>{active ? 'Selected' : 'Select'}</span>
                  </button>
                );
              })}
            </div>

            {form.transporter_id ? (
              <div style={{ marginTop: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 7 }}>
                  <div><b>{form.transporter_name}</b><div style={{ fontSize: 11, color: '#64748b' }}>Pending: ₹{money(pendingTotal)}</div></div>
                  {loadingBills ? <span style={{ fontSize: 12, color: '#64748b' }}>Loading...</span> : null}
                </div>
                {pendingBills.length ? (
                  <div style={{ maxHeight: 280, overflow: 'auto', border: '1px solid #e2e8f0', borderRadius: 8 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead><tr style={{ background: '#f1f5f9' }}>{['Bill','Warehouse','Sale','Outward','Pending','Adjust'].map((h) => <th key={h} style={{ padding: 7, fontSize: 10, textAlign: h === 'Pending' || h === 'Adjust' ? 'right' : 'left' }}>{h}</th>)}</tr></thead>
                      <tbody>{pendingBills.map((bill) => {
                        const value = Number(adjustments[String(bill.bilti_id)] || 0);
                        return <tr key={bill.bilti_id}><td style={tdStyle}>{bill.bilti_no}</td><td style={tdStyle}>{bill.warehouse_name || '-'}</td><td style={tdStyle}>{bill.sale_voucher_no || '-'}</td><td style={tdStyle}>{bill.outward_voucher_no || '-'}</td><td style={{ ...tdStyle, textAlign: 'right', fontWeight: 800 }}>₹{money(bill.pending_amount)}</td><td style={{ ...tdStyle, textAlign: 'right' }}><div style={{ display: 'flex', justifyContent: 'flex-end', gap: 5 }}><input type="number" min="0" max={bill.pending_amount} step="0.01" value={value} onChange={(e) => setAdjustment(bill, e.target.value)} style={{ ...styles.input, width: 95, textAlign: 'right' }} /><button type="button" style={styles.secondary} onClick={() => fillMaximum(bill)}>Max</button></div></td></tr>;
                      })}</tbody>
                    </table>
                  </div>
                ) : <div style={{ padding: 10, background: '#f8fafc', borderRadius: 8, color: '#64748b' }}>No pending bill for this transporter.</div>}
              </div>
            ) : null}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 10 }}>
              <button type="button" style={styles.secondary} onClick={() => setShowTransportPopup(false)}>Done</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function prevAdjustedValue(map, key) {
  return Number(map?.[String(key)] || 0);
}

const tdStyle = {
  padding: 8,
  borderBottom: '1px solid #e2e8f0',
  fontSize: 11,
  color: '#0f172a',
};

const overlayStyle = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(15,23,42,.55)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 14,
  zIndex: 9999,
};

const popupStyle = {
  width: 'min(1100px, 96vw)',
  maxHeight: '92vh',
  overflow: 'auto',
  background: '#fff',
  borderRadius: 14,
  padding: 15,
  boxShadow: '0 25px 60px rgba(15,23,42,.35)',
};

