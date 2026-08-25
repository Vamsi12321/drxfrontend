"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { get, post as apiPost } from "@/lib/api";
import { timeAgoIST as timeAgo } from "@/lib/time";

export default function RequestsPage() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-pending-requests"],
    queryFn: () => get("/api/v1/doctor-requests/pending-approval"),
    staleTime: 30000,
  });

  const requests = data?.requests || [];
  const pendingCount = data?.total || requests.length;

  const approveMutation = useMutation({
    mutationFn: (requestId) => apiPost(`/api/v1/doctor-requests/${requestId}/approve`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-pending-requests"] }),
  });

  const rejectMutation = useMutation({
    mutationFn: (requestId) => apiPost(`/api/v1/doctor-requests/${requestId}/admin-reject`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-pending-requests"] }),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold" style={{ color: "#3b3a8a" }}>Requests</h1>
          <p className="text-gray-500 text-xs sm:text-sm mt-0.5">Doctor-accepted requests awaiting admin approval</p>
        </div>
        {pendingCount > 0 && (
          <span className="bg-orange-50 text-orange-600 px-3 py-1.5 rounded-lg text-sm font-semibold border border-orange-100">
            {pendingCount} pending
          </span>
        )}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-3">{[1,2,3].map((i) => <div key={i} className="h-24 bg-white rounded-xl animate-pulse border border-gray-100" />)}</div>
      )}

      {/* Request Cards */}
      {!isLoading && requests.length > 0 && (
        <div className="space-y-4">
          {requests.map((req) => (
            <div key={req.id} className="bg-white rounded-xl border border-orange-200 shadow-sm p-5 transition-all">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 bg-orange-50 text-orange-600">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-800">Doctor: <span className="font-mono text-xs text-gray-600">{req.doctor_gid || req.doctor_id?.slice(-8) || "..."}</span></p>
                    <p className="text-xs text-gray-500 mt-0.5">Organization: <span className="font-semibold text-gray-700">{req.organization_name || req.organization_id?.slice(-8) || "..."}</span></p>
                    <p className="text-xs text-gray-400 mt-0.5">Requested by: <span className="font-medium text-gray-500">{req.requested_by || "—"}</span></p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <p className="text-[10px] text-gray-400">Created: {req.created_at ? timeAgo(req.created_at) : "—"}</p>
                      {req.doctor_responded_at && <p className="text-[10px] text-green-500">Doctor accepted: {timeAgo(req.doctor_responded_at)}</p>}
                    </div>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-600">PENDING ADMIN</span>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 mt-4 pt-4 border-t border-gray-100">
                <button onClick={() => approveMutation.mutate(req.id)}
                  disabled={approveMutation.isPending || rejectMutation.isPending}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold transition-all disabled:opacity-50">
                  Approve & Link
                </button>
                <button onClick={() => { if (confirm("Reject this request?")) rejectMutation.mutate(req.id); }}
                  disabled={approveMutation.isPending || rejectMutation.isPending}
                  className="px-4 py-2 border border-red-200 text-red-600 hover:bg-red-50 rounded-lg text-sm font-semibold transition-all disabled:opacity-50">
                  Reject
                </button>
                <p className="text-xs text-gray-400 sm:ml-auto mt-1 sm:mt-0">Approving links doctor to org & syncs to MRX</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && requests.length === 0 && (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
          <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <p className="text-gray-500 font-medium">No pending requests</p>
          <p className="text-gray-400 text-xs mt-1">All doctor-organization link requests have been processed.</p>
        </div>
      )}
    </div>
  );
}
