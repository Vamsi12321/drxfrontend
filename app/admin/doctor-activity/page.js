"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { get } from "@/lib/api";
import { timeAgoIST as timeAgo } from "@/lib/time";

const FILTERS = [
  { id: "", label: "All Activity" },
  { id: "drug_viewed", label: "Drug Views" },
  { id: "cme_registered", label: "CME Registered" },
  { id: "cme_completed", label: "CME Completed" },
  { id: "post_created", label: "Posts" },
  { id: "post_liked", label: "Likes" },
  { id: "comment_posted", label: "Comments" },
  { id: "connection_made", label: "Connections" },
  { id: "group_joined", label: "Groups" },
];

const colorMap = {
  drug_viewed: { bg: "bg-blue-50", text: "text-blue-600", border: "border-blue-100" },
  cme_registered: { bg: "bg-purple-50", text: "text-purple-600", border: "border-purple-100" },
  cme_completed: { bg: "bg-amber-50", text: "text-amber-600", border: "border-amber-100" },
  post_created: { bg: "bg-green-50", text: "text-green-600", border: "border-green-100" },
  post_liked: { bg: "bg-pink-50", text: "text-pink-600", border: "border-pink-100" },
  comment_posted: { bg: "bg-orange-50", text: "text-orange-600", border: "border-orange-100" },
  connection_made: { bg: "bg-indigo-50", text: "text-indigo-600", border: "border-indigo-100" },
  group_joined: { bg: "bg-teal-50", text: "text-teal-600", border: "border-teal-100" },
};

const actionLabels = {
  drug_viewed: "Viewed Drug",
  cme_registered: "Registered for CME",
  cme_completed: "Completed CME",
  post_created: "Created a Post",
  post_liked: "Liked a Post",
  comment_posted: "Posted a Comment",
  connection_made: "New Connection",
  group_joined: "Joined a Group",
};

function getDescription(log) {
  const meta = log.metadata || {};
  switch (log.action) {
    case "drug_viewed": return meta.drug_name || "Viewed a drug";
    case "cme_registered": return meta.event_title || "Registered for an event";
    case "cme_completed": return meta.event_title || "Completed a CME session";
    case "post_created": return meta.content_preview || "Published a new post";
    case "post_liked": return meta.post_author_name ? `Liked ${meta.post_author_name}'s post` : "Liked a post";
    case "comment_posted": return meta.post_author_name ? `Commented on ${meta.post_author_name}'s post` : "Posted a comment";
    case "connection_made": return meta.connected_with_name || "Connected with a doctor";
    case "group_joined": return meta.group_name || "Joined a group";
    default: return log.action?.replace(/_/g, " ") || "Activity";
  }
}

