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

export default API;
