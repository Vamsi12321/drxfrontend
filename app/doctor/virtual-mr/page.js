"use client";
import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { get } from "@/lib/api";
import { useVirtualMR } from "@/lib/useVirtualMR";
import MarkdownMessage from "@/components/MarkdownMessage";
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

export default function VirtualMRPage() {
  const [selectedDrugId, setSelectedDrugId] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [drugSearch, setDrugSearch] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [showInfo, setShowInfo] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [userName, setUserName] = useState("Doctor");
  const chatEndRef = useRef(null);

  const orgId = typeof window !== "undefined" ? localStorage.getItem("selectedOrgId") : null;

  useEffect(() => { setUserName(localStorage.getItem("userName") || "Doctor"); }, []);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, []);

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

  // Scroll to bottom on new messages or typing indicator change
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const filteredDrugs = drugs.filter((d) => {
    if (!drugSearch.trim()) return true;
    const q = drugSearch.toLowerCase();
    return (d.drug_name || "").toLowerCase().includes(q) || (d.brand_name || "").toLowerCase().includes(q);
  });

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
  const symptoms = selectedDrug?.symptoms || [];
  const moa = selectedDrug?.mechanism_of_action || "";
  const sideEffects = selectedDrug?.side_effects || "";
  const drugIcon = FORM_ICONS[form] || "/drx/images/icons/drug_icon.png";

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-[#3b3a8a]">Virtual MR</h1>
        <p className="text-sm text-gray-500">AI-powered medical representative. Ask anything about therapies, studies, and clinical data.</p>
      </div>

      <div className="flex gap-5 flex-col lg:flex-row">
        {/* ═══ Left — Drug selector + Chat ═══ */}
        <div className="flex-1 min-w-0">
          <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
            {/* Drug selector */}
            <div>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">1. Select a Drug</p>
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
                <Link href={`/doctor/drug-details/${selectedDrug?.id || selectedDrug?._id}`}
                  onClick={() => sessionStorage.setItem("selectedDrugData", JSON.stringify(selectedDrug))}>
                  <button className="border border-[#5b2bce] text-[#5b2bce] px-3 py-1.5 rounded-lg text-[10px] font-bold hover:bg-white transition-colors flex items-center gap-1 flex-shrink-0">
                    View Info <svg width="10" height="10" fill="currentColor" viewBox="0 0 24 24"><path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/></svg>
                  </button>
                </Link>
              </div>
            )}

            {/* Chat section */}
            <div>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-3">2. Ask Your Question</p>

              {/* Messages */}
              <div className="min-h-[300px] max-h-[480px] overflow-y-auto space-y-3 pr-1">
                {/* Empty state */}
                {!selectedDrug && messages.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-[300px] text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-[#5b2bce] to-[#7c3aed] rounded-2xl flex items-center justify-center mb-3 shadow-lg">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1 1 .03 2.7-1.3 2.7H4.098c-1.33 0-2.3-1.7-1.3-2.7L4.2 15.3" /></svg>
                    </div>
                    <p className="text-sm font-semibold text-gray-700 mb-1">Select a drug to start</p>
                    <p className="text-xs text-gray-400 max-w-[240px]">I'll answer clinical questions using the drug's data and official brochure.</p>
                  </div>
                )}

                {/* Welcome message when drug is selected */}
                {selectedDrug && messages.length === 0 && (
                  <div className="flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 bg-gradient-to-br from-[#5b2bce] to-[#7c3aed] flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M20 9V7c0-1.1-.9-2-2-2h-3c0-1.66-1.34-3-3-3S9 3.34 9 5H6c-1.1 0-2 .9-2 2v2c-1.66 0-3 1.34-3 3s1.34 3 3 3v4c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-4c1.66 0 3-1.34 3-3s-1.34-3-3-3z"/></svg>
                    </div>
                    <div className="rounded-2xl rounded-tl-none px-4 py-3 max-w-[80%] bg-gradient-to-br from-[#f5f3ff] to-[#ede9fe] border border-purple-100">
                      <p className="text-sm text-[#2D2A6A] leading-relaxed">
                        Hi Dr. {userName}! I'm ready to answer your questions about <span className="font-bold text-[#5b2bce] capitalize">{drugName}</span>.
                        {moa ? ` I have access to the drug's clinical data and official brochure.` : ""}
                      </p>
                      <p className="text-[9px] text-purple-400 mt-1">AI-powered · Answers grounded in drug data</p>
                    </div>
                  </div>
                )}

                {/* Messages */}
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
                    <div className={`max-w-[78%] ${msg.role === "user" ? "items-end" : "items-start"} flex flex-col gap-1`}>
                      <div className={`rounded-2xl px-4 py-3 ${
                        msg.role === "user"
                          ? "bg-[#5b2bce] text-white rounded-tr-none"
                          : msg.isError
                          ? "bg-red-50 text-red-700 border border-red-100 rounded-tl-none"
                          : "bg-gradient-to-br from-[#f5f3ff] to-[#ede9fe] border border-purple-100 rounded-tl-none"
                      }`}>
                        {msg.role === "user" || msg.isError
                          ? <p className="text-sm leading-relaxed">{msg.text}</p>
                          : <MarkdownMessage content={msg.text} />
                        }
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

                {/* Typing indicator */}
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

              {/* Quick questions */}
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

              {/* Input */}
              <div className="mt-3 border border-gray-200 rounded-xl px-3 py-2.5 flex gap-2 focus-within:border-[#5b2bce] focus-within:shadow-sm transition-all">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !isTyping) handleSend(); }}
                  disabled={!selectedDrug || isTyping}
                  placeholder={selectedDrug ? `Ask anything about ${drugName}...` : "Select a drug first..."}
                  className="flex-1 text-sm outline-none bg-transparent placeholder:text-gray-400 disabled:cursor-not-allowed"
                />
                <button onClick={handleVoiceInput} disabled={!selectedDrug || isListening || isTyping}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all flex-shrink-0 ${isListening ? "bg-red-500 text-white animate-pulse" : "text-gray-400 hover:bg-gray-100"} disabled:opacity-30`}
                  title={isListening ? "Listening..." : "Voice input"}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                </button>
                <button onClick={() => handleSend()}
                  disabled={!selectedDrug || !chatInput.trim() || isTyping}
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
        </div>

        {/* ═══ Right Sidebar — Drug Info Panel ═══ */}
        {selectedDrug && showInfo && (
          <div className="w-full lg:w-[270px] flex-shrink-0">
            <div className="rounded-2xl border border-gray-100 p-5 sticky top-4 space-y-4 bg-gradient-to-br from-[#f9f7fe] to-[#f6f4fc]">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-[#2D2A6A]">About {drugName}</h3>
                <button onClick={() => setShowInfo(false)} className="text-gray-400 hover:text-gray-600 w-6 h-6 flex items-center justify-center rounded-full hover:bg-gray-200 transition-colors">
                  <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
                </button>
              </div>

              <div>
                <p className="text-sm font-bold text-[#2D2A6A] capitalize">{brandName} {strength} {form}</p>
                <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">{moa || `${drugName} is indicated for various medical conditions.`}</p>
              </div>

              {Array.isArray(indications) && indications.length > 0 && (
                <div className="pt-3 border-t border-white/60">
                  <p className="text-xs font-bold text-[#5b2bce] mb-2">Indications</p>
                  <div className="flex flex-wrap gap-1.5">
                    {indications.map((ind, i) => (
                      <span key={i} className="bg-white text-[#2D2A6A] px-2.5 py-1 rounded-lg text-[10px] font-medium border border-gray-200">{ind}</span>
                    ))}
                  </div>
                </div>
              )}

              {Array.isArray(symptoms) && symptoms.length > 0 && (
                <div className="pt-3 border-t border-white/60">
                  <p className="text-xs font-bold text-[#5b2bce] mb-2">Key Benefits</p>
                  <div className="space-y-2">
                    {symptoms.slice(0, 4).map((s, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <svg width="14" height="14" fill="#10b981" viewBox="0 0 24 24" className="flex-shrink-0"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                        <span className="text-xs text-[#2D2A6A]">{s}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {sideEffects && (
                <div className="pt-3 border-t border-white/60">
                  <p className="text-xs font-bold text-[#5b2bce] mb-2">Common Side Effects</p>
                  <div className="space-y-1.5">
                    {(Array.isArray(sideEffects) ? sideEffects : [sideEffects]).slice(0, 4).map((se, i) => (
                      <p key={i} className="text-xs text-gray-600 flex items-center gap-1.5"><span className="text-orange-400">•</span>{se}</p>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick facts */}
              <div className="pt-3 border-t border-white/60">
                <p className="text-xs font-bold text-[#5b2bce] mb-2">⚡ Quick Facts</p>
                <div className="space-y-2">
                  {[
                    { label: "Form", value: form },
                    { label: "Strength", value: strength },
                    { label: "Route", value: selectedDrug?.route || selectedDrug?.route_of_administration },
                    { label: "Schedule", value: selectedDrug?.schedule },
                    { label: "MRP", value: selectedDrug?.packaging?.mrp ? `₹${selectedDrug.packaging.mrp}` : null },
                  ].filter((f) => f.value).map((f) => (
                    <div key={f.label} className="flex items-center justify-between">
                      <span className="text-[10px] text-gray-400">{f.label}</span>
                      <span className="text-[10px] font-semibold text-[#2D2A6A] capitalize">{f.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <Link href={`/doctor/drug-details/${selectedDrug?.id || selectedDrug?._id}`}
                onClick={() => sessionStorage.setItem("selectedDrugData", JSON.stringify(selectedDrug))}
                className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-white border border-gray-200 hover:border-[#5b2bce] transition-colors mt-2">
                <span className="text-xs font-semibold text-[#2D2A6A]">Full Drug Details</span>
                <svg width="12" height="12" fill="#5b2bce" viewBox="0 0 24 24"><path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/></svg>
              </Link>
            </div>
          </div>
        )}

        {/* Show info button when panel is hidden */}
        {selectedDrug && !showInfo && (
          <button onClick={() => setShowInfo(true)}
            className="hidden lg:flex items-center gap-1.5 text-xs text-[#5b2bce] font-semibold self-start mt-2 px-3 py-2 border border-[#5b2bce]/30 rounded-xl hover:bg-purple-50 transition-colors">
            <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
            Show Drug Info
          </button>
        )}
      </div>
    </div>
  );
}
