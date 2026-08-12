"use client";
import { useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { get, post as apiPost, del } from "@/lib/api";
import { Icons } from "@/components/network/Icons";
import { timeAgoIST as timeAgo, formatIST } from "@/lib/time";
import { CommentsSection } from "@/app/doctor/network/feed/page";
import { useNetworkToast } from "@/app/doctor/network/layout";


export default function MyPostsPage() {
  const queryClient = useQueryClient();
  const userName = typeof window !== "undefined" ? localStorage.getItem("userName") : "";
  const userRole = typeof window !== "undefined" ? localStorage.getItem("userRole") : "";
  const userId   = typeof window !== "undefined" ? localStorage.getItem("userId")   : null;

  const { data, isLoading } = useQuery({
    queryKey: ["my-posts"],
    queryFn: () => get("/api/v1/network/posts/me?limit=50"),
    staleTime: 60000,
  });

  const posts      = data?.posts || [];
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["my-posts"] });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 min-w-0 overflow-hidden">
      <div className="lg:col-span-2 space-y-4">
        <div className="bg-white rounded-2xl p-5 shadow-lg border border-gray-200 flex items-center gap-4">
          <div className="w-16 h-16 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center text-white font-bold text-2xl shadow-lg flex-shrink-0">
            {userName?.charAt(0)?.toUpperCase()}
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-800">{userName}</h3>
            <p className="text-sm text-gray-500 capitalize">{userRole}</p>
            <p className="text-xs text-gray-400 mt-0.5">{posts.length} post{posts.length !== 1 ? "s" : ""}</p>
          </div>
        </div>
        {isLoading ? (
          <div className="space-y-4">{[1, 2].map((i) => <div key={i} className="h-32 bg-gray-100 rounded-2xl animate-pulse" />)}</div>
        ) : posts.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl shadow border border-gray-200">
            <p className="text-gray-500 mt-4 font-medium">You have not posted anything yet.</p>
          </div>
        ) : (
          posts.map((p) => <MyPostCard key={p.post_id} post={p} currentUserId={userId} accentColor="indigo" onDeleted={invalidate} />)
        )}
      </div>
      <div className="space-y-4 sm:space-y-6">
        <div className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl p-4 sm:p-6 text-white shadow-xl">
          <h3 className="text-base sm:text-lg font-bold mb-3">Your Network Impact</h3>
          <div className="space-y-2">
            {[{ label: "Profile Views", value: "---" }, { label: "Post Reach", value: "---" }].map((s) => (
              <div key={s.label} className="flex items-center justify-between">
                <span className="text-indigo-100 text-sm">{s.label}</span>
                <span className="text-xl font-bold">{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function MyPostCard({ post, currentUserId, accentColor = "indigo", onDeleted }) {
  const [showComments, setShowComments]   = useState(false);
  const [commentsCount, setCommentsCount] = useState(post.comments_count || 0);
  const { showToast } = useNetworkToast();
  const accent = accentColor;

  const deleteMutation = useMutation({
    mutationFn: () => del(`/api/v1/network/posts/${post.post_id || post.id || post._id}`),
    onSuccess: () => { onDeleted(); showToast("Post deleted."); },
    onError: (e) => showToast(e.message || "Failed to delete post", "error"),
  });

  return (
    <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-lg border border-gray-200">
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs text-gray-400">{timeAgo(post.created_at)}</p>
        <button onClick={() => { if (confirm("Delete this post?")) deleteMutation.mutate(); }}
          disabled={deleteMutation.isPending}
          className="flex items-center gap-1 text-xs text-red-400 hover:text-red-600 font-semibold px-2 py-1 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50">
          <Icons.trash /> {deleteMutation.isPending ? "Deleting..." : "Delete"}
        </button>
      </div>
      <p className="text-gray-800 leading-relaxed mb-4">{post.content}</p>
      <div className="flex gap-4 text-xs text-gray-500 border-t border-gray-100 pt-3 mb-2">
        <span className="flex items-center gap-1"><Icons.likedFill /> {post.likes_count || 0} likes</span>
        <button onClick={() => setShowComments((s) => !s)}
          className={`flex items-center gap-1 font-semibold transition-colors ${showComments ? `text-${accent}-600` : "hover:text-gray-700"}`}>
          <Icons.comment /> {commentsCount} comments
        </button>
      </div>
      {showComments && (
        <CommentsSection postId={post.post_id} currentUserId={currentUserId} accentColor={accent} onCountChange={setCommentsCount} />
      )}
    </div>
  );
}
