"use client";
import { useState, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { post as apiPost } from "@/lib/api";

const SYMPTOM_SUGGESTIONS = [
  "fever","headache","cough","cold","nausea","vomiting","diarrhea","constipation",
  "chest pain","shortness of breath","fatigue","dizziness","back pain","joint pain",
  "muscle pain","sore throat","runny nose","skin rash","itching","swelling",
  "high blood pressure","diabetes","anxiety","depression","insomnia","allergy",
  "infection","inflammation","hypertension","asthma","migraine","acidity",
  "stomach pain","weight loss","weight gain","hair loss","eye pain","ear pain",
  "urinary infection","kidney pain","liver disease","thyroid","anemia","cholesterol",
  "heart disease","stroke","epilepsy","arthritis","osteoporosis",
];

// Static class maps — no dynamic template literals (Turbopack source map safe)
const ACCENT = {
  indigo: {
    activePill:    "bg-indigo-600 text-white shadow-sm",
    chip:          "bg-indigo-600 text-white",
    dot:           "bg-indigo-500",
    chipText:      "text-indigo-600",
    borderFocus:   "border-indigo-400 ring-2 ring-indigo-100 bg-white",
    textareaFocus: "border-indigo-400 ring-2 ring-indigo-100",
    btn:           "bg-indigo-600 hover:bg-indigo-700 text-white",
  },
  orange: {
    activePill:    "bg-orange-600 text-white shadow-sm",
    chip:          "bg-orange-600 text-white",
    dot:           "bg-orange-500",
    chipText:      "text-orange-600",
    borderFocus:   "border-orange-400 ring-2 ring-orange-100 bg-white",
    textareaFocus: "border-orange-400 ring-2 ring-orange-100",
    btn:           "bg-orange-600 hover:bg-orange-700 text-white",
  },
  purple: {
    activePill:    "bg-purple-600 text-white shadow-sm",
    chip:          "bg-purple-600 text-white",
    dot:           "bg-purple-500",
    chipText:      "text-purple-600",
    borderFocus:   "border-purple-400 ring-2 ring-purple-100 bg-white",
    textareaFocus: "border-purple-400 ring-2 ring-purple-100",
    btn:           "bg-purple-600 hover:bg-purple-700 text-white",
  },
};

export default function SmartSearch({ onSearch, onSmartResults, accentColor = "indigo", onAnalyzeReport }) {
  const [mode, setMode]                 = useState("keyword");
  const [chips, setChips]               = useState([]);
  const [inputVal, setInputVal]         = useState("");
  const [suggestions, setSuggestions]   = useState([]);
  const [naturalQuery, setNaturalQuery] = useState("");
  const [showInfo, setShowInfo]         = useState(false);
  const [smartResults, setSmartResults] = useState(null);
  const inputRef = useRef(null);

  const a = ACCENT[accentColor] || ACCENT.indigo;

  const searchMutation = useMutation({
    mutationFn: (query) => apiPost("/api/v1/search/drugs", { query, skip: 0, limit: 20 }),
    onSuccess: (data) => { setSmartResults(data); if (onSmartResults) onSmartResults(data); },
  });

  const handleInput = (val) => {
    setInputVal(val);
    if (!val.trim()) { setSuggestions([]); return; }
    const q = val.toLowerCase();
    setSuggestions(SYMPTOM_SUGGESTIONS.filter((s) => s.includes(q) && !chips.includes(s)).slice(0, 6));
  };

  const addChip = (val) => {
    const v = val.trim().toLowerCase();
    if (!v || chips.includes(v)) return;
    const newChips = [...chips, v];
    setChips(newChips);
    setInputVal(""); setSuggestions([]);
    if (onSearch) onSearch({ mode: "keyword", chips: newChips });
    inputRef.current?.focus();
  };

  const removeChip = (chip) => {
    const newChips = chips.filter((c) => c !== chip);
    setChips(newChips);
    if (onSearch) onSearch({ mode: "keyword", chips: newChips });
  };

  const handleKeyDown = (e) => {
    if ((e.key === "Enter" || e.key === ",") && inputVal.trim()) { e.preventDefault(); addChip(inputVal); }
    if (e.key === "Backspace" && !inputVal && chips.length > 0) {
      const newChips = chips.slice(0, -1);
      setChips(newChips);
      if (onSearch) onSearch({ mode: "keyword", chips: newChips });
    }
  };

  const switchMode = (m) => {
    setMode(m); setChips([]); setInputVal(""); setNaturalQuery(""); setSuggestions([]);
    setSmartResults(null);
    if (onSearch) onSearch({ mode: m, chips: [], query: "" });
    if (onSmartResults) onSmartResults(null);
  };

  const handleNaturalSearch = () => {
    if (!naturalQuery.trim()) return;
    searchMutation.mutate(naturalQuery);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 mb-4 overflow-visible">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <span className="text-base">🧠</span>
          <span className="text-sm font-bold text-gray-800">Smart Search</span>
          <button onClick={() => setShowInfo((s) => !s)}
            className="w-4 h-4 rounded-full bg-gray-100 text-gray-400 hover:bg-gray-200 text-xs flex items-center justify-center font-bold transition-colors">
            ?
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Analyze Report — premium pill */}
          {onAnalyzeReport && (
            <button onClick={onAnalyzeReport}
              className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold overflow-hidden group shadow-sm"
              style={{ background: "linear-gradient(135deg, #f59e0b 0%, #ef4444 50%, #8b5cf6 100%)" }}>
              <span className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 skew-x-12" />
              <svg className="w-3 h-3 text-white relative z-10 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="text-white relative z-10 whitespace-nowrap">✨ Analyze Report</span>
            </button>
          )}

          {/* Mode pills */}
          <div className="flex items-center bg-gray-100 rounded-full p-0.5 gap-0.5">
            {[
              { id: "keyword", label: "Symptoms" },
              { id: "natural", label: "Ask AI" },
            ].map((m) => (
              <button key={m.id} onClick={() => switchMode(m.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  mode === m.id ? a.activePill : "text-gray-500 hover:text-gray-700"
                }`}>
                {m.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="px-4 py-3">
        {/* Info tooltip */}
        {showInfo && (
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 mb-3 text-xs text-blue-700 space-y-1">
            <p><span className="font-bold">Symptoms:</span> Add symptoms as chips — matching drugs appear instantly.</p>
            <p><span className="font-bold">Ask AI:</span> Type naturally — "fever and joint pain" — AI finds relevant drugs.</p>
            <p><span className="font-bold">✨ Analyze Report:</span> Upload a PDF/image — AI extracts diagnosis, medications and findings.</p>
          </div>
        )}

        {/* Keyword chip mode */}
        {mode === "keyword" && (
          <div className="relative">
            <div onClick={() => inputRef.current?.focus()}
              className={`min-h-[44px] flex flex-wrap items-center gap-1.5 px-3 py-2 border rounded-xl cursor-text transition-all ${
                inputVal || chips.length > 0
                  ? a.borderFocus
                  : "border-gray-200 bg-gray-50 hover:bg-white hover:border-gray-300"
              }`}>
              {chips.map((chip) => (
                <span key={chip}
                  className={`flex items-center gap-1 ${a.chip} text-xs font-semibold px-2.5 py-1 rounded-full`}>
                  {chip}
                  <button onClick={() => removeChip(chip)} className="hover:text-red-200 transition-colors leading-none text-white/80">×</button>
                </span>
              ))}
              <input ref={inputRef} type="text" value={inputVal}
                onChange={(e) => handleInput(e.target.value)} onKeyDown={handleKeyDown}
                placeholder={chips.length === 0 ? "Type a symptom (e.g. fever, headache)..." : "Add more..."}
                className="flex-1 min-w-[140px] outline-none text-sm bg-transparent text-gray-700 placeholder-gray-400" />
            </div>

            {/* Suggestions dropdown */}
            {suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-20 overflow-hidden">
                {suggestions.map((s) => (
                  <button key={s} onClick={() => addChip(s)}
                    className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${a.dot} flex-shrink-0`} />
                    <span className="capitalize">{s}</span>
                  </button>
                ))}
              </div>
            )}

            {chips.length > 0 && (
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-gray-400">
                  Showing drugs for: <span className={`${a.chipText} font-semibold`}>{chips.join(" · ")}</span>
                </p>
                <button onClick={() => { setChips([]); if (onSearch) onSearch({ mode: "keyword", chips: [] }); }}
                  className="text-xs text-gray-400 hover:text-red-500 transition-colors">Clear</button>
              </div>
            )}
          </div>
        )}

        {/* Natural query mode */}
        {mode === "natural" && (
          <div className="space-y-2.5">
            <div className="flex gap-2">
              <textarea value={naturalQuery}
                onChange={(e) => {
                  setNaturalQuery(e.target.value);
                  if (!e.target.value.trim()) { setSmartResults(null); if (onSmartResults) onSmartResults(null); }
                }}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), handleNaturalSearch())}
                placeholder="e.g. 'Patient has fever, headache and joint pain for 3 days'"
                rows={2}
                className={`flex-1 px-4 py-2.5 border rounded-xl text-sm outline-none resize-none transition-all placeholder-gray-400 ${
                  naturalQuery
                    ? a.textareaFocus
                    : "border-gray-200 bg-gray-50 hover:bg-white hover:border-gray-300"
                }`} />
              <button onClick={handleNaturalSearch}
                disabled={!naturalQuery.trim() || searchMutation.isPending}
                className={`px-4 py-2 ${a.btn} rounded-xl text-sm font-bold transition-all disabled:opacity-50 self-end shadow-sm flex items-center gap-1.5`}>
                {searchMutation.isPending ? (
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                    </svg>
                    Search
                  </>
                )}
              </button>
            </div>

            {/* Extracted entities */}
            {smartResults?.entities_extracted && (
              <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs space-y-2">
                <p className="font-bold text-gray-600 flex items-center gap-1.5">
                  <span>🧠</span> AI extracted
                </p>
                {smartResults.entities_extracted.symptoms?.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-gray-400 font-medium">Symptoms:</span>
                    {smartResults.entities_extracted.symptoms.map((s) => (
                      <span key={s} className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-semibold capitalize">{s}</span>
                    ))}
                  </div>
                )}
                {smartResults.entities_extracted.indications?.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-gray-400 font-medium">Conditions:</span>
                    {smartResults.entities_extracted.indications.map((i) => (
                      <span key={i} className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold capitalize">{i}</span>
                    ))}
                  </div>
                )}
                <p className="text-gray-400">{smartResults.total_results} drug{smartResults.total_results !== 1 ? "s" : ""} found</p>
              </div>
            )}

            {searchMutation.isError && (
              <p className="text-xs text-red-500">Search failed. Please try again.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
