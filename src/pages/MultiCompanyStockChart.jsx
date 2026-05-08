import React, { useEffect, useState } from "react";
import axios from "axios";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";

export default function MultiCompanyStockChart() {
  const [partyStock, setPartyStock] = useState([]);
  const [warehouseStock, setWarehouseStock] = useState([]);
  const [totalStock, setTotalStock] = useState(0);

  const API_BASE = "/api/reports";

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [partyRes, wareRes, totalRes] = await Promise.all([
          axios.get(`${API_BASE}/party-stock`),
          axios.get(`${API_BASE}/warehouse-stock`),
          axios.get(`${API_BASE}/total-stock`)
        ]);

        // /party-stock returns { summary, details }, extract summary
        setPartyStock(partyRes.data?.summary || []);
        setWarehouseStock(wareRes.data || []);
        setTotalStock(totalRes.data?.total || 0);
      } catch (err) {
        console.error("Failed to fetch stock data:", err);
      }
    };
    fetchData();
  }, []);

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#AA66CC", "#FF6699", "#FF4444", "#66CCFF"];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
      {/* Party-wise Stock */}
      <div style={{ background: "#fff", padding: "20px", borderRadius: "16px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
        <h2 style={{ marginBottom: "15px", fontSize: "18px", fontWeight: "bold" }}>Party Wise Stock</h2>
        {partyStock.length === 0 ? (
          <p>No party stock data available</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={partyStock.map(p => ({ 
              name: p.party_name || p.party, 
              stock: p.available_balance_qty || p.stock 
            }))}>
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="stock" fill="#4caf50" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Warehouse-wise Stock */}
      <div style={{ background: "#fff", padding: "20px", borderRadius: "16px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
        <h2 style={{ marginBottom: "15px", fontSize: "18px", fontWeight: "bold" }}>Warehouse Wise Stock</h2>
        {warehouseStock.length === 0 ? (
          <p>No warehouse stock data available</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={warehouseStock.map(w => ({ name: w.warehouse, value: w.stock }))}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={120}
                label
              >
                {warehouseStock.map((entry, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Total Stock */}
      <div style={{
        gridColumn: "span 2",
        background: "linear-gradient(90deg, #4e54c8, #8f94fb)",
        color: "#fff",
        padding: "25px",
        borderRadius: "16px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center"
      }}>
        <h2 style={{ fontSize: "20px", fontWeight: "bold" }}>Total Stock</h2>
        <p style={{ fontSize: "28px", fontWeight: "bold" }}>{Number(totalStock).toFixed(2)} Units</p>
      </div>
    </div>
  );
}
