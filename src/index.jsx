import React from "react";
import ReactDOM from "react-dom/client";
import axios from "axios";
import App from "./App";
import { loadSession } from "./utils/auth";
import "./mobile.css";

// Initialize auth header from stored session before any component API calls.
loadSession();

// Defensive fallback: always attach token if available.
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers = config.headers || {};
    if (!config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);

if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/service-worker.js").catch(() => {});
  });
}
