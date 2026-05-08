import React, { useState } from "react";

export default function PendingPage() {
  const [adjustments, setAdjustments] = useState([
    { party: "", qty: "" }
  ]);

  // Add new row
  const addRow = () => {
    setAdjustments([...adjustments, { party: "", qty: "" }]);
  };

  // Handle change
  const handleChange = (index, field, value) => {
    const updated = [...adjustments];
    updated[index][field] = value;
    setAdjustments(updated);
  };

  // Total calculate
  const totalQty = adjustments.reduce((sum, item) => sum + Number(item.qty || 0), 0);

  return (
    <div style={{ padding: "20px" }}>
      <h2>Pending Adjustment</h2>

      <table border="1" cellPadding="10" style={{ width: "100%", marginTop: "20px" }}>
        <thead>
          <tr>
            <th>Party Name</th>
            <th>Qty</th>
          </tr>
        </thead>

        <tbody>
          {adjustments.map((row, index) => (
            <tr key={index}>
              <td>
                <input
                  type="text"
                  value={row.party}
                  onChange={(e) => handleChange(index, "party", e.target.value)}
                  placeholder="Party Name"
                />
              </td>

              <td>
                <input
                  type="number"
                  value={row.qty}
                  onChange={(e) => handleChange(index, "qty", e.target.value)}
                  placeholder="Qty"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <button onClick={addRow} style={{ marginTop: "10px" }}>
        ➕ Add Row
      </button>

      <h3 style={{ marginTop: "20px" }}>
        Total Qty: {totalQty}
      </h3>
    </div>
  );
}