"use client";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { get } from "@/lib/api";
import { formatISTDate } from "@/lib/time";

// Read localStorage synchronously so org_id is available on first render
function getInitialOrgId() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("selectedOrgId") || null;
}

export default function DoctorHome() {
  const router = useRouter();
  const [userName, setUserName] = useState("Doctor");
  const [selectedOrgId, setSelectedOrgId] = useState(getInitialOrgId);

  useEffect(() => {
    setUserName(localStorage.getItem("userName") || "Doctor");
    // Sync in case it changed between SSR and hydration
    const stored = localStorage.getItem("selectedOrgId") || null;
    if (stored !== selectedOrgId) setSelectedOrgId(stored);
  }, []);

  // Listen for org changes (from layout org switcher)
  useEffect(() => {
    const handleStorage = () => {
      setSelectedOrgId(localStorage.getItem("selectedOrgId") || null);
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  // Always fetch with org_id when available (set after login org selection)
  const { data, isLoading, isError } = useQuery({
    queryKey: ["doctor-dashboard", selectedOrgId],
    queryFn: () =>
      get(
        selectedOrgId
          ? `/api/v1/dashboard/me?org_id=${selectedOrgId}`
          : "/api/v1/dashboard/me"
      ),
    staleTime: 2 * 60 * 1000,
    placeholderData: (prev) => prev,
  });

  // Fetch recent drugs from org
  const { data: drugsData } = useQuery({
    queryKey: ["org-drugs-recent", selectedOrgId],
    queryFn: () => get(`/api/v1/organizations/${selectedOrgId}/drugs?limit=3`),
    staleTime: 3 * 60 * 1000,
    enabled: !!selectedOrgId,
  });

  const recentDrugs = drugsData?.drugs || [];

  const organizations = data?.organizations || { connected: 0, list: [] };
  const activitySummary = data?.activity_summary || { unread_notifications: 0 };
  const suggestedDoctors = data?.suggested_doctors || [];
  const mrxData = data?.mrx_data || null;
  const showLoading = isLoading && !data;

  return (
    <div className="space-y-5">
      {/* Hero Banner */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 flex items-center justify-between border border-gray-100 shadow-sm">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-[#3b3a8a] mb-1">
            How can we help you today, Doctor?
          </h2>
          <p className="text-xs sm:text-sm text-gray-500">
            Explore drugs, attend CME events, connect with your doctor network, and get scientific insights with your Virtual MR.
          </p>
        </div>
        <img
          src="/drx/images/doctors/doctor_illustration.png"
          alt=""
          className="h-28 hidden md:block object-contain"
        />
      </div>

      {/* Notification banner */}
      {activitySummary.unread_notifications > 0 && (
        <div
          onClick={() => router.push("/doctor/notifications")}
          className="bg-indigo-50 border border-indigo-100 rounded-xl px-5 py-3 flex items-center justify-between cursor-pointer hover:bg-indigo-100 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-indigo-100 rounded-full flex items-center justify-center">
              <svg width="18" height="18" fill="#5b2bce" viewBox="0 0 24 24">
                <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-[#3b3a8a]">
                You have {activitySummary.unread_notifications} unread notification{activitySummary.unread_notifications > 1 ? "s" : ""}
              </p>
              <p className="text-[11px] text-gray-500">Tap to view your latest updates</p>
            </div>
          </div>
          <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      )}

      {/* 3-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Organizations — 4 cols */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-[#3b3a8a]">
              My Organizations
              <span className="text-gray-400 font-normal ml-1">({organizations.connected})</span>
            </h3>
          </div>

          {/* Drug Search shortcut */}
          <div
            className="relative mb-4 cursor-pointer"
            onClick={() => router.push("/doctor/drug-search")}
          >
            <input
              type="text"
              readOnly
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 pr-10 text-xs cursor-pointer bg-white outline-none pointer-events-none"
            />
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-xs text-gray-400 flex items-center">
              <span>Search drugs...</span>
            </div>
            <button className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          </div>

          {/* Org list */}
          <div className="space-y-2">
            {showLoading ? (
              Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl border border-gray-50 animate-pulse">
                  <div className="w-8 h-8 bg-gray-200 rounded-lg" />
                  <div className="flex-1 space-y-1">
                    <div className="h-3 bg-gray-200 rounded w-24" />
                    <div className="h-2 bg-gray-100 rounded w-16" />
                  </div>
                </div>
              ))
            ) : organizations.list.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">No organizations linked yet</p>
            ) : (
              organizations.list.slice(0, 4).map((org, idx) => (
                <div
                  key={org.organization_id || idx}
                  className="flex items-center gap-3 p-2.5 rounded-xl border border-gray-50 hover:border-gray-100 transition-all"
                >
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center text-purple-700 text-xs font-bold flex-shrink-0">
                    {org.logo ? (
                      <img src={org.logo} alt="" className="w-8 h-8 rounded-lg object-cover" />
                    ) : (
                      (org.organization_name || "O").charAt(0)
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-900 truncate">{org.organization_name}</p>
                    <p className="text-[10px] text-gray-400">{org.city || ""}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {org.has_mrx && (
                      <span className="text-[8px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded-full font-bold">MRX</span>
                    )}
                    <span className="text-[9px] bg-green-50 text-green-600 px-2 py-0.5 rounded-full font-bold">Active</span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Recent Drugs */}
          {recentDrugs.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-bold text-[#3b3a8a] mb-2">Recently Added Drugs</p>
              <div className="space-y-2">
                {recentDrugs.slice(0, 3).map((drug) => (
                  <div
                    key={drug.id}
                    onClick={() => {
                      sessionStorage.setItem("selectedDrugData", JSON.stringify(drug));
                      router.push(`/doctor/drug-details/${drug.id}`);
                    }}
                    className="flex items-center gap-3 p-2.5 rounded-xl border border-gray-50 hover:border-indigo-100 hover:bg-indigo-50/30 transition-all cursor-pointer group"
                  >
                    <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-sm">💊</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-900 truncate group-hover:text-[#5b2bce]">{drug.drug_name}</p>
                      <p className="text-[10px] text-gray-400 truncate">{drug.brand_name || drug.generic_name || ""}</p>
                    </div>
                    <svg className="w-3.5 h-3.5 text-gray-300 group-hover:text-indigo-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Explore link */}
          <Link
            href="/doctor/drug-search"
            className="flex items-center gap-1.5 text-xs text-indigo-600 font-semibold mt-4 hover:text-indigo-700 transition-colors"
          >
            Explore All Drugs
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>

        {/* MRX Data / CME Events — 4 cols */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-[#3b3a8a]">CME Events</h3>
            <Link href="/doctor/cme-events" className="text-[10px] text-indigo-600 font-semibold">
              View All
            </Link>
          </div>

          {mrxData?.upcoming_cme && mrxData.upcoming_cme.length > 0 ? (
            <div className="space-y-3">
              {mrxData.upcoming_cme.slice(0, 4).map((event) => (
                <div
                  key={event.id}
                  className="p-3 rounded-xl border border-gray-100 hover:border-indigo-100 hover:bg-indigo-50/30 transition-all cursor-pointer"
                  onClick={() => router.push("/doctor/cme-events")}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-lg">📅</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-900 truncate">{event.title}</p>
                      <p className="text-[10px] text-gray-500 mt-0.5">
                        {formatISTDate(event.event_date)}{event.event_time ? ` • ${event.event_time}` : ""}
                      </p>
                      {event.speaker && (
                        <p className="text-[10px] text-gray-400 mt-0.5">Speaker: {event.speaker}</p>
                      )}
                    </div>
                    <span className="text-[8px] bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full font-bold capitalize flex-shrink-0">
                      {event.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <span className="text-3xl block mb-2">📅</span>
              {!selectedOrgId ? (
                <>
                  <p className="text-xs text-gray-400">Select an organization to see upcoming CME events</p>
                  <p className="text-[10px] text-gray-300 mt-1">Use the org switcher in the top bar</p>
                </>
              ) : showLoading ? (
                <p className="text-xs text-gray-400">Loading events...</p>
              ) : (
                <>
                  <p className="text-xs text-gray-400">No upcoming CME events</p>
                  <Link href="/doctor/cme-events" className="text-xs text-indigo-600 font-semibold mt-2 inline-block">
                    Browse All Events →
                  </Link>
                </>
              )}
            </div>
          )}

          <Link
            href="/doctor/cme-events"
            className="flex items-center gap-1.5 text-xs text-indigo-600 font-semibold mt-4 hover:text-indigo-700 transition-colors"
          >
            Explore CME Events
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>

        {/* Suggested Doctors — 4 cols */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-[#3b3a8a]">Doctors You May Know</h3>
            <Link href="/doctor/network/discover" className="text-[10px] text-indigo-600 font-semibold">
              View All
            </Link>
          </div>

          <div className="space-y-3">
            {showLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-2 rounded-xl border border-gray-50 animate-pulse">
                  <div className="w-10 h-10 bg-gray-200 rounded-full" />
                  <div className="flex-1 space-y-1">
                    <div className="h-3 bg-gray-200 rounded w-28" />
                    <div className="h-2 bg-gray-100 rounded w-20" />
                  </div>
                </div>
              ))
            ) : suggestedDoctors.length === 0 ? (
              <div className="text-center py-6">
                <span className="text-2xl block mb-2">🤝</span>
                <p className="text-xs text-gray-400">No suggestions right now</p>
              </div>
            ) : (
              suggestedDoctors.slice(0, 5).map((doc) => (
                <Link key={doc.id} href="/doctor/network/discover">
                  <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 border border-gray-50 hover:border-gray-100 transition-all cursor-pointer group">
                    <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 bg-gray-100">
                      {doc.avatar_url ? (
                        <img src={doc.avatar_url} alt="" className="w-10 h-10 object-cover" />
                      ) : (
                        <img src="/drx/images/doctors/male_doc_avatar.png" alt="" className="w-10 h-10 object-cover" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-900 group-hover:text-[#5b2bce] truncate">
                        {doc.name}
                      </p>
                      <p className="text-[10px] text-gray-400">{doc.specialization || ""}</p>
                    </div>
                    <svg
                      className="w-4 h-4 text-gray-300 group-hover:text-[#5b2bce] flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                    </svg>
                  </div>
                </Link>
              ))
            )}
          </div>

          <Link
            href="/doctor/network/feed"
            className="flex items-center gap-1.5 text-xs text-indigo-600 font-semibold mt-4 hover:text-indigo-700 transition-colors"
          >
            Explore Your Network
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>
      </div>

      {/* MRX Stats + Recent Drugs (visible when org selected) */}
      {mrxData && (
        <>
          {/* Stats Strip */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="text-sm font-bold text-[#3b3a8a] mb-4">Pharma Summary</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {[
                { icon: "💊", label: "Total Drugs", value: mrxData.stats?.total_drugs ?? 0, bg: "bg-indigo-50", color: "text-indigo-600" },
                { icon: "🎓", label: "Total CME Events", value: mrxData.stats?.total_cme_events ?? 0, bg: "bg-green-50", color: "text-green-600" },
                { icon: "📅", label: "Upcoming CME", value: mrxData.stats?.upcoming_cme_count ?? 0, bg: "bg-orange-50", color: "text-orange-600" },
              ].map((stat, idx) => (
                <div key={idx} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100">
                  <div className={`w-10 h-10 ${stat.bg} rounded-xl flex items-center justify-center text-lg flex-shrink-0`}>
                    {stat.icon}
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 font-medium">{stat.label}</p>
                    <p className={`text-xl font-black ${stat.color}`}>{stat.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Drugs */}
          {mrxData.recent_drugs && mrxData.recent_drugs.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-[#3b3a8a]">Recently Added Drugs</h3>
                <Link href="/doctor/drug-search" className="text-[10px] text-indigo-600 font-semibold">
                  View All
                </Link>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
                {mrxData.recent_drugs.map((drug) => (
                  <div
                    key={drug.id}
                    onClick={() => router.push(`/doctor/drug-details/${drug.id}`)}
                    className="p-3 rounded-xl border border-gray-100 hover:border-indigo-200 hover:shadow-md transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center flex-shrink-0">
                        <span className="text-sm">💊</span>
                      </div>
                      <p className="text-xs font-bold text-gray-900 group-hover:text-[#5b2bce] truncate">
                        {drug.drug_name}
                      </p>
                    </div>
                    <p className="text-[10px] text-gray-500 truncate">{drug.generic_name}</p>
                    <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                      <span className="text-[9px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-medium">
                        {drug.dosage_form}
                      </span>
                      <span className="text-[9px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-medium">
                        {drug.strength}
                      </span>
                    </div>
                    <p className="text-[9px] text-indigo-500 font-medium mt-1.5 truncate">
                      {drug.therapeutic_category}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Fallback stats when no org selected */}
      {!mrxData && !showLoading && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="text-sm font-bold text-[#3b3a8a] mb-4">Your Activity Summary</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {[
              { icon: "🏥", label: "Connected Orgs", value: organizations.connected, bg: "bg-purple-50", color: "text-purple-600" },
              { icon: "🔔", label: "Unread Notifications", value: activitySummary.unread_notifications, bg: "bg-red-50", color: "text-red-600" },
              { icon: "🤝", label: "Suggested Connections", value: suggestedDoctors.length, bg: "bg-blue-50", color: "text-blue-600" },
            ].map((stat, idx) => (
              <div key={idx} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100">
                <div className={`w-10 h-10 ${stat.bg} rounded-xl flex items-center justify-center text-lg flex-shrink-0`}>
                  {stat.icon}
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 font-medium">{stat.label}</p>
                  <p className={`text-xl font-black ${stat.color}`}>{stat.value}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-gray-400 text-center mt-4">
            Select an organization from the top bar to see drug and CME data
          </p>
        </div>
      )}
    </div>
  );
}
