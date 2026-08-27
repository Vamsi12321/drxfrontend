"use client";
import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { get, post, del } from "@/lib/api";
import { useVirtualMR } from "@/lib/useVirtualMR";
import MarkdownMessage from "@/components/MarkdownMessage";
import { HiOutlineArrowLeft, HiOutlineBookmark, HiBookmark } from "react-icons/hi";

const FORM_ICONS = {
  Tablet: "/drx/images/icons/drug_icon.png",
  Capsule: "/drx/images/icons/drug_icon.png",
  Syrup: "/drx/images/icons/syrup_icon.png",
  Injection: "/drx/images/icons/injection_icon.png",
  Inhaler: "/drx/images/icons/inhaler_icon.png",
  Cream: "/drx/images/icons/ointment_icon.png",
  Powder: "/drx/images/icons/Powder.png",
  Drops: "/drx/images/icons/syrup_icon.png",
  "Enteric-coated Tablet": "/drx/images/icons/drug_icon.png",
};

// Fields already shown in dedicated sections — skip from "Additional Info"
const SHOWN_FIELDS = new Set([
  "id", "_id", "template_id", "field_values", "created_at", "updated_at", "is_active",
  "drug_name", "brand_name", "generic_name", "drug_class", "therapeutic_category",
  "manufacturer", "prescription_type", "prescription_required", "schedule",
  "dosage_form", "strength", "route", "route_of_administration",
  "symptoms", "indications", "indication", "mechanism_of_action",
  "composition", "contraindications", "side_effects", "drug_interactions",
  "warnings_precautions", "packaging", "brochure_url", "reference_url",
  "has_brochure", "storage_conditions", "storage_temperature",
  "adult_dosage", "pediatric_dosage", "renal_dose_adjustment", "hepatic_dose_adjustment",
  "missed_dose_instructions",
]);

const formatKey = (key) => key?.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) || "";

const TABS = ["Overview", "Dosage", "Side Effects", "Interactions", "Contraindications", "More Info"];

