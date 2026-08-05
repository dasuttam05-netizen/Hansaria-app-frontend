import React from "react";
import PageBackCloseActions from "../components/PageBackCloseActions";
import { hasPermission } from "../utils/auth";

function WarehouseVoucherPanel({
  navigate,
  user,
  isPurchaseVoucher,
  isPaymentVoucher,
  isReceiptVoucher,
  activeVoucherType,
  allowedVoucherTypes,
  activeVoucherButtonStyle,
  voucherButtonStyle,
  voucherTypeRow,
  card,
  btnAction,
  importingPurchase,
  importingPayment,
  importingReceipt,
  onDownloadPurchaseTemplate,
  onDownloadPaymentTemplate,
  onDownloadReceiptTemplate,
  onImportPurchase,
  onImportPayment,
  onImportReceipt,
  onChangeActiveVoucherType,
  editId,
  children,
}) {
  return (
    <div>
      <div style={voucherTypeRow}>
        {allowedVoucherTypes.map((type) => (
          <button
            key={type}
            onClick={() => onChangeActiveVoucherType(type)}
            style={activeVoucherType === type ? activeVoucherButtonStyle : voucherButtonStyle}
          >
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </button>
        ))}
      </div>

      <div style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <h3 style={{ margin: 0 }}>{editId ? "Edit" : "New"} {activeVoucherType.charAt(0).toUpperCase() + activeVoucherType.slice(1)} Voucher</h3>
            <PageBackCloseActions navigate={navigate} size="compact" />
          </div>
          {(isPurchaseVoucher || isPaymentVoucher || isReceiptVoucher) && (
            (
              (isPurchaseVoucher && (hasPermission(user, "warehouse.trading.purchase.create") || hasPermission(user, "warehouse.trading.purchase.edit") || hasPermission(user, "warehouse.trading.purchase.delete"))) ||
              (isPaymentVoucher && (hasPermission(user, "warehouse.trading.payment.create") || hasPermission(user, "warehouse.trading.payment.edit") || hasPermission(user, "warehouse.trading.payment.delete"))) ||
              (isReceiptVoucher && (hasPermission(user, "warehouse.trading.receipt.create") || hasPermission(user, "warehouse.trading.receipt.edit") || hasPermission(user, "warehouse.trading.receipt.delete")))
            )
          ) && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {isPurchaseVoucher && (
                <>
                  <button type="button" onClick={onDownloadPurchaseTemplate} style={{ ...btnAction, background: "#0f766e" }}>
                    Download Excel Format
                  </button>
                  <label style={{ ...btnAction, background: importingPurchase ? "#94a3b8" : "#2563eb", cursor: importingPurchase ? "not-allowed" : "pointer" }}>
                    {importingPurchase ? "Importing..." : "Import Excel"}
                    <input type="file" accept=".xlsx,.xls" onChange={onImportPurchase} disabled={importingPurchase} style={{ display: "none" }} />
                  </label>
                </>
              )}
              {isPaymentVoucher && (
                <>
                  <button type="button" onClick={onDownloadPaymentTemplate} style={{ ...btnAction, background: "#0f766e" }}>
                    Download Excel Format
                  </button>
                  <label style={{ ...btnAction, background: importingPayment ? "#94a3b8" : "#2563eb", cursor: importingPayment ? "not-allowed" : "pointer" }}>
                    {importingPayment ? "Importing..." : "Import Excel"}
                    <input type="file" accept=".xlsx,.xls" onChange={onImportPayment} disabled={importingPayment} style={{ display: "none" }} />
                  </label>
                </>
              )}
              {isReceiptVoucher && (
                <>
                  <button type="button" onClick={onDownloadReceiptTemplate} style={{ ...btnAction, background: "#0f766e" }}>
                    Download Excel Format
                  </button>
                  <label style={{ ...btnAction, background: importingReceipt ? "#94a3b8" : "#2563eb", cursor: importingReceipt ? "not-allowed" : "pointer" }}>
                    {importingReceipt ? "Importing..." : "Import Excel"}
                    <input type="file" accept=".xlsx,.xls" onChange={onImportReceipt} disabled={importingReceipt} style={{ display: "none" }} />
                  </label>
                </>
              )}
            </div>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}

export default React.memo(WarehouseVoucherPanel);
