"use client";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { logout } from "@/lib/auth";
import { get } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";

const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", href: "/doctor/home" },
  { id: "drug-search", label: "Drug Search", href: "/doctor/drug-search" },
  { id: "virtual-mr", label: "Virtual MR", href: "/doctor/virtual-mr" },
  { id: "cme", label: "CME Events", href: "/doctor/cme-events" },
  { id: "network", label: "Doctor Network", href: "/doctor/network/feed" },
  { id: "divider1" },
  { id: "activity", label: "My Activity", href: "/doctor/my-activity" },
  { id: "saved", label: "Bookmarks", href: "/doctor/favourites" },
  { id: "notifications", label: "Notifications", href: "/doctor/notifications" },
  { id: "profile", label: "Profile", href: "/doctor/profile" },
  { id: "divider2" },
];

const NavIcon = ({ id, active }) => {
  const color = active ? "#ffffff" : "#6b7280";
  const icons = {
    dashboard: <svg width="20" height="20" fill={color} viewBox="0 0 24 24"><path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/></svg>,
    "drug-search": <svg width="20" height="20" fill={color} viewBox="0 0 24 24"><path d="M19.5 12c0 .23-.01.45-.03.68l1.86 1.46c.17.13.21.37.1.55l-1.76 3.05c-.11.19-.35.26-.54.19l-2.19-.88c-.36.28-.76.51-1.18.7l-.33 2.33c-.03.21-.2.37-.42.37h-3.53c-.21 0-.39-.16-.42-.37l-.33-2.33c-.42-.19-.82-.43-1.18-.7l-2.19.88c-.19.08-.43 0-.54-.19L5.08 14.7c-.11-.19-.07-.42.1-.55l1.86-1.46c-.02-.23-.03-.45-.03-.68s.01-.45.03-.68L5.18 9.84c-.17-.13-.21-.37-.1-.55l1.76-3.05c.11-.19.35-.26.54-.19l2.19.88c.36-.28.76-.51 1.18-.7l.33-2.33c.03-.21.2-.37.42-.37h3.53c.21 0 .39.16.42.37l.33 2.33c.42.19.82.43 1.18.7l2.19-.88c.19-.08.43 0 .54.19l1.76 3.05c.11.19.07.42-.1.55l-1.86 1.46c.02.23.03.45.03.68zM12 15.5c1.93 0 3.5-1.57 3.5-3.5s-1.57-3.5-3.5-3.5-3.5 1.57-3.5 3.5 1.57 3.5 3.5 3.5z"/></svg>,
    "virtual-mr": <svg width="20" height="20" fill={color} viewBox="0 0 24 24"><path d="M20 9V7c0-1.1-.9-2-2-2h-3c0-1.66-1.34-3-3-3S9 3.34 9 5H6c-1.1 0-2 .9-2 2v2c-1.66 0-3 1.34-3 3s1.34 3 3 3v4c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-4c1.66 0 3-1.34 3-3s-1.34-3-3-3zM7.5 11.5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5S9.83 13 9 13s-1.5-.67-1.5-1.5zM16 17H8v-2h8v2zm-1-4c-.83 0-1.5-.67-1.5-1.5S14.17 10 15 10s1.5.67 1.5 1.5S15.83 13 15 13z"/></svg>,
    cme: <svg width="20" height="20" fill={color} viewBox="0 0 24 24"><path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM9 10H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2z"/></svg>,
    activity: <svg width="20" height="20" fill={color} viewBox="0 0 24 24"><path d="M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z"/></svg>,
    saved: <svg width="20" height="20" fill={color} viewBox="0 0 24 24"><path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z"/></svg>,
    notifications: <svg width="20" height="20" fill={color} viewBox="0 0 24 24"><path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/></svg>,
    profile: <svg width="20" height="20" fill={color} viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>,
    help: <svg width="20" height="20" fill={color} viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z"/></svg>,
    network: <svg width="20" height="20" fill={color} viewBox="0 0 24 24"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>,
  };
  return icons[id] || null;
};

