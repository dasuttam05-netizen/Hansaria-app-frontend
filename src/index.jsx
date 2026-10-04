import React from "react";
import ReactDOM from "react-dom/client";
import axios from "axios";
import { getApiOrigin } from "./utils/api";
import App from "./App.js";
import { loadSession, touchSessionActivity } from "./utils/auth";
import "./mobile.css";

// Initialize the browser API client before any component API calls.
// All relative Axios requests such as /api/wh-vouchers/... are sent
// to the cloud backend, never to the Vercel frontend origin.
axios.defaults.baseURL = getApiOrigin();
axios.defaults.headers.common.Accept = "application/json";

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
    touchSessionActivity();
  }
  return config;
});

// Recover from Render cold-start / temporary 502-504-503 responses when
// loading data. Never retry write requests, so existing data-entry/save
// operations cannot be duplicated.
axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error?.config;
    const method = String(config?.method || "get").toLowerCase();
    const status = error?.response?.status;
    const retryable = [502, 503, 504].includes(status) || !error?.response;

    if (
      config &&
      method === "get" &&
      retryable &&
      !config.__hansariaRetried
    ) {
      config.__hansariaRetried = true;
      await new Promise((resolve) => setTimeout(resolve, 900));
      return axios(config);
    }

    return Promise.reject(error);
  }
);

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);

if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/service-worker.js").catch(() => {});
  });
}
