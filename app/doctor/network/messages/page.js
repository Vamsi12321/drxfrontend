"use client";
import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { get, post as apiPost, del } from "@/lib/api";
import { Icons } from "@/components/network/Icons";
import { timeAgoIST as timeAgo, formatIST } from "@/lib/time";


export default function MessagesPage() {
  const queryClient = useQueryClient();
  const [activeConvId, setActiveConvId] = useState(null);
  const [showNewChat, setShowNewChat]   = useState(false);
  const userId = typeof window !== "undefined" ? localStorage.getItem("userId") : null;

  const { data: inboxData, isLoading: inboxLoading } = useQuery({
    queryKey: ["conversations"],
    queryFn: () => get("/api/v1/chat/conversations"),
    refetchInterval: 3000,
    staleTime: 0,
  });

  const { data: connData } = useQuery({
    queryKey: ["my-connections"],
    queryFn: () => get("/api/v1/connections?limit=50"),
    staleTime: 30000,
  });

  const conversations = inboxData?.conversations || [];
  const connections   = connData?.connections    || [];
  const activeConv    = conversations.find((c) => c.conversation_id === activeConvId);
  // API returns "other_doctor" not "other_user"
  const activeOtherUser = activeConv?.other_doctor || activeConv?.other_user || null;

  const startConvMutation = useMutation({
    mutationFn: (uid) => apiPost(`/api/v1/chat/conversations/${uid}`, {}),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      setActiveConvId(data.conversation_id || data.id);
      setShowNewChat(false);
    },
  });

  const deleteConvMutation = useMutation({
    mutationFn: (id) => del(`/api/v1/chat/conversations/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["conversations"] }); setActiveConvId(null); },
  });

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden" style={{ height: "calc(100vh - 280px)", minHeight: "520px" }}>
      <div className="flex h-full">
        {/* Inbox */}
        <div className={`${activeConvId ? "hidden sm:flex" : "flex"} flex-col w-full sm:w-80 border-r border-gray-100 flex-shrink-0`}>
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2"><Icons.messages /> Messages</h2>
            </div>
            <button onClick={() => setShowNewChat(true)}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3 py-2 rounded-xl transition-colors">
              <Icons.newChat /> New
            </button>
          </div>
          <InboxTabs conversations={conversations} activeConvId={activeConvId} onSelect={setActiveConvId} isLoading={inboxLoading} accentColor="indigo" />
        </div>

        {/* Conversation */}
        {activeConvId ? (
          <ConversationPanel convId={activeConvId} otherUser={activeOtherUser} currentUserId={userId} accentColor="indigo"
            onBack={() => setActiveConvId(null)}
            onDelete={() => { if (confirm("Delete this conversation?")) deleteConvMutation.mutate(activeConvId); }} />
        ) : (
          <div className="hidden sm:flex flex-1 items-center justify-center text-center p-8">
            <div>
              <div className="text-gray-200 flex justify-center mb-4" style={{fontSize:"3rem"}}><Icons.messages /></div>
              <p className="text-gray-500 font-medium">Select a conversation</p>
              <p className="text-gray-400 text-sm mt-1">Or click "New" to start one</p>
            </div>
          </div>
        )}
      </div>

      {/* New chat modal */}
      {showNewChat && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900 flex items-center gap-2"><Icons.newChat /> New Message</h3>
              <button onClick={() => setShowNewChat(false)} className="text-gray-400 hover:text-gray-600"><Icons.close /></button>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {connections.length === 0 ? (
                <div className="text-center py-10 px-4">
                  <p className="text-gray-500 text-sm">No connections yet.</p>
                  <p className="text-gray-400 text-xs mt-1">Connect with users in My Network first.</p>
                </div>
              ) : connections.map((c) => (
                <button key={c.user_id} onClick={() => startConvMutation.mutate(c.user_id)} disabled={startConvMutation.isPending}
                  className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors text-left border-b border-gray-50 last:border-0 disabled:opacity-50">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 ${c.role === "MR" ? "bg-gradient-to-br from-orange-500 to-red-500" : "bg-gradient-to-br from-indigo-500 to-purple-500"}`}>
                    {c.name?.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm truncate">{c.name}</p>
                    <p className="text-xs text-gray-400">{c.specialization || c.territory || c.role}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-lg font-bold ${c.role === "MR" ? "bg-orange-100 text-orange-700" : "bg-indigo-100 text-indigo-700"}`}>{c.role}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ConversationPanel({ convId, otherUser, currentUserId, accentColor, onBack, onDelete }) {
  const queryClient = useQueryClient();
  const [content, setContent] = useState("");
  const bottomRef = useRef(null);

  const displayName = otherUser?.name || otherUser?.user_name || otherUser?.full_name || "User";
  const initials = displayName.split(" ").map((n) => n[0]).join("").slice(0, 2);

  useEffect(() => {
    apiPost(`/api/v1/chat/conversations/${convId}/read`, {}).catch(() => {});
    queryClient.invalidateQueries({ queryKey: ["conversations"] });
  }, [convId]);

  const { data, isLoading } = useQuery({
    queryKey: ["messages", convId],
    queryFn: () => get(`/api/v1/chat/conversations/${convId}/messages`),
    refetchInterval: 3000,
    staleTime: 0,
  });

  const messages = data?.messages || [];

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.length]);

  const sendMutation = useMutation({
    mutationFn: () => apiPost(`/api/v1/chat/conversations/${convId}/messages`, { content }),
    onSuccess: () => { setContent(""); queryClient.invalidateQueries({ queryKey: ["messages", convId] }); queryClient.invalidateQueries({ queryKey: ["conversations"] }); },
  });

  const deleteMsgMutation = useMutation({
    mutationFn: (msgId) => del(`/api/v1/chat/messages/${msgId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["messages", convId] }),
  });

  const isIndigo = accentColor === "indigo";

  return (
    <div className="flex flex-col flex-1 min-w-0">
      <div className="flex items-center gap-3 p-4 border-b border-gray-100">
        <button onClick={onBack} className="sm:hidden text-gray-400 hover:text-gray-600 mr-1"><Icons.back /></button>
        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 ${otherUser?.role === "MR" ? "bg-gradient-to-br from-orange-500 to-red-500" : "bg-gradient-to-br from-indigo-500 to-purple-500"}`}>
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-gray-900 truncate">{displayName}</p>
          <p className="text-xs text-gray-400">{otherUser?.role || otherUser?.specialization || ""}</p>
        </div>
        <button onClick={onDelete} className="flex items-center gap-1 text-xs text-red-400 hover:text-red-600 font-semibold px-2 py-1 rounded-lg hover:bg-red-50 transition-colors">
          <Icons.trash /> Delete
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center h-full"><p className="text-gray-400 text-sm">Loading messages...</p></div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-center">
            <div><p className="text-gray-400 text-sm">No messages yet</p><p className="text-gray-300 text-xs mt-1">Say hello!</p></div>
          </div>
        ) : messages.map((m) => {
          const isOwn = m.sender_id === currentUserId;
          const isShared = m.message_type === "shared_post" || (m.content && m.content.includes("Shared a post by") && m.content.includes("[Post ID:"));
          const sharedData = isShared ? (m.shared_post || null) : null;
          // Debug: log message structure once

          return (
            <div key={m.message_id || m.id} className={`flex ${isOwn ? "justify-end" : "justify-start"} group`}>
              <div className="max-w-xs sm:max-w-sm lg:max-w-md w-full">
                {isShared && sharedData ? (
                  <SharedPostBubble data={sharedData} personalMessage={m.content} isOwn={isOwn} isIndigo={isIndigo} />
                ) : isShared ? (
                  /* Fallback: shared post but no structured data — show as card with content */
                  (() => {
                    // Clean up content: remove "Shared a post by X:" prefix and "[Post ID: ...]" suffix
                    let cleanContent = (m.content || "");
                    const authorMatch = cleanContent.match(/^Shared a post by ([^:]+):\s*/);
                    const authorName = authorMatch ? authorMatch[1] : "";
                    if (authorMatch) cleanContent = cleanContent.replace(authorMatch[0], "");
                    cleanContent = cleanContent.replace(/\s*\[Post ID:\s*[^\]]*\]/g, "").trim();
                    // Remove surrounding quotes if present
                    if (cleanContent.startsWith('"') && cleanContent.endsWith('"')) {
                      cleanContent = cleanContent.slice(1, -1);
                    }
                    return (
                      <div className={`rounded-2xl overflow-hidden border ${isOwn ? (isIndigo ? "border-indigo-300" : "border-orange-300") : "border-gray-200"}`}>
                        <div className={`px-3 py-2 text-xs font-semibold flex items-center gap-1 ${isOwn ? (isIndigo ? "bg-indigo-600 text-white" : "bg-orange-600 text-white") : "bg-gray-100 text-gray-600"}`}>
                          <Icons.share /> Shared a post
                        </div>
                        <div className="bg-white px-3 py-3 space-y-1.5">
                          {authorName && <p className="text-xs font-bold text-gray-700">{authorName}</p>}
                          <p className="text-sm text-gray-800">{cleanContent || "Shared a post"}</p>
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${isOwn ? (isIndigo ? "bg-indigo-600 text-white rounded-br-sm" : "bg-orange-600 text-white rounded-br-sm") : "bg-gray-100 text-gray-800 rounded-bl-sm"}`}>
                    {m.content}
                  </div>
                )}
                <div className={`flex items-center gap-2 mt-1 ${isOwn ? "justify-end" : "justify-start"}`}>
                  <span className="text-xs text-gray-400">{timeAgo(m.created_at)}</span>
                  {isOwn && m.is_read && <span className="flex items-center gap-0.5 text-xs text-gray-400"><Icons.read /> Read</span>}
                  {isOwn && (
                    <button onClick={() => deleteMsgMutation.mutate(m.message_id || m.id)}
                      className="text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all">
                      <Icons.trash />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="p-4 border-t border-gray-100">
        <div className="flex gap-2">
          <input type="text" value={content} onChange={(e) => setContent(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && content.trim() && sendMutation.mutate()}
            placeholder="Type a message..." maxLength={2000}
            className={`flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 ${isIndigo ? "focus:ring-indigo-200 focus:border-indigo-400" : "focus:ring-orange-200 focus:border-orange-400"}`} />
          <button onClick={() => sendMutation.mutate()} disabled={!content.trim() || sendMutation.isPending}
            className={`flex items-center gap-2 ${isIndigo ? "bg-indigo-600 hover:bg-indigo-700" : "bg-orange-600 hover:bg-orange-700"} text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-50 flex-shrink-0`}>
            <Icons.send /> {sendMutation.isPending ? "..." : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}


function InboxTabs({ conversations, activeConvId, onSelect, isLoading, accentColor = "indigo" }) {
  const [filter, setFilter] = useState("all");

  const unread = conversations.filter((c) => c.unread_count > 0);
  const read   = conversations.filter((c) => !c.unread_count || c.unread_count === 0);

  const displayed = filter === "unread" ? unread : filter === "read" ? read : conversations;

  const tabs = [
    { id: "all",    label: "All",    count: conversations.length },
    { id: "unread", label: "Unread", count: unread.length },
    { id: "read",   label: "Read",   count: read.length },
  ];

  const accent = accentColor;

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Filter tabs */}
      <div className="flex gap-1 px-3 py-2 border-b border-gray-100">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setFilter(t.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filter === t.id
                ? `bg-${accent}-600 text-white`
                : "text-gray-500 hover:bg-gray-100"
            }`}>
            {t.label}
            {t.count > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                filter === t.id ? "bg-white/20 text-white" : `bg-${accent}-100 text-${accent}-700`
              }`}>{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {[1,2,3].map((i) => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="w-12 h-12 bg-gray-200 rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 bg-gray-200 rounded w-1/2" />
                  <div className="h-2.5 bg-gray-100 rounded w-3/4" />
                </div>
              </div>
            ))}
          </div>
        ) : displayed.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <p className="text-gray-400 text-sm font-medium">
              {filter === "unread" ? "No unread messages" : filter === "read" ? "No read conversations" : "No conversations yet"}
            </p>
            {filter === "all" && <p className="text-gray-300 text-xs mt-1">Click "New" to start one</p>}
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {displayed.map((c) => (
              <button key={c.conversation_id} onClick={() => onSelect(c.conversation_id)}
                className={`w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors text-left ${
                  activeConvId === c.conversation_id ? `bg-${accent}-50 border-r-2 border-${accent}-600` : ""
                }`}>
                <div className="relative flex-shrink-0">
                  <div className={`w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                    (c.other_doctor || c.other_user)?.role === "MR" ? "bg-gradient-to-br from-orange-500 to-red-500" : "bg-gradient-to-br from-indigo-500 to-purple-500"
                  }`}>
                    {((c.other_doctor || c.other_user)?.name || "U").split(" ").map((n) => n[0]).join("").slice(0, 2)}
                  </div>
                  {c.unread_count > 0 && (
                    <span className={`absolute -top-1 -right-1 bg-${accent}-600 text-white text-xs font-bold w-4 h-4 rounded-full flex items-center justify-center`}>
                      {c.unread_count > 9 ? "9+" : c.unread_count}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className={`text-sm truncate ${c.unread_count > 0 ? "font-bold text-gray-900" : "font-medium text-gray-700"}`}>
                      {(c.other_doctor || c.other_user)?.name || "User"}
                    </p>
                    <span className="text-xs text-gray-400 flex-shrink-0 ml-1">{c.last_message_at ? formatIST(c.last_message_at, { day: "2-digit", month: "short" }) : ""}</span>
                  </div>
                  <p className={`text-xs truncate mt-0.5 ${c.unread_count > 0 ? "text-gray-700 font-medium" : "text-gray-400"}`}>
                    {c.last_message || "No messages yet"}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
function SharedPostBubble({ data, personalMessage, isOwn, isIndigo }) {
  const headerBg  = isOwn ? (isIndigo ? "bg-indigo-700" : "bg-orange-700") : "bg-gray-200";
  const headerTxt = isOwn ? "text-white" : "text-gray-600";
  const msgBg     = isOwn ? (isIndigo ? "bg-indigo-600" : "bg-orange-600") : "bg-gray-100";
  const msgTxt    = isOwn ? "text-white" : "text-gray-800";
  const border    = isOwn ? (isIndigo ? "border-indigo-300" : "border-orange-300") : "border-gray-200";
  const avatarBg  = data.author_role === "MR" ? "bg-gradient-to-br from-orange-500 to-red-500" : "bg-gradient-to-br from-indigo-500 to-purple-500";
  const feedPath  = isIndigo ? "/doctor/network/feed" : "/mr/network/feed";

  return (
    <div className={`rounded-2xl overflow-hidden border ${border} ${isOwn ? "rounded-br-sm" : "rounded-bl-sm"} max-w-xs sm:max-w-sm`}>
      {/* Header */}
      <div className={`px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5 ${headerBg} ${headerTxt}`}>
        <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
        </svg>
        Shared a post
      </div>

      {/* Personal message */}
      {personalMessage && (
        <div className={`px-3 py-2 text-sm ${msgBg} ${msgTxt}`}>
          {personalMessage}
        </div>
      )}

      {/* Post card */}
      <div className="bg-white px-3 py-3 space-y-2">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 ${avatarBg} rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
            {data.author_name?.split(" ").map((n) => n[0]).join("").slice(0, 2)}
          </div>
          <div>
            <p className="text-xs font-bold text-gray-900">{data.author_name}</p>
            <p className="text-xs text-gray-400">{data.author_role}</p>
          </div>
        </div>
        <p className="text-xs text-gray-700 leading-relaxed line-clamp-4">{data.content}</p>
        <div className="flex items-center justify-between pt-1.5 border-t border-gray-100">
          <div className="flex gap-3 text-xs text-gray-400">
            <span>{data.likes_count || 0} likes</span>
            <span>{data.comments_count || 0} comments</span>
          </div>
          <a href={`${feedPath}?post=${data.post_id}`}
            className={`text-xs font-semibold ${isIndigo ? "text-indigo-600 hover:text-indigo-700" : "text-orange-600 hover:text-orange-700"} underline underline-offset-2`}>
            View Post
          </a>
        </div>
      </div>
    </div>
  );
}