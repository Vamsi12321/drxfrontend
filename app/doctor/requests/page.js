"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getRequests, advanceStatus, statusMeta } from "@/lib/orderStore";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "PENDING", label: "Pending" },
  { id: "APPROVED", label: "Approved" },
  { id: "SHIPPED", label: "Shipped" },
  { id: "REJECTED", label: "Rejected" },
];

export default function MyRequestsPage() {
  const router = useRouter();
  const [requests, setRequests] = useState([]);
  const [filter, setFilter] = useState("all");

  const load = () => setRequests(getRequests());

  useEffect(() => {
    load();
    const handler = () => load();
    window.addEventListener("drx-requests-updated", handler);
    return () => window.removeEventListener("drx-requests-updated", handler);
  }, []);

  const filtered = filter === "all" ? requests : requests.filter((r) => r.status === filter);

  const counts = {
    all: requests.length,
    PENDING: requests.filter((r) => r.status === "PENDING").length,
    APPROVED: requests.filter((r) => r.status === "APPROVED").length,
    SHIPPED: requests.filter((r) => r.status === "SHIPPED").length,
    REJECTED: requests.filter((r) => r.status === "REJECTED").length,
  };

  // Demo helper — simulate MR/admin action to progress the request
  const demoAdvance = (req) => {
    let next;
    if (req.status === "PENDING") next = "APPROVED";
    else if (req.status === "APPROVED") next = "SHIPPED";
    else if (req.status === "SHIPPED") next = "DELIVERED";
    if (next) { advanceStatus(req.id, next); load(); }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">My Medicine Requests</h1>
          <p className="text-sm text-gray-500">Track your drug orders and their approval &amp; delivery status</p>
        </div>
        <button onClick={() => router.push("/doctor/drug-search")}
          className="flex items-center gap-1.5 bg-[#5b2bce] hover:bg-[#4318d1] text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-all self-start">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          New Request
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {FILTERS.map((f) => (
          <button key={f.id} onClick={() => setFilter(f.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${filter === f.id ? "bg-[#5b2bce] text-white" : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"}`}>
            {f.label}
            <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${filter === f.id ? "bg-white/20" : "bg-gray-100 text-gray-500"}`}>{counts[f.id] ?? 0}</span>
          </button>
        ))}
      </div>

      {/* Empty */}
      {filtered.length === 0 && (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
          <svg className="w-12 h-12 text-gray-200 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
          <p className="text-gray-500 font-medium">No requests {filter !== "all" ? `with status "${statusMeta(filter).label}"` : "yet"}</p>
          <p className="text-gray-400 text-xs mt-1">Order a medicine from the Medicines Library to get started.</p>
        </div>
      )}

      {/* Request cards */}
      <div className="space-y-3">
        {filtered.map((req) => {
          const meta = statusMeta(req.status);
          return (
            <div key={req.id} className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-sm transition-all">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-11 h-11 bg-[#eef0f9] rounded-xl flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-[#5b2bce]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold text-gray-900 capitalize">{req.drug_name}</p>
                      <span className="font-mono text-[10px] text-gray-400">{req.id}</span>
                    </div>
                    <p className="text-[11px] text-gray-500 mt-0.5">{[req.drug_form, req.drug_strength].filter(Boolean).join(" · ")} · {req.quantity} {req.unit}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">Requested {new Date(req.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}{req.org_name ? ` · ${req.org_name}` : ""}</p>
                  </div>
                </div>
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border flex-shrink-0 ${meta.cls}`}>{meta.label}</span>
              </div>

              {/* Timeline */}
              <div className="flex items-center justify-between px-1 mb-3">
                {req.timeline.map((t, i) => (
                  <div key={t.label} className="flex flex-col items-center flex-1 relative">
                    {i < req.timeline.length - 1 && (
                      <div className={`absolute top-2.5 left-1/2 w-full h-0.5 ${req.timeline[i + 1].done ? "bg-green-400" : "bg-gray-200"}`} />
                    )}
                    <div className={`relative z-10 w-5 h-5 rounded-full flex items-center justify-center ${t.done ? "bg-green-500" : "bg-gray-200"}`}>
                      {t.done && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                    </div>
                    <span className={`text-[8px] mt-1.5 text-center leading-tight ${t.done ? "text-gray-600 font-medium" : "text-gray-300"}`}>{t.label}</span>
                  </div>
                ))}
              </div>

              {req.status === "REJECTED" && req.rejected_reason && (
                <div className="bg-red-50 border border-red-100 rounded-lg px-3 py-2 text-[11px] text-red-600 mb-3">
                  {req.rejected_reason}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                {req.status === "SHIPPED" && (
                  <button onClick={() => router.push(`/doctor/requests/${req.id}`)}
                    className="text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>
                    Track Shipment
                  </button>
                )}
                <button onClick={() => router.push(`/doctor/requests/${req.id}`)}
                  className="text-xs text-[#5b2bce] hover:bg-purple-50 px-3 py-1.5 rounded-lg font-semibold transition-all">
                  View Details
                </button>

                {/* Demo-only: simulate MR/admin progressing the request */}
                {["PENDING", "APPROVED", "SHIPPED"].includes(req.status) && (
                  <button onClick={() => demoAdvance(req)}
                    className="ml-auto text-[10px] text-gray-400 hover:text-[#5b2bce] px-2 py-1 rounded-lg transition-all"
                    title="Demo: simulate next status">
                    ⚡ Simulate next step
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
