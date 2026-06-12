# URL Redirect & Server Stability Guide

## What Was Added

Your app now has three layers of protection to handle unwanted URLs and keep your server stable on free tier hosting:

### 1. **Middleware (src/middleware.ts)**
- Blocks suspicious paths like `/admin`, `/wp-admin`, `/phpMyAdmin`, `/.git`, `/.env` → redirects to home
- Protects dashboard routes (redirects unauthenticated users to login)
- Prevents authenticated users from accessing login/register pages

### 2. **404 Handler (src/app/not-found.tsx)**
- Gracefully displays when users visit non-existent routes
- Includes a button to return home
- Prevents server crashes from invalid URLs

### 3. **Global Error Handler (src/app/error.tsx)**
- Catches unexpected errors in your app
- Shows user-friendly error message
- Includes a "Try again" button
- Prevents entire app from crashing

### 4. **API Error Handler (src/lib/api-handler.ts)**
- Wraps all API handlers to catch errors
- Returns safe 500 responses instead of crashing
- Validates required fields and HTTP methods
- Keeps server running on free tier

## How to Use the API Handler

Apply to all your API routes:

```typescript
import { withErrorHandler, validateRequired } from "@/lib/api-handler";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  return withErrorHandler(async () => {
    const body = await req.json();
    
    // Validate required fields
    const validation = validateRequired(body, ["email", "message"]);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // Your logic here
    return NextResponse.json({ success: true });
  });
}
```

## Customize Blocked Paths

Edit the `BLOCKED_PATHS` array in `src/middleware.ts` to add more blocked routes:

```typescript
const BLOCKED_PATHS = [
  "/admin",
  "/wp-admin",
  "/api/internal",  // Add custom paths
  "/secret",
];
```

## Why This Keeps Free Tier Stable

- **Early blocking**: Middleware stops bad requests before they reach your app
- **Error boundaries**: Each layer catches errors to prevent cascading failures
- **Resource efficient**: No heavy logging or database calls on errors
- **Graceful degradation**: Shows friendly errors instead of crashes

## Testing

Try these URLs to see the redirects:
- `http://localhost:3000/admin` → redirects to home
- `http://localhost:3000/fake-page` → shows 404 page
- `http://localhost:3000/api/unknown` → returns JSON error

## Free Tier Hosting Notes

- Vercel, Netlify, and Railway free tiers have memory limits
- These handlers keep memory usage low by failing fast
- 404s and errors don't trigger expensive operations
- Blocked paths return instantly without processing