export default function DrugDetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const chatEndRef = useRef(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [chatInput, setChatInput] = useState("");
  const [toast, setToast] = useState("");
  const [userName] = useState(typeof window !== "undefined" ? localStorage.getItem("userName") || "Doctor" : "Doctor");
  const [orgId] = useState(typeof window !== "undefined" ? localStorage.getItem("selectedOrgId") || null : null);

  const { messages: chatMessages, isTyping: chatTyping, sendMessage: sendVMR } = useVirtualMR({
    drugId: id,
    orgId,
  });

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatMessages, chatTyping]);

  // Fetch drug detail
  const { data: drug, isLoading, isFetching } = useQuery({
    queryKey: ["drug-detail", id, orgId],
    queryFn: () => {
      if (orgId) {
        return get(`/api/v1/organizations/${orgId}/drugs/${id}`).then((res) => {
          if (res?.drugs && Array.isArray(res.drugs)) return res.drugs[0] || null;
          if (res?.drug) return res.drug;
          return res;
        }).catch(() => null);
      }
      return null;
    },
    staleTime: 0,
    enabled: !!orgId,
    initialData: () => {
      if (typeof window === "undefined") return undefined;
      try {
        const cached = sessionStorage.getItem("selectedDrugData");
        if (cached) {
          const d = JSON.parse(cached);
          if (d.id === id || d._id === id || d.drug_name === decodeURIComponent(id)) return d;
        }
      } catch {}
      return undefined;
    },
    initialDataUpdatedAt: 0,
  });

  // Bookmark state
  const { data: bookmarksData } = useQuery({
    queryKey: ["bookmarks-drugs", orgId],
    queryFn: () => get("/api/v1/bookmarks/drugs", orgId ? { org_id: orgId } : undefined),
    staleTime: 60 * 1000,
    enabled: !!orgId,
  });
  const currentBookmark = (bookmarksData?.bookmarks || []).find((b) => b.drug_id === id);
  const isBookmarked = !!currentBookmark;

  const addBookmarkMutation = useMutation({
    mutationFn: () => post("/api/v1/bookmarks/drugs", { organization_id: orgId, drug_id: id, drug_name: drug?.drug_name || "" }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["bookmarks-drugs"] }); setToast("Bookmarked successfully"); setTimeout(() => setToast(""), 3000); },
  });
  const removeBookmarkMutation = useMutation({
    mutationFn: () => del(`/api/v1/bookmarks/drugs/${currentBookmark?.id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["bookmarks-drugs"] }); setToast("Bookmark removed"); setTimeout(() => setToast(""), 3000); },
  });
  const handleBookmarkToggle = () => {
    if (isBookmarked) removeBookmarkMutation.mutate();
    else addBookmarkMutation.mutate();
  };
  const bookmarkLoading = addBookmarkMutation.isPending || removeBookmarkMutation.isPending;

  // Brochure download
  const hasBrochure = drug?.has_brochure || !!drug?.brochure_url || !!drug?.reference_url;
  const handleBrochureDownload = async () => {
    if (!orgId) return;
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`/drx/api/v1/organizations/${orgId}/drugs/${id}/brochure/download`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${drug?.drug_name || "drug"}_brochure.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch { alert("Failed to download brochure."); }
  };

  // Virtual MR chat
  const handleChat = (msg) => {
    const text = msg || chatInput.trim();
    if (!text) return;
    setChatInput("");
    sendVMR(text);
  };

  if (isLoading && !drug) return (<div className="space-y-4">{[1,2,3].map((i) => <div key={i} className="h-32 bg-white rounded-xl animate-pulse border border-gray-100" />)}</div>);
  if (!drug) return (<div className="text-center py-20"><span className="text-4xl block mb-3">💊</span><p className="text-gray-500">Drug not found</p><button onClick={() => router.back()} className="mt-4 text-[#5b2bce] font-semibold text-sm">← Go back</button></div>);

  // Extract known fields
  const name = drug.drug_name || "";
  const brand = drug.brand_name || "";
  const genericName = drug.generic_name || "";
  const drugClass = drug.therapeutic_category || drug.drug_class || "";
  const manufacturer = drug.manufacturer || "";
  const form = drug.dosage_form || "";
  const strength = drug.strength || "";
  const route = drug.route_of_administration || drug.route || "";
  const prescriptionType = drug.prescription_type || (drug.prescription_required ? "Rx" : "OTC");
  const moa = drug.mechanism_of_action || "";
  const storageConditions = drug.storage_conditions || "";
  const storageTemp = drug.storage_temperature || "";
  const adultDosage = drug.adult_dosage || "";
  const pediatricDosage = drug.pediatric_dosage || "";
  const renalDose = drug.renal_dose_adjustment || "";
  const hepaticDose = drug.hepatic_dose_adjustment || "";
  const missedDose = drug.missed_dose_instructions || "";
  const drugIcon = FORM_ICONS[form] || "/drx/images/icons/drug_icon.png";

  const toList = (val) => { if (!val) return []; if (Array.isArray(val)) return val; return val.split(",").map((s) => s.trim()).filter(Boolean); };
  const indicationList = toList(drug.indications || drug.indication);
  const contraindicationList = toList(drug.contraindications);
  const sideEffectList = toList(drug.side_effects);
  const symptomsList = toList(drug.symptoms);
  const warningsList = toList(drug.warnings_precautions);
  const interactionsList = toList(drug.drug_interactions);
  const compositionList = toList(drug.composition);

  // Dynamic extra fields — anything NOT in SHOWN_FIELDS
  const extraFields = Object.entries(drug).filter(([k, v]) => !SHOWN_FIELDS.has(k) && v !== null && v !== "" && v !== undefined);

  return (
    <div className="space-y-4">
      {/* Loading bar — shows while full detail is fetching in background */}
      {isFetching && (
        <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-indigo-100 overflow-hidden">
          <div className="h-full bg-[#5b2bce]" style={{ width: "40%", animation: "loadingBar 1.5s ease-in-out infinite" }} />
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 bg-green-600 text-white px-4 py-2.5 rounded-xl shadow-xl font-semibold text-sm flex items-center gap-2 animate-[fadeSlide_0.3s_ease-out]">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          {toast}
        </div>
      )}
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-[#5b2bce] font-medium"><HiOutlineArrowLeft className="w-4 h-4" /> Back</button>
        <button onClick={handleBookmarkToggle} disabled={bookmarkLoading || !orgId}
          className={`flex items-center gap-1.5 border rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${isBookmarked ? "border-[#5b2bce] bg-indigo-50 text-[#5b2bce]" : "border-gray-200 text-gray-600 hover:bg-gray-50"} disabled:opacity-50`}>
          {isBookmarked ? <HiBookmark className="w-4 h-4" /> : <HiOutlineBookmark className="w-4 h-4" />}
          {isBookmarked ? "Bookmarked" : "Bookmark"}
        </button>
      </div>

      <div className="flex gap-5 flex-col lg:flex-row">
        {/* Left content */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Header Card */}
          <div className="bg-white rounded-xl border border-gray-100 p-5 sm:p-6 relative overflow-hidden">
            {isFetching && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent pointer-events-none"
                style={{ animation: "shimmer 1.5s infinite", backgroundSize: "200% 100%" }} />
            )}
            <div className="flex items-start gap-4 sm:gap-5">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-[#eef0f9] rounded-2xl flex items-center justify-center overflow-hidden flex-shrink-0">
                <img src={drugIcon} alt={form} className="w-[160px] h-[160px] object-cover object-center" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 capitalize">{name}</h1>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  {genericName && <span className="text-sm text-gray-500">{genericName}</span>}
                  {brand && <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-[10px] font-semibold">{brand}</span>}
                </div>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  {drugClass && <span className="bg-indigo-50 text-[#5b2bce] px-2 py-0.5 rounded-full text-[10px] font-semibold">{drugClass}</span>}
                  {manufacturer && <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-[10px] font-semibold truncate max-w-[200px]">{manufacturer.split("|")[0].trim()}</span>}
                </div>
                <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                  {form && <span className="bg-[#5b2bce] text-white px-2.5 py-0.5 rounded-full text-[10px] font-bold">{form}</span>}
                  {strength && <span className="bg-[#5b2bce] text-white px-2.5 py-0.5 rounded-full text-[10px] font-bold">{strength}</span>}
                  {route && <span className="bg-[#5b2bce] text-white px-2.5 py-0.5 rounded-full text-[10px] font-bold">{route}</span>}
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${prescriptionType === "Rx" ? "bg-red-50 text-red-600 border border-red-200" : "bg-green-50 text-green-600 border border-green-200"}`}>{prescriptionType}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200 flex gap-2 sm:gap-4 overflow-x-auto scrollbar-hide">
            {TABS.map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab.toLowerCase())} className={`pb-2.5 text-xs sm:text-sm font-medium whitespace-nowrap transition-colors ${activeTab === tab.toLowerCase() ? "text-[#5b2bce] border-b-2 border-[#5b2bce]" : "text-gray-400 hover:text-gray-600"}`}>{tab}</button>
            ))}
          </div>

          {/* Overview Tab */}
          {activeTab === "overview" && (
            <div className="space-y-4">
              {symptomsList.length > 0 && (<div className="bg-white rounded-xl border border-gray-100 p-5"><h3 className="text-sm font-bold text-gray-900 mb-3">🩺 Symptoms It Treats</h3><div className="flex flex-wrap gap-1.5">{symptomsList.map((s, i) => (<span key={i} className="bg-red-50 text-red-600 px-2.5 py-1 rounded-lg text-xs font-medium border border-red-100">{s}</span>))}</div></div>)}
              {indicationList.length > 0 && (<div className="bg-white rounded-xl border border-gray-100 p-5"><h3 className="text-sm font-bold text-gray-900 mb-3">📋 Indications</h3><div className="space-y-2">{indicationList.map((ind, i) => (<div key={i} className="flex items-start gap-2"><span className="text-green-500 mt-0.5 flex-shrink-0">•</span><p className="text-sm text-gray-700">{ind}</p></div>))}</div></div>)}
              {moa && (<div className="bg-white rounded-xl border border-gray-100 p-5"><h3 className="text-sm font-bold text-gray-900 mb-3">⚙️ Mechanism of Action</h3><p className="text-sm text-gray-600 leading-relaxed">{moa}</p></div>)}
              {compositionList.length > 0 && (<div className="bg-white rounded-xl border border-gray-100 p-5"><h3 className="text-sm font-bold text-gray-900 mb-3">🧪 Composition</h3><div className="space-y-1.5">{compositionList.map((c, i) => (<p key={i} className="text-sm text-gray-600">• {c}</p>))}</div></div>)}
              {(storageConditions || storageTemp) && (<div className="bg-white rounded-xl border border-gray-100 p-5"><h3 className="text-sm font-bold text-gray-900 mb-2">🌡️ Storage</h3><p className="text-sm text-gray-600">{storageConditions || storageTemp}</p></div>)}
              {hasBrochure && (<button onClick={handleBrochureDownload} className="flex items-center gap-2 text-xs text-[#5b2bce] font-semibold hover:underline">📄 Download Brochure / Monograph →</button>)}
            </div>
          )}

          {/* Dosage Tab */}
          {activeTab === "dosage" && (
            <div className="space-y-4">
              <div className="bg-white rounded-xl border border-gray-100 p-5">
                <h3 className="text-sm font-bold text-gray-900 mb-3">💊 Dosage & Administration</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
                  {[{ l: "Form", v: form }, { l: "Strength", v: strength }, { l: "Route", v: route }].map((item) => (<div key={item.l}><p className="text-[10px] text-gray-400 font-medium mb-1">{item.l}</p><p className="text-sm font-semibold text-gray-800">{item.v || "—"}</p></div>))}
                </div>
              </div>
              {adultDosage && (<div className="bg-white rounded-xl border border-gray-100 p-5"><h3 className="text-sm font-bold text-gray-900 mb-3">👤 Adult Dosage</h3><p className="text-sm text-gray-600 leading-relaxed">{adultDosage}</p></div>)}
              {pediatricDosage && (<div className="bg-white rounded-xl border border-gray-100 p-5"><h3 className="text-sm font-bold text-gray-900 mb-3">👶 Pediatric Dosage</h3><p className="text-sm text-gray-600 leading-relaxed">{pediatricDosage}</p></div>)}
              {renalDose && (<div className="bg-white rounded-xl border border-gray-100 p-5"><h3 className="text-sm font-bold text-gray-900 mb-3">🫘 Renal Dose Adjustment</h3><p className="text-sm text-gray-600 leading-relaxed">{renalDose}</p></div>)}
              {hepaticDose && (<div className="bg-white rounded-xl border border-gray-100 p-5"><h3 className="text-sm font-bold text-gray-900 mb-3">🫁 Hepatic Dose Adjustment</h3><p className="text-sm text-gray-600 leading-relaxed">{hepaticDose}</p></div>)}
              {missedDose && (<div className="bg-white rounded-xl border border-gray-100 p-5"><h3 className="text-sm font-bold text-gray-900 mb-3">⏰ Missed Dose</h3><p className="text-sm text-gray-600 leading-relaxed">{missedDose}</p></div>)}
            </div>
          )}

          {/* Side Effects Tab */}
          {activeTab === "side effects" && (
            <div className="space-y-4">
              <div className="bg-white rounded-xl border border-gray-100 p-5">
                <h3 className="text-sm font-bold text-gray-900 mb-3">⚠️ Side Effects</h3>
                {sideEffectList.length > 0 ? (<div className="space-y-1.5">{sideEffectList.map((e, i) => (<div key={i} className="flex items-start gap-2"><span className="text-orange-500 mt-0.5 flex-shrink-0">•</span><p className="text-sm text-gray-700">{e}</p></div>))}</div>) : (<p className="text-sm text-gray-400">No side effects information available.</p>)}
              </div>
              {hasBrochure && (<button onClick={handleBrochureDownload} className="text-xs text-[#5b2bce] font-semibold hover:underline">📄 Download full safety information →</button>)}
            </div>
          )}

          {/* Interactions Tab */}
          {activeTab === "interactions" && (
            <div className="space-y-4">
              {interactionsList.length > 0 && (<div className="bg-white rounded-xl border border-gray-100 p-5"><h3 className="text-sm font-bold text-gray-900 mb-3">🔄 Drug Interactions</h3><div className="space-y-1.5">{interactionsList.map((item, i) => (<div key={i} className="flex items-start gap-2"><span className="text-yellow-500 mt-0.5 flex-shrink-0">•</span><p className="text-sm text-gray-700">{item}</p></div>))}</div></div>)}
              {drug.drug_food_interactions && (<div className="bg-white rounded-xl border border-gray-100 p-5"><h3 className="text-sm font-bold text-gray-900 mb-3">🍽️ Food Interactions</h3><p className="text-sm text-gray-600">{drug.drug_food_interactions}</p></div>)}
              {warningsList.length > 0 && (<div className="bg-white rounded-xl border border-gray-100 p-5"><h3 className="text-sm font-bold text-gray-900 mb-3">⚠️ Warnings & Precautions</h3><div className="space-y-1.5">{warningsList.map((w, i) => (<div key={i} className="flex items-start gap-2"><span className="text-amber-500 mt-0.5 flex-shrink-0">•</span><p className="text-sm text-gray-700">{w}</p></div>))}</div></div>)}
              {!interactionsList.length && !drug.drug_food_interactions && !warningsList.length && (<div className="bg-white rounded-xl border border-gray-100 p-5"><p className="text-sm text-gray-400">No interaction data available. Ask the Virtual MR for more info.</p></div>)}
            </div>
          )}

          {/* Contraindications Tab */}
          {activeTab === "contraindications" && (
            <div className="space-y-4">
              <div className="bg-white rounded-xl border border-gray-100 p-5">
                <h3 className="text-sm font-bold text-gray-900 mb-3">⛔ Contraindications</h3>
                {contraindicationList.length > 0 ? (<div className="space-y-1.5">{contraindicationList.map((c, i) => (<div key={i} className="flex items-start gap-2"><span className="text-red-500 mt-0.5 flex-shrink-0">•</span><p className="text-sm text-gray-700">{c}</p></div>))}</div>) : (<p className="text-sm text-gray-400">No contraindications information available.</p>)}
              </div>
              {warningsList.length > 0 && (<div className="bg-white rounded-xl border border-gray-100 p-5"><h3 className="text-sm font-bold text-gray-900 mb-3">⚠️ Warnings & Precautions</h3><div className="space-y-1.5">{warningsList.map((w, i) => (<div key={i} className="flex items-start gap-2"><span className="text-amber-500 mt-0.5 flex-shrink-0">•</span><p className="text-sm text-gray-700">{w}</p></div>))}</div></div>)}
              {prescriptionType === "Rx" && (<div className="bg-amber-50 rounded-xl border border-amber-100 p-5"><h3 className="text-sm font-bold text-amber-800 mb-1">⚕️ Prescription Required</h3><p className="text-xs text-amber-700">This drug requires a prescription from a registered medical practitioner.</p></div>)}
            </div>
          )}

          {/* More Info Tab — catches ALL dynamic/extra fields */}
          {activeTab === "more info" && (
            <div className="space-y-4">
              {extraFields.length > 0 ? (
                extraFields.map(([key, value]) => (
                  <div key={key} className="bg-white rounded-xl border border-gray-100 p-5">
                    <h3 className="text-sm font-bold text-gray-900 mb-2">{formatKey(key)}</h3>
                    {Array.isArray(value) ? (
                      <div className="space-y-1.5">{value.map((v, i) => (<div key={i} className="flex items-start gap-2"><span className="text-indigo-400 mt-0.5 flex-shrink-0">•</span><p className="text-sm text-gray-700">{v}</p></div>))}</div>
                    ) : typeof value === "object" ? (
                      <pre className="text-xs text-gray-600 bg-gray-50 rounded-lg p-3 overflow-x-auto">{JSON.stringify(value, null, 2)}</pre>
                    ) : (
                      <p className="text-sm text-gray-600 leading-relaxed">{String(value)}</p>
                    )}
                  </div>
                ))
              ) : (
                <div className="bg-white rounded-xl border border-gray-100 p-5 text-center">
                  <p className="text-sm text-gray-400">No additional information available for this drug.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right sidebar — Virtual MR */}
        <div className="w-full lg:w-[280px] flex-shrink-0 space-y-4">
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-900">Virtual MR</h3>
              <span className="flex items-center gap-1 text-[10px] text-green-500 font-medium">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span> Online
              </span>
            </div>
            <div className="p-3 space-y-2.5 max-h-[300px] overflow-y-auto">
              {/* Welcome */}
              <div className="flex items-start gap-2">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#5b2bce] to-[#7c3aed] flex items-center justify-center flex-shrink-0">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M20 9V7c0-1.1-.9-2-2-2h-3c0-1.66-1.34-3-3-3S9 3.34 9 5H6c-1.1 0-2 .9-2 2v2c-1.66 0-3 1.34-3 3s1.34 3 3 3v4c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-4c1.66 0 3-1.34 3-3s-1.34-3-3-3z"/></svg>
                </div>
                <div className="bg-gradient-to-br from-[#f5f3ff] to-[#ede9fe] border border-purple-100 rounded-lg rounded-tl-none px-3 py-2 max-w-[90%]">
                  <p className="text-[11px] text-[#2D2A6A] leading-relaxed">Hi Dr. {userName} 👋<br/>Ask me anything about <span className="text-[#5b2bce] font-bold capitalize">{name}</span>.</p>
                </div>
              </div>

              {/* Messages */}
              {chatMessages.map((msg, idx) => (
                <div key={idx} className={`flex items-start gap-2 ${msg.role === "user" ? "justify-end" : ""}`}>
                  {msg.role === "ai" && (
                    <div className={`w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center ${msg.isError ? "bg-red-100" : "bg-gradient-to-br from-[#5b2bce] to-[#7c3aed]"}`}>
                      <svg className={`w-3 h-3 ${msg.isError ? "text-red-500" : "text-white"}`} fill="currentColor" viewBox="0 0 24 24"><path d="M20 9V7c0-1.1-.9-2-2-2h-3c0-1.66-1.34-3-3-3S9 3.34 9 5H6c-1.1 0-2 .9-2 2v2c-1.66 0-3 1.34-3 3s1.34 3 3 3v4c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-4c1.66 0 3-1.34 3-3s-1.34-3-3-3z"/></svg>
                    </div>
                  )}
                  <div className={`rounded-lg px-3 py-2 max-w-[85%] ${
                    msg.role === "user"
                      ? "bg-[#5b2bce] text-white rounded-tr-none text-[11px] leading-relaxed"
                      : msg.isError
                      ? "bg-red-50 text-red-600 border border-red-100 rounded-tl-none text-[11px] leading-relaxed"
                      : "bg-gradient-to-br from-[#f5f3ff] to-[#ede9fe] border border-purple-100 rounded-tl-none"
                  }`}>
                    {msg.role === "user" || msg.isError
                      ? msg.text
                      : <MarkdownMessage content={msg.text} />
                    }
                    {msg.usedBrochure && (
                      <span className="block mt-1 text-[8px] text-green-500 font-semibold">📄 Brochure used</span>
                    )}
                  </div>
                </div>
              ))}

              {/* Typing indicator */}
              {chatTyping && (
                <div className="flex items-start gap-2">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#5b2bce] to-[#7c3aed] flex items-center justify-center flex-shrink-0">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M20 9V7c0-1.1-.9-2-2-2h-3c0-1.66-1.34-3-3-3S9 3.34 9 5H6c-1.1 0-2 .9-2 2v2c-1.66 0-3 1.34-3 3s1.34 3 3 3v4c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-4c1.66 0 3-1.34 3-3s-1.34-3-3-3z"/></svg>
                  </div>
                  <div className="bg-gradient-to-br from-[#f5f3ff] to-[#ede9fe] border border-purple-100 rounded-lg rounded-tl-none px-3 py-2">
                    <div className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-[#5b2bce] rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-1.5 h-1.5 bg-[#5b2bce] rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-1.5 h-1.5 bg-[#5b2bce] rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Quick questions */}
            {chatMessages.length === 0 && (
              <div className="px-3 pb-2 flex flex-col gap-1.5">
                {["Dosage info?", "Side effects?", "Interactions?", "Contraindications?"].map((q) => (
                  <button key={q} onClick={() => handleChat(q)} disabled={chatTyping}
                    className="text-left text-[10px] text-gray-600 bg-gray-50 hover:bg-indigo-50 hover:text-[#5b2bce] px-3 py-1.5 rounded-lg border border-gray-100 font-medium transition-colors disabled:opacity-50">
                    {q}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <div className="border-t border-gray-100 px-3 py-2 flex gap-2">
              <input type="text" value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !chatTyping) handleChat(); }}
                disabled={chatTyping}
                placeholder="Ask anything..."
                className="flex-1 border border-gray-200 rounded-lg px-2.5 py-1.5 text-[11px] outline-none focus:ring-1 focus:ring-[#5b2bce] disabled:bg-gray-50" />
              <button onClick={() => handleChat()} disabled={chatTyping || !chatInput.trim()}
                className="bg-[#5b2bce] text-white w-7 h-7 rounded-lg flex items-center justify-center hover:bg-[#4318d1] disabled:opacity-40 transition-colors flex-shrink-0">
                {chatTyping
                  ? <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                  : <svg width="12" height="12" fill="white" viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                }
              </button>
            </div>
            <p className="text-[9px] text-gray-300 text-center pb-2">AI-generated · Verify clinically.</p>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <h3 className="text-sm font-bold text-gray-900 mb-3">Quick Actions</h3>
            <div className="space-y-2">
              {[{ icon: "📋", label: "Indications", tab: "overview" }, { icon: "💊", label: "Dosage", tab: "dosage" }, { icon: "⚠️", label: "Side Effects", tab: "side effects" }, { icon: "🔄", label: "Interactions", tab: "interactions" }, { icon: "⛔", label: "Contraindications", tab: "contraindications" }, { icon: "📑", label: "More Info", tab: "more info" }].map((a) => (
                <button key={a.label} onClick={() => setActiveTab(a.tab)} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-gray-50 text-left transition-colors"><span className="text-sm">{a.icon}</span><span className="text-xs font-medium text-gray-700">{a.label}</span></button>
              ))}
              {hasBrochure && (<button onClick={handleBrochureDownload} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-gray-50 text-left transition-colors"><span className="text-sm">📄</span><span className="text-xs font-medium text-gray-700">Download Brochure</span></button>)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
