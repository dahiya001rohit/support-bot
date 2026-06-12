import { NextResponse } from "next/server";

type ApiHandler = () => Promise<Response>;

/**
 * Wraps API handlers with error handling to prevent server crashes on free tier
 * Returns 500 instead of crashing the entire app
 */
export async function withErrorHandler(handler: ApiHandler): Promise<Response> {
  try {
    return await handler();
  } catch (error) {
    // Return safe error response instead of crashing
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Validates required fields in request body
 */
export function validateRequired(
  body: Record<string, any>,
  fields: string[]
): { valid: boolean; error?: string } {
  const missing = fields.filter(field => !body[field]);
  if (missing.length > 0) {
    return {
      valid: false,
      error: `Missing required fields: ${missing.join(", ")}`,
    };
  }
  return { valid: true };
}

/**
 * Validates HTTP method
 */
export function validateMethod(
  method: string,
  allowed: string[]
): { valid: boolean; error?: string } {
  if (!allowed.includes(method)) {
    return {
      valid: false,
      error: `Method ${method} not allowed. Allowed: ${allowed.join(", ")}`,
    };
  }
  return { valid: true };
}
