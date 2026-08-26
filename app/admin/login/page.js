"use client";
import { useState, useEffect, useRef } from "react";

export default function AdminLoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [signInMethod, setSignInMethod] = useState("password");

  // Email OTP state
  const [otpEmail, setOtpEmail] = useState("");
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [emailChallengeId, setEmailChallengeId] = useState("");
  const [emailOtpCode, setEmailOtpCode] = useState("");
  const [emailCountdown, setEmailCountdown] = useState(0);
  const [emailSending, setEmailSending] = useState(false);
  const [emailVerifying, setEmailVerifying] = useState(false);
  const emailTimerRef = useRef(null);

  // Countdown timer
  useEffect(() => {
    if (emailCountdown > 0) {
      emailTimerRef.current = setTimeout(() => setEmailCountdown(emailCountdown - 1), 1000);
    }
    return () => clearTimeout(emailTimerRef.current);
  }, [emailCountdown]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const storeAdminToken = (token) => {
    localStorage.setItem("access_token", token);
    localStorage.setItem("drx_admin_token", token);
    localStorage.setItem("drx_admin_name", username || otpEmail);
    localStorage.setItem("userRole", "PLATFORM_ADMIN");
    document.cookie = `access_token=${token}; path=/; max-age=3600; SameSite=Lax`;
    document.cookie = `userRole=PLATFORM_ADMIN; path=/; max-age=3600; SameSite=Lax`;
    window.location.href = "/drx/admin/dashboard";
  };

  // Password login
  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    if (!username.trim() || !password.trim()) { setError("Please enter both username and password."); return; }
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("username", username);
      formData.append("password", password);
      formData.append("grant_type", "password");
      formData.append("additional_claims", JSON.stringify({ role: "PLATFORM_ADMIN" }));

      const res = await fetch("/drx/api/v1/proxzar-token", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) {
        const msg = data?.detail?.[0]?.msg || data?.detail || "Login failed. Please check credentials.";
        setError(typeof msg === "string" ? msg : JSON.stringify(msg));
        setLoading(false);
        return;
      }

      storeAdminToken(data.accessToken || data.access_token);
    } catch {
      setError("Unable to connect to server. Please try again.");
      setLoading(false);
    }
  };

  // Send Email OTP
  const handleSendEmailOtp = async () => {
    setError("");
    if (!otpEmail) { setError("Please enter your email address"); return; }
    setEmailSending(true);

    try {
      const res = await fetch("/drx/api/v1/proxzar-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ Identifier: otpEmail, Channel: "email" }),
      });
      const data = await res.json();

      if (!res.ok) {
        const msg = data?.detail?.[0]?.msg || data?.detail || "Failed to send OTP.";
        setError(typeof msg === "string" ? msg : JSON.stringify(msg));
        setEmailSending(false);
        return;
      }

      setEmailChallengeId(data.challengeId);
      setEmailOtpSent(true);
      setEmailCountdown(data.expiresIn || 600);
      setEmailSending(false);
    } catch {
      setError("Unable to connect to server. Please try again.");
      setEmailSending(false);
    }
  };

  // Verify Email OTP
  const handleVerifyEmailOtp = async () => {
    setError("");
    if (!emailOtpCode || emailOtpCode.length < 4) { setError("Please enter the OTP"); return; }
    setEmailVerifying(true);

    try {
      const formData = new FormData();
      formData.append("grant_type", "otp");
      formData.append("challenge_id", emailChallengeId);
      formData.append("otp", emailOtpCode);
      formData.append("additional_claims", JSON.stringify({ role: "PLATFORM_ADMIN" }));

      const res = await fetch("/drx/api/v1/proxzar-token", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) {
        const msg = data?.detail?.[0]?.msg || data?.detail || "Invalid OTP. Please try again.";
        setError(typeof msg === "string" ? msg : JSON.stringify(msg));
        setEmailVerifying(false);
        return;
      }

      storeAdminToken(data.accessToken || data.access_token);
    } catch {
      setError("Unable to connect to server. Please try again.");
      setEmailVerifying(false);
    }
  };

  const handleResendEmailOtp = () => {
    setEmailOtpCode("");
    handleSendEmailOtp();
  };

  return (
    <div className="h-screen flex overflow-hidden">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-[45%] bg-gradient-to-br from-[#2E23B5] via-[#4318d1] to-[#7c3aed] flex-col justify-between p-8 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <span className="absolute top-12 left-10 text-white/10 text-6xl font-bold">+</span>
          <span className="absolute top-32 right-16 text-white/10 text-4xl font-bold">+</span>
          <span className="absolute bottom-20 left-20 text-white/10 text-5xl font-bold">+</span>
          <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 left-1/4 w-48 h-48 bg-purple-300/10 rounded-full blur-2xl" />
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-white/15 backdrop-blur rounded-xl flex items-center justify-center border border-white/20">
              <span className="text-white font-bold text-lg">DRX</span>
            </div>
            <div>
              <p className="text-white font-bold text-lg">Admin Portal</p>
              <p className="text-purple-200 text-xs">Platform Management</p>
            </div>
          </div>
        </div>

        <div className="relative z-10 flex-1 flex flex-col justify-center">
          <h2 className="text-2xl font-bold text-white leading-tight mb-2">
            Manage Your<br />Entire Platform
          </h2>
          <div className="w-12 h-1 bg-white/30 rounded-full mb-3" />
          <p className="text-purple-200 text-xs leading-relaxed max-w-[280px] mb-5">
            Register organizations, manage doctors, create relationships, and monitor platform activity.
          </p>
          <div className="space-y-2">
            {[
              { icon: "🏢", title: "Organization Management", desc: "Register & manage pharma companies" },
              { icon: "👨‍⚕️", title: "Doctor Registry", desc: "Platform-wide doctor management" },
              { icon: "🔗", title: "Link Management", desc: "Connect doctors to organizations" },
              { icon: "📊", title: "Activity Monitoring", desc: "Full audit trail & analytics" },
            ].map((f, idx) => (
              <div key={idx} className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-xl px-3 py-2.5 border border-white/10">
                <span className="text-lg">{f.icon}</span>
                <div>
                  <p className="text-white text-[11px] font-bold">{f.title}</p>
                  <p className="text-purple-200 text-[9px]">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10">
          <p className="text-purple-300 text-[11px]">DRX Platform v1.0 · Secure Admin Access</p>
        </div>
      </div>

      {/* Right panel — Login form */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 bg-white overflow-y-auto">
        <div className="w-full max-w-[440px]">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-6">
            <div className="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center mx-auto mb-3">
              <span className="text-white font-bold text-lg">DRX</span>
            </div>
            <h1 className="text-xl font-bold" style={{ color: "#3b3a8a" }}>Admin Portal</h1>
          </div>

          <div className="mb-6">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">Welcome back</h2>
            <p className="text-gray-500 text-sm">Sign in with your Proxzar account</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm mb-4 flex items-center gap-2">
              <span>⚠️</span> {error}
            </div>
          )}

          {/* Sign-in method tabs */}
          <div className="flex gap-2 mb-5">
            {[
              { id: "password", label: "Username & Password", icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg> },
              { id: "emailOtp", label: "Email OTP", icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg> },
              { id: "phoneOtp", label: "Phone OTP", icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg> },
            ].map((m) => (
              <button key={m.id} type="button" onClick={() => { setSignInMethod(m.id); setError(""); }}
                className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl border-2 text-[11px] font-semibold transition-all flex-1 justify-center ${signInMethod === m.id ? "border-purple-600 text-purple-600 bg-purple-50" : "border-gray-200 text-gray-500 hover:border-gray-300"}`}>
                {m.icon}
                <span className="hidden sm:inline">{m.label}</span>
                <span className="sm:hidden">{m.id === "password" ? "Password" : m.id === "emailOtp" ? "Email" : "Phone"}</span>
              </button>
            ))}
          </div>

          {/* Password form */}
          {signInMethod === "password" && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Username</label>
                <div className="relative">
                  <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                  <input type="text" value={username} onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter username" autoComplete="username"
                    className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-100 focus:border-purple-400 text-sm bg-gray-50 transition-all outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Password</label>
                <div className="relative">
                  <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                  <input type={showPw ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password" autoComplete="current-password"
                    className="w-full pl-10 pr-12 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-100 focus:border-purple-400 text-sm bg-gray-50 transition-all outline-none" />
                  <button type="button" onClick={() => setShowPw(!showPw)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs font-medium">
                    {showPw ? "Hide" : "Show"}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl font-semibold text-sm transition-all disabled:opacity-60 flex items-center justify-center gap-2 shadow-lg shadow-purple-200">
                {loading ? (
                  <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg> Signing in...</>
                ) : (
                  <><img src="/drx/images/icons/proxzarIcon.png" alt="" className="w-4 h-4 object-contain" /> Sign in to access your portal</>
                )}
              </button>
            </form>
          )}

          {/* Email OTP form */}
          {signInMethod === "emailOtp" && (
            <div className="space-y-4">
              {!emailOtpSent ? (
                <form onSubmit={(e) => { e.preventDefault(); handleSendEmailOtp(); }} className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email Address</label>
                    <div className="relative">
                      <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                      <input type="email" value={otpEmail} onChange={(e) => setOtpEmail(e.target.value)}
                        placeholder="Enter your admin email" className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-100 focus:border-purple-400 text-sm bg-gray-50 transition-all outline-none" />
                    </div>
                  </div>
                  <button type="submit" disabled={emailSending}
                    className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl font-semibold text-sm transition-all disabled:opacity-60 flex items-center justify-center gap-2 shadow-lg shadow-purple-200">
                    {emailSending ? (
                      <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg> Sending...</>
                    ) : "Send OTP"}
                  </button>
                </form>
              ) : (
                <form onSubmit={(e) => { e.preventDefault(); handleVerifyEmailOtp(); }} className="space-y-4">
                  <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-2.5 text-sm text-green-700 font-medium">
                    OTP sent to {otpEmail}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Enter OTP</label>
                    <input type="text" value={emailOtpCode} onChange={(e) => setEmailOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="Enter 6-digit OTP" maxLength={6}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-100 focus:border-purple-400 tracking-widest text-center font-mono bg-gray-50" />
                  </div>
                  {emailCountdown > 0 && (
                    <p className="text-xs text-gray-500 text-center">Expires in <span className="font-semibold text-purple-600">{formatTime(emailCountdown)}</span></p>
                  )}
                  <button type="submit" disabled={emailVerifying}
                    className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl font-semibold text-sm transition-all disabled:opacity-60 flex items-center justify-center gap-2 shadow-lg shadow-purple-200">
                    {emailVerifying ? (
                      <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg> Verifying...</>
                    ) : "Verify & Sign in"}
                  </button>
                  {emailCountdown === 0 && (
                    <button type="button" onClick={handleResendEmailOtp} disabled={emailSending}
                      className="w-full py-2.5 border-2 border-purple-600 text-purple-600 hover:bg-purple-50 rounded-xl font-semibold text-sm transition-all disabled:opacity-60">
                      {emailSending ? "Sending..." : "Resend OTP"}
                    </button>
                  )}
                </form>
              )}
            </div>
          )}

          {/* Phone OTP — Coming Soon */}
          {signInMethod === "phoneOtp" && (
            <div className="relative">
              <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] rounded-xl z-10 flex items-center justify-center">
                <span className="bg-gray-800 text-white text-xs font-bold px-4 py-1.5 rounded-full">Coming Soon</span>
              </div>
              <div className="opacity-50 pointer-events-none space-y-4 py-2">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Phone Number</label>
                  <div className="flex gap-2">
                    <div className="flex items-center gap-1 px-3 py-3 border-2 border-gray-200 rounded-xl text-sm text-gray-600 bg-gray-50 flex-shrink-0">
                      🇮🇳 +91
                    </div>
                    <input type="tel" disabled placeholder="Enter mobile number"
                      className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl text-sm outline-none bg-gray-50" />
                  </div>
                </div>
                <button type="button" disabled className="w-full py-3 bg-gray-300 text-white rounded-xl font-semibold text-sm">Send OTP</button>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="mt-6 flex items-center justify-center gap-1 text-xs text-gray-400">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
            Secured by Proxzar Authentication
          </div>
        </div>
      </div>
    </div>
  );
}
