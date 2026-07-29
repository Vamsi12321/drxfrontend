"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

// Root home item per role
const roleHome = {
  admin:   { label: "🏠 Dashboard",  href: "/admin/dashboard" },
  company: { label: "🏠 Overview",   href: "/company/overview" },
  doctor:  { label: "🏠 Home",       href: "/doctor/home" },
  mr:      { label: "🏠 Dashboard",  href: "/mr/dashboard" },
};

// Readable labels for path segments
const segmentLabel = {
  "overview":        "Overview",
  "dashboard":       "Dashboard",
  "home":            "Home",
  "drug-management": "💊 Drug Management",
  "cme-events":      "🎓 CME Events",
  "doctors":         "🩺 Doctors",
  "medical-reps":    "💼 Medical Reps",
  "profile":         "👤 Profile",
  "drug-search":     "🔍 Drug Search",
  "network":         "🤝 Network",
  "companies":       "🏢 Companies",
  "drug-forms":      "📝 Drug Forms",
  "users":           "👥 Users",
  "system":          "⚙️ System",
  "drug-details":    "💊 Drug Details",
};

// These are the role prefix segments — skip them in the trail
const rolePrefixes = new Set(["admin", "company", "doctor", "mr"]);

// These are the "home" segments — don't show them as a separate crumb
const homeSegments = new Set(["dashboard", "overview", "home"]);

export default function Breadcrumb({ customItems = null }) {
  const pathname = usePathname();
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    setUserRole(localStorage.getItem("userRole") || "doctor");
  }, []);

  // Custom items override
  if (customItems) {
    return <BreadcrumbNav items={customItems} />;
  }

  if (!userRole) return null; // avoid flash before localStorage loads

  const home = roleHome[userRole] || roleHome.doctor;
  const segments = pathname.split("/").filter(Boolean);

  // Build crumb trail
  const crumbs = [{ label: home.label, href: home.href }];

  let builtPath = "";
  segments.forEach((seg, i) => {
    builtPath += `/${seg}`;

    // Skip role prefix and home segments
    if (rolePrefixes.has(seg) || homeSegments.has(seg)) return;
    // Skip dynamic [id] segments
    if (seg.startsWith("[")) return;

    const isLast = i === segments.length - 1;
    const label = segmentLabel[seg] || seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, " ");

    crumbs.push({ label, href: isLast ? null : builtPath });
  });

  // If only the home crumb exists (we're on the home/dashboard page), don't render
  if (crumbs.length === 1) return null;

  return <BreadcrumbNav items={crumbs} />;
}

function BreadcrumbNav({ items }) {
  return (
    <nav className="flex items-center flex-wrap gap-1 text-sm mb-6 bg-white rounded-xl px-4 py-2.5 shadow-sm border border-gray-100">
      {items.map((item, i) => (
        <div key={i} className="flex items-center">
          {i > 0 && (
            <svg className="w-3.5 h-3.5 text-gray-300 mx-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
          )}
          {item.href ? (
            <Link href={item.href} className="text-gray-500 hover:text-indigo-600 font-medium transition-colors px-1 py-0.5 rounded hover:bg-gray-50">
              {item.label}
            </Link>
          ) : (
            <span className="text-gray-900 font-semibold px-1 py-0.5">{item.label}</span>
          )}
        </div>
      ))}
    </nav>
  );
}
