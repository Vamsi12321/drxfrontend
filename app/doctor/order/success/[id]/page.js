"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { getRequest } from "@/lib/orderStore";

export default function OrderSuccessPage() {
  const { id } = useParams();
  const router = useRouter();
  const [req, setReq] = useState(null);

  useEffect(() => {
    setReq(getRequest(id));
  }, [id]);

  const STEPS = [
    { label: "Request Submitted", icon: "M5 13l4 4L19 7", done: true },
    { label: "Under Review", icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z", done: false },
    { label: "MR Approval", icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z", done: false },
    { label: "Shipped", icon: "M9 17a2 2 0 11-4 0 2 2 0 014 0zM9 17h6m0 0a2 2 0 104 0 2 2 0 00-4 0zM13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a2 2 0 100 4", done: false },
    { label: "Delivered", icon: "M5 13l4 4L19 7", done: false },
  ];

  return (
    <div className="max-w-2xl mx-auto py-6">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
        {/* Success check */}
        <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-5 animate-[fadeSlide_0.4s_ease-out]">
          <div className="w-14 h-14 bg-green-500 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
          </div>
        </div>

        <h1 className="text-xl font-bold text-gray-900 mb-1">Your Drug Request Has Been Submitted</h1>
        {req && (
          <p className="text-sm text-gray-500">
            Request ID: <span className="font-bold text-[#5b2bce]">{req.id}</span>
            <span className="text-gray-300 mx-2">•</span>
            {new Date(req.created_at).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
          </p>
        )}

        {/* Info banner */}
        {req && (
          <div className="mt-6 bg-gradient-to-r from-[#f5f3ff] to-[#eef4ff] border border-purple-100 rounded-xl px-5 py-4 text-left">
            <p className="text-sm text-gray-700 leading-relaxed">
              Your request for <span className="font-bold text-[#5b2bce] capitalize">{req.drug_name}</span> ({req.quantity} {req.unit}) has been sent to {req.org_name || "your organization"}.
              You will be notified once the request is reviewed and its availability confirmed.
            </p>
          </div>
        )}

        {/* Progress steps */}
        <div className="mt-8 flex items-center justify-between max-w-lg mx-auto">
          {STEPS.map((s, i) => (
            <div key={s.label} className="flex flex-col items-center flex-1 relative">
              {/* connector line */}
              {i < STEPS.length - 1 && (
                <div className={`absolute top-4 left-1/2 w-full h-0.5 ${s.done ? "bg-green-400" : "bg-gray-200"}`} />
              )}
              <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center ${s.done ? "bg-green-500 text-white" : "bg-gray-100 text-gray-400"}`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={s.icon} /></svg>
              </div>
              <span className={`text-[9px] mt-2 text-center leading-tight ${s.done ? "text-gray-700 font-semibold" : "text-gray-400"}`}>{s.label}</span>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 mt-8">
          <button onClick={() => router.push("/doctor/requests")}
            className="flex-1 border border-gray-200 text-gray-700 py-3 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-all">
            View My Requests
          </button>
          <button onClick={() => router.push("/doctor/drug-search")}
            className="flex-1 bg-[#5b2bce] hover:bg-[#4318d1] text-white py-3 rounded-xl text-sm font-bold transition-all">
            Back to Medicines Library
          </button>
        </div>
      </div>
    </div>
  );
}
