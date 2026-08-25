"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { timeAgoIST as timeAgo } from "@/lib/time";

const BASE_PATH = "/drx";

async function doboGet(path) {
  const res = await fetch(`${BASE_PATH}/api/v1/dobo/${path}`, { credentials: "include" });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).detail || "Request failed");
  return res.json();
}

async function doboPost(path) {
  const res = await fetch(`${BASE_PATH}/api/v1/dobo/${path}`, { method: "POST", credentials: "include" });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).detail || "Request failed");
  return res.json();
}

export default function OnboardingPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [syncFilter, setSyncFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [retryingId, setRetryingId] = useState(null);

  const limit = 20;
  const params = new URLSearchParams();
  params.set("page", page);
  params.set("limit", limit);
  if (syncFilter) params.set("sync_status", syncFilter);
  if (sourceFilter) params.set("source", sourceFilter);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["dobo-doctors", page, syncFilter, sourceFilter],
    queryFn: () => doboGet(`doctors?${params.toString()}`),
    staleTime: 30000,
  });

  const doctors = data?.doctors || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / limit);

  // Retry single
  const retrySingleMutation = useMutation({
    mutationFn: (onboardingId) => {
      setRetryingId(onboardingId);
      return doboPost(`retry-sync/${onboardingId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dobo-doctors"] });
      setRetryingId(null);
    },
    onError: () => setRetryingId(null),
  });

  // Retry all
  const retryAllMutation = useMutation({
    mutationFn: () => doboPost("retry-sync-all"),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["dobo-doctors"] }),
  });

  const syncStatusBadge = (status) => {
    switch (status) {
      case "SYNCED": return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-50 text-green-600 border border-green-200">SYNCED</span>;
      case "FAILED": return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-500 border border-red-200">FAILED</span>;
      case "PENDING": return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-yellow-50 text-yellow-600 border border-yellow-200">PENDING</span>;
      default: return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-50 text-gray-500">{status || "—"}</span>;
    }
  };

  const sourceBadge = (source) => {
    if (source === "VOICE") return <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-purple-50 text-purple-600">VOICE</span>;
    if (source === "MANUAL") return <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600">MANUAL</span>;
    return <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-gray-50 text-gray-500">{source || "—"}</span>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold" style={{ color: "#3b3a8a" }}>Doctor Onboarding</h1>
          <p className="text-gray-500 text-xs sm:text-sm mt-0.5">Doctors registered via DOBO (Voice & Manual) — DRX sync status</p>
        </div>
        <div className="flex items-center gap-2">
          {isFetching && !isLoading && (
            <svg className="animate-spin w-4 h-4 text-purple-500" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
          )}
          <button onClick={() => retryAllMutation.mutate()} disabled={retryAllMutation.isPending}
            className="px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs sm:text-sm font-semibold transition-all disabled:opacity-50 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            {retryAllMutation.isPending ? "Retrying..." : "Retry All Failed"}
          </button>
        </div>
      </div>

      {/* Retry all result */}
      {retryAllMutation.isSuccess && retryAllMutation.data && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700">
          {JSON.stringify(retryAllMutation.data)}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select value={syncFilter} onChange={(e) => { setSyncFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-200 bg-white">
          <option value="">All Sync Status</option>
          <option value="SYNCED">Synced</option>
          <option value="FAILED">Failed</option>
          <option value="PENDING">Pending</option>
        </select>
        <select value={sourceFilter} onChange={(e) => { setSourceFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-200 bg-white">
          <option value="">All Sources</option>
          <option value="VOICE">Voice</option>
          <option value="MANUAL">Manual</option>
        </select>
        <div className="ml-auto flex items-center gap-2 text-xs text-gray-500">
          <span className="font-semibold">{total}</span> doctors total
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-3">{[1,2,3,4,5].map((i) => <div key={i} className="h-16 bg-white rounded-xl animate-pulse border border-gray-100" />)}</div>
      ) : doctors.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
          <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          <p className="text-gray-500 font-medium">No onboarded doctors found</p>
          <p className="text-gray-400 text-xs mt-1">Adjust filters or check DOBO service.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Doctor</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Contact</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Hospital</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Source</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Sync Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Registered</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {doctors.map((doc) => (
                <tr key={doc.onboarding_id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3">
                    <p className="text-sm font-semibold text-gray-900">{doc.doctor_name || "—"}</p>
                    <p className="text-[10px] text-gray-400 font-mono">{doc.username || "—"}</p>
                    {doc.specialization && <p className="text-[10px] text-purple-500 mt-0.5">{doc.specialization}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-xs text-gray-700">{doc.email || "—"}</p>
                    <p className="text-[10px] text-gray-400">{doc.phone || "—"}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-xs text-gray-700">{doc.hospital || "—"}</p>
                    {doc.location?.city && <p className="text-[10px] text-gray-400">{doc.location.city}{doc.location.state ? `, ${doc.location.state}` : ""}</p>}
                  </td>
                  <td className="px-4 py-3">{sourceBadge(doc.source)}</td>
                  <td className="px-4 py-3">
                    {syncStatusBadge(doc.sync_status)}
                    {doc.sync_error && <p className="text-[9px] text-red-400 mt-1 max-w-[150px] truncate" title={doc.sync_error}>{doc.sync_error}</p>}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">
                    {doc.created_at ? timeAgo(doc.created_at) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {doc.sync_status === "FAILED" && (
                      <button onClick={() => retrySingleMutation.mutate(doc.onboarding_id)}
                        disabled={retryingId === doc.onboarding_id}
                        className="text-xs text-orange-600 hover:text-orange-700 font-semibold hover:bg-orange-50 px-2 py-1 rounded-lg transition-all disabled:opacity-50 flex items-center gap-1">
                        {retryingId === doc.onboarding_id ? (
                          <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                        ) : (
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                        )}
                        Retry
                      </button>
                    )}
                    {doc.sync_status === "SYNCED" && (
                      <span className="text-[10px] text-green-500 font-medium">✓ Synced</span>
                    )}
                    {doc.sync_status === "PENDING" && (
                      <span className="text-[10px] text-yellow-500 font-medium">Waiting...</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {(totalPages > 1 || page > 1) && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
            ← Prev
          </button>
          <span className="text-sm text-gray-500 px-2">Page {page}{totalPages > 0 ? ` of ${totalPages}` : ""}</span>
          <button onClick={() => setPage(page + 1)} disabled={page >= totalPages}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
