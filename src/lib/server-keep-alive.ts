/**
 * Server keep-alive mechanism for free tier hosting
 * Prevents server from sleeping/stopping by pinging itself every 10 minutes
 */

const PING_INTERVAL = 10 * 60 * 1000; // 10 minutes in milliseconds
let pingTimer: NodeJS.Timeout | null = null;

export function startServerKeepAlive() {
  if (pingTimer) return; // Already running

  console.log("[Keep-Alive] Starting server keep-alive heartbeat...");

  // First ping after 10 minutes
  pingTimer = setInterval(async () => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const response = await fetch(`${baseUrl}/api/health`, {
        method: "GET",
        headers: { "User-Agent": "Server-Keep-Alive" },
      });

      if (response.ok) {
        console.log(`[Keep-Alive] Heartbeat sent at ${new Date().toISOString()}`);
      } else {
        console.warn(`[Keep-Alive] Heartbeat failed: ${response.status}`);
      }
    } catch (error) {
      console.error("[Keep-Alive] Error sending heartbeat:", error);
    }
  }, PING_INTERVAL);

  // Also send initial ping after 5 seconds
  setTimeout(async () => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      await fetch(`${baseUrl}/api/health`, {
        method: "GET",
        headers: { "User-Agent": "Server-Keep-Alive" },
      });
    } catch (error) {
      // Silently fail on initial ping
    }
  }, 5000);
}

export function stopServerKeepAlive() {
  if (pingTimer) {
    clearInterval(pingTimer);
    pingTimer = null;
    console.log("[Keep-Alive] Stopped server keep-alive");
  }
}
