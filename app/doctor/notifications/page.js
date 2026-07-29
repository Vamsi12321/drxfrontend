"use client";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { get, put, del } from "@/lib/api";
import { formatISTDateTime } from "@/lib/time";

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => get("/api/v1/notifications?limit=50").then((d) => d.notifications || []),
    staleTime: 60000,
  });

  const notifications = data || [];
  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["notifications"] });

  const markReadMutation = useMutation({
    mutationFn: (id) => put(`/api/v1/notifications/${id}/read`),
    onSuccess: invalidate,
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => put("/api/v1/notifications/read-all"),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => del(`/api/v1/notifications/${id}`),
    onSuccess: invalidate,
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Notifications</h1>
          <p className="text-sm text-gray-500">Stay updated with your latest activities</p>
        </div>
        {unreadCount > 0 && (
          <button onClick={() => markAllReadMutation.mutate()}
            className="px-4 py-2 text-sm font-semibold text-purple-600 border border-purple-200 rounded-lg hover:bg-purple-50 transition-all">
            Mark all as read
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1,2,3,4].map((i) => <div key={i} className="h-16 bg-white rounded-xl animate-pulse border border-gray-100" />)}
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
          <span className="text-4xl block mb-3">🔔</span>
          <p className="text-gray-500 text-sm font-medium">No notifications yet</p>
          <p className="text-gray-400 text-xs mt-1">You'll see updates here when there's activity</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((notif, idx) => (
            <div key={notif.id || notif._id || idx}
              onClick={() => !notif.is_read && markReadMutation.mutate(notif.id || notif._id)}
              className={`bg-white rounded-xl border border-gray-100 px-5 py-4 flex items-start gap-4 cursor-pointer hover:shadow-sm transition-all ${!notif.is_read ? "border-l-4 border-l-[#5b2bce]" : ""}`}>
              <div className="w-9 h-9 bg-indigo-50 rounded-lg flex items-center justify-center text-lg flex-shrink-0">
                {notif.type === "cme" ? "📅" : notif.type === "drug" ? "💊" : notif.type === "network" || notif.type === "org_invite" ? "🤝" : "🔔"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800">{notif.title || notif.message || "Notification"}</p>
                {notif.message && notif.title && <p className="text-xs text-gray-500 mt-0.5">{notif.message}</p>}
                <p className="text-[10px] text-gray-400 mt-1">{notif.created_at ? formatISTDateTime(notif.created_at) : ""}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {!notif.is_read && <span className="w-2 h-2 bg-[#5b2bce] rounded-full mt-2" />}
                <button onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(notif.id || notif._id); }}
                  className="text-gray-300 hover:text-red-400 transition-colors p-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
