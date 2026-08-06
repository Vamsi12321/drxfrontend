"use client";
import { useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { get, post as apiPost } from "@/lib/api";
import { Icons } from "@/components/network/Icons";
import { useNetworkToast } from "@/app/doctor/network/layout";

export default function DiscoverPage() {
  const queryClient = useQueryClient();
  const { showToast } = useNetworkToast();
  const [search, setSearch] = useState("");
  const [specializationFilter, setSpecialization] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["discover-users", page, specializationFilter, search],
    queryFn: () => {
      const params = new URLSearchParams({ page, limit: 20 });
      if (specializationFilter) params.append("specialization", specializationFilter);
      if (search) params.append("search", search);
      return get("/api/v1/connections/discover?" + params);
    },
    staleTime: 30000,
  });

  const users = data?.users || [];
  const total = data?.total || 0;
  const totalPages = data?.total_pages || 1;

  // Build specialization filter options from results
  const specializations = [...new Set(users.map((u) => u.specialization).filter(Boolean))].sort();

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["discover-users"] });
    queryClient.invalidateQueries({ queryKey: ["my-connections"] });
    queryClient.invalidateQueries({ queryKey: ["requests-sent"] });
  };

  const connectMutation = useMutation({
    mutationFn: (uid) => apiPost("/api/v1/connections/request/" + uid, {}),
    onSuccess: () => { invalidateAll(); showToast("Connection request sent!"); },
    onError: (err) => showToast(err.message || "Failed", "error"),
  });
  const blockMutation = useMutation({
    mutationFn: (uid) => apiPost("/api/v1/connections/" + uid + "/block", {}),
    onSuccess: () => { invalidateAll(); showToast("User blocked."); },
    onError: (err) => showToast(err.message || "Failed", "error"),
  });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Discover Doctors</h2>
          <p className="text-sm text-gray-400 mt-0.5">
            {total > 0 ? `${total} doctors available to connect` : "Find doctors to expand your network"}
          </p>
        </div>
      </div>

      {/* Search + Filter bar */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"><Icons.discover /></span>
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by name..."
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-200"
          />
        </div>
        {specializations.length > 0 && (
          <select
            value={specializationFilter}
            onChange={(e) => { setSpecialization(e.target.value); setPage(1); }}
            className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white outline-none focus:ring-2 focus:ring-indigo-200 min-w-[180px]"
          >
            <option value="">All Specializations</option>
            {specializations.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        )}
      </div>

      {/* Loading skeletons */}
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
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
      )}

      {/* Empty */}
      {!isLoading && users.length === 0 && (
        <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
          <span className="text-5xl block mb-3">🔍</span>
          <p className="text-gray-500 font-medium">No doctors found</p>
          <p className="text-gray-400 text-sm mt-1">Try a different search or clear filters</p>
        </div>
      )}

      {/* Doctor Cards Grid */}
      {!isLoading && users.length > 0 && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {users.map((u) => (
              <div key={u.user_id} className="bg-white rounded-2xl p-5 border border-gray-100 hover:shadow-md transition-all flex flex-col">
                {/* Avatar + Name */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 bg-gradient-to-br from-indigo-500 to-purple-600 shadow-sm">
                    {(u.name || "").split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 text-sm truncate">{u.name}</p>
                    <p className="text-xs text-gray-400 truncate">{u.specialization || "Doctor"}</p>
                  </div>
                </div>

                {/* Info */}
                <div className="space-y-1.5 mb-4 flex-1">
                  {u.hospital && (
                    <p className="text-xs text-gray-500 flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                      <span className="truncate">{u.hospital}</span>
                    </p>
                  )}
                  {(u.city || u.doctor_gid) && (
                    <p className="text-xs text-gray-400 flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                      <span className="truncate">{u.city || u.doctor_gid}</span>
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  {u.connection_status === "connected" ? (
                    <span className="flex-1 text-center text-xs bg-green-50 text-green-700 font-semibold px-3 py-2 rounded-xl border border-green-100">
                      ✓ Connected
                    </span>
                  ) : u.connection_status === "pending" ? (
                    <span className="flex-1 text-center text-xs bg-yellow-50 text-yellow-700 font-semibold px-3 py-2 rounded-xl border border-yellow-100">
                      Pending
                    </span>
                  ) : (
                    <button
                      onClick={() => connectMutation.mutate(u.user_id)}
                      disabled={connectMutation.isPending}
                      className="flex-1 flex items-center justify-center gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-3 py-2 rounded-xl transition-all disabled:opacity-50"
                    >
                      <Icons.connect /> Connect
                    </button>
                  )}
                  <button
                    onClick={() => { if (confirm(`Block ${u.name}?`)) blockMutation.mutate(u.user_id); }}
                    className="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 border border-gray-200 hover:border-red-200 rounded-xl transition-all"
                    title="Block"
                  >
                    <Icons.block />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-3">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:border-indigo-400 disabled:opacity-40 transition-all">
                ← Prev
              </button>
              <span className="text-gray-500 text-sm font-medium">{page} / {totalPages}</span>
              <button onClick={() => setPage((p) => p + 1)} disabled={page >= totalPages}
                className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:border-indigo-400 disabled:opacity-40 transition-all">
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
