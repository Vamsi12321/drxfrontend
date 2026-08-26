"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

export default function Login() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);
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

  // Phone OTP state
  const [otpPhone, setOtpPhone] = useState("");

  // Countdown timer for email OTP
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
        const msg = data?.detail?.[0]?.msg || data?.detail || "Failed to send OTP. Please try again.";
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

  // Verify Email OTP (get token)
  const handleVerifyEmailOtp = async () => {
    setError("");
    if (!emailOtpCode || emailOtpCode.length < 4) { setError("Please enter the OTP sent to your email"); return; }
    setEmailVerifying(true);

    try {
      const formData = new FormData();
      formData.append("grant_type", "otp");
      formData.append("challenge_id", emailChallengeId);
      formData.append("otp", emailOtpCode);
      formData.append("additional_claims", JSON.stringify({ role: "DOCTOR" }));

      const res = await fetch("/drx/api/v1/proxzar-token", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        const msg = data?.detail?.[0]?.msg || data?.detail || "Invalid OTP. Please try again.";
        setError(typeof msg === "string" ? msg : JSON.stringify(msg));
        setEmailVerifying(false);
        return;
      }

      // Store token
      const token = data.accessToken || data.access_token;
      localStorage.setItem("access_token", token);
      localStorage.setItem("token_type", data.tokenType || "bearer");
      localStorage.setItem("userRole", "doctor");
      localStorage.setItem("userName", otpEmail);

      document.cookie = `access_token=${token}; path=/; max-age=3600; SameSite=Lax`;
      document.cookie = `userRole=doctor; path=/; max-age=3600; SameSite=Lax`;

      setLoginSuccess(true);
      setTimeout(() => router.push("/doctor/select-org"), 1500);
    } catch {
      setError("Unable to connect to server. Please try again.");
      setEmailVerifying(false);
    }
  };

  // Resend Email OTP
  const handleResendEmailOtp = () => {
    setEmailOtpCode("");
    handleSendEmailOtp();
  };

  // Password login
  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    if (!username || !password) { setError("Please enter both username and password"); return; }
    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append("username", username);
      formData.append("password", password);
      formData.append("grant_type", "password");
      formData.append("additional_claims", JSON.stringify({ role: "DOCTOR" }));

      const res = await fetch("/drx/api/v1/proxzar-token", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        const msg = data?.detail?.[0]?.msg || data?.detail || "Login failed. Please check your credentials.";
        setError(typeof msg === "string" ? msg : JSON.stringify(msg));
        setIsLoading(false);
        return;
      }

      const token = data.accessToken || data.access_token;
      localStorage.setItem("access_token", token);
      localStorage.setItem("token_type", data.tokenType || "bearer");
      localStorage.setItem("userRole", "doctor");
      localStorage.setItem("userName", username);

      document.cookie = `access_token=${token}; path=/; max-age=3600; SameSite=Lax`;
      document.cookie = `userRole=doctor; path=/; max-age=3600; SameSite=Lax`;

      setLoginSuccess(true);
      setTimeout(() => router.push("/doctor/select-org"), 1500);
    } catch {
      setError("Unable to connect to server. Please try again.");
      setIsLoading(false);
    }
  };

  // Success animation
  if (loginSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#4318d1] via-[#5b2bce] to-[#7c3aed]">
        <div className="text-center">
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-xl">
            <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          </div>
          <h2 className="text-xl font-bold text-white mb-1">Welcome!</h2>
          <p className="text-indigo-200 text-sm">Signing you in...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-[48%] bg-gradient-to-br from-[#4318d1] via-[#5b2bce] to-[#7c3aed] flex-col justify-between p-10 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-32 h-32 bg-white/5 rounded-full" />
          <div className="absolute bottom-32 right-10 w-48 h-48 bg-white/5 rounded-full" />
          <div className="absolute top-1/2 left-1/3 w-24 h-24 bg-white/5 rounded-full" />
        </div>

        <div className="relative z-10">
          <h1 className="text-4xl font-black tracking-tight">
            <span className="text-white">DR</span><span className="text-cyan-300">X</span>
          </h1>
          <p className="text-indigo-300 text-xs font-semibold tracking-widest mt-1">AI PLATFORM</p>
        </div>

        <div className="relative z-10">
          <h2 className="text-3xl font-bold text-white leading-tight mb-3">
            One Platform to<br />Access All Orgs
          </h2>
          <div className="w-10 h-1 bg-white/40 rounded-full mb-4" />
          <p className="text-indigo-200 text-sm leading-relaxed max-w-[320px] mb-8">
            Discover medicines, attend CME events, connect with peers, and access all your organizations — one platform, endless possibilities.
          </p>

          {/* Feature list */}
          <div className="space-y-4">
            {[
              { icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>, title: "Smart Drug Discovery", desc: "AI search across thousands of medicines" },
              { icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>, title: "CME & Events", desc: "Stay updated with medical conferences & webinars" },
              { icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>, title: "Doctor Network", desc: "Connect & collaborate with verified doctors" },
              { icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>, title: "Clinical Insights", desc: "AI-powered insights for better decisions" },
            ].map((f) => (
              <div key={f.title} className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-white flex-shrink-0">
                  {f.icon}
                </div>
                <div>
                  <p className="text-white text-sm font-semibold">{f.title}</p>
                  <p className="text-indigo-300 text-xs">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="absolute inset-0 flex items-center justify-end pointer-events-none pr-4">
          <img src="/drx/images/doctors/dr_login.png" alt="" className="h-[75%] object-contain" />
        </div>
      </div>

      {/* Right Panel — Login Form */}
      <div className="w-full lg:w-[52%] flex items-center justify-center p-3 sm:p-5 xl:p-8 bg-white overflow-y-auto max-h-screen">
        <div className="w-full max-w-[680px]">
          {/* Logo for mobile */}
          <div className="lg:hidden flex items-center justify-center mb-6">
            <div className="w-10 h-10 bg-[#5b2bce] rounded-lg flex items-center justify-center">
              <span className="text-white font-black text-sm">DRX</span>
            </div>
          </div>

          {/* Heading */}
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-0.5">Welcome back, Doctor</h2>
          <p className="text-gray-500 text-[11px] sm:text-xs mb-4 sm:mb-5">Sign in with your Proxzar account</p>

          {/* Error */}
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-3 py-2.5 rounded-xl text-xs font-medium flex items-center gap-2">
              <span>⚠️</span> {error}
            </div>
          )}

          {/* Sign-in methods */}
          <div className="flex flex-col lg:flex-row gap-3 sm:gap-4">
            {/* Left column — Sign-in method tabs + password form */}
            <div className="flex-1 border border-gray-200 rounded-2xl p-3 sm:p-4">
              <p className="text-[10px] sm:text-[11px] font-semibold text-gray-500 mb-2">Choose a sign-in method</p>
              <div className="flex gap-1.5 mb-3 sm:mb-4">
                {[
                  { id: "password", label: "Username & Password", icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg> },
                  { id: "emailOtp", label: "Email OTP", icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg> },
                  { id: "phoneOtp", label: "Phone OTP", icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg> },
                ].map((m) => (
                  <button key={m.id} type="button" onClick={() => { setSignInMethod(m.id); setError(""); }}
                    className={`flex flex-col items-center gap-0.5 px-2 sm:px-3 py-2 rounded-xl border-2 text-[9px] sm:text-[10px] font-semibold transition-all flex-1 ${signInMethod === m.id ? "border-[#5b2bce] text-[#5b2bce] bg-purple-50" : "border-gray-200 text-gray-500 hover:border-gray-300"}`}>
                    {m.icon}
                    <span className="leading-tight text-center">{m.label}</span>
                  </button>
                ))}
              </div>

              {/* Password form */}
              {signInMethod === "password" && (
                <form onSubmit={handleLogin} className="space-y-3">
                  <div>
                    <label className="block text-[10px] sm:text-[11px] font-semibold text-gray-700 mb-1">Username</label>
                    <div className="relative">
                      <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                      <input type="text" value={username} onChange={(e) => setUsername(e.target.value)}
                        placeholder="Enter username" autoComplete="username"
                        className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 text-xs outline-none" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] sm:text-[11px] font-semibold text-gray-700 mb-1">Password</label>
                    <div className="relative">
                      <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                      <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password" autoComplete="current-password"
                        className="w-full pl-9 pr-11 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 text-xs outline-none" />
                      <button type="button" onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-[10px] font-medium">
                        {showPassword ? "Hide" : "Show"}
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-end">
                    <a href="/drx/forgot-password" className="text-[10px] sm:text-[11px] text-[#5b2bce] font-semibold hover:underline">Forgot password?</a>
                  </div>
                  <button type="submit" disabled={isLoading}
                    className="w-full bg-[#5b2bce] hover:bg-[#4318d1] text-white py-2.5 rounded-xl font-semibold shadow-lg transition-all disabled:opacity-60 flex items-center justify-center gap-2 text-xs">
                    {isLoading ? (
                      <><svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg> Signing in...</>
                    ) : (
                      <><img src="/drx/images/icons/proxzarIcon.png" alt="" className="w-3.5 h-3.5 object-contain" /> Sign in to access your portal</>
                    )}
                  </button>
                </form>
              )}

              {/* Email OTP — mobile only (inside left column) */}
              {signInMethod === "emailOtp" && (
                <div className="space-y-3 lg:hidden">
                  {!emailOtpSent ? (
                    <form onSubmit={(e) => { e.preventDefault(); handleSendEmailOtp(); }} className="space-y-3">
                      <p className="text-[11px] text-gray-600">Enter your email to receive a one-time password.</p>
                      <div className="relative">
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                        <input type="email" value={otpEmail} onChange={(e) => setOtpEmail(e.target.value)}
                          placeholder="Enter your email address" className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-200" />
                      </div>
                      <button type="submit" disabled={emailSending}
                        className="w-full bg-[#5b2bce] hover:bg-[#4318d1] text-white py-2.5 rounded-xl font-semibold text-xs transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                        {emailSending ? (
                          <><svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg> Sending...</>
                        ) : "Send OTP"}
                      </button>
                    </form>
                  ) : (
                    <form onSubmit={(e) => { e.preventDefault(); handleVerifyEmailOtp(); }} className="space-y-3">
                      <div className="bg-green-50 border border-green-200 rounded-xl px-3 py-2 text-[11px] text-green-700 font-medium">
                        OTP sent to {otpEmail}
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-gray-700 mb-1">Enter OTP</label>
                        <input type="text" value={emailOtpCode} onChange={(e) => setEmailOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                          placeholder="Enter 6-digit OTP" maxLength={6}
                          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-200 tracking-widest text-center font-mono" />
                      </div>
                      {emailCountdown > 0 && (
                        <p className="text-[10px] text-gray-500 text-center">Expires in <span className="font-semibold text-[#5b2bce]">{formatTime(emailCountdown)}</span></p>
                      )}
                      <button type="submit" disabled={emailVerifying}
                        className="w-full bg-[#5b2bce] hover:bg-[#4318d1] text-white py-2.5 rounded-xl font-semibold text-xs transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                        {emailVerifying ? (
                          <><svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg> Verifying...</>
                        ) : "Verify & Sign in"}
                      </button>
                      {emailCountdown === 0 && (
                        <button type="button" onClick={handleResendEmailOtp} disabled={emailSending}
                          className="w-full border-2 border-[#5b2bce] text-[#5b2bce] hover:bg-purple-50 py-2 rounded-xl font-semibold text-xs transition-all disabled:opacity-60">
                          {emailSending ? "Sending..." : "Resend OTP"}
                        </button>
                      )}
                    </form>
                  )}
                </div>
              )}

              {/* Phone OTP — mobile only (Coming Soon) */}
              {signInMethod === "phoneOtp" && (
                <div className="space-y-3 lg:hidden">
                  <div className="relative">
                    <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] rounded-xl z-10 flex items-center justify-center">
                      <span className="bg-gray-800 text-white text-[10px] font-bold px-3 py-1 rounded-full">Coming Soon</span>
                    </div>
                    <div className="opacity-50 pointer-events-none space-y-3">
                      <p className="text-[11px] text-gray-600">Enter your phone number to receive a one-time password.</p>
                      <div className="flex gap-1.5">
                        <div className="flex items-center gap-0.5 px-2 py-2 border border-gray-200 rounded-xl text-[10px] text-gray-600 bg-gray-50 flex-shrink-0">🇮🇳 +91</div>
                        <input type="tel" disabled placeholder="Enter mobile number" className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-xs outline-none bg-gray-50" />
                      </div>
                      <button type="button" disabled className="w-full bg-gray-300 text-white py-2.5 rounded-xl font-semibold text-xs">Send OTP</button>
                    </div>
                  </div>
                </div>
              )}

              {/* Sign up link */}
              <div className="mt-3 pt-3 border-t border-gray-100 text-center">
                <p className="text-[10px] sm:text-[11px] text-gray-500">New to Proxzar&apos;s DRX platform? <a href="https://drx.proxzar.ai/dobo/qr-register" target="_blank" rel="noopener noreferrer" className="text-[#5b2bce] font-semibold hover:underline">Sign up</a></p>
              </div>
            </div>

            {/* Right column — Email OTP (desktop only, shown when emailOtp selected) */}
            {signInMethod === "emailOtp" && (
              <div className="flex-1 border border-gray-200 rounded-2xl p-4 hidden lg:flex flex-col items-center justify-center text-center">
                <div className="w-10 h-10 bg-purple-50 rounded-full flex items-center justify-center mx-auto mb-2">
                  <svg className="w-5 h-5 text-[#5b2bce]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                </div>

                {!emailOtpSent ? (
                  <form onSubmit={(e) => { e.preventDefault(); handleSendEmailOtp(); }} className="w-full">
                    <h4 className="text-xs font-bold text-gray-900 mb-0.5 text-center">Sign in with Email OTP</h4>
                    <p className="text-[10px] text-gray-500 mb-3 text-center">We&apos;ll send a one-time password to your email.</p>
                    <div className="relative w-full mb-2">
                      <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                      <input type="email" value={otpEmail} onChange={(e) => setOtpEmail(e.target.value)}
                        placeholder="Enter your email address" className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-200" />
                    </div>
                    <button type="submit" disabled={emailSending}
                      className="w-full bg-[#5b2bce] hover:bg-[#4318d1] text-white py-2 rounded-xl font-semibold text-xs transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                      {emailSending ? (
                        <><svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg> Sending...</>
                      ) : "Send OTP"}
                    </button>
                  </form>
                ) : (
                  <form onSubmit={(e) => { e.preventDefault(); handleVerifyEmailOtp(); }} className="w-full">
                    <h4 className="text-xs font-bold text-gray-900 mb-0.5 text-center">Verify OTP</h4>
                    <div className="bg-green-50 border border-green-200 rounded-xl px-3 py-1.5 text-[10px] text-green-700 font-medium mb-2 w-full">
                      OTP sent to {otpEmail}
                    </div>
                    <div className="w-full mb-2">
                      <input type="text" value={emailOtpCode} onChange={(e) => setEmailOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        placeholder="Enter 6-digit OTP" maxLength={6}
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-200 tracking-widest text-center font-mono" />
                    </div>
                    {emailCountdown > 0 && (
                      <p className="text-[10px] text-gray-500 mb-2 text-center">Expires in <span className="font-semibold text-[#5b2bce]">{formatTime(emailCountdown)}</span></p>
                    )}
                    <button type="submit" disabled={emailVerifying}
                      className="w-full bg-[#5b2bce] hover:bg-[#4318d1] text-white py-2 rounded-xl font-semibold text-xs transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                      {emailVerifying ? (
                        <><svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg> Verifying...</>
                      ) : "Verify & Sign in"}
                    </button>
                    {emailCountdown === 0 && (
                      <button type="button" onClick={handleResendEmailOtp} disabled={emailSending}
                        className="w-full border-2 border-[#5b2bce] text-[#5b2bce] hover:bg-purple-50 py-2 rounded-xl font-semibold text-xs transition-all mt-2 disabled:opacity-60">
                        {emailSending ? "Sending..." : "Resend OTP"}
                      </button>
                    )}
                  </form>
                )}
              </div>
            )}

            {/* Right column — Phone OTP (desktop only, Coming Soon) */}
            {signInMethod === "phoneOtp" && (
              <div className="flex-1 border border-gray-200 rounded-2xl p-4 hidden lg:flex flex-col items-center justify-center text-center relative">
                <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] rounded-2xl z-10 flex items-center justify-center">
                  <span className="bg-gray-800 text-white text-[10px] font-bold px-3 py-1 rounded-full">Coming Soon</span>
                </div>
                <div className="opacity-50 pointer-events-none">
                  <div className="w-10 h-10 bg-purple-50 rounded-full flex items-center justify-center mx-auto mb-2">
                    <svg className="w-5 h-5 text-[#5b2bce]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                  </div>
                  <h4 className="text-xs font-bold text-gray-900 mb-0.5">Sign in with Phone OTP</h4>
                  <p className="text-[10px] text-gray-500 mb-3">We&apos;ll send a one-time password to your mobile.</p>
                  <div className="flex gap-1.5 w-full mb-2">
                    <div className="flex items-center gap-0.5 px-2 py-2 border border-gray-200 rounded-xl text-[10px] text-gray-600 bg-gray-50 flex-shrink-0">🇮🇳 +91</div>
                    <input type="tel" disabled placeholder="Enter mobile number"
                      className="flex-1 px-2 py-2 border border-gray-200 rounded-xl text-xs outline-none bg-gray-50" />
                  </div>
                  <button type="button" disabled className="w-full bg-gray-300 text-white py-2 rounded-xl font-semibold text-xs">Send OTP</button>
                </div>
              </div>
            )}
          </div>

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
