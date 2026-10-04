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

// Safe read-only retry: only GET/HEAD requests may retry once after temporary
// network/5xx failures. Save/update requests are never retried.
axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error?.config;
    const status = error?.response?.status;
    const method = String(config?.method || "get").toLowerCase();
    const retryable = method === "get" || method === "head";
    const temporaryFailure = !error?.response || [502, 503, 504].includes(status);

    if (config && retryable && temporaryFailure && !config.__readRetryDone) {
      config.__readRetryDone = true;
      await new Promise((resolve) => setTimeout(resolve, 700));
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
