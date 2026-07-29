"use client";
import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { get, put, del } from "@/lib/api";

// SVG path strings kept short — no long single-line JSX
const P = {
  people:   "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z",
  check:    "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
  heart:    "M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z",
  chat:     "M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z",
  share:    "M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z",
  mail:     "M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
  group:    "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z",
  calendar: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
  bell:     "M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9",
  pill:     "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
  clip:     "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4",
  close:    "M6 18L18 6M6 6l12 12",
  trash:    "M6 18L18 6M6 6l12 12",
};

function Icon({ d, className = "w-4 h-4 text-white", sw = 2 }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={sw} d={d} />
    </svg>
  );
}

const TYPE_CONFIG = {
  connection_request:  { iconKey: "people",   color: "from-blue-500 to-indigo-500" },
  connection_accepted: { iconKey: "check",    color: "from-green-500 to-emerald-500" },
  post_liked:          { iconKey: "heart",    color: "from-indigo-500 to-purple-500" },
  post_commented:      { iconKey: "chat",     color: "from-purple-500 to-pink-500" },
  post_shared:         { iconKey: "share",    color: "from-pink-500 to-rose-500" },
  new_message:         { iconKey: "mail",     color: "from-blue-500 to-cyan-500" },
  group_message:       { iconKey: "group",    color: "from-teal-500 to-cyan-500" },
  group_added:         { iconKey: "group",    color: "from-green-500 to-teal-500" },
  cme_created:         { iconKey: "calendar", color: "from-green-500 to-emerald-500" },
  cme_reminder_1day:   { iconKey: "bell",     color: "from-yellow-500 to-orange-500" },
  cme_reminder_1hour:  { iconKey: "bell",     color: "from-orange-500 to-red-500" },
  cme_recording:       { iconKey: "calendar", color: "from-purple-500 to-indigo-500" },
  drug_added:          { iconKey: "pill",     color: "from-blue-500 to-cyan-500" },
  visit_scheduled:     { iconKey: "clip",     color: "from-indigo-500 to-blue-500" },
  visit_rescheduled:   { iconKey: "bell",     color: "from-yellow-500 to-orange-500" },
  visit_completed:     { iconKey: "check",    color: "from-green-500 to-emerald-500" },
  visit_cancelled:     { iconKey: "bell",     color: "from-red-500 to-pink-500" },
};

function getNavPath(notif, role) {
  const base = role === "mr" ? "/mr" : "/doctor";
  const d = notif.data || {};
  switch (notif.type) {
    case "connection_request":
    case "connection_accepted": return base + "/network/my-network";
    case "post_liked":
    case "post_commented":
    case "post_shared":         return base + "/network/feed" + (d.post_id ? "?post=" + d.post_id : "");
    case "new_message":         return base + "/network/messages";
    case "group_message":
    case "group_added":         return base + "/network/groups";
    case "cme_created":
    case "cme_reminder_1day":
    case "cme_reminder_1hour":
    case "cme_recording":       return role === "mr" ? "/mr/dashboard" : "/doctor/cme-events";
    case "drug_added":          return base + "/drug-search";
    case "visit_scheduled":
    case "visit_rescheduled":
    case "visit_completed":
    case "visit_cancelled":     return role === "mr" ? "/mr/visits" : "/doctor/home";
    case "doctor_request_approved":
    case "doctor_request_rejected": return role === "mr" ? "/mr/doctors" : "/doctor/home";
    default:                    return role === "mr" ? "/mr/dashboard" : "/doctor/home";
  }
}

const timeAgo = (ts) => {
  if (!ts) return "";
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return mins + "m ago";
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return hrs + "h ago";
  return Math.floor(hrs / 24) + "d ago";
};

const ACCENT_GRADIENT = {
  indigo: "bg-gradient-to-r from-indigo-600 to-purple-600",
  orange: "bg-gradient-to-r from-orange-600 to-red-600",
  purple: "bg-gradient-to-r from-purple-600 to-pink-600",
  green:  "bg-gradient-to-r from-green-600 to-emerald-600",
  blue:   "bg-gradient-to-r from-blue-600 to-indigo-600",
};

