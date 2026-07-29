"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export default function NavigationProgress() {
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    setLoading(false);
    setProgress(100);
    const t = setTimeout(() => setProgress(0), 300);
    return () => clearTimeout(t);
  }, [pathname]);

  useEffect(() => {
    let interval;
    const handleClick = (e) => {
      const link = e.target.closest("a[href], button[onclick]");
      if (!link) return;
      const href = link.getAttribute("href");
      if (href && href.startsWith("/") && href !== pathname) {
        setLoading(true);
        setProgress(30);
        interval = setInterval(() => {
          setProgress((p) => {
            if (p >= 90) { clearInterval(interval); return 90; }
            return p + Math.random() * 15;
          });
        }, 200);
      }
    };

    document.addEventListener("click", handleClick);
    return () => {
      document.removeEventListener("click", handleClick);
      if (interval) clearInterval(interval);
    };
  }, [pathname]);

  if (!loading && progress === 0) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] h-[3px]">
      <div
        className="h-full bg-gradient-to-r from-purple-500 via-indigo-500 to-purple-600 transition-all duration-300 ease-out"
        style={{ width: `${progress}%`, opacity: progress >= 100 ? 0 : 1 }}
      />
    </div>
  );
}
