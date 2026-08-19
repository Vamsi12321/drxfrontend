"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Login() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);

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

      // Store token
      const token = data.accessToken || data.access_token;
      localStorage.setItem("access_token", token);
      localStorage.setItem("token_type", data.tokenType || "bearer");
      localStorage.setItem("userRole", "doctor");
      localStorage.setItem("userName", username);

      // Set cookies for middleware
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
      <div className="w-full lg:w-[52%] flex items-center justify-center p-6 sm:p-8 xl:p-12 bg-white overflow-y-auto max-h-screen">
        <div className="w-full max-w-[400px]">
          {/* Logo for mobile */}
          <div className="lg:hidden flex items-center justify-center mb-8">
            <div className="w-10 h-10 bg-[#5b2bce] rounded-lg flex items-center justify-center">
              <span className="text-white font-black text-sm">DRX</span>
            </div>
          </div>

          {/* Heading */}
          <h2 className="text-2xl font-bold text-gray-900 mb-1">Welcome back, Doctor</h2>
          <p className="text-gray-500 text-sm mb-7">Sign in with your Proxzar account</p>

          {/* Error */}
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-3 py-2.5 rounded-xl text-xs font-medium flex items-center gap-2">
              <span>⚠️</span> {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Username */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Username or Email</label>
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username or email"
                  autoComplete="username"
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 text-sm bg-white transition-all outline-none"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Password</label>
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  className="w-full pl-10 pr-12 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 text-sm bg-white transition-all outline-none"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs font-medium">
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#5b2bce] hover:bg-[#4318d1] text-white py-3.5 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
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
