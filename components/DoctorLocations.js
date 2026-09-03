"use client";
import { useState } from "react";
import dynamic from "next/dynamic";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { get, post, put, del } from "@/lib/api";

// Leaflet must be client-only (needs window)
const LocationPicker = dynamic(() => import("@/components/LocationPicker"), {
  ssr: false,
  loading: () => <div className="h-52 rounded-xl bg-gray-100 animate-pulse" />,
});

// Facility types — value sent to API, label shown in dropdown
const FACILITY_TYPES = [
  { value: "", label: "Select type" },
  { value: "HOSPITAL", label: "Hospital" },
  { value: "CLINIC", label: "Clinic" },
  { value: "POLYCLINIC", label: "Polyclinic" },
  { value: "MEDICAL_CENTER", label: "Medical Center" },
  { value: "INSTITUTION", label: "Institution / Medical College" },
  { value: "OTHER", label: "Other" },
];

const PRIORITIES = [
  { value: "PRIMARY", label: "Primary" },
  { value: "SECONDARY", label: "Secondary" },
  { value: "OTHER", label: "Other" },
];

const EMPTY_FORM = {
  location_priority: "SECONDARY",
  facility_type: "",
  facility_type_other: "",
  location_name: "",
  latitude: "",
  longitude: "",
  address: "",
  area: "",
  city: "",
  district: "",
  state: "",
  country: "India",
  postcode: "",
  location_source: "MANUAL",
  status: "ACTIVE",
};

const facilityLabel = (t) => FACILITY_TYPES.find((x) => x.value === t)?.label || t || "Location";

