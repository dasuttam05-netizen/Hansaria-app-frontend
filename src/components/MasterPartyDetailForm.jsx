import React from "react";
import { INDIAN_STATES } from "../constants/indianStates";
import MultiSelectDropdown from "./MultiSelectDropdown";

const inp = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: "8px",
  border: "1px solid #cbd5e1",
  fontSize: "14px",
  boxSizing: "border-box",
};

const lbl = { display: "block", marginBottom: "6px", fontWeight: 600, fontSize: "13px", color: "#334155" };

function F({ label, children }) {
  return (
    <div>
      <label style={lbl}>{label}</label>
      {children}
    </div>
  );
}

/**
 * Shared layout like "Add/Edit Consignee/Buyer Details" — Name, Mobile, Email, Address, GST, PAN, State, Location.
 * Consignee mode adds Buyer name multi-select first.
 */
export default function MasterPartyDetailForm({ mode, formData, onChange, onBuyerIdsChange, buyers = [] }) {
  const showBuyer = mode === "consignee";
  const selectedBuyerIds = Array.isArray(formData.buyer_ids)
    ? formData.buyer_ids.map(String)
    : formData.buyer_id
      ? [String(formData.buyer_id)]
      : [];

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        gap: "16px",
        alignItems: "start",
      }}
    >
      {showBuyer && (
        <div style={{ gridColumn: "1 / -1" }}>
          <MultiSelectDropdown
            label="Buyer name"
            options={buyers.map((b) => ({ value: String(b.id), label: b.name }))}
            value={selectedBuyerIds}
            onChange={(next) => {
              if (typeof onBuyerIdsChange === "function") {
                onBuyerIdsChange(next);
                return;
              }
              onChange?.({
                target: {
                  name: "buyer_ids",
                  value: next,
                },
              });
            }}
            placeholder="Select buyer name(s)"
            accent="#0f766e"
          />
        </div>
      )}
      <F label="Name">
        <input name="name" value={formData.name || ""} onChange={onChange} placeholder="Name" style={inp} />
      </F>
      <F label="Mobile">
        <input name="mobile" value={formData.mobile || ""} onChange={onChange} placeholder="Mobile" style={inp} />
      </F>
      <F label="Email">
        <input
          type="email"
          name="email"
          value={formData.email || ""}
          onChange={onChange}
          placeholder="Email"
          style={inp}
        />
      </F>
      <F label="Address">
        <textarea
          name="address"
          value={formData.address || ""}
          onChange={onChange}
          placeholder="Enter Address"
          rows={3}
          style={{ ...inp, resize: "vertical", minHeight: "72px" }}
        />
      </F>
      <F label="GST No.">
        <input name="gst_no" value={formData.gst_no || ""} onChange={onChange} placeholder="Enter GST No." style={inp} />
      </F>
      <F label="PAN No.">
        <input name="pan_no" value={formData.pan_no || ""} onChange={onChange} placeholder="Enter PAN No." style={inp} />
      </F>
      <F label="Select State">
        <select name="state" value={formData.state || ""} onChange={onChange} style={inp}>
          <option value="">Select State</option>
          {INDIAN_STATES.map((st) => (
            <option key={st} value={st}>
              {st}
            </option>
          ))}
        </select>
      </F>
      <F label="Location">
        <input name="location" value={formData.location || ""} onChange={onChange} placeholder="Enter Location" style={inp} />
      </F>
    </div>
  );
}
