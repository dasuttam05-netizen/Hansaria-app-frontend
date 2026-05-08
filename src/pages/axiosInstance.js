import axios from "axios";
import { getApiOrigin } from "../utils/api";

const API = axios.create({
  baseURL: getApiOrigin(),
});

API.interceptors.request.use(config => {
  const token = localStorage.getItem("token");
  if(token) config.headers["Authorization"] = token;
  return config;
});

export default API;
