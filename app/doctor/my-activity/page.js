"use client";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { get } from "@/lib/api";
import { timeAgoIST as timeAgo } from "@/lib/time";

// Filter tabs — maps to the correct API scope
const TABS = [
  { id: "all",            label: "All Activity",   scope: null,           action: null },
  { id: "drug",           label: "Drugs",          scope: "org",          action: null },
  { id: "cme",            label: "CME Events",     scope: "org",          action: "cme_registered" },
  { id: "social",         label: "Posts & Network", scope: "drx_platform", action: null },
  { id: "post_created",   label: "My Posts",       scope: "drx_platform", action: "post_created" },
  { id: "post_liked",     label: "Liked",          scope: "drx_platform", action: "post_liked" },
  { id: "comment_posted", label: "Comments",       scope: "drx_platform", action: "comment_posted" },
];

const iconMap = {
  drug_viewed:     <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>,
  drug_bookmarked: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>,
  cme_registered:  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
  cme_completed:   <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>,
  post_created:    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>,
  post_liked:      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" /></svg>,
  post_bookmarked: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>,
  comment_posted:  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>,
  connection_made: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>,
  group_joined:    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>,
};

const colorMap = {
  drug_viewed:     { bg: "bg-blue-50",   text: "text-blue-600",   border: "border-blue-100" },
  drug_bookmarked: { bg: "bg-blue-50",   text: "text-blue-600",   border: "border-blue-100" },
  cme_registered:  { bg: "bg-purple-50", text: "text-purple-600", border: "border-purple-100" },
  cme_completed:   { bg: "bg-amber-50",  text: "text-amber-600",  border: "border-amber-100" },
  post_created:    { bg: "bg-green-50",  text: "text-green-600",  border: "border-green-100" },
  post_liked:      { bg: "bg-pink-50",   text: "text-pink-600",   border: "border-pink-100" },
  post_bookmarked: { bg: "bg-indigo-50", text: "text-indigo-600", border: "border-indigo-100" },
  comment_posted:  { bg: "bg-orange-50", text: "text-orange-600", border: "border-orange-100" },
  connection_made: { bg: "bg-indigo-50", text: "text-indigo-600", border: "border-indigo-100" },
  group_joined:    { bg: "bg-teal-50",   text: "text-teal-600",   border: "border-teal-100" },
};

const actionLabels = {
  drug_viewed:     "Viewed Drug",
  drug_bookmarked: "Bookmarked Drug",
  cme_registered:  "Registered for CME",
  cme_completed:   "Completed CME",
  post_created:    "Created a Post",
  post_liked:      "Liked a Post",
  post_bookmarked: "Bookmarked Post",
  comment_posted:  "Posted a Comment",
  connection_made: "New Connection",
  group_joined:    "Joined a Group",
};

function getDescription(log) {
  const meta = log.metadata || {};
  switch (log.action) {
    case "drug_viewed":
    case "drug_bookmarked":  return meta.drug_name || "Drug";
    case "cme_registered":
    case "cme_completed":    return meta.event_title || "CME Event";
    case "post_created":     return meta.content_preview || "Post";
    case "post_liked":       return meta.post_author_name ? `${meta.post_author_name}'s post` : "Post";
    case "post_bookmarked":  return meta.post_content_preview || "Post";
    case "comment_posted":   return meta.post_author_name ? `On ${meta.post_author_name}'s post` : "Comment";
    case "connection_made":  return meta.connected_with_name || "Doctor";
    case "group_joined":     return meta.group_name || "Group";
    default:                 return log.action?.replace(/_/g, " ") || "";
  }
}

// Build the API params based on the tab's scope + action
function buildParams(tab, orgId, page, limit) {
  const params = { skip: (page - 1) * limit, limit };
  if (tab.scope === "org" && orgId) {
    params.org_id = orgId;
  } else if (tab.scope === "drx_platform") {
    params.org_id = "drx_platform";
  }
  // no org_id = all activity (Use Case 3)
  if (tab.action) params.action = tab.action;
  return params;
}

