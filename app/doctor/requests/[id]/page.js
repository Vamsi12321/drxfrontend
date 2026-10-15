"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { getRequest, advanceStatus, statusMeta } from "@/lib/orderStore";

export default function RequestDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [req, setReq] = useState(null);

  const load = () => setReq(getRequest(id));
  useEffect(() => { load(); }, [id]);

  if (!req) {
    return (
      <div className="text-center py-20">
        <span className="text-4xl block mb-3">📦</span>
        <p className="text-gray-500 text-sm">Request not found.</p>
        <button onClick={() => router.push("/doctor/requests")} className="mt-4 text-[#5b2bce] font-semibold text-sm">← Back to My Requests</button>
      </div>
    );
  }

  const meta = statusMeta(req.status);
  const isShipped = req.status === "SHIPPED" || req.status === "DELIVERED";
  const tracking = req.tracking;

  return (
    <div className="space-y-4 max-w-5xl">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <button onClick={() => router.push("/doctor/requests")} className="flex items-center gap-1.5 text-sm text-[#5b2bce] font-medium">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg> Back
        </button>
        <span className={`text-[11px] font-bold px-3 py-1.5 rounded-full border ${meta.cls}`}>{meta.label}</span>
      </div>

      <div>
        <h1 className="text-xl font-bold text-gray-900">
          {isShipped ? "Order Confirmed" : "Request Details"}
        </h1>
        <p className="text-sm text-gray-500">
          Request <span className="font-mono font-semibold text-gray-700">{req.id}</span> · {new Date(req.created_at).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>

      <div className="flex gap-5 flex-col lg:flex-row">
        {/* ═══ Left — order details ═══ */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Drug + order info */}
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <div className="flex items-start gap-4 pb-4 border-b border-gray-100">
              <div className="w-14 h-14 bg-[#eef0f9] rounded-2xl flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-[#5b2bce]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
              </div>
              <div className="min-w-0">
                <p className="text-base font-bold text-gray-900 capitalize">{req.drug_name}</p>
                <p className="text-xs text-gray-500 capitalize">{[req.drug_form, req.drug_strength].filter(Boolean).join(" · ")}</p>
                <span className="inline-block mt-1 text-[10px] bg-indigo-50 text-[#5b2bce] px-2 py-0.5 rounded-full font-semibold">{req.quantity} {req.unit}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
              <div>
                <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide mb-1">Delivery Address</p>
                <p className="text-sm text-gray-700">{req.address || "—"}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide mb-1">Organization</p>
                <p className="text-sm font-semibold text-[#5b2bce]">{req.org_name || "—"}</p>
              </div>
              {req.prescription_name && (
                <div>
                  <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide mb-1">Supporting Document</p>
                  <p className="text-sm text-gray-700">{req.prescription_name}</p>
                </div>
              )}
              {req.notes && (
                <div className="sm:col-span-2">
                  <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide mb-1">Notes</p>
                  <p className="text-sm text-gray-700">{req.notes}</p>
                </div>
              )}
            </div>
          </div>

          {/* Rejected reason */}
          {req.status === "REJECTED" && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-2">
              <svg className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <div>
                <p className="text-sm font-semibold text-red-600">Request Rejected</p>
                <p className="text-xs text-red-500 mt-0.5">{req.rejected_reason || "This request could not be fulfilled."}</p>
              </div>
            </div>
          )}

          {/* Request status timeline */}
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <h3 className="text-sm font-bold text-gray-900 mb-4">Request Status</h3>
            <div className="space-y-4">
              {req.timeline.map((t, i) => (
                <div key={t.label} className="flex items-start gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${t.done ? "bg-green-500" : "bg-gray-200"}`}>
                      {t.done && <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                    </div>
                    {i < req.timeline.length - 1 && <div className={`w-0.5 h-6 ${req.timeline[i + 1].done ? "bg-green-400" : "bg-gray-200"}`} />}
                  </div>
                  <div className="pb-1">
                    <p className={`text-sm font-medium ${t.done ? "text-gray-800" : "text-gray-400"}`}>{t.label}</p>
                    {t.at && <p className="text-[10px] text-gray-400">{new Date(t.at).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ═══ Right — shipment tracking (when shipped) ═══ */}
        <div className="w-full lg:w-[300px] flex-shrink-0 space-y-4">
          {isShipped && tracking ? (
            <div className="bg-white rounded-xl border border-gray-100 p-5 sticky top-4">
              <h3 className="text-sm font-bold text-gray-900 mb-1 flex items-center gap-1.5">
                <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM9 17h6m0 0a2 2 0 104 0 2 2 0 00-4 0zM13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a2 2 0 100 4" /></svg>
                Shipment Tracking
              </h3>
              <p className="text-[10px] text-gray-400 mb-4">Tracking ID: <span className="font-mono text-gray-600">{tracking.tracking_id}</span></p>

              {/* Tracking timeline */}
              <div className="space-y-3 mb-4">
                {tracking.steps.map((s, i) => (
                  <div key={s.label} className="flex items-start gap-2.5">
                    <div className="flex flex-col items-center">
                      <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${s.done ? "bg-blue-500" : "bg-gray-200"}`}>
                        {s.done && <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                      </div>
                      {i < tracking.steps.length - 1 && <div className={`w-0.5 h-4 ${tracking.steps[i + 1].done ? "bg-blue-400" : "bg-gray-200"}`} />}
                    </div>
                    <span className={`text-xs ${s.done ? "text-gray-700 font-medium" : "text-gray-400"}`}>{s.label}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-2 pt-3 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-gray-400">Courier</span>
                  <span className="text-xs font-semibold text-gray-700">{tracking.courier}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-gray-400">Current Location</span>
                  <span className="text-xs font-semibold text-gray-700">{tracking.current_location}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-gray-400">ETA</span>
                  <span className="text-xs font-semibold text-[#5b2bce]">{tracking.eta}</span>
                </div>
              </div>

              {req.status === "SHIPPED" && (
                <button onClick={() => { advanceStatus(req.id, "DELIVERED"); load(); }}
                  className="w-full mt-4 text-[10px] text-gray-400 hover:text-emerald-600 transition-all">
                  ⚡ Simulate delivered
                </button>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-100 p-5 sticky top-4 text-center">
              <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM9 17h6m0 0a2 2 0 104 0 2 2 0 00-4 0zM13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a2 2 0 100 4" /></svg>
              </div>
              <p className="text-sm font-semibold text-gray-600">No shipment yet</p>
              <p className="text-[11px] text-gray-400 mt-1">Tracking details will appear once your request is approved and shipped.</p>
            </div>
          )}

          {/* Need help */}
          <div className="bg-gradient-to-br from-[#f5f3ff] to-[#eef4ff] rounded-xl border border-purple-100 p-4">
            <p className="text-xs font-bold text-gray-800 mb-1">Need Help?</p>
            <p className="text-[11px] text-gray-500 mb-3">Contact your assigned Medical Representative for order queries.</p>
            <button onClick={() => router.push("/doctor/virtual-mr")}
              className="w-full flex items-center justify-center gap-1.5 bg-[#5b2bce] hover:bg-[#4318d1] text-white py-2 rounded-lg text-[11px] font-semibold transition-all">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
              Contact Medical Rep
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
