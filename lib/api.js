import { logout, sessionExpired } from "@/lib/auth";

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "/drx";

const apiRequest = async ({ url, method = "GET", data = null, headers = {}, params = null }) => {
  const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;

  if (typeof window !== "undefined") {
    const expiry = localStorage.getItem("token_expiry");
    if (expiry && Date.now() > parseInt(expiry)) {
      sessionExpired();
      throw new Error("Session expired. Please log in again.");
    }
  }

  const fullUrl = params ? `${BASE_PATH}${url}?${new URLSearchParams(params)}` : `${BASE_PATH}${url}`;
  const isFormData = typeof FormData !== "undefined" && data instanceof FormData;

  const config = {
    method,
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(token && { Authorization: `Bearer ${token}` }),
      ...headers,
    },
  };

  if (data) config.body = isFormData ? data : JSON.stringify(data);

  const response = await fetch(fullUrl, config);

  if (response.status === 401) {
    const body = await response.json().catch(() => ({}));
    const detail = typeof body.detail === "string" ? body.detail : "";
    // Don't logout if it's an MRX integration error, not a real session issue
    if (detail.includes("MRX") || detail.includes("integration") || detail.includes("client_id") || detail.includes("client_secret")) {
      throw Object.assign(new Error(detail || "Organization integration error"), { status: 401, data: body });
    }
    if (typeof window !== "undefined") sessionExpired();
    throw new Error("Session expired. Please log in again.");
  }

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    let message = "API error";
    if (typeof err.detail === "string") {
      message = err.detail;
    } else if (Array.isArray(err.detail)) {
      message = err.detail.map((d) => (typeof d === "string" ? d : d.msg || JSON.stringify(d))).join(", ");
    } else if (err.message) {
      message = err.message;
    }
    throw Object.assign(new Error(message), { status: response.status, data: err });
  }

  return response.json();
};

export const get    = (url, params) => apiRequest({ url, params });
export const post   = (url, data)   => apiRequest({ url, method: "POST",   data });
export const put    = (url, data)   => apiRequest({ url, method: "PUT",    data });
export const patch  = (url, data)   => apiRequest({ url, method: "PATCH",  data });
export const del    = (url, data)   => apiRequest({ url, method: "DELETE", data });
export const upload = (url, data)   => apiRequest({ url, method: "POST",   data });

export default apiRequest;
