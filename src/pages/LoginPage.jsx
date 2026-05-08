import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { saveSession } from "../utils/auth";
import { getApiOrigin } from "../utils/api";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      const res = await axios.post(`${getApiOrigin()}/auth/login`, {
        username,
        password,
      });

      console.log("LOGIN SUCCESS:", res.data);

      saveSession(res.data.token, res.data.user);

      navigate("/dashboard");

    } catch (err) {
      console.log("LOGIN ERROR:", err);
      const status = err.response?.status;
      const details = err.response?.data?.error || err.message || "Please try again";
      alert(`Login failed${status ? ` (${status})` : ""}: ${details}`);
    }
  };

  return (
    <div style={{ padding: "40px" }}>
      <h2>Warehouse Login</h2>

      <form onSubmit={handleLogin}>
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <br />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <br />

        <button type="submit">Login</button>
      </form>
    </div>
  );
}