export default function DoctorActivityPage() {
  const [doctorId, setDoctorId] = useState("");
  const [orgId, setOrgId] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [orgInput, setOrgInput] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [page, setPage] = useState(1);
  const limit = 50;

  // Fetch all doctors (load on mount, filter client-side)
  const { data: doctorsData } = useQuery({
    queryKey: ["admin-doctors-list-all"],
    queryFn: () => get("/api/v1/doctors?limit=200"),
    staleTime: 60000,
  });

  // Fetch all organizations (load on mount, filter client-side)
  const { data: orgsData } = useQuery({
    queryKey: ["admin-orgs-list-all"],
    queryFn: () => get("/api/v1/organizations?limit=200"),
    staleTime: 60000,
  });

  const allDoctors = doctorsData?.doctors || [];
  const allOrgs = orgsData?.organizations || [];

  // Client-side filter
  const doctors = searchInput
    ? allDoctors.filter((d) => (d.name || d.full_name || "").toLowerCase().includes(searchInput.toLowerCase()))
    : allDoctors;
  const orgs = orgInput
    ? allOrgs.filter((o) => (o.organization_name || o.name || "").toLowerCase().includes(orgInput.toLowerCase()))
    : allOrgs;

  // Fetch activity logs for selected doctor
  const { data: logsData, isLoading: logsLoading, isError } = useQuery({
    queryKey: ["admin-doctor-activity", doctorId, orgId, actionFilter, page],
    queryFn: () => {
      const params = { org_id: orgId, skip: (page - 1) * limit, limit };
      if (actionFilter) params.action = actionFilter;
      return get(`/api/v1/activity-logs/admin/${doctorId}`, params);
    },
    staleTime: 30000,
    enabled: !!doctorId && !!orgId,
  });

  // Fetch stats for selected doctor
  const { data: statsData } = useQuery({
    queryKey: ["admin-doctor-stats", doctorId, orgId],
    queryFn: () => get("/api/v1/activity-logs/stats", { org_id: orgId, doctor_id: doctorId }),
    staleTime: 60000,
    enabled: !!doctorId && !!orgId,
  });

  const logs = logsData?.logs || [];
  const total = logsData?.total || 0;
  const totalPages = Math.ceil(total / limit) || 1;
  const stats = statsData || {};

  const [showDoctorDropdown, setShowDoctorDropdown] = useState(false);
  const [showOrgDropdown, setShowOrgDropdown] = useState(false);
  const [selectedDoctorName, setSelectedDoctorName] = useState("");
  const [selectedOrgName, setSelectedOrgName] = useState("");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "#3b3a8a" }}>Doctor Activity Logs</h1>
        <p className="text-gray-500 text-sm mt-0.5">View any doctor's activity history per organization</p>
      </div>

      {/* Search Controls */}
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Doctor search */}
          <div className="relative">
            <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Select Doctor</label>
            <input
              type="text"
              value={selectedDoctorName || searchInput}
              onChange={(e) => { setSearchInput(e.target.value); setSelectedDoctorName(""); setDoctorId(""); setShowDoctorDropdown(true); }}
              onFocus={() => setShowDoctorDropdown(true)}
              onBlur={() => setTimeout(() => setShowDoctorDropdown(false), 200)}
              placeholder="Search doctor by name..."
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-400"
            />
            {showDoctorDropdown && doctors.length > 0 && !selectedDoctorName && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-20 max-h-48 overflow-y-auto">
                {doctors.map((doc) => {
                  const docId = doc.id || doc.doctor_id || doc._id;
                  const docName = doc.name || doc.full_name || doc.user_name || "Doctor";
                  return (
                    <button key={docId} onClick={() => { setDoctorId(docId); setSelectedDoctorName(docName); setSearchInput(""); setShowDoctorDropdown(false); setPage(1); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-left border-b border-gray-50 last:border-0">
                      <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 text-xs font-bold flex-shrink-0">
                        {docName.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{docName}</p>
                        <p className="text-[10px] text-gray-400">{doc.specialization || doc.doctor_gid || doc.email || ""}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Org search */}
          <div className="relative">
            <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Select Organization</label>
            <input
              type="text"
              value={selectedOrgName || orgInput}
              onChange={(e) => { setOrgInput(e.target.value); setSelectedOrgName(""); setOrgId(""); setShowOrgDropdown(true); }}
              onFocus={() => setShowOrgDropdown(true)}
              onBlur={() => setTimeout(() => setShowOrgDropdown(false), 200)}
              placeholder="Search organization..."
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-400"
            />
            {showOrgDropdown && orgs.length > 0 && !selectedOrgName && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-20 max-h-48 overflow-y-auto">
                {orgs.map((org) => {
                  const oId = org.id || org.organization_id || org._id;
                  const oName = org.organization_name || org.name || "Org";
                  return (
                    <button key={oId} onClick={() => { setOrgId(oId); setSelectedOrgName(oName); setOrgInput(""); setShowOrgDropdown(false); setPage(1); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-left border-b border-gray-50 last:border-0">
                      <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center text-purple-700 text-xs font-bold flex-shrink-0">
                        {oName.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{oName}</p>
                        <p className="text-[10px] text-gray-400">{org.city || org.organization_gid || ""}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Selected info */}
        {doctorId && orgId && (
          <div className="mt-4 flex items-center gap-3 bg-purple-50 rounded-lg px-4 py-2.5 border border-purple-100">
            <svg className="w-4 h-4 text-purple-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-xs text-purple-700">
              Viewing activity for <span className="font-bold">{selectedDoctorName}</span> in <span className="font-bold">{selectedOrgName}</span>
              {total > 0 && <span className="text-purple-500 ml-1">({total} logs)</span>}
            </p>
          </div>
        )}
      </div>

      {/* Stats (when doctor + org selected) */}
      {doctorId && orgId && stats.total > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Drug Views", value: stats.drug_viewed ?? 0, color: "blue" },
            { label: "CME Events", value: (stats.cme_registered ?? 0) + (stats.cme_completed ?? 0), color: "purple" },
            { label: "Posts", value: (stats.post_created ?? 0) + (stats.post_liked ?? 0) + (stats.comment_posted ?? 0), color: "green" },
            { label: "Network", value: (stats.connection_made ?? 0) + (stats.group_joined ?? 0), color: "indigo" },
          ].map((s) => (
            <div key={s.label} className={`bg-white rounded-xl p-4 border border-${s.color}-100`}>
              <p className="text-2xl font-bold" style={{ color: "#3b3a8a" }}>{s.value}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      {doctorId && orgId && (
        <div className="flex gap-2 flex-wrap">
          {FILTERS.map((f) => (
            <button key={f.id} onClick={() => { setActionFilter(f.id); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                actionFilter === f.id ? "bg-purple-600 text-white" : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
              }`}>
              {f.label}
            </button>
          ))}
        </div>
      )}

      {/* No selection state */}
      {(!doctorId || !orgId) && (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
          <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <p className="text-gray-500 text-sm font-medium">Select a doctor and organization above</p>
          <p className="text-gray-400 text-xs mt-1">to view their activity logs</p>
        </div>
      )}

      {/* Loading */}
      {doctorId && orgId && logsLoading && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-start gap-4 p-4 bg-white rounded-xl border border-gray-100 animate-pulse">
              <div className="w-10 h-10 bg-gray-200 rounded-xl" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-gray-200 rounded w-32" />
                <div className="h-3 bg-gray-100 rounded w-48" />
              </div>
              <div className="h-3 bg-gray-100 rounded w-16" />
            </div>
          ))}
        </div>
      )}

      {/* Logs list */}
      {doctorId && orgId && !logsLoading && logs.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="divide-y divide-gray-50">
            {logs.map((log) => {
              const c = colorMap[log.action] || colorMap.drug_viewed;
              const title = actionLabels[log.action] || log.action?.replace(/_/g, " ") || "Activity";
              const description = getDescription(log);

              return (
                <div key={log.id} className="flex items-start gap-4 px-5 py-4 hover:bg-gray-50/50 transition-all">
                  <div className={`w-10 h-10 ${c.bg} rounded-xl flex items-center justify-center ${c.text} flex-shrink-0 border ${c.border}`}>
                    <span className="text-xs font-bold uppercase">{log.action?.charAt(0)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-semibold text-gray-800">{title}</p>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${c.bg} ${c.text}`}>
                        {log.action}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">{description}</p>
                  </div>
                  <span className="text-[11px] text-gray-400 flex-shrink-0 whitespace-nowrap">
                    {timeAgo(log.created_at)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {doctorId && orgId && !logsLoading && logs.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
          <svg className="w-10 h-10 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-gray-400 text-sm">No activity logs found{actionFilter ? ` for "${actionFilter}"` : ""}.</p>
        </div>
      )}

      {/* Pagination */}
      {doctorId && orgId && !logsLoading && totalPages > 1 && (
        <div className="flex justify-center items-center gap-3">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
            className="px-4 py-2 bg-white border border-gray-200 rounded-lg font-semibold text-gray-600 hover:border-purple-400 disabled:opacity-40 transition-all text-sm">
            ← Prev
          </button>
          <span className="text-gray-500 text-sm font-medium">{page} / {totalPages}</span>
          <button onClick={() => setPage((p) => p + 1)} disabled={page >= totalPages}
            className="px-4 py-2 bg-white border border-gray-200 rounded-lg font-semibold text-gray-600 hover:border-purple-400 disabled:opacity-40 transition-all text-sm">
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
