"use client";
import { useState, useRef } from "react";

const AI_BASE = "/api/v1";

const ACCEPTED = ".pdf,.jpg,.jpeg,.png,.webp";
const isPDF = (f) => f?.name.toLowerCase().endsWith(".pdf");
const isImage = (f) => /\.(jpg|jpeg|png|webp)$/i.test(f?.name || "");
const getMime = (f) => {
  const ext = f.name.toLowerCase().split(".").pop();
  return { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp" }[ext] || "image/jpeg";
};

// Split text into bullet points — handles comma, semicolon, newline separated lists
const toBullets = (val) => {
  if (!val) return [];
  // Already an array — clean and return
  if (Array.isArray(val)) return val.map((s) => String(s).trim()).filter((s) => s.length > 2);
  // String fallback — split on common separators
  return String(val)
    .split(/[\n•]+|(?<=[a-z])[,;](?=[A-Z])|(?<=[a-z\.])(?=[A-Z])/)
    .map((s) => s.trim())
    .filter((s) => s.length > 2);
};

const SECTIONS = [
  {
    key: "key_findings",
    label: "Key Findings",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
    bg: "bg-indigo-50", border: "border-indigo-200", label_color: "text-indigo-700", icon_bg: "bg-indigo-100 text-indigo-600",
  },
  {
    key: "diagnosis",
    label: "Diagnosis",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    bg: "bg-blue-50", border: "border-blue-200", label_color: "text-blue-700", icon_bg: "bg-blue-100 text-blue-600",
  },
  {
    key: "medications",
    label: "Medications",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
      </svg>
    ),
    bg: "bg-green-50", border: "border-green-200", label_color: "text-green-700", icon_bg: "bg-green-100 text-green-600",
  },
  {
    key: "important_notes",
    label: "Important Notes",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    bg: "bg-amber-50", border: "border-amber-200", label_color: "text-amber-700", icon_bg: "bg-amber-100 text-amber-600",
  },
];

