"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { get, post as apiPost, del } from "@/lib/api";
import { formatISTDate } from "@/lib/time";
import Image from "next/image";

export default function DoctorCMEEvents() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("all");
  const [confirmEvent, setConfirmEvent] = useState(null);
  const [successMsg, setSuccessMsg] = useState("");
  const [orgId, setOrgId] = useState(null);

  useEffect(() => {
    setOrgId(localStorage.getItem("selectedOrgId") || null);
  }, []);

  const { data: upcomingData, isLoading: loadingUpcoming } = useQuery({
    queryKey: ["cme-upcoming", orgId],
    queryFn: () => {
      if (!orgId) return [];
      return get(`/api/v1/cme/organizations/${orgId}/events?limit=100`).then((d) => d.events || []);
    },
    staleTime: 3 * 60 * 1000,
    enabled: !!orgId,
  });

  const { data: completedData, isLoading: loadingCompleted } = useQuery({
    queryKey: ["cme-completed", orgId],
    queryFn: () => [],
    staleTime: 3 * 60 * 1000,
    enabled: false,
  });

  const { data: regsData } = useQuery({
    queryKey: ["my-registrations", orgId],
    queryFn: () => get(`/api/v1/cme/organizations/${orgId}/my-registrations`).then((d) => d.registrations || []),
    staleTime: 0,
    enabled: !!orgId,
  });

  // CME Bookmarks
  const { data: cmeBookmarksData } = useQuery({
    queryKey: ["bookmarks-cme", orgId],
    queryFn: () => get("/api/v1/bookmarks/cme", orgId ? { org_id: orgId } : undefined),
    staleTime: 60 * 1000,
    enabled: !!orgId,
  });

  const cmeBookmarks = cmeBookmarksData?.bookmarks || [];
  const cmeBookmarkMap = Object.fromEntries(cmeBookmarks.map((b) => [b.event_id, b]));

  const addCmeBookmarkMutation = useMutation({
    mutationFn: (event) => apiPost("/api/v1/bookmarks/cme", {
      organization_id: orgId,
      event_id: event.id || event._id,
      event_title: event.title || "",
    }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["bookmarks-cme"] }); setSuccessMsg("Event bookmarked successfully"); setTimeout(() => setSuccessMsg(""), 3000); },
  });

  const removeCmeBookmarkMutation = useMutation({
    mutationFn: (bookmarkId) => del(`/api/v1/bookmarks/cme/${bookmarkId}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["bookmarks-cme"] }); setSuccessMsg("Bookmark removed"); setTimeout(() => setSuccessMsg(""), 3000); },
  });

  const handleCmeBookmarkToggle = (event) => {
    const eventId = event.id || event._id;
    const existing = cmeBookmarkMap[eventId];
    if (existing) {
      removeCmeBookmarkMutation.mutate(existing.id);
    } else {
      addCmeBookmarkMutation.mutate(event);
    }
  };

  const allFetched = upcomingData || [];

  // Helper: check if event is happening today
  const isToday = (dateStr) => {
    if (!dateStr) return false;
    const eventDate = new Date(dateStr).toDateString();
    const today = new Date().toDateString();
    return eventDate === today;
  };

  const upcoming = allFetched.filter((e) => (e.status === "upcoming" || e.status === "UPCOMING") && e.status !== "cancelled" && e.status !== "CANCELLED");
  const ongoing = allFetched.filter((e) => e.status === "ongoing" || e.status === "ONGOING" || (isToday(e.event_date) && e.event_mode === "online" && e.meeting_link));
  const completed = allFetched.filter((e) => e.status === "completed" || e.status === "COMPLETED");
  const cancelled = allFetched.filter((e) => e.status === "cancelled" || e.status === "CANCELLED");
  const allEvents = allFetched.filter((e) => e.status !== "cancelled" && e.status !== "CANCELLED");
  const myRegs = regsData || [];
  // Registration response has `cme_id` which maps to event `id`
  const regMap = Object.fromEntries(myRegs.map((r) => [r.cme_id || r.event_id || r.id, r]));
  const invalidateRegs = () => {
    queryClient.invalidateQueries({ queryKey: ["my-registrations", orgId] });
    queryClient.invalidateQueries({ queryKey: ["cme-upcoming"] });
  };

  const registerMutation = useMutation({
    mutationFn: (event) => apiPost(`/api/v1/cme/organizations/${orgId}/register`, { event_id: event.id || event._id }),
    onSuccess: () => {
      invalidateRegs();
      queryClient.refetchQueries({ queryKey: ["my-registrations", orgId] });
      setConfirmEvent(null);
      setSuccessMsg("Successfully registered!");
      setTimeout(() => setSuccessMsg(""), 3000);
    },
  });

  const activeRegs = myRegs.filter((r) => r.registration_status === "registered" || r.registration_status === "REGISTERED").length;
  const liveNowCount = ongoing.length;

  const getFilteredEvents = () => {
    switch (activeTab) {
      case "upcoming": return upcoming;
      case "live": return ongoing;
      case "completed": return completed;
      case "cancelled": return cancelled;
      default: return allEvents;
    }
  };

  const filteredEvents = getFilteredEvents();
  const isLoading = loadingUpcoming || loadingCompleted;

  const getEventStatus = (event) => {
    if (event.status === "cancelled" || event.status === "CANCELLED") return "CANCELLED";
    if (event.status === "completed" || event.status === "COMPLETED") return "COMPLETED";
    if (event.status === "ongoing" || event.status === "ONGOING") return "LIVE NOW";
    if (isToday(event.event_date) && event.event_mode === "online" && event.meeting_link) return "LIVE NOW";
    if (event.event_recording) return "ON DEMAND";
    return "UPCOMING";
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "LIVE NOW": return "bg-red-500 text-white";
      case "ON DEMAND": return "bg-orange-500 text-white";
      case "COMPLETED": return "bg-gray-500 text-white";
      case "CANCELLED": return "bg-red-100 text-red-600";
      default: return "bg-purple-600 text-white";
    }
  };

  const getCardGradient = (status) => {
    switch (status) {
      case "LIVE NOW": return "from-indigo-900 to-purple-900";
      case "ON DEMAND": return "from-purple-800 to-indigo-900";
      default: return "from-purple-700 to-indigo-800";
    }
  };

  const tabs = [
    { id: "all", label: "All Events" },
    { id: "upcoming", label: "Upcoming" },
    { id: "live", label: "Live Now", dot: true },
    { id: "completed", label: "Completed" },
    { id: "cancelled", label: "Cancelled" },
  ];

  return (
    <div className="space-y-5 overflow-hidden">
      {/* Success toast */}
      {successMsg && (
        <div className="fixed top-5 right-5 z-50 bg-green-600 text-white px-4 py-2.5 rounded-xl shadow-xl font-semibold text-sm flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {successMsg}
        </div>
      )}

      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "#3b3a8a" }}>CME Events</h1>
        <p className="text-gray-500 text-sm mt-0.5">Stay updated with the latest medical education programs</p>
      </div>

      {/* Banner */}
      <div className="overflow-hidden relative" style={{ background: "linear-gradient(90deg, #2E23B5 0%, #3B2CC9 35%, #4B39E6 70%, #5B4CFF 100%)", borderRadius: "16px 16px 16px 16px" }}>
        <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between px-5 sm:px-8 py-5 sm:py-6 gap-4">
          {/* Left content */}
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-white mb-1">Learn. Connect. Advance.</h2>
            <p className="text-xs sm:text-sm mb-4" style={{ color: "#DAD8FF" }}>Expand your knowledge with expert-led sessions and earn CME credits</p>
            <button className="px-5 py-2.5 bg-white rounded-lg font-semibold text-sm hover:bg-gray-50 transition-all flex items-center gap-2" style={{ color: "#4A3AFF" }}>
              Explore All Events
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
            </button>
          </div>

          {/* Stats in banner */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="text-center">
              <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center mx-auto mb-1">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              </div>
              <p className="text-2xl font-bold text-white">{upcoming.length}</p>
              <p className="text-xs" style={{ color: "#DAD8FF" }}>Upcoming</p>
            </div>
            <div className="text-center">
              <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center mx-auto mb-1">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <p className="text-2xl font-bold text-white">{liveNowCount}</p>
              <p className="text-xs" style={{ color: "#DAD8FF" }}>Live Now</p>
            </div>
            <div className="text-center">
              <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center mx-auto mb-1">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>
              </div>
              <p className="text-2xl font-bold text-white">{completed.length}</p>
              <p className="text-xs" style={{ color: "#DAD8FF" }}>Completed</p>
            </div>
          </div>

          {/* Right illustration */}
          <div className="hidden lg:block w-40 h-32 relative self-start -mt-2 -mr-2">
            <Image src="/images/cme/cme_icon.png" alt="CME" fill className="object-contain object-right-top" />
          </div>
        </div>
      </div>

      {/* Main Content: Left + Right sidebar */}
      <div className="flex gap-5 flex-col xl:flex-row">
        {/* Left - Event List */}
        <div className="flex-1 min-w-0 overflow-hidden">
          {/* Tabs Row */}
          <div className="flex items-center gap-0 border-b border-gray-200 mb-5 overflow-x-auto scrollbar-hide">
            {tabs.map((t) => (
              <button key={t.id} onClick={() => setActiveTab(t.id)}
                className={`px-3 sm:px-5 py-2.5 sm:py-3 text-xs sm:text-sm font-medium border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === t.id
                    ? "border-purple-600 text-purple-600 font-semibold"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}>
                {t.label}
                {t.dot && <span className="w-2 h-2 bg-red-500 rounded-full" />}
              </button>
            ))}
            <div className="ml-auto flex items-center gap-2 pb-2 flex-shrink-0 hidden sm:flex">
              <span className="text-xs text-gray-400">{filteredEvents.length} events</span>
            </div>
          </div>

          {/* Event Cards */}
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-white rounded-xl h-36 animate-pulse border border-gray-100" />
              ))}
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
              <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              <p className="text-gray-400 text-sm">No events found in this category.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredEvents.map((event) => {
                const status = getEventStatus(event);
                const statusBadge = getStatusBadge(status);
                const cardGradient = getCardGradient(status);
                const reg = regMap[event.id || event._id];
                const isRegistered = !!reg;

                let actionLabel = "Register";
                let actionColor = "bg-white text-purple-600 border-2 border-purple-600 hover:bg-purple-50";
                if (status === "CANCELLED") {
                  actionLabel = "Cancelled";
                  actionColor = "bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed";
                } else if (status === "LIVE NOW" && isRegistered) {
                  actionLabel = "Join Live";
                  actionColor = "bg-green-500 text-white hover:bg-green-600 border-0";
                } else if (isRegistered) {
                  actionLabel = "Registered";
                  actionColor = "bg-green-50 text-green-600 border border-green-200 cursor-default";
                }

                return (
                  <div key={event.id || event._id} className="bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-md transition-all flex flex-col sm:flex-row">
                    {/* Left image/thumbnail area */}
                    <div
                      onClick={() => {
                        sessionStorage.setItem("selectedCMEEvent", JSON.stringify(event));
                        router.push(`/doctor/cme-events/${event.id || event._id}`);
                      }}
                      className={`w-full sm:w-36 h-24 sm:h-auto flex-shrink-0 bg-gradient-to-br ${cardGradient} relative flex items-center justify-center p-4 cursor-pointer`}>
                      <span className={`absolute top-2 left-2 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${statusBadge}`}>
                        {status}
                      </span>
                      <Image src="/images/cme/cme_icon.png" alt="" width={70} height={70} className="object-contain opacity-80" />
                    </div>

                    {/* Content area */}
                    <div
                      onClick={() => {
                        sessionStorage.setItem("selectedCMEEvent", JSON.stringify(event));
                        router.push(`/doctor/cme-events/${event.id || event._id}`);
                      }}
                      className="flex-1 p-4 sm:p-5 flex flex-col justify-between min-w-0 cursor-pointer">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 mb-1 line-clamp-1">{event.title}</h3>
                        <p className="text-gray-500 text-sm mb-2">
                          {event.speaker && <span className="font-medium text-gray-700">{event.speaker}</span>}
                          {event.speaker && event.event_type && <span className="mx-1.5 text-gray-300">·</span>}
                          {event.event_type && <span>{event.event_type}</span>}
                        </p>

                        {/* Meta row */}
                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mb-3">
                          {event.event_date && (
                            <span className="flex items-center gap-1.5">
                              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                              {formatISTDate(event.event_date)}
                            </span>
                          )}
                          {event.event_time && (
                            <span className="flex items-center gap-1.5">
                              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                              {event.event_time}
                            </span>
                          )}
                          {event.duration && (
                            <span className="flex items-center gap-1.5">
                              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                              {event.duration} mins
                            </span>
                          )}
                        </div>

                        {/* Tags */}
                        <div className="flex flex-wrap items-center gap-2">
                          {event.cme_credits && (
                            <span className="bg-green-50 text-green-700 px-2.5 py-0.5 rounded-md text-xs font-semibold border border-green-100">
                              {event.cme_credits} CME Credits
                            </span>
                          )}
                          <span className="bg-purple-50 text-purple-700 px-2.5 py-0.5 rounded-md text-xs font-semibold border border-purple-100">
                            {event.event_mode === "online" ? "Webinar" : event.event_mode === "offline" ? "In-Person" : event.event_mode || "Event"}
                          </span>
                          {event.event_type && event.event_type !== event.event_mode && (
                            <span className="bg-gray-50 text-gray-600 px-2.5 py-0.5 rounded-md text-xs font-semibold border border-gray-100">
                              {event.event_type}
                            </span>
                          )}
                          {event.venue_name && (
                            <span className="text-gray-400 text-xs flex items-center gap-1">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                              {event.venue_name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right action column */}
                    <div className="flex sm:flex-col items-center justify-between sm:justify-center gap-3 px-4 sm:px-5 py-3 sm:py-0 border-t sm:border-t-0 sm:border-l border-gray-50">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          sessionStorage.setItem("selectedCMEEvent", JSON.stringify(event));
                          router.push(`/doctor/cme-events/${event.id || event._id}`);
                        }}
                        className="px-4 py-1.5 rounded-lg text-xs font-semibold text-[#5b2bce] border border-indigo-200 hover:bg-indigo-50 transition-all whitespace-nowrap"
                      >
                        View Details
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (actionLabel === "Register") setConfirmEvent(event);
                          else if (actionLabel === "Join Live" && event.meeting_link) window.open(event.meeting_link, "_blank");
                        }}
                        disabled={actionLabel === "Cancelled" || actionLabel === "Registered"}
                        className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${actionColor}`}
                      >
                        {actionLabel}
                      </button>
                      <button
                        onClick={() => handleCmeBookmarkToggle(event)}
                        disabled={addCmeBookmarkMutation.isPending || removeCmeBookmarkMutation.isPending}
                        className={`flex items-center gap-1.5 text-xs disabled:opacity-50 ${
                          cmeBookmarkMap[event.id || event._id]
                            ? "text-purple-600 hover:text-red-500"
                            : "text-gray-400 hover:text-purple-600"
                        }`}
                      >
                        <svg className="w-4 h-4" fill={cmeBookmarkMap[event.id || event._id] ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>
                        {cmeBookmarkMap[event.id || event._id] ? "Saved" : "Save"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Load More */}
          {filteredEvents.length > 0 && (
            <div className="text-center mt-6">
              <button className="text-gray-500 text-sm font-medium hover:text-purple-600 flex items-center gap-1.5 mx-auto">
                Load More Events
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </button>
            </div>
          )}
        </div>

        {/* Right Sidebar */}
        <div className="w-full xl:w-72 flex-shrink-0 space-y-5">
          {/* My CME Stats — real data */}
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <h3 className="text-sm font-bold mb-4" style={{ color: "#3b3a8a" }}>My CME Summary</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Registered</span>
                <span className="text-sm font-bold text-purple-600">{activeRegs}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Completed</span>
                <span className="text-sm font-bold text-green-600">{completed.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Total Events</span>
                <span className="text-sm font-bold text-gray-800">{allEvents.length}</span>
              </div>
            </div>
          </div>

          {/* Upcoming Live Sessions */}
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold" style={{ color: "#3b3a8a" }}>Upcoming Sessions</h3>
            </div>
            <div className="space-y-4">
              {upcoming.slice(0, 3).map((event) => (
                <div key={event.id || event._id}
                  className="flex items-start gap-3 cursor-pointer group"
                  onClick={() => { sessionStorage.setItem("selectedCMEEvent", JSON.stringify(event)); router.push(`/doctor/cme-events/${event.id || event._id}`); }}>
                  <div className="w-11 h-11 rounded-lg bg-gradient-to-br from-purple-100 to-indigo-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    <Image src="/images/cme/cme_icon.png" alt="" width={30} height={30} className="object-contain" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-gray-400 mb-0.5">{formatISTDate(event.event_date)}{event.event_time ? ` • ${event.event_time}` : ""}</p>
                    <p className="text-sm font-semibold text-gray-800 line-clamp-1 group-hover:text-purple-600 transition-colors">{event.title}</p>
                    <p className="text-xs text-gray-400">{event.speaker || "Speaker TBA"}</p>
                  </div>
                </div>
              ))}
              {upcoming.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-4">No upcoming sessions</p>
              )}
            </div>
          </div>

          {/* Event Types / Topics — dynamic from actual data */}
          {(() => {
            const types = [...new Set(allEvents.map((e) => e.event_type).filter(Boolean))];
            const modes = [...new Set(allEvents.map((e) => e.event_mode).filter(Boolean))];
            const speakers = [...new Set(allEvents.map((e) => e.speaker).filter(Boolean))];
            if (types.length === 0 && modes.length === 0) return null;
            return (
              <div className="bg-white rounded-xl border border-gray-100 p-5">
                <h3 className="text-sm font-bold mb-4" style={{ color: "#3b3a8a" }}>Event Summary</h3>
                <div className="space-y-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Total Events</span>
                    <span className="font-bold text-gray-800">{allEvents.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Upcoming</span>
                    <span className="font-bold text-purple-600">{upcoming.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Live Now</span>
                    <span className="font-bold text-red-500">{ongoing.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Completed</span>
                    <span className="font-bold text-gray-500">{completed.length}</span>
                  </div>
                  {types.length > 0 && (
                    <>
                      <div className="border-t border-gray-100 pt-2 mt-2">
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Event Types</p>
                        {types.map((t) => {
                          const count = allEvents.filter((e) => e.event_type === t).length;
                          return (
                            <div key={t} className="flex items-center justify-between mb-1">
                              <button onClick={() => setActiveTab("all")} className="text-gray-600 hover:text-purple-600 truncate text-left">{t}</button>
                              <span className="text-gray-400 font-bold ml-2">{count}</span>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                  {speakers.length > 0 && (
                    <div className="border-t border-gray-100 pt-2 mt-2">
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Speakers</p>
                      {speakers.slice(0, 4).map((s) => (
                        <p key={s} className="text-gray-600 truncate mb-1">🎤 {s}</p>
                      ))}
                      {speakers.length > 4 && <p className="text-gray-400">+{speakers.length - 4} more</p>}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Register confirm modal */}
      {confirmEvent && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <h3 className="font-bold text-gray-900 text-lg mb-1">Confirm Registration</h3>
            <p className="text-gray-700 font-semibold mb-0.5">{confirmEvent.title}</p>
            <p className="text-gray-400 text-sm mb-5">
              {confirmEvent.event_date ? formatISTDate(confirmEvent.event_date) : ""}
              {confirmEvent.event_time ? ` · ${confirmEvent.event_time}` : ""}
            </p>
            {registerMutation.isError && (
              <p className="text-red-500 text-sm mb-3">{registerMutation.error?.message}</p>
            )}
            <div className="flex gap-3">
              <button onClick={() => setConfirmEvent(null)}
                className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={() => registerMutation.mutate(confirmEvent)}
                disabled={registerMutation.isPending}
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2.5 rounded-xl text-sm font-bold disabled:opacity-50">
                {registerMutation.isPending ? "Registering..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
