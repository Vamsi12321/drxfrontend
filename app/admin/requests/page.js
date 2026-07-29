"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { get, put } from "@/lib/api";

export default function RequestsPage() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-requests"],
    queryFn: () => get("/api/v1/doctor-organizations?status=PENDING&limit=100"),
    staleTime: 30000,
  });

  const requests = data?.relationships || [];
  const pendingCount = requests.length;

  const updateStatusMutation = useMutation({
    mutationFn: ({ relId, status }) => put(`/api/v1/doctor-organizations/${relId}/status`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-requests"] }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "#3b3a8a" }}>Requests</h1>
          <p className="text-gray-500 text-sm mt-0.5">Incoming requests from MRX organizations to link doctors</p>
        </div>
        {pendingCount > 0 && (
          <span className="bg-orange-50 text-orange-600 px-3 py-1.5 rounded-lg text-sm font-semibold border border-orange-100">
            {pendingCount} pending
          </span>
        )}
      </div>

      {/* Request Cards */}
      <div className="space-y-4">
        {requests.map((req) => (
          <div key={req.id} className="bg-white rounded-xl border border-orange-200 shadow-sm p-5 transition-all">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 bg-orange-50 text-orange-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-800">Doctor: {req.doctor_id?.slice(-8) || "..."}</p>
                  <p className="text-xs text-gray-500">Organization: {req.organization_id?.slice(-8) || "..."}</p>
                  <p className="text-xs text-gray-400 mt-1">Requested: {req.requested_at ? new Date(req.requested_at).toLocaleString() : "—"}</p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-orange-50 text-orange-600">PENDING</span>
            </div>
            <div className="flex items-center gap-3 mt-4 pt-4 border-t border-gray-100">
              <button onClick={() => updateStatusMutation.mutate({ relId: req.id, status: "ACTIVE" })}
                disabled={updateStatusMutation.isPending}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold transition-all disabled:opacity-50">
                Approve & Notify Doctor
              </button>
              <button onClick={() => updateStatusMutation.mutate({ relId: req.id, status: "REJECTED" })}
                disabled={updateStatusMutation.isPending}
                className="px-4 py-2 border border-red-200 text-red-600 hover:bg-red-50 rounded-lg text-sm font-semibold transition-all disabled:opacity-50">
                Reject
              </button>
              <p className="text-xs text-gray-400 ml-auto">Doctor will receive a notification to accept</p>
            </div>
          </div>
        ))}
        {requests.length === 0 && !isLoading && (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
            <p className="text-gray-400 text-sm">No pending requests.</p>
          </div>
        )}
      </div>
    </div>
  );
}
