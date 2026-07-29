"use client";
import { useQuery } from "@tanstack/react-query";
import { get } from "@/lib/api";

export default function AdminDashboard() {
  const { data: doctorsData } = useQuery({
    queryKey: ["admin-doctors"],
    queryFn: () => get("/api/v1/doctors?limit=5"),
    staleTime: 60000,
  });
  const { data: orgsData } = useQuery({
    queryKey: ["admin-orgs"],
    queryFn: () => get("/api/v1/organizations?limit=5"),
    staleTime: 60000,
  });
  const { data: relsData } = useQuery({
    queryKey: ["admin-rels"],
    queryFn: () => get("/api/v1/doctor-organizations?limit=10"),
    staleTime: 60000,
  });

  const totalDoctors = doctorsData?.total || 0;
  const totalOrgs = orgsData?.total || 0;
  const totalLinks = relsData?.total || 0;
  const pendingLinks = (relsData?.relationships || []).filter((r) => r.status === "PENDING").length;
  const recentDoctors = doctorsData?.doctors || [];
  const recentRels = relsData?.relationships || [];

  // Build lookup maps for resolving IDs to names
  const doctorMap = Object.fromEntries(recentDoctors.map((d) => [d.id, d]));
  const orgMap = Object.fromEntries((orgsData?.organizations || []).map((o) => [o.id, o]));

  const STATS = [
    { label: "Total Doctors", value: totalDoctors, change: "", icon: "users", color: "purple" },
    { label: "Organizations", value: totalOrgs, change: "", icon: "building", color: "blue" },
    { label: "Active Links", value: totalLinks, change: "", icon: "link", color: "green" },
    { label: "Pending Requests", value: pendingLinks, change: pendingLinks > 0 ? "Needs attention" : "", icon: "inbox", color: "orange" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "#3b3a8a" }}>Dashboard</h1>
        <p className="text-gray-500 text-sm mt-0.5">DRX Platform Overview</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {STATS.map((s) => (
          <div key={s.label} className="bg-white rounded-xl p-5 border border-gray-100 hover:shadow-sm transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                s.color === "purple" ? "bg-purple-50 text-purple-600" :
                s.color === "blue" ? "bg-blue-50 text-blue-600" :
                s.color === "green" ? "bg-green-50 text-green-600" :
                "bg-orange-50 text-orange-600"
              }`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {s.icon === "users" && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />}
                  {s.icon === "building" && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />}
                  {s.icon === "link" && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />}
                  {s.icon === "inbox" && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />}
                </svg>
              </span>
            </div>
            <p className="text-2xl font-bold" style={{ color: "#3b3a8a" }}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-1">{s.label}</p>
            <p className="text-[11px] text-green-600 font-medium mt-1">{s.change}</p>
          </div>
        ))}
      </div>

      {/* Two columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Registrations */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold" style={{ color: "#3b3a8a" }}>Recent Doctor Registrations</h3>
            <button className="text-purple-600 text-xs font-semibold hover:underline">View All</button>
          </div>
          <div className="space-y-3">
            {recentDoctors.slice(0, 5).map((doc) => (
              <div key={doc.id || doc.doctor_gid} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-all">
                <div className="w-9 h-9 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {(doc.name || "D").split(" ").slice(1).map((n) => n[0]).join("").slice(0, 2) || "D"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{doc.name}</p>
                  <p className="text-xs text-gray-400">{doc.specialization || "Doctor"} · {doc.city || ""}</p>
                </div>
                <span className="text-xs text-gray-400">{doc.doctor_gid || ""}</span>
              </div>
            ))}
            {recentDoctors.length === 0 && <p className="text-xs text-gray-400 text-center py-4">No doctors yet</p>}
          </div>
        </div>

        {/* Recent Links */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold" style={{ color: "#3b3a8a" }}>Recent Doctor-Org Links</h3>
            <button className="text-purple-600 text-xs font-semibold hover:underline">View All</button>
          </div>
          <div className="space-y-3">
            {recentRels.slice(0, 5).map((link, i) => {
              const doc = doctorMap[link.doctor_id];
              const org = orgMap[link.organization_id];
              return (
              <div key={link.id || i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-all">
                <div className="w-9 h-9 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 flex-shrink-0">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{doc?.name || "Doctor"}</p>
                  <p className="text-xs text-gray-400">{org?.organization_name || "Organization"}</p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${link.status === "ACTIVE" ? "bg-green-50 text-green-600" : "bg-orange-50 text-orange-600"}`}>{link.status}</span>
              </div>
              );
            })}
            {recentRels.length === 0 && <p className="text-xs text-gray-400 text-center py-4">No links yet</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
