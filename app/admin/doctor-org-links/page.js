"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { get, put, post as apiPost } from "@/lib/api";

export default function DoctorOrgLinksPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkDoctorId, setLinkDoctorId] = useState("");
  const [linkOrgId, setLinkOrgId] = useState("");
  const [linkError, setLinkError] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-rels-list", statusFilter],
    queryFn: () => get(`/api/v1/doctor-organizations?limit=200${statusFilter !== "all" ? "&status=" + statusFilter.toUpperCase() : ""}`),
    staleTime: 30000,
  });

  // Fetch all doctors and orgs to resolve names in the table
  const { data: allDoctors } = useQuery({
    queryKey: ["admin-all-doctors"],
    queryFn: () => get("/api/v1/doctors?limit=200"),
    staleTime: 60000,
  });
  const { data: allOrgs } = useQuery({
    queryKey: ["admin-all-orgs"],
    queryFn: () => get("/api/v1/organizations?limit=200"),
    staleTime: 60000,
  });

  const doctorMap = Object.fromEntries((allDoctors?.doctors || []).map((d) => [d.id, d]));
  const orgMap = Object.fromEntries((allOrgs?.organizations || []).map((o) => [o.id, o]));

  const relationships = data?.relationships || [];
  const filtered = relationships.filter((l) => {
    if (!search) return true;
    const drName = (doctorMap[l.doctor_id]?.name || "").toLowerCase();
    const orgName = (orgMap[l.organization_id]?.organization_name || "").toLowerCase();
    return drName.includes(search.toLowerCase()) || orgName.includes(search.toLowerCase());
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ relId, status }) => put(`/api/v1/doctor-organizations/${relId}/status`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-rels-list"] }),
  });

  const linkMutation = useMutation({
    mutationFn: ({ doctor_id, organization_id }) => apiPost("/api/v1/doctor-organizations", { doctor_id, organization_id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-rels-list"] });
      setShowLinkModal(false);
      setLinkDoctorId("");
      setLinkOrgId("");
      setLinkError("");
      setDrSearch("");
      setOrgSearch("");
    },
    onError: (err) => setLinkError(err.message || "Failed to link"),
  });

  // Fetch doctors and orgs for the link modal dropdowns
  const [drSearch, setDrSearch] = useState("");
  const [orgSearch, setOrgSearch] = useState("");

  const { data: doctorsData } = useQuery({
    queryKey: ["admin-doctors-for-link", drSearch],
    queryFn: () => get(`/api/v1/doctors?limit=20${drSearch ? "&search=" + encodeURIComponent(drSearch) : ""}`),
    staleTime: 15000,
    enabled: showLinkModal,
  });

  const { data: orgsForLink } = useQuery({
    queryKey: ["admin-orgs-for-link", orgSearch],
    queryFn: () => get(`/api/v1/organizations?limit=20${orgSearch ? "&search=" + encodeURIComponent(orgSearch) : ""}`),
    staleTime: 15000,
    enabled: showLinkModal,
  });

  const doctorsList = doctorsData?.doctors || [];
  const orgsList = orgsForLink?.organizations || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "#3b3a8a" }}>Doctor-Org Links</h1>
          <p className="text-gray-500 text-sm mt-0.5">Manage which doctors are connected to which organizations</p>
        </div>
        <button onClick={() => setShowLinkModal(true)}
          className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-semibold transition-all flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
          Link Doctor to Org
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search doctor or organization..." className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-100" />
        </div>
        <div className="flex gap-2">
          {["all", "active", "pending", "revoked"].map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                statusFilter === s ? "bg-purple-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}>{s === "all" ? "All" : s}</button>
          ))}
        </div>
        <span className="text-sm text-gray-500">{filtered.length} links</span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Doctor</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Organization</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Linked On</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((link) => {
              const doctor = doctorMap[link.doctor_id];
              const org = orgMap[link.organization_id];
              return (
              <tr key={link.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                      {(doctor?.name || "D").split(" ").slice(1).map((n) => n[0]).join("").slice(0, 2) || "D"}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{doctor?.name || "Unknown Doctor"}</p>
                      <p className="text-[10px] text-gray-400">{doctor?.specialization || ""}{doctor?.city ? " · " + doctor.city : ""}</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3.5">
                  <p className="text-sm font-medium text-gray-800">{org?.organization_name || "Unknown Org"}</p>
                  <p className="text-[10px] text-gray-400">{org?.city || ""}</p>
                </td>
                <td className="px-5 py-3.5">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    link.status === "ACTIVE" ? "bg-green-50 text-green-600" :
                    link.status === "PENDING" ? "bg-yellow-50 text-yellow-600" :
                    link.status === "REJECTED" ? "bg-red-50 text-red-500" :
                    "bg-gray-100 text-gray-500"
                  }`}>{link.status}</span>
                </td>
                <td className="px-5 py-3.5 text-xs text-gray-400">{link.joined_at ? new Date(link.joined_at).toLocaleDateString() : link.requested_at ? new Date(link.requested_at).toLocaleDateString() : "—"}</td>
                <td className="px-5 py-3.5 flex gap-2">
                  {link.status === "ACTIVE" && (
                    <button onClick={() => updateStatusMutation.mutate({ relId: link.id, status: "REMOVED" })}
                      disabled={updateStatusMutation.isPending}
                      className="text-xs text-red-500 hover:text-red-700 font-medium disabled:opacity-50">Remove</button>
                  )}
                  {link.status === "PENDING" && (
                    <>
                      <button onClick={() => updateStatusMutation.mutate({ relId: link.id, status: "ACTIVE" })}
                        disabled={updateStatusMutation.isPending}
                        className="text-xs text-green-600 hover:text-green-700 font-medium disabled:opacity-50">Approve</button>
                      <button onClick={() => updateStatusMutation.mutate({ relId: link.id, status: "REJECTED" })}
                        disabled={updateStatusMutation.isPending}
                        className="text-xs text-red-500 hover:text-red-700 font-medium disabled:opacity-50">Reject</button>
                    </>
                  )}
                  {link.status === "REMOVED" && (
                    <button onClick={() => updateStatusMutation.mutate({ relId: link.id, status: "ACTIVE" })}
                      disabled={updateStatusMutation.isPending}
                      className="text-xs text-green-600 hover:text-green-700 font-medium disabled:opacity-50">Reactivate</button>
                  )}
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Link Doctor Modal */}
      {showLinkModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 max-h-[85vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-1" style={{ color: "#3b3a8a" }}>Link Doctor to Organization</h3>
            <p className="text-sm text-gray-500 mb-5">Creates an immediate ACTIVE link. Doctor can view org drugs & CME instantly.</p>

            {linkError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 rounded-xl text-sm mb-4">{linkError}</div>
            )}

            <div className="space-y-4">
              {/* Doctor Search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Doctor</label>
                <input type="text" value={drSearch} onChange={(e) => { setDrSearch(e.target.value); setLinkDoctorId(""); }}
                  placeholder="Search by name, email, GID..."
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-100 mb-2" />
                {linkDoctorId ? (
                  <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    <span className="text-sm text-green-800 font-medium">{doctorsList.find((d) => d.id === linkDoctorId)?.name || linkDoctorId.slice(-8)}</span>
                    <button onClick={() => setLinkDoctorId("")} className="ml-auto text-green-600 hover:text-red-500 text-xs font-bold">Change</button>
                  </div>
                ) : (
                  <div className="max-h-36 overflow-y-auto border border-gray-100 rounded-xl">
                    {doctorsList.length === 0 ? (
                      <p className="text-xs text-gray-400 text-center py-3">Type to search doctors...</p>
                    ) : doctorsList.map((doc) => (
                      <button key={doc.id} onClick={() => { setLinkDoctorId(doc.id); setDrSearch(doc.name); }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-purple-50 transition-all text-left border-b border-gray-50 last:border-0">
                        <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                          {(doc.name || "D").split(" ").slice(1).map((n) => n[0]).join("").slice(0, 2) || "D"}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-800 truncate">{doc.name}</p>
                          <p className="text-[10px] text-gray-400">{doc.specialization || ""} · {doc.city || ""} · {doc.doctor_gid || ""}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Organization Search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Organization</label>
                <input type="text" value={orgSearch} onChange={(e) => { setOrgSearch(e.target.value); setLinkOrgId(""); }}
                  placeholder="Search by organization name..."
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-100 mb-2" />
                {linkOrgId ? (
                  <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    <span className="text-sm text-green-800 font-medium">{orgsList.find((o) => o.id === linkOrgId)?.organization_name || linkOrgId.slice(-8)}</span>
                    <button onClick={() => setLinkOrgId("")} className="ml-auto text-green-600 hover:text-red-500 text-xs font-bold">Change</button>
                  </div>
                ) : (
                  <div className="max-h-36 overflow-y-auto border border-gray-100 rounded-xl">
                    {orgsList.length === 0 ? (
                      <p className="text-xs text-gray-400 text-center py-3">Type to search organizations...</p>
                    ) : orgsList.map((org) => (
                      <button key={org.id} onClick={() => { setLinkOrgId(org.id); setOrgSearch(org.organization_name); }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-purple-50 transition-all text-left border-b border-gray-50 last:border-0">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                          {(org.organization_name || "O").slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-800 truncate">{org.organization_name}</p>
                          <p className="text-[10px] text-gray-400">{org.city || ""} · {org.organization_gid || ""}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-green-50 rounded-xl p-3 border border-green-100 mt-4">
              <p className="text-xs text-green-700">This will immediately set the relationship to <span className="font-bold">ACTIVE</span>. The doctor will see this org in their list right away.</p>
            </div>

            <div className="flex gap-3 mt-5">
              <button onClick={() => { setShowLinkModal(false); setLinkError(""); setDrSearch(""); setOrgSearch(""); setLinkDoctorId(""); setLinkOrgId(""); }}
                className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={() => linkMutation.mutate({ doctor_id: linkDoctorId, organization_id: linkOrgId })}
                disabled={!linkDoctorId || !linkOrgId || linkMutation.isPending}
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2.5 rounded-xl text-sm font-bold disabled:opacity-50 transition-all">
                {linkMutation.isPending ? "Linking..." : "Link Now"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
