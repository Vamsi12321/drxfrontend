"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { logout } from "@/lib/auth";
import NotificationBell from "@/components/NotificationBell";

const PAGE_TITLES = {
  "/doctor/home":        { title: "Home",        icon: "🏠", sub: "Your dashboard" },
  "/doctor/drug-search": { title: "Drug Search",  icon: "🔍", sub: "Search & analyze drugs" },
  "/doctor/cme-events":  { title: "CME Events",   icon: "🎓", sub: "Continuing Medical Education" },
  "/doctor/network":     { title: "Network",      icon: "🤝", sub: "Connect with peers" },
  "/doctor/profile":     { title: "Profile",      icon: "👤", sub: "Your account" },
};

export default function DoctorNavbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { name: "Home",        path: "/doctor/home",        icon: "🏠" },
    { name: "Drug Search", path: "/doctor/drug-search", icon: "🔍" },
    { name: "CME Events",  path: "/doctor/cme-events",  icon: "📅" },
    { name: "Network",     path: "/doctor/network",     icon: "🤝" },
    { name: "Profile",     path: "/doctor/profile",     icon: "👤" },
  ];

  const handleLogout = () => {
    setIsLoggingOut(true);
    setTimeout(() => logout(router), 1000);
  };

  return (
    <>
      {isLoggingOut && (
        <div className="fixed inset-0 bg-gradient-to-br from-red-500 via-pink-500 to-purple-600 z-[9999] flex items-center justify-center animate-fadeIn">
          <div className="text-center">
            <div className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center shadow-2xl mb-6 mx-auto animate-bounce">
              <span className="text-6xl">👋</span>
            </div>
            <h2 className="text-3xl font-bold text-white mb-2">Logging you out...</h2>
          </div>
        </div>
      )}

      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14">

            {/* Logo — compact */}
            <Link href="/doctor/home" className="flex items-center gap-2 group shrink-0">
              <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center transform group-hover:scale-110 transition-transform shadow">
                <span className="text-base">💊</span>
              </div>
              <div className="leading-tight hidden sm:block">
                <span className="text-sm font-bold text-gray-900 block">MedRepAI</span>
                <span className="text-xs text-indigo-500 -mt-0.5 block">Doctor Portal</span>
              </div>
            </Link>

            {/* Desktop nav */}
            <div className="hidden lg:flex items-center gap-0.5">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
                    pathname === item.path
                      ? "bg-indigo-600 text-white shadow"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  <span>{item.icon}</span>
                  <span>{item.name}</span>
                </Link>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <NotificationBell accentColor="indigo" />
              <button
                onClick={handleLogout}
                className="hidden lg:flex items-center justify-center w-9 h-9 text-red-500 hover:bg-red-50 rounded-lg transition-all"
                title="Logout"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
              </button>

              {/* Mobile hamburger */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="lg:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {isMobileMenuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {isMobileMenuOpen && (
            <div className="lg:hidden py-3 border-t border-gray-100">
              <div className="grid grid-cols-2 gap-1.5">
                {navItems.map((item) => (
                  <Link
                    key={item.path}
                    href={item.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                      pathname === item.path
                        ? "bg-indigo-600 text-white shadow"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <span>{item.icon}</span>
                    <span>{item.name}</span>
                  </Link>
                ))}
                <button
                  onClick={handleLogout}
                  className="col-span-2 text-left px-3 py-2.5 text-red-600 hover:bg-red-50 rounded-xl text-sm font-semibold transition-all flex items-center gap-2"
                >
                  <span>🚪</span>
                  <span>Logout</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Page title bar */}
      {PAGE_TITLES[pathname] && (
        <div className="bg-white border-b border-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex items-center gap-2">
            <span className="text-sm">{PAGE_TITLES[pathname].icon}</span>
            <span className="text-sm font-bold text-gray-800">{PAGE_TITLES[pathname].title}</span>
            <span className="text-gray-400 text-xs hidden sm:inline">· {PAGE_TITLES[pathname].sub}</span>
          </div>
        </div>
      )}
    </>
  );
}
