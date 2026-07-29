const KEYS = ["access_token", "token_type", "token_expiry", "userEmail", "userName",
               "userId", "apiRole", "userRole", "companyName"];

function clearSession() {
  KEYS.forEach((k) => localStorage.removeItem(k));
  document.cookie = "access_token=; path=/; max-age=0";
  document.cookie = "userRole=; path=/; max-age=0";
}

export function logout(router) {
  clearSession();
  window.location.href = "/login";
}

export function sessionExpired() {
  clearSession();
  window.dispatchEvent(new CustomEvent("session-expired"));
}

export function isTokenValid() {
  if (typeof window === "undefined") return false;
  const token  = localStorage.getItem("access_token");
  const expiry = localStorage.getItem("token_expiry");
  if (!token || !expiry) return false;
  return Date.now() < parseInt(expiry);
}
