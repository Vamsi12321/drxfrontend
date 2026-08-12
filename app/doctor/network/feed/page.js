"use client";
import { useState, useEffect, useRef, Suspense } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { get, post as apiPost, del } from "@/lib/api";
import { Icons } from "@/components/network/Icons";
import { timeAgoIST as timeAgo } from "@/lib/time";

const ACCENT = {
  indigo: {
    btn: "bg-indigo-600 hover:bg-indigo-700 text-white",
    ring: "focus:ring-indigo-200",
    border: "border-indigo-300",
    bg: "bg-indigo-50",
    text: "text-indigo-600",
    commentBg: "bg-indigo-50",
    borderTop: "border-indigo-100",
    checkBg: "bg-indigo-600 border-indigo-600",
    selectedBg: "border-indigo-300 bg-indigo-50",
  },
};

export default function FeedPage() {
  return (
    <Suspense fallback={<div className="space-y-3">{[1,2,3].map((i) => <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />)}</div>}>
      <FeedPageInner />
    </Suspense>
  );
}

function FeedPageInner() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const highlightPostId = searchParams?.get("post") || null;
  const [showCreate, setShowCreate] = useState(false);
  const [filterRole, setFilterRole] = useState("");
  const [page, setPage] = useState(1);
  const [userId, setUserId] = useState(null);
  const [userName, setUserName] = useState("");

  useEffect(() => {
    setUserId(localStorage.getItem("userId"));
    setUserName(localStorage.getItem("userName") || "Doctor");
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ["network-feed", page, filterRole],
    queryFn: () => {
      const params = new URLSearchParams({ page, limit: 20 });
      if (filterRole) params.append("author_role", filterRole);
      return get("/api/v1/network/feed?" + params);
    },
    staleTime: 60000,
  });

  // Prefetch post bookmarks so PostCard can check
  useQuery({
    queryKey: ["bookmarks-posts"],
    queryFn: () => get("/api/v1/bookmarks/posts"),
    staleTime: 60 * 1000,
  });

  const posts = data?.posts || [];
  const totalPages = data?.total_pages || 1;
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["network-feed"] });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6 min-w-0 overflow-hidden">
      {/* Main feed */}
      <div className="space-y-4 min-w-0 overflow-hidden">
        {/* Create post area */}
        <div className="bg-white rounded-xl p-3 sm:p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-3 sm:mb-4">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-xs sm:text-sm flex-shrink-0">
              {userName?.charAt(0)?.toUpperCase()}
            </div>
            <button onClick={() => setShowCreate(true)}
              className="flex-1 px-4 py-2.5 bg-gray-50 hover:bg-gray-100 rounded-full border border-gray-200 text-left text-gray-400 text-sm transition-all">
              What&apos;s on your mind, Dr. {userName?.split(" ")[0] || ""}?
            </button>
          </div>
          {/* Action row */}
          <div className="flex items-center justify-between border-t border-gray-100 pt-3">
            <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
              <button className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-purple-600 transition-colors">
                <svg className="w-4.5 h-4.5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                <span className="hidden sm:inline">Photo</span>
              </button>
              <button className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-purple-600 transition-colors">
                <svg className="w-4.5 h-4.5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                <span className="hidden sm:inline">Poll</span>
              </button>
              <button className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-purple-600 transition-colors">
                <svg className="w-4.5 h-4.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" /></svg>
                <span className="hidden sm:inline">Article</span>
              </button>
              <button className="hidden sm:flex items-center gap-1.5 text-sm text-gray-500 hover:text-purple-600 transition-colors">
                <svg className="w-4.5 h-4.5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" /></svg>
                Case Discussion
              </button>
            </div>
            <button onClick={() => setShowCreate(true)}
              className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-semibold transition-all">
              Post
            </button>
          </div>
        </div>

        {/* Posts */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 animate-pulse">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-gray-200 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <div className="h-3.5 bg-gray-200 rounded w-1/3" />
                    <div className="h-3 bg-gray-100 rounded w-1/4" />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="h-3.5 bg-gray-200 rounded w-full" />
                  <div className="h-3.5 bg-gray-200 rounded w-4/5" />
                </div>
              </div>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-gray-100">
            <span className="text-5xl">📝</span>
            <p className="text-gray-400 mt-3 text-sm font-medium">No posts yet. Be the first to share!</p>
          </div>
        ) : (
          <>
            {posts.map((p) => (
              <PostCard key={p.post_id || p.id || p._id} post={p} currentUserId={userId} highlight={highlightPostId === (p.post_id || p.id || p._id)} />
            ))}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-3 mt-4">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                  className="px-4 py-2 bg-white border border-gray-200 rounded-lg font-semibold text-gray-600 hover:border-purple-400 disabled:opacity-40 transition-all text-sm">
                  ← Prev
                </button>
                <span className="text-gray-500 text-sm font-medium">{page} / {totalPages}</span>
                <button onClick={() => setPage((p) => p + 1)} disabled={page >= totalPages}
                  className="px-4 py-2 bg-white border border-gray-200 rounded-lg font-semibold text-gray-600 hover:border-purple-400 disabled:opacity-40 transition-all text-sm">
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Right Sidebar */}
      <div className="space-y-5">
        {/* Suggested Connections — from Discover API */}
        <SuggestedConnectionsSidebar />

        {/* My Groups — from Groups API */}
        <MyGroupsSidebar />
      </div>

      {showCreate && (
        <CreatePostModal userName={userName}
          onClose={() => setShowCreate(false)}
          onCreated={() => { invalidate(); setShowCreate(false); }} />
      )}
    </div>
  );
}

