"use client";
import { useState } from "react";
import { post as apiPost } from "@/lib/api";

const rules = [
  { label: "At least 8 characters",  test: (p) => p.length >= 8 },
  { label: "One uppercase letter",    test: (p) => /[A-Z]/.test(p) },
  { label: "One lowercase letter",    test: (p) => /[a-z]/.test(p) },
  { label: "One number",              test: (p) => /\d/.test(p) },
  { label: "One special character",   test: (p) => /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(p) },
];

const ACCENT_CLASSES = {
  indigo: { iconBg: "bg-indigo-100", iconText: "text-indigo-600", btn: "bg-indigo-600 hover:bg-indigo-700 text-white" },
  orange: { iconBg: "bg-orange-100", iconText: "text-orange-600", btn: "bg-orange-600 hover:bg-orange-700 text-white" },
  purple: { iconBg: "bg-purple-100", iconText: "text-purple-600", btn: "bg-purple-600 hover:bg-purple-700 text-white" },
  green:  { iconBg: "bg-green-100",  iconText: "text-green-600",  btn: "bg-green-600 hover:bg-green-700 text-white"  },
};

export default function ChangePasswordSection({ accentColor = "indigo" }) {
  const [open, setOpen]         = useState(false);
  const [current, setCurrent]   = useState("");
  const [newPwd, setNewPwd]     = useState("");
  const [confirm, setConfirm]   = useState("");
  const [error, setError]       = useState("");
  const [success, setSuccess]   = useState("");
  const [loading, setLoading]   = useState(false);
  const [showNew, setShowNew]   = useState(false);

  const a = ACCENT_CLASSES[accentColor] || ACCENT_CLASSES.indigo;
  const allRulesPassed = rules.every((r) => r.test(newPwd));
  const passwordsMatch = newPwd === confirm && confirm.length > 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); setSuccess("");
    if (!allRulesPassed) { setError("New password doesn't meet requirements."); return; }
    if (!passwordsMatch) { setError("Passwords don't match."); return; }
    setLoading(true);
    try {
      const data = await apiPost("/api/v1/auth/reset-password", {
        current_password: current,
        new_password: newPwd,
        confirm_password: confirm,
      });
      if (data.access_token) {
        localStorage.setItem("access_token", data.access_token);
        localStorage.setItem("token_expiry", Date.now() + (data.expires_in || 3600) * 1000);
        document.cookie = `access_token=${data.access_token}; path=/; max-age=3600; SameSite=Lax`;
      }
      setSuccess("Password changed successfully!");
      setCurrent(""); setNewPwd(""); setConfirm("");
      setTimeout(() => { setSuccess(""); setOpen(false); }, 2500);
    } catch (err) {
      setError(err.message || "Failed to change password.");
    }
    setLoading(false);
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
      <button onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 ${a.iconBg} rounded-xl flex items-center justify-center`}>
            <svg className={`w-4 h-4 ${a.iconText}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <div className="text-left">
            <p className="font-bold text-gray-900 text-sm">Change Password</p>
            <p className="text-xs text-gray-400">Update your account password</p>
          </div>
        </div>
        <svg className={`w-4 h-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="px-6 pb-6 border-t border-gray-100">
          {success && <div className="mt-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm font-medium">{success}</div>}
          {error   && <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">{error}</div>}

          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Current Password</label>
              <input type="password" value={current} onChange={(e) => setCurrent(e.target.value)}
                placeholder="Enter current password"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-200" />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">New Password</label>
              <div className="relative">
                <input type={showNew ? "text" : "password"} value={newPwd} onChange={(e) => setNewPwd(e.target.value)}
                  placeholder="Enter new password"
                  className="w-full px-3 py-2.5 pr-16 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-200" />
                <button type="button" onClick={() => setShowNew(!showNew)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600">
                  {showNew ? "Hide" : "Show"}
                </button>
              </div>
              {newPwd && (
                <div className="mt-2 grid grid-cols-2 gap-1">
                  {rules.map((r) => (
                    <div key={r.label} className={`flex items-center gap-1 text-xs ${r.test(newPwd) ? "text-green-600" : "text-gray-400"}`}>
                      <span>{r.test(newPwd) ? "✓" : "○"}</span>{r.label}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Confirm New Password</label>
              <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)}
                placeholder="Confirm new password"
                className={`w-full px-3 py-2.5 border rounded-xl text-sm outline-none focus:ring-2 transition-all ${
                  confirm && !passwordsMatch ? "border-red-300 focus:ring-red-200" :
                  confirm && passwordsMatch  ? "border-green-300 focus:ring-green-200" :
                  "border-gray-200 focus:ring-indigo-200"
                }`} />
            </div>

            <div className="flex gap-3">
              <button type="button" onClick={() => { setOpen(false); setCurrent(""); setNewPwd(""); setConfirm(""); setError(""); }}
                className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-50">
                Cancel
              </button>
              <button type="submit" disabled={loading || !current || !allRulesPassed || !passwordsMatch}
                className={`flex-1 ${a.btn} py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-50`}>
                {loading ? "Saving..." : "Change Password"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
