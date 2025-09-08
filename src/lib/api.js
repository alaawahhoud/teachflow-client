// src/lib/api.js
export const API_BASE =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL) ||
  (typeof process !== "undefined" && process.env?.REACT_APP_API_URL) ||
  "/api";

export function getToken() {
  return (
    localStorage.getItem("tf_token") ||
    localStorage.getItem("token") ||
    sessionStorage.getItem("tf_token") ||
    sessionStorage.getItem("token") ||
    ""
  );
}

export async function apiFetch(path, options = {}) {
  const raw = getToken();
  const bare = raw.replace(/^Bearer\s+/i, "");

  const headers = new Headers(options.headers || {});
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  if (bare) headers.set("Authorization", `Bearer ${bare}`);

  const url = `${API_BASE}${path.startsWith("/") ? "" : "/"}${path}`;
  const res = await fetch(url, {
    credentials: "include",
    ...options,
    headers,
  });

  const ct = res.headers.get("content-type") || "";
  const body = ct.includes("application/json") ? await res.json() : await res.text();
  if (!res.ok) {
    const msg = body?.message || (typeof body === "string" ? body : `HTTP ${res.status}`);
    const err = new Error(msg);
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return body;
}
