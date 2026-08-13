"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { HiOutlineMail, HiOutlineLockClosed, HiOutlineEye, HiOutlineEyeOff, HiArrowRight } from "react-icons/hi";
import { MdOutlineSearch, MdOutlineEvent, MdOutlinePeople, MdOutlineInsights } from "react-icons/md";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [loggedInUser, setLoggedInUser] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    if (!email || !password) { setError("Please enter both email and password"); return; }
    setIsLoggingIn(true);
    try {
      const res = await fetch("/drx/api/v1/auth/doctor/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        const raw = data.detail || data.message || "Invalid credentials.";
        const msg = Array.isArray(raw) ? raw.map((d) => (typeof d === "string" ? d : d.msg || JSON.stringify(d))).join(", ") : String(raw);
        setError(msg);
        setIsLoggingIn(false);
        return;
      }

      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("token_type", data.token_type);
      let expiry;
      try {
        const payload = JSON.parse(atob(data.access_token.split(".")[1]));
        expiry = payload.exp ? payload.exp * 1000 : Date.now() + 3600 * 1000;
      } catch { expiry = Date.now() + 3600 * 1000; }
      localStorage.setItem("token_expiry", expiry);
      localStorage.setItem("userEmail", data.user?.email || email);
      localStorage.setItem("userName", data.user?.name || "Doctor");
      localStorage.setItem("userId", data.user?.id || "");
      localStorage.setItem("doctorGid", data.user?.doctor_gid || "");
      localStorage.setItem("apiRole", data.role || "DOCTOR");
      localStorage.setItem("userRole", "doctor");
      localStorage.setItem("companyName", "");

      document.cookie = `access_token=${data.access_token}; path=/; max-age=3600; SameSite=Lax`;
      document.cookie = `userRole=doctor; path=/; max-age=3600; SameSite=Lax`;

      setLoggedInUser(data.user?.name || "Doctor");
      setLoginSuccess(true);
      setIsLoggingIn(false);

      setTimeout(() => router.push("/doctor/select-org"), 1800);
    } catch {
      setError("Unable to connect to server. Please try again.");
      setIsLoggingIn(false);
    }
  };

  if (loginSuccess) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-[#4318d1] via-[#5b2bce] to-[#7c3aed] z-50 flex items-center justify-center">
        <div className="text-center px-4">
          <div className="w-16 h-16 border-4 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-white mb-2">Loading your organizations...</h2>
          <p className="text-indigo-200 text-sm">Setting up your workspace, Dr. {loggedInUser}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* ═══ Left Panel — Purple gradient with illustration ═══ */}
      <div className="hidden lg:flex lg:w-[48%] bg-gradient-to-br from-[#4318d1] via-[#5b2bce] to-[#7c3aed] flex-col justify-between p-10 relative overflow-hidden">
        {/* Background decorations */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 right-10 w-60 h-60 bg-white/5 rounded-full" />
          <div className="absolute bottom-40 left-10 w-40 h-40 bg-white/5 rounded-full" />
          <div className="absolute top-1/2 right-1/3 w-32 h-32 bg-white/3 rounded-full" />
        </div>

        {/* Logo */}
        <div className="relative z-10">
          <h1 className="text-5xl font-extrabold tracking-tighter" style={{ fontFamily: "'Arial Black', 'Helvetica Neue', sans-serif" }}>
            <span className="text-white">D</span><span className="text-white">R</span><span style={{ background: "linear-gradient(180deg, #38bdf8 0%, #06b6d4 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>X</span>
          </h1>
          <p className="text-indigo-200 text-xs font-semibold tracking-widest uppercase mt-1">AI Platform</p>
        </div>

        {/* Tagline + features */}
        <div className="relative z-10 flex-1 flex flex-col justify-center">
          <h2 className="text-3xl font-bold text-white leading-tight mb-2">
            One Platform to<br />Access All Orgs
          </h2>
          <div className="w-10 h-1 bg-white/40 rounded-full mb-4" />
          <p className="text-indigo-200 text-sm leading-relaxed mb-8 max-w-[280px]">
            Discover medicines, attend CME events, connect with peers, and access all your organizations — one platform, endless possibilities.
          </p>

          {/* Feature list */}
          <div className="space-y-3">
            {[
              { icon: <MdOutlineSearch className="w-5 h-5" />, title: "Smart Drug Discovery", desc: "AI search across thousands of medicines" },
              { icon: <MdOutlineEvent className="w-5 h-5" />, title: "CME & Events", desc: "Stay updated with medical conferences & webinars" },
              { icon: <MdOutlinePeople className="w-5 h-5" />, title: "Doctor Network", desc: "Connect & collaborate with verified doctors" },
              { icon: <MdOutlineInsights className="w-5 h-5" />, title: "Clinical Insights", desc: "AI-powered insights for better decisions" },
            ].map((f, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <div className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center text-white flex-shrink-0">
                  {f.icon}
                </div>
                <div>
                  <p className="text-white text-xs font-bold">{f.title}</p>
                  <p className="text-indigo-200 text-[10px]">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Doctor illustration — centered vertically */}
        <div className="absolute inset-0 flex items-center justify-end pointer-events-none pr-4">
          <img src="/drx/images/doctors/dr_login.png" alt="" className="h-[75%] object-contain" />
        </div>
      </div>

      {/* ═══ Right Panel — Login form ═══ */}
      <div className="w-full lg:w-[52%] flex items-center justify-center p-6 sm:p-8 xl:p-12 bg-white overflow-y-auto max-h-screen">
        <div className="w-full max-w-[400px]">
          {/* Language selector top right */}
          <div className="flex justify-end mb-8">
            <div className="flex items-center gap-1.5 text-xs text-gray-500 border border-gray-200 rounded-full px-3 py-1.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" strokeWidth="1.5"/><path strokeWidth="1.5" d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>
              EN
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </div>
          </div>

          {/* Heading */}
          <h2 className="text-2xl font-bold text-gray-900 mb-1">Welcome back, Doctor</h2>
          <p className="text-gray-500 text-sm mb-7">Sign in to access your DRX account</p>

          {/* Error */}
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-3 py-2.5 rounded-xl text-xs font-medium flex items-center gap-2">
              <span>⚠️</span> {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Email address</label>
              <div className="relative">
                <HiOutlineMail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter username / Doctor ID"
                  autoComplete="email"
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 text-sm bg-white transition-all outline-none"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-gray-700">Password</label>
                <a href="/forgot-password" className="text-xs text-[#5b2bce] hover:text-[#4318d1] font-semibold">Forgot password?</a>
              </div>
              <div className="relative">
                <HiOutlineLockClosed className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  className="w-full pl-10 pr-12 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 text-sm bg-white transition-all outline-none"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                  {showPassword ? <HiOutlineEyeOff className="w-4 h-4" /> : <HiOutlineEye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember me */}
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-[#5b2bce] focus:ring-[#5b2bce]" />
              <span className="text-xs text-gray-600">Remember me</span>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full bg-[#5b2bce] hover:bg-[#4318d1] text-white py-3.5 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
            >
              {isLoggingIn ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Signing in...
                </>
              ) : (
                <>
                  Sign in
                  <HiArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="my-6" />

          {/* Footer */}
          <p className="text-center text-xs text-gray-500">
            New to DRX? <a href="#" className="text-[#5b2bce] font-semibold hover:underline">Contact your organization admin</a>
          </p>
        </div>
      </div>
    </div>
  );
}
