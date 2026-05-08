import React from "react";
import { INDIAN_STATES } from "../constants/indianStates";

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
 * Consignee mode adds Buyer name dropdown first.
 */
export default function MasterPartyDetailForm({ mode, formData, onChange, buyers = [] }) {
  const showBuyer = mode === "consignee";

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
        <F label="Buyer name">
          <select name="buyer_id" value={formData.buyer_id || ""} onChange={onChange} style={inp}>
            <option value="">Select buyer name</option>
            {buyers.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </F>
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