export default function DoctorLocations() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [position, setPosition] = useState(null);
  const [formError, setFormError] = useState("");
  const [toast, setToast] = useState("");

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  const { data, isLoading } = useQuery({
    queryKey: ["my-locations"],
    queryFn: () => get("/api/v1/profile/locations"),
    staleTime: 60000,
  });
  const locations = data?.locations || [];

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["my-locations"] });

  const saveMutation = useMutation({
    mutationFn: (payload) => {
      const body = {
        location_priority: payload.location_priority,
        facility_type: payload.facility_type,
        location_name: payload.location_name,
        latitude: payload.latitude ? String(payload.latitude) : undefined,
        longitude: payload.longitude ? String(payload.longitude) : undefined,
        address: payload.address || undefined,
        area: payload.area || undefined,
        city: payload.city,
        district: payload.district,
        state: payload.state,
        country: payload.country,
        postcode: payload.postcode,
        location_source: payload.location_source || "MANUAL",
        status: payload.status || "ACTIVE",
      };
      if (payload.facility_type === "OTHER") body.facility_type_other = payload.facility_type_other;

      return editingId
        ? put(`/api/v1/profile/locations/${editingId}`, body)
        : post("/api/v1/profile/locations", body);
    },
    onSuccess: () => { invalidate(); closeModal(); showToast(editingId ? "Location updated" : "Location added"); },
    onError: (err) => setFormError(err?.message || "Failed to save location"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => del(`/api/v1/profile/locations/${id}`),
    onSuccess: () => { invalidate(); showToast("Location removed"); },
  });

  const priorityMutation = useMutation({
    mutationFn: ({ id, priority }) => post(`/api/v1/profile/locations/${id}/priority`, { priority }),
    onSuccess: (_r, v) => { invalidate(); showToast(`Location priority set to ${v.priority}`); },
  });

  const openAdd = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setPosition(null);
    setFormError("");
    setShowModal(true);
  };

  const openEdit = (loc) => {
    setEditingId(loc.location_id);
    setForm({
      location_priority: loc.location_priority || "SECONDARY",
      facility_type: loc.facility_type || "",
      facility_type_other: loc.facility_type_other || "",
      location_name: loc.location_name || "",
      latitude: loc.latitude ?? "",
      longitude: loc.longitude ?? "",
      address: loc.address || "",
      area: loc.area || "",
      city: loc.city || "",
      district: loc.district || "",
      state: loc.state || "",
      country: loc.country || "India",
      postcode: loc.postcode || "",
      location_source: loc.location_source || "MANUAL",
      status: loc.status || "ACTIVE",
    });
    setPosition(loc.latitude && loc.longitude ? [Number(loc.latitude), Number(loc.longitude)] : null);
    setFormError("");
    setShowModal(true);
  };

  const closeModal = () => { setShowModal(false); setEditingId(null); };

  // When map/GPS/search picks a location — auto-fill + mark source
  const handleLocationChange = (lat, lng, geo) => {
    setPosition([lat, lng]);
    setForm((p) => ({
      ...p,
      latitude: geo.latitude ?? lat,
      longitude: geo.longitude ?? lng,
      address: geo.address ?? p.address,
      area: geo.area ?? p.area,
      city: geo.city ?? p.city,
      district: geo.district ?? p.district,
      state: geo.state ?? p.state,
      country: geo.country || p.country,
      postcode: geo.postcode ?? p.postcode,
      location_source: "MAP_SEARCH",
    }));
  };

  const handleSave = () => {
    setFormError("");
    if (!form.facility_type) { setFormError("Practice location type is required"); return; }
    if (form.facility_type === "OTHER" && !form.facility_type_other.trim()) { setFormError("Please specify the location type"); return; }
    if (!form.location_name.trim()) { setFormError("Practice location name is required"); return; }
    if (!form.city.trim() || !form.district.trim() || !form.state.trim() || !form.country.trim() || !form.postcode.trim()) {
      setFormError("City, District, State, Country and Pincode are required");
      return;
    }
    saveMutation.mutate(form);
  };

  const field = (key) => (e) => setForm((p) => ({ ...p, [key]: e.target.value }));

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      {/* Toast */}
      {toast && (
        <div className="fixed top-5 right-5 z-[2000] bg-green-600 text-white px-4 py-3 rounded-xl shadow-xl font-semibold text-sm flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          {toast}
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
          <span className="w-1 h-4 bg-[#5b2bce] rounded-full inline-block" />
          My Practice Locations
          <span className="ml-1 text-[10px] bg-purple-50 text-purple-600 border border-purple-100 px-2 py-0.5 rounded-full font-bold">
            {locations.length}
          </span>
        </h3>
        <button onClick={openAdd}
          className="flex items-center gap-1.5 bg-[#5b2bce] hover:bg-[#4318d1] text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-all">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Add Location
        </button>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-2">{[1, 2].map((i) => <div key={i} className="h-16 bg-gray-50 rounded-xl animate-pulse" />)}</div>
      ) : locations.length === 0 ? (
        <div className="text-center py-8">
          <svg className="w-10 h-10 text-gray-200 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          <p className="text-xs text-gray-400">No practice locations added yet</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {locations.map((loc) => {
            const isPrimary = loc.location_priority === "PRIMARY";
            return (
              <div key={loc.location_id} className={`border rounded-xl p-3 transition-all ${isPrimary ? "border-[#5b2bce] bg-purple-50/30" : "border-gray-100"}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div className="w-9 h-9 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-[#5b2bce]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-sm font-semibold text-gray-800 truncate">{loc.location_name}</p>
                        {isPrimary && <span className="text-[8px] bg-[#5b2bce] text-white px-1.5 py-0.5 rounded-full font-bold">PRIMARY</span>}
                        <span className="text-[8px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full font-semibold">
                          {loc.facility_type === "OTHER" ? (loc.facility_type_other || "Other") : facilityLabel(loc.facility_type)}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-1">{loc.address}</p>
                      <p className="text-[10px] text-gray-400">{[loc.city, loc.state, loc.postcode].filter(Boolean).join(", ")}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {!isPrimary && (
                      <button onClick={() => priorityMutation.mutate({ id: loc.location_id, priority: "PRIMARY" })} title="Make primary"
                        className="text-[9px] text-[#5b2bce] hover:bg-purple-50 px-1.5 py-1 rounded-lg font-semibold transition-all">
                        Set Primary
                      </button>
                    )}
                    <button onClick={() => openEdit(loc)} title="Edit"
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-[#5b2bce] hover:bg-purple-50 transition-all">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    </button>
                    <button onClick={() => { if (confirm(`Remove "${loc.location_name}"?`)) deleteMutation.mutate(loc.location_id); }} title="Delete"
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1500] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[92vh]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                <div>
                  <h3 className="font-bold text-gray-900">{editingId ? "Edit Location" : "Add Practice Location"}</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Use Current Location or Search to auto-fill</p>
                </div>
              </div>
              <button onClick={closeModal} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {formError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-xl text-xs">{formError}</div>
              )}

              {/* Type + Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-gray-600 mb-1 block">Practice Location Type <span className="text-red-500">*</span></label>
                  <select value={form.facility_type} onChange={field("facility_type")}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#5b2bce]/20 focus:border-[#5b2bce] bg-white">
                    {FACILITY_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-gray-600 mb-1 block">Practice Location Name <span className="text-red-500">*</span></label>
                  <input value={form.location_name} onChange={field("location_name")} placeholder="e.g. Apollo Hospital"
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#5b2bce]/20 focus:border-[#5b2bce]" />
                </div>
              </div>

              {/* Specify Location Type — only when OTHER */}
              {form.facility_type === "OTHER" && (
                <div>
                  <label className="text-[11px] font-semibold text-gray-600 mb-1 block">Specify Location Type <span className="text-red-500">*</span></label>
                  <input value={form.facility_type_other} onChange={field("facility_type_other")} placeholder="e.g. Diagnostic Lab"
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#5b2bce]/20 focus:border-[#5b2bce]" />
                </div>
              )}

              {/* Priority */}
              <div>
                <label className="text-[11px] font-semibold text-gray-600 mb-1 block">Priority</label>
                <select value={form.location_priority} onChange={field("location_priority")}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#5b2bce]/20 bg-white">
                  {PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>

              <p className="text-[10px] text-gray-400 italic">Tip: Use Current Location or Search to auto-fill address, city, state &amp; pincode below — no need to type them manually.</p>

              {/* Map picker */}
              <LocationPicker position={position} onChange={handleLocationChange} />

              {/* Address */}
              <div>
                <label className="text-[11px] font-semibold text-gray-600 mb-1 block">Address</label>
                <textarea value={form.address} onChange={field("address")} rows={2} placeholder="Full address"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#5b2bce]/20 focus:border-[#5b2bce] resize-none" />
              </div>

              {/* Area / City / District / State / Country / Pincode */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: "area", label: "Area", req: false },
                  { key: "city", label: "City", req: true },
                  { key: "district", label: "District", req: true },
                  { key: "state", label: "State", req: true },
                  { key: "country", label: "Country", req: true },
                  { key: "postcode", label: "Pincode", req: true },
                ].map((f) => (
                  <div key={f.key}>
                    <label className="text-[11px] font-semibold text-gray-600 mb-1 block">{f.label} {f.req && <span className="text-red-500">*</span>}</label>
                    <input value={form[f.key]} onChange={field(f.key)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#5b2bce]/20 focus:border-[#5b2bce]" />
                  </div>
                ))}
              </div>

              {/* Lat/Lng */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-gray-600 mb-1 block">Latitude</label>
                  <input value={form.latitude} onChange={field("latitude")}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs outline-none bg-gray-50" />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-gray-600 mb-1 block">Longitude</label>
                  <input value={form.longitude} onChange={field("longitude")}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs outline-none bg-gray-50" />
                </div>
              </div>
            </div>

            <div className="px-5 py-4 border-t border-gray-100 flex gap-3 flex-shrink-0">
              <button onClick={closeModal} className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-all">Cancel</button>
              <button onClick={handleSave} disabled={saveMutation.isPending}
                className="flex-1 bg-[#5b2bce] hover:bg-[#4318d1] text-white py-2.5 rounded-xl text-sm font-bold disabled:opacity-50 transition-all">
                {saveMutation.isPending ? "Saving..." : editingId ? "Update Location" : "Add Location"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
