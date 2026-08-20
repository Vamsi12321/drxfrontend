"use client";
import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { get, post as apiPost } from "@/lib/api";

const QUICK_LOCATIONS = ["Apollo Hospital Hyderabad", "AIG Hospital", "KIMS Vizag", "Fortis Hospital", "AIIMS Delhi"];

// Username auto-gen: strip "Dr." → lowercase → spaces to _ → remove special → append _random3
function generateUsername(name) {
  const base = (name || "doctor").replace(/^dr\.?\s*/i, "").toLowerCase().replace(/[^a-z0-9]/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "").slice(0, 20);
  return `${base || "doctor"}_${Math.floor(100 + Math.random() * 900)}`;
}

export default function RegisterDoctorModal({ onClose, onSuccess }) {
  // Form state
  const [form, setForm] = useState({
    name: "", email: "", phone: "", hospital: "", specialization: "",
    qualification: "", license_number: "", username: "", password: "", confirmPassword: "",
    location: { latitude: "", longitude: "", address: "", city: "", state: "", country: "India" },
  });
  const [showPw, setShowPw] = useState(false);
  const [locTab, setLocTab] = useState("search"); // "gps" | "search" | "manual"
  const [locSearch, setLocSearch] = useState("");
  const [locResults, setLocResults] = useState([]);
  const [locSearching, setLocSearching] = useState(false);
  const [step, setStep] = useState(""); // "" | "registering" | "creating"
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(null);
  const [specSearch, setSpecSearch] = useState("");

  // Fetch specializations
  const { data: specData } = useQuery({
    queryKey: ["specializations"],
    queryFn: () => get("/api/v1/doctors/specializations"),
    staleTime: 10 * 60 * 1000,
  });
  const specializations = specData?.specializations || (Array.isArray(specData) ? specData : []);
  const filteredSpecs = specSearch ? specializations.filter((s) => s.toLowerCase().includes(specSearch.toLowerCase())) : specializations;

  // Auto-gen username + password on name change
  const handleNameChange = (name) => {
    const uname = generateUsername(name);
    setForm((p) => ({ ...p, name, username: uname, password: `${uname}@123` }));
  };

  const regenerate = () => {
    const uname = generateUsername(form.name);
    setForm((p) => ({ ...p, username: uname, password: `${uname}@123` }));
  };

  // Location: GPS
  const handleGPS = () => {
    if (!navigator.geolocation) { setError("Geolocation not supported"); return; }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`);
          const data = await res.json();
          const addr = data.address || {};
          setForm((p) => ({ ...p, location: {
            latitude: String(latitude), longitude: String(longitude),
            address: data.display_name || "", city: addr.city || addr.town || addr.village || "",
            state: addr.state || "", country: addr.country || "India",
          }}));
          setLocTab("search");
        } catch { setForm((p) => ({ ...p, location: { ...p.location, latitude: String(latitude), longitude: String(longitude) } })); }
      },
      () => setError("Location permission denied")
    );
  };

  // Location: Search
  const handleLocSearch = async (q) => {
    setLocSearch(q);
    if (q.length < 3) { setLocResults([]); return; }
    setLocSearching(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=5&addressdetails=1`);
      const data = await res.json();
      setLocResults(data || []);
    } catch { setLocResults([]); }
    setLocSearching(false);
  };

  const selectLocation = (item) => {
    const addr = item.address || {};
    setForm((p) => ({ ...p, location: {
      latitude: item.lat, longitude: item.lon,
      address: item.display_name || "",
      city: addr.city || addr.town || addr.village || addr.county || "",
      state: addr.state || "", country: addr.country || "India",
    }}));
    setLocResults([]);
    setLocSearch(item.display_name || "");
  };

  // Validation
  const validate = () => {
    if (!form.name || form.name.length < 2) return "Name is required (min 2 chars)";
    if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return "Valid email required";
    if (!form.phone || !/^[6-9]\d{9}$/.test(form.phone)) return "Valid 10-digit phone starting with 6-9";
    if (!form.username || !/^[a-z0-9_]{3,30}$/.test(form.username)) return "Username: 3-30 chars, lowercase + numbers + underscore";
    const pw = form.password;
    if (pw.length < 8 || !/[A-Z]/.test(pw) || !/[a-z]/.test(pw) || !/[0-9]/.test(pw) || !/[!@#$%^&*]/.test(pw)) return "Password: 8+ chars, 1 upper, 1 lower, 1 number, 1 symbol";
    if (form.password !== form.confirmPassword) return "Passwords do not match";
    return null;
  };

  // Submit
  const handleSubmit = async () => {
    setError("");
    const err = validate();
    if (err) { setError(err); return; }

    // Step 1: Proxzar addUser
    setStep("registering");
    try {
      const regRes = await fetch("/drx/api/v1/proxzar-register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          UserName: form.username,
          UserPassword: form.password,
          UserFullName: form.name,
          UserEmail: form.email,
          UserPhone: form.phone ? `+91${form.phone}` : "",
          DataSource: "DRX",
        }),
      });
      const regData = await regRes.json();
      if (!regRes.ok) {
        setError(regData?.detail?.[0]?.msg || regData?.detail || regData?.message || "Proxzar registration failed");
        setStep("");
        return;
      }
    } catch (e) {
      setError("Proxzar registration failed: " + (e.message || "Network error"));
      setStep("");
      return;
    }

    // Step 2: DRX backend
    setStep("creating");
    try {
      const body = {
        name: form.name, username: form.username, email: form.email,
        phone: form.phone, password: form.password,
        specialization: form.specialization || undefined,
        hospital: form.hospital || undefined,
        qualification: form.qualification || undefined,
        license_number: form.license_number || undefined,
      };
      if (form.location.latitude && form.location.longitude) {
        body.location = form.location;
      }
      const res = await apiPost("/api/v1/doctors", body);
      setSuccess(res);
      setStep("");
      if (onSuccess) onSuccess();
    } catch (e) {
      setError(e.message || "Failed to create doctor on DRX");
      setStep("");
    }
  };

  // Success screen
  if (success) {
    return (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-1">Doctor Registered!</h3>
          <p className="text-sm text-gray-500 mb-4">Account created successfully</p>
          <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm text-left mb-5">
            {success.doctor_id && <div className="flex justify-between"><span className="text-gray-500">Doctor ID:</span><span className="font-mono text-gray-800 text-xs">{success.doctor_id}</span></div>}
            {success.doctor_gid && <div className="flex justify-between"><span className="text-gray-500">Doctor GID:</span><span className="font-mono text-gray-800 text-xs">{success.doctor_gid}</span></div>}
            <div className="flex justify-between"><span className="text-gray-500">Username:</span><span className="font-mono text-gray-800">{form.username}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Password:</span><span className="font-mono text-gray-800">{form.password}</span></div>
          </div>
          <button onClick={onClose} className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-xl text-sm font-bold">Done</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div>
            <h3 className="text-lg font-bold" style={{ color: "#3b3a8a" }}>Register New Doctor</h3>
            <p className="text-xs text-gray-400 mt-0.5">Create account on Proxzar + DRX</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 rounded-xl text-sm">{error}</div>}
          {step && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3 flex items-center gap-2">
              <svg className="w-4 h-4 animate-spin text-indigo-600" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
              <span className="text-sm text-indigo-700 font-medium">{step === "registering" ? "Step 1/2: Creating Proxzar account..." : "Step 2/2: Registering on DRX..."}</span>
            </div>
          )}

          {/* ── Personal Details ── */}
          <div>
            <p className="text-[10px] font-bold text-purple-600 uppercase tracking-widest mb-3">Personal Details</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-700 mb-1">Full Name *</label>
                <input type="text" value={form.name} onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="Dr. Arjun Mehta" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-100" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Email *</label>
                <input type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  placeholder="arjun@hospital.com" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-100" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Phone *</label>
                <input type="tel" value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value.replace(/\D/g, "").slice(0, 10) }))}
                  placeholder="9876543210" maxLength={10} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-100" />
              </div>
            </div>
          </div>

          {/* ── Professional Details ── */}
          <div>
            <p className="text-[10px] font-bold text-purple-600 uppercase tracking-widest mb-3">Professional Details</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Hospital</label>
                <input type="text" value={form.hospital} onChange={(e) => setForm((p) => ({ ...p, hospital: e.target.value }))}
                  placeholder="Apollo Hospital" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-100" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Specialization</label>
                <div className="relative">
                  <input type="text" value={form.specialization || specSearch}
                    onChange={(e) => { setSpecSearch(e.target.value); setForm((p) => ({ ...p, specialization: "" })); }}
                    onFocus={() => setSpecSearch(form.specialization || "")}
                    placeholder="Search specialization..." className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-100" />
                  {specSearch && !form.specialization && filteredSpecs.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-20 max-h-40 overflow-y-auto">
                      {filteredSpecs.map((s) => (
                        <button key={s} onClick={() => { setForm((p) => ({ ...p, specialization: s })); setSpecSearch(""); }}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-purple-50 text-gray-700">{s}</button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Qualification</label>
                <input type="text" value={form.qualification} onChange={(e) => setForm((p) => ({ ...p, qualification: e.target.value }))}
                  placeholder="MBBS, MD" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-100" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">License Number</label>
                <input type="text" value={form.license_number} onChange={(e) => setForm((p) => ({ ...p, license_number: e.target.value }))}
                  placeholder="MH12345" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-100" />
              </div>
            </div>
          </div>

          {/* ── Account Credentials ── */}
          <div>
            <p className="text-[10px] font-bold text-purple-600 uppercase tracking-widest mb-3">Account Credentials</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-700 mb-1">Username *</label>
                <div className="flex gap-1.5">
                  <input type="text" value={form.username}
                    onChange={(e) => setForm((p) => ({ ...p, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "") }))}
                    className="flex-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-100 font-mono" />
                  <button type="button" onClick={regenerate}
                    className="px-3 py-2 border border-gray-200 rounded-xl text-xs text-purple-600 hover:bg-purple-50 font-semibold" title="Regenerate">↻</button>
                </div>
                <p className="text-[10px] text-gray-400 mt-1">3-30 chars, lowercase, numbers, underscores</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Password *</label>
                <div className="relative">
                  <input type={showPw ? "text" : "password"} value={form.password}
                    onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                    className="w-full px-3 py-2.5 pr-12 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-100" />
                  <button type="button" onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs font-medium">
                    {showPw ? "Hide" : "Show"}
                  </button>
                </div>
                <p className="text-[10px] text-gray-400 mt-1">8+ chars, 1 upper, 1 lower, 1 number, 1 symbol</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Confirm Password *</label>
                <input type="password" value={form.confirmPassword}
                  onChange={(e) => setForm((p) => ({ ...p, confirmPassword: e.target.value }))}
                  className={`w-full px-3 py-2.5 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-100 ${form.confirmPassword && form.confirmPassword !== form.password ? "border-red-300" : "border-gray-200"}`} />
                {form.confirmPassword && form.confirmPassword !== form.password && <p className="text-[10px] text-red-500 mt-1">Passwords don't match</p>}
              </div>
            </div>
          </div>

          {/* ── Practice Location ── */}
          <div>
            <p className="text-[10px] font-bold text-purple-600 uppercase tracking-widest mb-3">Practice Location</p>
            {/* Tabs */}
            <div className="flex gap-2 mb-3">
              {[
                { id: "gps", label: "Use Current Location", icon: "📍" },
                { id: "search", label: "Search Location", icon: "🔍" },
                { id: "manual", label: "Enter Manually", icon: "✏️" },
              ].map((t) => (
                <button key={t.id} onClick={() => { setLocTab(t.id); if (t.id === "gps") handleGPS(); }}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${locTab === t.id ? "bg-purple-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                  <span>{t.icon}</span> {t.label}
                </button>
              ))}
            </div>

            {/* Search tab */}
            {locTab === "search" && (
              <div className="space-y-2">
                <input type="text" value={locSearch} onChange={(e) => handleLocSearch(e.target.value)}
                  placeholder="Search hospital, clinic, or address..."
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-100" />
                {/* Quick suggestions */}
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_LOCATIONS.map((q) => (
                    <button key={q} onClick={() => handleLocSearch(q)}
                      className="px-2.5 py-1 bg-gray-100 hover:bg-purple-50 text-xs text-gray-600 hover:text-purple-600 rounded-lg transition-colors">{q}</button>
                  ))}
                </div>
                {locSearching && <p className="text-xs text-gray-400">Searching...</p>}
                {locResults.length > 0 && (
                  <div className="border border-gray-200 rounded-xl max-h-40 overflow-y-auto divide-y divide-gray-50">
                    {locResults.map((item, idx) => (
                      <button key={idx} onClick={() => selectLocation(item)}
                        className="w-full px-3 py-2.5 text-left hover:bg-purple-50 transition-colors">
                        <p className="text-sm text-gray-800 line-clamp-1">{item.display_name}</p>
                        <p className="text-[10px] text-gray-400">{item.type} · {item.lat}, {item.lon}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Manual tab */}
            {locTab === "manual" && (
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <input type="text" value={form.location.address} onChange={(e) => setForm((p) => ({ ...p, location: { ...p.location, address: e.target.value } }))}
                    placeholder="Full address" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-100" />
                </div>
                <input type="text" value={form.location.city} onChange={(e) => setForm((p) => ({ ...p, location: { ...p.location, city: e.target.value } }))}
                  placeholder="City" className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-100" />
                <input type="text" value={form.location.state} onChange={(e) => setForm((p) => ({ ...p, location: { ...p.location, state: e.target.value } }))}
                  placeholder="State" className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-100" />
                <input type="text" value={form.location.country} onChange={(e) => setForm((p) => ({ ...p, location: { ...p.location, country: e.target.value } }))}
                  placeholder="Country" className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-100" />
                <input type="text" value={form.location.latitude} onChange={(e) => setForm((p) => ({ ...p, location: { ...p.location, latitude: e.target.value } }))}
                  placeholder="Latitude" className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-100" />
              </div>
            )}

            {/* Show selected location */}
            {form.location.address && (
              <div className="mt-3 bg-green-50 border border-green-100 rounded-xl px-3 py-2.5">
                <p className="text-xs text-green-700 font-medium line-clamp-2">📍 {form.location.address}</p>
                {form.location.city && <p className="text-[10px] text-green-600 mt-0.5">{[form.location.city, form.location.state, form.location.country].filter(Boolean).join(", ")}</p>}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex gap-3 flex-shrink-0">
          <button onClick={onClose} className="flex-1 border border-gray-200 text-gray-700 py-3 rounded-xl text-sm font-semibold hover:bg-gray-50">Cancel</button>
          <button onClick={handleSubmit} disabled={!!step}
            className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-xl text-sm font-bold disabled:opacity-60 flex items-center justify-center gap-2">
            {step ? (
              <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg> Processing...</>
            ) : "Complete Registration"}
          </button>
        </div>
      </div>
    </div>
  );
}