function SuggestedConnectionsSidebar() {
  const { data } = useQuery({
    queryKey: ["discover-users-sidebar"],
    queryFn: () => get("/api/v1/connections/discover?limit=5"),
    staleTime: 60000,
  });
  const users = data?.users || [];

  const queryClient = useQueryClient();
  const connectMutation = useMutation({
    mutationFn: (uid) => apiPost("/api/v1/connections/request/" + uid, {}),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["discover-users-sidebar"] }); queryClient.invalidateQueries({ queryKey: ["discover-users"] }); },
  });

  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold" style={{ color: "#3b3a8a" }}>Suggested Connections</h3>
      </div>
      {users.length === 0 ? (
        <p className="text-xs text-gray-400 text-center py-4">No suggestions right now</p>
      ) : (
        <div className="space-y-3">
          {users.map((u) => (
            <div key={u.user_id} className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                {(u.name || "").split(" ").map((n) => n[0]).join("").slice(0, 2)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">{u.name}</p>
                <p className="text-xs text-gray-400">{u.specialization || "Doctor"}{u.city ? ` · ${u.city}` : ""}</p>
              </div>
              <button onClick={() => connectMutation.mutate(u.user_id)} disabled={connectMutation.isPending}
                className="px-3 py-1.5 border border-purple-200 text-purple-600 rounded-lg text-xs font-semibold hover:bg-purple-50 transition-all disabled:opacity-50">
                Connect
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MyGroupsSidebar() {
  const { data } = useQuery({
    queryKey: ["my-groups-sidebar"],
    queryFn: () => get("/api/v1/groups"),
    staleTime: 60000,
  });
  const groups = data?.groups || [];

  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold" style={{ color: "#3b3a8a" }}>My Groups</h3>
      </div>
      {groups.length === 0 ? (
        <p className="text-xs text-gray-400 text-center py-4">No groups yet</p>
      ) : (
        <div className="space-y-3">
          {groups.slice(0, 4).map((g) => (
            <div key={g.group_id} className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                {(g.group_name || "G").charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">{g.group_name}</p>
                <p className="text-xs text-gray-400">{g.members_count} members</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


export function PostCard({ post: postData, currentUserId, highlight = false }) {
  const queryClient = useQueryClient();
  const postId = postData.post_id || postData.id || postData._id;
  // Initialize liked state from post data
  const [liked, setLiked] = useState(postData.is_liked || postData.liked || false);
  const [likesCount, setLikesCount] = useState(postData.likes_count || postData.like_count || 0);
  const [showComments, setShowComments] = useState(false);
  const [commentsCount, setCommentsCount] = useState(postData.comments_count || 0);
  const [showShare, setShowShare] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [bookmarkId, setBookmarkId] = useState(null);
  const cardRef = useRef(null);

  // Check if post is bookmarked from cache
  useEffect(() => {
    const cached = queryClient.getQueryData(["bookmarks-posts"]);
    if (cached?.bookmarks) {
      const found = cached.bookmarks.find((b) => b.post_id === postId);
      if (found) { setIsBookmarked(true); setBookmarkId(found.id); }
    }
  }, [postId, queryClient]);

  useEffect(() => {
    if (highlight && cardRef.current) {
      cardRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [highlight]);

  const likeMutation = useMutation({
    mutationFn: () => {
      if (liked) {
        // Try unlike
        return del("/api/v1/network/posts/" + postId + "/like").catch((err) => {
          // If unlike endpoint doesn't exist, just ignore
          if (err.status === 404 || err.status === 405) return { unliked: true };
          throw err;
        });
      }
      return apiPost("/api/v1/network/posts/" + postId + "/like", {});
    },
    onSuccess: (res) => {
      if (liked) {
        // Unliked
        setLiked(false);
        setLikesCount((c) => Math.max(0, c - 1));
      } else {
        // Liked
        const newCount = res.likes_count ?? res.like_count ?? likesCount + 1;
        setLiked(true);
        setLikesCount(newCount);
      }
    },
    onError: (err) => {
      // If "already liked" — just mark as liked, don't show error
      const msg = (err.message || "").toLowerCase();
      if (msg.includes("already liked") || msg.includes("already")) {
        setLiked(true);
      }
    },
  });

  const addBookmarkMutation = useMutation({
    mutationFn: () => apiPost("/api/v1/bookmarks/posts", {
      post_id: postId,
      post_author_name: postData.author_name || "",
      post_content_preview: (postData.content || "").slice(0, 100),
    }),
    onSuccess: (res) => {
      setIsBookmarked(true);
      setBookmarkId(res.bookmark_id || null);
      queryClient.invalidateQueries({ queryKey: ["bookmarks-posts"] });
    },
  });

  const removeBookmarkMutation = useMutation({
    mutationFn: () => del("/api/v1/bookmarks/posts/" + bookmarkId),
    onSuccess: () => {
      setIsBookmarked(false);
      setBookmarkId(null);
      queryClient.invalidateQueries({ queryKey: ["bookmarks-posts"] });
    },
  });

  const handleBookmarkToggle = () => {
    if (isBookmarked && bookmarkId) { removeBookmarkMutation.mutate(); }
    else { addBookmarkMutation.mutate(); }
  };

  const bookmarkLoading = addBookmarkMutation.isPending || removeBookmarkMutation.isPending;

  // Extract hashtags from content
  const renderContent = (content) => {
    const parts = content.split(/(#\w+)/g);
    return parts.map((part, i) =>
      part.startsWith("#") ? (
        <span key={i} className="text-purple-600 font-medium cursor-pointer hover:underline">{part}</span>
      ) : (
        <span key={i}>{part}</span>
      )
    );
  };

  return (
    <div ref={cardRef}
      className={"bg-white rounded-xl shadow-sm border transition-all " + (highlight ? "border-purple-400 ring-2 ring-purple-100" : "border-gray-100")}>
      <div className="p-3 sm:p-5">
        {/* Author row */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 bg-gradient-to-br from-indigo-500 to-purple-500">
              {postData.author_name?.split(" ").map((n) => n[0]).join("").slice(0, 2)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-bold text-gray-900 text-sm">{postData.author_name}</p>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-100 text-purple-700">
                  {postData.author_specialization || "Doctor"}
                </span>
              </div>
              <p className="text-xs text-gray-400">
                {postData.author_territory || "Hospital"} · {timeAgo(postData.created_at)}
              </p>
            </div>
          </div>
          <button className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>
          </button>
        </div>

        {/* Content */}
        <p className="text-gray-800 text-sm leading-relaxed mb-3">{renderContent(postData.content)}</p>

        {/* Engagement row */}
        <div className="flex items-center justify-between py-2.5 border-t border-gray-100 text-sm text-gray-500">
          <div className="flex items-center gap-4">
            <button onClick={() => likeMutation.mutate()} disabled={likeMutation.isPending}
              className={"flex items-center gap-1.5 font-medium transition-all disabled:opacity-50 " + (liked ? "text-blue-600" : "text-gray-500 hover:text-blue-600")}>
              <svg className="w-4.5 h-4.5" fill={liked ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" /></svg>
              {likesCount}
            </button>
            <button onClick={() => setShowComments((s) => !s)}
              className="flex items-center gap-1.5 text-gray-500 hover:text-purple-600 font-medium transition-all">
              <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
              {commentsCount} Comments
            </button>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setShowShare(true)}
              className="flex items-center gap-1.5 text-gray-500 hover:text-purple-600 font-medium transition-all">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
              Share
            </button>
            <button onClick={handleBookmarkToggle} disabled={bookmarkLoading}
              className={"transition-all disabled:opacity-50 " + (isBookmarked ? "text-purple-600" : "text-gray-400 hover:text-purple-600")}>
              <svg className="w-4.5 h-4.5" fill={isBookmarked ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>
            </button>
          </div>
        </div>
      </div>

      {showComments && (
        <div className="border-t border-gray-100 px-5 pb-4 pt-3">
          <CommentsSection postId={postData.post_id || postData.id || postData._id} currentUserId={currentUserId} onCountChange={setCommentsCount} />
        </div>
      )}
      {showShare && (
        <SharePostModal post={postData} onClose={() => setShowShare(false)} />
      )}
    </div>
  );
}

export function CommentsSection({ postId, currentUserId, onCountChange }) {
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["comments", postId],
    queryFn: () => get("/api/v1/network/posts/" + postId + "/comments?limit=50&sort=asc"),
    staleTime: 0,
  });
  const comments = data?.comments || [];

  // Update parent count whenever comments data changes
  useEffect(() => {
    if (data) {
      onCountChange(data.total ?? comments.length);
    }
  }, [data, comments.length]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["comments", postId] });
  };

  const addMutation = useMutation({
    mutationFn: () => apiPost("/api/v1/network/posts/" + postId + "/comments", { content: newComment }),
    onSuccess: () => { setNewComment(""); invalidate(); },
  });
  const deleteMutation = useMutation({
    mutationFn: (cid) => del("/api/v1/network/posts/" + postId + "/comments/" + cid),
    onSuccess: invalidate,
  });

  return (
    <div>
      {isLoading ? (
        <p className="text-xs text-gray-400 py-2">Loading...</p>
      ) : comments.length === 0 ? (
        <p className="text-xs text-gray-400 py-1 mb-2">No comments yet.</p>
      ) : (
        <div className="space-y-2 mb-3 max-h-52 overflow-y-auto">
          {comments.map((c) => (
            <div key={c.comment_id} className="rounded-xl px-3 py-2 flex items-start gap-2 bg-gray-50">
              <div className="w-7 h-7 bg-gradient-to-br from-gray-400 to-gray-500 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                {c.author_name?.charAt(0)?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-xs font-bold text-gray-800">{c.author_name}</span>
                <span className="text-xs text-gray-400 ml-1.5">{timeAgo(c.created_at)}</span>
                <p className="text-xs text-gray-700 mt-0.5">{c.content}</p>
              </div>
              {c.author_id === currentUserId && (
                <button onClick={() => deleteMutation.mutate(c.comment_id)}
                  className="text-gray-300 hover:text-red-400 flex-shrink-0 transition-colors">
                  <Icons.close />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <input type="text" value={newComment} onChange={(e) => setNewComment(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && newComment.trim() && addMutation.mutate()}
          placeholder="Write a comment..." maxLength={1000}
          className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-200" />
        <button onClick={() => addMutation.mutate()} disabled={!newComment.trim() || addMutation.isPending}
          className="px-4 py-2 rounded-xl text-sm font-bold transition-all disabled:opacity-50 bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-1">
          <Icons.send /> Post
        </button>
      </div>
    </div>
  );
}

export function CreatePostModal({ userName, onClose, onCreated }) {
  const [content, setContent] = useState("");
  const [error, setError] = useState("");

  const mutation = useMutation({
    mutationFn: () => apiPost("/api/v1/network/posts", { content }),
    onSuccess: onCreated,
    onError: (err) => setError(err.message || "Failed to post"),
  });

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold" style={{ color: "#3b3a8a" }}>Create Post</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><Icons.close /></button>
        </div>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
            {userName?.charAt(0)?.toUpperCase()}
          </div>
          <p className="font-semibold text-gray-800">{userName}</p>
        </div>
        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-xl text-sm mb-3">{error}</div>}
        <textarea value={content} onChange={(e) => setContent(e.target.value)}
          placeholder="Share insights, ask questions, or connect with healthcare professionals..."
          className="w-full h-36 px-4 py-3 border-2 border-gray-200 rounded-xl outline-none resize-none mb-1 text-sm focus:border-purple-400"
          maxLength={5000} />
        <p className="text-xs text-gray-400 text-right mb-4">{content.length}/5000</p>
        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl font-semibold hover:bg-gray-50 transition-all text-sm">
            Cancel
          </button>
          <button onClick={() => mutation.mutate()} disabled={!content.trim() || mutation.isPending}
            className="flex-1 py-2.5 rounded-xl font-bold transition-all disabled:opacity-50 text-sm bg-purple-600 hover:bg-purple-700 text-white">
            {mutation.isPending ? "Posting..." : "Post"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function SharePostModal({ post, onClose }) {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState([]);
  const [message, setMessage] = useState("");
  const [result, setResult] = useState(null);

  const { data: connData, isLoading } = useQuery({
    queryKey: ["my-connections"],
    queryFn: () => get("/api/v1/connections?limit=50"),
    staleTime: 30000,
  });
  const connections = connData?.connections || [];

  const toggle = (uid) => setSelected((prev) =>
    prev.includes(uid) ? prev.filter((id) => id !== uid) : prev.length < 10 ? [...prev, uid] : prev
  );

  const shareMutation = useMutation({
    mutationFn: async () => {
      const postId = post.post_id || post.id || post._id;
      // Call share-to-chat for each selected recipient
      const results = await Promise.all(
        selected.map((uid) =>
          apiPost(`/api/v1/network/posts/${postId}/share-to-chat`, { recipient_id: uid })
        )
      );
      return { message: "Post shared via chat", shared_to: results.length };
    },
    onSuccess: (data) => {
      setResult(data);
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
            <Icons.share /> Share Post
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><Icons.close /></button>
        </div>

        {result ? (
          <div className="p-6 text-center space-y-3">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <Icons.check />
            </div>
            <p className="font-bold text-gray-900">{result.message}</p>
            <p className="text-sm text-gray-500">Shared to {result.shared_to} user{result.shared_to !== 1 ? "s" : ""}</p>
            <button onClick={onClose} className="w-full py-2.5 rounded-xl font-bold text-sm bg-purple-600 hover:bg-purple-700 text-white">Done</button>
          </div>
        ) : (
          <>
            <div className="px-5 py-3 border-b border-gray-100 flex-shrink-0">
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs font-bold text-gray-700">{post.author_name}</p>
                <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{post.content}</p>
              </div>
            </div>
            <div className="px-5 pt-3 flex-shrink-0">
              <textarea value={message} onChange={(e) => setMessage(e.target.value)}
                placeholder="Add a message (optional)..." maxLength={500} rows={2}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-200 resize-none" />
            </div>
            <div className="px-5 py-2 flex-shrink-0">
              <p className="text-xs font-semibold text-gray-500">Select recipients ({selected.length}/10)</p>
            </div>
            <div className="flex-1 overflow-y-auto px-5 pb-2 min-h-0">
              {isLoading ? (
                <div className="space-y-2">{[1,2,3].map((i) => <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse" />)}</div>
              ) : connections.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-4">No connections yet.</p>
              ) : connections.map((c) => {
                const isSel = selected.includes(c.user_id);
                return (
                  <button key={c.user_id} onClick={() => toggle(c.user_id)}
                    className={"w-full flex items-center gap-3 p-2.5 rounded-xl mb-1 transition-all border " + (isSel ? "border-purple-300 bg-purple-50" : "border-transparent hover:bg-gray-50")}>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0 bg-gradient-to-br from-indigo-500 to-purple-500">
                      {c.name?.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-sm font-semibold text-gray-900 truncate">{c.name}</p>
                      <p className="text-xs text-gray-400">{c.specialization || c.role}</p>
                    </div>
                    <div className={"w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 " + (isSel ? "bg-purple-600 border-purple-600" : "border-gray-300")}>
                      {isSel && <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="p-4 border-t border-gray-100 flex-shrink-0">
              <button onClick={() => shareMutation.mutate()} disabled={selected.length === 0 || shareMutation.isPending}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm transition-all disabled:opacity-50 bg-purple-600 hover:bg-purple-700 text-white">
                <Icons.share />
                {shareMutation.isPending ? "Sharing..." : `Share with ${selected.length || "..."} ${selected.length === 1 ? "person" : "people"}`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
