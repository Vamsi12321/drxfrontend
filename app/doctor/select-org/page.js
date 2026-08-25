"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { get, post as apiPost } from "@/lib/api";

export default function SelectOrgPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [loading, setLoading] = useState(false);
  const [userName, setUserName] = useState("Doctor");
  const [orgs, setOrgs] = useState([]);
  const [fetching, setFetching] = useState(true);
  const fetchedRef = useRef(false);

  // Pending requests state
  const [pendingRequests, setPendingRequests] = useState([]);
  const [fetchingRequests, setFetchingRequests] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [toast, setToast] = useState(null); // { type: "success" | "error", message: "" }

  // Auto-dismiss toast after 3s
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  useEffect(() => {
    setUserName(localStorage.getItem("userName") || "Doctor");
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    get("/api/v1/my-organizations")
      .then((data) => setOrgs(data?.organizations || []))
      .catch(() => setOrgs([]))
      .finally(() => setFetching(false));

    get("/api/v1/doctor-requests/pending")
      .then((data) => setPendingRequests(data?.requests || []))
      .catch(() => setPendingRequests([]))
      .finally(() => setFetchingRequests(false));
  }, []);

  const handleAccept = async (requestId) => {
    setActionLoading(requestId + "-accept");
    try {
      const res = await apiPost(`/api/v1/doctor-requests/${requestId}/accept`);
      setPendingRequests((prev) => prev.filter((r) => r.id !== requestId));
      setToast({ type: "success", message: res?.message || "Request accepted! Awaiting admin approval." });
    } catch (err) {
      setToast({ type: "error", message: err?.message || "Failed to accept request. Please try again." });
    }
    setActionLoading(null);
  };

  const handleReject = async (requestId) => {
    if (!confirm("Reject this organization request?")) return;
    setActionLoading(requestId + "-reject");
    try {
      const res = await apiPost(`/api/v1/doctor-requests/${requestId}/reject`);
      setPendingRequests((prev) => prev.filter((r) => r.id !== requestId));
      setToast({ type: "success", message: res?.message || "Request rejected." });
    } catch (err) {
      setToast({ type: "error", message: err?.message || "Failed to reject request. Please try again." });
    }
    setActionLoading(null);
  };

  const handleSelect = (org) => {
    setSelectedOrg(org);
    setLoading(true);
    const orgId = org.organization_id || org.id;
    localStorage.setItem("companyName", org.organization_name || org.name);
    localStorage.setItem("selectedOrgId", orgId);
    localStorage.setItem("selectedOrgGid", org.organization_gid || "");

    queryClient.prefetchQuery({
      queryKey: ["doctor-dashboard", orgId],
      queryFn: () => get(`/api/v1/dashboard/me?org_id=${orgId}`),
      staleTime: 2 * 60 * 1000,
    });
    queryClient.prefetchQuery({
      queryKey: ["doctor-dashboard", null],
      queryFn: () => get("/api/v1/dashboard/me"),
      staleTime: 2 * 60 * 1000,
    });

    setTimeout(() => {
      router.push("/doctor/home");
    }, 2000);
  };

  if (loading && selectedOrg) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#4318d1] via-[#5b2bce] to-[#7c3aed] flex items-center justify-center">
        <div className="text-center px-4">
          <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center shadow-2xl mx-auto mb-6 animate-pulse">
            <span className="text-2xl font-black" style={{ color: "#5b2bce" }}>{(selectedOrg.organization_name || selectedOrg.name || "O").charAt(0)}</span>
          </div>
          <div className="w-10 h-10 border-3 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-6" style={{ borderWidth: "3px" }} />
          <h2 className="text-2xl font-bold text-white mb-2">Loading {selectedOrg.organization_name || selectedOrg.name}...</h2>
          <p className="text-indigo-200 text-sm mb-1">Setting up your workspace</p>
          <div className="flex items-center justify-center gap-1 mt-4">
            {["Syncing drugs", "Loading events", "Connecting network"].map((step, i) => (
              <span key={i} className="text-[10px] text-indigo-300 animate-pulse" style={{ animationDelay: `${i * 400}ms` }}>
                {i > 0 && " • "}{step}
              </span>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const hasRequests = !fetchingRequests && pendingRequests.length > 0;

  return (
    <div className="min-h-screen bg-[#f5f6fa] flex items-center justify-center p-4">
      <div className={`w-full ${hasRequests ? "max-w-4xl" : "max-w-lg"}`}>
        {/* Logo */}
        <div className="text-center mb-5">
          <h1 className="text-3xl font-extrabold tracking-tighter inline-block" style={{ fontFamily: "'Arial Black', sans-serif" }}>
            <span className="text-white bg-[#5b2bce] px-2 py-0.5 rounded-lg text-xl">DR</span><span style={{ background: "linear-gradient(180deg, #38bdf8 0%, #06b6d4 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }} className="text-xl font-black">X</span>
          </h1>
        </div>

        {/* Welcome */}
        <div className="text-center mb-6">
          <p className="text-sm text-gray-500">Welcome back, <span className="font-semibold text-[#3b3a8a]">Dr. {userName}</span></p>
        </div>

        {/* Two-column layout: Orgs left/center, Requests right */}
        <div className={`flex flex-col ${hasRequests ? "lg:flex-row lg:items-start" : "items-center"} gap-5`}>
          {/* Left — Choose Organization */}
          <div className={`bg-white rounded-2xl shadow-lg border border-gray-100 p-8 ${hasRequests ? "lg:flex-1" : "w-full max-w-lg"}`}>
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-[#3b3a8a]">Choose Organization</h2>
              <p className="text-sm text-gray-400 mt-1">Select an organization to continue</p>
            </div>

            {/* Org Grid */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              {fetching ? (
                [1,2,3,4].map((i) => <div key={i} className="h-28 bg-gray-50 rounded-xl animate-pulse border border-gray-100" />)
              ) : orgs.length === 0 ? (
                <div className="col-span-2 text-center py-8">
                  <p className="text-gray-500 text-sm font-medium">No organizations linked yet.</p>
                  <p className="text-xs text-gray-400 mt-1">Please contact your DRX admin to get linked to an organization.</p>
                  <button onClick={() => { localStorage.clear(); document.cookie = "access_token=; path=/; max-age=0"; document.cookie = "userRole=; path=/; max-age=0"; window.location.href = "/drx/login"; }}
                    className="mt-5 px-6 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-xl text-sm font-semibold transition-all">
                    Logout
                  </button>
                </div>
              ) : orgs.map((org) => (
                <button
                  key={org.organization_id}
                  onClick={() => handleSelect(org)}
                  className="bg-white rounded-xl border-2 border-gray-100 p-5 flex flex-col items-center gap-2 transition-all hover:shadow-lg hover:border-[#5b2bce] hover:scale-[1.02] active:scale-[0.98]"
                >
                  <div className="h-10 flex items-center justify-center">
                    {org.logo ? (
                      <img src={org.logo} alt={org.organization_name} className="h-8 object-contain" />
                    ) : (
                      <span className="text-lg font-black text-[#5b2bce]">{(org.organization_name || "O").charAt(0)}</span>
                    )}
                  </div>
                  <p className="text-sm font-bold text-gray-800 text-center line-clamp-1">{org.organization_name}</p>
                  <p className="text-[10px] text-gray-400">{org.city || "Pharma"}</p>
                  <span className="bg-green-50 text-green-600 text-[9px] font-bold px-2.5 py-0.5 rounded-full border border-green-200">Active</span>
                </button>
              ))}
            </div>

            {orgs.length > 0 && (
              <button className="w-full border-2 border-dashed border-gray-200 rounded-xl py-3 text-sm font-medium text-gray-400 hover:border-[#5b2bce] hover:text-[#5b2bce] transition-colors">
                + More Organizations
              </button>
            )}
          </div>

          {/* Right — Pending Requests (only if requests exist) */}
          {hasRequests && (
            <div className="bg-white rounded-2xl shadow-lg border border-orange-100 p-5 lg:w-[320px] lg:flex-shrink-0 self-start">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-orange-50 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-800">Requests</h3>
                  <p className="text-[10px] text-gray-400">{pendingRequests.length} pending</p>
                </div>
              </div>

              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {pendingRequests.map((req) => (
                  <div key={req.id} className="border border-orange-100 rounded-xl p-3 bg-orange-50/30">
                    <div className="flex items-start justify-between mb-1.5">
                      <div>
                        <p className="text-xs font-semibold text-gray-800">{req.organization_name || "Unknown Org"}</p>
                        <p className="text-[9px] text-gray-400 mt-0.5">by {req.requested_by || "—"}</p>
                      </div>
                      <span className="px-1.5 py-0.5 rounded-full text-[8px] font-bold bg-orange-100 text-orange-600">PENDING</span>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <button onClick={() => handleAccept(req.id)}
                        disabled={actionLoading === req.id + "-accept"}
                        className="flex-1 px-2 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-[10px] font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-1">
                        {actionLoading === req.id + "-accept" ? (
                          <svg className="animate-spin w-2.5 h-2.5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                        ) : (
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        )}
                        Accept
                      </button>
                      <button onClick={() => handleReject(req.id)}
                        disabled={actionLoading === req.id + "-reject"}
                        className="flex-1 px-2 py-1.5 border border-red-200 text-red-600 hover:bg-red-50 rounded-lg text-[10px] font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-1">
                        {actionLoading === req.id + "-reject" ? (
                          <svg className="animate-spin w-2.5 h-2.5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                        ) : (
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        )}
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <p className="text-[9px] text-gray-400 mt-3 text-center">Accepting sends to DRX admin for final approval</p>
            </div>
          )}
        </div>

        {/* Security note */}
        <div className="flex items-center gap-2.5 mt-5 px-2">
          <svg width="16" height="16" fill="#5b2bce" viewBox="0 0 24 24" className="flex-shrink-0"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/></svg>
          <p className="text-[11px] text-gray-500">Your data is 100% isolated and secure across organizations.</p>
        </div>
      </div>

      {/* Toast notification */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 animate-[slideIn_0.3s_ease-out]">
          <div className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border ${toast.type === "success" ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
            {toast.type === "success" ? (
              <div className="w-7 h-7 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              </div>
            ) : (
              <div className="w-7 h-7 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </div>
            )}
            <p className={`text-sm font-medium ${toast.type === "success" ? "text-green-700" : "text-red-700"}`}>{toast.message}</p>
            <button onClick={() => setToast(null)} className="ml-2 text-gray-400 hover:text-gray-600">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
