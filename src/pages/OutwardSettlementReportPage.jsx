import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { FaEdit, FaFilePdf } from "react-icons/fa";
import OutwardSettlementPage from "./OutwardSettlementPage";

export default function OutwardSettlementReportPage() {
  const navigate = useNavigate();
  const API_BASE = "/api";

  const [records, setRecords] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [editingRecord, setEditingRecord] = useState(null);

  const [filters, setFilters] = useState({
    from_date: new Date(
      new Date().setDate(new Date().getDate() - 30)
    )
      .toISOString()
      .split("T")[0],

    to_date: new Date().toISOString().split("T")[0],

    company_id: "",
    warehouse_id: "",
  });

  const num = (value) => {
    const n = Number(value);
    return Number.isFinite(n) ? n.toFixed(2) : "0.00";
  };

  const toNumber = (value) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  };

  const formatDate = (value) => {
    if (!value) return "-";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return String(value);
    }

    const dd = String(date.getDate()).padStart(2, "0");
    const mm = String(date.getMonth() + 1).padStart(2, "0");

    return `${dd}-${mm}-${date.getFullYear()}`;
  };

  /*
  |--------------------------------------------------------------------------
  | NORMALIZE ROW
  |--------------------------------------------------------------------------
  */

  const normalizeRow = (row = {}) => {
    const dispatchQty = toNumber(row.dispatch_qty);

    const unloadingQty = toNumber(row.unloading_qty);

    const settlementWeight = toNumber(
      row.settlement_weight ??
        row.billable_qty ??
        Math.max(dispatchQty - unloadingQty, 0)
    );

    const shortageQty = toNumber(
      row.shortage_qty ??
        row.billable_qty ??
        Math.max(dispatchQty - unloadingQty, 0)
    );

    const saleRate = toNumber(row.sale_rate);

    const saleAmount = toNumber(
      row.sale_amount ?? dispatchQty * saleRate
    );

    const companyRate = toNumber(row.company_rate);

    const companyAmount = toNumber(
      row.company_amount ??
        settlementWeight * companyRate
    );

    const freight = toNumber(row.freight);

    const otherCharges = toNumber(row.other_charges);

    const labourCharges = toNumber(
      row.outward_labour_charges
    );

    const claimAmount = toNumber(
      row.claim_amount ??
        row.claim_amt ??
        row.total_claim_amount
    );

    const deductionAmount = toNumber(
      row.other_deduction ??
        row.deduction_amount ??
        row.total_deduction
    );

    /*
    |--------------------------------------------------------------------------
    | IMPORTANT:
    | Warehouse / Location fallback
    |--------------------------------------------------------------------------
    */

    const warehouseName =
      row.warehouse_name ||
      row.warehouse ||
      row.warehouseName ||
      row.warehouse_title ||
      row.warehouse?.name ||
      "";

    const locationName =
      row.location_name ||
      row.location ||
      row.locationName ||
      row.location_title ||
      row.location?.name ||
      "";

    const grossAmount = toNumber(
      row.gross_amount ??
        row.gross_profit ??
        saleAmount -
          freight -
          otherCharges -
          labourCharges
    );

    const receivableAmount = toNumber(
      row.receivable_amount ??
        row.net_profit
    );

    const companyPayable = toNumber(
      row.company_payable
    );

    return {
      ...row,

      dispatch_qty: dispatchQty,
      unloading_qty: unloadingQty,
      settlement_weight: settlementWeight,
      shortage_qty: shortageQty,

      sale_rate: saleRate,
      sale_amount: saleAmount,

      company_rate: companyRate,
      company_amount: companyAmount,

      freight,
      other_charges: otherCharges,
      outward_labour_charges: labourCharges,

      claim_amount: claimAmount,
      other_deduction: deductionAmount,

      warehouse_name: warehouseName,
      location_name: locationName,

      gross_amount: grossAmount,
      receivable_amount: receivableAmount,
      company_payable: companyPayable,
    };
  };

  /*
  |--------------------------------------------------------------------------
  | ROW CALCULATIONS
  |--------------------------------------------------------------------------
  */

  const getRowCalculations = (row) => {
    const record = normalizeRow(row);

    const dispatchQty = record.dispatch_qty;

    const shortageQty = record.shortage_qty;

    const saleAmount = record.sale_amount;

    const purchaseAmount = record.company_amount;

    const saleRate = record.sale_rate;

    const freight = record.freight;

    const otherCharges = record.other_charges;

    const labourCharges =
      record.outward_labour_charges;

    const totalClaimAmount =
      record.claim_amount;

    const totalDeductionAmount =
      record.other_deduction;

    const adjustmentDetails = (
      record.adjustment_details || []
    ).map((item, index) => {
      const settlementWeight = toNumber(
        item.settlement_weight
      );

      const companyRate = toNumber(
        item.company_rate ??
          record.company_rate
      );

      const shortQtyPerLine =
        dispatchQty > 0
          ? (settlementWeight / dispatchQty) *
            shortageQty
          : 0;

      const shortAmount =
        shortQtyPerLine * companyRate;

      const saleShortAmount =
        shortQtyPerLine * saleRate;

      /*
      |--------------------------------------------------------------------------
      | CLAIM AMOUNT
      |--------------------------------------------------------------------------
      */

      const claimPerLine =
        dispatchQty > 0
          ? settlementWeight *
            (totalClaimAmount / dispatchQty)
          : 0;

      /*
      |--------------------------------------------------------------------------
      | DEDUCTION
      |--------------------------------------------------------------------------
      */

      const deductionPerLine =
        dispatchQty > 0
          ? settlementWeight *
            (totalDeductionAmount / dispatchQty)
          : 0;

      const freightPerLine =
        dispatchQty > 0
          ? settlementWeight *
            (freight / dispatchQty)
          : 0;

      const labourPerLine =
        dispatchQty > 0
          ? settlementWeight *
            (labourCharges / dispatchQty)
          : 0;

      const otherPerLine =
        dispatchQty > 0
          ? settlementWeight *
            (otherCharges / dispatchQty)
          : 0;

      const amount =
        item.amount != null
          ? toNumber(item.amount)
          : settlementWeight * companyRate;

      const netPayable =
        amount -
        freightPerLine -
        labourPerLine -
        otherPerLine -
        shortAmount -
        claimPerLine -
        deductionPerLine;

      return {
        ...item,

        sr_no: item.sr_no || index + 1,

        settlement_weight: settlementWeight,

        shortQtyPerLine,

        shortAmount,

        sale_short_amount: saleShortAmount,

        claim_per_line: claimPerLine,

        deduction_per_line: deductionPerLine,

        company_rate: companyRate,

        freight: freightPerLine,

        labour_charges: labourPerLine,

        other_charges: otherPerLine,

        amount,

        net_payable: netPayable,
      };
    });

    const totalShortAmount =
      adjustmentDetails.reduce(
        (sum, item) =>
          sum + toNumber(item.shortAmount),
        0
      );

    const totalClaimAmountByLine =
      adjustmentDetails.reduce(
        (sum, item) =>
          sum + toNumber(item.claim_per_line),
        0
      );

    const totalDeductionAmountByLine =
      adjustmentDetails.reduce(
        (sum, item) =>
          sum + toNumber(item.deduction_per_line),
        0
      );

    const totalSaleShortAmount =
      adjustmentDetails.reduce(
        (sum, item) =>
          sum + toNumber(item.sale_short_amount),
        0
      );

    const netReceivable =
      saleAmount -
      freight -
      otherCharges -
      labourCharges -
      totalSaleShortAmount;

    const netPayable =
      adjustmentDetails.length > 0
        ? adjustmentDetails.reduce(
            (sum, item) =>
              sum + toNumber(item.net_payable),
            0
          )
        : purchaseAmount -
          freight -
          otherCharges -
          labourCharges -
          totalShortAmount -
          totalClaimAmountByLine -
          totalDeductionAmountByLine;

    return {
      dispatchQty,

      saleAmount,

      purchaseAmount,

      freight,

      otherCharges,

      labourCharges,

      adjustmentDetails,

      totalShortAmount,

      totalClaimAmount:
        totalClaimAmountByLine,

      totalDeductionAmount:
        totalDeductionAmountByLine,

      totalSaleShortAmount,

      netReceivable,

      netPayable,

      netProfitLoss:
        netReceivable - netPayable,
    };
  };

  /*
  |--------------------------------------------------------------------------
  | FETCH DATA
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    axios
      .get(`${API_BASE}/companies`)
      .then((res) =>
        setCompanies(res.data || [])
      )
      .catch(console.error);

    axios
      .get(`${API_BASE}/warehouses`)
      .then((res) =>
        setWarehouses(res.data || [])
      )
      .catch(console.error);

    fetchReport();
  }, []);

  const fetchReport = async () => {
    try {
      const res = await axios.get(
        `${API_BASE}/outward-settlement/report/list`,
        {
          params: filters,
        }
      );

      const data = Array.isArray(res.data)
        ? res.data
        : [];

      setRecords(data.map(normalizeRow));
    } catch (error) {
      console.error(
        "Settlement report error:",
        error
      );

      setRecords([]);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | DISPLAY HELPERS
  |--------------------------------------------------------------------------
  */

  const displayInvNo = (row) => {
    const inv =
      row.inv_no != null &&
      String(row.inv_no).trim() !== ""
        ? String(row.inv_no).trim()
        : "";

    return (
      inv ||
      row.voucher_no ||
      `OUT-${row.outward_id}`
    );
  };

  const displayAccountName = (row) =>
    row.account_name ||
    row.company_name ||
    "-";

  const getLoadingTypeLabel = (sourceType) => {
    const value = String(
      sourceType || ""
    )
      .trim()
      .toLowerCase();

    return value === "palti_lorry"
      ? "Palti Lorry"
      : "Warehouse Loading";
  };

  /*
  |--------------------------------------------------------------------------
  | TOTALS
  |--------------------------------------------------------------------------
  */

  const totals = useMemo(() => {
    return records.reduce(
      (acc, row) => {
        const calc =
          getRowCalculations(row);

        acc.dispatch += toNumber(
          row.dispatch_qty
        );

        acc.unloading += toNumber(
          row.unloading_qty
        );

        acc.shortage += toNumber(
          row.shortage_qty
        );

        acc.settlement += toNumber(
          row.settlement_weight
        );

        acc.sale += calc.saleAmount;

        acc.receivable +=
          calc.netReceivable;

        acc.payable += calc.netPayable;

        acc.net +=
          calc.netProfitLoss;

        return acc;
      },
      {
        dispatch: 0,
        unloading: 0,
        shortage: 0,
        settlement: 0,
        sale: 0,
        receivable: 0,
        payable: 0,
        net: 0,
      }
    );
  }, [records]);

  /*
  |--------------------------------------------------------------------------
  | PDF
  |--------------------------------------------------------------------------
  */

  const createSinglePdf = (row) => {
    const record = normalizeRow(row);

    const calc =
      getRowCalculations(record);

    const doc = new jsPDF(
      "l",
      "mm",
      "a4"
    );

    const invNo =
      displayInvNo(record);

    const account =
      displayAccountName(record);

    doc.setFontSize(16);

    doc.text(
      "OUTWARD SETTLEMENT REPORT",
      14,
      14
    );

    doc.setFontSize(10);

    doc.text(
      `${invNo} | ${account}`,
      14,
      22
    );

    doc.setFontSize(8);

    doc.text(
      `Date: ${formatDate(
        record.date
      )} | Warehouse: ${
        record.warehouse_name || "-"
      } | Location: ${
        record.location_name || "-"
      } | Lorry: ${
        record.lorry_no || "-"
      }`,
      14,
      29
    );

    doc.text(
      `Buyer: ${
        record.buyer_name || "-"
      } | Consignee: ${
        record.consignee_name || "-"
      } | Product: ${
        record.product_name || "-"
      }`,
      14,
      35
    );

    autoTable(doc, {
      startY: 42,

      theme: "grid",

      headStyles: {
        fillColor: [15, 118, 110],
        textColor: 255,
      },

      styles: {
        fontSize: 7,
      },

      head: [
        [
          "Sr",
          "Company Name",
          "Lorry No",
          "Inward Voucher",
          "Loading Type",
          "Settlement Weight",
          "Short Qnt",
          "Short Amt",
          "Claim Amount",
          "C.Deduction",
          "Company Rate",
          "Freight",
          "Labour Chgs",
          "Other Chgs",
          "Amount",
          "Net Payable",
        ],
      ],

      body:
        calc.adjustmentDetails.length > 0
          ? calc.adjustmentDetails.map(
              (item, index) => [
                item.sr_no || index + 1,

                item.company_name || "-",

                item.lorry_no || "-",

                item.inward_voucher_no || "-",

                getLoadingTypeLabel(
                  item.source_type
                ),

                num(
                  item.settlement_weight
                ),

                num(
                  item.shortQtyPerLine
                ),

                num(
                  item.shortAmount
                ),

                num(
                  item.claim_per_line
                ),

                num(
                  item.deduction_per_line
                ),

                num(
                  item.company_rate
                ),

                num(item.freight),

                num(
                  item.labour_charges
                ),

                num(
                  item.other_charges
                ),

                num(item.amount),

                num(
                  item.net_payable
                ),
              ]
            )
          : [
              [
                "",
                "No adjusted inward details found.",
                "",
                "",
                "",
                "",
                "",
                "",
                "",
                "",
                "",
                "",
                "",
                "",
                "",
                "",
              ],
            ],
    });

    const summaryY =
      doc.lastAutoTable.finalY + 8;

    autoTable(doc, {
      startY: summaryY,

      theme: "grid",

      headStyles: {
        fillColor: [15, 118, 110],
        textColor: 255,
      },

      styles: {
        fontSize: 8,
      },

      head: [
        [
          "Sale Amount",
          "Freight",
          "Other Charges",
          "Labour Charges",
          "Claim Amount",
          "Net Receivable",
        ],
      ],

      body: [
        [
          num(calc.saleAmount),
          num(calc.freight),
          num(calc.otherCharges),
          num(calc.labourCharges),
          num(calc.totalClaimAmount),
          num(calc.netReceivable),
        ],
      ],
    });

    autoTable(doc, {
      startY:
        doc.lastAutoTable.finalY + 5,

      theme: "grid",

      headStyles: {
        fillColor: [194, 65, 12],
        textColor: 255,
      },

      styles: {
        fontSize: 8,
      },

      head: [
        [
          "Purchase Amount",
          "Freight",
          "Other Charges",
          "Labour Charges",
          "Claim Amount",
          "Net Payable",
        ],
      ],

      body: [
        [
          num(calc.purchaseAmount),
          num(calc.freight),
          num(calc.otherCharges),
          num(calc.labourCharges),
          num(calc.totalClaimAmount),
          num(calc.netPayable),
        ],
      ],
    });

    doc.setFontSize(12);

    doc.text(
      `Net Profit / Loss: ${num(
        calc.netProfitLoss
      )}`,
      14,
      doc.lastAutoTable.finalY + 12
    );

    doc.save(
      `${invNo}_Settlement_Report.pdf`
    );
  };

  /*
  |--------------------------------------------------------------------------
  | RENDER
  |--------------------------------------------------------------------------
  */

  return (
    <div
      style={{
        padding: 20,
        background: "#f8fafc",
        minHeight: "100vh",
        fontFamily:
          "Segoe UI, Arial, sans-serif",
      }}
    >
      <div
        style={{
          ...cardStyle,
          marginBottom: 16,
          display: "flex",
          justifyContent:
            "space-between",
          alignItems: "center",
          gap: 16,
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              color: "#0f172a",
            }}
          >
            Outward Settlement Report
          </h2>

          <p
            style={{
              margin: "6px 0 0",
              color: "#475569",
            }}
          >
            Outward details, adjusted
            company breakdown and
            settlement summary
          </p>
        </div>

        <button
          onClick={() =>
            navigate("/dashboard")
          }
          style={buttonStyle}
        >
          ← Back
        </button>
      </div>

      <div
        style={{
          ...cardStyle,
          marginBottom: 16,
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <input
            type="date"
            value={filters.from_date}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                from_date:
                  e.target.value,
              }))
            }
            style={inputStyle}
          />

          <input
            type="date"
            value={filters.to_date}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                to_date:
                  e.target.value,
              }))
            }
            style={inputStyle}
          />

          <select
            value={filters.company_id}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                company_id:
                  e.target.value,
              }))
            }
            style={inputStyle}
          >
            <option value="">
              All Outward Companies
            </option>

            {companies.map((company) => (
              <option
                key={company.id}
                value={company.id}
              >
                {company.name}
              </option>
            ))}
          </select>

          <select
            value={filters.warehouse_id}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                warehouse_id:
                  e.target.value,
              }))
            }
            style={inputStyle}
          >
            <option value="">
              All Warehouses
            </option>

            {warehouses.map((warehouse) => (
              <option
                key={warehouse.id}
                value={warehouse.id}
              >
                {warehouse.name}
              </option>
            ))}
          </select>

          <button
            onClick={fetchReport}
            style={{
              ...buttonStyle,
              background: "#0f766e",
            }}
          >
            Apply
          </button>

          <button
            onClick={() =>
              records.forEach(createSinglePdf)
            }
            style={{
              ...buttonStyle,
              background: "#2563eb",
            }}
          >
            Download PDF
          </button>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit,minmax(170px,1fr))",
          gap: 14,
          marginBottom: 16,
        }}
      >
        <StatCard
          title="Total Dispatch"
          value={totals.dispatch}
        />

        <StatCard
          title="Total Unloading"
          value={totals.unloading}
        />

        <StatCard
          title="Total Shortage"
          value={totals.shortage}
        />

        <StatCard
          title="Total Settlement Wt"
          value={totals.settlement}
        />

        <StatCard
          title="Total Receivable"
          value={totals.receivable}
        />

        <StatCard
          title="Total Net P/L"
          value={totals.net}
        />
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        {records.length === 0 ? (
          <div style={cardStyle}>
            No records found
          </div>
        ) : (
          records.map((row) => {
            const record =
              normalizeRow(row);

            const calc =
              getRowCalculations(record);

            return (
              <div
                key={
                  record.id ||
                  record.outward_id
                }
                style={cardStyle}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent:
                      "space-between",
                    gap: 16,
                    flexWrap: "wrap",
                    marginBottom: 14,
                  }}
                >
                  <div>
                    <h3
                      style={{
                        margin: 0,
                        color: "#0f172a",
                      }}
                    >
                      {displayInvNo(
                        record
                      )}{" "}
                      |{" "}
                      {displayAccountName(
                        record
                      )}
                    </h3>

                    <div
                      style={{
                        marginTop: 6,
                        color: "#0f172a",
                      }}
                    >
                      Date:{" "}
                      {formatDate(
                        record.date
                      )}{" "}
                      | Warehouse:{" "}
                      {record.warehouse_name ||
                        "-"}{" "}
                      | Location:{" "}
                      {record.location_name ||
                        "-"}{" "}
                      | Lorry:{" "}
                      {record.lorry_no ||
                        "-"}
                    </div>

                    <div
                      style={{
                        marginTop: 4,
                        color: "#0f172a",
                      }}
                    >
                      Buyer:{" "}
                      {record.buyer_name ||
                        "-"}{" "}
                      | Consignee:{" "}
                      {record.consignee_name ||
                        "-"}{" "}
                      | Product:{" "}
                      {record.product_name ||
                        "-"}
                    </div>
                  </div>

                  <div
                    style={{
                      minWidth: 280,
                      color: "#0f172a",
                    }}
                  >
                    <div>
                      Dispatch Qty:{" "}
                      {num(
                        record.dispatch_qty
                      )}
                    </div>

                    <div>
                      Unloading Qty:{" "}
                      {num(
                        record.unloading_qty
                      )}
                    </div>

                    <div>
                      Shortage Qty:{" "}
                      {num(
                        record.shortage_qty
                      )}
                    </div>

                    <div>
                      Settlement Weight:{" "}
                      {num(
                        record.settlement_weight
                      )}
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    overflowX: "auto",
                    border:
                      "1px solid #d1d5db",
                    marginBottom: 14,
                  }}
                >
                  <div
                    style={{
                      padding: 10,
                      fontWeight: 800,
                      color: "#1d4ed8",
                    }}
                  >
                    Adjusted Company Details
                  </div>

                  <table
                    style={{
                      width: "100%",
                      borderCollapse:
                        "collapse",
                      fontSize: 12,
                    }}
                  >
                    <thead>
                      <tr>
                        {[
                          "Sr",
                          "Company Name",
                          "Lorry No",
                          "Inward Voucher",
                          "Loading Type",
                          "Settlement Weight",
                          "Short Qnt",
                          "Short Amt",
                          "Claim Amount",
                          "C.Deduction",
                          "Company Rate",
                          "Freight",
                          "Labour Chgs",
                          "Other Chgs",
                          "Amount",
                          "Net Payable",
                        ].map((header) => (
                          <th
                            key={header}
                            style={
                              tableHeaderStyle
                            }
                          >
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>

                    <tbody>
                      {calc.adjustmentDetails
                        .length > 0 ? (
                        calc.adjustmentDetails.map(
                          (
                            item,
                            index
                          ) => (
                            <tr
                              key={
                                item.id ||
                                index
                              }
                            >
                              <td
                                style={
                                  tableCellStyle
                                }
                              >
                                {item.sr_no ||
                                  index + 1}
                              </td>

                              <td
                                style={
                                  tableCellStyle
                                }
                              >
                                {item.company_name ||
                                  "-"}
                              </td>

                              <td
                                style={
                                  tableCellStyle
                                }
                              >
                                {item.lorry_no ||
                                  "-"}
                              </td>

                              <td
                                style={
                                  tableCellStyle
                                }
                              >
                                {item.inward_voucher_no ||
                                  "-"}
                              </td>

                              <td
                                style={
                                  tableCellStyle
                                }
                              >
                                {getLoadingTypeLabel(
                                  item.source_type
                                )}
                              </td>

                              <td
                                style={
                                  tableCellStyle
                                }
                              >
                                {num(
                                  item.settlement_weight
                                )}
                              </td>

                              <td
                                style={
                                  tableCellStyle
                                }
                              >
                                {num(
                                  item.shortQtyPerLine
                                )}
                              </td>

                              <td
                                style={
                                  tableCellStyle
                                }
                              >
                                {num(
                                  item.shortAmount
                                )}
                              </td>

                              <td
                                style={
                                  tableCellStyle
                                }
                              >
                                {num(
                                  item.claim_per_line
                                )}
                              </td>

                              <td
                                style={
                                  tableCellStyle
                                }
                              >
                                {num(
                                  item.deduction_per_line
                                )}
                              </td>

                              <td
                                style={
                                  tableCellStyle
                                }
                              >
                                {num(
                                  item.company_rate
                                )}
                              </td>

                              <td
                                style={
                                  tableCellStyle
                                }
                              >
                                {num(
                                  item.freight
                                )}
                              </td>

                              <td
                                style={
                                  tableCellStyle
                                }
                              >
                                {num(
                                  item.labour_charges
                                )}
                              </td>

                              <td
                                style={
                                  tableCellStyle
                                }
                              >
                                {num(
                                  item.other_charges
                                )}
                              </td>

                              <td
                                style={
                                  tableCellStyle
                                }
                              >
                                {num(
                                  item.amount
                                )}
                              </td>

                              <td
                                style={
                                  tableCellStyle
                                }
                              >
                                {num(
                                  item.net_payable
                                )}
                              </td>
                            </tr>
                          )
                        )
                      ) : (
                        <tr>
                          <td
                            colSpan={16}
                            style={
                              tableCellStyle
                            }
                          >
                            No adjusted inward
                            details found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fit,minmax(280px,1fr))",
                    gap: 14,
                  }}
                >
                  <SummaryCard
                    title="Sale Summary"
                    totalLabel="Receivable"
                    totalValue={
                      calc.netReceivable
                    }
                    rows={[
                      [
                        "Sale",
                        calc.saleAmount,
                      ],
                      [
                        "Freight",
                        calc.freight,
                      ],
                      [
                        "Other",
                        calc.otherCharges,
                      ],
                      [
                        "Labour",
                        calc.labourCharges,
                      ],
                      [
                        "Claim Amount",
                        calc.totalClaimAmount,
                      ],
                    ]}
                  />

                  <SummaryCard
                    title="Purchase Summary"
                    totalLabel="Payable"
                    totalValue={
                      calc.netPayable
                    }
                    rows={[
                      [
                        "Purchase",
                        calc.purchaseAmount,
                      ],
                      [
                        "Freight",
                        calc.freight,
                      ],
                      [
                        "Other",
                        calc.otherCharges,
                      ],
                      [
                        "Labour",
                        calc.labourCharges,
                      ],
                      [
                        "Claim Amount",
                        calc.totalClaimAmount,
                      ],
                    ]}
                  />
                </div>

                <div
                  style={{
                    marginTop: 14,
                    padding: 14,
                    border:
                      "1px solid #93c5fd",
                    borderRadius: 12,
                    background: "#eff6ff",
                    display: "flex",
                    justifyContent:
                      "space-between",
                  }}
                >
                  <strong>
                    Net Profit / Loss
                  </strong>

                  <strong
                    style={{
                      color:
                        calc.netProfitLoss <
                        0
                          ? "#dc2626"
                          : "#15803d",
                    }}
                  >
                    {num(
                      calc.netProfitLoss
                    )}
                  </strong>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent:
                      "flex-end",
                    gap: 10,
                    marginTop: 14,
                  }}
                >
                  <button
                    onClick={() =>
                      createSinglePdf(
                        record
                      )
                    }
                    style={{
                      ...iconButtonStyle,
                      background:
                        "#1d4ed8",
                    }}
                  >
                    <FaFilePdf />
                  </button>

                  <button
                    onClick={() =>
                      setEditingRecord(
                        record
                      )
                    }
                    style={{
                      ...iconButtonStyle,
                      background:
                        "#0f766e",
                    }}
                  >
                    <FaEdit />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {editingRecord && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background:
              "rgba(15,23,42,.45)",
            zIndex: 1000,
            overflowY: "auto",
            padding: 20,
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 16,
              padding: 18,
              maxWidth: 1200,
              margin: "0 auto",
            }}
          >
            <button
              onClick={() =>
                setEditingRecord(null)
              }
              style={{
                float: "right",
                background: "#ef4444",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                padding: "6px 12px",
                cursor: "pointer",
              }}
            >
              X
            </button>

            <OutwardSettlementPage
              outward={{
                id: editingRecord.outward_id,
              }}
              onSaved={() => {
                fetchReport();
                setEditingRecord(null);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

/*
|--------------------------------------------------------------------------
| COMPONENTS
|--------------------------------------------------------------------------
*/

function StatCard({ title, value }) {
  return (
    <div style={cardStyle}>
      <div
        style={{
          color: "#475569",
          fontSize: 13,
        }}
      >
        {title}
      </div>

      <div
        style={{
          fontSize: 24,
          fontWeight: 700,
          marginTop: 6,
        }}
      >
        {Number(value || 0).toFixed(2)}
      </div>
    </div>
  );
}

function SummaryCard({
  title,
  totalLabel,
  totalValue,
  rows,
}) {
  return (
    <div
      style={{
        background: "#fff",
        border:
          "1px solid #dbe4ea",
        borderRadius: 14,
        padding: 14,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent:
            "space-between",
          marginBottom: 12,
          fontSize: 16,
          fontWeight: 800,
        }}
      >
        <span>{title}</span>

        <strong>
          {Number(
            totalValue || 0
          ).toFixed(2)}
        </strong>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit,minmax(120px,1fr))",
          gap: 8,
        }}
      >
        {rows.map(
          ([label, value]) => (
            <div
              key={label}
              style={{
                padding: 10,
                borderRadius: 10,
                background:
                  "#f8fafc",
                border:
                  "1px solid #e2e8f0",
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  color: "#475569",
                }}
              >
                {label}
              </div>

              <strong>
                {Number(
                  value || 0
                ).toFixed(2)}
              </strong>
            </div>
          )
        )}
      </div>

      <div
        style={{
          marginTop: 12,
          padding: 10,
          borderRadius: 10,
          background: "#ecfdf5",
          border:
            "1px solid #86efac",
          display: "flex",
          justifyContent:
            "space-between",
        }}
      >
        <strong>{totalLabel}</strong>

        <strong>
          {Number(
            totalValue || 0
          ).toFixed(2)}
        </strong>
      </div>
    </div>
  );
}

/*
|--------------------------------------------------------------------------
| STYLES
|--------------------------------------------------------------------------
*/

const cardStyle = {
  background: "#fff",
  border: "1px solid #d1d5db",
  borderRadius: 16,
  padding: 16,
  boxShadow:
    "0 1px 4px rgba(15,23,42,.08)",
};

const inputStyle = {
  padding: "10px 12px",
  border:
    "1px solid #cbd5e1",
  borderRadius: 8,
  fontSize: 14,
  minWidth: 160,
};

const buttonStyle = {
  padding: "10px 16px",
  border: "none",
  borderRadius: 8,
  fontWeight: 700,
  cursor: "pointer",
  color: "#fff",
  background: "#6366f1",
};

const tableHeaderStyle = {
  background: "#0f766e",
  color: "#fff",
  padding: "8px 10px",
  border:
    "1px solid #0f766e",
  textAlign: "left",
  whiteSpace: "nowrap",
};

const tableCellStyle = {
  padding: "8px 10px",
  border:
    "1px solid #cbd5e1",
  color: "#0f172a",
  whiteSpace: "nowrap",
};

const iconButtonStyle = {
  width: 42,
  height: 38,
  border: "none",
  borderRadius: 8,
  color: "#fff",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
};
