import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import axios from "axios";

import {
  useNavigate,
  useSearchParams,
} from "react-router-dom";

import { getApiUrl } from "../utils/api";

const API_BASE = getApiUrl("/api");

/* ============================================================
   HELPERS
============================================================ */

const today = () => {
  return new Date().toISOString().slice(0, 10);
};

const numberValue = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const money = (value) => {
  return numberValue(value).toFixed(2);
};

const getId = (item) => {
  if (!item) return "";

  return (
    item._id ||
    item.id ||
    item.transporter_id ||
    item.transport_id ||
    ""
  );
};

const getName = (item) => {
  if (!item) return "";

  return (
    item.name ||
    item.transporter_name ||
    item.transport_name ||
    item.party_name ||
    item.title ||
    ""
  );
};

/* ============================================================
   EMPTY FORM
============================================================ */

const emptyForm = () => ({
  voucher_no: "",
  auto_voucher: true,

  date: today(),

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

  fund_source: "",

  advance_amount: 0,

  on_account_amount: 0,

  narration: "",
});

/* ============================================================
   COMPONENT
============================================================ */

function VoucherEntryPage() {
  const navigate = useNavigate();

  const [searchParams] = useSearchParams();

  /* ==========================================================
     ACTIVE TAB
  ========================================================== */

  const queryType =
    searchParams.get("type") || "payment";

  const normalizeType = (type) => {
    const value = String(type || "").toLowerCase();

    if (value === "receipt") {
      return "receipt";
    }

    if (value === "journal") {
      return "journal";
    }

    if (
      value === "transport" ||
      value === "transport-payment" ||
      value === "transport_payment"
    ) {
      return "transport";
    }

    return "payment";
  };

  const [activeType, setActiveType] = useState(
    normalizeType(queryType)
  );

  /* ==========================================================
     FORM
  ========================================================== */

  const [form, setForm] = useState(emptyForm());

  /* ==========================================================
     DATA
  ========================================================== */

  const [transporters, setTransporters] = useState([]);

  const [pendingBills, setPendingBills] = useState([]);

  const [adjustments, setAdjustments] = useState({});

  /* ==========================================================
     SEARCH / POPUP
  ========================================================== */

  const [transportSearch, setTransportSearch] =
    useState("");

  const [transportPopup, setTransportPopup] =
    useState(false);

  /* ==========================================================
     STATES
  ========================================================== */

  const [loadingTransporters, setLoadingTransporters] =
    useState(false);

  const [loadingPending, setLoadingPending] =
    useState(false);

  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");

  const [error, setError] = useState("");

  /* ==========================================================
     QUERY TYPE CHANGE
  ========================================================== */

  useEffect(() => {
    setActiveType(normalizeType(queryType));
  }, [queryType]);

  /* ==========================================================
     LOAD TRANSPORTERS
  ========================================================== */

  useEffect(() => {
    let cancelled = false;

    const loadTransporters = async () => {
      try {
        setLoadingTransporters(true);
        setError("");

        const response = await axios.get(
          `${API_BASE}/transporters`
        );

        if (cancelled) return;

        const data =
          response?.data?.data ??
          response?.data?.transporters ??
          response?.data ??
          [];

        setTransporters(
          Array.isArray(data) ? data : []
        );
      } catch (err) {
        if (cancelled) return;

        console.error(
          "Transporter loading error:",
          err
        );

        setTransporters([]);

        setError(
          err?.response?.data?.message ||
          "Transporter list load failed."
        );
      } finally {
        if (!cancelled) {
          setLoadingTransporters(false);
        }
      }
    };

    loadTransporters();

    return () => {
      cancelled = true;
    };
  }, []);

  /* ==========================================================
     LOAD PENDING TRANSPORT BILLS
  ========================================================== */

  useEffect(() => {
    let cancelled = false;

    const loadPendingBills = async () => {
      if (!form.transporter_id) {
        setPendingBills([]);
        setAdjustments({});
        return;
      }

      try {
        setLoadingPending(true);

        const response = await axios.get(
          `${API_BASE}/transport-payments/pending`,
          {
            params: {
              transporter_id:
                form.transporter_id,
            },
          }
        );

        if (cancelled) return;

        const data =
          response?.data?.data ??
          response?.data?.bills ??
          response?.data ??
          [];

        const bills =
          Array.isArray(data) ? data : [];

        setPendingBills(bills);

        setAdjustments((previous) => {
          const next = {};

          bills.forEach((bill) => {
            const id =
              bill.id ||
              bill._id ||
              bill.outward_id ||
              bill.sale_id;

            if (!id) return;

            next[id] =
              previous[id] !== undefined
                ? previous[id]
                : 0;
          });

          return next;
        });
      } catch (err) {
        if (cancelled) return;

        console.error(
          "Pending transport bills error:",
          err
        );

        setPendingBills([]);

        setError(
          err?.response?.data?.message ||
          "Pending transport bills load failed."
        );
      } finally {
        if (!cancelled) {
          setLoadingPending(false);
        }
      }
    };

    loadPendingBills();

    return () => {
      cancelled = true;
    };
  }, [form.transporter_id]);

  /* ==========================================================
     TRANSPORTER FILTER
  ========================================================== */

  const filteredTransporters = useMemo(() => {
    const search =
      String(transportSearch || "")
        .trim()
        .toLowerCase();

    if (!search) {
      return transporters;
    }

    return transporters.filter((item) => {
      const name = getName(item).toLowerCase();

      const id = String(
        getId(item)
      ).toLowerCase();

      return (
        name.includes(search) ||
        id.includes(search)
      );
    });
  }, [
    transporters,
    transportSearch,
  ]);

  /* ==========================================================
     TOTAL ADJUSTED
  ========================================================== */

  const adjustedTotal = useMemo(() => {
    return Object.values(adjustments).reduce(
      (total, value) =>
        total + numberValue(value),
      0
    );
  }, [adjustments]);

  /* ==========================================================
     ADVANCE
  ========================================================== */

  const advanceAmount = numberValue(
    form.advance_amount
  );

  /* ==========================================================
     ON ACCOUNT
  ========================================================== */

  const onAccountAmount = numberValue(
    form.on_account_amount
  );

  /* ==========================================================
     TOTAL
  ========================================================== */

  const enteredAmount = numberValue(
    form.amount
  );

  /* ==========================================================
     BREAKUP
  ========================================================== */

  const breakupTotal =
    adjustedTotal +
    advanceAmount +
    onAccountAmount;

  const breakupDifference =
    enteredAmount - breakupTotal;

  /* ==========================================================
     FORM UPDATE
  ========================================================== */

  const updateForm = (field, value) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));

    setMessage("");
    setError("");
  };

  /* ==========================================================
     SELECT TRANSPORTER
  ========================================================== */

  const selectTransporter = (transporter) => {
    const id = getId(transporter);
    const name = getName(transporter);

    updateForm(
      "transporter_id",
      id
    );

    updateForm(
      "transporter_name",
      name
    );

    setTransportPopup(false);
    setTransportSearch("");
  };

  /* ==========================================================
     ADJUSTMENT
  ========================================================== */

  const setAdjustment = (
    bill,
    value
  ) => {
    const id =
      bill.id ||
      bill._id ||
      bill.outward_id ||
      bill.sale_id;

    if (!id) return;

    const pending =
      numberValue(
        bill.pending_amount ??
        bill.pending ??
        bill.amount ??
        bill.balance ??
        0
      );

    let nextValue =
      numberValue(value);

    if (nextValue < 0) {
      nextValue = 0;
    }

    if (
      pending > 0 &&
      nextValue > pending
    ) {
      nextValue = pending;
    }

    setAdjustments(
      (previous) => ({
        ...previous,
        [id]: nextValue,
      })
    );

    /* Auto-fill related voucher information */
    const warehouseId =
      bill.warehouse_id ||
      bill.warehouseId ||
      "";

    const warehouseName =
      bill.warehouse_name ||
      bill.warehouse ||
      "";

    const saleId =
      bill.sale_id ||
      bill.saleId ||
      "";

    const saleVoucherNo =
      bill.sale_voucher_no ||
      bill.sale_voucher ||
      bill.voucher_no ||
      "";

    const outwardId =
      bill.outward_id ||
      bill.outwardId ||
      "";

    const outwardVoucherNo =
      bill.outward_voucher_no ||
      bill.outward_voucher ||
      "";

    setForm((previous) => ({
      ...previous,

      warehouse_id:
        previous.warehouse_id ||
        warehouseId,

      warehouse_name:
        previous.warehouse_name ||
        warehouseName,

      sale_id:
        previous.sale_id ||
        saleId,

      sale_voucher_no:
        previous.sale_voucher_no ||
        saleVoucherNo,

      outward_id:
        previous.outward_id ||
        outwardId,

      outward_voucher_no:
        previous.outward_voucher_no ||
        outwardVoucherNo,
    }));
  };

  /* ==========================================================
     RESET
  ========================================================== */

  const resetForm = () => {
    setForm(emptyForm());
    setPendingBills([]);
    setAdjustments({});
    setTransportSearch("");
    setMessage("");
    setError("");
  };

  /* ==========================================================
     TAB CHANGE
  ========================================================== */

  const changeType = (type) => {
    setActiveType(type);

    setMessage("");
    setError("");

    if (type === "receipt") {
      navigate(
        "/voucher-entry?type=receipt"
      );
      return;
    }

    if (type === "journal") {
      navigate(
        "/voucher-entry?type=journal"
      );
      return;
    }

    if (type === "transport") {
      navigate(
        "/voucher-entry?type=transport"
      );
      return;
    }

    navigate(
      "/voucher-entry?type=payment"
    );
  };

  /* ==========================================================
     VALIDATE TRANSPORT PAYMENT
  ========================================================== */

  const validateTransportPayment = () => {
    if (!form.date) {
      return "Date is required.";
    }

    if (!form.transporter_id) {
      return "Transport Name is required.";
    }

    if (enteredAmount <= 0) {
      return "Amount must be greater than zero.";
    }

    if (
      adjustedTotal >
      enteredAmount
    ) {
      return "Bill adjustment cannot be greater than total amount.";
    }

    if (
      advanceAmount < 0 ||
      onAccountAmount < 0
    ) {
      return "Advance / On Account amount cannot be negative.";
    }

    const expected =
      adjustedTotal +
      advanceAmount +
      onAccountAmount;

    if (
      Math.abs(
        expected - enteredAmount
      ) > 0.01
    ) {
      return (
        `Amount breakup does not match total amount. ` +
        `Total: ${money(enteredAmount)}, ` +
        `Adjusted: ${money(adjustedTotal)}, ` +
        `Advance: ${money(advanceAmount)}, ` +
        `On Account: ${money(onAccountAmount)}.`
      );
    }

    return "";
  };

  /* ==========================================================
     SAVE TRANSPORT PAYMENT
  ========================================================== */

  const saveTransportPayment =
    async () => {
      setMessage("");
      setError("");

      const validation =
        validateTransportPayment();

      if (validation) {
        setError(validation);
        return;
      }

      try {
        setSaving(true);

        const billAdjustments =
          pendingBills
            .map((bill) => {
              const id =
                bill.id ||
                bill._id ||
                bill.outward_id ||
                bill.sale_id;

              const qty =
                numberValue(
                  adjustments[id]
                );

              if (!id || qty <= 0) {
                return null;
              }

              return {
                bill_id: id,

                id,

                amount: qty,

                adjustment_amount: qty,

                outward_id:
                  bill.outward_id ||
                  bill.outwardId ||
                  null,

                sale_id:
                  bill.sale_id ||
                  bill.saleId ||
                  null,

                warehouse_id:
                  bill.warehouse_id ||
                  bill.warehouseId ||
                  null,

                sale_voucher_no:
                  bill.sale_voucher_no ||
                  bill.sale_voucher ||
                  bill.voucher_no ||
                  null,

                outward_voucher_no:
                  bill.outward_voucher_no ||
                  bill.outward_voucher ||
                  null,
              };
            })
            .filter(Boolean);

        const payload = {
          voucher_no:
            form.voucher_no || null,

          auto_voucher:
            Boolean(form.auto_voucher),

          date: form.date,

          warehouse_id:
            form.warehouse_id || null,

          warehouse_name:
            form.warehouse_name || null,

          sale_id:
            form.sale_id || null,

          sale_voucher_no:
            form.sale_voucher_no || null,

          outward_id:
            form.outward_id || null,

          outward_voucher_no:
            form.outward_voucher_no || null,

          transporter_id:
            form.transporter_id,

          transporter_name:
            form.transporter_name,

          amount:
            enteredAmount,

          payment_method:
            form.payment_method,

          fund_source:
            form.fund_source || null,

          advance_amount:
            advanceAmount,

          on_account_amount:
            onAccountAmount,

          narration:
            form.narration || "",

          adjustments:
            billAdjustments,

          bill_adjustments:
            billAdjustments,
        };

        const response =
          await axios.post(
            `${API_BASE}/transport-payments`,
            payload
          );

        console.log(
          "Transport payment saved:",
          response.data
        );

        setMessage(
          response?.data?.message ||
          "Transport payment saved successfully."
        );

        /* Reset after successful save */
        setForm(emptyForm());
        setPendingBills([]);
        setAdjustments({});
      } catch (err) {
        console.error(
          "Transport payment save error:",
          err
        );

        const responseData =
          err?.response?.data;

        let errorMessage =
          responseData?.message ||
          responseData?.error ||
          "Transport payment save failed.";

        if (
          responseData?.details
        ) {
          try {
            errorMessage +=
              ` ${JSON.stringify(
                responseData.details
              )}`;
          } catch (e) {
            // ignore
          }
        }

        setError(errorMessage);
      } finally {
        setSaving(false);
      }
    };

  /* ==========================================================
     OTHER VOUCHER BUTTONS
  ========================================================== */

  const openCashEntry = () => {
    navigate("/cash-entries");
  };

  /* ==========================================================
     RENDER
  ========================================================== */

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f5f7fb",
        padding: "20px",
        boxSizing: "border-box",
      }}
    >

      {/* ======================================================
          HEADER
      ====================================================== */}

      <div
        style={{
          background: "#ffffff",
          borderRadius: "12px",
          padding: "18px 20px",
          marginBottom: "16px",
          boxShadow:
            "0 2px 10px rgba(0,0,0,0.06)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "12px",
            flexWrap: "wrap",
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: "24px",
                fontWeight: 700,
                color: "#172033",
              }}
            >
              Voucher Entry
            </h2>

            <div
              style={{
                marginTop: "5px",
                color: "#687386",
                fontSize: "13px",
              }}
            >
              Payment, Receipt, Journal &
              Transport Payment
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              navigate("/dashboard")
            }
            style={{
              border: "1px solid #d7dce5",
              background: "#fff",
              borderRadius: "8px",
              padding: "9px 15px",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Back to Dashboard
          </button>
        </div>
      </div>

      {/* ======================================================
          TABS
      ====================================================== */}

      <div
        style={{
          display: "flex",
          gap: "8px",
          flexWrap: "wrap",
          background: "#fff",
          padding: "10px",
          borderRadius: "12px",
          marginBottom: "16px",
          boxShadow:
            "0 2px 10px rgba(0,0,0,0.05)",
        }}
      >
        <button
          type="button"
          onClick={() =>
            changeType("payment")
          }
          style={{
            padding: "10px 18px",
            borderRadius: "8px",
            border: "none",
            cursor: "pointer",
            fontWeight: 700,
            background:
              activeType === "payment"
                ? "#2563eb"
                : "#eef2f7",
            color:
              activeType === "payment"
                ? "#fff"
                : "#334155",
          }}
        >
          Payment Entry
        </button>

        <button
          type="button"
          onClick={() =>
            changeType("receipt")
          }
          style={{
            padding: "10px 18px",
            borderRadius: "8px",
            border: "none",
            cursor: "pointer",
            fontWeight: 700,
            background:
              activeType === "receipt"
                ? "#16a34a"
                : "#eef2f7",
            color:
              activeType === "receipt"
                ? "#fff"
                : "#334155",
          }}
        >
          Receipt Entry
        </button>

        <button
          type="button"
          onClick={() =>
            changeType("journal")
          }
          style={{
            padding: "10px 18px",
            borderRadius: "8px",
            border: "none",
            cursor: "pointer",
            fontWeight: 700,
            background:
              activeType === "journal"
                ? "#7c3aed"
                : "#eef2f7",
            color:
              activeType === "journal"
                ? "#fff"
                : "#334155",
          }}
        >
          Journal Entry
        </button>

        <button
          type="button"
          onClick={() =>
            changeType("transport")
          }
          style={{
            padding: "10px 18px",
            borderRadius: "8px",
            border: "none",
            cursor: "pointer",
            fontWeight: 700,
            background:
              activeType === "transport"
                ? "#ea580c"
                : "#eef2f7",
            color:
              activeType === "transport"
                ? "#fff"
                : "#334155",
          }}
        >
          Transport Payment
        </button>
      </div>

      {/* ======================================================
          MESSAGE
      ====================================================== */}

      {message && (
        <div
          style={{
            background: "#dcfce7",
            color: "#166534",
            border:
              "1px solid #86efac",
            borderRadius: "9px",
            padding: "12px 14px",
            marginBottom: "14px",
            fontWeight: 600,
          }}
        >
          {message}
        </div>
      )}

      {error && (
        <div
          style={{
            background: "#fee2e2",
            color: "#991b1b",
            border:
              "1px solid #fecaca",
            borderRadius: "9px",
            padding: "12px 14px",
            marginBottom: "14px",
            fontWeight: 600,
            whiteSpace: "pre-wrap",
          }}
        >
          {error}
        </div>
      )}

      {/* ======================================================
          PAYMENT / RECEIPT / JOURNAL
      ====================================================== */}

      {activeType !== "transport" && (
        <div
          style={{
            background: "#fff",
            borderRadius: "12px",
            padding: "24px",
            boxShadow:
              "0 2px 10px rgba(0,0,0,0.06)",
          }}
        >
          <h3
            style={{
              marginTop: 0,
            }}
          >
            {activeType === "payment"
              ? "Payment Entry"
              : activeType === "receipt"
              ? "Receipt Entry"
              : "Journal Entry"}
          </h3>

          <p
            style={{
              color: "#64748b",
              marginBottom: "20px",
            }}
          >
            Continue to the existing Cash
            Entry screen for this voucher
            type.
          </p>

          <button
            type="button"
            onClick={openCashEntry}
            style={{
              background: "#2563eb",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              padding:
                "11px 18px",
              cursor: "pointer",
              fontWeight: 700,
            }}
          >
            Open Cash Entry
          </button>
        </div>
      )}

      {/* ======================================================
          TRANSPORT PAYMENT
      ====================================================== */}

      {activeType === "transport" && (
        <>
          {/* --------------------------------------------------
              MAIN FORM
          -------------------------------------------------- */}

          <div
            style={{
              background: "#fff",
              borderRadius: "12px",
              padding: "20px",
              boxShadow:
                "0 2px 10px rgba(0,0,0,0.06)",
              marginBottom: "16px",
            }}
          >
            <h3
              style={{
                marginTop: 0,
                marginBottom: "18px",
                color: "#c2410c",
              }}
            >
              Transport Payment
            </h3>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit,minmax(220px,1fr))",
                gap: "14px",
              }}
            >

              {/* Voucher No */}
              <div>
                <label
                  style={{
                    display: "block",
                    fontWeight: 600,
                    marginBottom: "6px",
                  }}
                >
                  Voucher No
                </label>

                <div
                  style={{
                    display: "flex",
                    gap: "7px",
                  }}
                >
                  <input
                    value={
                      form.voucher_no
                    }
                    disabled={
                      form.auto_voucher
                    }
                    onChange={(e) =>
                      updateForm(
                        "voucher_no",
                        e.target.value
                      )
                    }
                    placeholder="Manual Voucher No"
                    style={inputStyle}
                  />

                  <button
                    type="button"
                    onClick={() =>
                      updateForm(
                        "auto_voucher",
                        !form.auto_voucher
                      )
                    }
                    style={{
                      ...smallButtonStyle,
                      background:
                        form.auto_voucher
                          ? "#16a34a"
                          : "#64748b",
                    }}
                  >
                    {form.auto_voucher
                      ? "Auto"
                      : "Manual"}
                  </button>
                </div>
              </div>

              {/* Date */}
              <div>
                <label
                  style={labelStyle}
                >
                  Date
                </label>

                <input
                  type="date"
                  value={form.date}
                  onChange={(e) =>
                    updateForm(
                      "date",
                      e.target.value
                    )
                  }
                  style={inputStyle}
                />
              </div>

              {/* Transporter */}
              <div>
                <label
                  style={labelStyle}
                >
                  Transport Name
                </label>

                <button
                  type="button"
                  onClick={() =>
                    setTransportPopup(
                      true
                    )
                  }
                  style={{
                    ...inputStyle,
                    textAlign: "left",
                    background: "#fff",
                    cursor: "pointer",
                  }}
                >
                  {form.transporter_name ||
                    "Select Transport Name"}
                </button>
              </div>

              {/* Amount */}
              <div>
                <label
                  style={labelStyle}
                >
                  Amount
                </label>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.amount}
                  onChange={(e) =>
                    updateForm(
                      "amount",
                      e.target.value
                    )
                  }
                  placeholder="0.00"
                  style={inputStyle}
                />
              </div>

              {/* Warehouse */}
              <div>
                <label
                  style={labelStyle}
                >
                  Warehouse
                </label>

                <input
                  value={
                    form.warehouse_name
                  }
                  onChange={(e) =>
                    updateForm(
                      "warehouse_name",
                      e.target.value
                    )
                  }
                  placeholder="Warehouse"
                  style={inputStyle}
                />
              </div>

              {/* Sale Voucher */}
              <div>
                <label
                  style={labelStyle}
                >
                  Sale Voucher
                </label>

                <input
                  value={
                    form.sale_voucher_no
                  }
                  onChange={(e) =>
                    updateForm(
                      "sale_voucher_no",
                      e.target.value
                    )
                  }
                  placeholder="Sale Voucher No"
                  style={inputStyle}
                />
              </div>

              {/* Outward Voucher */}
              <div>
                <label
                  style={labelStyle}
                >
                  Outward Voucher
                </label>

                <input
                  value={
                    form.outward_voucher_no
                  }
                  onChange={(e) =>
                    updateForm(
                      "outward_voucher_no",
                      e.target.value
                    )
                  }
                  placeholder="Outward Voucher No"
                  style={inputStyle}
                />
              </div>

              {/* Payment Mode */}
              <div>
                <label
                  style={labelStyle}
                >
                  Payment Mode
                </label>

                <select
                  value={
                    form.payment_method
                  }
                  onChange={(e) =>
                    updateForm(
                      "payment_method",
                      e.target.value
                    )
                  }
                  style={inputStyle}
                >
                  <option value="Cash">
                    Cash
                  </option>

                  <option value="Bank">
                    Bank
                  </option>

                  <option value="UPI">
                    UPI
                  </option>

                  <option value="Cheque">
                    Cheque
                  </option>
                </select>
              </div>

              {/* Fund Source */}
              <div>
                <label
                  style={labelStyle}
                >
                  Fund Source
                </label>

                <input
                  value={
                    form.fund_source
                  }
                  onChange={(e) =>
                    updateForm(
                      "fund_source",
                      e.target.value
                    )
                  }
                  placeholder="Fund Source"
                  style={inputStyle}
                />
              </div>

            </div>
          </div>

          {/* --------------------------------------------------
              PENDING BILLS
          -------------------------------------------------- */}

          <div
            style={{
              background: "#fff",
              borderRadius: "12px",
              padding: "20px",
              boxShadow:
                "0 2px 10px rgba(0,0,0,0.06)",
              marginBottom: "16px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent:
                  "space-between",
                alignItems: "center",
                gap: "10px",
                flexWrap: "wrap",
                marginBottom: "14px",
              }}
            >
              <div>
                <h3
                  style={{
                    margin: 0,
                    color: "#334155",
                  }}
                >
                  Pending Transport Bills
                </h3>

                <div
                  style={{
                    fontSize: "12px",
                    color: "#64748b",
                    marginTop: "4px",
                  }}
                >
                  Select bill-wise amount
                  to adjust.
                </div>
              </div>

              <div
                style={{
                  background: "#fff7ed",
                  border:
                    "1px solid #fed7aa",
                  borderRadius: "8px",
                  padding:
                    "8px 12px",
                  fontWeight: 700,
                  color: "#9a3412",
                }}
              >
                Adjusted: ₹{" "}
                {money(adjustedTotal)}
              </div>
            </div>

            {!form.transporter_id && (
              <div
                style={{
                  padding: "25px",
                  textAlign: "center",
                  color: "#64748b",
                  background:
                    "#f8fafc",
                  borderRadius: "8px",
                }}
              >
                Select Transport Name
                first.
              </div>
            )}

            {form.transporter_id &&
              loadingPending && (
                <div
                  style={{
                    padding: "25px",
                    textAlign: "center",
                    color: "#64748b",
                  }}
                >
                  Loading pending bills...
                </div>
              )}

            {form.transporter_id &&
              !loadingPending &&
              pendingBills.length ===
                0 && (
                <div
                  style={{
                    padding: "25px",
                    textAlign: "center",
                    color: "#64748b",
                    background:
                      "#f8fafc",
                    borderRadius: "8px",
                  }}
                >
                  No pending transport
                  bills found.
                </div>
              )}

            {pendingBills.length >
              0 && (
              <div
                style={{
                  overflowX: "auto",
                }}
              >
                <table
                  style={{
                    width: "100%",
                    borderCollapse:
                      "collapse",
                    minWidth: "850px",
                  }}
                >
                  <thead>
                    <tr
                      style={{
                        background:
                          "#f1f5f9",
                      }}
                    >
                      <th
                        style={
                          thStyle
                        }
                      >
                        Date
                      </th>

                      <th
                        style={
                          thStyle
                        }
                      >
                        Voucher
                      </th>

                      <th
                        style={
                          thStyle
                        }
                      >
                        Warehouse
                      </th>

                      <th
                        style={
                          thStyle
                        }
                      >
                        Sale
                      </th>

                      <th
                        style={
                          thStyle
                        }
                      >
                        Outward
                      </th>

                      <th
                        style={{
                          ...thStyle,
                          textAlign:
                            "right",
                        }}
                      >
                        Pending
                      </th>

                      <th
                        style={{
                          ...thStyle,
                          width: "170px",
                        }}
                      >
                        Adjustment
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {pendingBills.map(
                      (bill, index) => {
                        const id =
                          bill.id ||
                          bill._id ||
                          bill.outward_id ||
                          bill.sale_id ||
                          index;

                        const pending =
                          numberValue(
                            bill.pending_amount ??
                            bill.pending ??
                            bill.balance ??
                            bill.amount ??
                            0
                          );

                        return (
                          <tr
                            key={id}
                          >
                            <td
                              style={
                                tdStyle
                              }
                            >
                              {bill.date ||
                                bill.payment_date ||
                                "-"}
                            </td>

                            <td
                              style={
                                tdStyle
                              }
                            >
                              {bill.voucher_no ||
                                bill.transport_voucher_no ||
                                "-"}
                            </td>

                            <td
                              style={
                                tdStyle
                              }
                            >
                              {bill.warehouse_name ||
                                bill.warehouse ||
                                "-"}
                            </td>

                            <td
                              style={
                                tdStyle
                              }
                            >
                              {bill.sale_voucher_no ||
                                bill.sale_voucher ||
                                "-"}
                            </td>

                            <td
                              style={
                                tdStyle
                              }
                            >
                              {bill.outward_voucher_no ||
                                bill.outward_voucher ||
                                "-"}
                            </td>

                            <td
                              style={{
                                ...tdStyle,
                                textAlign:
                                  "right",
                                fontWeight:
                                  700,
                              }}
                            >
                              ₹{" "}
                              {money(
                                pending
                              )}
                            </td>

                            <td
                              style={
                                tdStyle
                              }
                            >
                              <input
                                type="number"
                                min="0"
                                max={
                                  pending ||
                                  undefined
                                }
                                step="0.01"
                                value={
                                  adjustments[
                                    id
                                  ] ??
                                  ""
                                }
                                onChange={(
                                  e
                                ) =>
                                  setAdjustment(
                                    bill,
                                    e
                                      .target
                                      .value
                                  )
                                }
                                style={{
                                  ...inputStyle,
                                  textAlign:
                                    "right",
                                }}
                              />
                            </td>
                          </tr>
                        );
                      }
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* --------------------------------------------------
              ADVANCE / ON ACCOUNT
          -------------------------------------------------- */}

          <div
            style={{
              background: "#fff",
              borderRadius: "12px",
              padding: "20px",
              boxShadow:
                "0 2px 10px rgba(0,0,0,0.06)",
              marginBottom: "16px",
            }}
          >
            <h3
              style={{
                marginTop: 0,
                color: "#334155",
              }}
            >
              Payment Adjustment
            </h3>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit,minmax(220px,1fr))",
                gap: "14px",
              }}
            >
              <div>
                <label
                  style={labelStyle}
                >
                  Advance Amount
                </label>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={
                    form.advance_amount
                  }
                  onChange={(e) =>
                    updateForm(
                      "advance_amount",
                      e.target.value
                    )
                  }
                  style={inputStyle}
                />
              </div>

              <div>
                <label
                  style={labelStyle}
                >
                  On Account Amount
                </label>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={
                    form.on_account_amount
                  }
                  onChange={(e) =>
                    updateForm(
                      "on_account_amount",
                      e.target.value
                    )
                  }
                  style={inputStyle}
                />
              </div>

              <div>
                <label
                  style={labelStyle}
                >
                  Narration
                </label>

                <input
                  value={
                    form.narration
                  }
                  onChange={(e) =>
                    updateForm(
                      "narration",
                      e.target.value
                    )
                  }
                  placeholder="Narration"
                  style={inputStyle}
                />
              </div>
            </div>

            {/* Summary */}
            <div
              style={{
                marginTop: "18px",
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit,minmax(180px,1fr))",
                gap: "10px",
              }}
            >
              <SummaryBox
                title="Total Amount"
                value={enteredAmount}
                background="#eff6ff"
                color="#1d4ed8"
              />

              <SummaryBox
                title="Bill Adjustment"
                value={adjustedTotal}
                background="#fff7ed"
                color="#c2410c"
              />

              <SummaryBox
                title="Advance"
                value={advanceAmount}
                background="#f0fdf4"
                color="#15803d"
              />

              <SummaryBox
                title="On Account"
                value={onAccountAmount}
                background="#faf5ff"
                color="#7e22ce"
              />

              <SummaryBox
                title="Difference"
                value={breakupDifference}
                background={
                  Math.abs(
                    breakupDifference
                  ) <= 0.01
                    ? "#ecfdf5"
                    : "#fef2f2"
                }
                color={
                  Math.abs(
                    breakupDifference
                  ) <= 0.01
                    ? "#047857"
                    : "#b91c1c"
                }
              />
            </div>
          </div>

          {/* --------------------------------------------------
              BUTTONS
          -------------------------------------------------- */}

          <div
            style={{
              display: "flex",
              justifyContent:
                "flex-end",
              gap: "10px",
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              onClick={resetForm}
              disabled={saving}
              style={{
                border:
                  "1px solid #cbd5e1",
                background: "#fff",
                color: "#334155",
                borderRadius: "8px",
                padding:
                  "11px 20px",
                cursor: saving
                  ? "not-allowed"
                  : "pointer",
                fontWeight: 700,
              }}
            >
              Reset
            </button>

            <button
              type="button"
              onClick={
                saveTransportPayment
              }
              disabled={saving}
              style={{
                border: "none",
                background: saving
                  ? "#94a3b8"
                  : "#ea580c",
                color: "#fff",
                borderRadius: "8px",
                padding:
                  "11px 24px",
                cursor: saving
                  ? "not-allowed"
                  : "pointer",
                fontWeight: 700,
              }}
            >
              {saving
                ? "Saving..."
                : "Save Transport Payment"}
            </button>
          </div>
        </>
      )}

      {/* ======================================================
          TRANSPORTER POPUP
      ====================================================== */}

      {transportPopup && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background:
              "rgba(15,23,42,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            zIndex: 9999,
          }}
          onMouseDown={(e) => {
            if (
              e.target ===
              e.currentTarget
            ) {
              setTransportPopup(false);
            }
          }}
        >
          <div
            style={{
              width: "min(700px, 100%)",
              maxHeight: "80vh",
              background: "#fff",
              borderRadius: "14px",
              overflow: "hidden",
              boxShadow:
                "0 20px 60px rgba(0,0,0,0.25)",
            }}
          >
            <div
              style={{
                padding: "16px 18px",
                borderBottom:
                  "1px solid #e2e8f0",
                display: "flex",
                justifyContent:
                  "space-between",
                alignItems: "center",
              }}
            >
              <h3
                style={{
                  margin: 0,
                }}
              >
                Select Transport Name
              </h3>

              <button
                type="button"
                onClick={() =>
                  setTransportPopup(false)
                }
                style={{
                  border: "none",
                  background: "#f1f5f9",
                  width: "34px",
                  height: "34px",
                  borderRadius: "50%",
                  cursor: "pointer",
                  fontSize: "18px",
                }}
              >
                ×
              </button>
            </div>

            <div
              style={{
                padding: "15px",
                borderBottom:
                  "1px solid #e2e8f0",
              }}
            >
              <input
                autoFocus
                value={
                  transportSearch
                }
                onChange={(e) =>
                  setTransportSearch(
                    e.target.value
                  )
                }
                placeholder="Search transport name..."
                style={{
                  ...inputStyle,
                  width: "100%",
                  boxSizing:
                    "border-box",
                }}
              />
            </div>

            <div
              style={{
                maxHeight: "55vh",
                overflowY: "auto",
              }}
            >
              {loadingTransporters && (
                <div
                  style={{
                    padding: "25px",
                    textAlign: "center",
                    color: "#64748b",
                  }}
                >
                  Loading transporters...
                </div>
              )}

              {!loadingTransporters &&
                filteredTransporters.length ===
                  0 && (
                  <div
                    style={{
                      padding: "25px",
                      textAlign:
                        "center",
                      color: "#64748b",
                    }}
                  >
                    No transport name
                    found.
                  </div>
                )}

              {!loadingTransporters &&
                filteredTransporters.map(
                  (item, index) => {
                    const id =
                      getId(item) ||
                      index;

                    const name =
                      getName(item) ||
                      "Unnamed Transport";

                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() =>
                          selectTransporter(
                            item
                          )
                        }
                        style={{
                          width: "100%",
                          border: "none",
                          borderBottom:
                            "1px solid #f1f5f9",
                          background:
                            "#fff",
                          padding:
                            "13px 16px",
                          textAlign:
                            "left",
                          cursor:
                            "pointer",
                        }}
                        onMouseEnter={(
                          e
                        ) => {
                          e.currentTarget.style.background =
                            "#fff7ed";
                        }}
                        onMouseLeave={(
                          e
                        ) => {
                          e.currentTarget.style.background =
                            "#fff";
                        }}
                      >
                        <div
                          style={{
                            fontWeight:
                              700,
                            color:
                              "#1e293b",
                          }}
                        >
                          {name}
                        </div>

                        {getId(
                          item
                        ) && (
                          <div
                            style={{
                              fontSize:
                                "12px",
                              color:
                                "#64748b",
                              marginTop:
                                "3px",
                            }}
                          >
                            ID:{" "}
                            {getId(
                              item
                            )}
                          </div>
                        )}
                      </button>
                    );
                  }
                )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   SMALL COMPONENTS
