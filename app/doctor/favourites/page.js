"use client";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { get, del } from "@/lib/api";

const TABS = [
  { id: "all", label: "All Bookmarks" },
  { id: "drugs", label: "Drugs" },
  { id: "cme", label: "CME Events" },
  { id: "posts", label: "Posts" },
];

export default function BookmarksPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [orgId, setOrgId] = useState(null);
  const [companyName, setCompanyName] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  useEffect(() => {
    setOrgId(localStorage.getItem("selectedOrgId") || null);
    setCompanyName(localStorage.getItem("companyName") || "");
  }, []);

  // Fetch bookmarked drugs
  const { data: drugsData, isLoading: drugsLoading } = useQuery({
    queryKey: ["bookmarks-drugs", orgId],
    queryFn: () => get("/api/v1/bookmarks/drugs", orgId ? { org_id: orgId } : undefined),
    staleTime: 60 * 1000,
    placeholderData: (prev) => prev,
  });

  // Fetch bookmarked CME events
  const { data: cmeData, isLoading: cmeLoading } = useQuery({
    queryKey: ["bookmarks-cme", orgId],
    queryFn: () => get("/api/v1/bookmarks/cme", orgId ? { org_id: orgId } : undefined),
    staleTime: 60 * 1000,
    placeholderData: (prev) => prev,
  });

  // Fetch bookmarked posts
  const { data: postsData, isLoading: postsLoading } = useQuery({
    queryKey: ["bookmarks-posts"],
    queryFn: () => get("/api/v1/bookmarks/posts"),
    staleTime: 60 * 1000,
    placeholderData: (prev) => prev,
  });

  const drugBookmarks = drugsData?.bookmarks || [];
  const cmeBookmarks = cmeData?.bookmarks || [];
  const postBookmarks = postsData?.bookmarks || [];
  const totalDrugs = drugsData?.total || drugBookmarks.length;
  const totalCme = cmeData?.total || cmeBookmarks.length;
  const totalPosts = postsData?.total || postBookmarks.length;
  const totalAll = totalDrugs + totalCme + totalPosts;

  const isLoading = drugsLoading || cmeLoading || postsLoading;
  const showLoading = isLoading && !drugsData && !cmeData && !postsData;

  // Remove drug bookmark
  const removeDrugMutation = useMutation({
    mutationFn: (bookmarkId) => del(`/api/v1/bookmarks/drugs/${bookmarkId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookmarks-drugs"] });
    },
  });

  // Remove CME bookmark
  const removeCmeMutation = useMutation({
    mutationFn: (bookmarkId) => del(`/api/v1/bookmarks/cme/${bookmarkId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookmarks-cme"] });
    },
  });

  // Remove post bookmark
  const removePostMutation = useMutation({
    mutationFn: (bookmarkId) => del(`/api/v1/bookmarks/posts/${bookmarkId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookmarks-posts"] });
    },
  });

  const getTabCount = (tabId) => {
    switch (tabId) {
      case "drugs": return totalDrugs;
      case "cme": return totalCme;
      case "posts": return totalPosts;
      default: return totalAll;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "#3b3a8a" }}>Bookmarks</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Your bookmarked drugs and CME events{companyName ? ` from ${companyName}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="bg-purple-50 text-purple-700 px-3 py-1.5 rounded-lg text-sm font-semibold border border-purple-100">
            {totalAll} bookmark{totalAll !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* No org selected */}
      {!orgId && (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
          <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <p className="text-gray-500 text-sm font-medium">No organization selected</p>
          <p className="text-gray-400 text-xs mt-1">Select an organization from the top bar to see your bookmarks</p>
        </div>
      )}

      {orgId && (
        <>
          {/* Tabs */}
          <div className="flex items-center gap-2 border-b border-gray-200">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-all ${
                  activeTab === t.id
                    ? "border-purple-600 text-purple-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                {t.label}
                <span className="ml-1.5 text-xs text-gray-400">({getTabCount(t.id)})</span>
              </button>
            ))}
          </div>

          {/* Loading state */}
          {showLoading && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-white rounded-xl border border-gray-100 p-5 animate-pulse">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-gray-200 rounded-xl" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 bg-gray-200 rounded w-32" />
                      <div className="h-3 bg-gray-100 rounded w-48" />
                      <div className="h-2 bg-gray-100 rounded w-20" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Drug Bookmarks */}
          {!showLoading && (activeTab === "all" || activeTab === "drugs") && (
            <>
              {activeTab === "all" && drugBookmarks.length > 0 && (
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Drugs ({totalDrugs})</p>
              )}
              {drugBookmarks.length === 0 && activeTab === "drugs" && (
                <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
                  <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                  </svg>
                  <p className="text-gray-500 text-sm font-medium">No drug bookmarks yet</p>
                  <p className="text-gray-400 text-xs mt-1">Bookmark drugs from the drug search or detail pages</p>
                  <button
                    onClick={() => router.push("/doctor/drug-search")}
                    className="mt-4 px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    Browse Drugs
                  </button>
                </div>
              )}
              {drugBookmarks.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {drugBookmarks.map((bookmark) => (
                    <div
                      key={bookmark.id}
                      className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md transition-all group relative"
                    >
                      {/* Remove button */}
                      <button
                        onClick={() => removeDrugMutation.mutate(bookmark.id)}
                        disabled={removeDrugMutation.isPending}
                        className="absolute top-3 right-3 w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all disabled:opacity-50"
                        title="Remove bookmark"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                        </svg>
                      </button>

                      <div
                        className="flex items-start gap-4 cursor-pointer"
                        onClick={() => router.push(`/doctor/drug-details/${bookmark.drug_id}`)}
                      >
                        <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 flex-shrink-0 border border-blue-100">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-100 text-blue-700">
                              Drug
                            </span>
                            <span className="text-xs text-gray-400">
                              {bookmark.bookmarked_at
                                ? new Date(bookmark.bookmarked_at).toLocaleDateString("en-IN", {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                  })
                                : ""}
                            </span>
                          </div>
                          <h3 className="text-sm font-bold text-gray-800 line-clamp-1 mb-0.5 group-hover:text-[#5b2bce] transition-colors">
                            {bookmark.drug_name}
                          </h3>
                          <p className="text-xs text-gray-500 line-clamp-1">{companyName}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* CME Bookmarks */}
          {!showLoading && (activeTab === "all" || activeTab === "cme") && (
            <>
              {activeTab === "all" && cmeBookmarks.length > 0 && (
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mt-2">CME Events ({totalCme})</p>
              )}
              {cmeBookmarks.length === 0 && activeTab === "cme" && (
                <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
                  <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                  </svg>
                  <p className="text-gray-500 text-sm font-medium">No CME bookmarks yet</p>
                  <p className="text-gray-400 text-xs mt-1">Bookmark CME events from the events page</p>
                  <button
                    onClick={() => router.push("/doctor/cme-events")}
                    className="mt-4 px-4 py-2 bg-purple-600 text-white text-xs font-semibold rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    Browse CME Events
                  </button>
                </div>
              )}
              {cmeBookmarks.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {cmeBookmarks.map((bookmark) => (
                    <div
                      key={bookmark.id}
                      className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md transition-all group relative"
                    >
                      {/* Remove button */}
                      <button
                        onClick={() => removeCmeMutation.mutate(bookmark.id)}
                        disabled={removeCmeMutation.isPending}
                        className="absolute top-3 right-3 w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all disabled:opacity-50"
                        title="Remove bookmark"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                        </svg>
                      </button>

                      <div
                        className="flex items-start gap-4 cursor-pointer"
                        onClick={() => router.push("/doctor/cme-events")}
                      >
                        <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600 flex-shrink-0 border border-purple-100">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-purple-100 text-purple-700">
                              CME Event
                            </span>
                            <span className="text-xs text-gray-400">
                              {bookmark.bookmarked_at
                                ? new Date(bookmark.bookmarked_at).toLocaleDateString("en-IN", {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                  })
                                : ""}
                            </span>
                          </div>
                          <h3 className="text-sm font-bold text-gray-800 line-clamp-1 mb-0.5 group-hover:text-[#5b2bce] transition-colors">
                            {bookmark.event_title}
                          </h3>
                          <p className="text-xs text-gray-500 line-clamp-1">{companyName}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Post Bookmarks */}
          {!showLoading && (activeTab === "all" || activeTab === "posts") && (
            <>
              {activeTab === "all" && postBookmarks.length > 0 && (
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mt-2">Posts ({totalPosts})</p>
              )}
              {postBookmarks.length === 0 && activeTab === "posts" && (
                <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
                  <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                  </svg>
                  <p className="text-gray-500 text-sm font-medium">No post bookmarks yet</p>
                  <p className="text-gray-400 text-xs mt-1">Bookmark posts from the network feed</p>
                  <button
                    onClick={() => router.push("/doctor/network/feed")}
                    className="mt-4 px-4 py-2 bg-green-600 text-white text-xs font-semibold rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Browse Feed
                  </button>
                </div>
              )}
              {postBookmarks.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {postBookmarks.map((bookmark) => (
                    <div
                      key={bookmark.id}
                      className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md transition-all group relative"
                    >
                      {/* Remove button */}
                      <button
                        onClick={() => removePostMutation.mutate(bookmark.id)}
                        disabled={removePostMutation.isPending}
                        className="absolute top-3 right-3 w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all disabled:opacity-50"
                        title="Remove bookmark"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                        </svg>
                      </button>

                      <div
                        className="flex items-start gap-4 cursor-pointer"
                        onClick={() => router.push(`/doctor/network/feed?post=${bookmark.post_id}`)}
                      >
                        <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center text-green-600 flex-shrink-0 border border-green-100">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-green-100 text-green-700">
                              Post
                            </span>
                            <span className="text-xs text-gray-400">
                              {bookmark.bookmarked_at
                                ? new Date(bookmark.bookmarked_at).toLocaleDateString("en-IN", {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                  })
                                : ""}
                            </span>
                          </div>
                          <h3 className="text-sm font-bold text-gray-800 line-clamp-2 mb-0.5 group-hover:text-[#5b2bce] transition-colors">
                            {bookmark.post_content_preview || "Post"}
                          </h3>
                          <p className="text-xs text-gray-500 line-clamp-1">
                            {bookmark.post_author_name || ""}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* All empty */}
          {!showLoading && activeTab === "all" && drugBookmarks.length === 0 && cmeBookmarks.length === 0 && postBookmarks.length === 0 && (
            <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
              <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
              <p className="text-gray-500 text-sm font-medium">No bookmarks yet</p>
              <p className="text-gray-400 text-xs mt-1">Bookmark drugs, CME events, and posts for quick access</p>
              <div className="flex items-center justify-center gap-3 mt-4">
                <button
                  onClick={() => router.push("/doctor/drug-search")}
                  className="px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  Browse Drugs
                </button>
                <button
                  onClick={() => router.push("/doctor/cme-events")}
                  className="px-4 py-2 bg-purple-600 text-white text-xs font-semibold rounded-lg hover:bg-purple-700 transition-colors"
                >
                  Browse CME Events
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
