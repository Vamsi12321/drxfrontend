"use client";
import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { get } from "@/lib/api";
import Link from "next/link";

const getVal = (drug, key) => { const fv = drug?.field_values?.find((f) => f.key === key); if (!fv) return drug?.[key] || ""; if (Array.isArray(fv.value)) return fv.value; return fv.value || ""; };

const FORM_ICONS = { Tablet: "/images/icons/drug_icon.png", Capsule: "/images/icons/drug_icon.png", Syrup: "/images/icons/syrup_icon.png", Injection: "/images/icons/injection_icon.png", Inhaler: "/images/icons/inhaler_icon.png", Cream: "/images/icons/ointment_icon.png", Powder: "/images/icons/Powder.png" };

export default function VirtualMRPage() {
  const [selectedDrugId, setSelectedDrugId] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [drugSearch, setDrugSearch] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState([]);
  const [showInfo, setShowInfo] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const chatEndRef = useRef(null);
  const [userName, setUserName] = useState("Doctor");

  useEffect(() => { setUserName(localStorage.getItem("userName") || "Doctor"); }, []);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatMessages]);

  const orgId = typeof window !== "undefined" ? localStorage.getItem("selectedOrgId") : null;

  const { data: drugsData } = useQuery({
    queryKey: ["drugs-all", orgId],
    queryFn: () => {
      if (!orgId) return [];
      return get(`/api/v1/organizations/${orgId}/drugs?limit=200`).then((d) => d.drugs || []);
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!orgId,
  });

  const drugs = drugsData || [];
  const selectedDrug = drugs.find((d) => (d.id || d._id) === selectedDrugId);
  // Debug — remove after confirming
  if (drugs.length > 0 && !drugs[0].id && !drugs[0]._id) {
    console.warn("[VirtualMR] Drug list has no id field. Keys:", Object.keys(drugs[0]));
  }
  const filteredDrugs = drugs.filter((d) => {
    if (!drugSearch.trim()) return true;
    const q = drugSearch.toLowerCase();
    return (d.drug_name || "").toLowerCase().includes(q) || (d.brand_name || "").toLowerCase().includes(q);
  });

  const handleSend = (text) => {
    const msg = text || chatInput.trim();
    if (!msg) return;
    setChatMessages((prev) => [...prev, { role: "user", text: msg, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) }]);
    setChatInput("");

    setTimeout(() => {
      const drug = selectedDrug;
      const drugName = drug?.drug_name || "this drug";
      const moa = drug?.mechanism_of_action || "";
      const indications = drug?.indication || (Array.isArray(drug?.indications) ? drug.indications.join(", ") : (drug?.indications || ""));
      const sideEffects = drug?.side_effects || "";
      const strength = drug?.strength || drug?.dosage_strength || "";
      const form = drug?.dosage_form || "";
      const contraindications = drug?.contraindications || "";
      const route = drug?.route_of_administration || drug?.route || "";
      const brand = drug?.brand_name || "";
      const manufacturer = drug?.manufacturer || "";

      let response = `${drugName} (${brand || ""} ${strength} ${form}) by ${manufacturer || "unknown manufacturer"} is indicated for ${indications || "various conditions"}. ${route ? `Route: ${route}.` : ""} ${moa ? `Mechanism: ${moa}.` : ""} ${sideEffects ? `Common side effects: ${sideEffects}.` : ""}`;

      if (msg.toLowerCase().includes("treatment plan") || msg.toLowerCase().includes("dosage")) {
        response = `${drugName} ${brand ? `(${brand})` : ""} ${strength} is indicated for ${indications || "the condition"}.\n\nGeneral Treatment Plan:\n\n1. Dose: ${strength} ${form} ${route || "orally"}\n2. Frequency: As prescribed (usually once/twice daily)\n3. Route: ${route || "Oral"}\n4. Monitoring: Watch for ${sideEffects || "adverse effects"}\n5. Contraindications: ${contraindications || "Refer prescribing info"}\n\nDisclaimer: Refer full prescribing information before use.`;
      } else if (msg.toLowerCase().includes("side effect")) {
        response = `Common side effects of ${drugName} (${brand}): ${sideEffects || "Please refer to prescribing information."}`;
      } else if (msg.toLowerCase().includes("interaction")) {
        response = `For drug interactions with ${drugName}, please consult the full prescribing information. ${contraindications ? `\n\nContraindications: ${contraindications}` : ""}`;
      } else if (msg.toLowerCase().includes("contraind")) {
        response = `Contraindications for ${drugName} (${brand}):\n${contraindications || "No specific contraindications listed. Refer to prescribing information."}`;
      } else if (msg.toLowerCase().includes("price") || msg.toLowerCase().includes("cost") || msg.toLowerCase().includes("pack")) {
        const pkg = drug?.packaging;
        response = pkg ? `${drugName} ${strength} pricing:\n• MRP: ₹${pkg.mrp || "N/A"}\n• Selling Price: ₹${pkg.selling_price || "N/A"}\n• Pack: ${pkg.pack_quantity} ${pkg.measurement_unit || "units"} per ${pkg.sales_unit || "strip"}\n• Max Discount: ${pkg.max_discount_percent || 0}%` : "Pricing information not available.";
      }

      setChatMessages((prev) => [...prev, { role: "ai", text: response, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) }]);
    }, 1200);
  };

  const handleVoiceInput = () => {
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      setChatInput("Voice input not supported in this browser.");
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = "en-IN";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    setIsListening(true);
    recognition.start();

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setChatInput(transcript);
      setIsListening(false);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
  };

  const drugName = selectedDrug?.drug_name || "";
  const brandName = selectedDrug?.brand_name || "";
  const form = selectedDrug?.dosage_form || "";
  const strength = selectedDrug?.dosage_strength || "";
  const indications = selectedDrug?.indications || [];
  const symptoms = selectedDrug?.symptoms || [];
  const moa = selectedDrug?.mechanism_of_action || "";
  const sideEffects = selectedDrug?.side_effects || "";
  const referenceUrl = selectedDrug?.reference_url || "";
  const drugIcon = FORM_ICONS[form] || "/images/icons/drug_icon.png";

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-bold text-[#3b3a8a]">Virtual MR</h1>
        <p className="text-sm text-gray-500">Your AI-powered medical representative. Ask anything about our therapies, studies, and more.</p>
      </div>

      <div className="flex gap-5 flex-col lg:flex-row">
        {/* ═══ Left — Drug selector + Chat ═══ */}
        <div className="flex-1 min-w-0">
          <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-5">
            <p className="text-xs font-semibold text-gray-500 mb-3">1. Select a Drug</p>
            {/* Drug dropdown */}
            <div className="relative">
              <button onClick={() => setShowDropdown(!showDropdown)}
                className="w-full max-w-xs flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2.5 bg-white hover:border-[#5b2bce] transition-colors text-left">
                {selectedDrug ? (
                  <>
                    <div className="w-6 h-6 bg-[#eef0f9] rounded overflow-hidden flex items-center justify-center flex-shrink-0">
                      <img src={drugIcon} alt="" className="w-[60px] h-[60px] object-cover object-center" />
                    </div>
                    <span className="text-sm font-medium text-gray-900 capitalize">{drugName || brandName}</span>
                  </>
                ) : (
                  <span className="text-sm text-gray-400">Select a drug...</span>
                )}
                <svg className={`w-4 h-4 text-gray-400 ml-auto transition-transform ${showDropdown ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </button>

              {showDropdown && (
                <div className="absolute top-full left-0 mt-1 w-full max-w-xs bg-white border border-gray-200 rounded-xl shadow-xl z-30 overflow-hidden">
                  {/* Search inside dropdown */}
                  <div className="p-2 border-b border-gray-100">
                    <input type="text" value={drugSearch} onChange={(e) => setDrugSearch(e.target.value)} placeholder="Search drugs..." autoFocus
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-[#5b2bce]" />
                  </div>
                  <div className="max-h-[200px] overflow-y-auto">
                    {filteredDrugs.map((d) => (
                      <button key={d.id || d._id || d.drug_name} onClick={() => { setSelectedDrugId(d.id || d._id); setShowDropdown(false); setDrugSearch(""); setChatMessages([]); }}
                        className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-indigo-50 transition-colors ${selectedDrugId === (d.id || d._id) ? "bg-indigo-50" : ""}`}>
                        <div className="w-6 h-6 bg-[#eef0f9] rounded overflow-hidden flex items-center justify-center flex-shrink-0">
                          <img src={FORM_ICONS[d.dosage_form] || "/images/icons/drug_icon.png"} alt="" className="w-[60px] h-[60px] object-cover object-center" />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-800 capitalize">{d.drug_name || d.brand_name}</p>
                          <p className="text-[10px] text-gray-400">{d.dosage_form} {d.dosage_strength}</p>
                        </div>
                      </button>
                    ))}
                    {filteredDrugs.length === 0 && <p className="text-xs text-gray-400 text-center py-4">No drugs found</p>}
                  </div>
                </div>
              )}
            </div>

            {/* Selected drug info strip */}
            {selectedDrug && (
              <div className="mt-4 flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#eef0f9] rounded-xl overflow-hidden flex items-center justify-center flex-shrink-0">
                    <img src={drugIcon} alt="" className="w-[100px] h-[100px] object-cover object-center" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900 capitalize">{drugName}</p>
                    <p className="text-[10px] text-gray-400 capitalize">{brandName} {strength}</p>
                    <div className="flex gap-1 mt-1">
                      {(Array.isArray(indications) ? indications : []).slice(0, 3).map((ind, i) => (
                        <span key={i} className="bg-indigo-50 text-[#5b2bce] px-2 py-0.5 rounded text-[9px] font-semibold">{ind}</span>
                      ))}
                    </div>
                  </div>
                </div>
                <Link href={`/doctor/drug-details/${selectedDrug?.id || selectedDrug?._id || encodeURIComponent(selectedDrug?.drug_name || "")}`} onClick={() => { if (selectedDrug) sessionStorage.setItem("selectedDrugData", JSON.stringify(selectedDrug)); }}>
                  <button className="border border-[#5b2bce] text-[#5b2bce] px-3 py-1.5 rounded-lg text-[10px] font-bold hover:bg-indigo-50 transition-colors flex items-center gap-1">
                    View Full Product Info <svg width="10" height="10" fill="currentColor" viewBox="0 0 24 24"><path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/></svg>
                  </button>
                </Link>
              </div>
            )}

          {/* Step 2: Chat */}
          <div className="overflow-hidden">
            <div className="px-0 py-3 border-b border-gray-200 mb-4">
              <p className="text-xs font-semibold text-gray-500">2. Ask Your Question</p>
            </div>

            {/* Chat messages */}
            <div className="min-h-[350px] max-h-[500px] overflow-y-auto space-y-4 py-4">
              {!selectedDrug && chatMessages.length === 0 && (
                <div className="text-center py-12">
                  <div className="w-14 h-14 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-3">
                    <img src="/images/doctors/Virtual_mr_ai.png" alt="" className="w-10 h-10 object-cover rounded-full" />
                  </div>
                  <p className="text-sm text-gray-500 font-medium">Select a drug above to start chatting</p>
                  <p className="text-xs text-gray-400 mt-1">I can answer questions about dosage, side effects, interactions, and more.</p>
                </div>
              )}

              {selectedDrug && chatMessages.length === 0 && (
                <div className="flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 bg-indigo-50 flex items-center justify-center">
                    <img src="/images/doctors/Virtual_mr_ai.png" alt="" className="w-8 h-8 object-cover" />
                  </div>
                  <div className="rounded-xl rounded-tl-none px-4 py-3 max-w-[75%]" style={{ background: "linear-gradient(135deg, #F3EEFD 0%, #EFEAFB 100%)" }}>
                    <p className="text-sm text-[#2D2A6A] leading-relaxed">Hi Dr. {userName}! I'm ready to help you with <span className="font-semibold text-[#5b2bce] capitalize">{drugName}</span>. What would you like to know?</p>
                  </div>
                </div>
              )}

              {chatMessages.map((msg, idx) => (
                <div key={idx} className={`flex items-start gap-2.5 ${msg.role === "user" ? "justify-end" : ""}`}>
                  {msg.role === "ai" && (
                    <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 bg-indigo-50">
                      <img src="/images/doctors/Virtual_mr_ai.png" alt="" className="w-8 h-8 object-cover" />
                    </div>
                  )}
                  <div className={`max-w-[75%] ${msg.role === "user" ? "" : ""}`}>
                    <div className={`rounded-xl px-4 py-3 ${msg.role === "user" ? "bg-[#5b2bce] text-white rounded-tr-none" : "rounded-tl-none"}`} style={msg.role === "ai" ? { background: "linear-gradient(135deg, #F3EEFD 0%, #EFEAFB 100%)" } : {}}>
                      <p className={`text-sm leading-relaxed whitespace-pre-line ${msg.role === "ai" ? "text-[#2D2A6A]" : ""}`}>{msg.text}</p>
                    </div>
                    <p className={`text-[9px] mt-1 ${msg.role === "user" ? "text-right text-[#7F7AA8]" : "text-[#7F7AA8]"}`}>{msg.time} {msg.role === "user" && <span className="text-[#6C4CFF]">✓✓</span>}</p>
                  </div>
                  {msg.role === "user" && (
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 text-xs font-bold text-gray-600">
                      {userName.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            {/* Chat input */}
            <div className="bg-white rounded-xl border border-gray-200 px-4 py-4 mt-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleSend(); }}
                  disabled={!selectedDrug}
                  placeholder={selectedDrug ? `Ask anything about ${drugName}...` : "Select a drug first..."}
                  className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#5b2bce]/20 focus:border-[#5b2bce] disabled:bg-gray-50 disabled:cursor-not-allowed"
                />
                <button onClick={handleVoiceInput} disabled={!selectedDrug || isListening}
                  className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all ${isListening ? "bg-red-500 animate-pulse text-white" : "bg-gray-100 hover:bg-gray-200 text-gray-600"} disabled:opacity-40 disabled:cursor-not-allowed`}
                  title={isListening ? "Listening..." : "Tap to speak"}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                </button>
                <button onClick={() => handleSend()} disabled={!selectedDrug || !chatInput.trim()}
                  className="bg-[#5b2bce] hover:bg-[#4318d1] text-white w-11 h-11 rounded-xl flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                  <svg width="18" height="18" fill="white" viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                </button>
              </div>
              <p className="text-[9px] text-gray-400 mt-2">{isListening ? "🎙️ Listening... speak now" : "Examples: dosage, side effects, contraindications, clinical studies..."}</p>
            </div>
          </div>
          </div>
        </div>

        {/* ═══ Right Sidebar — Drug Info Panel ═══ */}
        {selectedDrug && showInfo && (
          <div className="w-full lg:w-[280px] flex-shrink-0">
            <div className="rounded-2xl border border-gray-100 p-6 sticky top-4 space-y-5" style={{ background: "linear-gradient(135deg, #F9F7FE 0%, #F6F4FC 100%)" }}>
              {/* Header */}
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-[#2D2A6A]">About {drugName}</h3>
                <button onClick={() => setShowInfo(false)} className="text-gray-400 hover:text-gray-600">
                  <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
                </button>
              </div>

              {/* Drug subtitle */}
              <div>
                <p className="text-sm font-bold text-[#2D2A6A] capitalize">{brandName} {strength} {form}</p>
                <p className="text-xs text-gray-500 mt-2 leading-relaxed">{moa || `${drugName} is used for the treatment of various conditions.`}</p>
              </div>

              {/* Indications */}
              {Array.isArray(indications) && indications.length > 0 && (
                <div className="pt-4 border-t border-gray-200/60">
                  <p className="text-sm font-bold text-[#5b2bce] mb-3">Indications</p>
                  <div className="flex flex-wrap gap-2">
                    {indications.map((ind, i) => <span key={i} className="bg-white text-[#2D2A6A] px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200">{ind}</span>)}
                  </div>
                </div>
              )}

              {/* Key Benefits */}
              {Array.isArray(symptoms) && symptoms.length > 0 && (
                <div className="pt-4 border-t border-gray-200/60">
                  <p className="text-sm font-bold text-[#5b2bce] mb-3">Key Benefits</p>
                  <div className="space-y-2.5">
                    {symptoms.map((s, i) => (
                      <div key={i} className="flex items-center gap-2.5">
                        <svg width="16" height="16" fill="#10b981" viewBox="0 0 24 24" className="flex-shrink-0"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                        <span className="text-sm text-[#2D2A6A]">{s}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Side Effects */}
              {sideEffects && (
                <div className="pt-4 border-t border-gray-200/60">
                  <p className="text-sm font-bold text-[#5b2bce] mb-3">Common Side Effects</p>
                  <div className="space-y-2">
                    {(Array.isArray(sideEffects) ? sideEffects : [sideEffects]).map((se, i) => (
                      <p key={i} className="text-sm text-gray-600 flex items-center gap-2">
                        <span className="text-gray-400">•</span> {se}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick Facts */}
              <div className="pt-4 border-t border-gray-200/60">
                <p className="text-sm font-bold text-[#5b2bce] mb-3">⚡ Quick Facts</p>
                <div className="space-y-2.5">
                  {[
                    { label: "Form", value: selectedDrug?.dosage_form || form },
                    { label: "Strength", value: selectedDrug?.strength || selectedDrug?.dosage_strength || strength },
                    { label: "Route", value: selectedDrug?.route || selectedDrug?.route_of_administration },
                    { label: "Prescription", value: selectedDrug?.prescription_type || (selectedDrug?.prescription_required ? "Rx" : "OTC") },
                    { label: "Category", value: selectedDrug?.therapeutic_category || selectedDrug?.drug_class },
                    { label: "Schedule", value: selectedDrug?.schedule },
                    { label: "Pack", value: selectedDrug?.packaging?.pack_quantity && selectedDrug?.packaging?.measurement_unit ? `${selectedDrug.packaging.pack_quantity} ${selectedDrug.packaging.measurement_unit}` : null },
                    { label: "MRP", value: selectedDrug?.packaging?.mrp ? `₹${selectedDrug.packaging.mrp}` : null },
                  ].filter((f) => f.value).map((f) => (
                    <div key={f.label} className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">{f.label}</span>
                      <span className="text-xs font-semibold text-[#2D2A6A] capitalize">{f.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-2 pt-4 border-t border-gray-200/60">
                <Link
                  href={`/doctor/drug-details/${selectedDrug?.id || selectedDrug?._id || encodeURIComponent(selectedDrug?.drug_name || "")}`}
                  onClick={() => { if (selectedDrug) sessionStorage.setItem("selectedDrugData", JSON.stringify(selectedDrug)); }}
                  className="flex items-center justify-between px-4 py-3 rounded-xl bg-white border border-gray-200 hover:border-[#5b2bce] transition-colors">
                  <span className="text-sm font-medium text-[#2D2A6A] flex items-center gap-2.5">
                    <svg width="18" height="18" fill="#5b2bce" viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>
                    Full Drug Details
                  </span>
                  <svg width="14" height="14" fill="#5b2bce" viewBox="0 0 24 24"><path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/></svg>
                </Link>
                {(selectedDrug?.has_brochure || selectedDrug?.brochure_url) && (
                  <button
                    onClick={async () => {
                      const oid = localStorage.getItem("selectedOrgId");
                      const drugId = selectedDrug?.id || selectedDrug?._id;
                      if (!oid || !drugId) return;
                      const token = localStorage.getItem("access_token");
                      try {
                        const res = await fetch(`/api/v1/organizations/${oid}/drugs/${drugId}/brochure/download`, { headers: { Authorization: `Bearer ${token}` } });
                        if (!res.ok) throw new Error();
                        const blob = await res.blob();
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url; a.download = `${selectedDrug.drug_name || "drug"}_brochure.pdf`;
                        document.body.appendChild(a); a.click();
                        document.body.removeChild(a); URL.revokeObjectURL(url);
                      } catch { alert("Failed to download brochure."); }
                    }}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-white border border-gray-200 hover:border-[#5b2bce] transition-colors">
                    <span className="text-sm font-medium text-[#2D2A6A] flex items-center gap-2.5">
                      <svg width="18" height="18" fill="#5b2bce" viewBox="0 0 24 24"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
                      Download Brochure
                    </span>
                    <svg width="14" height="14" fill="#5b2bce" viewBox="0 0 24 24"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
                  </button>
                )}
                {selectedDrug?.reference_url && selectedDrug.reference_url.startsWith("http") && (
                  <a href={selectedDrug.reference_url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-between px-4 py-3 rounded-xl bg-white border border-gray-200 hover:border-[#5b2bce] transition-colors">
                    <span className="text-sm font-medium text-[#2D2A6A] flex items-center gap-2.5">
                      <svg width="18" height="18" fill="#5b2bce" viewBox="0 0 24 24"><path d="M12 3L1 9l4 2.18v6L12 21l7-3.82v-6l2-1.09V17h2V9L12 3zm6.82 6L12 12.72 5.18 9 12 5.28 18.82 9zM17 15.99l-5 2.73-5-2.73v-3.72L12 15l5-2.73v3.72z"/></svg>
                      Reference / Website
                    </span>
                    <svg width="14" height="14" fill="#5b2bce" viewBox="0 0 24 24"><path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/></svg>
                  </a>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
