export function getApiOrigin() {
  const defaultApiOrigin = "https://hansaria-app-backend.onrender.com";
  const localHostname = typeof window !== "undefined" ? window.location.hostname : "";
  const isLocalDev = localHostname === "localhost" || localHostname === "127.0.0.1";

  if (isLocalDev) {
    return "http://localhost:4001";
  }

  // Support both old/new env keys used across docs and deployments.
  const envOrigin =
    process.env.REACT_APP_API_ORIGIN ||
    process.env.REACT_APP_API_URL ||
    process.env.REACT_APP_API;
  if (envOrigin) {
    return envOrigin.replace(/\/+$/, "");
  }

  return defaultApiOrigin;
}

export function getApiUrl(path = "") {
  return `${getApiOrigin()}${path}`;
}
