"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatISTDate } from "@/lib/time";
import { get, put } from "@/lib/api";
import ChangePasswordSection from "@/components/ChangePasswordSection";

const formatLoc = (loc) => loc && typeof loc === "object" ? loc.location_name || loc.temporary_location?.name || "" : loc || "";

export default function DoctorProfile() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [form, setForm]       = useState({});
  const [error, setError]     = useState("");
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

  const updateMutation = useMutation({
        mutationFn: (data) => {
      const clean = Object.fromEntries(Object.entries(data).filter(([_, v]) => v !== "" && v !== undefined));
      if (clean.experience_years !== undefined) clean.experience_years = parseInt(clean.experience_years, 10);
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
      full_name:        profile?.full_name || "",
      phone:            profile?.phone || "",
      bio:              profile?.bio || "",
      location:         formatLoc(profile?.location) || "",
      experience_years: profile?.experience_years || "",
      specialization:   profile?.specialization || "",
      hospital:         profile?.hospital || "",
      avatar_url:       profile?.avatar_url || "",
    });
    setError("");
    setEditing(true);
  };

  const initials = profile?.full_name?.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() || "DR";

  if (isLoading) return (
    <div className="space-y-4">
      {[1,2,3].map((i) => <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />)}
    </div>
  );

  return (
    <div className="space-y-5">
        {success && <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm font-medium">{success}</div>}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left — avatar + basic info */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200 text-center">
              <div className="relative inline-block mb-4">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="avatar" className="w-24 h-24 rounded-2xl object-cover mx-auto shadow-lg" />
                ) : (
                  <div className="w-24 h-24 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center text-white text-3xl font-bold mx-auto shadow-lg">
                    {initials}
                  </div>
                )}
                <div className="absolute bottom-1 right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-white" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">{profile?.full_name}</h2>
              <p className="text-indigo-600 font-semibold text-sm mt-1">{profile?.specialization || "Doctor"}</p>
              {profile?.hospital && <p className="text-gray-500 text-xs mt-1">{profile.hospital}</p>}
              {formatLoc(profile?.location) && <p className="text-gray-400 text-xs mt-1">{formatLoc(profile.location)}</p>}
              {profile?.bio && <p className="text-gray-600 text-sm mt-3 leading-relaxed">{profile.bio}</p>}
              <button onClick={startEdit}
                className="mt-4 w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl font-semibold text-sm transition-all">
                Edit Profile
              </button>
            </div>
          </div>

          {/* Right — details */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
              <h3 className="font-bold text-gray-900 mb-4">Profile Details</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { label: "Email",          value: profile?.email,                        color: "indigo" },
                  { label: "Phone",          value: profile?.phone || "—",                 color: "blue" },
                  { label: "Specialization", value: profile?.specialization || "—",        color: "purple" },
                  { label: "Hospital",       value: profile?.hospital || "—",              color: "pink" },
                  { label: "Experience",     value: profile?.experience_years ? `${profile.experience_years} years` : "—", color: "green" },
                  { label: "License",        value: profile?.license_number || "—",        color: "orange" },
                  { label: "Location",       value: formatLoc(profile?.location) || "—",              color: "teal" },
                  { label: "Member Since",   value: profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : "—", color: "gray" },
                ].map((f) => (
                  <div key={f.label} className={`bg-${f.color}-50 border border-${f.color}-100 rounded-xl p-3`}>
                    <p className={`text-xs text-${f.color}-600 font-semibold mb-1`}>{f.label}</p>
                    <p className="text-sm font-bold text-gray-800 truncate">{f.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Company info */}
            {orgData?.organizations?.length > 0 && (
              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
                <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-5 py-3">
                  <p className="text-white font-bold text-sm">My Organizations</p>
                  <p className="text-blue-200 text-xs">{orgData.organizations.length} connected</p>
                </div>
                <div className="p-4 space-y-2">
                  {orgData.organizations.map((org) => (
                    <div key={org.organization_id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                      <div className="w-9 h-9 bg-purple-100 rounded-lg flex items-center justify-center text-purple-700 font-bold text-xs">
                        {(org.organization_name || "O").charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-800">{org.organization_name}</p>
                        <p className="text-xs text-gray-400">{org.city || ""}</p>
                      </div>
                      <span className="ml-auto text-[10px] bg-green-50 text-green-600 px-2 py-0.5 rounded-full font-bold">Active</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Edit Modal */}
        {editing && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">
              <div className="flex items-center justify-between p-4 border-b border-gray-100 flex-shrink-0">
                <h3 className="font-bold text-gray-900">Edit Profile</h3>
                <button onClick={() => setEditing(false)} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {error && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-xl text-sm">{error}</div>}
                {[
                  { key: "full_name",        label: "Full Name",        type: "text" },
                  { key: "phone",            label: "Phone",            type: "text" },
                  { key: "specialization",   label: "Specialization",   type: "text" },
                  { key: "hospital",         label: "Hospital",         type: "text" },
                  { key: "location",         label: "Location",         type: "text" },
                  { key: "experience_years", label: "Experience (years)", type: "number" },
                  { key: "avatar_url",       label: "Avatar URL",       type: "text" },
                ].map((f) => (
                  <div key={f.key}>
                    <label className="text-xs font-semibold text-gray-600 mb-1 block">{f.label}</label>
                    <input type={f.type} value={form[f.key] || ""} onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-200" />
                  </div>
                ))}
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Bio</label>
                  <textarea value={form.bio || ""} onChange={(e) => setForm((p) => ({ ...p, bio: e.target.value }))} rows={3} maxLength={500}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-200 resize-none" />
                  <p className="text-xs text-gray-400 text-right">{(form.bio || "").length}/500</p>
                </div>
              </div>
              <div className="p-4 border-t border-gray-100 flex gap-3 flex-shrink-0">
                <button onClick={() => setEditing(false)} className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-50">Cancel</button>
                <button onClick={() => updateMutation.mutate(form)} disabled={updateMutation.isPending}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl text-sm font-bold disabled:opacity-50">
                  {updateMutation.isPending ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        )}
        <ChangePasswordSection accentColor="indigo" />

    </div>
  );
}
