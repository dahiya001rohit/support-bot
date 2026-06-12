import { NextResponse } from "next/server";

/**
 * Health check endpoint for keep-alive heartbeats
 * Keeps server alive on free tier by responding to periodic pings
 */
export async function GET() {
  return NextResponse.json(
    {
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
      },
    }
  );
}

// Prevent caching to ensure actual server execution
export const dynamic = "force-dynamic";
