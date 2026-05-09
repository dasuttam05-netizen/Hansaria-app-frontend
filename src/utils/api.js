export function getApiOrigin() {
  // Support both old/new env keys used across docs and deployments.
  const envOrigin =
    process.env.REACT_APP_API_ORIGIN ||
    process.env.REACT_APP_API_URL ||
    process.env.REACT_APP_API;
  if (envOrigin) {
    return envOrigin.replace(/\/+$/, "");
  }

  if (typeof window === "undefined") {
    return "http://localhost:4001";
  }

  // In production on Render/Vercel, use the backend URL directly
  if (window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
    return "https://hansaria-app-backend.onrender.com";
  }

  // In development, use localhost
  const protocol = window.location.protocol || "http:";
  const host = window.location.hostname || "localhost";
  return `${protocol}//${host}:4001`;
}

export function getApiUrl(path = "") {
  return `${getApiOrigin()}${path}`;
}
