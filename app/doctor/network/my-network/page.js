"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { get, post as apiPost, del } from "@/lib/api";
import { Icons } from "@/components/network/Icons";
import UserProfileModal from "@/components/network/UserProfileModal";
import { useNetworkToast } from "@/app/doctor/network/layout";

function AvatarCircle({ name, size = "md" }) {
  const s = size === "lg" ? "w-14 h-14 text-base" : "w-10 h-10 text-sm";
  return (
    <div className={`${s} rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 bg-gradient-to-br from-indigo-500 to-purple-600`}>
      {(name || "").split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
    </div>
  );
}

function GridSkeleton({ count = 8 }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-2xl p-5 border border-gray-100 animate-pulse">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gray-200 rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="h-3 bg-gray-200 rounded w-3/4" />
              <div className="h-2 bg-gray-100 rounded w-1/2" />
            </div>
          </div>
          <div className="h-8 bg-gray-100 rounded-xl" />
        </div>
      ))}
    </div>
  );
}

function ListSkeleton({ count = 4 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl p-4 border border-gray-100 animate-pulse flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-200 rounded-full" />
          <div className="flex-1 space-y-2">
            <div className="h-3 bg-gray-200 rounded w-40" />
            <div className="h-2 bg-gray-100 rounded w-24" />
          </div>
          <div className="h-8 w-20 bg-gray-100 rounded-xl" />
        </div>
      ))}
    </div>
  );
}

function EmptyState({ icon, text, sub }) {
  return (
    <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
      <span className="text-5xl block mb-3">{icon || "🤝"}</span>
      <p className="text-gray-500 font-medium">{text}</p>
      {sub && <p className="text-gray-400 text-sm mt-1">{sub}</p>}
    </div>
  );
}

