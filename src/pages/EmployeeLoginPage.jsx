import React, { useState } from "react";
import axios from "axios";

export default function EmployeeLoginPage({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post("/api/auth/employee/login", {
        username,
        password,
      });
      localStorage.setItem("employeeToken", res.data.token);
      localStorage.setItem("employeeLocation", res.data.location_id);
      localStorage.setItem("employeeName", res.data.name);
      onLogin(res.data); // pass employee info
    } catch (err) {
      setError(err.response?.data?.error || "Login failed");
    }
  };

  return (
    <div className="flex justify-center items-center h-screen bg-gray-100">
      <form onSubmit={handleSubmit} className="bg-white shadow-lg rounded-2xl p-6 w-80">
        <h2 className="text-xl font-bold mb-4 text-center">Employee Login</h2>
        {error && <p className="text-red-500 text-sm mb-2">{error}</p>}
        <input type="text" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)}
          className="w-full border p-2 rounded mb-3" required />
        <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)}
          className="w-full border p-2 rounded mb-3" required />
        <button type="submit" className="bg-blue-500 text-white w-full py-2 rounded">Login</button>
      </form>
    </div>
  );
}
