"use client";
import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { get, post } from "@/lib/api";
import { useVirtualMR } from "@/lib/useVirtualMR";
import MarkdownMessage from "@/components/MarkdownMessage";
import { useRouter } from "next/navigation";
import Link from "next/link";

const FORM_ICONS = {
  Tablet: "/drx/images/icons/drug_icon.png",
  Capsule: "/drx/images/icons/drug_icon.png",
  Syrup: "/drx/images/icons/syrup_icon.png",
  Injection: "/drx/images/icons/injection_icon.png",
  Inhaler: "/drx/images/icons/inhaler_icon.png",
  Cream: "/drx/images/icons/ointment_icon.png",
  Powder: "/drx/images/icons/Powder.png",
};

const QUICK_QUESTIONS = [
  "What are the main indications?",
  "What is the dosage?",
  "What are the side effects?",
  "Any contraindications?",
  "Drug interactions?",
  "Mechanism of action?",
];

// ── Global Search static content (drug discovery by condition) ──
const GLOBAL_SUGGESTIONS = [
  "Best drug for Type 2 Diabetes",
  "Drugs for diabetic patients with kidney disease",
  "Which drug for hypertension in diabetics",
  "Recommended drugs for heart failure",
];

const EXAMPLE_QUESTIONS = [
  "Which drug is best for a diabetic patient with kidney disease?",
  "Which drugs are recommended for diabetic neuropathy?",
  "Which is better — DPP-4 inhibitors or SGLT2 inhibitors — for elderly diabetics?",
  "Which drugs are suitable for type 2 diabetes with obesity?",
  "Which drug is preferred for hypertension in a diabetic patient?",
  "Which drugs work best for heart failure with reduced ejection fraction?",
];

