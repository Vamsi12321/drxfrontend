"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { get, post as apiPost, patch } from "@/lib/api";
import { timeAgoIST as timeAgo } from "@/lib/time";

export default function IntegrationsPage() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [createdResult, setCreatedResult] = useState(null);
  const [form, setForm] = useState({
    service_name: "",
    service_code: "",
    description: "",
    proxzar_subject: "",
    proxzar_platform: "",
    permissions: "",
  });
  const [formError, setFormError] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["integration-services"],
    queryFn: () => get("/api/v1/integration/services"),
    staleTime: 30000,
  });

  const services = data?.services || [];

  const createMutation = useMutation({
    mutationFn: (body) => apiPost("/api/v1/integration/services", body),
    onSuccess: (res) => {
      setCreatedResult(res);
      queryClient.invalidateQueries({ queryKey: ["integration-services"] });
    },
    onError: (err) => setFormError(err.message || "Failed to create service"),
  });

  const activateMutation = useMutation({
    mutationFn: (id) => patch(`/api/v1/integration/services/${id}/activate`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["integration-services"] }),
  });

  const deactivateMutation = useMutation({
    mutationFn: (id) => patch(`/api/v1/integration/services/${id}/deactivate`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["integration-services"] }),
  });

  const handleCreate = () => {
    setFormError("");
    if (!form.service_name || !form.service_code) { setFormError("Service name and code are required"); return; }
    if (!form.proxzar_subject || !form.proxzar_platform) { setFormError("Proxzar subject and platform are required"); return; }

    const body = {
      service_name: form.service_name,
      service_code: form.service_code,
      description: form.description,
      proxzar_subject: form.proxzar_subject,
      proxzar_platform: form.proxzar_platform,
      permissions: form.permissions ? form.permissions.split(",").map((p) => p.trim()).filter(Boolean) : [],
    };
    createMutation.mutate(body);
  };

  const resetModal = () => {
    setShowCreate(false);
    setCreatedResult(null);
    setForm({ service_name: "", service_code: "", description: "", proxzar_subject: "", proxzar_platform: "", permissions: "" });
    setFormError("");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold" style={{ color: "#3b3a8a" }}>Integration Services</h1>
          <p className="text-gray-500 text-xs sm:text-sm mt-0.5">Manage trusted backend services (DOBO, OCR, MRX, etc.)</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-semibold transition-all flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          New Service
        </button>
      </div>

      {/* Services List */}
      {isLoading ? (
        <div className="space-y-3">{[1,2,3].map((i) => <div key={i} className="h-20 bg-white rounded-xl animate-pulse border border-gray-100" />)}</div>
      ) : services.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
          <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
          <p className="text-gray-500 font-medium">No integration services registered</p>
          <p className="text-gray-400 text-xs mt-1">Create one to allow backend services to authenticate via Proxzar JWT</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Service</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Code</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Proxzar Identity</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Permissions</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Last Used</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {services.map((svc) => (
                <tr key={svc.id} className="hover:bg-gray-50/50">
                  <td className="px-5 py-3.5">
                    <p className="text-sm font-semibold text-gray-900">{svc.service_name}</p>
                    {svc.description && <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{svc.description}</p>}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="font-mono text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">{svc.service_code}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <p className="text-xs text-gray-700 font-mono">{svc.proxzar_subject || "—"}</p>
                    <p className="text-[10px] text-gray-400">{svc.proxzar_platform || ""}</p>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex flex-wrap gap-1">
                      {(svc.permissions || []).length > 0 ? svc.permissions.map((perm) => (
                        <span key={perm} className="text-[10px] font-mono bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded">{perm}</span>
                      )) : <span className="text-xs text-gray-400">—</span>}
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${svc.status === "ACTIVE" ? "bg-green-50 text-green-600" : "bg-red-50 text-red-500"}`}>
                      {svc.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-xs text-gray-400">
                    {svc.last_used_at ? timeAgo(svc.last_used_at) : "Never"}
                  </td>
                  <td className="px-5 py-3.5">
                    {svc.status === "ACTIVE" ? (
                      <button onClick={() => { if (confirm(`Deactivate ${svc.service_name}?`)) deactivateMutation.mutate(svc.id); }}
                        className="text-xs text-red-500 hover:text-red-700 font-semibold hover:bg-red-50 px-2 py-1 rounded-lg transition-all">
                        Deactivate
                      </button>
                    ) : (
                      <button onClick={() => activateMutation.mutate(svc.id)}
                        className="text-xs text-green-600 hover:text-green-700 font-semibold hover:bg-green-50 px-2 py-1 rounded-lg transition-all">
                        Activate
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            {createdResult ? (
              <>
                <div className="text-center mb-4">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  </div>
                  <h3 className="font-bold text-gray-900">Service Created!</h3>
                </div>
                <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm mb-4">
                  <div className="flex justify-between"><span className="text-gray-500">Name:</span><span className="font-semibold text-gray-800">{createdResult.service_name}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Code:</span><span className="font-mono text-gray-800">{createdResult.service_code}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Service ID:</span><span className="font-mono text-gray-800 text-xs">{createdResult.service_id}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Status:</span><span className={`text-xs font-bold px-2 py-0.5 rounded-full ${createdResult.status === "ACTIVE" ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-600"}`}>{createdResult.status}</span></div>
                </div>
                <button onClick={resetModal} className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2.5 rounded-xl text-sm font-bold transition-all">
                  Done
                </button>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between mb-5">
                  <h3 className="font-bold text-gray-900 text-lg">New Integration Service</h3>
                  <button onClick={resetModal} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
                </div>
                {formError && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-xl text-sm mb-4">{formError}</div>}
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Service Name *</label>
                    <input value={form.service_name} onChange={(e) => setForm((p) => ({ ...p, service_name: e.target.value }))}
                      placeholder="e.g. Voice Onboarding (DOBO)"
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-200" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Service Code *</label>
                    <input value={form.service_code} onChange={(e) => setForm((p) => ({ ...p, service_code: e.target.value.toUpperCase() }))}
                      placeholder="e.g. DOBO"
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-200 font-mono uppercase" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Description</label>
                    <textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                      placeholder="e.g. Voice onboarding backend for doctor registration"
                      rows={2} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-200 resize-none" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Proxzar Subject *</label>
                    <input value={form.proxzar_subject} onChange={(e) => setForm((p) => ({ ...p, proxzar_subject: e.target.value }))}
                      placeholder="e.g. rx_integration"
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-200 font-mono" />
                    <p className="text-[10px] text-gray-400 mt-1">The JWT &quot;sub&quot; claim this service authenticates with</p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Proxzar Platform *</label>
                    <input value={form.proxzar_platform} onChange={(e) => setForm((p) => ({ ...p, proxzar_platform: e.target.value }))}
                      placeholder="e.g. dobo"
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-200 font-mono" />
                    <p className="text-[10px] text-gray-400 mt-1">The JWT &quot;platform&quot; claim this service authenticates with</p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Permissions</label>
                    <input value={form.permissions} onChange={(e) => setForm((p) => ({ ...p, permissions: e.target.value }))}
                      placeholder="e.g. doctor:create, doctor:read"
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-200 font-mono" />
                    <p className="text-[10px] text-gray-400 mt-1">Comma-separated list of allowed operations</p>
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <button onClick={resetModal} className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-50">Cancel</button>
                  <button onClick={handleCreate} disabled={createMutation.isPending}
                    className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2.5 rounded-xl text-sm font-bold disabled:opacity-50 transition-all">
                    {createMutation.isPending ? "Creating..." : "Create Service"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
