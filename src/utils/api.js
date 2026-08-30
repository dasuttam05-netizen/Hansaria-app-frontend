export function getApiOrigin() {
  const defaultApiOrigin = "https://hansaria-app-backend.onrender.com";

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