export default function DoctorLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const [userName, setUserName] = useState("Doctor");
  const [companyName, setCompanyName] = useState("");
  const [showOrgDropdown, setShowOrgDropdown] = useState(false);
  const [orgLoading, setOrgLoading] = useState(false);
  const [loadingOrgName, setLoadingOrgName] = useState("");
  const [myOrgs, setMyOrgs] = useState([]);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState("");
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [navigating, setNavigating] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    setUserName(localStorage.getItem("userName") || "Doctor");
    setCompanyName(localStorage.getItem("companyName") || "");
  }, [pathname]);

  // Fetch unread notification count
  useEffect(() => {
    if (pathname === "/doctor/select-org") return;
    const token = localStorage.getItem("access_token");
    if (!token) return;
    get("/api/v1/dashboard/me")
      .then((data) => {
        setUnreadCount(data?.activity_summary?.unread_notifications || 0);
      })
      .catch(() => {});
  }, [pathname]);

  // Fetch real orgs for dropdown
  useEffect(() => {
    if (pathname === "/doctor/select-org") return;
    if (myOrgs.length > 0) return;
    const token = localStorage.getItem("access_token");
    if (!token) return;
    fetch("/api/v1/my-organizations", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data?.organizations) setMyOrgs(data.organizations); })
      .catch(() => {});
  }, [pathname, myOrgs.length]);

  // Close mobile menu on route change
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  const getActiveId = () => {
    if (pathname.includes("/drug-search") || pathname.includes("/drug-details")) return "drug-search";
    if (pathname.includes("/virtual-mr")) return "virtual-mr";
    if (pathname.includes("/cme-events")) return "cme";
    if (pathname.includes("/network")) return "network";
    if (pathname.includes("/my-activity")) return "activity";
    if (pathname.includes("/favourites")) return "saved";
    if (pathname.includes("/notifications")) return "notifications";
    if (pathname.includes("/profile")) return "profile";
    return "dashboard";
  };
  const activeId = getActiveId();
  const sidebarW = collapsed ? "w-[60px]" : "w-[200px]";
  const marginL = collapsed ? "lg:ml-[60px]" : "lg:ml-[200px]";

  // Hide sidebar/topbar on select-org page
  if (pathname === "/doctor/select-org") {
    return <>{children}</>;
  }

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className="px-3 pt-5 pb-4 flex items-center justify-center">
        <Link href="/doctor/home" className="flex items-center justify-center overflow-hidden">
          <img src="/images/doctors/drx_icon.png" alt="DRX" className={`${collapsed && !mobileOpen ? "h-7" : "h-10"} object-contain transition-all`} />
        </Link>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-2 py-1 space-y-0.5 overflow-hidden">
        {NAV_ITEMS.map((item) => {
          if (item.id.startsWith("divider")) {
            return <div key={item.id} className="my-2.5 border-t border-gray-100" />;
          }
          const isActive = item.id === activeId;
          return (
            <Link key={item.id} href={item.href} title={collapsed && !mobileOpen ? item.label : ""}>
              <div className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${isActive ? "bg-[#5b2bce] text-white" : "text-gray-600 hover:bg-gray-50"}`}>
                <span className="flex-shrink-0"><NavIcon id={item.id} active={isActive} /></span>
                {(!collapsed || mobileOpen) && <span className="whitespace-nowrap">{item.label}</span>}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Logout + Collapse */}
      <div className="px-2 pb-3 pt-1 border-t border-gray-100">
        <button onClick={() => logout(router)} title={collapsed ? "Logout" : ""} className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 w-full transition-all">
          <svg width="20" height="20" fill="#6b7280" viewBox="0 0 24 24" className="flex-shrink-0"><path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/></svg>
          {(!collapsed || mobileOpen) && <span>Logout</span>}
        </button>
        {/* Collapse — only on desktop */}
        <button onClick={() => setCollapsed(!collapsed)} title={collapsed ? "Expand" : "Collapse"} className="hidden lg:flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-400 hover:bg-gray-100 hover:text-gray-600 w-full transition-all mt-0.5">
          {collapsed ? (
            <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24" className="flex-shrink-0"><path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41zM15.59 16.59L20.17 12l-4.58-4.59L17 6l6 6-6 6-1.41-1.41z"/></svg>
          ) : (
            <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24" className="flex-shrink-0"><path d="M15.41 7.41L10.83 12l4.58 4.59L14 18l-6-6 6-6 1.41 1.41zM8.41 7.41L3.83 12l4.58 4.59L7 18l-6-6 6-6 1.41 1.41z"/></svg>
          )}
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-[#f5f6fa] flex">
      {/* Org switch loading overlay */}
      {orgLoading && (
        <div className="fixed inset-0 bg-gradient-to-br from-[#4318d1] via-[#5b2bce] to-[#7c3aed] z-[100] flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-3 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-5" style={{ borderWidth: "3px" }} />
            <h2 className="text-xl font-bold text-white mb-1">Switching to {loadingOrgName}...</h2>
            <p className="text-indigo-200 text-sm">Loading organization data</p>
          </div>
        </div>
      )}
      {/* ═══ Desktop Sidebar ═══ */}
      <aside className={`${sidebarW} bg-white flex-col fixed h-full z-30 border-r border-gray-100 transition-all duration-300 hidden lg:flex`}>
        <SidebarContent />
      </aside>

      {/* ═══ Mobile Overlay Sidebar ═══ */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          {/* Sidebar */}
          <aside className="absolute left-0 top-0 w-[240px] h-full bg-white flex flex-col shadow-xl animate-[slideIn_0.2s_ease-out]">
            {/* Close button */}
            <button onClick={() => setMobileOpen(false)} className="absolute top-4 right-3 w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500">
              <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* ═══ Main Content ═══ */}
      <div className={`flex-1 ${marginL} flex flex-col transition-all duration-300`}>
        {/* Top Bar */}
        <div className="bg-white px-4 sm:px-6 py-3 flex items-center justify-between border-b border-gray-100 sticky top-0 z-20">
          <div className="flex items-center gap-3">
            {/* Hamburger — mobile only */}
            <button onClick={() => setMobileOpen(true)} className="lg:hidden w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-600">
              <svg width="22" height="22" fill="currentColor" viewBox="0 0 24 24"><path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/></svg>
            </button>
            <div>
              <p className="text-[11px] text-gray-400 leading-tight">Welcome back,</p>
              <h1 className="text-sm font-bold text-[#3b3a8a] leading-tight">Dr. {userName} <span className="text-sm">🩺</span> <span className="text-gray-400 font-normal text-[10px]">&#x25BE;</span></h1>
              <p className="text-[10px] text-gray-400 leading-tight hidden sm:block">Cardiologist</p>
            </div>
          </div>
          {/* Center search bar — global navigation search */}
          <div className="flex flex-1 max-w-lg mx-2 sm:mx-8">
            <div className="relative w-full">
              <svg className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <input
                type="text"
                value={navigating || globalSearch}
                onChange={(e) => { setGlobalSearch(e.target.value); setShowSearchResults(true); }}
                onFocus={() => { if (!navigating) setShowSearchResults(true); }}
                onBlur={() => setTimeout(() => setShowSearchResults(false), 300)}
                placeholder="Search..."
                readOnly={!!navigating}
                className={`w-full pl-8 sm:pl-10 pr-8 sm:pr-10 py-2 sm:py-2.5 border rounded-full text-xs sm:text-sm bg-white outline-none transition-all placeholder:text-gray-400 ${navigating ? "border-[#5b2bce] text-[#5b2bce] font-medium animate-pulse" : "border-gray-200 focus:border-[#5b2bce] focus:shadow-md"}`}
              />
              {globalSearch && (
                <button onClick={() => { setGlobalSearch(""); setShowSearchResults(false); }} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
                </button>
              )}
              {!globalSearch && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:block">
                  <kbd className="text-[9px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded font-mono border border-gray-200">⌘K</kbd>
                </div>
              )}
              {/* Search results dropdown */}
              {showSearchResults && globalSearch.trim().length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl border border-gray-200 shadow-xl z-50 overflow-hidden">
                  <div className="p-2">
                    <p className="text-[10px] text-gray-400 font-medium px-3 py-1 uppercase tracking-wide">Quick Navigation</p>
                    {[
                      { label: "Drug Search", desc: "Search medicines & drugs", href: "/doctor/drug-search", icon: "💊" },
                      { label: "CME Events", desc: "Medical conferences & webinars", href: "/doctor/cme-events", icon: "📅" },
                      { label: "Doctor Network", desc: "Connect with peers", href: "/doctor/network/feed", icon: "🤝" },
                      { label: "Profile", desc: "View & edit your profile", href: "/doctor/profile", icon: "👤" },
                      { label: "Notifications", desc: "Your latest updates", href: "/doctor/notifications", icon: "🔔" },
                    ].filter((item) => item.label.toLowerCase().includes(globalSearch.toLowerCase()) || item.desc.toLowerCase().includes(globalSearch.toLowerCase()))
                    .map((item) => (
                      <button key={item.href} onMouseDown={() => { setNavigating(`Navigating to ${item.label}...`); setShowSearchResults(false); setTimeout(() => { router.push(item.href); setGlobalSearch(""); setNavigating(""); }, 400); }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-indigo-50 text-left transition-colors">
                        <span className="text-lg">{item.icon}</span>
                        <div>
                          <p className="text-sm font-medium text-gray-800">{item.label}</p>
                          <p className="text-[10px] text-gray-400">{item.desc}</p>
                        </div>
                      </button>
                    ))}
                    {/* Always show "Search drugs for..." option */}
                    <button onMouseDown={() => { setNavigating(`Searching for "${globalSearch}"...`); setShowSearchResults(false); setTimeout(() => { router.push(`/doctor/drug-search?q=${encodeURIComponent(globalSearch)}`); setGlobalSearch(""); setNavigating(""); }, 400); }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-purple-50 text-left transition-colors border-t border-gray-100 mt-1 pt-2.5">
                      <span className="text-lg">🔍</span>
                      <div>
                        <p className="text-sm font-medium text-[#5b2bce]">Search drugs for "{globalSearch}"</p>
                        <p className="text-[10px] text-gray-400">Find medicines matching your query</p>
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Organization selector */}
            <div className="relative">
              <div onClick={() => setShowOrgDropdown(!showOrgDropdown)} className="flex items-center gap-1.5 sm:gap-2 border border-gray-200 rounded-full px-2 sm:px-3 py-1 sm:py-1.5 bg-white cursor-pointer hover:border-gray-300 transition-colors">
                <img src="/images/doctors/pharma_building.png" alt="" className="w-5 h-5 sm:w-7 sm:h-7 object-contain" />
                <div className="leading-tight hidden xs:block">
                  <p className="text-[8px] sm:text-[9px] text-gray-400">Organization</p>
                  <p className="text-[10px] sm:text-[11px] font-bold text-gray-900 max-w-[60px] sm:max-w-none truncate">{companyName || "Select"}</p>
                </div>
                <svg className={`w-3 h-3 sm:w-3.5 sm:h-3.5 text-gray-400 transition-transform ${showOrgDropdown ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </div>
              {showOrgDropdown && (
                <div className="absolute top-full right-0 mt-2 w-56 bg-white rounded-xl border border-gray-200 shadow-xl z-50 overflow-hidden">
                  <div className="p-2">
                    <p className="text-[10px] text-gray-400 font-medium px-3 py-1 uppercase tracking-wide">Switch Organization</p>
                    {myOrgs.map((org) => (
                      <button key={org.organization_id} onClick={() => { setLoadingOrgName(org.organization_name); setOrgLoading(true); setShowOrgDropdown(false); localStorage.setItem("companyName", org.organization_name); localStorage.setItem("selectedOrgId", org.organization_id); localStorage.setItem("selectedOrgGid", org.organization_gid || ""); queryClient.clear(); setTimeout(() => { window.location.reload(); }, 800); }}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-colors ${companyName === org.organization_name ? "bg-indigo-50 text-[#5b2bce]" : "hover:bg-gray-50"}`}>
                        <div className="w-7 h-7 bg-gray-100 rounded-lg flex items-center justify-center text-[8px] font-black text-gray-600">{(org.organization_name || "O").charAt(0)}</div>
                        <div>
                          <p className="text-xs font-semibold text-gray-800">{org.organization_name}</p>
                          <p className="text-[9px] text-gray-400">{org.city || "Pharma"}</p>
                        </div>
                        {companyName === org.organization_name && <span className="ml-auto w-2 h-2 bg-[#5b2bce] rounded-full"></span>}
                      </button>
                    ))}
                    {myOrgs.length === 0 && (
                      <p className="text-xs text-gray-400 text-center py-3">No organizations linked</p>
                    )}
                  </div>
                </div>
              )}
            </div>
            {/* Notification bell */}
            <div className="relative cursor-pointer" onClick={() => router.push("/doctor/notifications")}>
              <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors">
                <svg width="16" height="16" fill="#5b2bce" viewBox="0 0 24 24"><path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/></svg>
              </div>
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full text-[8px] text-white font-bold flex items-center justify-center border border-white">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </div>
            {/* Profile avatar */}
            <div className="flex items-center gap-2 cursor-pointer">
              <img src="/images/doctors/male_doc_avatar.png" alt="" className="w-9 h-9 rounded-full object-cover" />
              <span className="text-xs font-semibold text-gray-700 hidden md:inline">Dr. {userName}</span>
              <svg className="w-3 h-3 text-gray-400 hidden md:block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </div>
          </div>
        </div>

        {/* Page content */}
        <div className="flex-1 p-3 sm:p-5 overflow-x-hidden min-w-0">
          {children}
        </div>
      </div>
    </div>
  );
}
