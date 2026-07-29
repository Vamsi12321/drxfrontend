"use client";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { get, post, del } from "@/lib/api";
import { HiOutlineArrowLeft, HiOutlineBookmark, HiBookmark } from "react-icons/hi";

const FORM_ICONS = {
  Tablet: "/images/icons/drug_icon.png",
  Capsule: "/images/icons/drug_icon.png",
  Syrup: "/images/icons/syrup_icon.png",
  Injection: "/images/icons/injection_icon.png",
  Inhaler: "/images/icons/inhaler_icon.png",
  Cream: "/images/icons/ointment_icon.png",
  Powder: "/images/icons/Powder.png",
  Drops: "/images/icons/syrup_icon.png",
  "Enteric-coated Tablet": "/images/icons/drug_icon.png",
};

const TABS = ["Overview", "Dosage", "Side Effects", "Interactions", "Contraindications"];

export default function DrugDetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState([]);
  const [userName] = useState(typeof window !== "undefined" ? localStorage.getItem("userName") || "Doctor" : "Doctor");
  const [orgId] = useState(typeof window !== "undefined" ? localStorage.getItem("selectedOrgId") || null : null);

  // Fetch drug detail
  const { data: drug, isLoading } = useQuery({
    queryKey: ["drug-detail", id],
    queryFn: () => {
      if (orgId) return get(`/api/v1/organizations/${orgId}/drugs/${id}`).catch(() => null);
      return null;
    },
    staleTime: 5 * 60 * 1000,
    initialData: () => {
      if (typeof window === "undefined") return undefined;
      try {
        const cached = sessionStorage.getItem("selectedDrugData");
        if (cached) {
          const d = JSON.parse(cached);
          if (d.id === id || d.drug_name === decodeURIComponent(id)) return d;
        }
      } catch {}
      return undefined;
    },
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
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["bookmarks-drugs"] }); },
  });

  const removeBookmarkMutation = useMutation({
    mutationFn: () => del(`/api/v1/bookmarks/drugs/${currentBookmark?.id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["bookmarks-drugs"] }); },
  });

  const handleBookmarkToggle = () => {
    if (isBookmarked) removeBookmarkMutation.mutate();
    else addBookmarkMutation.mutate();
  };

  const bookmarkLoading = addBookmarkMutation.isPending || removeBookmarkMutation.isPending;

  // Virtual MR chat
  const handleChat = (msg) => {
    const text = msg || chatInput.trim();
    if (!text) return;
    setChatMessages((p) => [...p, { role: "user", text }]);
    setChatInput("");
    setTimeout(() => {
      setChatMessages((p) => [...p, {
        role: "ai",
        text: `Based on available information about ${drug?.drug_name || "this drug"}: ${moa || (indicationList.length > 0 ? `Used for ${indicationList.slice(0, 3).join(", ")}` : "I can provide details about dosage, side effects, and interactions.")}`,
      }]);
    }, 800);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => <div key={i} className="h-32 bg-white rounded-xl animate-pulse border border-gray-100" />)}
      </div>
    );
  }

  if (!drug) {
    return (
      <div className="text-center py-20">
        <span className="text-4xl block mb-3">💊</span>
        <p className="text-gray-500">Drug not found</p>
        <button onClick={() => router.back()} className="mt-4 text-[#5b2bce] font-semibold text-sm">← Go back</button>
      </div>
    );
  }

  // Extract fields
  const name = drug.drug_name || "";
  const brand = drug.brand_name || "";
  const genericName = drug.generic_name || "";
  const drugClass = drug.therapeutic_category || drug.drug_class || "";
  const manufacturer = drug.manufacturer || "";
  const form = drug.dosage_form || "";
  const strength = drug.strength || "";
  const route = drug.route_of_administration || drug.route || "";
  const schedule = drug.schedule || "";
  const prescriptionType = drug.prescription_type || (drug.prescription_required ? "Rx" : "OTC");
  const brochureUrl = drug.brochure_url || drug.reference_url || "";
  const packaging = drug.packaging || {};
  const drugIcon = FORM_ICONS[form] || "/images/icons/drug_icon.png";
  const moa = drug.mechanism_of_action || "";
  const storageConditions = drug.storage_conditions || "";
  const composition = drug.composition || [];

  // Handle arrays or comma-separated strings
  const toList = (val) => {
    if (!val) return [];
    if (Array.isArray(val)) return val;
    return val.split(",").map((s) => s.trim()).filter(Boolean);
  };

  const indicationList = toList(drug.indications || drug.indication);
  const contraindicationList = toList(drug.contraindications);
  const sideEffectList = toList(drug.side_effects);
  const symptomsList = toList(drug.symptoms);
  const warningsList = toList(drug.warnings_precautions);
  const interactionsList = toList(drug.drug_interactions);

  return (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-[#5b2bce] font-medium">
          <HiOutlineArrowLeft className="w-4 h-4" /> Back to Drug Search
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={handleBookmarkToggle}
            disabled={bookmarkLoading || !orgId}
            className={`flex items-center gap-1.5 border rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${isBookmarked ? "border-[#5b2bce] bg-indigo-50 text-[#5b2bce]" : "border-gray-200 text-gray-600 hover:bg-gray-50"} disabled:opacity-50`}
          >
            {isBookmarked ? <HiBookmark className="w-4 h-4" /> : <HiOutlineBookmark className="w-4 h-4" />}
            {isBookmarked ? "Bookmarked" : "Bookmark"}
          </button>
        </div>
      </div>

      {/* Main layout */}
      <div className="flex gap-5 flex-col lg:flex-row">
        {/* Left content */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Drug Header Card */}
          <div className="bg-white rounded-xl border border-gray-100 p-5 sm:p-6">
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
                  {manufacturer && <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-[10px] font-semibold">{manufacturer}</span>}
                </div>
                <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                  {form && <span className="bg-[#5b2bce] text-white px-2.5 py-0.5 rounded-full text-[10px] font-bold">{form}</span>}
                  {strength && <span className="bg-[#5b2bce] text-white px-2.5 py-0.5 rounded-full text-[10px] font-bold">{strength}</span>}
                  {route && <span className="bg-[#5b2bce] text-white px-2.5 py-0.5 rounded-full text-[10px] font-bold">{route}</span>}
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200 flex gap-3 sm:gap-5 overflow-x-auto scrollbar-hide">
            {TABS.map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab.toLowerCase())}
                className={`pb-2.5 text-xs sm:text-sm font-medium whitespace-nowrap transition-colors ${activeTab === tab.toLowerCase() ? "text-[#5b2bce] border-b-2 border-[#5b2bce]" : "text-gray-400 hover:text-gray-600"}`}>
                {tab}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          {activeTab === "overview" && (
            <div className="space-y-4">
              {/* Key Information */}
              <div className="bg-white rounded-xl border border-gray-100 p-5">
                <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">🔑 Key Information</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { l: "Drug Class", v: drugClass || "—" },
                    { l: "Route", v: route || "—" },
                    { l: "Schedule", v: schedule || prescriptionType },
                    { l: "Prescription", v: prescriptionType === "Rx" ? "Required (Rx)" : "OTC" },
                  ].map((item) => (
                    <div key={item.l} className="text-center">
                      <p className="text-[10px] text-gray-400 font-medium mb-1">{item.l}</p>
                      <p className="text-xs font-semibold text-gray-800 capitalize">{item.v}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Symptoms */}
              {symptomsList.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-100 p-5">
                  <h3 className="text-sm font-bold text-gray-900 mb-3">🩺 Symptoms It Treats</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {symptomsList.map((s, i) => (
                      <span key={i} className="bg-red-50 text-red-600 px-2.5 py-1 rounded-lg text-xs font-medium border border-red-100 capitalize">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Indications */}
              {indicationList.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-100 p-5">
                  <h3 className="text-sm font-bold text-gray-900 mb-3">📋 Indications</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {indicationList.map((ind, i) => (
                      <span key={i} className="bg-green-50 text-green-600 px-2.5 py-1 rounded-lg text-xs font-medium border border-green-100 capitalize">
                        {ind}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Mechanism of Action */}
              {moa && (
                <div className="bg-white rounded-xl border border-gray-100 p-5">
                  <h3 className="text-sm font-bold text-gray-900 mb-3">⚙️ Mechanism of Action</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{moa}</p>
                </div>
              )}

              {/* Composition */}
              {composition.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-100 p-5">
                  <h3 className="text-sm font-bold text-gray-900 mb-3">🧪 Composition</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {composition.map((c, i) => (
                      <span key={i} className="bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-lg text-xs font-medium border border-indigo-100">
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Packaging */}
              {packaging.selling_price && (
                <div className="bg-white rounded-xl border border-gray-100 p-5">
                  <h3 className="text-sm font-bold text-gray-900 mb-3">📦 Packaging & Pricing</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {[
                      { l: "Pack", v: `${packaging.pack_quantity} ${packaging.measurement_unit || "units"}` },
                      { l: "MRP", v: packaging.mrp ? `₹${packaging.mrp}` : "—" },
                      { l: "Selling Price", v: `₹${packaging.selling_price}` },
                      { l: "Max Discount", v: packaging.max_discount_percent ? `${packaging.max_discount_percent}%` : "—" },
                    ].map((item) => (
                      <div key={item.l} className="text-center">
                        <p className="text-[10px] text-gray-400 font-medium mb-1">{item.l}</p>
                        <p className="text-xs font-semibold text-gray-800">{item.v}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Storage */}
              {storageConditions && (
                <div className="bg-white rounded-xl border border-gray-100 p-5">
                  <h3 className="text-sm font-bold text-gray-900 mb-2">🌡️ Storage Conditions</h3>
                  <p className="text-sm text-gray-600">{storageConditions}</p>
                </div>
              )}

              {/* Brochure link */}
              {brochureUrl && (
                <a href={brochureUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 text-xs text-[#5b2bce] font-semibold hover:underline">
                  📄 View Drug Brochure / Monograph →
                </a>
              )}

              {/* Available Forms */}
              <div className="bg-white rounded-xl border border-gray-100 p-5">
                <h3 className="text-sm font-bold text-gray-900 mb-4">Available Forms</h3>
                <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                  {Object.entries(FORM_ICONS).slice(0, 6).map(([fn, ic]) => (
                    <div key={fn} className={`flex flex-col items-center gap-2 min-w-[80px] p-3 rounded-xl border transition-all ${form === fn ? "border-[#5b2bce] bg-indigo-50 scale-105" : "border-gray-100 hover:border-gray-200"}`}>
                      <div className="w-10 h-10 overflow-hidden rounded-lg flex items-center justify-center bg-gray-50">
                        <img src={ic} alt={fn} className="w-[100px] h-[100px] object-cover object-center" />
                      </div>
                      <p className="text-[10px] font-medium text-gray-700">{fn}</p>
                      <p className="text-[9px] text-gray-400">{fn === form ? strength : "—"}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "dosage" && (
            <div className="space-y-4">
              <div className="bg-white rounded-xl border border-gray-100 p-5">
                <h3 className="text-sm font-bold text-gray-900 mb-3">💊 Dosage Information</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
                  {[
                    { l: "Form", v: form || "—" },
                    { l: "Strength", v: strength || "—" },
                    { l: "Route", v: route || "—" },
                  ].map((item) => (
                    <div key={item.l}>
                      <p className="text-[10px] text-gray-400 font-medium mb-1">{item.l}</p>
                      <p className="text-sm font-semibold text-gray-800">{item.v}</p>
                    </div>
                  ))}
                </div>
                {packaging.pack_quantity && (
                  <div className="bg-gray-50 rounded-lg p-3 mt-3">
                    <p className="text-xs text-gray-500">
                      <span className="font-semibold text-gray-700">Packaging:</span> {packaging.pack_quantity} {packaging.measurement_unit || "units"} per {packaging.sales_unit || "strip"}
                      {packaging.sales_units_per_box ? `, ${packaging.sales_units_per_box} strips per box` : ""}
                    </p>
                  </div>
                )}
              </div>

              <div className="bg-white rounded-xl border border-gray-100 p-5">
                <h3 className="text-sm font-bold text-gray-900 mb-3">📝 Administration Notes</h3>
                <div className="space-y-2 text-sm text-gray-600">
                  <p>• Route: <span className="font-medium">{route || "As directed"}</span></p>
                  <p>• Schedule: <span className="font-medium">{schedule || prescriptionType}</span></p>
                  <p>• Prescription: <span className="font-medium">{prescriptionType === "Rx" ? "Required (Rx)" : "Available OTC"}</span></p>
                </div>
              </div>
            </div>
          )}

          {activeTab === "side effects" && (
            <div className="space-y-4">
              <div className="bg-white rounded-xl border border-gray-100 p-5">
                <h3 className="text-sm font-bold text-gray-900 mb-3">⚠️ Side Effects</h3>
                {sideEffectList.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {sideEffectList.map((effect, i) => (
                      <span key={i} className="bg-orange-50 text-orange-700 px-2.5 py-1 rounded-lg text-xs font-medium border border-orange-100">
                        {effect}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">No side effects information available.</p>
                )}
              </div>

              {brochureUrl && (
                <div className="bg-white rounded-xl border border-gray-100 p-5">
                  <h3 className="text-sm font-bold text-gray-900 mb-2">📄 Full Safety Information</h3>
                  <a href={brochureUrl} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-[#5b2bce] font-semibold hover:underline">
                    View complete prescribing information →
                  </a>
                </div>
              )}
            </div>
          )}

          {activeTab === "interactions" && (
            <div className="space-y-4">
              <div className="bg-white rounded-xl border border-gray-100 p-5">
                <h3 className="text-sm font-bold text-gray-900 mb-3">🔄 Drug Interactions</h3>
                {interactionsList.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {interactionsList.map((item, i) => (
                      <span key={i} className="bg-yellow-50 text-yellow-700 px-2.5 py-1 rounded-lg text-xs font-medium border border-yellow-100 capitalize">
                        {item}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">
                    No specific interaction data available. Consult the prescribing information or ask your Virtual MR.
                  </p>
                )}
                {brochureUrl && (
                  <a href={brochureUrl} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-[#5b2bce] font-semibold hover:underline mt-3 inline-block">
                    View full prescribing information →
                  </a>
                )}
              </div>

              {/* Warnings & Precautions */}
              {warningsList.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-100 p-5">
                  <h3 className="text-sm font-bold text-gray-900 mb-3">⚠️ Warnings & Precautions</h3>
                  <div className="space-y-2">
                    {warningsList.map((w, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <span className="text-amber-500 mt-0.5 flex-shrink-0">•</span>
                        <p className="text-sm text-gray-700">{w}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-indigo-50 rounded-xl border border-indigo-100 p-5">
                <h3 className="text-sm font-bold text-[#3b3a8a] mb-2">💡 Tip</h3>
                <p className="text-xs text-gray-600">Use the Virtual MR chat to ask about specific drug interactions with {name}.</p>
              </div>
            </div>
          )}

          {activeTab === "contraindications" && (
            <div className="space-y-4">
              <div className="bg-white rounded-xl border border-gray-100 p-5">
                <h3 className="text-sm font-bold text-gray-900 mb-3">⛔ Contraindications</h3>
                {contraindicationList.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {contraindicationList.map((c, i) => (
                      <span key={i} className="bg-red-50 text-red-600 px-2.5 py-1 rounded-lg text-xs font-medium border border-red-100 capitalize">
                        {c}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">No contraindications information available.</p>
                )}
              </div>

              {/* Warnings */}
              {warningsList.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-100 p-5">
                  <h3 className="text-sm font-bold text-gray-900 mb-3">⚠️ Warnings & Precautions</h3>
                  <div className="space-y-2">
                    {warningsList.map((w, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <span className="text-amber-500 mt-0.5 flex-shrink-0">•</span>
                        <p className="text-sm text-gray-700">{w}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {prescriptionType === "Rx" && (
                <div className="bg-amber-50 rounded-xl border border-amber-100 p-5">
                  <h3 className="text-sm font-bold text-amber-800 mb-1">⚕️ Prescription Required</h3>
                  <p className="text-xs text-amber-700">
                    This is a {schedule || "Schedule"} {prescriptionType} drug. It must be prescribed by a registered medical practitioner.
                  </p>
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
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span> Online
              </span>
            </div>
            <div className="p-3 space-y-2.5 max-h-[250px] overflow-y-auto">
              <div className="flex items-start gap-2">
                <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0">
                  <img src="/images/doctors/Virtual_mr_ai.png" alt="" className="w-6 h-6 object-cover" />
                </div>
                <div className="bg-gray-50 rounded-lg rounded-tl-none px-3 py-2 max-w-[90%]">
                  <p className="text-[11px] text-gray-700 leading-relaxed">
                    Hi Dr. {userName} 👋<br />I am your Virtual MR.<br />How can I help you with <span className="text-[#5b2bce] font-semibold capitalize">{name}</span> today?
                  </p>
                </div>
              </div>
              {chatMessages.map((msg, idx) => (
                <div key={idx} className={`flex items-start gap-2 ${msg.role === "user" ? "justify-end" : ""}`}>
                  {msg.role === "ai" && (
                    <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0">
                      <img src="/images/doctors/Virtual_mr_ai.png" alt="" className="w-6 h-6 object-cover" />
                    </div>
                  )}
                  <div className={`rounded-lg px-3 py-2 max-w-[85%] ${msg.role === "user" ? "bg-[#5b2bce] text-white rounded-tr-none" : "bg-gray-50 text-gray-700 rounded-tl-none"}`}>
                    <p className="text-[11px] leading-relaxed">{msg.text}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="px-3 pb-2 flex flex-col gap-1.5">
              {["Dosage info?", "Drug interactions?", "Side effects?", "Contraindications?"].map((q) => (
                <button key={q} onClick={() => handleChat(q)}
                  className="text-left text-[10px] text-gray-600 bg-gray-50 hover:bg-indigo-50 hover:text-[#5b2bce] px-3 py-1.5 rounded-lg border border-gray-100 font-medium transition-colors">
                  {q}
                </button>
              ))}
            </div>
            <div className="border-t border-gray-100 px-3 py-2 flex gap-2">
              <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleChat(); }}
                placeholder="Ask anything..."
                className="flex-1 border border-gray-200 rounded-lg px-2.5 py-1.5 text-[11px] outline-none focus:ring-1 focus:ring-[#5b2bce]" />
              <button onClick={() => handleChat()}
                className="bg-[#5b2bce] text-white w-7 h-7 rounded-lg flex items-center justify-center hover:bg-[#4318d1]">
                <svg width="12" height="12" fill="white" viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" /></svg>
              </button>
            </div>
            <p className="text-[9px] text-gray-300 text-center pb-2">AI-generated. Verify clinically.</p>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <h3 className="text-sm font-bold text-gray-900 mb-3">Quick Actions</h3>
            <div className="space-y-2">
              {[
                { icon: "📋", label: "View Indications", tab: "overview" },
                { icon: "💊", label: "Dosage Guide", tab: "dosage" },
                { icon: "⚠️", label: "Side Effects", tab: "side effects" },
                { icon: "⛔", label: "Contraindications", tab: "contraindications" },
              ].map((a) => (
                <button key={a.label} onClick={() => setActiveTab(a.tab)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-gray-50 text-left transition-colors">
                  <span className="text-sm">{a.icon}</span>
                  <span className="text-xs font-medium text-gray-700">{a.label}</span>
                </button>
              ))}
              {brochureUrl && (
                <a href={brochureUrl} target="_blank" rel="noopener noreferrer"
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-gray-50 text-left transition-colors">
                  <span className="text-sm">📄</span>
                  <span className="text-xs font-medium text-gray-700">Download Brochure</span>
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