export default function NotificationBell({ accentColor = "indigo" }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("all");
  const ref = useRef(null);
  const role = typeof window !== "undefined"
    ? (localStorage.getItem("userRole") || "doctor").toLowerCase()
    : "doctor";

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const { data: countData } = useQuery({
    queryKey: ["notif-count"],
    queryFn: () => get("/api/v1/notifications/unread-count"),
    refetchInterval: 30000,
    staleTime: 0,
  });

  const { data, isLoading } = useQuery({
    queryKey: ["notifications", filter],
    queryFn: () => get(
      "/api/v1/notifications?limit=50" + (filter === "unread" ? "&unread_only=true" : "")
    ),
    enabled: open,
    staleTime: 10000,
  });

  const unreadCount   = countData?.count || 0;
  const notifications = data?.notifications || [];

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
    queryClient.invalidateQueries({ queryKey: ["notif-count"] });
  };

  const markReadMutation = useMutation({
    mutationFn: (id) => put("/api/v1/notifications/" + id + "/read", {}),
    onSuccess: invalidate,
  });
  const markAllMutation = useMutation({
    mutationFn: () => put("/api/v1/notifications/read-all", {}),
    onSuccess: invalidate,
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => del("/api/v1/notifications/" + id),
    onSuccess: invalidate,
  });
  const clearAllMutation = useMutation({
    mutationFn: () => del("/api/v1/notifications/clear-all"),
    onSuccess: invalidate,
  });

  const handleClick = (notif) => {
    if (!notif.is_read) markReadMutation.mutate(notif.notification_id);
    setOpen(false);
    router.push(getNavPath(notif, role));
  };

  const headerGradient = ACCENT_GRADIENT[accentColor] || ACCENT_GRADIENT.indigo;

  return (
    <div className="relative" ref={ref}>
      {/* Bell button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative p-2.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-xl transition-all"
      >
        <Icon d={P.bell} className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center border-2 border-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* Mobile backdrop */}
          <div className="fixed inset-0 z-40 sm:hidden" onClick={() => setOpen(false)} />

          {/* Dropdown panel */}
          <div
            className="z-50 bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden absolute right-0 mt-3 w-80 sm:w-96"
            style={{ maxHeight: "min(520px, calc(100vh - 120px))" }}
          >
            {/* Header */}
            <div className={headerGradient + " px-5 py-4 rounded-t-2xl flex-shrink-0"}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  Notifications
                  {unreadCount > 0 && (
                    <span className="bg-white/20 text-white text-xs px-2 py-0.5 rounded-full">
                      {unreadCount} new
                    </span>
                  )}
                </h3>
                <button onClick={() => setOpen(false)} className="text-white/70 hover:text-white">
                  <Icon d={P.close} className="w-5 h-5 text-white" />
                </button>
              </div>
              <div className="flex gap-2">
                {["all", "unread"].map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={
                      "px-3 py-1 rounded-lg text-xs font-semibold transition-all capitalize " +
                      (filter === f ? "bg-white text-indigo-700" : "text-white/70 hover:bg-white/20")
                    }
                  >
                    {f}
                  </button>
                ))}
                <div className="flex-1" />
                {unreadCount > 0 && (
                  <button
                    onClick={() => markAllMutation.mutate()}
                    disabled={markAllMutation.isPending}
                    className="text-white/70 hover:text-white text-xs font-semibold disabled:opacity-50"
                  >
                    Mark all read
                  </button>
                )}
              </div>
            </div>

            {/* Notification list */}
            <div className="flex-1 overflow-y-auto min-h-0">
              {isLoading ? (
                <div className="p-4 space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                  <Icon d={P.bell} className="w-10 h-10 text-gray-200 mb-3" sw={1.5} />
                  <p className="text-gray-500 text-sm font-medium">
                    {filter === "unread" ? "No unread notifications" : "No notifications yet"}
                  </p>
                </div>
              ) : (
                notifications.map((n) => {
                  const cfg = TYPE_CONFIG[n.type] || { iconKey: "bell", color: "from-gray-400 to-gray-500" };
                  const unreadClass = n.is_read ? "" : " bg-indigo-50/30";
                  const titleClass = "text-sm leading-tight text-gray-900 " + (n.is_read ? "font-semibold" : "font-bold");
                  return (
                    <div
                      key={n.notification_id}
                      className={"flex items-start gap-3 px-4 py-3 border-b border-gray-50 hover:bg-gray-50 cursor-pointer group transition-colors" + unreadClass}
                      onClick={() => handleClick(n)}
                    >
                      <div className={"w-9 h-9 bg-gradient-to-br " + cfg.color + " rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm"}>
                        <Icon d={P[cfg.iconKey] || P.bell} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={titleClass}>{n.title}</p>
                          {!n.is_read && (
                            <span className="w-2 h-2 bg-indigo-500 rounded-full flex-shrink-0 mt-1" />
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
                        <p className="text-xs text-gray-400 mt-1">{timeAgo(n.created_at)}</p>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(n.notification_id); }}
                        className="text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0 mt-1"
                      >
                        <Icon d={P.close} className="w-4 h-4 text-current" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="px-4 py-3 border-t border-gray-100 flex-shrink-0">
                <button
                  onClick={() => { if (confirm("Clear all notifications?")) clearAllMutation.mutate(); }}
                  disabled={clearAllMutation.isPending}
                  className="w-full text-xs text-gray-400 hover:text-red-500 font-semibold transition-colors disabled:opacity-50"
                >
                  {clearAllMutation.isPending ? "Clearing..." : "Clear all"}
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
