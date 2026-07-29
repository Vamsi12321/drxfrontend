"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { get, post as apiPost, del } from "@/lib/api";

const formatLoc = (loc) => loc && typeof loc === "object" ? loc.location_name || loc.temporary_location?.name || "" : loc || "";

export default function UserProfileModal({ userId, onClose }) {
  const queryClient = useQueryClient();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["user-profile", userId],
    queryFn: () => get(`/api/v1/profile/${userId}`),
    staleTime: 60000,
    enabled: !!userId,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["my-connections"] });
    queryClient.invalidateQueries({ queryKey: ["requests-sent"] });
    queryClient.invalidateQueries({ queryKey: ["discover-users"] });
  };

  const connectMutation = useMutation({
    mutationFn: () => apiPost(`/api/v1/network/connections/request/${userId}`, {}),
    onSuccess: invalidate,
  });

  const removeMutation = useMutation({
    mutationFn: () => del(`/api/v1/network/connections/${userId}`),
    onSuccess: invalidate,
  });

  const initials = profile?.full_name?.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() || "?";
  const isDoctor = profile?.role === "DOCTOR";

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Header banner */}
        <div className={`h-20 ${isDoctor ? "bg-gradient-to-r from-indigo-600 to-purple-600" : "bg-gradient-to-r from-orange-600 to-red-600"}`} />

        <div className="px-6 pb-6">
          {/* Avatar */}
          <div className="flex items-end justify-between -mt-10 mb-4">
            <div className="relative">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="avatar"
                  className="w-20 h-20 rounded-2xl object-cover border-4 border-white shadow-lg" />
              ) : (
                <div className={`w-20 h-20 rounded-2xl flex items-center justify-center text-white text-2xl font-bold border-4 border-white shadow-lg ${isDoctor ? "bg-gradient-to-br from-indigo-500 to-purple-600" : "bg-gradient-to-br from-orange-500 to-red-600"}`}>
                  {isLoading ? "..." : initials}
                </div>
              )}
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none mb-1">&times;</button>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1,2,3].map((i) => <div key={i} className="h-8 bg-gray-100 rounded-xl animate-pulse" />)}
            </div>
          ) : (
            <>
              <h2 className="text-xl font-bold text-gray-900">{profile?.full_name}</h2>
              <p className={`text-sm font-semibold mt-0.5 ${isDoctor ? "text-indigo-600" : "text-orange-600"}`}>
                {isDoctor ? (profile?.specialization || "Doctor") : "Medical Representative"}
              </p>
              {formatLoc(profile?.location) && <p className="text-xs text-gray-400 mt-1">{formatLoc(profile.location)}</p>}
              {profile?.bio && <p className="text-gray-600 text-sm mt-3 leading-relaxed">{profile.bio}</p>}

              <div className="mt-4 space-y-2">
                {isDoctor && profile?.hospital && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="text-gray-400 w-4"></span> {profile.hospital}
                  </div>
                )}
                {!isDoctor && profile?.territory && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="text-gray-400 w-4"></span> {profile.territory}
                  </div>
                )}
                {profile?.experience_years && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="text-gray-400 w-4"></span> {profile.experience_years} years experience
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-400 w-4"></span>
                  <span className={`font-semibold capitalize ${
                    profile?.connection_status === "connected" ? "text-green-600" :
                    profile?.connection_status === "pending"   ? "text-yellow-600" : "text-gray-500"
                  }`}>
                    {profile?.connection_status === "connected" ? "Connected" :
                     profile?.connection_status === "pending"   ? "Request Pending" : "Not Connected"}
                  </span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="mt-5 flex gap-2">
                {profile?.connection_status === "connected" && (
                  <button onClick={() => removeMutation.mutate()} disabled={removeMutation.isPending}
                    className="flex-1 border border-red-200 text-red-500 hover:bg-red-50 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-50">
                    {removeMutation.isPending ? "Removing..." : "Remove Connection"}
                  </button>
                )}
                {profile?.connection_status === "not_connected" && (
                  <button onClick={() => connectMutation.mutate()} disabled={connectMutation.isPending}
                    className={`flex-1 ${isDoctor ? "bg-indigo-600 hover:bg-indigo-700" : "bg-orange-600 hover:bg-orange-700"} text-white py-2 rounded-xl text-sm font-bold transition-all disabled:opacity-50`}>
                    {connectMutation.isPending ? "Sending..." : "Connect"}
                  </button>
                )}
                {profile?.connection_status === "pending" && (
                  <div className="flex-1 bg-yellow-50 border border-yellow-200 text-yellow-700 py-2 rounded-xl text-sm font-semibold text-center">
                    Request Sent
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
