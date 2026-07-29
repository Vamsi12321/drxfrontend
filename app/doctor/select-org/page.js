"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { get } from "@/lib/api";

export default function SelectOrgPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [loading, setLoading] = useState(false);
  const [userName, setUserName] = useState("Doctor");
  const [orgs, setOrgs] = useState([]);
  const [fetching, setFetching] = useState(true);
  const fetchedRef = useRef(false);

  useEffect(() => {
    setUserName(localStorage.getItem("userName") || "Doctor");
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    get("/api/v1/my-organizations")
      .then((data) => {
        const list = data?.organizations || [];
        setOrgs(list);
      })
      .catch(() => setOrgs([]))
      .finally(() => setFetching(false));
  }, []);

  const handleSelect = (org) => {
    setSelectedOrg(org);
    setLoading(true);
    const orgId = org.organization_id || org.id;
    localStorage.setItem("companyName", org.organization_name || org.name);
    localStorage.setItem("selectedOrgId", orgId);
    localStorage.setItem("selectedOrgGid", org.organization_gid || "");

    // Prefetch both dashboard endpoints so home page loads instantly
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
          {/* Org icon */}
          <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center shadow-2xl mx-auto mb-6 animate-pulse">
            <span className="text-2xl font-black" style={{ color: "#5b2bce" }}>{(selectedOrg.organization_name || selectedOrg.name || "O").charAt(0)}</span>
          </div>
          {/* Spinner */}
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

  return (
    <div className="min-h-screen bg-[#f5f6fa] flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
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

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
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
                <p className="text-gray-400 text-sm">No organizations linked yet.</p>
                <p className="text-xs text-gray-300 mt-1">Ask a pharma company to add you, or contact DRX support.</p>
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

          {/* More orgs */}
          <button className="w-full border-2 border-dashed border-gray-200 rounded-xl py-3 text-sm font-medium text-gray-400 hover:border-[#5b2bce] hover:text-[#5b2bce] transition-colors">
            + More Organizations
          </button>
        </div>

        {/* Security note */}
        <div className="flex items-center gap-2.5 mt-5 px-2">
          <svg width="16" height="16" fill="#5b2bce" viewBox="0 0 24 24" className="flex-shrink-0"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/></svg>
          <p className="text-[11px] text-gray-500">Your data is 100% isolated and secure across organizations.</p>
        </div>
      </div>
    </div>
  );
}
