"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { post as apiPost } from "@/lib/api";

const rules = [
  { label: "At least 8 characters",        test: (p) => p.length >= 8 },
  { label: "One uppercase letter",          test: (p) => /[A-Z]/.test(p) },
  { label: "One lowercase letter",          test: (p) => /[a-z]/.test(p) },
  { label: "One number",                    test: (p) => /\d/.test(p) },
  { label: "One special character",         test: (p) => /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(p) },
];

export default function ChangePasswordPage() {
  const router = useRouter();
  const [current, setCurrent]   = useState("");
  const [newPwd, setNewPwd]     = useState("");
  const [confirm, setConfirm]   = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [success, setSuccess]   = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew]   = useState(false);

  const userName = typeof window !== "undefined" ? localStorage.getItem("userName") : "";
  const userRole = typeof window !== "undefined" ? localStorage.getItem("apiRole") : "";

  const roleRedirect = { ADMIN: "/company/overview", DOCTOR: "/doctor/home", MR: "/mr/dashboard" };

  const allRulesPassed = rules.every((r) => r.test(newPwd));
  const passwordsMatch = newPwd === confirm && confirm.length > 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!allRulesPassed) { setError("New password doesn't meet requirements."); return; }
    if (!passwordsMatch) { setError("Passwords don't match."); return; }
    setLoading(true);
    try {
      const data = await apiPost("/api/v1/auth/reset-password", {
        current_password: current,
        new_password: newPwd,
        confirm_password: confirm,
      });
      // Update token if returned
      if (data.access_token) {
        localStorage.setItem("access_token", data.access_token);
        localStorage.setItem("token_expiry", Date.now() + (data.expires_in || 3600) * 1000);
        document.cookie = `access_token=${data.access_token}; path=/; max-age=3600; SameSite=Lax`;
      }
      setSuccess(true);
      setTimeout(() => router.push(roleRedirect[userRole] || "/"), 2000);
    } catch (err) {
      setError(err.message || "Failed to change password.");
    }
    setLoading(false);
  };

  if (success) return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 to-purple-700 flex items-center justify-center">
      <div className="text-center text-white">
        <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center shadow-2xl mb-6 mx-auto">
          <span className="text-4xl">✅</span>
        </div>
        <h2 className="text-2xl font-bold mb-2">Password Changed!</h2>
        <p className="text-indigo-100">Redirecting to your dashboard...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="w-14 h-14 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <span className="text-2xl">🔐</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Set New Password</h1>
            {userName && <p className="text-gray-500 text-sm mt-1">Welcome, {userName}! Please set a new password to continue.</p>}
          </div>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Current password */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Current Password</label>
              <div className="relative">
                <input type={showCurrent ? "text" : "password"} value={current}
                  onChange={(e) => setCurrent(e.target.value)}
                  placeholder="Enter your current password"
                  className="w-full px-3 py-2.5 pr-10 border border-gray-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400" />
                <button type="button" onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs">
                  {showCurrent ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {/* New password */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">New Password</label>
              <div className="relative">
                <input type={showNew ? "text" : "password"} value={newPwd}
                  onChange={(e) => setNewPwd(e.target.value)}
                  placeholder="Enter new password"
                  className="w-full px-3 py-2.5 pr-10 border border-gray-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400" />
                <button type="button" onClick={() => setShowNew(!showNew)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs">
                  {showNew ? "Hide" : "Show"}
                </button>
              </div>
              {/* Password rules */}
              {newPwd && (
                <div className="mt-2 space-y-1">
                  {rules.map((r) => (
                    <div key={r.label} className={`flex items-center gap-1.5 text-xs ${r.test(newPwd) ? "text-green-600" : "text-gray-400"}`}>
                      <span>{r.test(newPwd) ? "✓" : "○"}</span>
                      {r.label}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Confirm password */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Confirm New Password</label>
              <input type="password" value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Confirm new password"
                className={`w-full px-3 py-2.5 border rounded-xl text-sm outline-none focus:ring-2 transition-all ${
                  confirm && !passwordsMatch ? "border-red-300 focus:ring-red-200" :
                  confirm && passwordsMatch  ? "border-green-300 focus:ring-green-200" :
                  "border-gray-300 focus:ring-indigo-300 focus:border-indigo-400"
                }`} />
              {confirm && !passwordsMatch && <p className="text-xs text-red-500 mt-1">Passwords don't match</p>}
              {confirm && passwordsMatch  && <p className="text-xs text-green-600 mt-1">✓ Passwords match</p>}
            </div>

            <button type="submit" disabled={loading || !current || !allRulesPassed || !passwordsMatch}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-bold text-sm transition-all shadow-lg disabled:opacity-50 mt-2">
              {loading ? "Changing Password..." : "Change Password"}
            </button>
            <button type="button" onClick={() => router.push(roleRedirect[userRole] || "/")}
              className="w-full text-gray-400 hover:text-gray-600 text-sm font-medium py-2 transition-colors">
              Skip for now
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
