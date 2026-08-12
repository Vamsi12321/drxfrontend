"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { get, post as apiPost, del } from "@/lib/api";
import { formatISTDate } from "@/lib/time";
import Image from "next/image";

export default function CMEEventDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [orgId, setOrgId] = useState(null);
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    setOrgId(localStorage.getItem("selectedOrgId") || null);
  }, []);

  // Fetch full event detail
  const { data: event, isLoading, isFetching } = useQuery({
    queryKey: ["cme-event-detail", orgId, id],
    queryFn: () => {
      if (!orgId) return null;
      return get(`/api/v1/cme/organizations/${orgId}/events/${id}`).then((res) => {
        // Handle wrapped response
        if (res?.event) return res.event;
        if (res?.events && Array.isArray(res.events)) return res.events[0];
        return res;
      }).catch(() => null);
    },
    staleTime: 0,
    enabled: !!orgId,
    initialData: () => {
      if (typeof window === "undefined") return undefined;
      try {
        const cached = sessionStorage.getItem("selectedCMEEvent");
        if (cached) {
          const d = JSON.parse(cached);
          if (d.id === id || d._id === id) return d;
        }
      } catch {}
      return undefined;
    },
    initialDataUpdatedAt: 0,
  });

  // Check registration status
  const { data: regsData } = useQuery({
    queryKey: ["my-registrations", orgId],
    queryFn: () => get(`/api/v1/cme/organizations/${orgId}/my-registrations`).then((d) => d.registrations || []),
    staleTime: 0,
    enabled: !!orgId,
  });

  const myRegs = regsData || [];
  const isRegistered = myRegs.some((r) => (r.cme_id || r.event_id) === id);

  // Register mutation
  const registerMutation = useMutation({
    mutationFn: () => apiPost(`/api/v1/cme/organizations/${orgId}/register`, { event_id: id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-registrations", orgId] });
      queryClient.refetchQueries({ queryKey: ["my-registrations", orgId] });
      setSuccessMsg("Successfully registered!");
      setTimeout(() => setSuccessMsg(""), 4000);
    },
  });

  // Bookmark
  const { data: cmeBookmarksData } = useQuery({
    queryKey: ["bookmarks-cme", orgId],
    queryFn: () => get("/api/v1/bookmarks/cme", orgId ? { org_id: orgId } : undefined),
    staleTime: 60 * 1000,
    enabled: !!orgId,
  });
  const currentBookmark = (cmeBookmarksData?.bookmarks || []).find((b) => b.event_id === id);
  const isBookmarked = !!currentBookmark;

  const addBookmarkMutation = useMutation({
    mutationFn: () => apiPost("/api/v1/bookmarks/cme", { organization_id: orgId, event_id: id, event_title: event?.title || "" }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["bookmarks-cme"] }); setSuccessMsg("Event bookmarked!"); setTimeout(() => setSuccessMsg(""), 3000); },
  });
  const removeBookmarkMutation = useMutation({
    mutationFn: () => del(`/api/v1/bookmarks/cme/${currentBookmark?.id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["bookmarks-cme"] }); setSuccessMsg("Bookmark removed"); setTimeout(() => setSuccessMsg(""), 3000); },
  });
  const handleBookmarkToggle = () => {
    if (isBookmarked) removeBookmarkMutation.mutate();
    else addBookmarkMutation.mutate();
  };

  if (isLoading && !event) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => <div key={i} className="h-32 bg-white rounded-xl animate-pulse border border-gray-100" />)}
      </div>
    );
  }

  if (!event) {
    return (
      <div className="text-center py-20">
        <span className="text-4xl block mb-3">📅</span>
        <p className="text-gray-500">Event not found</p>
        <button onClick={() => router.back()} className="mt-4 text-[#5b2bce] font-semibold text-sm">← Go back</button>
      </div>
    );
  }

  const title = event.title || "";
  const description = event.description || "";
  const eventDate = event.event_date || "";
  const eventTime = event.event_time || "";
  const eventType = event.event_type || "";
  const eventMode = event.event_mode || "";
  const platform = event.platform || "";
  const meetingLink = event.meeting_link || "";
  const speaker = event.speaker || "";
  const venueName = event.venue_name || "";
  const maxAttendees = event.max_attendees || null;
  const status = event.status || "upcoming";
  const duration = event.duration || "";
  const cmeCredits = event.cme_credits || "2.0";

  const getStatusColor = () => {
    switch (status.toLowerCase()) {
      case "upcoming": return "bg-purple-600 text-white";
      case "ongoing": return "bg-green-500 text-white";
      case "completed": return "bg-gray-500 text-white";
      default: return "bg-purple-600 text-white";
    }
  };

  return (
    <div className="space-y-5">
      {/* Loading bar — shows while full detail fetches in background */}
      {isFetching && (
        <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-purple-100 overflow-hidden">
          <div className="h-full bg-purple-600" style={{ width: "40%", animation: "loadingBar 1.5s ease-in-out infinite" }} />
        </div>
      )}

      {/* Success toast */}
      {successMsg && (
        <div className="fixed top-5 right-5 z-50 bg-green-600 text-white px-4 py-2.5 rounded-xl shadow-xl font-semibold text-sm flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {successMsg}
        </div>
      )}

      {/* Back + Bookmark */}
      <div className="flex items-center justify-between">
        <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-[#5b2bce] font-medium">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Back to CME Events
        </button>
        <button onClick={handleBookmarkToggle} disabled={addBookmarkMutation.isPending || removeBookmarkMutation.isPending || !orgId}
          className={`flex items-center gap-1.5 border rounded-lg px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${isBookmarked ? "border-purple-500 bg-purple-50 text-purple-600" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
          <svg className="w-4 h-4" fill={isBookmarked ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>
          {isBookmarked ? "Saved" : "Save"}
        </button>
      </div>

      {/* Hero Banner */}
      <div className="rounded-2xl overflow-hidden relative" style={{ background: "linear-gradient(135deg, #2E23B5 0%, #4B39E6 50%, #7c3aed 100%)" }}>
        {isFetching && (
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none"
            style={{ animation: "shimmer 1.5s infinite", backgroundSize: "200% 100%" }} />
        )}
        <div className="relative px-6 sm:px-8 py-6 sm:py-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-3">
              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${getStatusColor()}`}>
                {status}
              </span>
              {eventMode && (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-white/20 text-white capitalize">
                  {eventMode}
                </span>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white mb-2">{title}</h1>
            {speaker && <p className="text-indigo-200 text-sm">Speaker: <span className="text-white font-semibold">{speaker}</span></p>}
          </div>
          <div className="hidden md:block w-28 h-28 relative flex-shrink-0">
            <Image src="/images/cme/cme_icon.png" alt="" fill className="object-contain" />
          </div>
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left — Event Details */}
        <div className="lg:col-span-2 space-y-4">
          {/* Description */}
          {description && (
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <h3 className="text-sm font-bold text-gray-900 mb-3">📝 About This Event</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{description}</p>
            </div>
          )}

          {/* Event Info Grid */}
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <h3 className="text-sm font-bold text-gray-900 mb-4">📋 Event Details</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {[
                { icon: "📅", label: "Date", value: eventDate ? formatISTDate(eventDate) : "TBA" },
                { icon: "🕐", label: "Time", value: eventTime || "TBA" },
                { icon: "⏱️", label: "Duration", value: duration ? `${duration} mins` : "—" },
                { icon: "🎓", label: "CME Credits", value: cmeCredits },
                { icon: "📺", label: "Mode", value: eventMode ? eventMode.charAt(0).toUpperCase() + eventMode.slice(1) : "—" },
                { icon: "🏷️", label: "Type", value: eventType || "—" },
              ].map((item) => (
                <div key={item.label} className="flex items-start gap-2.5">
                  <span className="text-lg">{item.icon}</span>
                  <div>
                    <p className="text-[10px] text-gray-400 font-medium">{item.label}</p>
                    <p className="text-xs font-semibold text-gray-800">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Venue / Platform */}
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <h3 className="text-sm font-bold text-gray-900 mb-3">
              {eventMode === "online" ? "💻 Online Platform" : "📍 Venue"}
            </h3>
            {eventMode === "online" ? (
              <div className="space-y-2">
                {platform && <p className="text-sm text-gray-600">Platform: <span className="font-semibold">{platform}</span></p>}
                {meetingLink && isRegistered && (
                  <a href={meetingLink} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                    Join Meeting
                  </a>
                )}
                {meetingLink && !isRegistered && (
                  <p className="text-xs text-gray-400">Register to access the meeting link</p>
                )}
                {!meetingLink && <p className="text-xs text-gray-400">Meeting link will be shared before the event</p>}
              </div>
            ) : (
              <div>
                {venueName && <p className="text-sm text-gray-600 font-semibold">{venueName}</p>}
                {!venueName && <p className="text-xs text-gray-400">Venue details will be shared soon</p>}
              </div>
            )}
          </div>

          {/* Speaker */}
          {speaker && (
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <h3 className="text-sm font-bold text-gray-900 mb-3">🎤 Speaker</h3>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                  {speaker.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">{speaker}</p>
                  {eventType && <p className="text-xs text-gray-400">{eventType}</p>}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right — Registration Card */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-100 p-5 sticky top-24">
            <h3 className="text-sm font-bold text-gray-900 mb-4">Registration</h3>

            <div className="space-y-3 mb-5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Status</span>
                <span className={`font-bold capitalize ${status === "upcoming" ? "text-purple-600" : status === "ongoing" ? "text-green-600" : "text-gray-500"}`}>
                  {status}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">CME Credits</span>
                <span className="font-bold text-gray-900">{cmeCredits}</span>
              </div>
              {maxAttendees && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Max Attendees</span>
                  <span className="font-bold text-gray-900">{maxAttendees}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Your Status</span>
                <span className={`font-bold ${isRegistered ? "text-green-600" : "text-orange-500"}`}>
                  {isRegistered ? "Registered" : "Not Registered"}
                </span>
              </div>
            </div>

            {isRegistered ? (
              <div className="space-y-3">
                <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-center">
                  <p className="text-sm font-bold text-green-700">You're Registered!</p>
                  <p className="text-xs text-green-600 mt-0.5">You'll receive reminders before the event</p>
                </div>
                {meetingLink && eventMode === "online" && (
                  <a href={meetingLink} target="_blank" rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl text-sm font-bold transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                    Join Live
                  </a>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <button
                  onClick={() => registerMutation.mutate()}
                  disabled={registerMutation.isPending || status === "completed"}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-xl text-sm font-bold transition-colors disabled:opacity-50"
                >
                  {registerMutation.isPending ? "Registering..." : status === "completed" ? "Event Ended" : "Register Now"}
                </button>
                {registerMutation.isError && (
                  <p className="text-xs text-red-500 text-center">
                    {registerMutation.error?.message || "Registration failed"}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Quick Info */}
          <div className="bg-purple-50 rounded-xl border border-purple-100 p-4">
            <h4 className="text-xs font-bold text-purple-800 mb-2">Why Attend?</h4>
            <ul className="space-y-1.5 text-xs text-purple-700">
              <li className="flex items-start gap-1.5"><span>✓</span> Earn {cmeCredits} CME credits</li>
              <li className="flex items-start gap-1.5"><span>✓</span> Learn from expert: {speaker || "Top specialist"}</li>
              <li className="flex items-start gap-1.5"><span>✓</span> {eventMode === "online" ? "Attend from anywhere" : "Network with peers"}</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