export default function MyActivityPage() {
  const [activeTab, setActiveTab] = useState("all");
  const [page, setPage] = useState(1);
  const [orgId, setOrgId] = useState(null);
  const limit = 30;

  useEffect(() => {
    setOrgId(localStorage.getItem("selectedOrgId") || null);
  }, []);

  const currentTab = TABS.find((t) => t.id === activeTab) || TABS[0];

  // Stats: org-level + platform-level
  const { data: orgStats, isLoading: orgStatsLoading } = useQuery({
    queryKey: ["activity-stats-org", orgId],
    queryFn: () => get("/api/v1/activity-logs/stats", { org_id: orgId }),
    staleTime: 2 * 60 * 1000,
    enabled: !!orgId,
  });

  const { data: platformStats } = useQuery({
    queryKey: ["activity-stats-platform"],
    queryFn: () => get("/api/v1/activity-logs/stats", { org_id: "drx_platform" }),
    staleTime: 2 * 60 * 1000,
  });

  // Logs — scoped by current tab
  const { data: logsData, isLoading: logsLoading } = useQuery({
    queryKey: ["activity-logs", activeTab, orgId, page],
    queryFn: () => get("/api/v1/activity-logs/me", buildParams(currentTab, orgId, page, limit)),
    staleTime: 60 * 1000,
    placeholderData: (prev) => prev,
    // disable org-scoped tabs when no org selected
    enabled: currentTab.scope === "drx_platform" || currentTab.scope === null || !!orgId,
  });

  const logs = logsData?.logs || [];
  const total = logsData?.total || 0;
  const totalPages = Math.ceil(total / limit) || 1;
  // Show loading on initial load OR when tab changes and new data is fetching
  const showLoading = logsLoading;

  // Summary card values
  const statCards = [
    {
      label: "Drug Activity",
      value: (orgStats?.drug_viewed ?? 0) + (orgStats?.drug_bookmarked ?? 0),
      icon: iconMap.drug_viewed,
      color: colorMap.drug_viewed,
    },
    {
      label: "CME Events",
      value: (orgStats?.cme_registered ?? 0) + (orgStats?.cme_completed ?? 0),
      icon: iconMap.cme_registered,
      color: colorMap.cme_registered,
    },
    {
      label: "Posts & Comments",
      value: (platformStats?.post_created ?? 0) + (platformStats?.post_liked ?? 0) + (platformStats?.comment_posted ?? 0),
      icon: iconMap.post_created,
      color: colorMap.post_created,
    },
    {
      label: "Bookmarks",
      value: (orgStats?.drug_bookmarked ?? 0) + (platformStats?.post_bookmarked ?? 0),
      icon: iconMap.drug_bookmarked,
      color: colorMap.drug_bookmarked,
    },
  ];

  return (
    <div className="space-y-6 min-w-0">
      {/* Header */}
      <div>
        <h1 className="text-lg sm:text-2xl font-bold" style={{ color: "#3b3a8a" }}>My Activity</h1>
        <p className="text-gray-500 text-xs sm:text-sm mt-0.5">Track your recent actions and engagement</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
        {statCards.map((card) => (
          <div key={card.label} className={`bg-white rounded-xl p-3 sm:p-4 border ${card.color.border} hover:shadow-sm transition-all`}>
            <div className={`w-8 h-8 sm:w-10 sm:h-10 ${card.color.bg} rounded-lg sm:rounded-xl flex items-center justify-center ${card.color.text} mb-2 sm:mb-3 flex-shrink-0`}>
              {card.icon}
            </div>
            <p className="text-lg sm:text-2xl font-bold" style={{ color: "#3b3a8a" }}>
              {orgStatsLoading ? "—" : card.value}
            </p>
            <p className="text-gray-500 text-[10px] sm:text-xs mt-0.5">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Filter Tabs */}
      <div className="relative -mx-3 sm:mx-0 overflow-hidden">
        <div className="flex border-b border-gray-200 overflow-x-auto scrollbar-hide px-3 sm:px-0">
          {TABS.map((tab) => (
            <button key={tab.id} onClick={() => { setActiveTab(tab.id); setPage(1); }}
              className={`flex-shrink-0 w-[25%] sm:w-auto px-1 sm:px-4 py-2 sm:py-2.5 text-[10px] sm:text-sm font-medium border-b-2 transition-all whitespace-nowrap text-center ${
                activeTab === tab.id
                  ? "border-purple-600 text-purple-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Scope hint */}
      {currentTab.scope === "org" && !orgId && (
        <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-xs text-amber-700 font-medium">
          Select an organization from the top bar to view drug & CME activity.
        </div>
      )}

      {/* Loading */}
      {showLoading && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-start gap-4 p-4 rounded-xl animate-pulse">
              <div className="w-11 h-11 bg-gray-200 rounded-xl" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-gray-200 rounded w-32" />
                <div className="h-3 bg-gray-100 rounded w-48" />
              </div>
              <div className="h-3 bg-gray-100 rounded w-16" />
            </div>
          ))}
        </div>
      )}

      {/* Timeline */}
      {!showLoading && logs.length > 0 && (
        <div className="relative">
          <div className="absolute left-[17px] sm:left-[23px] top-0 bottom-0 w-0.5 bg-gray-100" />
          <div className="space-y-1">
            {logs.map((log) => {
              const c = colorMap[log.action] || colorMap.drug_viewed;
              const icon = iconMap[log.action] || iconMap.drug_viewed;
              const title = actionLabels[log.action] || log.action?.replace(/_/g, " ") || "Activity";
              const description = getDescription(log);
              return (
                <div key={log.id} className="relative flex items-start gap-3 sm:gap-4 p-2.5 sm:p-4 rounded-xl hover:bg-gray-50 transition-all group">
                  <div className={`relative z-10 w-9 h-9 sm:w-11 sm:h-11 ${c.bg} rounded-lg sm:rounded-xl flex items-center justify-center ${c.text} flex-shrink-0 border ${c.border} group-hover:scale-105 transition-transform`}>
                    {icon}
                  </div>
                  <div className="flex-1 min-w-0 pt-0.5">
                    <p className="text-xs sm:text-sm font-semibold text-gray-800">{title}</p>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{description}</p>
                  </div>
                  <span className="text-[10px] sm:text-xs text-gray-400 flex-shrink-0 pt-1">{timeAgo(log.created_at)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty */}
      {!showLoading && logs.length === 0 && (currentTab.scope !== "org" || orgId) && (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
          <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-gray-400 text-sm">No activity yet in this category.</p>
        </div>
      )}

      {/* Pagination */}
      {!showLoading && totalPages > 1 && (
        <div className="flex justify-center items-center gap-3 mt-4">
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
