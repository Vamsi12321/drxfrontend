"use client";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";

const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", href: "/admin/dashboard", icon: "grid" },
  { id: "organizations", label: "Organizations", href: "/admin/organizations", icon: "building" },
  { id: "doctors", label: "Doctors", href: "/admin/doctors", icon: "users" },
  { id: "links", label: "Doctor-Org Links", href: "/admin/doctor-org-links", icon: "link" },
  { id: "requests", label: "Requests", href: "/admin/requests", icon: "inbox" },
  { id: "doctor-activity", label: "Doctor Activity", href: "/admin/doctor-activity", icon: "activity" },
  { id: "integrations", label: "Integrations", href: "/admin/integrations", icon: "plug" },
  { id: "onboarding", label: "Onboarding", href: "/admin/onboarding", icon: "upload" },
  { id: "logs", label: "Platform Logs", href: "/admin/logs", icon: "clock" },
];

const icons = {
  grid: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>,
  building: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>,
  users: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>,
  link: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>,
  inbox: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>,
  clock: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  activity: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
  plug: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>,
  upload: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>,
};

export default function AdminLayout({ children }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // No sidebar/layout for login page
  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  // Close mobile menu on route change
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  const getActiveId = () => {
    if (pathname.includes("/organizations")) return "organizations";
    if (pathname.includes("/doctors") && !pathname.includes("/doctor-org") && !pathname.includes("/doctor-activity")) return "doctors";
    if (pathname.includes("/doctor-org-links")) return "links";
    if (pathname.includes("/doctor-activity")) return "doctor-activity";
    if (pathname.includes("/integrations")) return "integrations";
    if (pathname.includes("/onboarding")) return "onboarding";
    if (pathname.includes("/requests")) return "requests";
    if (pathname.includes("/logs")) return "logs";
    return "dashboard";
  };
  const activeId = getActiveId();
  const sidebarW = collapsed ? "w-[68px]" : "w-[240px]";
  const mainML = collapsed ? "lg:ml-[68px]" : "lg:ml-[240px]";

  return (
    <div className="min-h-screen bg-[#f5f6fa]">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 h-full bg-white border-r border-gray-100 flex flex-col z-50 transition-all duration-200 ${sidebarW} ${mobileOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}>
        {/* Logo */}
        <div className={`${collapsed ? "px-3" : "px-5"} pt-5 pb-4 border-b border-gray-100`}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-sm">DRX</span>
            </div>
            {!collapsed && (
              <div>
                <p className="font-bold text-sm" style={{ color: "#3b3a8a" }}>DRX Admin</p>
                <p className="text-[10px] text-gray-400">Platform Management</p>
              </div>
            )}
          </div>
        </div>

        {/* Nav */}
        <nav className={`flex-1 ${collapsed ? "px-2" : "px-3"} py-4 space-y-1 overflow-y-auto`}>
          {NAV_ITEMS.map((item) => {
            const isActive = item.id === activeId;
            return (
              <Link key={item.id} href={item.href} title={collapsed ? item.label : ""}>
                <div className={`flex items-center ${collapsed ? "justify-center" : ""} gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive ? "bg-purple-600 text-white shadow-md" : "text-gray-600 hover:bg-gray-50"
                }`}>
                  <span className={`flex-shrink-0 ${isActive ? "text-white" : "text-gray-400"}`}>{icons[item.icon]}</span>
                  {!collapsed && <span className="whitespace-nowrap">{item.label}</span>}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Collapse button */}
        <div className={`${collapsed ? "px-2" : "px-3"} py-2 border-t border-gray-100`}>
          <button onClick={() => setCollapsed(!collapsed)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-gray-500 hover:bg-gray-50 transition-all">
            <svg className={`w-4 h-4 transition-transform ${collapsed ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
            {!collapsed && <span>Collapse</span>}
          </button>
        </div>

        {/* Bottom user + logout */}
        <div className={`${collapsed ? "px-2" : "px-4"} py-4 border-t border-gray-100 space-y-3`}>
          <div className={`flex items-center ${collapsed ? "justify-center" : "gap-3"}`}>
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">SA</div>
            {!collapsed && (
              <div>
                <p className="text-xs font-semibold text-gray-800">Super Admin</p>
                <p className="text-[10px] text-gray-400">admin@drx.health</p>
              </div>
            )}
          </div>
          <button onClick={() => { localStorage.removeItem("access_token"); localStorage.removeItem("drx_admin_token"); localStorage.removeItem("drx_admin_name"); localStorage.removeItem("userRole"); document.cookie = "access_token=; path=/; max-age=0"; document.cookie = "userRole=; path=/; max-age=0"; window.location.href = "/drx/admin/login"; }}
            className={`w-full flex items-center ${collapsed ? "justify-center" : ""} gap-2 px-3 py-2 rounded-xl text-xs font-medium text-red-500 hover:bg-red-50 transition-all`}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className={`${mainML} transition-all duration-200 min-h-screen`}>
        {/* Mobile header */}
        <div className="lg:hidden sticky top-0 z-30 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
          <button onClick={() => setMobileOpen(true)} className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100">
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-purple-600 rounded flex items-center justify-center">
              <span className="text-white font-bold text-[9px]">DRX</span>
            </div>
            <span className="text-sm font-bold" style={{ color: "#3b3a8a" }}>Admin</span>
          </div>
        </div>

        <div className="p-4 md:p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
