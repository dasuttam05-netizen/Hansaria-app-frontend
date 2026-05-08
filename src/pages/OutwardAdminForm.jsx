// src/pages/OutwardAdminForm.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";

export default function OutwardAdminForm({ editData, onSaved }) {
  const API_BASE = "/api";
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0,10),
    employee_id: "",
    location_id: "",
    warehouse_id: "",
    company_id: "",
    company_account_id: "",
    product_id: "",
    buyer_name: "",
    consignee_name: "",
    quantity: "",
    rate: "",
    amount: "",
    labour_charges: "",
    total_freight: "",
    narration: "",
    shortage: "",
    rent: "",
    allocations: [] // [{company_id, allocated_qty}]
  });

  const [employees, setEmployees] = useState([]);
  const [locations, setLocations] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [companyAccounts, setCompanyAccounts] = useState([]);
  const [products, setProducts] = useState([]);
  const [companyStocks, setCompanyStocks] = useState([]); // [{company_id, product_id, stock}]

  useEffect(() => {
    fetchDropdowns();
    if(editData) {
      setForm({...editData, allocations: editData.allocations || []});
    }
  }, [editData]);

  const fetchDropdowns = async () => {
    try {
      const [empRes, locRes, whRes, compRes, accRes, prodRes, stockRes] = await Promise.all([
        axios.get(`${API_BASE}/employees`),
        axios.get(`${API_BASE}/locations`),
        axios.get(`${API_BASE}/warehouses`),
        axios.get(`${API_BASE}/companies`),
        axios.get(`${API_BASE}/company-accounts`),
        axios.get(`${API_BASE}/products`),
        axios.get(`${API_BASE}/company-stocks`) // new endpoint for stock
      ]);
      setEmployees(empRes.data);
      setLocations(locRes.data);
      setWarehouses(whRes.data);
      setCompanies(compRes.data);
      setCompanyAccounts(accRes.data);
      setProducts(prodRes.data);
      setCompanyStocks(stockRes.data);
    } catch(err) {
      console.error(err);
      alert("Error fetching dropdowns or stocks");
    }
  };

  // Auto calculate amount
  useEffect(() => {
    const qty = parseFloat(form.quantity) || 0;
    const rate = parseFloat(form.rate) || 0;
    const labour = parseFloat(form.labour_charges) || 0;
    const freight = parseFloat(form.total_freight) || 0;
    setForm(f => ({ ...f, amount: qty*rate + labour + freight }));
  }, [form.quantity, form.rate, form.labour_charges, form.total_freight]);

  // Auto calculate rent and shortage
  useEffect(() => {
    const qty = parseFloat(form.quantity) || 0;
    const rent = qty * 2 / 100; // 2% per month
    const shortage = qty * 0.02; // 2% shortage
    setForm(f => ({ ...f, rent, shortage }));
  }, [form.quantity]);

  // Auto-set location and warehouse when employee selected
  useEffect(() => {
    if (form.employee_id) {
      const employeeId = Number(form.employee_id);
      const assignedWarehouses = warehouses.filter(
        (w) => Number(w.employee_id) === employeeId
      );
      const employee = employees.find((e) => e.id === employeeId);

      setForm((prev) => ({
        ...prev,
        location_id: employee?.location_id || "",
        warehouse_id:
          assignedWarehouses.length > 0
            ? String(assignedWarehouses[0].id)
            : "",
      }));
    }
  }, [form.employee_id, employees, warehouses]);

  const handleChange = e => {
    setForm({...form, [e.target.name]: e.target.value});
  };

  const handleAllocationChange = (index, value) => {
    const newAlloc = [...form.allocations];
    newAlloc[index].allocated_qty = parseFloat(value) || 0;
    setForm({...form, allocations: newAlloc});
  };

  const addAllocation = () => {
    if(form.allocations.length >= 5) return;
    setForm({...form, allocations: [...form.allocations, {company_id: "", allocated_qty: 0}]});
  };

  const handleSubmit = async e => {
    e.preventDefault();
    // check if total allocated qty <= total qty
    const totalAllocated = form.allocations.reduce((sum, a) => sum + (a.allocated_qty || 0), 0);
    if(totalAllocated > parseFloat(form.quantity)) {
      return alert("Total allocated quantity cannot exceed total quantity!");
    }

    try {
      if(editData) await axios.put(`${API_BASE}/outward/${editData.id}`, form);
      else await axios.post(`${API_BASE}/outward`, form);
      onSaved();
    } catch(err) {
      console.error(err);
      alert("Error saving outward");
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"10px"}}>
      <input type="date" name="date" value={form.date} onChange={handleChange} required />
      
      <select name="employee_id" value={form.employee_id} onChange={handleChange} required>
        <option value="">Select Employee</option>
        {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
      </select>

      <select name="location_id" value={form.location_id} disabled>
        <option value="">Location</option>
        {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
      </select>

      <select name="warehouse_id" value={form.warehouse_id} onChange={handleChange}>
        <option value="">Warehouse</option>
        {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
      </select>

      <select name="company_id" value={form.company_id} onChange={handleChange}>
        <option value="">Select Company</option>
        {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>

      <select name="company_account_id" value={form.company_account_id} onChange={handleChange}>
        <option value="">Select Account</option>
        {companyAccounts
          .filter(acc => acc.company_id === Number(form.company_id))
          .map(acc => <option key={acc.id} value={acc.id}>{acc.account_name}</option>)}
      </select>

      <select name="product_id" value={form.product_id} onChange={handleChange}>
        <option value="">Select Product</option>
        {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>

      <input type="text" name="buyer_name" value={form.buyer_name} onChange={handleChange} placeholder="Buyer Name" />
      <input type="text" name="consignee_name" value={form.consignee_name} onChange={handleChange} placeholder="Consignee Name" />
      <input type="number" name="quantity" value={form.quantity} onChange={handleChange} placeholder="Quantity" />
      <input type="number" name="rate" value={form.rate} onChange={handleChange} placeholder="Rate" />
      <input type="number" name="amount" value={form.amount} readOnly placeholder="Amount" />
      <input type="number" name="labour_charges" value={form.labour_charges} onChange={handleChange} placeholder="Labour Charges" />
      <input type="number" name="total_freight" value={form.total_freight} onChange={handleChange} placeholder="Total Freight" />
      <textarea name="narration" value={form.narration} onChange={handleChange} placeholder="Narration" />

      <h4>Allocations (Admin)</h4>
      {form.allocations.map((alloc, idx) => (
        <div key={idx} style={{display:"flex", gap:"6px"}}>
          <select value={alloc.company_id} onChange={e => {
            const newAlloc = [...form.allocations];
            newAlloc[idx].company_id = Number(e.target.value);
            setForm({...form, allocations: newAlloc});
          }}>
            <option value="">Select Company</option>
            {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <input type="number" value={alloc.allocated_qty} onChange={e=>handleAllocationChange(idx, e.target.value)} placeholder="Allocated Qty" />
          <span>Available: {
            companyStocks.find(s => s.company_id === Number(alloc.company_id) && s.product_id === Number(form.product_id))?.stock || 0
          }</span>
        </div>
      ))}
      {form.allocations.length < 5 && <button type="button" onClick={addAllocation}>+ Add Allocation</button>}

      <input type="number" name="rent" value={form.rent} readOnly placeholder="Rent" />
      <input type="number" name="shortage" value={form.shortage} readOnly placeholder="Shortage" />

      <button type="submit" style={{gridColumn:"1/-1", padding:"10px", background:"#4caf50", color:"#fff", border:"none", borderRadius:"6px"}}>Save</button>
    </form>
  );
}
