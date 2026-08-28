"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { get, post as apiPost, put } from "@/lib/api";

export default function OrganizationsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editOrg, setEditOrg] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editError, setEditError] = useState("");
  const [form, setForm] = useState({ organization_name: "", contact_email: "", contact_phone: "", org_admin: "", admin_username: "", admin_email: "", admin_phone: "", admin_password: "Welcome@123", address: "", city: "", state: "", country: "India", pincode: "", mrx_url: "" });
  const [formError, setFormError] = useState("");
  const [createdResult, setCreatedResult] = useState(null);
  const [showAdminPw, setShowAdminPw] = useState(false);
  const [creatingStep, setCreatingStep] = useState(""); // "registering" | "creating" | ""

  const { data, isLoading } = useQuery({
    queryKey: ["admin-orgs-list", search],
    queryFn: () => get(`/api/v1/organizations?limit=200${search ? "&search=" + encodeURIComponent(search) : ""}`),
    staleTime: 30000,
  });

  const orgs = data?.organizations || [];

  const createMutation = useMutation({
    mutationFn: (body) => apiPost("/api/v1/organizations", body),
    onSuccess: (res) => {
      setCreatedResult(res);
      setCreatingStep("");
      queryClient.invalidateQueries({ queryKey: ["admin-orgs-list"] });
    },
    onError: (err) => { setFormError(err.message || "Failed to create organization"); setCreatingStep(""); },
  });

  const activateMutation = useMutation({
    mutationFn: (orgId) => apiPost(`/api/v1/organizations/${orgId}/activate`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-orgs-list"] }),
  });

  const deactivateMutation = useMutation({
    mutationFn: (orgId) => apiPost(`/api/v1/organizations/${orgId}/deactivate`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-orgs-list"] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ orgId, body }) => put(`/api/v1/organizations/${orgId}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-orgs-list"] });
      setEditOrg(null);
      setEditForm({});
      setEditError("");
    },
    onError: (err) => setEditError(err.message || "Failed to update"),
  });

  const openEdit = (org) => {
    setEditOrg(org);
    setEditForm({
      organization_name: org.organization_name || "",
      contact_email: org.contact_email || "",
      contact_phone: org.contact_phone || "",
      org_admin: org.org_admin || "",
      admin_email: org.admin_email || "",
      admin_phone: org.admin_phone || "",
      address: org.address || "",
      city: org.city || "",
      state: org.state || "",
      country: org.country || "India",
      pincode: org.pincode || "",
      mrx_url: org.mrx_url || "",
    });
    setEditError("");
  };

  // Auto-generate username from admin name
  const generateUsername = (name) => {
    const base = (name || "admin").toLowerCase().replace(/[^a-z0-9]/g, "_").replace(/_+/g, "_").slice(0, 20);
    const rand = Math.floor(100 + Math.random() * 900);
    return `${base}_${rand}`;
  };

  // When org_admin name changes, auto-generate username
  const handleAdminNameChange = (name) => {
    setForm((prev) => ({ ...prev, org_admin: name, admin_username: generateUsername(name) }));
  };

  const handleCreate = async () => {
    setFormError("");
    if (!form.organization_name.trim() || !form.mrx_url.trim()) {
      setFormError("Organization name and MRX URL are required.");
      return;
    }
    if (!form.org_admin.trim() || !form.admin_username.trim() || !form.admin_email.trim()) {
      setFormError("Admin name, username, and email are required.");
      return;
    }
    // Validate username
    if (!/^[a-z0-9_]{3,30}$/.test(form.admin_username)) {
      setFormError("Username must be 3-30 chars, lowercase letters, numbers, underscores only.");
      return;
    }
    // Validate password
    const pw = form.admin_password;
    if (pw.length < 8 || !/[A-Z]/.test(pw) || !/[a-z]/.test(pw) || !/[0-9]/.test(pw) || !/[!@#$%^&*]/.test(pw)) {
      setFormError("Password must be 8+ chars with 1 uppercase, 1 lowercase, 1 number, 1 symbol.");
      return;
    }

    // Step 1: Register admin user on Proxzar
    setCreatingStep("registering");
    try {
      const regRes = await fetch("/drx/api/v1/proxzar-register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          UserName: form.admin_username,
          UserPassword: form.admin_password,
          UserFullName: form.org_admin,
          UserEmail: form.admin_email,
          UserPhone: form.admin_phone ? `+91${form.admin_phone.replace(/^\+91/, "")}` : "",
          DataSource: "DRX",
        }),
      });
      const regData = await regRes.json();
      if (!regRes.ok) {
        const msg = regData?.detail?.[0]?.msg || regData?.detail || regData?.message || "Admin registration failed.";
        setFormError(typeof msg === "string" ? msg : JSON.stringify(msg));
        setCreatingStep("");
        return;
      }
    } catch (err) {
      setFormError("Failed to register admin user: " + (err.message || "Network error"));
      setCreatingStep("");
      return;
    }

    // Step 2: Create organization
    setCreatingStep("creating");
    createMutation.mutate(form);
  };

  const resetForm = () => {
    setForm({ organization_name: "", contact_email: "", contact_phone: "", org_admin: "", admin_username: "", admin_email: "", admin_phone: "", admin_password: "Welcome@123", address: "", city: "", state: "", country: "India", pincode: "", mrx_url: "" });
    setFormError("");
    setCreatedResult(null);
    setCreatingStep("");
    setShowAdminPw(false);
    setShowAdd(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "#3b3a8a" }}>Organizations</h1>
          <p className="text-gray-500 text-sm mt-0.5">Manage pharmaceutical companies on the DRx platform</p>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-semibold transition-all flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Add Organization
        </button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-4">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search organizations..." className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-100" />
        </div>
        <span className="text-sm text-gray-500">{orgs.length} organizations</span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Organization</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">GID</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Admin</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">City</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Created</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={7} className="px-5 py-8 text-center text-gray-400 text-sm">Loading...</td></tr>
            ) : orgs.length === 0 ? (
              <tr><td colSpan={7} className="px-5 py-8 text-center text-gray-400 text-sm">No organizations found.</td></tr>
            ) : orgs.map((org) => (
              <tr key={org.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center text-white text-xs font-bold">
                      {(org.organization_name || "O").slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{org.organization_name}</p>
                      <p className="text-[10px] text-gray-400">{org.contact_email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3.5 text-xs text-gray-500 font-mono">{org.organization_gid || "—"}</td>
                <td className="px-5 py-3.5">
                  <p className="text-xs text-gray-700">{org.org_admin || "—"}</p>
                  <p className="text-[10px] text-gray-400">{org.admin_email || ""}</p>
                </td>
                <td className="px-5 py-3.5 text-sm text-gray-500">{org.city || "—"}</td>
                <td className="px-5 py-3.5">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${org.status === "ACTIVE" ? "bg-green-50 text-green-600" : "bg-red-50 text-red-500"}`}>{org.status}</span>
                </td>
                <td className="px-5 py-3.5 text-xs text-gray-400">{org.created_at ? new Date(org.created_at).toLocaleDateString() : "—"}</td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-2">
                    <button onClick={() => openEdit(org)} className="text-xs text-purple-600 hover:text-purple-800 font-medium">Edit</button>
                    {org.status === "ACTIVE" ? (
                      <button onClick={() => deactivateMutation.mutate(org.id)}
                        disabled={deactivateMutation.isPending}
                        className="text-xs text-red-500 hover:text-red-700 font-medium disabled:opacity-50">Deactivate</button>
                    ) : (
                      <button onClick={() => activateMutation.mutate(org.id)}
                        disabled={activateMutation.isPending}
                        className="text-xs text-green-600 hover:text-green-700 font-medium disabled:opacity-50">Activate</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Org Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            {createdResult ? (
              <>
                <div className="text-center mb-4">
                  <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">Organization Created!</h3>
                </div>
                <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm mb-4">
                  <div className="flex justify-between"><span className="text-gray-500">Org ID:</span><span className="font-mono text-gray-800">{createdResult.organization_id}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Org GID:</span><span className="font-mono text-gray-800">{createdResult.organization_gid}</span></div>
                  {createdResult.client_id && <div className="flex justify-between"><span className="text-gray-500">Client ID:</span><span className="font-mono text-gray-800 text-xs">{createdResult.client_id}</span></div>}
                  {createdResult.client_secret && <div className="flex justify-between"><span className="text-gray-500">Client Secret:</span><span className="font-mono text-gray-800 text-xs break-all">{createdResult.client_secret}</span></div>}
                </div>
                {createdResult.client_secret && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
                    <p className="text-xs text-amber-800 font-semibold">Save the Client Secret now — it won&apos;t be shown again.</p>
                  </div>
                )}
                <button onClick={resetForm} className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2.5 rounded-xl text-sm font-bold">Done</button>
              </>
            ) : (
              <>
                <h3 className="text-lg font-bold mb-1" style={{ color: "#3b3a8a" }}>Add Organization</h3>
                <p className="text-sm text-gray-500 mb-5">Register a new pharmaceutical company on the DRx platform.</p>

                {formError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 rounded-xl text-sm mb-4">{formError}</div>
                )}

                {/* Step indicator */}
                {creatingStep && (
                  <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3 mb-4 flex items-center gap-2">
                    <svg className="w-4 h-4 animate-spin text-indigo-600" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                    <span className="text-sm text-indigo-700 font-medium">
                      {creatingStep === "registering" ? "Step 1/2: Registering admin user..." : "Step 2/2: Creating organization..."}
                    </span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  {/* ── Admin Details ── */}
                  <div className="col-span-2">
                    <p className="text-xs font-bold text-purple-600 uppercase tracking-widest mb-3 mt-1">Admin Details</p>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Admin Full Name *</label>
                    <input type="text" value={form.org_admin} onChange={(e) => handleAdminNameChange(e.target.value)}
                      placeholder="Rajesh Kumar" className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-100" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Username *</label>
                    <div className="flex gap-1.5">
                      <input type="text" value={form.admin_username} onChange={(e) => setForm({ ...form, admin_username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "") })}
                        placeholder="rajesh_kumar_123" className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-100 font-mono" />
                      <button type="button" onClick={() => setForm({ ...form, admin_username: generateUsername(form.org_admin) })}
                        className="px-2.5 py-2 border border-gray-200 rounded-xl text-xs text-purple-600 hover:bg-purple-50 font-semibold flex-shrink-0" title="Regenerate">
                        ↻
                      </button>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1">3-30 chars, lowercase, numbers, underscores</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                    <div className="relative">
                      <input type={showAdminPw ? "text" : "password"} value={form.admin_password} onChange={(e) => setForm({ ...form, admin_password: e.target.value })}
                        placeholder="Welcome@123" className="w-full px-4 py-2.5 pr-12 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-100" />
                      <button type="button" onClick={() => setShowAdminPw(!showAdminPw)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs font-medium">
                        {showAdminPw ? "Hide" : "Show"}
                      </button>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1">8+ chars, 1 upper, 1 lower, 1 number, 1 symbol</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Admin Email *</label>
                    <input type="email" value={form.admin_email} onChange={(e) => setForm({ ...form, admin_email: e.target.value })}
                      placeholder="rajesh@xyzpharma.com" className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-100" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Admin Phone</label>
                    <input type="tel" value={form.admin_phone} onChange={(e) => setForm({ ...form, admin_phone: e.target.value })}
                      placeholder="9876543210" className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-100" />
                  </div>

                  {/* ── Organization Details ── */}
                  <div className="col-span-2">
                    <p className="text-xs font-bold text-purple-600 uppercase tracking-widest mb-3 mt-3 border-t border-gray-100 pt-4">Organization Details</p>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Organization Name *</label>
                    <input type="text" value={form.organization_name} onChange={(e) => setForm({ ...form, organization_name: e.target.value })}
                      placeholder="XYZ Pharma Pvt Ltd" className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-100" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">MRX URL *</label>
                    <input type="url" value={form.mrx_url} onChange={(e) => setForm({ ...form, mrx_url: e.target.value })}
                      placeholder="https://org.mrx.health" className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-100" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Contact Email</label>
                    <input type="email" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })}
                      placeholder="info@xyzpharma.com" className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-100" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Contact Phone</label>
                    <input type="tel" value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })}
                      placeholder="9876543210" className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-100" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                    <input type="text" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })}
                      placeholder="Mumbai" className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-100" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                    <input type="text" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })}
                      placeholder="Maharashtra" className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-100" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                    <input type="text" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })}
                      placeholder="Plot 45, Industrial Area" className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-100" />
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button onClick={resetForm} className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-50">Cancel</button>
                  <button onClick={handleCreate} disabled={!!creatingStep}
                    className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2.5 rounded-xl text-sm font-bold disabled:opacity-60">
                    {creatingStep ? "Processing..." : "Create Organization"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Edit Org Modal */}
      {editOrg && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-1" style={{ color: "#3b3a8a" }}>Edit Organization</h3>
            <p className="text-sm text-gray-500 mb-5">Update details for <span className="font-semibold">{editOrg.organization_name}</span></p>

            {editError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 rounded-xl text-sm mb-4">{editError}</div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Organization Name</label>
                <input type="text" value={editForm.organization_name} onChange={(e) => setEditForm({ ...editForm, organization_name: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-100" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Email</label>
                <input type="email" value={editForm.contact_email} onChange={(e) => setEditForm({ ...editForm, contact_email: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-100" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Phone</label>
                <input type="tel" value={editForm.contact_phone} onChange={(e) => setEditForm({ ...editForm, contact_phone: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-100" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Org Admin</label>
                <input type="text" value={editForm.org_admin} onChange={(e) => setEditForm({ ...editForm, org_admin: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-100" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Admin Email</label>
                <input type="email" value={editForm.admin_email} onChange={(e) => setEditForm({ ...editForm, admin_email: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-100" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                <input type="text" value={editForm.city} onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-100" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                <input type="text" value={editForm.state} onChange={(e) => setEditForm({ ...editForm, state: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-100" />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <input type="text" value={editForm.address} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-100" />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">MRX URL</label>
                <input type="url" value={editForm.mrx_url || ""} onChange={(e) => setEditForm({ ...editForm, mrx_url: e.target.value })}
                  placeholder="https://org.mrx.health" className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-100" />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => { setEditOrg(null); setEditError(""); }}
                className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-50">Cancel</button>
              <button onClick={() => updateMutation.mutate({ orgId: editOrg.id, body: editForm })}
                disabled={updateMutation.isPending}
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2.5 rounded-xl text-sm font-bold disabled:opacity-50">
                {updateMutation.isPending ? "Updating..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
