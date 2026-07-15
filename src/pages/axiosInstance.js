import axios from "axios";
import { getApiOrigin } from "../utils/api";

const API = axios.create({
  baseURL: getApiOrigin(),
});

API.interceptors.request.use(config => {
  const token = localStorage.getItem("token");
  config.headers = config.headers || {};
  if (token) {
    config.headers["Authorization"] = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for security handling
API.interceptors.response.use(
  response => response,
  error => {
    const statusCode = error?.response?.status;
    const errorMessage = error?.response?.data?.error || error?.message;
    
    // Log security events
    if (statusCode === 403) {
      console.warn(
        `[SECURITY] Access Denied (403): ${errorMessage}`,
        { url: error.config?.url, timestamp: new Date().toISOString() }
      );
    } else if (statusCode === 401) {
      console.warn(
        `[SECURITY] Unauthorized (401): Token may be invalid or expired`,
        { url: error.config?.url, timestamp: new Date().toISOString() }
      );
      // Optionally redirect to login on 401
      localStorage.removeItem("token");
    } else if (statusCode === 503) {
      console.info(
        `[INFO] Service Unavailable (503): Database or service temporarily down`,
        { url: error.config?.url, message: errorMessage }
      );
    }
    
    // Always reject the promise to let callers handle it
    return Promise.reject(error);
  }
);

export default API;
