"use client";
import { useState } from "react";

export default function AdminLoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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

      const res = await fetch("/drx/api/v1/proxzar-token", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        const msg = data?.detail?.[0]?.msg || data?.detail || "Login failed. Please check credentials.";
        setError(typeof msg === "string" ? msg : JSON.stringify(msg));
        setLoading(false);
        return;
      }

      const token = data.accessToken || data.access_token;
      localStorage.setItem("access_token", token);
      localStorage.setItem("drx_admin_token", token);
      localStorage.setItem("drx_admin_name", username);
      localStorage.setItem("userRole", "PLATFORM_ADMIN");
      document.cookie = `access_token=${token}; path=/; max-age=3600; SameSite=Lax`;
      document.cookie = `userRole=PLATFORM_ADMIN; path=/; max-age=3600; SameSite=Lax`;
      window.location.href = "/drx/admin/dashboard";
    } catch {
      setError("Unable to connect to server. Please try again.");
      setLoading(false);
    }
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

      {/* Right panel — Proxzar login form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-white overflow-y-auto">
        <div className="w-full max-w-[400px]">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center mx-auto mb-3">
              <span className="text-white font-bold text-lg">DRX</span>
            </div>
            <h1 className="text-xl font-bold" style={{ color: "#3b3a8a" }}>Admin Portal</h1>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-1">Welcome back</h2>
            <p className="text-gray-500 text-sm">Sign in with your Proxzar account</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm mb-5 flex items-center gap-2">
              <span>⚠️</span> {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Username or Email</label>
              <div className="relative">
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                <input type="text" value={username} onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username or email" autoComplete="username"
                  className="w-full pl-12 pr-4 py-3.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-100 focus:border-purple-400 text-sm bg-gray-50 transition-all outline-none" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Password</label>
              <div className="relative">
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                <input type={showPw ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password" autoComplete="current-password"
                  className="w-full pl-12 pr-12 py-3.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-100 focus:border-purple-400 text-sm bg-gray-50 transition-all outline-none" />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs font-medium">
                  {showPw ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl font-semibold text-sm transition-all disabled:opacity-60 flex items-center justify-center gap-2 shadow-lg shadow-purple-200">
              {loading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>
                  Signing in...
                </>
              ) : (
                <>
                  <img src="/drx/images/icons/proxzaricon.png" alt="" className="w-4 h-4 object-contain" />
                  Sign in with Proxzar
                </>
              )}
            </button>
          </form>

          <div className="mt-6 flex items-center justify-center gap-1 text-xs text-gray-400">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
            Secured by Proxzar Authentication
          </div>
        </div>
      </div>
    </div>
  );
}
