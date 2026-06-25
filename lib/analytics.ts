import { supabase } from "./supabaseClient";

const SESSION_KEY = "mily_analytics_session_id";

/**
 * Retrieves the anonymous session ID from localStorage or creates a new one.
 */
function getOrCreateSessionId(): string {
  if (typeof window === "undefined") return "";
  
  let sessionId = localStorage.getItem(SESSION_KEY);
  if (!sessionId) {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      sessionId = crypto.randomUUID();
    } else {
      // Fallback for older browsers
      sessionId = Math.random().toString(36).substring(2) + Date.now().toString(36);
    }
    localStorage.setItem(SESSION_KEY, sessionId);
  }
  return sessionId;
}

/**
 * Detects whether the device is mobile, tablet, or desktop based on the user agent.
 */
function getDeviceType(): string {
  if (typeof window === "undefined") return "desktop";
  
  const ua = navigator.userAgent.toLowerCase();
  
  // Tablet check
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    return "tablet";
  }
  
  // Mobile check
  if (/mobile|ip(hone|od)|android|blackberry|iemobile|kindle|silk-accelerated|(hpw|web)os|opera m(obi|ini)/i.test(ua)) {
    return "mobile";
  }
  
  return "desktop";
}

/**
 * Logs an event to the Supabase analytics table.
 */
export async function logEvent(eventName: string): Promise<void> {
  if (typeof window === "undefined") return;
  
  try {
    const sessionId = getOrCreateSessionId();
    const deviceType = getDeviceType();

    // Fire and forget insert
    const { error } = await supabase.from("analytics_events").insert({
      event_name: eventName,
      session_id: sessionId,
      device_type: deviceType,
    });

    if (error) {
      console.warn("Analytics event insertion error:", error.message);
    }
  } catch (err) {
    console.error("Failed to log analytics event:", err);
  }
}