export default function PDFSummaryModal({ onClose, accentColor = "indigo" }) {
  const [file, setFile]         = useState(null);   // for PDF
  const [images, setImages]     = useState([]);      // for images (max 2)
  const [loading, setLoading]   = useState(false);
  const [result, setResult]     = useState(null);
  const [error, setError]       = useState("");
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef(null);

  const allFiles = file ? [file] : images;
  const hasFiles = file || images.length > 0;

  const handleFile = (files) => {
    const arr = Array.from(files || []);
    if (arr.length === 0) return;
    setError(""); setResult(null);

    // Check if PDF
    if (arr.length === 1 && isPDF(arr[0])) {
      if (arr[0].size > 10 * 1024 * 1024) { setError("PDF too large. Max 10MB."); return; }
      setFile(arr[0]); setImages([]);
      return;
    }

    // Images
    const imgFiles = arr.filter(isImage);
    if (imgFiles.length === 0) { setError("Only PDF, JPG, PNG or WEBP files are supported."); return; }
    if (imgFiles.length > 2)   { setError("Maximum 2 images allowed."); return; }
    const oversized = imgFiles.find((f) => f.size > 5 * 1024 * 1024);
    if (oversized) { setError(`${oversized.name} is too large. Max 5MB per image.`); return; }
    setImages(imgFiles); setFile(null);
  };

  const handleDrop = (e) => {
    e.preventDefault(); setDragging(false);
    handleFile(e.dataTransfer.files);
  };

  const handleUpload = async () => {
    if (!hasFiles) return;
    setLoading(true); setError(""); setResult(null);
    try {
      const fd = new FormData();
      let url, resKey;

      if (file) {
        fd.append("file", file);
        url = `${AI_BASE}/ai/summarize-pdf`;
        resKey = "filename";
      } else {
        images.forEach((img) => fd.append("files", img));
        url = `${AI_BASE}/ai/summarize-images`;
        resKey = "filenames";
      }

      const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
      const res = await fetch(url, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Analysis failed");
      setResult(data);
    } catch (e) {
      setError(e.message || "Failed. Make sure the AI server is running.");
    }
    setLoading(false);
  };

  const reset = () => { setFile(null); setImages([]); setResult(null); setError(""); };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full sm:w-[440px] bg-white z-50 flex flex-col shadow-2xl"
        style={{ animation: "slideInRight 0.3s cubic-bezier(0.16,1,0.3,1)" }}>

        {/* Header */}
        <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 px-6 pt-6 pb-8 flex-shrink-0">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h2 className="text-white font-bold text-lg leading-tight">AI Report Analyzer</h2>
                <p className="text-white/60 text-xs mt-0.5">Powered by LLaMA 3 · Groq</p>
              </div>
            </div>
            <button onClick={onClose}
              className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-xl flex items-center justify-center text-white transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto -mt-4">
          <div className="bg-white rounded-t-3xl min-h-full px-6 pt-6 pb-8 space-y-5">

            {!result ? (
              <>
                {/* Drop zone */}
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-7 text-center cursor-pointer transition-all duration-200 ${
                    dragging  ? "border-indigo-400 bg-indigo-50 scale-[1.01]" :
                    file      ? "border-green-400 bg-green-50" :
                    "border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/40"
                  }`}>
                  <input ref={fileRef} type="file" accept={ACCEPTED} multiple className="hidden"
                    onChange={(e) => handleFile(e.target.files)} />

                  {hasFiles ? (
                    <div className="space-y-3">
                      <div className="w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center mx-auto">
                        <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div className="space-y-1">
                        {(file ? [file] : images).map((f, i) => (
                          <p key={i} className="font-semibold text-gray-800 text-xs truncate px-4">{f.name} <span className="text-gray-400">({(f.size/1024).toFixed(0)}KB)</span></p>
                        ))}
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); reset(); }}
                        className="text-xs text-red-400 hover:text-red-600 font-semibold transition-colors">
                        Remove
                      </button>
                    </div>
                  ) : dragging ? (
                    <div className="space-y-3">
                      <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto" style={{ animation: "bounceUp 0.6s ease-in-out infinite alternate" }}>
                        <svg className="w-8 h-8 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                      </div>
                      <p className="font-bold text-indigo-600 text-sm">Release to upload</p>
                      <p className="text-xs text-indigo-400">Drop your file here</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="w-14 h-14 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-2xl flex items-center justify-center mx-auto">
                        <svg className="w-7 h-7 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-700 text-sm">Drop files here or <span className="text-indigo-600">browse</span></p>
                        <p className="text-xs text-gray-400 mt-1">PDF max 10MB · Images max 5MB each · Up to 2 images</p>
                      </div>
                      {/* File type pills */}
                      <div className="flex items-center justify-center gap-2 flex-wrap">
                        {[
                          { label: "PDF", bg: "bg-red-50", text: "text-red-600", border: "border-red-200" },
                          { label: "JPG", bg: "bg-amber-50", text: "text-amber-600", border: "border-amber-200" },
                          { label: "PNG", bg: "bg-blue-50", text: "text-blue-600", border: "border-blue-200" },
                          { label: "WEBP", bg: "bg-green-50", text: "text-green-600", border: "border-green-200" },
                        ].map(({ label, bg, text, border }) => (
                          <span key={label} className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${bg} ${text} ${border}`}>
                            {label}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-start gap-2">
                    <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {error}
                  </div>
                )}

                <button onClick={handleUpload} disabled={!hasFiles || loading}
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white py-3.5 rounded-2xl font-bold text-sm transition-all shadow-lg shadow-indigo-200 disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2.5">
                  {loading ? (
                    <>
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Analyzing with AI...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      Analyze Report
                    </>
                  )}
                </button>

                {/* Info */}
                <div className="rounded-2xl overflow-hidden border border-indigo-100 shadow-sm">
                  {/* Gradient header */}
                  <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-3 flex items-center gap-2.5">
                    <div className="w-7 h-7 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                    </div>
                    <p className="text-white font-bold text-sm">What AI extracts</p>
                  </div>
                  {/* Category pills grid */}
                  <div className="bg-gradient-to-br from-indigo-50 to-purple-50 px-4 py-4 grid grid-cols-2 gap-2.5">
                    {[
                      { label: "Key Findings", icon: "🔍", bg: "bg-indigo-100", text: "text-indigo-700", border: "border-indigo-200" },
                      { label: "Diagnosis",    icon: "🩺", bg: "bg-blue-100",   text: "text-blue-700",   border: "border-blue-200" },
                      { label: "Medications",  icon: "💊", bg: "bg-green-100",  text: "text-green-700",  border: "border-green-200" },
                      { label: "Imp. Notes",   icon: "⚠️", bg: "bg-amber-100",  text: "text-amber-700",  border: "border-amber-200" },
                    ].map(({ label, icon, bg, text, border }) => (
                      <div key={label} className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${bg} ${border}`}>
                        <span className="text-sm leading-none">{icon}</span>
                        <span className={`text-xs font-semibold ${text}`}>{label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              /* Results */
              <>
                {/* File info bar */}
                <div className="flex items-center justify-between bg-gray-50 rounded-2xl px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-red-600" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 1.5L18.5 9H13V3.5zM6 20V4h5v7h7v9H6z"/>
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-800 text-xs truncate">
                        {result.filename || (result.filenames || []).join(", ")}
                      </p>
                      <p className="text-xs text-gray-400">
                        {result.char_count ? `${result.char_count.toLocaleString()} chars` : `${result.image_count} image${result.image_count > 1 ? "s" : ""}`} analyzed
                      </p>
                    </div>
                  </div>
                  <button onClick={reset}
                    className="text-xs text-indigo-600 hover:text-indigo-700 font-bold border border-indigo-200 px-3 py-1.5 rounded-xl hover:bg-indigo-50 transition-colors flex-shrink-0 ml-2">
                    New
                  </button>
                </div>

                {/* AI Disclaimer */}
                <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                  <svg className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <p className="text-xs text-amber-700 leading-relaxed">
                    <span className="font-bold">AI-generated summary.</span> This analysis is for reference only and may not be fully accurate. Always verify with the original document and consult a qualified medical professional before making clinical decisions.
                  </p>
                </div>

                {/* Summary sections */}
                {result.summary?.raw_summary ? (
                  <div className="bg-gray-50 rounded-2xl p-5 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {result.summary.raw_summary}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Overview summary */}
                    {result.summary?.summary && (
                      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 rounded-2xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-7 h-7 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <p className="font-bold text-sm text-indigo-700">Overview</p>
                        </div>
                        <p className="text-sm text-gray-700 leading-relaxed">{result.summary.summary}</p>
                      </div>
                    )}
                    {SECTIONS.map(({ key, label, icon, bg, border, label_color, icon_bg }) => {
                      const val = result.summary?.[key];
                      if (!val || (Array.isArray(val) && val.length === 0)) return null;
                      const bullets = toBullets(val);
                      if (bullets.length === 0) return null;
                      return (
                        <div key={key} className={`${bg} border ${border} rounded-2xl p-4`}>
                          <div className="flex items-center gap-2 mb-3">
                            <div className={`w-7 h-7 ${icon_bg} rounded-lg flex items-center justify-center flex-shrink-0`}>
                              {icon}
                            </div>
                            <p className={`font-bold text-sm ${label_color}`}>{label}</p>
                          </div>
                          {bullets.length > 1 ? (
                            <ul className="space-y-1.5">
                              {bullets.map((b, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                                  <span className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${label_color.replace("text-", "bg-")}`} />
                                  {b}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-sm text-gray-700 leading-relaxed">{val}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to   { transform: translateX(0); }
        }
        @keyframes bounceUp {
          from { transform: translateY(0px); }
          to   { transform: translateY(-6px); }
        }
      `}</style>
    </>
  );
}
