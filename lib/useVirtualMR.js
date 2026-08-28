"use client";
import { useState, useRef, useCallback } from "react";
import { post } from "@/lib/api";

/**
 * Shared hook for Virtual MR chat — wires to POST /api/v1/virtual-mr/chat
 * Works in both the Virtual MR page and Drug Details sidebar.
 *
 * @param {string} drugId  - The drug's id / _id
 * @param {string} orgId   - Currently selected org id (from localStorage)
 * @param {string} drugName - For display purposes
 */
export function useVirtualMR({ drugId, orgId, drugName } = {}) {
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState(null);
  // Keep history in a ref so it doesn't trigger re-renders
  const historyRef = useRef([]);

  const reset = useCallback(() => {
    setMessages([]);
    setError(null);
    historyRef.current = [];
  }, []);

  const sendMessage = useCallback(async (question) => {
    const msg = question?.trim();
    if (!msg || !drugId || !orgId) return;

    setError(null);

    const userMsg = {
      role: "user",
      text: msg,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setMessages((prev) => [...prev, userMsg]);

    // Start typing indicator
    setIsTyping(true);

    try {
      const res = await post("/api/v1/virtual-mr/chat", {
        org_id: orgId,
        drug_id: drugId,
        question: msg,
        history: historyRef.current.slice(-10), // send last 10 turns max
      });

      const answer = res?.answer || "I couldn't find an answer for that. Please try rephrasing.";

      const aiMsg = {
        role: "ai",
        text: answer,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        sources: res?.sources || [],
        usedBrochure: res?.used_brochure || false,
      };

      setMessages((prev) => [...prev, aiMsg]);

      // Update history for multi-turn context
      historyRef.current = [
        ...historyRef.current,
        { role: "user", content: msg },
        { role: "assistant", content: answer },
      ];
    } catch (err) {
      const status = err?.status;
      let errorText;
      if (status === 504) {
        errorText = "The AI service is waking up (free tier). Please wait 30 seconds and try again.";
      } else if (status === 403) {
        errorText = "You are not connected to this organization. Please contact your DRx admin.";
      } else if (status === 404) {
        errorText = "Drug not found or not available to your organization.";
      } else if (status === 502 || status === 503) {
        errorText = "AI service is temporarily unavailable. Please try again in a moment.";
      } else {
        errorText = err?.message || "Unable to connect to Virtual MR. Please try again.";
      }
      setError(errorText);

      // Show error as a message in chat too
      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          text: errorText,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          isError: true,
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  }, [drugId, orgId]);

  return { messages, setMessages, isTyping, error, sendMessage, reset };
}