export default function MyNetworkPage() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { showToast } = useNetworkToast();
  const [subTab, setSubTab] = useState("connections");
  const [viewingUserId, setViewingUserId] = useState(null);
  const [search, setSearch] = useState("");

  const { data: connData,    isLoading: connLoading }    = useQuery({ queryKey: ["my-connections"],    queryFn: () => get("/api/v1/connections?limit=50"),                              staleTime: 0 });
  const { data: recvData,    isLoading: recvLoading }    = useQuery({ queryKey: ["requests-received"], queryFn: () => get("/api/v1/connections/requests/received?limit=50"),          staleTime: 0 });
  const { data: sentData,    isLoading: sentLoading }    = useQuery({ queryKey: ["requests-sent"],     queryFn: () => get("/api/v1/connections/requests/sent?limit=50"),              staleTime: 0 });
  const { data: blockedData, isLoading: blockedLoading } = useQuery({ queryKey: ["blocked-users"],     queryFn: () => get("/api/v1/connections?status=blocked&limit=50"),             staleTime: 0 });

  const connections = connData?.connections    || [];
  const received    = recvData?.requests       || [];
  const sent        = sentData?.requests       || [];
  const blocked     = blockedData?.connections || [];

  // Filter connections by search
  const filteredConnections = search
    ? connections.filter((c) => (c.name || "").toLowerCase().includes(search.toLowerCase()) || (c.specialization || "").toLowerCase().includes(search.toLowerCase()))
    : connections;

  const invalidateAll = () => {
    ["my-connections","requests-received","requests-sent","blocked-users","discover-users"]
      .forEach((k) => queryClient.invalidateQueries({ queryKey: [k] }));
  };

  const acceptMutation  = useMutation({ mutationFn: (id) => apiPost("/api/v1/connections/requests/" + id + "/accept", {}),  onSuccess: () => { invalidateAll(); showToast("Request accepted!"); },    onError: (e) => showToast(e.message || "Failed", "error") });
  const rejectMutation  = useMutation({ mutationFn: (id) => apiPost("/api/v1/connections/requests/" + id + "/reject", {}),  onSuccess: () => { invalidateAll(); showToast("Request rejected."); },   onError: (e) => showToast(e.message || "Failed", "error") });
  const cancelMutation  = useMutation({ mutationFn: (id) => del("/api/v1/connections/requests/" + id + "/cancel"),           onSuccess: () => { invalidateAll(); showToast("Request cancelled."); }, onError: (e) => showToast(e.message || "Failed", "error") });
  const removeMutation  = useMutation({ mutationFn: (id) => del("/api/v1/connections/" + id),                                onSuccess: () => { invalidateAll(); showToast("Connection removed."); }, onError: (e) => showToast(e.message || "Failed", "error") });
  const blockMutation   = useMutation({ mutationFn: (uid) => apiPost("/api/v1/connections/" + uid + "/block", {}),           onSuccess: () => { invalidateAll(); showToast("User blocked."); },      onError: (e) => showToast(e.message || "Failed", "error") });
  const unblockMutation = useMutation({ mutationFn: (uid) => del("/api/v1/connections/" + uid + "/unblock"),                 onSuccess: () => { invalidateAll(); showToast("User unblocked."); },    onError: (e) => showToast(e.message || "Failed", "error") });
  const messageMutation = useMutation({
    mutationFn: (uid) => apiPost("/api/v1/chat/conversations/" + uid, {}),
    onSuccess: () => router.push("/doctor/network/messages"),
    onError: (e) => showToast(e.message || "Failed to open chat", "error"),
  });

  const subTabs = [
    { id: "connections", label: "My Connections", count: connections.length,  icon: <Icons.network /> },
    { id: "received",    label: "Received",       count: received.length,     icon: <Icons.connect /> },
    { id: "sent",        label: "Sent",           count: sent.length,         icon: <Icons.send /> },
    { id: "blocked",     label: "Blocked",        count: blocked.length,      icon: <Icons.block /> },
  ];

  return (
    <div className="space-y-5 min-w-0 overflow-x-hidden">
      {/* Tab bar */}
      <div className="flex items-center gap-2 flex-wrap">
        {subTabs.map((t) => (
          <button key={t.id} onClick={() => { setSubTab(t.id); setSearch(""); }}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-semibold text-sm transition-all ${
              subTab === t.id ? "bg-indigo-600 text-white shadow-sm" : "bg-white text-gray-600 border border-gray-200 hover:border-indigo-300"
            }`}>
            {t.icon}
            {t.label}
            {t.count > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${subTab === t.id ? "bg-white/20 text-white" : "bg-indigo-100 text-indigo-700"}`}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Connections ── */}
      {subTab === "connections" && (
        <>
          {/* Search */}
          {connections.length > 0 && (
            <div className="relative max-w-sm">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Search connections..."
                className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-200" />
            </div>
          )}

          {connLoading ? <GridSkeleton /> :
           filteredConnections.length === 0 ? (
            <EmptyState icon="🤝"
              text={search ? "No connections match your search" : "No connections yet"}
              sub={search ? "Try a different name" : "Discover doctors to connect with"} />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {filteredConnections.map((c) => (
                <div key={c.user_id} className="bg-white rounded-2xl p-5 border border-gray-100 hover:shadow-md transition-all flex flex-col">
                  {/* Header */}
                  <button onClick={() => setViewingUserId(c.user_id)} className="flex items-center gap-3 mb-3 text-left group">
                    <AvatarCircle name={c.name} size="md" />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900 text-sm truncate group-hover:text-indigo-600 transition-colors">{c.name}</p>
                      <p className="text-xs text-gray-400 truncate">{c.specialization || "Doctor"}</p>
                    </div>
                  </button>

                  {/* Info */}
                  <div className="flex-1 space-y-1 mb-4">
                    {c.hospital && (
                      <p className="text-xs text-gray-500 flex items-center gap-1.5 truncate">
                        <svg className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                        {c.hospital}
                      </p>
                    )}
                    {c.connected_at && (
                      <p className="text-[10px] text-gray-400">Connected {new Date(c.connected_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button onClick={() => messageMutation.mutate(c.user_id)} disabled={messageMutation.isPending}
                      className="flex-1 flex items-center justify-center gap-1.5 text-xs border border-indigo-200 text-indigo-600 hover:bg-indigo-50 font-semibold py-2 rounded-xl transition-all disabled:opacity-50">
                      <Icons.message /> Message
                    </button>
                    <button onClick={() => { if (confirm("Remove " + c.name + "?")) removeMutation.mutate(c.connection_id || c.user_id); }}
                      className="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 border border-gray-200 hover:border-red-200 rounded-xl transition-all" title="Remove">
                      <Icons.trash />
                    </button>
                    <button onClick={() => { if (confirm("Block " + c.name + "?")) blockMutation.mutate(c.user_id); }} disabled={blockMutation.isPending}
                      className="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 border border-gray-200 hover:border-red-200 rounded-xl transition-all disabled:opacity-50" title="Block">
                      <Icons.block />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Received Requests ── */}
      {subTab === "received" && (
        recvLoading ? <ListSkeleton /> :
        received.length === 0 ? <EmptyState icon="📬" text="No pending requests" sub="Connection requests from other doctors will appear here" /> :
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {received.map((r) => (
            <div key={r.connection_id} className="bg-white rounded-2xl p-5 border border-gray-100 hover:shadow-sm transition-all">
              <div className="flex items-center gap-3 mb-4">
                <AvatarCircle name={r.requester_name} />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 text-sm truncate">{r.requester_name}</p>
                  <p className="text-xs text-gray-400">{r.requester_specialization || "Doctor"}</p>
                </div>
                <span className="text-[10px] text-yellow-600 bg-yellow-50 border border-yellow-200 px-2 py-0.5 rounded-full font-bold flex-shrink-0">Pending</span>
              </div>
              {r.created_at && <p className="text-[10px] text-gray-400 mb-3">Sent {new Date(r.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</p>}
              <div className="flex gap-2">
                <button onClick={() => acceptMutation.mutate(r.connection_id)} disabled={acceptMutation.isPending}
                  className="flex-1 flex items-center justify-center gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl transition-all disabled:opacity-50">
                  <Icons.check /> Accept
                </button>
                <button onClick={() => rejectMutation.mutate(r.connection_id)} disabled={rejectMutation.isPending}
                  className="flex-1 flex items-center justify-center gap-1.5 text-xs border border-gray-200 text-gray-600 hover:bg-gray-50 font-semibold py-2.5 rounded-xl transition-all disabled:opacity-50">
                  <Icons.close /> Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Sent Requests ── */}
      {subTab === "sent" && (
        sentLoading ? <ListSkeleton /> :
        sent.length === 0 ? <EmptyState icon="📤" text="No sent requests" sub="Requests you send to other doctors will appear here" /> :
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {sent.map((r) => (
            <div key={r.connection_id} className="bg-white rounded-2xl p-5 border border-gray-100 hover:shadow-sm transition-all">
              <div className="flex items-center gap-3 mb-4">
                <AvatarCircle name={r.receiver_name || r.requester_name} />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 text-sm truncate">{r.receiver_name || r.requester_name || "Doctor"}</p>
                  <p className="text-xs text-gray-400">{r.receiver_specialization || r.requester_specialization || "Doctor"}</p>
                </div>
              </div>
              {r.created_at && <p className="text-[10px] text-gray-400 mb-3">Sent {new Date(r.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</p>}
              <div className="flex items-center justify-between">
                <span className="text-xs text-yellow-600 bg-yellow-50 border border-yellow-200 px-3 py-1.5 rounded-xl font-semibold">⏳ Awaiting response</span>
                <button onClick={() => cancelMutation.mutate(r.connection_id)} disabled={cancelMutation.isPending}
                  className="text-xs text-red-400 hover:text-red-600 font-semibold px-3 py-1.5 rounded-xl hover:bg-red-50 transition-all disabled:opacity-50">
                  Cancel
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Blocked ── */}
      {subTab === "blocked" && (
        blockedLoading ? <ListSkeleton count={3} /> :
        blocked.length === 0 ? <EmptyState icon="🚫" text="No blocked users" sub="Users you block will appear here" /> :
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {blocked.map((u) => (
            <div key={u.user_id} className="bg-white rounded-2xl p-5 border border-red-50 hover:shadow-sm transition-all">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 bg-gradient-to-br from-gray-400 to-gray-500">
                  {(u.name || "").split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 text-sm truncate">{u.name}</p>
                  <p className="text-xs text-gray-400">{u.specialization || "Doctor"}</p>
                </div>
                <span className="text-[10px] bg-red-50 text-red-500 border border-red-200 px-2 py-0.5 rounded-full font-bold flex-shrink-0">Blocked</span>
              </div>
              <button onClick={() => { if (confirm("Unblock " + u.name + "?")) unblockMutation.mutate(u.user_id); }} disabled={unblockMutation.isPending}
                className="w-full text-xs border border-indigo-200 text-indigo-600 hover:bg-indigo-50 font-semibold py-2 rounded-xl transition-all disabled:opacity-50">
                Unblock
              </button>
            </div>
          ))}
        </div>
      )}

      {viewingUserId && <UserProfileModal userId={viewingUserId} onClose={() => setViewingUserId(null)} />}
    </div>
  );
}
