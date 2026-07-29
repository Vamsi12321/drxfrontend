"use client";
import { useState } from "react";

const LOGS = [
  { id: 1, action: "Doctor Registered", actor: "System", target: "Dr. Kavitha Reddy", details: "New doctor registered via DRX signup", timestamp: "24 Jun 2026, 10:30 AM", type: "create" },
  { id: 2, action: "Org Link Approved", actor: "Super Admin", target: "Dr. Sneha Kulkarni → Lupin", details: "Approved link request from Lupin for Dr. Sneha", timestamp: "24 Jun 2026, 09:15 AM", type: "approve" },
  { id: 3, action: "Request Received", actor: "Sun Pharma MRX", target: "Dr. Kavitha Reddy", details: "Sun Pharma requested to add Dr. Kavitha Reddy", timestamp: "24 Jun 2026, 08:45 AM", type: "request" },
  { id: 4, action: "Organization Created", actor: "Super Admin", target: "Mankind Pharma", details: "New organization onboarded: mankind.mrx.health", timestamp: "23 Jun 2026, 04:00 PM", type: "create" },
  { id: 5, action: "Doctor Profile Updated", actor: "Dr. Rajesh Kumar", target: "Self", details: "Updated hospital and specialization", timestamp: "23 Jun 2026, 02:30 PM", type: "update" },
  { id: 6, action: "Org Link Revoked", actor: "Super Admin", target: "Dr. Arun Patel → Torrent Pharma", details: "Doctor requested removal from organization", timestamp: "23 Jun 2026, 11:00 AM", type: "revoke" },
  { id: 7, action: "Request Rejected", actor: "Super Admin", target: "Dr. Fatima Shaikh → Glenmark", details: "Doctor not in Glenmark's therapy area", timestamp: "22 Jun 2026, 05:00 PM", type: "reject" },
  { id: 8, action: "Doctor Registered", actor: "System", target: "Dr. Arun Patel", details: "New doctor registered via DRX signup", timestamp: "22 Jun 2026, 10:00 AM", type: "create" },
  { id: 9, action: "Notifications Toggled", actor: "Dr. Rajesh Kumar", target: "Dr. Reddy's", details: "Disabled notifications from Dr. Reddy's", timestamp: "21 Jun 2026, 03:45 PM", type: "update" },
  { id: 10, action: "Org Link Approved", actor: "Super Admin", target: "Dr. Arun Patel → Zydus Cadila", details: "Approved link request from Zydus Cadila", timestamp: "21 Jun 2026, 09:30 AM", type: "approve" },
  { id: 11, action: "Organization Updated", actor: "Super Admin", target: "Biocon", details: "Changed status to Inactive", timestamp: "20 Jun 2026, 04:15 PM", type: "update" },
  { id: 12, action: "Request Received", actor: "Cipla MRX", target: "Dr. Mohan Das", details: "Cipla requested to add Dr. Mohan Das", timestamp: "20 Jun 2026, 11:00 AM", type: "request" },
];

const typeColors = {
  create: { bg: "bg-green-50", text: "text-green-600", icon: "+" },
  approve: { bg: "bg-blue-50", text: "text-blue-600", icon: "✓" },
  request: { bg: "bg-orange-50", text: "text-orange-600", icon: "→" },
  update: { bg: "bg-purple-50", text: "text-purple-600", icon: "✎" },
  revoke: { bg: "bg-red-50", text: "text-red-500", icon: "×" },
  reject: { bg: "bg-red-50", text: "text-red-500", icon: "✗" },
};

export default function LogsPage() {
  const [filter, setFilter] = useState("all");

  const filtered = filter === "all" ? LOGS : LOGS.filter((l) => l.type === filter);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "#3b3a8a" }}>Activity Logs</h1>
        <p className="text-gray-500 text-sm mt-0.5">Audit trail of all platform actions</p>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {[
          { id: "all", label: "All" },
          { id: "create", label: "Created" },
          { id: "approve", label: "Approved" },
          { id: "request", label: "Requests" },
          { id: "update", label: "Updates" },
          { id: "revoke", label: "Revoked" },
          { id: "reject", label: "Rejected" },
        ].map((f) => (
          <button key={f.id} onClick={() => setFilter(f.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filter === f.id ? "bg-purple-600 text-white" : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
            }`}>{f.label}</button>
        ))}
      </div>

      {/* Logs */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="divide-y divide-gray-50">
          {filtered.map((log) => {
            const tc = typeColors[log.type] || typeColors.update;
            return (
              <div key={log.id} className="flex items-start gap-4 px-5 py-4 hover:bg-gray-50/50 transition-all">
                <div className={`w-9 h-9 ${tc.bg} rounded-lg flex items-center justify-center ${tc.text} font-bold text-sm flex-shrink-0`}>
                  {tc.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-semibold text-gray-800">{log.action}</p>
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${tc.bg} ${tc.text}`}>{log.type}</span>
                  </div>
                  <p className="text-xs text-gray-500">{log.details}</p>
                  <p className="text-[11px] text-gray-400 mt-1">
                    <span className="font-medium text-gray-600">{log.actor}</span> → {log.target}
                  </p>
                </div>
                <span className="text-[11px] text-gray-400 flex-shrink-0 whitespace-nowrap">{log.timestamp}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
