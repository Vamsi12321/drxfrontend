"use client";
import { useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { get, post as apiPost } from "@/lib/api";
import { Icons } from "@/components/network/Icons";
import { useNetworkToast } from "@/app/doctor/network/layout";

export default function DiscoverPage() {
  const queryClient = useQueryClient();
  const { showToast } = useNetworkToast();
  const [search, setSearch]   = useState("");
  const [roleFilter, setRole] = useState("");
  const [page, setPage]       = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["discover-users", page, roleFilter, search],
    queryFn: () => {
      const params = new URLSearchParams({ page, limit: 20 });
      if (roleFilter) params.append("role", roleFilter);
      if (search)     params.append("search", search);
      return get("/api/v1/connections/discover?" + params);
    },
    staleTime: 30000,
  });

  const users      = data?.users       || [];
  const totalPages = data?.total_pages || 1;

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["discover-users"] });
    queryClient.invalidateQueries({ queryKey: ["my-connections"] });
    queryClient.invalidateQueries({ queryKey: ["requests-sent"] });
  };

  const connectMutation = useMutation({
    mutationFn: (uid) => apiPost("/api/v1/connections/request/" + uid, {}),
    onSuccess: () => { invalidateAll(); showToast("Connection request sent!"); },
    onError: (err) => showToast(err.message || "Failed to send request", "error"),
  });
  const blockMutation = useMutation({
    mutationFn: (uid) => apiPost("/api/v1/connections/" + uid + "/block", {}),
    onSuccess: () => { invalidateAll(); showToast("User blocked."); },
    onError: (err) => showToast(err.message || "Failed to block user", "error"),
  });

  return (
    <div className="max-w-2xl mx-auto space-y-3">
      {/* Search + filter bar */}
      <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-200 flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4"><Icons.discover /></span>
          <input type="text" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by name..."
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-200" />
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1,2,3,4].map((i) => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-200">
          <span className="text-4xl">🔍</span>
          <p className="text-gray-400 mt-3 text-sm">No users found.</p>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {users.map((u) => (
              <div key={u.user_id} className="bg-white rounded-xl p-3 shadow-sm border border-gray-200 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 bg-gradient-to-br from-indigo-500 to-purple-500">
                  {u.name?.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 text-sm truncate">{u.name}</p>
                  <p className="text-xs text-gray-400">{u.specialization || u.territory || u.role}{u.hospital ? " · " + u.hospital : ""}</p>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-md font-bold flex-shrink-0 bg-indigo-100 text-indigo-700">
                  Doctor
                </span>
                <div className="flex gap-1.5 flex-shrink-0">
                  {u.connection_status === "connected" ? (
                    <span className="text-xs bg-green-100 text-green-700 font-semibold px-2.5 py-1.5 rounded-lg">Connected</span>
                  ) : u.connection_status === "pending" ? (
                    <span className="text-xs bg-yellow-100 text-yellow-700 font-semibold px-2.5 py-1.5 rounded-lg">Pending</span>
                  ) : (
                    <button onClick={() => connectMutation.mutate(u.user_id)} disabled={connectMutation.isPending}
                      className="flex items-center gap-1 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-2.5 py-1.5 rounded-lg transition-all disabled:opacity-50">
                      <Icons.connect /> Connect
                    </button>
                  )}
                  <button onClick={() => { if (confirm("Block this user?")) blockMutation.mutate(u.user_id); }}
                    className="flex items-center gap-1 text-xs border border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-200 font-semibold px-2 py-1.5 rounded-lg transition-all">
                    <Icons.block />
                  </button>
                </div>
              </div>
            ))}
          </div>
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-3">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-gray-600 hover:border-indigo-400 disabled:opacity-40 transition-all">
                ← Prev
              </button>
              <span className="text-gray-500 text-xs">{page} / {totalPages}</span>
              <button onClick={() => setPage((p) => p + 1)} disabled={page >= totalPages}
                className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-gray-600 hover:border-indigo-400 disabled:opacity-40 transition-all">
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
