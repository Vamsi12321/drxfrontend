"use client";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useState, createContext, useContext } from "react";
import { Icons } from "@/components/network/Icons";
import Image from "next/image";

// ── Network Toast Context ─────────────────────────────────────────────────────
export const NetworkToastContext = createContext({ showToast: () => {} });
export const useNetworkToast = () => useContext(NetworkToastContext);

function NetworkToast({ toasts }) {
  return (
    <div className="fixed top-5 right-5 z-[200] space-y-2 pointer-events-none">
      {toasts.map((t) => (
        <div key={t.id} className={`flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg border text-sm font-semibold animate-[fadeSlide_0.3s_ease-out] pointer-events-auto ${
          t.type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-800" :
          t.type === "error"   ? "bg-red-50 border-red-200 text-red-800" :
          "bg-blue-50 border-blue-200 text-blue-800"
        }`}>
          <span>{t.type === "success" ? "✅" : t.type === "error" ? "❌" : "ℹ️"}</span>
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
}

const tabs = [
  { href: "/doctor/network/feed",       label: "Feed",       icon: Icons.feed },
  { href: "/doctor/network/my-posts",   label: "My Posts",   icon: Icons.myPosts },
  { href: "/doctor/network/my-network", label: "My Network", icon: Icons.network },
  { href: "/doctor/network/messages",   label: "Messages",   icon: Icons.messages },
  { href: "/doctor/network/discover",   label: "Discover",   icon: Icons.discover },
  { href: "/doctor/network/groups",     label: "Groups",     icon: Icons.groups },
];

export default function DoctorNetworkLayout({ children }) {
  const pathname = usePathname();
  const [toasts, setToasts] = useState([]);

  const showToast = (message, type = "success") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
  };

  return (
    <NetworkToastContext.Provider value={{ showToast }}>
      <div className="space-y-5 min-w-0 overflow-x-hidden">

        {/* Hero Banner */}
        <div className="rounded-2xl overflow-hidden relative" style={{ background: "linear-gradient(90deg, #2E23B5 0%, #3B2CC9 35%, #4B39E6 70%, #5B4CFF 100%)" }}>
          {/* Decorative elements */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <span className="absolute top-4 left-8 text-white/20 text-xl font-bold">+</span>
            <span className="absolute top-12 left-20 text-white/15 text-sm font-bold">+</span>
            <span className="absolute bottom-6 left-16 text-white/20 text-lg font-bold">+</span>
            <span className="absolute top-6 right-64 text-white/15 text-sm font-bold hidden md:block">+</span>
            <span className="absolute bottom-4 right-48 text-white/20 text-base font-bold hidden md:block">+</span>
            {/* Chat bubbles */}
            <div className="absolute top-3 left-32 w-8 h-5 bg-white/10 rounded-full hidden sm:block" />
            <div className="absolute bottom-8 right-72 w-6 h-4 bg-white/10 rounded-full hidden md:block" />
          </div>

          <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between px-4 sm:px-8 py-4 sm:py-6 gap-3">
            {/* Left text */}
            <div>
              <h1 className="text-lg sm:text-2xl font-bold text-white mb-0.5 sm:mb-1">Doctor Network</h1>
              <p className="text-[11px] sm:text-sm" style={{ color: "#DAD8FF" }}>A community to connect, share insights and grow together.</p>
            </div>

            {/* Center illustration */}
            <div className="hidden lg:block w-64 h-40 relative self-end -mb-12 mr-[-100px]">
              <Image src="/images/doctors/dr_network.png" alt="Doctor Network" fill className="object-contain object-bottom" />
            </div>

            {/* Right — Discover button */}
            <div className="flex items-center">
              <Link href="/doctor/network/discover"
                className="hidden sm:flex items-center gap-2 px-5 py-2.5 bg-white rounded-lg font-semibold text-sm hover:bg-gray-50 transition-all" style={{ color: "#4A3AFF" }}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                Discover Doctors
              </Link>
            </div>
          </div>
        </div>

        {/* Tab bar */}
        <div className="border-b border-gray-200 -mx-3 sm:mx-0">
          <div className="flex items-center gap-0.5 sm:gap-1 overflow-x-auto px-1 scrollbar-hide">
            {tabs.map((tab) => {
              const active = pathname === tab.href;
              return (
                <Link key={tab.href} href={tab.href}
                  className={`flex items-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-2 sm:py-3 border-b-2 font-medium transition-all whitespace-nowrap text-sm ${
                    active
                      ? "border-purple-600 text-purple-600"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}>
                  <tab.icon />
                  <span className="hidden sm:inline">{tab.label}</span>
                </Link>
              );
            })}
          </div>
        </div>

        {children}
      </div>
      <NetworkToast toasts={toasts} />
    </NetworkToastContext.Provider>
  );
}
