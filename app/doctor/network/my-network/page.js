"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { get, post as apiPost, del } from "@/lib/api";
import { Icons } from "@/components/network/Icons";
import UserProfileModal from "@/components/network/UserProfileModal";
import { useNetworkToast } from "@/app/doctor/network/layout";

function Avatar({ name, role }) {
  return (
    <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0 bg-gradient-to-br from-indigo-500 to-purple-500">
      {name?.split(" ").map((n) => n[0]).join("").slice(0, 2)}
    </div>
  );
}

function EmptyState({ text }) {
  return (
    <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-200">
      <span className="text-4xl">🤝</span>
      <p className="text-gray-400 mt-3 text-sm">{text}</p>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="space-y-2">
      {[1,2,3].map((i) => <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />)}
    </div>
  );
}

export default function MyNetworkPage() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { showToast } = useNetworkToast();
  const [subTab, setSubTab] = useState("connections");
  const [viewingUserId, setViewingUserId] = useState(null);

  const { data: connData,    isLoading: connLoading }    = useQuery({ queryKey: ["my-connections"],    queryFn: () => get("/api/v1/connections?limit=50"),                                    staleTime: 0 });
  const { data: recvData,    isLoading: recvLoading }    = useQuery({ queryKey: ["requests-received"], queryFn: () => get("/api/v1/connections/requests/received?limit=50"),                staleTime: 0 });
  const { data: sentData,    isLoading: sentLoading }    = useQuery({ queryKey: ["requests-sent"],     queryFn: () => get("/api/v1/connections/requests/sent?limit=50"),                    staleTime: 0 });
  const { data: blockedData, isLoading: blockedLoading } = useQuery({ queryKey: ["blocked-users"],     queryFn: () => get("/api/v1/connections?status=blocked&limit=50"),                   staleTime: 0 });

  const connections = connData?.connections    || [];
  const received    = recvData?.requests       || [];
  const sent        = sentData?.requests       || [];
  const blocked     = blockedData?.connections || [];

  const invalidateAll = () => {
    ["my-connections","requests-received","requests-sent","blocked-users","discover-users"].forEach(
      (k) => queryClient.invalidateQueries({ queryKey: [k] })
    );
  };

  const acceptMutation  = useMutation({ mutationFn: (id)  => apiPost("/api/v1/connections/requests/" + id + "/accept", {}), onSuccess: () => { invalidateAll(); showToast("Request accepted!"); }, onError: (e) => showToast(e.message || "Failed", "error") });
  const rejectMutation  = useMutation({ mutationFn: (id)  => apiPost("/api/v1/connections/requests/" + id + "/reject", {}), onSuccess: () => { invalidateAll(); showToast("Request rejected."); }, onError: (e) => showToast(e.message || "Failed", "error") });
  const cancelMutation  = useMutation({ mutationFn: (id)  => del("/api/v1/connections/requests/" + id + "/cancel"),         onSuccess: () => { invalidateAll(); showToast("Request cancelled."); }, onError: (e) => showToast(e.message || "Failed", "error") });
  const removeMutation  = useMutation({ mutationFn: (id)  => del("/api/v1/connections/" + id),                              onSuccess: () => { invalidateAll(); showToast("Connection removed."); }, onError: (e) => showToast(e.message || "Failed", "error") });
  const blockMutation   = useMutation({ mutationFn: (uid) => apiPost("/api/v1/connections/" + uid + "/block", {}),           onSuccess: () => { invalidateAll(); showToast("User blocked."); }, onError: (e) => showToast(e.message || "Failed", "error") });
  const unblockMutation = useMutation({ mutationFn: (uid) => del("/api/v1/connections/" + uid + "/unblock"),                 onSuccess: () => { invalidateAll(); showToast("User unblocked."); }, onError: (e) => showToast(e.message || "Failed", "error") });
  const messageMutation = useMutation({
    mutationFn: (uid) => apiPost("/api/v1/chat/conversations/" + uid, {}),
    onSuccess: () => router.push("/doctor/network/messages"),
    onError: (e) => showToast(e.message || "Failed to open chat", "error"),
  });

  const subTabs = [
    { id: "connections", label: "Connections", count: connections.length },
    { id: "received",    label: "Received",    count: received.length },
    { id: "sent",        label: "Sent",         count: sent.length },
    { id: "blocked",     label: "Blocked",      count: blocked.length },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-3">
      {/* Sub-tab bar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-1 flex gap-1 overflow-x-auto">
        {subTabs.map((t) => (
          <button key={t.id} onClick={() => setSubTab(t.id)}
            className={"flex items-center gap-1.5 px-3 py-2 rounded-lg font-semibold text-xs whitespace-nowrap transition-all " + (subTab === t.id ? "bg-indigo-600 text-white shadow" : "text-gray-500 hover:bg-gray-50")}>
            {t.id === "connections" && <Icons.network />}
            {t.id === "received"    && <Icons.connect />}
            {t.id === "sent"        && <Icons.send />}
            {t.id === "blocked"     && <Icons.block />}
            {t.label}
            {t.count > 0 && (
              <span className={"text-xs px-1.5 py-0.5 rounded-full font-bold " + (subTab === t.id ? "bg-white/20 text-white" : "bg-indigo-100 text-indigo-700")}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Connections */}
      {subTab === "connections" && (
        connLoading ? <Skeleton /> :
        connections.length === 0 ? <EmptyState text="No connections yet. Discover people to connect with." /> :
        <div className="space-y-2">
          {connections.map((c) => (
            <div key={c.user_id} className="bg-white rounded-xl p-3 shadow-sm border border-gray-200 flex items-center gap-3">
              <button onClick={() => setViewingUserId(c.user_id)} className="flex items-center gap-2.5 flex-1 min-w-0 text-left">
                <Avatar name={c.name} role={c.role} />
                <div className="min-w-0">
                  <p className="font-bold text-gray-900 text-sm truncate hover:text-indigo-600 transition-colors">{c.name}</p>
                  <p className="text-xs text-gray-400">{c.specialization || c.territory || c.role}</p>
                </div>
              </button>
              <span className="text-xs px-2 py-0.5 rounded-md font-bold flex-shrink-0 bg-indigo-100 text-indigo-700">
                Doctor
              </span>
              <div className="flex gap-1.5 flex-shrink-0">
                <button onClick={() => messageMutation.mutate(c.user_id)} disabled={messageMutation.isPending}
                  className="flex items-center gap-1 text-xs border border-indigo-200 text-indigo-600 hover:bg-indigo-50 font-semibold px-2 py-1.5 rounded-lg transition-all disabled:opacity-50">
                  <Icons.message /> Msg
                </button>
                <button onClick={() => { if (confirm("Remove connection?")) removeMutation.mutate(c.connection_id || c.user_id); }}
                  className="flex items-center gap-1 text-xs border border-gray-200 text-gray-500 hover:text-red-500 hover:border-red-200 hover:bg-red-50 font-semibold px-2 py-1.5 rounded-lg transition-all">
                  <Icons.trash /> Remove
                </button>
                <button onClick={() => { if (confirm("Block " + c.name + "?")) blockMutation.mutate(c.user_id); }}
                  disabled={blockMutation.isPending}
                  className="flex items-center gap-1 text-xs border border-gray-200 text-gray-500 hover:text-red-500 hover:border-red-200 hover:bg-red-50 font-semibold px-2 py-1.5 rounded-lg transition-all disabled:opacity-50">
                  <Icons.block /> Block
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Received requests */}
      {subTab === "received" && (
        recvLoading ? <Skeleton /> :
        received.length === 0 ? <EmptyState text="No pending requests." /> :
        <div className="space-y-2">
          {received.map((r) => (
            <div key={r.connection_id} className="bg-white rounded-xl p-3 shadow-sm border border-gray-200 flex items-center gap-3">
              <Avatar name={r.requester_name} role={r.requester_role} />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-900 text-sm truncate">{r.requester_name}</p>
                <p className="text-xs text-gray-400">{r.requester_specialization || r.requester_role}</p>
              </div>
              <div className="flex gap-1.5 flex-shrink-0">
                <button onClick={() => acceptMutation.mutate(r.connection_id)} disabled={acceptMutation.isPending}
                  className="flex items-center gap-1 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-2.5 py-1.5 rounded-lg transition-all disabled:opacity-50">
                  <Icons.check /> Accept
                </button>
                <button onClick={() => rejectMutation.mutate(r.connection_id)} disabled={rejectMutation.isPending}
                  className="flex items-center gap-1 text-xs border border-gray-200 text-gray-500 hover:bg-gray-50 font-semibold px-2.5 py-1.5 rounded-lg transition-all disabled:opacity-50">
                  <Icons.close /> Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Sent requests */}
      {subTab === "sent" && (
        sentLoading ? <Skeleton /> :
        sent.length === 0 ? <EmptyState text="No sent requests." /> :
        <div className="space-y-2">
          {sent.map((r) => (
            <div key={r.connection_id} className="bg-white rounded-xl p-3 shadow-sm border border-gray-200 flex items-center gap-3">
              <Avatar name={r.receiver_name || r.requester_name} role={r.receiver_role || r.requester_role} />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-900 text-sm truncate">{r.receiver_name || r.requester_name || "Doctor"}</p>
                <p className="text-xs text-gray-400">{r.receiver_specialization || r.requester_specialization || ""}</p>
              </div>
              <span className="text-xs text-yellow-600 bg-yellow-50 border border-yellow-200 px-2 py-0.5 rounded-md font-semibold flex-shrink-0">Pending</span>
              <button onClick={() => cancelMutation.mutate(r.connection_id)} disabled={cancelMutation.isPending}
                className="text-xs text-red-400 hover:text-red-600 font-semibold px-2 py-1.5 rounded-lg hover:bg-red-50 transition-all disabled:opacity-50 flex-shrink-0">
                Cancel
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Blocked */}
      {subTab === "blocked" && (
        blockedLoading ? <Skeleton /> :
        blocked.length === 0 ? <EmptyState text="No blocked users." /> :
        <div className="space-y-2">
          {blocked.map((u) => (
            <div key={u.user_id} className="bg-white rounded-xl p-3 shadow-sm border border-gray-200 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0 bg-gradient-to-br from-gray-400 to-gray-500">
                {u.name?.split(" ").map((n) => n[0]).join("").slice(0, 2)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-900 text-sm truncate">{u.name}</p>
                <p className="text-xs text-gray-400">{u.specialization || u.role}</p>
              </div>
              <span className="text-xs bg-red-50 text-red-500 border border-red-200 px-2 py-0.5 rounded-md font-semibold flex-shrink-0">Blocked</span>
              <button onClick={() => { if (confirm("Unblock " + u.name + "?")) unblockMutation.mutate(u.user_id); }}
                disabled={unblockMutation.isPending}
                className="text-xs border border-indigo-200 text-indigo-600 hover:bg-indigo-50 font-semibold px-2.5 py-1.5 rounded-lg transition-all disabled:opacity-50 flex-shrink-0">
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
