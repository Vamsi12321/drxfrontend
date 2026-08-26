"use client";
import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { get } from "@/lib/api";

export default function LogsPage() {
  const [lines, setLines] = useState(100);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(false);
  const logContainerRef = useRef(null);

  const params = new URLSearchParams();
  params.set("lines", lines);
  if (search) params.set("search", search);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["server-logs", lines, search],
    queryFn: async () => {
      const token = typeof window !== "undefined" ? localStorage.getItem("access_token") || "" : "";
      const res = await fetch(`/drx/api/v1/logs?${params.toString()}`, {
        credentials: "include",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        // Try to parse as JSON error, fallback to text
        const text = await res.text();
        let msg = "Failed to fetch logs";
        try { const j = JSON.parse(text); msg = j.detail || msg; } catch {}
        throw new Error(msg);
      }
      const text = await res.text();
      // If it was wrapped in JSON by proxy, unwrap it
      try {
        const j = JSON.parse(text);
        if (typeof j === "string") return j;
        if (j.detail && typeof j.detail === "string") return j.detail;
        return JSON.stringify(j, null, 2);
      } catch {
        return text;
      }
    },
    staleTime: autoRefresh ? 5000 : 30000,
    refetchInterval: autoRefresh ? 10000 : false,
  });

  const logLines = data ? data.split("\n") : [];

  const handleSearch = (e) => {
    e.preventDefault();
    setSearch(searchInput);
  };

  const scrollToBottom = () => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  };

  const getLineColor = (line) => {
    const lower = line.toLowerCase();
    if (lower.includes("error") || lower.includes("exception") || lower.includes("traceback")) return "text-red-400";
    if (lower.includes("warning") || lower.includes("warn")) return "text-yellow-400";
    if (lower.includes("info")) return "text-blue-300";
    if (lower.includes("debug")) return "text-gray-500";
    return "text-gray-300";
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold" style={{ color: "#3b3a8a" }}>Server Logs</h1>
          <p className="text-gray-500 text-xs sm:text-sm mt-0.5">Live DRX backend server logs for debugging</p>
        </div>
        <div className="flex items-center gap-2">
          {isFetching && (
            <svg className="animate-spin w-4 h-4 text-purple-500" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
          )}
          <button onClick={() => refetch()}
            className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-all flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            Refresh
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Lines selector */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-gray-500">Lines:</label>
          <select value={lines} onChange={(e) => setLines(Number(e.target.value))}
            className="px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-purple-200 bg-white">
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={200}>200</option>
            <option value={500}>500</option>
            <option value={1000}>1000</option>
            <option value={2000}>2000</option>
            <option value={5000}>5000</option>
          </select>
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="flex items-center gap-1.5 flex-1 min-w-[200px] max-w-[400px]">
          <div className="relative flex-1">
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input type="text" value={searchInput} onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Filter logs (e.g. ERROR, auto-link)" className="w-full pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-purple-200" />
          </div>
          <button type="submit" className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold transition-all">
            Search
          </button>
          {search && (
            <button type="button" onClick={() => { setSearch(""); setSearchInput(""); }}
              className="px-2 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-500 hover:bg-gray-50">
              Clear
            </button>
          )}
        </form>

        {/* Auto-refresh toggle */}
        <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer ml-auto">
          <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)}
            className="w-3.5 h-3.5 rounded border-gray-300 text-purple-600" />
          Auto-refresh (10s)
        </label>

        {/* Scroll to bottom */}
        <button onClick={scrollToBottom}
          className="px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-500 hover:bg-gray-50 transition-all flex items-center gap-1">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
          Bottom
        </button>
      </div>

      {/* Active filter badge */}
      {search && (
        <div className="flex items-center gap-2">
          <span className="text-[10px] bg-purple-50 text-purple-600 border border-purple-100 px-2.5 py-1 rounded-full font-semibold">
            Filtering: &quot;{search}&quot;
          </span>
          <span className="text-[10px] text-gray-400">{logLines.length} matching lines</span>
        </div>
      )}

      {/* Log output */}
      {isLoading ? (
        <div className="bg-gray-900 rounded-xl p-6 animate-pulse">
          <div className="space-y-2">
            {[1,2,3,4,5,6,7,8].map((i) => (
              <div key={i} className="h-4 bg-gray-800 rounded w-full" style={{ width: `${60 + Math.random() * 40}%` }} />
            ))}
          </div>
        </div>
      ) : (
        <div ref={logContainerRef}
          className="bg-gray-900 rounded-xl border border-gray-800 overflow-auto max-h-[calc(100vh-320px)] min-h-[400px]">
          {/* Header bar */}
          <div className="sticky top-0 bg-gray-800/90 backdrop-blur-sm border-b border-gray-700 px-4 py-2 flex items-center justify-between z-10">
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
              </div>
              <span className="text-[10px] text-gray-400 font-mono ml-2">drx-server.log</span>
            </div>
            <span className="text-[10px] text-gray-500">{logLines.length} lines</span>
          </div>

          {/* Log lines */}
          <div className="p-4 font-mono text-[11px] leading-5">
            {logLines.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No log entries found{search ? ` matching "${search}"` : ""}.</p>
            ) : (
              logLines.map((line, i) => (
                <div key={i} className={`hover:bg-gray-800/50 px-1 -mx-1 rounded ${getLineColor(line)}`}>
                  <span className="text-gray-600 select-none mr-3">{String(i + 1).padStart(4, " ")}</span>
                  {line}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
