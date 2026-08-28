"use client";
import { useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { get, put, post as apiPost, upload } from "@/lib/api";
import RegisterDoctorModal from "@/components/RegisterDoctorModal";

export default function DoctorsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [showRegister, setShowRegister] = useState(false);
  const [editDoctor, setEditDoctor] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editError, setEditError] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-doctors-list", search],
    queryFn: () => get(`/api/v1/doctors?limit=200${search ? "&search=" + encodeURIComponent(search) : ""}`),
    staleTime: 30000,
  });

  const doctors = data?.doctors || [];
  const total = data?.total || doctors.length;

  const editMutation = useMutation({
    mutationFn: ({ docId, body }) => put(`/api/v1/doctors/${docId}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-doctors-list"] });
      setEditDoctor(null);
      setEditForm({});
      setEditError("");
    },
    onError: (err) => setEditError(err.message || "Failed to update"),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "#3b3a8a" }}>Doctors</h1>
          <p className="text-gray-500 text-sm mt-0.5">All registered doctors on the DRx platform</p>
        </div>
        <button onClick={() => setShowRegister(true)}
          className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-semibold transition-all flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
          Register Doctor
        </button>
      </div>

      {/* Search & filters */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-4">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, specialization, city..." className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-100 focus:border-purple-300" />
        </div>
        <span className="text-sm text-gray-500">{doctors.length} doctors</span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto">
        <table className="w-full min-w-[900px]">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Doctor</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Specialization</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">City</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Reg No.</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Organizations</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Registered</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody>
            {doctors.map((doc) => (
              <tr key={doc.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-[10px] font-bold">
                      {(doc.name || "D").split(" ").slice(1).map((n) => n[0]).join("").slice(0, 2) || "D"}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{doc.name}</p>
                      <p className="text-[11px] text-gray-400">{doc.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3.5 text-sm text-gray-600">{doc.specialization || "—"}</td>
                <td className="px-5 py-3.5 text-sm text-gray-500">{doc.city || "—"}</td>
                <td className="px-5 py-3.5 text-xs text-gray-500 font-mono">{doc.doctor_gid || "—"}</td>
                <td className="px-5 py-3.5">
                  <span className="text-xs text-gray-400">—</span>
                </td>
                <td className="px-5 py-3.5">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${doc.is_active ? "bg-green-50 text-green-600" : "bg-yellow-50 text-yellow-600"}`}>{doc.is_active ? "Active" : "Inactive"}</span>
                </td>
                <td className="px-5 py-3.5 text-xs text-gray-400">{doc.created_at ? new Date(doc.created_at).toLocaleDateString() : "—"}</td>
                <td className="px-5 py-3.5">
                  <button onClick={() => { setEditDoctor(doc); setEditForm({ name: doc.name || "", phone: doc.phone || "", specialization: doc.specialization || "", hospital: doc.hospital || "", city: doc.city || "", state: doc.state || "", license_number: doc.license_number || "", is_active: doc.is_active !== false }); }}
                    className="text-xs text-purple-600 hover:text-purple-800 font-medium">Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Register Doctor Modal */}
      {showRegister && (
        <RegisterDoctorModal
          onClose={() => { setShowRegister(false); queryClient.invalidateQueries({ queryKey: ["admin-doctors-list"] }); }}
          onSuccess={() => queryClient.invalidateQueries({ queryKey: ["admin-doctors-list"] })}
        />
      )}
      {/* Edit Doctor Modal */}
      {editDoctor && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-1" style={{ color: "#3b3a8a" }}>Edit Doctor</h3>
            <p className="text-sm text-gray-500 mb-5">Update details for <span className="font-semibold">{editDoctor.name}</span> ({editDoctor.doctor_gid})</p>

            {editError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 rounded-xl text-sm mb-4">{editError}</div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input type="text" value={editForm.name || ""} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-100" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input type="tel" value={editForm.phone || ""} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-100" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Specialization</label>
                <input type="text" value={editForm.specialization || ""} onChange={(e) => setEditForm({ ...editForm, specialization: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-100" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hospital</label>
                <input type="text" value={editForm.hospital || ""} onChange={(e) => setEditForm({ ...editForm, hospital: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-100" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                <input type="text" value={editForm.city || ""} onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-100" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                <input type="text" value={editForm.state || ""} onChange={(e) => setEditForm({ ...editForm, state: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-100" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">License Number</label>
                <input type="text" value={editForm.license_number || ""} onChange={(e) => setEditForm({ ...editForm, license_number: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-100" />
              </div>
              <div className="col-span-2 flex items-center gap-3">
                <label className="text-sm font-medium text-gray-700">Active Status:</label>
                <button onClick={() => setEditForm({ ...editForm, is_active: !editForm.is_active })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${editForm.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                  {editForm.is_active ? "Active" : "Inactive"}
                </button>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => { setEditDoctor(null); setEditError(""); }}
                className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-50">Cancel</button>
              <button onClick={() => editMutation.mutate({ docId: editDoctor.id, body: editForm })}
                disabled={editMutation.isPending}
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2.5 rounded-xl text-sm font-bold disabled:opacity-50">
                {editMutation.isPending ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