export default function VirtualMRPage() {
  const router = useRouter();
  const [mode, setMode] = useState("global"); // "global" | "drug"

  // ── Global search (faked for now) ──
  const [globalInput, setGlobalInput] = useState("");
  const [globalMessages, setGlobalMessages] = useState([]);
  const [globalTyping, setGlobalTyping] = useState(false);
  const globalEndRef = useRef(null);

  // ── Drug search (existing functionality) ──
  const [selectedDrugId, setSelectedDrugId] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [drugSearch, setDrugSearch] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [userName, setUserName] = useState("Doctor");
  const chatEndRef = useRef(null);

  const orgId = typeof window !== "undefined" ? localStorage.getItem("selectedOrgId") : null;
  const [companyName, setCompanyName] = useState("");

  useEffect(() => {
    setUserName(localStorage.getItem("userName") || "Doctor");
    setCompanyName(localStorage.getItem("companyName") || "");
  }, []);

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

  const { messages, isTyping, sendMessage, reset } = useVirtualMR({
    drugId: selectedDrugId,
    orgId,
    drugName: selectedDrug?.drug_name,
  });

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, isTyping]);
  useEffect(() => { globalEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [globalMessages, globalTyping]);

  const filteredDrugs = drugs.filter((d) => {
    if (!drugSearch.trim()) return true;
    const q = drugSearch.toLowerCase();
    return (d.drug_name || "").toLowerCase().includes(q) || (d.brand_name || "").toLowerCase().includes(q);
  });

  // ── Global search handler (QuerySearch API) ──
  const handleGlobalSend = async (text) => {
    const msg = (text || globalInput).trim();
    if (!msg) return;
    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setGlobalMessages((prev) => [...prev, { role: "user", text: msg, time }]);
    setGlobalInput("");
    setGlobalTyping(true);

    const nowTime = () => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    if (!orgId) {
      setGlobalTyping(false);
      setGlobalMessages((prev) => [...prev, { role: "ai", text: "Please select an organization first to use Global Search.", time: nowTime(), isError: true }]);
      return;
    }

    try {
      const data = await post("/api/v1/querysearch/search", {
        org_id: orgId,
        query: msg,
        top_n: 5,
      });

      // Polymorphic response: track = "medical" | "catalog"
      let answer = "";
      let drugResults = [];

      if (data?.track === "catalog") {
        answer = data?.response || "No catalog information available.";
      } else {
        // medical track (default)
        answer = data?.response || "I couldn't find relevant drugs for that query. Try rephrasing.";
        drugResults = Array.isArray(data?.results) ? data.results : [];
      }

      setGlobalTyping(false);
      setGlobalMessages((prev) => [
        ...prev,
        {
          role: "ai",
          text: answer,
          results: drugResults,
          intent: data?.intent,
          time: nowTime(),
        },
      ]);
    } catch (err) {
      const status = err?.status;
      let errorText;
      if (status === 403) errorText = "You are not connected to this organization, or Global Search is restricted for your role.";
      else if (status === 400) errorText = "Please enter a valid question.";
      else if (status === 502 || status === 503) errorText = "The search engine is temporarily unavailable. Please try again shortly.";
      else errorText = err?.message || "Unable to run the search. Please try again.";

      setGlobalTyping(false);
      setGlobalMessages((prev) => [...prev, { role: "ai", text: errorText, time: nowTime(), isError: true }]);
    }
  };

  // ── Drug chat handler ──
  const handleSend = (text) => {
    const msg = text || chatInput.trim();
    if (!msg || !selectedDrug) return;
    setChatInput("");
    sendMessage(msg);
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
    recognition.onresult = (event) => { setChatInput(event.results[0][0].transcript); setIsListening(false); };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
  };

  const drugName = selectedDrug?.drug_name || "";
  const brandName = selectedDrug?.brand_name || "";
  const form = selectedDrug?.dosage_form || "";
  const strength = selectedDrug?.strength || selectedDrug?.dosage_strength || "";
  const indications = selectedDrug?.indications || [];
  const drugIcon = FORM_ICONS[form] || "/drx/images/icons/drug_icon.png";

  return (
    <div className="space-y-4 w-full min-w-0 max-w-full overflow-x-hidden">
      {/* ═══ Hero header ═══ */}
      <div className="relative bg-gradient-to-r from-[#f5f3ff] via-white to-[#f0edfd] rounded-2xl border border-purple-100 px-5 sm:px-6 py-5 overflow-hidden">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-[#3b3a8a]">Virtual MR</h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-1 max-w-[520px]">
              Your AI-powered medical representative. Get evidence-based information on drugs, therapies, and clinical insights.
            </p>
            <span className="inline-flex items-center gap-1.5 mt-3 bg-white border border-purple-200 text-[#5b2bce] text-[10px] font-semibold px-3 py-1.5 rounded-full shadow-sm">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l2.4 7.4H22l-6 4.6 2.3 7.4L12 17l-6.3 4.4L8 14 2 9.4h7.6z"/></svg>
              Powered by Proxzar AI
            </span>
          </div>

          {/* Chatbot mascot (image includes its own speech bubble) */}
          <div className="hidden md:block flex-shrink-0">
            <img src="/drx/images/doctors/virtual_mr_info.png" alt="Your always-on medical knowledge partner" className="h-16 lg:h-20 object-contain" />
          </div>
        </div>
      </div>

      <div className="flex gap-4 flex-col lg:flex-row min-w-0">
        {/* ═══ Main column ═══ */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Mode tabs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button onClick={() => setMode("global")}
              className={`flex items-center gap-3 p-4 rounded-2xl border-2 text-left transition-all ${mode === "global" ? "border-[#5b2bce] bg-purple-50/50 shadow-sm" : "border-gray-200 bg-white hover:border-gray-300"}`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${mode === "global" ? "bg-[#5b2bce] text-white" : "bg-purple-50 text-[#5b2bce]"}`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.6 9h16.8M3.6 15h16.8M12 3a15 15 0 010 18M12 3a15 15 0 000 18" /></svg>
              </div>
              <div>
                <p className={`text-sm font-bold ${mode === "global" ? "text-[#5b2bce]" : "text-gray-800"}`}>Global Search</p>
                <p className="text-[11px] text-gray-400">Enter a patient condition to see which {companyName || "org"} drugs fit</p>
              </div>
            </button>

            <button onClick={() => setMode("drug")}
              className={`flex items-center gap-3 p-4 rounded-2xl border-2 text-left transition-all ${mode === "drug" ? "border-[#5b2bce] bg-purple-50/50 shadow-sm" : "border-gray-200 bg-white hover:border-gray-300"}`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${mode === "drug" ? "bg-[#5b2bce] text-white" : "bg-purple-50 text-[#5b2bce]"}`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
              </div>
              <div>
                <p className={`text-sm font-bold ${mode === "drug" ? "text-[#5b2bce]" : "text-gray-800"}`}>Drug Search</p>
                <p className="text-[11px] text-gray-400">Explore drugs available in your organization</p>
              </div>
            </button>
          </div>

          {/* ═══ GLOBAL SEARCH PANEL ═══ */}
          {mode === "global" && (
            <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
              {/* Question box */}
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-2">Which drug are you looking for?</p>
                <div className="relative">
                  <textarea
                    value={globalInput}
                    onChange={(e) => setGlobalInput(e.target.value.slice(0, 500))}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleGlobalSend(); } }}
                    rows={2}
                    placeholder={`"e.g. Which drug is best for a diabetic patient with hypertension?"`}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 pr-14 text-sm outline-none focus:ring-2 focus:ring-[#5b2bce]/20 focus:border-[#5b2bce] resize-none placeholder:text-gray-400 placeholder:italic"
                  />
                  <button onClick={() => handleGlobalSend()} disabled={!globalInput.trim() || globalTyping}
                    className="absolute right-2.5 bottom-2.5 w-9 h-9 bg-[#5b2bce] hover:bg-[#4318d1] text-white rounded-lg flex items-center justify-center disabled:opacity-30 transition-colors">
                    {globalTyping ? (
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                    ) : (
                      <svg width="16" height="16" fill="white" viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                    )}
                  </button>
                  <span className="absolute right-14 bottom-3.5 text-[10px] text-gray-300">{globalInput.length}/500</span>
                </div>
              </div>

              {/* Try asking about */}
              <div>
                <p className="text-[11px] text-gray-500 mb-2 flex items-center gap-1">
                  <svg className="w-3 h-3 text-[#5b2bce]" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.87-3.13-7-7-7zm-2 18c0 .55.45 1 1 1h2c.55 0 1-.45 1-1v-1h-4v1z"/></svg>
                  Try asking about:
                </p>
                <div className="flex flex-wrap gap-2">
                  {GLOBAL_SUGGESTIONS.map((s) => (
                    <button key={s} onClick={() => handleGlobalSend(s)}
                      className="text-[11px] px-3 py-1.5 rounded-full border border-gray-200 text-gray-600 hover:border-[#5b2bce] hover:text-[#5b2bce] hover:bg-purple-50 transition-all">
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Conversation */}
              {globalMessages.length > 0 && (
                <div className="max-h-[320px] overflow-y-auto space-y-3 pr-1 border-t border-gray-100 pt-4">
                  {globalMessages.map((msg, idx) => (
                    <div key={idx} className={`flex items-start gap-2.5 ${msg.role === "user" ? "justify-end" : ""}`}>
                      {msg.role === "ai" && (
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.isError ? "bg-red-100" : "bg-gradient-to-br from-[#5b2bce] to-[#7c3aed]"}`}>
                          {msg.isError ? (
                            <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          ) : (
                            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M20 9V7c0-1.1-.9-2-2-2h-3c0-1.66-1.34-3-3-3S9 3.34 9 5H6c-1.1 0-2 .9-2 2v2c-1.66 0-3 1.34-3 3s1.34 3 3 3v4c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-4c1.66 0 3-1.34 3-3s-1.34-3-3-3z"/></svg>
                          )}
                        </div>
                      )}
                      <div className={`max-w-[82%] ${msg.role === "user" ? "" : "w-full"}`}>
                        <div className={`rounded-2xl px-4 py-3 ${
                          msg.role === "user" ? "bg-[#5b2bce] text-white rounded-tr-none"
                          : msg.isError ? "bg-red-50 text-red-700 border border-red-100 rounded-tl-none"
                          : "bg-gradient-to-br from-[#f5f3ff] to-[#ede9fe] border border-purple-100 rounded-tl-none"
                        }`}>
                          {msg.role === "user" || msg.isError ? <p className="text-sm leading-relaxed">{msg.text}</p> : <MarkdownMessage content={msg.text} />}
                        </div>

                        {/* Drug result cards (identity-only) */}
                        {msg.role === "ai" && Array.isArray(msg.results) && msg.results.length > 0 && (
                          <div className="mt-2 space-y-1.5">
                            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-1">
                              <svg className="w-3 h-3 text-[#5b2bce]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                              {msg.results.length} matching {msg.results.length === 1 ? "drug" : "drugs"} in {companyName || "catalog"}
                            </p>
                            {msg.results.map((r) => {
                              const full = drugs.find((d) => (d.id || d._id) === r.drug_id);
                              return (
                                <div key={r.drug_id}
                                  className="flex items-center gap-2.5 bg-white border border-gray-200 rounded-xl px-3 py-2 hover:border-[#5b2bce] hover:shadow-sm transition-all">
                                  <div className="w-8 h-8 bg-[#eef0f9] rounded-lg flex items-center justify-center flex-shrink-0">
                                    <svg className="w-4 h-4 text-[#5b2bce]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-xs font-bold text-gray-800 capitalize truncate">{r.drug_name || r.brand_name}</p>
                                    {r.brand_name && r.brand_name !== r.drug_name && <p className="text-[10px] text-gray-400 capitalize truncate">{r.brand_name}</p>}
                                  </div>
                                  {/* Ask Virtual MR — switch to Drug Search with this drug selected */}
                                  <button
                                    onClick={() => {
                                      setSelectedDrugId(r.drug_id);
                                      reset();
                                      setMode("drug");
                                      window.scrollTo({ top: 0, behavior: "smooth" });
                                    }}
                                    className="flex items-center gap-1 text-[10px] font-semibold text-[#5b2bce] border border-[#5b2bce]/30 hover:bg-purple-50 px-2 py-1 rounded-lg transition-all flex-shrink-0"
                                    title="Ask Virtual MR about this drug">
                                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M20 9V7c0-1.1-.9-2-2-2h-3c0-1.66-1.34-3-3-3S9 3.34 9 5H6c-1.1 0-2 .9-2 2v2c-1.66 0-3 1.34-3 3s1.34 3 3 3v4c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-4c1.66 0 3-1.34 3-3s-1.34-3-3-3z"/></svg>
                                    Ask MR
                                  </button>
                                  {/* View full details */}
                                  <button
                                    onClick={() => {
                                      if (full) sessionStorage.setItem("selectedDrugData", JSON.stringify(full));
                                      router.push(`/doctor/drug-details/${r.drug_id}`);
                                    }}
                                    className="flex items-center gap-0.5 text-[10px] font-semibold text-white bg-[#5b2bce] hover:bg-[#4318d1] px-2 py-1 rounded-lg transition-all flex-shrink-0"
                                    title="View full details">
                                    View
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {globalTyping && (
                    <div className="flex items-start gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#5b2bce] to-[#7c3aed] flex items-center justify-center flex-shrink-0">
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M20 9V7c0-1.1-.9-2-2-2h-3c0-1.66-1.34-3-3-3S9 3.34 9 5H6c-1.1 0-2 .9-2 2v2c-1.66 0-3 1.34-3 3s1.34 3 3 3v4c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-4c1.66 0 3-1.34 3-3s-1.34-3-3-3z"/></svg>
                      </div>
                      <div className="bg-gradient-to-br from-[#f5f3ff] to-[#ede9fe] border border-purple-100 rounded-2xl rounded-tl-none px-4 py-3">
                        <div className="flex items-center gap-1">
                          <span className="w-2 h-2 bg-[#5b2bce] rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                          <span className="w-2 h-2 bg-[#5b2bce] rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                          <span className="w-2 h-2 bg-[#5b2bce] rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={globalEndRef} />
                </div>
              )}

              {/* Example questions grid */}
              {globalMessages.length === 0 && (
                <div className="border-t border-gray-100 pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-bold text-[#3b3a8a] flex items-center gap-1.5">
                      <svg className="w-4 h-4 text-[#5b2bce]" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l2.4 7.4H22l-6 4.6 2.3 7.4L12 17l-6.3 4.4L8 14 2 9.4h7.6z"/></svg>
                      Example Questions
                    </p>
                    <span className="text-[11px] text-[#5b2bce] font-medium">View more examples →</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {EXAMPLE_QUESTIONS.map((q) => (
                      <button key={q} onClick={() => handleGlobalSend(q)}
                        className="flex items-start gap-2 text-left p-3 rounded-xl border border-gray-100 hover:border-[#5b2bce] hover:bg-purple-50/40 transition-all group">
                        <svg className="w-4 h-4 text-gray-400 group-hover:text-[#5b2bce] mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        <span className="text-xs text-gray-600 leading-snug">{q}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ═══ DRUG SEARCH PANEL (existing) ═══ */}
          {mode === "drug" && (
            <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
              {/* Info banner */}
              <div className="flex items-start gap-2 bg-blue-50/60 border border-blue-100 rounded-xl px-3 py-2.5">
                <svg className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
                <p className="text-[11px] text-gray-600 leading-snug">
                  Select a drug from <span className="font-bold text-[#5b2bce]">{companyName || "your organization"}</span> and explore it in depth with Virtual MR — ask anything about indications, dosage, interactions, safety, and more.
                </p>
              </div>

              {/* Drug selector */}
              <div>
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">1. Select a Drug from {companyName || "your org"}</p>
                <div className="relative">
                  <button onClick={() => setShowDropdown(!showDropdown)}
                    className="w-full flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2.5 bg-white hover:border-[#5b2bce] transition-colors text-left">
                    {selectedDrug ? (
                      <>
                        <div className="w-7 h-7 bg-[#eef0f9] rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0">
                          <img src={drugIcon} alt="" className="w-10 h-10 object-cover object-center" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 capitalize truncate">{drugName || brandName}</p>
                          <p className="text-[10px] text-gray-400">{form} {strength}</p>
                        </div>
                      </>
                    ) : (
                      <span className="text-sm text-gray-400">Choose a drug to begin...</span>
                    )}
                    <svg className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${showDropdown ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </button>

                  {showDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-30 overflow-hidden">
                      <div className="p-2 border-b border-gray-100">
                        <input type="text" value={drugSearch} onChange={(e) => setDrugSearch(e.target.value)}
                          placeholder="Search drugs..." autoFocus
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-[#5b2bce]/20 focus:border-[#5b2bce]" />
                      </div>
                      <div className="max-h-[220px] overflow-y-auto">
                        {filteredDrugs.map((d) => (
                          <button key={d.id || d._id || d.drug_name}
                            onClick={() => { setSelectedDrugId(d.id || d._id); setShowDropdown(false); setDrugSearch(""); reset(); }}
                            className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-indigo-50 transition-colors ${selectedDrugId === (d.id || d._id) ? "bg-indigo-50" : ""}`}>
                            <div className="w-6 h-6 bg-[#eef0f9] rounded overflow-hidden flex items-center justify-center flex-shrink-0">
                              <img src={FORM_ICONS[d.dosage_form] || "/drx/images/icons/drug_icon.png"} alt="" className="w-8 h-8 object-cover" />
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-gray-800 capitalize">{d.drug_name || d.brand_name}</p>
                              <p className="text-[10px] text-gray-400">{d.dosage_form} {d.dosage_strength || d.strength}</p>
                            </div>
                            {selectedDrugId === (d.id || d._id) && (
                              <span className="ml-auto w-2 h-2 bg-[#5b2bce] rounded-full flex-shrink-0" />
                            )}
                          </button>
                        ))}
                        {filteredDrugs.length === 0 && <p className="text-xs text-gray-400 text-center py-4">No drugs found</p>}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Selected drug strip */}
              {selectedDrug && (
                <div className="flex items-center justify-between bg-gradient-to-r from-[#f5f3ff] to-[#ede9fe] rounded-xl px-4 py-3 border border-purple-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white rounded-xl overflow-hidden flex items-center justify-center shadow-sm flex-shrink-0">
                      <img src={drugIcon} alt="" className="w-12 h-12 object-cover" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900 capitalize">{drugName}</p>
                      <p className="text-[10px] text-gray-500 capitalize">{brandName} {strength}</p>
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {(Array.isArray(indications) ? indications : []).slice(0, 2).map((ind, i) => (
                          <span key={i} className="bg-white text-[#5b2bce] px-2 py-0.5 rounded-full text-[9px] font-semibold border border-purple-200">{ind}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5 flex-shrink-0">
                    <Link href={`/doctor/order/${selectedDrug?.id || selectedDrug?._id}`}
                      onClick={() => sessionStorage.setItem("orderDrugData", JSON.stringify(selectedDrug))}>
                      <button className="w-full bg-[#5b2bce] text-white px-3 py-1.5 rounded-lg text-[10px] font-bold hover:bg-[#4318d1] transition-colors flex items-center justify-center gap-1">
                        <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                        Order
                      </button>
                    </Link>
                    <Link href={`/doctor/drug-details/${selectedDrug?.id || selectedDrug?._id}`}
                      onClick={() => sessionStorage.setItem("selectedDrugData", JSON.stringify(selectedDrug))}>
                      <button className="w-full border border-[#5b2bce] text-[#5b2bce] px-3 py-1.5 rounded-lg text-[10px] font-bold hover:bg-white transition-colors flex items-center justify-center gap-1">
                        View Info <svg width="10" height="10" fill="currentColor" viewBox="0 0 24 24"><path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/></svg>
                      </button>
                    </Link>
                  </div>
                </div>
              )}

              {/* Chat section */}
              <div>
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-3">2. Ask Your Question</p>
                <div className="min-h-[280px] max-h-[440px] overflow-y-auto space-y-3 pr-1">
                  {!selectedDrug && messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-[280px] text-center">
                      <div className="w-16 h-16 bg-gradient-to-br from-[#5b2bce] to-[#7c3aed] rounded-2xl flex items-center justify-center mb-3 shadow-lg">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1 1 .03 2.7-1.3 2.7H4.098c-1.33 0-2.3-1.7-1.3-2.7L4.2 15.3" /></svg>
                      </div>
                      <p className="text-sm font-semibold text-gray-700 mb-1">Select a drug to start</p>
                      <p className="text-xs text-gray-400 max-w-[240px]">I&apos;ll answer clinical questions using the drug&apos;s data and official brochure.</p>
                    </div>
                  )}

                  {selectedDrug && messages.length === 0 && (
                    <div className="flex items-start gap-2.5">
                      <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 bg-gradient-to-br from-[#5b2bce] to-[#7c3aed] flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M20 9V7c0-1.1-.9-2-2-2h-3c0-1.66-1.34-3-3-3S9 3.34 9 5H6c-1.1 0-2 .9-2 2v2c-1.66 0-3 1.34-3 3s1.34 3 3 3v4c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-4c1.66 0 3-1.34 3-3s-1.34-3-3-3z"/></svg>
                      </div>
                      <div className="rounded-2xl rounded-tl-none px-4 py-3 max-w-[80%] bg-gradient-to-br from-[#f5f3ff] to-[#ede9fe] border border-purple-100">
                        <p className="text-sm text-[#2D2A6A] leading-relaxed">
                          Hi Dr. {userName}! I&apos;m ready to answer your questions about <span className="font-bold text-[#5b2bce] capitalize">{drugName}</span>.
                        </p>
                        <p className="text-[9px] text-purple-400 mt-1">AI-powered · Answers grounded in drug data</p>
                      </div>
                    </div>
                  )}

                  {messages.map((msg, idx) => (
                    <div key={idx} className={`flex items-start gap-2.5 ${msg.role === "user" ? "justify-end" : ""}`}>
                      {msg.role === "ai" && (
                        <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center ${msg.isError ? "bg-red-100" : "bg-gradient-to-br from-[#5b2bce] to-[#7c3aed]"}`}>
                          {msg.isError ? (
                            <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          ) : (
                            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M20 9V7c0-1.1-.9-2-2-2h-3c0-1.66-1.34-3-3-3S9 3.34 9 5H6c-1.1 0-2 .9-2 2v2c-1.66 0-3 1.34-3 3s1.34 3 3 3v4c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-4c1.66 0 3-1.34 3-3s-1.34-3-3-3z"/></svg>
                          )}
                        </div>
                      )}
                      <div className={`max-w-[78%] flex flex-col gap-1`}>
                        <div className={`rounded-2xl px-4 py-3 ${
                          msg.role === "user" ? "bg-[#5b2bce] text-white rounded-tr-none"
                          : msg.isError ? "bg-red-50 text-red-700 border border-red-100 rounded-tl-none"
                          : "bg-gradient-to-br from-[#f5f3ff] to-[#ede9fe] border border-purple-100 rounded-tl-none"
                        }`}>
                          {msg.role === "user" || msg.isError ? <p className="text-sm leading-relaxed">{msg.text}</p> : <MarkdownMessage content={msg.text} />}
                        </div>
                        <div className={`flex items-center gap-2 ${msg.role === "user" ? "justify-end" : ""}`}>
                          <span className="text-[9px] text-gray-400">{msg.time}</span>
                          {msg.role === "ai" && msg.sources?.length > 0 && (
                            <div className="flex gap-1">
                              {msg.sources.map((s, i) => (
                                <span key={i} className={`text-[8px] font-semibold px-1.5 py-0.5 rounded-full ${s.type === "brochure" ? "bg-green-50 text-green-600" : "bg-blue-50 text-blue-500"}`}>
                                  {s.type === "brochure" ? "📄 Brochure" : "💊 Drug Data"}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      {msg.role === "user" && (
                        <div className="w-8 h-8 rounded-full bg-[#5b2bce]/10 flex items-center justify-center flex-shrink-0 text-xs font-bold text-[#5b2bce]">
                          {userName.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                  ))}

                  {isTyping && (
                    <div className="flex items-start gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#5b2bce] to-[#7c3aed] flex items-center justify-center flex-shrink-0">
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M20 9V7c0-1.1-.9-2-2-2h-3c0-1.66-1.34-3-3-3S9 3.34 9 5H6c-1.1 0-2 .9-2 2v2c-1.66 0-3 1.34-3 3s1.34 3 3 3v4c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-4c1.66 0 3-1.34 3-3s-1.34-3-3-3z"/></svg>
                      </div>
                      <div className="bg-gradient-to-br from-[#f5f3ff] to-[#ede9fe] border border-purple-100 rounded-2xl rounded-tl-none px-4 py-3">
                        <div className="flex items-center gap-1">
                          <span className="w-2 h-2 bg-[#5b2bce] rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                          <span className="w-2 h-2 bg-[#5b2bce] rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                          <span className="w-2 h-2 bg-[#5b2bce] rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                        </div>
                        <p className="text-[9px] text-purple-400 mt-1">Analysing drug data...</p>
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                {selectedDrug && messages.length === 0 && !isTyping && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {QUICK_QUESTIONS.map((q) => (
                      <button key={q} onClick={() => handleSend(q)}
                        className="text-[10px] px-2.5 py-1.5 rounded-full border border-[#5b2bce]/30 text-[#5b2bce] hover:bg-[#5b2bce] hover:text-white transition-all font-medium">
                        {q}
                      </button>
                    ))}
                  </div>
                )}

                <div className="mt-3 border border-gray-200 rounded-xl px-3 py-2.5 flex gap-2 focus-within:border-[#5b2bce] focus-within:shadow-sm transition-all">
                  <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !isTyping) handleSend(); }}
                    disabled={!selectedDrug || isTyping}
                    placeholder={selectedDrug ? `Ask anything about ${drugName}...` : "Select a drug first..."}
                    className="flex-1 text-sm outline-none bg-transparent placeholder:text-gray-400 disabled:cursor-not-allowed" />
                  <button onClick={handleVoiceInput} disabled={!selectedDrug || isListening || isTyping}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all flex-shrink-0 ${isListening ? "bg-red-500 text-white animate-pulse" : "text-gray-400 hover:bg-gray-100"} disabled:opacity-30`}
                    title={isListening ? "Listening..." : "Voice input"}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                  </button>
                  <button onClick={() => handleSend()} disabled={!selectedDrug || !chatInput.trim() || isTyping}
                    className="w-8 h-8 bg-[#5b2bce] hover:bg-[#4318d1] text-white rounded-lg flex items-center justify-center disabled:opacity-30 transition-colors flex-shrink-0">
                    {isTyping ? (
                      <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                    ) : (
                      <svg width="14" height="14" fill="white" viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                    )}
                  </button>
                </div>
                <p className="text-[9px] text-gray-400 mt-1.5 px-1">
                  {isListening ? "🎙️ Listening... speak now" : "AI answers are grounded in drug data and official brochures. Always verify clinically."}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ═══ Right sidebar — info cards ═══ */}
        <div className="w-full lg:w-[240px] flex-shrink-0 space-y-4 min-w-0">
          {/* My Medical Rep — call assigned MR (faked, wire later) */}
          <div className="bg-white border border-purple-100 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                <svg className="w-4 h-4 text-[#5b2bce]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                My Medical Rep
              </p>
              <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-green-600">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" /> Available
              </span>
            </div>
            <p className="text-[10px] text-gray-400 mb-3">Call your assigned Medical Representative</p>

            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-10 h-10 rounded-full bg-purple-50 border border-purple-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-[#5b2bce]" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-gray-800 truncate">Rahul Sharma</p>
                <p className="text-[10px] text-gray-400">Medical Representative</p>
                <p className="text-[10px] text-[#5b2bce] font-medium truncate">{companyName || "Your Organization"}</p>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => alert("Virtual MR calling will be enabled soon.")}
                className="flex-1 flex items-center justify-center gap-1.5 bg-[#5b2bce] hover:bg-[#4318d1] text-white py-2 rounded-lg text-[11px] font-semibold transition-all">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                Call MR
              </button>
              <button
                onClick={() => alert("Medical Rep details will be available soon.")}
                className="flex-1 flex items-center justify-center gap-1.5 border border-gray-200 text-gray-600 py-2 rounded-lg text-[11px] font-semibold hover:bg-gray-50 transition-all">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                View Details
              </button>
            </div>
            <p className="text-[9px] text-gray-300 text-center mt-2">Live calling coming soon</p>
          </div>

          {/* Global Search helps */}
          <div className="bg-green-50/60 border border-green-100 rounded-2xl p-4">
            <p className="text-xs font-bold text-gray-800 flex items-center gap-1.5 mb-3">
              <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
              Global Search helps you
            </p>
            <div className="space-y-2">
              {["Find drugs by patient condition or disease", "Get AI-recommended top relevant drugs", "Drug suggestions backed by references", "Compare drug options for a condition"].map((t) => (
                <div key={t} className="flex items-start gap-2">
                  <svg className="w-3.5 h-3.5 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                  <span className="text-[11px] text-gray-600 leading-snug">{t}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Drug Search helps */}
          <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-4">
            <p className="text-xs font-bold text-gray-800 flex items-center gap-1.5 mb-3">
              <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
              Drug Search helps you
            </p>
            <div className="space-y-2">
              {["Browse drugs available in your organization", "Read full details — indications & dosage", "Access official prescribing information", "Ask the AI anything about the drug"].map((t) => (
                <div key={t} className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 flex-shrink-0" />
                  <span className="text-[11px] text-gray-600 leading-snug">{t}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Data sources */}
          <div className="bg-purple-50/50 border border-purple-100 rounded-2xl p-4">
            <p className="text-xs font-bold text-gray-800 flex items-center gap-1.5 mb-2">
              <svg className="w-4 h-4 text-[#5b2bce]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" /></svg>
              Data Sources
            </p>
            <p className="text-[11px] text-gray-500 leading-snug">Verified from official drug data, clinical guidelines, and medical literature.</p>
          </div>
        </div>
      </div>

      {/* Footer credit */}
      <p className="text-center text-[10px] text-gray-400">
        Content curated by <span className="font-semibold text-gray-500">experts</span>, delivered by <span className="font-semibold text-[#5b2bce]">proxzar</span>
      </p>
    </div>
  );
}
