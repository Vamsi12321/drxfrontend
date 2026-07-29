"use client";
import { useEffect, useState } from "react";

export default function SessionExpiredOverlay({ onDone }) {
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) { clearInterval(interval); onDone(); return 0; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [onDone]);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-gradient-to-br from-gray-900/95 to-gray-800/95 backdrop-blur-sm">
      <div className="text-center px-8 py-10 bg-white rounded-3xl shadow-2xl max-w-sm w-full mx-4 animate-fadeIn">
        {/* Lock icon with pulse */}
        <div className="relative w-20 h-20 mx-auto mb-6">
          <div className="absolute inset-0 bg-red-100 rounded-full animate-ping opacity-40" />
          <div className="relative w-20 h-20 bg-gradient-to-br from-red-500 to-pink-600 rounded-full flex items-center justify-center shadow-lg">
            <span className="text-3xl">🔒</span>
          </div>
        </div>

        <h2 className="text-2xl font-bold text-gray-800 mb-2">Session Expired</h2>
        <p className="text-gray-500 text-sm mb-1">Your session has timed out for security.</p>
        <p className="text-gray-400 text-xs mb-6">Please log in again to continue.</p>

        {/* Countdown bar */}
        <div className="bg-gray-100 rounded-full h-1.5 mb-4 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-red-500 to-pink-500 rounded-full transition-all duration-1000"
            style={{ width: `${(countdown / 3) * 100}%` }}
          />
        </div>

        <p className="text-xs text-gray-400">
          Redirecting to login in <span className="font-bold text-red-500">{countdown}s</span>...
        </p>
      </div>
    </div>
  );
}
