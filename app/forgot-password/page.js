"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const ROLES = ["DOCTOR", "MR", "ADMIN"];

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep]         = useState(1); // 1 = email, 2 = OTP + new password
  const [email, setEmail]       = useState("");
  const [role, setRole]         = useState("DOCTOR");
  const [otp, setOtp]           = useState("");
  const [newPwd, setNewPwd]     = useState("");
  const [confirm, setConfirm]   = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [success, setSuccess]   = useState(false);

  const handleRequestOTP = async (e) => {
    e.preventDefault();
    setError("");
    if (!email || !role) { setError("Please enter email and select role."); return; }
    setLoading(true);
    try {
      const res = await fetch("/drx/api/v1/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role }),
      });
      // Always show step 2 regardless (security — don't reveal if email exists)
      setStep(2);
    } catch {
      setError("Unable to connect. Please try again.");
    }
    setLoading(false);
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError("");
    if (newPwd !== confirm) { setError("Passwords don't match."); return; }
    if (newPwd.length < 8)  { setError("Password must be at least 8 characters."); return; }
    setLoading(true);
    try {
      const res = await fetch("/drx/api/v1/auth/forgot-password/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role, otp, new_password: newPwd, confirm_password: confirm }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.detail || "Invalid or expired OTP."); setLoading(false); return; }
      setSuccess(true);
      setTimeout(() => router.push("/login"), 2500);
    } catch {
      setError("Unable to connect. Please try again.");
    }
    setLoading(false);
  };

  if (success) return (
    <div className="min-h-screen bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
      <div className="text-center text-white">
        <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center shadow-2xl mb-6 mx-auto">
          <span className="text-4xl">✅</span>
        </div>
        <h2 className="text-2xl font-bold mb-2">Password Reset!</h2>
        <p className="text-green-100">Redirecting to login...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-6">
            <div className="w-14 h-14 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <span className="text-2xl">{step === 1 ? "📧" : "🔑"}</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">{step === 1 ? "Forgot Password" : "Enter OTP"}</h1>
            <p className="text-gray-500 text-sm mt-1">
              {step === 1 ? "Enter your email to receive a reset OTP" : `OTP sent to ${email} — check your inbox`}
            </p>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-6">
            {[1, 2].map((s) => (
              <div key={s} className={`flex-1 h-1.5 rounded-full transition-all ${s <= step ? "bg-indigo-600" : "bg-gray-200"}`} />
            ))}
          </div>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">{error}</div>
          )}

          {step === 1 ? (
            <form onSubmit={handleRequestOTP} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Role</label>
                <select value={role} onChange={(e) => setRole(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-300 bg-white">
                  {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Email Address</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400" />
              </div>
              <button type="submit" disabled={loading || !email}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-bold text-sm transition-all shadow-lg disabled:opacity-50">
                {loading ? "Sending OTP..." : "Send OTP"}
              </button>
              <button type="button" onClick={() => router.push("/login")}
                className="w-full text-gray-500 hover:text-gray-700 text-sm font-medium py-2 transition-colors">
                Back to Login
              </button>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">6-Digit OTP</label>
                <input type="text" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="123456" maxLength={6}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-300 text-center text-xl tracking-widest font-bold" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">New Password</label>
                <input type="password" value={newPwd} onChange={(e) => setNewPwd(e.target.value)}
                  placeholder="Min 8 chars, uppercase, number, special"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Confirm Password</label>
                <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Confirm new password"
                  className={`w-full px-3 py-2.5 border rounded-xl text-sm outline-none focus:ring-2 transition-all ${
                    confirm && newPwd !== confirm ? "border-red-300 focus:ring-red-200" :
                    confirm && newPwd === confirm ? "border-green-300 focus:ring-green-200" :
                    "border-gray-300 focus:ring-indigo-300"
                  }`} />
              </div>
              <button type="submit" disabled={loading || otp.length !== 6 || !newPwd || newPwd !== confirm}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-bold text-sm transition-all shadow-lg disabled:opacity-50">
                {loading ? "Resetting..." : "Reset Password"}
              </button>
              <button type="button" onClick={() => { setStep(1); setError(""); setOtp(""); }}
                className="w-full text-gray-500 hover:text-gray-700 text-sm font-medium py-2 transition-colors">
                Resend OTP
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
