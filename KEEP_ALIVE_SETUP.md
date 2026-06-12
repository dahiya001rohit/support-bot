# Server Keep-Alive Setup Guide

## What This Does

Prevents your server from sleeping/stopping on free tier hosting (Vercel, Netlify, Railway, etc.) by sending a heartbeat ping every **10 minutes**.

## How It Works

1. **Keep-Alive Service** (`src/lib/server-keep-alive.ts`) - Runs on server startup
2. **Health Endpoint** (`src/api/health/route.ts`) - Responds to heartbeat pings
3. **Auto-Start** - Enabled in `src/app/layout.tsx`

## Setup

### 1. Set Your App URL in `.env.local`

```env
NEXT_PUBLIC_APP_URL=https://your-app-domain.com
```

**For local development:**
```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**For Vercel:**
```env
NEXT_PUBLIC_APP_URL=https://your-project.vercel.app
```

### 2. That's it! 

The keep-alive automatically starts when your app boots and runs indefinitely.

## Verification

1. Start your app: `npm run dev`
2. Check console logs for: `[Keep-Alive] Starting server keep-alive heartbeat...`
3. After 5 seconds, you should see: `[Keep-Alive] Heartbeat sent at...`
4. Then every 10 minutes the heartbeat repeats

## Testing the Health Endpoint

```bash
curl http://localhost:3000/api/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2026-06-12T12:34:56.789Z",
  "uptime": 123.45
}
```

## Customizing Heartbeat Interval

Edit `src/lib/server-keep-alive.ts` line 8:

```typescript
const PING_INTERVAL = 10 * 60 * 1000; // Change 10 to desired minutes
```

## Free Tier Hosting Notes

- **Vercel**: Free tier puts app to sleep after 15 min inactivity. This keep-alive prevents that.
- **Netlify**: Similar 15-min inactivity timeout. Keep-alive solves this.
- **Railway**: 7-day free tier with limited hours. Keep-alive reduces inactivity time.

## What It Doesn't Do

- Does NOT consume database resources (just HTTP ping)
- Does NOT log anything to database
- Does NOT trigger expensive operations
- Does NOT count against API quotas (it's internal)

## Troubleshooting

**Heartbeat not appearing in logs?**
- Check that `NEXT_PUBLIC_APP_URL` is set correctly
- Make sure app is accessible at that URL
- Check browser console for fetch errors

**Want to disable temporarily?**
- Comment out this line in `src/app/layout.tsx`:
  ```typescript
  // startServerKeepAlive();
  ```

**Want to stop it programmatically?**
```typescript
import { stopServerKeepAlive } from "@/lib/server-keep-alive";

stopServerKeepAlive(); // Stops the heartbeat
```

## Free Tier Cost Impact

**None** — the heartbeat is so lightweight:
- One small GET request every 10 minutes
- No database queries
- No external API calls
- ~1KB data transfer per heartbeat

On Vercel free tier, this is completely within limits.
