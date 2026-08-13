"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import SessionExpiredOverlay from "@/components/SessionExpiredOverlay";

export default function QueryProvider({ children }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime:            5 * 60 * 1000,
        gcTime:               30 * 60 * 1000,
        retry:                1,
        refetchOnWindowFocus: false,
      },
    },
  }));

  const [showExpired, setShowExpired] = useState(false);

  useEffect(() => {
    const handler = () => setShowExpired(true);
    window.addEventListener("session-expired", handler);
    return () => window.removeEventListener("session-expired", handler);
  }, []);

  const handleDone = () => {
    setShowExpired(false);
    window.location.href = "/drx/login";
  };

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {showExpired && <SessionExpiredOverlay onDone={handleDone} />}
    </QueryClientProvider>
  );
}
