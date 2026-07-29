"use client";
import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { get, post as apiPost, put, del } from "@/lib/api";
import { Icons } from "@/components/network/Icons";
import { timeAgoIST as timeAgo, formatIST } from "@/lib/time";
import { useNetworkToast } from "@/app/doctor/network/layout";


const ACCENT = "indigo";

export default function GroupsPage() {
  const queryClient = useQueryClient();
  const [activeGroupId, setActiveGroupId] = useState(null);
  const [showCreate, setShowCreate]       = useState(false);
  // Keep left groups in local state so user can still view history
  const userId = typeof window !== "undefined" ? localStorage.getItem("userId") : null;

  const { data, isLoading } = useQuery({
    queryKey: ["my-groups"],
    queryFn: () => get("/api/v1/groups"),
    refetchInterval: 3000,
    staleTime: 0,
  });

  const groups      = data?.groups || [];
  const activeGroup = groups.find((g) => g.group_id === activeGroupId);
  const unreadTotal = groups.filter((g) => !g.you_left_at).reduce((s, g) => s + (g.unread_count || 0), 0);

  const deleteGroupMutation = useMutation({
    mutationFn: (id) => del(`/api/v1/groups/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["my-groups"] }); setActiveGroupId(null); },
  });

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden" style={{ height: "calc(100vh - 280px)", minHeight: "520px" }}>
      <div className="flex h-full">

        {/* Sidebar */}
        <div className={`${activeGroupId ? "hidden sm:flex" : "flex"} flex-col w-full sm:w-80 border-r border-gray-100 flex-shrink-0`}>
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Icons.groups /> Groups
                {unreadTotal > 0 && <span className="bg-indigo-600 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">{unreadTotal}</span>}
              </h2>
            </div>
            <button onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3 py-2 rounded-xl transition-colors">
              <Icons.newChat /> New
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 space-y-3">
                {[1,2,3].map((i) => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}
              </div>
            ) : groups.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-8">
                <div className="text-gray-200 mb-3"><Icons.groups /></div>
                <p className="text-gray-500 font-medium text-sm">No groups yet</p>
                <p className="text-gray-400 text-xs mt-1">Click "New" to create one</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {groups.map((g) => (
                  <button key={g.group_id} onClick={() => setActiveGroupId(g.group_id)}
                    className={`w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors text-left ${activeGroupId === g.group_id ? "bg-indigo-50 border-r-2 border-indigo-600" : ""}`}>
                    <div className="relative flex-shrink-0">
                      <div className="w-11 h-11 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                        {g.group_name?.charAt(0)?.toUpperCase()}
                      </div>
                      {g.unread_count > 0 && (
                        <span className="absolute -top-1 -right-1 bg-indigo-600 text-white text-xs font-bold w-4 h-4 rounded-full flex items-center justify-center">
                          {g.unread_count > 9 ? "9+" : g.unread_count}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className={`text-sm truncate ${g.unread_count > 0 ? "font-bold text-gray-900" : "font-semibold text-gray-800"}`}>{g.group_name}</p>
                        <span className="text-xs text-gray-400 flex-shrink-0 ml-1">{timeAgo(g.last_message_at)}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <p className={`text-xs truncate mt-0.5 ${g.unread_count > 0 ? "text-gray-700 font-medium" : "text-gray-400"}`}>
                          {g.last_message || `${g.members_count} members`}
                        </p>
                        {!!g.you_left_at && <span className="text-xs bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded-full font-medium flex-shrink-0">Left</span>}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Chat panel */}
        {activeGroupId ? (
          <GroupChatPanel
            groupId={activeGroupId}
            groupName={activeGroup?.group_name}
            isMember={!activeGroup?.you_left_at}
            currentUserId={userId}
            onBack={() => setActiveGroupId(null)}
            onDeleted={() => { deleteGroupMutation.mutate(activeGroupId); }}
            onRefreshList={() => queryClient.invalidateQueries({ queryKey: ["my-groups"] })}

          />
        ) : (
          <div className="hidden sm:flex flex-1 items-center justify-center text-center p-8">
            <div>
              <div className="text-gray-200 flex justify-center mb-4"><Icons.groups /></div>
              <p className="text-gray-500 font-medium">Select a group</p>
              <p className="text-gray-400 text-sm mt-1">Or click "New" to create one</p>
            </div>
          </div>
        )}
      </div>

      {showCreate && (
        <CreateGroupModal onClose={() => setShowCreate(false)}
          onCreated={(id) => { queryClient.invalidateQueries({ queryKey: ["my-groups"] }); setActiveGroupId(id); setShowCreate(false); }} />
      )}
    </div>
  );
}
function GroupChatPanel({ groupId, groupName, isMember = true, currentUserId, onBack, onDeleted, onRefreshList }) {
  const queryClient = useQueryClient();
  const [content, setContent]     = useState("");
  const [showInfo, setShowInfo]   = useState(false);
  const bottomRef = useRef(null);

  // Mark as read on open — only if still a member
  useEffect(() => {
    if (isMember) {
      apiPost(`/api/v1/groups/${groupId}/read`, {}).catch(() => {});
      queryClient.invalidateQueries({ queryKey: ["my-groups"] });
    }
  }, [groupId, isMember]);

  // Messages — poll every 3s (still poll even if left, to show history)
  const { data, isLoading } = useQuery({
    queryKey: ["group-messages", groupId],
    queryFn: () => get(`/api/v1/groups/${groupId}/messages?limit=50`),
    refetchInterval: 3000,
    staleTime: 0,
  });

  const messages = data?.messages || [];

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.length]);

  const sendMutation = useMutation({
    mutationFn: () => apiPost(`/api/v1/groups/${groupId}/messages`, { content }),
    onSuccess: () => { setContent(""); queryClient.invalidateQueries({ queryKey: ["group-messages", groupId] }); queryClient.invalidateQueries({ queryKey: ["my-groups"] }); },
  });

  return (
    <div className="flex flex-col flex-1 min-w-0">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-gray-100">
        <button onClick={onBack} className="sm:hidden text-gray-400 hover:text-gray-600 mr-1"><Icons.back /></button>
        <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
          {groupName?.charAt(0)?.toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-gray-900 truncate">{groupName}</p>
        </div>
        <button onClick={() => setShowInfo(true)} className="text-gray-400 hover:text-indigo-600 transition-colors"><Icons.info /></button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center h-full"><p className="text-gray-400 text-sm">Loading messages...</p></div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-center">
            <div><p className="text-gray-400 text-sm">No messages yet</p><p className="text-gray-300 text-xs mt-1">Say hello to the group!</p></div>
          </div>
        ) : messages.map((m) => {
          const isOwn = m.sender_id === currentUserId;
          return (
            <div key={m.message_id} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
              <div className="max-w-xs sm:max-w-sm lg:max-w-md">
                {!isOwn && <p className="text-xs font-semibold text-indigo-600 mb-1 ml-1">{m.sender_name}</p>}
                <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${isOwn ? "bg-indigo-600 text-white rounded-br-sm" : "bg-gray-100 text-gray-800 rounded-bl-sm"}`}>
                  {m.content}
                </div>
                <div className={`flex items-center gap-2 mt-1 ${isOwn ? "justify-end" : "justify-start"}`}>
                  <span className="text-xs text-gray-400">{timeAgo(m.created_at)}</span>
                  {m.read_by_count > 0 && <span className="text-xs text-gray-400 flex items-center gap-0.5"><Icons.read /> {m.read_by_count}</span>}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input or left-group banner */}
      {isMember ? (
        <div className="p-4 border-t border-gray-100">
          <div className="flex gap-2">
            <input type="text" value={content} onChange={(e) => setContent(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && content.trim() && sendMutation.mutate()}
              placeholder="Message group..." maxLength={2000}
              className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400" />
            <button onClick={() => sendMutation.mutate()} disabled={!content.trim() || sendMutation.isPending}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-50 flex-shrink-0">
              <Icons.send /> {sendMutation.isPending ? "..." : "Send"}
            </button>
          </div>
        </div>
      ) : (
        <div className="p-4 border-t border-gray-100 bg-gray-50">
          <p className="text-center text-sm text-gray-400 font-medium">You left this group. You can view old messages but cannot send new ones.</p>
        </div>
      )}

      {showInfo && (
        <GroupInfoPanel groupId={groupId} currentUserId={currentUserId} youLeftAt={!isMember} onClose={() => setShowInfo(false)}
          onDeleted={onDeleted} onRefreshList={onRefreshList} />
      )}
    </div>
  );
}
function GroupInfoPanel({ groupId, currentUserId, youLeftAt, onClose, onDeleted, onRefreshList }) {
  const queryClient = useQueryClient();
  const { showToast } = useNetworkToast();
  const [editing, setEditing]         = useState(false);
  const [editName, setEditName]       = useState("");
  const [editDesc, setEditDesc]       = useState("");
  const [showAddMembers, setShowAdd]  = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["group-details", groupId],
    queryFn: () => get(`/api/v1/network/groups/${groupId}`),
    staleTime: 10000,
  });

  const group   = data || {};
  const members = group.members || [];
  const isAdmin = group.admins?.includes(currentUserId);
  const isCreator = group.created_by === currentUserId;

  const updateMutation = useMutation({
    mutationFn: () => put(`/api/v1/network/groups/${groupId}`, { group_name: editName, group_description: editDesc }),
    onSuccess: () => { refetch(); onRefreshList(); setEditing(false); showToast("Group updated."); },
    onError: (e) => showToast(e.message || "Failed to update", "error"),
  });

  const removeMemberMutation = useMutation({
    mutationFn: (uid) => del(`/api/v1/network/groups/${groupId}/members/${uid}`),
    onSuccess: () => { refetch(); onRefreshList(); showToast("Member removed."); },
    onError: (e) => showToast(e.message || "Failed to remove member", "error"),
  });

  const makeAdminMutation = useMutation({
    mutationFn: (uid) => apiPost(`/api/v1/network/groups/${groupId}/admins/${uid}`, {}),
    onSuccess: () => { refetch(); showToast("Admin role granted."); },
    onError: (e) => showToast(e.message || "Failed", "error"),
  });

  const removeAdminMutation = useMutation({
    mutationFn: (uid) => del(`/api/v1/network/groups/${groupId}/admins/${uid}`),
    onSuccess: () => { refetch(); showToast("Admin role removed."); },
    onError: (e) => showToast(e.message || "Failed", "error"),
  });

  const leaveMutation = useMutation({
    mutationFn: () => apiPost(`/api/v1/network/groups/${groupId}/leave`, {}),
    onSuccess: () => { onRefreshList(); onClose(); showToast("You left the group."); },
    onError: (e) => showToast(e.message || "Failed to leave", "error"),
  });

  const clearChatMutation = useMutation({
    mutationFn: () => del(`/api/v1/network/groups/${groupId}/clear-chat`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["my-groups"] }); onDeleted(); onClose(); showToast("Chat cleared."); },
    onError: (e) => showToast(e.message || "Failed", "error"),
  });

  const deleteMutation = useMutation({
    mutationFn: () => del(`/api/v1/network/groups/${groupId}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["my-groups"] }); onDeleted(); onClose(); showToast("Group deleted."); },
    onError: (e) => showToast(e.message || "Failed to delete", "error"),
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 flex-shrink-0">
          <h3 className="font-bold text-gray-900 flex items-center gap-2"><Icons.info /> Group Info</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><Icons.close /></button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-6 space-y-3">{[1,2,3].map((i) => <div key={i} className="h-10 bg-gray-100 rounded-xl animate-pulse" />)}</div>
          ) : (
            <>
              {/* Group info */}
              <div className="p-4 border-b border-gray-100">
                {editing ? (
                  <div className="space-y-3">
                    <input value={editName} onChange={(e) => setEditName(e.target.value)} maxLength={100}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-200"
                      placeholder="Group name" />
                    <textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} maxLength={500} rows={2}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-200 resize-none"
                      placeholder="Description (optional)" />
                    <div className="flex gap-2">
                      <button onClick={() => setEditing(false)} className="flex-1 border border-gray-200 text-gray-600 py-2 rounded-xl text-sm font-semibold hover:bg-gray-50">Cancel</button>
                      <button onClick={() => updateMutation.mutate()} disabled={!editName.trim() || updateMutation.isPending}
                        className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-xl text-sm font-bold disabled:opacity-50">
                        {updateMutation.isPending ? "Saving..." : "Save"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-3">
                    <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center text-white font-bold text-xl flex-shrink-0">
                      {group.group_name?.charAt(0)?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900">{group.group_name}</p>
                      {group.group_description && <p className="text-xs text-gray-500 mt-0.5">{group.group_description}</p>}
                      <p className="text-xs text-gray-400 mt-1">{group.members_count} members</p>
                    </div>
                    {isAdmin && (
                      <button onClick={() => { setEditName(group.group_name || ""); setEditDesc(group.group_description || ""); setEditing(true); }}
                        className="text-gray-400 hover:text-indigo-600 transition-colors flex-shrink-0"><Icons.edit /></button>
                    )}
                  </div>
                )}
              </div>

              {/* Members */}
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-bold text-gray-700">Members ({members.length})</p>
                  {isAdmin && (
                    <button onClick={() => setShowAdd(true)}
                      className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 font-semibold">
                      <Icons.addUser /> Add
                    </button>
                  )}
                </div>
                <div className="space-y-2">
                  {members.map((m) => (
                    <div key={m.user_id} className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0 ${m.role === "MR" ? "bg-gradient-to-br from-orange-500 to-red-500" : "bg-gradient-to-br from-indigo-500 to-purple-500"}`}>
                        {m.name?.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-semibold text-gray-900 truncate">{m.name}</p>
                          {m.is_admin && <span className="text-yellow-500 flex-shrink-0"><Icons.crown /></span>}
                          {m.user_id === group.created_by && <span className="text-xs text-gray-400">(creator)</span>}
                        </div>
                        <p className="text-xs text-gray-400">{m.role}</p>
                      </div>
                      {isAdmin && m.user_id !== currentUserId && m.user_id !== group.created_by && (
                        <div className="flex gap-1">
                          {m.is_admin ? (
                            <button onClick={() => removeAdminMutation.mutate(m.user_id)} title="Remove admin"
                              className="text-xs text-yellow-500 hover:text-yellow-700 px-1.5 py-1 rounded-lg hover:bg-yellow-50 transition-colors">
                              <Icons.crown />
                            </button>
                          ) : (
                            <button onClick={() => makeAdminMutation.mutate(m.user_id)} title="Make admin"
                              className="text-xs text-gray-300 hover:text-yellow-500 px-1.5 py-1 rounded-lg hover:bg-yellow-50 transition-colors">
                              <Icons.crown />
                            </button>
                          )}
                          <button onClick={() => { if (confirm(`Remove ${m.name}?`)) removeMemberMutation.mutate(m.user_id); }}
                            className="text-gray-300 hover:text-red-400 px-1.5 py-1 rounded-lg hover:bg-red-50 transition-colors">
                            <Icons.close />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer actions */}
        <div className="p-4 border-t border-gray-100 flex-shrink-0 space-y-2">
          {youLeftAt ? (
            <button onClick={() => { if (confirm("Remove this group from your list?")) clearChatMutation.mutate(); }} disabled={clearChatMutation.isPending}
              className="w-full flex items-center justify-center gap-2 border border-red-200 text-red-500 hover:bg-red-50 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50">
              <Icons.trash /> {clearChatMutation.isPending ? "Clearing..." : "Clear Chat"}
            </button>
          ) : (
            <>
              <button onClick={() => { if (confirm("Leave this group?")) leaveMutation.mutate(); }} disabled={leaveMutation.isPending}
                className="w-full flex items-center justify-center gap-2 border border-gray-200 text-gray-600 hover:bg-gray-50 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50">
                <Icons.leave /> {leaveMutation.isPending ? "Leaving..." : "Leave Group"}
              </button>

            </>
          )}
        </div>
      </div>

      {showAddMembers && (
        <AddMembersModal groupId={groupId} currentMembers={group.members || []}
          onClose={() => setShowAdd(false)} onAdded={() => { refetch(); onRefreshList(); setShowAdd(false); }} />
      )}
    </div>
  );
}
function CreateGroupModal({ onClose, onCreated }) {
  const [name, setName]       = useState("");
  const [desc, setDesc]       = useState("");
  const [selected, setSelected] = useState([]);
  const [error, setError]     = useState("");

  const { data: connData } = useQuery({
    queryKey: ["my-connections"],
    queryFn: () => get("/api/v1/network/connections?limit=50"),
    staleTime: 30000,
  });
  const connections = connData?.connections || [];

  const toggle = (uid) => setSelected((p) => p.includes(uid) ? p.filter((id) => id !== uid) : p.length < 49 ? [...p, uid] : p);

  const mutation = useMutation({
    mutationFn: () => apiPost("/api/v1/network/groups", { group_name: name, group_description: desc || undefined, member_ids: selected }),
    onSuccess: (data) => onCreated(data.group_id),
    onError: (err) => setError(err.message || "Failed to create group"),
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-4 border-b border-gray-100 flex-shrink-0">
          <h3 className="font-bold text-gray-900 flex items-center gap-2"><Icons.groups /> New Group</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><Icons.close /></button>
        </div>
        <div className="p-4 border-b border-gray-100 flex-shrink-0 space-y-3">
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={100}
            placeholder="Group name *" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-200" />
          <textarea value={desc} onChange={(e) => setDesc(e.target.value)} maxLength={500} rows={2}
            placeholder="Description (optional)" className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-200 resize-none" />
          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
        <div className="px-4 py-2 flex-shrink-0">
          <p className="text-xs font-semibold text-gray-500">Add members ({selected.length} selected)</p>
        </div>
        <div className="flex-1 overflow-y-auto px-4 pb-2 min-h-0">
          {connections.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No connections to add.</p>
          ) : connections.map((c) => {
            const isSel = selected.includes(c.user_id);
            return (
              <button key={c.user_id} onClick={() => toggle(c.user_id)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl mb-1.5 transition-all border ${isSel ? "border-indigo-300 bg-indigo-50" : "border-transparent hover:bg-gray-50"}`}>
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0 ${c.role === "MR" ? "bg-gradient-to-br from-orange-500 to-red-500" : "bg-gradient-to-br from-indigo-500 to-purple-500"}`}>
                  {c.name?.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-sm font-semibold text-gray-900 truncate">{c.name}</p>
                  <p className="text-xs text-gray-400">{c.specialization || c.territory || c.role}</p>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${isSel ? "bg-indigo-600 border-indigo-600" : "border-gray-300"}`}>
                  {isSel && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                </div>
              </button>
            );
          })}
        </div>
        <div className="p-4 border-t border-gray-100 flex-shrink-0">
          <button onClick={() => mutation.mutate()} disabled={!name.trim() || mutation.isPending}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl font-bold text-sm transition-all disabled:opacity-50">
            <Icons.groups /> {mutation.isPending ? "Creating..." : "Create Group"}
          </button>
        </div>
      </div>
    </div>
  );
}

function AddMembersModal({ groupId, currentMembers, onClose, onAdded }) {
  const [selected, setSelected] = useState([]);

  const { data: connData } = useQuery({
    queryKey: ["my-connections"],
    queryFn: () => get("/api/v1/network/connections?limit=50"),
    staleTime: 30000,
  });

  const available = (connData?.connections || []).filter((c) => !currentMembers.includes(c.user_id));
  const toggle = (uid) => setSelected((p) => p.includes(uid) ? p.filter((id) => id !== uid) : p.length < 10 ? [...p, uid] : p);

  const mutation = useMutation({
    mutationFn: () => apiPost(`/api/v1/network/groups/${groupId}/members`, { user_ids: selected }),
    onSuccess: onAdded,
  });

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between p-4 border-b border-gray-100 flex-shrink-0">
          <h3 className="font-bold text-gray-900 flex items-center gap-2"><Icons.addUser /> Add Members</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><Icons.close /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 min-h-0">
          {available.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">All connections are already in this group.</p>
          ) : available.map((c) => {
            const isSel = selected.includes(c.user_id);
            return (
              <button key={c.user_id} onClick={() => toggle(c.user_id)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl mb-1.5 transition-all border ${isSel ? "border-indigo-300 bg-indigo-50" : "border-transparent hover:bg-gray-50"}`}>
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0 ${c.role === "MR" ? "bg-gradient-to-br from-orange-500 to-red-500" : "bg-gradient-to-br from-indigo-500 to-purple-500"}`}>
                  {c.name?.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-sm font-semibold text-gray-900 truncate">{c.name}</p>
                  <p className="text-xs text-gray-400">{c.role}</p>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${isSel ? "bg-indigo-600 border-indigo-600" : "border-gray-300"}`}>
                  {isSel && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                </div>
              </button>
            );
          })}
        </div>
        <div className="p-4 border-t border-gray-100 flex-shrink-0">
          <button onClick={() => mutation.mutate()} disabled={selected.length === 0 || mutation.isPending}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl font-bold text-sm transition-all disabled:opacity-50">
            {mutation.isPending ? "Adding..." : `Add ${selected.length || ""} Member${selected.length !== 1 ? "s" : ""}`}
          </button>
        </div>
      </div>
    </div>
  );
}