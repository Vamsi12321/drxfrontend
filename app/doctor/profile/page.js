"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { get, put, post as apiPost } from "@/lib/api";
import ChangePasswordSection from "@/components/ChangePasswordSection";

export default function DoctorProfile() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const { data: profile, isLoading } = useQuery({
    queryKey: ["my-profile"],
    queryFn: () => get("/api/v1/profile/me"),
    staleTime: 60000,
  });

  const { data: orgData } = useQuery({
    queryKey: ["my-organizations"],
    queryFn: () => get("/api/v1/my-organizations"),
    staleTime: 300000,
  });

  const { data: specializationsData } = useQuery({
    queryKey: ["specializations"],
    queryFn: () => get("/api/v1/doctors/specializations"),
    staleTime: 10 * 60 * 1000,
  });
  const specializations = specializationsData?.specializations || (Array.isArray(specializationsData) ? specializationsData : []);

  // Pending org requests
  const { data: requestsData } = useQuery({
    queryKey: ["doctor-pending-requests"],
    queryFn: () => get("/api/v1/doctor-requests/pending"),
    staleTime: 60000,
  });
  const pendingRequests = requestsData?.requests || [];

  const acceptMutation = useMutation({
    mutationFn: (requestId) => apiPost(`/api/v1/doctor-requests/${requestId}/accept`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["doctor-pending-requests"] });
      setSuccess("Request accepted! Awaiting admin approval.");
      setTimeout(() => setSuccess(""), 3000);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (requestId) => apiPost(`/api/v1/doctor-requests/${requestId}/reject`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["doctor-pending-requests"] });
      setSuccess("Request rejected.");
      setTimeout(() => setSuccess(""), 3000);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data) => {
      const allowed = ["name", "phone", "specialization", "hospital", "license_number",
        "experience_years", "qualification", "bio", "avatar_url", "location", "city", "state", "country"];
      const clean = {};
      allowed.forEach((key) => {
        if (data[key] !== "" && data[key] !== undefined && data[key] !== null)
          clean[key] = data[key];
      });
      if (clean.experience_years !== undefined) clean.experience_years = parseFloat(clean.experience_years);
      return put("/api/v1/profile/me", clean);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-profile"] });
      setEditing(false);
      setSuccess("Profile updated successfully");
      setTimeout(() => setSuccess(""), 3000);
    },
    onError: (err) => setError(err.message || "Failed to update profile"),
  });

  const startEdit = () => {
    setForm({
      name: profile?.name || "", phone: profile?.phone || "",
      bio: profile?.bio || "", location: profile?.location || "",
      city: profile?.city || "", state: profile?.state || "",
      country: profile?.country || "India",
      experience_years: profile?.experience_years || "",
      qualification: profile?.qualification || "",
      specialization: profile?.specialization || "",
      hospital: profile?.hospital || "",
      license_number: profile?.license_number || "",
      avatar_url: profile?.avatar_url || "",
    });
    setError("");
    setEditing(true);
  };

  const displayName = profile?.name || "";
  const initials = displayName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() || "DR";
  const location = profile?.location || [profile?.city, profile?.state, profile?.country].filter(Boolean).join(", ");

  if (isLoading) return (
    <div className="space-y-4 animate-pulse px-3 sm:px-0">
      <div className="h-48 bg-gray-100 rounded-2xl" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[1,2,3,4].map((i) => <div key={i} className="h-20 bg-gray-100 rounded-2xl" />)}
      </div>
      <div className="h-48 bg-gray-100 rounded-2xl" />
    </div>
  );

  return (
    <div className="space-y-5 max-w-5xl px-3 sm:px-0">
      {/* Success Toast */}
      {success && (
        <div className="fixed top-5 right-5 z-50 bg-green-600 text-white px-4 py-3 rounded-xl shadow-xl font-semibold text-sm flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          {success}
        </div>
      )}

      {/* ── Hero Card ── */}
      <div className="rounded-2xl overflow-hidden shadow-sm border border-gray-100">
        {/* Banner */}
        <div className="h-28 w-full" style={{ background: "linear-gradient(135deg, #4318d1 0%, #5b2bce 40%, #7c3aed 100%)" }} />

        {/* Profile row */}
        <div className="bg-white px-4 sm:px-6 pb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 -mt-12">
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="avatar"
                  className="w-24 h-24 rounded-2xl object-cover border-4 border-white shadow-lg" />
              ) : (
                <div className="w-24 h-24 rounded-2xl border-4 border-white shadow-lg bg-gradient-to-br from-indigo-600 to-purple-700 flex items-center justify-center text-white text-3xl font-black">
                  {initials}
                </div>
              )}
              <div className="absolute bottom-1 right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white" />
            </div>

            {/* Name + meta */}
            <div className="flex-1 min-w-0 pt-3 sm:pt-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-black text-gray-900">{displayName}</h1>
                {profile?.is_email_verified && (
                  <span className="text-[10px] bg-blue-50 text-blue-600 border border-blue-200 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                    Verified
                  </span>
                )}
              </div>
              <p className="text-[#5b2bce] font-semibold text-sm mt-0.5">{profile?.specialization || "Doctor"}</p>
              <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-gray-400">
                {profile?.hospital && (
                  <span className="flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                    {profile.hospital}
                  </span>
                )}
                {location && (
                  <span className="flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    {location}
                  </span>
                )}
                {profile?.doctor_gid && (
                  <span className="font-mono text-gray-300">{profile.doctor_gid}</span>
                )}
              </div>
            </div>

            {/* Edit button */}
            <button onClick={startEdit}
              className="flex-shrink-0 flex items-center gap-2 bg-[#5b2bce] hover:bg-[#4318d1] text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-sm">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
              Edit Profile
            </button>
          </div>

          {/* Bio */}
          {profile?.bio && (
            <p className="mt-4 text-sm text-gray-600 leading-relaxed max-w-2xl border-t border-gray-100 pt-4">{profile.bio}</p>
          )}
        </div>
      </div>

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Experience",    value: profile?.experience_years ? `${profile.experience_years}y` : "—",  icon: "🏥", color: "from-blue-500 to-indigo-600" },
          { label: "Organizations", value: orgData?.organizations?.length || 0,                                icon: "🏢", color: "from-purple-500 to-violet-600" },
          { label: "Qualification", value: profile?.qualification ? profile.qualification.split(",")[0] : "—", icon: "🎓", color: "from-emerald-500 to-teal-600" },
          { label: "License",       value: profile?.license_number || "—",                                     icon: "📋", color: "from-orange-500 to-amber-600" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center text-lg flex-shrink-0`}>
              {s.icon}
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-gray-400 font-medium">{s.label}</p>
              <p className="text-sm font-bold text-gray-800 truncate">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Info + Orgs ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Professional Info */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span className="w-1 h-4 bg-[#5b2bce] rounded-full inline-block" />
            Professional Information
          </h3>
          <div className="space-y-3">
            {[
              { icon: "📧", label: "Email",          value: profile?.email },
              { icon: "📱", label: "Phone",          value: profile?.phone },
              { icon: "🩺", label: "Specialization", value: profile?.specialization },
              { icon: "🏥", label: "Hospital",       value: profile?.hospital },
              { icon: "🎓", label: "Qualification",  value: profile?.qualification },
              { icon: "📋", label: "License No.",    value: profile?.license_number },
              { icon: "⏱️", label: "Experience",     value: profile?.experience_years ? `${profile.experience_years} years` : null },
              { icon: "📍", label: "Location",       value: location || null },
            ].filter((f) => f.value).map((f) => (
              <div key={f.label} className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0">
                <span className="text-base w-6 flex-shrink-0">{f.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">{f.label}</p>
                  <p className="text-sm font-semibold text-gray-800 truncate">{f.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right column */}
        <div className="lg:col-span-2 space-y-5">
          {/* Account Status */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-1 h-4 bg-emerald-500 rounded-full inline-block" />
              Account Status
            </h3>
            <div className="space-y-3">
              {[
                { label: "Email",      verified: true,                         value: profile?.email },
                { label: "Phone",      verified: true,                         value: profile?.phone },
                { label: "Account",    verified: profile?.is_active,          value: profile?.is_active ? "Active" : "Inactive" },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-gray-700">{item.label}</p>
                    <p className="text-[10px] text-gray-400 truncate max-w-[140px]">{item.value || "—"}</p>
                  </div>
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${item.verified ? "bg-green-50 text-green-600 border border-green-200" : "bg-gray-100 text-gray-400"}`}>
                    {item.verified ? "✓ Verified" : "Unverified"}
                  </span>
                </div>
              ))}
              {profile?.created_at && (
                <div className="pt-2 border-t border-gray-50">
                  <p className="text-[10px] text-gray-400">Member since {new Date(profile.created_at).toLocaleDateString("en-IN", { month: "long", year: "numeric" })}</p>
                </div>
              )}
            </div>
          </div>

          {/* Organizations */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-1 h-4 bg-purple-500 rounded-full inline-block" />
              Organizations
              <span className="ml-auto text-[10px] bg-purple-50 text-purple-600 border border-purple-100 px-2 py-0.5 rounded-full font-bold">
                {orgData?.organizations?.length || 0}
              </span>
            </h3>
            {orgData?.organizations?.length > 0 ? (
              <div className="space-y-2.5">
                {orgData.organizations.map((org) => (
                  <div key={org.organization_id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 transition-colors">
                    <div className="w-9 h-9 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-xl flex items-center justify-center text-purple-700 font-black text-sm flex-shrink-0">
                      {(org.organization_name || "O").charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-800 truncate">{org.organization_name}</p>
                      <p className="text-[10px] text-gray-400">{org.city || "Pharma"}</p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {org.has_mrx && <span className="text-[8px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded-full font-bold">MRX</span>}
                      <span className="text-[8px] bg-green-50 text-green-600 px-1.5 py-0.5 rounded-full font-bold">Active</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400 text-center py-4">No organizations linked yet</p>
            )}
          </div>

          {/* Pending Org Requests */}
          <div className="bg-white rounded-2xl border border-orange-100 shadow-sm p-5">
            <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-1 h-4 bg-orange-500 rounded-full inline-block" />
              Organization Requests
              {pendingRequests.length > 0 && (
                <span className="ml-auto text-[10px] bg-orange-50 text-orange-600 border border-orange-100 px-2 py-0.5 rounded-full font-bold">
                  {pendingRequests.length} pending
                </span>
              )}
            </h3>
            {pendingRequests.length > 0 ? (
              <div className="space-y-3">
                {pendingRequests.map((req) => (
                  <div key={req.id} className="border border-orange-100 rounded-xl p-3 bg-orange-50/30">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-sm font-semibold text-gray-800">{req.organization_name || "Unknown Org"}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">Requested by: {req.requested_by || "—"}</p>
                      </div>
                      <span className="px-1.5 py-0.5 rounded-full text-[8px] font-bold bg-orange-100 text-orange-600">PENDING</span>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <button onClick={() => acceptMutation.mutate(req.id)}
                        disabled={acceptMutation.isPending || rejectMutation.isPending}
                        className="flex-1 px-2 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-[10px] font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        Accept
                      </button>
                      <button onClick={() => { if (confirm("Reject this request?")) rejectMutation.mutate(req.id); }}
                        disabled={acceptMutation.isPending || rejectMutation.isPending}
                        className="flex-1 px-2 py-1.5 border border-red-200 text-red-600 hover:bg-red-50 rounded-lg text-[10px] font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
                <p className="text-[9px] text-gray-400 mt-3 text-center">Accepting sends to DRX admin for final approval</p>
              </div>
            ) : (
              <div className="text-center py-4">
                <svg className="w-8 h-8 text-gray-200 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <p className="text-xs text-gray-400">No pending requests</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Change Password ── */}
      <ChangePasswordSection accentColor="indigo" />

      {/* ── Edit Modal ── */}
      {editing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">
            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
              <div>
                <h3 className="font-black text-gray-900">Edit Profile</h3>
                <p className="text-xs text-gray-400 mt-0.5">Update your professional information</p>
              </div>
              <button onClick={() => setEditing(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
                  {error}
                </div>
              )}

              {/* Section: Personal */}
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Personal</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: "name",  label: "Full Name", span: 2 },
                  { key: "phone", label: "Phone",      type: "tel" },
                  { key: "avatar_url", label: "Avatar URL", type: "text" },
                ].map((f) => (
                  <div key={f.key} className={f.span === 2 ? "col-span-2" : ""}>
                    <label className="text-xs font-semibold text-gray-600 mb-1.5 block">{f.label}</label>
                    <input type={f.type || "text"} value={form[f.key] || ""}
                      onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#5b2bce]/20 focus:border-[#5b2bce] transition-all" />
                  </div>
                ))}
              </div>

              {/* Section: Professional */}
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pt-1">Professional</p>
              <div className="grid grid-cols-2 gap-3">
                {/* Specialization dropdown */}
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Specialization</label>
                  <select value={form.specialization || ""}
                    onChange={(e) => setForm((p) => ({ ...p, specialization: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#5b2bce]/20 focus:border-[#5b2bce] bg-white transition-all">
                    <option value="">Select specialization...</option>
                    {specializations.map((s) => <option key={s} value={s}>{s}</option>)}
                    {form.specialization && !specializations.includes(form.specialization) && (
                      <option value={form.specialization}>{form.specialization}</option>
                    )}
                  </select>
                </div>
                {[
                  { key: "hospital",         label: "Hospital",            span: 2 },
                  { key: "qualification",    label: "Qualification",       placeholder: "e.g. MBBS, MD" },
                  { key: "experience_years", label: "Experience (yrs)",    type: "number" },
                  { key: "license_number",   label: "License Number",      span: 2 },
                ].map((f) => (
                  <div key={f.key} className={f.span === 2 ? "col-span-2" : ""}>
                    <label className="text-xs font-semibold text-gray-600 mb-1.5 block">{f.label}</label>
                    <input type={f.type || "text"} value={form[f.key] || ""} placeholder={f.placeholder || ""}
                      onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#5b2bce]/20 focus:border-[#5b2bce] transition-all" />
                  </div>
                ))}
              </div>

              {/* Section: Location */}
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pt-1">Location</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: "city",     label: "City" },
                  { key: "state",    label: "State" },
                  { key: "country",  label: "Country" },
                  { key: "location", label: "Full Location", span: 2, placeholder: "e.g. Mumbai, Maharashtra, India" },
                ].map((f) => (
                  <div key={f.key} className={f.span === 2 ? "col-span-2" : ""}>
                    <label className="text-xs font-semibold text-gray-600 mb-1.5 block">{f.label}</label>
                    <input type="text" value={form[f.key] || ""} placeholder={f.placeholder || ""}
                      onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#5b2bce]/20 focus:border-[#5b2bce] transition-all" />
                  </div>
                ))}
              </div>

              {/* Bio */}
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pt-1">Bio</p>
              <div>
                <textarea value={form.bio || ""} onChange={(e) => setForm((p) => ({ ...p, bio: e.target.value }))}
                  rows={3} maxLength={500} placeholder="Tell other doctors about yourself..."
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#5b2bce]/20 focus:border-[#5b2bce] resize-none transition-all" />
                <p className="text-xs text-gray-400 text-right mt-1">{(form.bio || "").length}/500</p>
              </div>
            </div>

            <div className="px-5 py-4 border-t border-gray-100 flex gap-3 flex-shrink-0">
              <button onClick={() => setEditing(false)}
                className="flex-1 border border-gray-200 text-gray-700 py-3 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-all">
                Cancel
              </button>
              <button onClick={() => updateMutation.mutate(form)} disabled={updateMutation.isPending}
                className="flex-1 bg-[#5b2bce] hover:bg-[#4318d1] text-white py-3 rounded-xl text-sm font-black disabled:opacity-50 transition-all shadow-sm">
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