============================================================ */

function SummaryBox({
  title,
  value,
  background,
  color,
}) {
  return (
    <div
      style={{
        background,
        borderRadius: "9px",
        padding: "12px 14px",
      }}
    >
      <div
        style={{
          fontSize: "12px",
          color: "#64748b",
          marginBottom: "5px",
        }}
      >
        {title}
      </div>

      <div
        style={{
          fontSize: "18px",
          fontWeight: 800,
          color,
        }}
      >
        ₹ {money(value)}
      </div>
    </div>
  );
}

/* ============================================================
   STYLES
============================================================ */

const labelStyle = {
  display: "block",
  fontWeight: 600,
  marginBottom: "6px",
  color: "#334155",
};

const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  border: "1px solid #cbd5e1",
  borderRadius: "8px",
  padding: "10px 11px",
  fontSize: "14px",
  outline: "none",
  background: "#fff",
};

const smallButtonStyle = {
  border: "none",
  color: "#fff",
  borderRadius: "7px",
  padding: "0 11px",
  cursor: "pointer",
  fontWeight: 700,
};

const thStyle = {
  padding: "10px 9px",
  borderBottom:
    "1px solid #e2e8f0",
  textAlign: "left",
  fontSize: "13px",
  color: "#475569",
  whiteSpace: "nowrap",
};

const tdStyle = {
  padding: "9px",
  borderBottom:
    "1px solid #f1f5f9",
  fontSize: "13px",
  color: "#334155",
};

export default VoucherEntryPage;
