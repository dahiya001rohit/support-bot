# SupportAI — Security & Quality Audit

**Audit Date:** 2026-06-12
**Scope:** Security, correctness, consistency, code quality
**Method:** Full read of every API route, lib module, the embeddable widget, and dashboard pages, checked against an explicit threat checklist (tenant isolation, XSS, CSRF, error leakage, race conditions).
**Status:** ✅ Complete — all critical/high findings fixed; remaining low-risk items accepted with documented mitigations.

---

## Resolved Findings

### 1. Widget XSS hardening — `public/widget.js` · CRITICAL → FIXED
**Found:** Bot replies were rendered via `innerHTML` after entity-escaping `& < >`, which blocks tag injection but left the markdown-lite pipeline as the only gate between LLM output and the customer's page DOM.
**Fix:** Escaping is applied to the raw text **before** any markdown formatting, so no model-controlled string can introduce tags or attributes; only the renderer's own whitelisted output (`<b>`, `<a>` with hardcoded `rel="noopener"`, `<table>` rows built from escaped cells) reaches `innerHTML`. User messages render via `textContent` (no HTML path at all). Verified with payloads like `<img src=x onerror=alert(1)>` and `<svg onload=alert(1)>` placed in knowledge-base documents — both render as inert text.
**Residual risk:** none identified for the current renderer; adding new markdown features must preserve the escape-first order (noted as an inline comment).

### 2. Ticket update returned success on non-owned rows — `api/tickets/[id]` · HIGH → FIXED
**Found:** `PATCH` filtered the update by `business_id` (isolation held — no cross-tenant write was possible), but when the filter matched zero rows the route still returned `200`, misreporting success.
**Fix:** The update now uses `.select().single()`; zero rows updated surfaces as an error and the route returns `404 "Ticket not found"`. Cross-tenant probes are indistinguishable from non-existent tickets.

### 3. Missing CORS headers on chat error responses — `api/chat` · MEDIUM → FIXED
**Found:** The catch-all error response omitted CORS headers, so cross-origin widget callers saw an opaque CORS failure instead of the API error.
**Fix:** `corsHeaders` attached to every response path in the route, including 4xx/5xx.

### 4. Database error messages leaked to clients — multiple routes · MEDIUM → FIXED
**Found:** Supabase error strings (which can reference tables, columns, and constraints) were returned verbatim in JSON error bodies.
**Fix:** All admin and public routes now return generic error messages (`"Internal server error"` class responses); original errors are logged server-side only.

### 5. Analytics counts failed silently — `api/analytics` · MEDIUM → FIXED
**Found:** The three parallel count queries fell back to `count ?? 0` without checking `error`, so a partial database failure could report zeros as real data.
**Fix:** Errors from all three queries are checked; any failure returns `500` instead of fabricated zeros.

### 6. Message role cast without validation — `api/chat` · MINOR → FIXED
**Found:** History rows were cast to `"user" | "assistant"` without runtime validation.
**Fix:** History is filtered to known roles before being replayed into the prompt; `system` event rows are excluded from the LLM context by the same filter.

### 7. Weak email validation on contact capture · MINOR → FIXED
**Found:** Widget and endpoint accepted any string containing `@`.
**Fix:** Both ends validate against a `.+@.+\..+` pattern; the endpoint additionally trims inputs and enforces non-empty name.

### 8. Console logging / dead code cleanup · MINOR → FIXED
**Found:** Stray `console.log` calls and unused imports across dashboard pages and lib modules; an experimental keep-alive module built on incorrect assumptions about Vercel's serverless lifecycle.
**Fix:** Logs and unused imports removed; the keep-alive module and its docs were deleted entirely (serverless functions are ephemeral — a `setInterval` heartbeat cannot run there, and Vercel does not sleep functions the way long-running free dynos do). The `/api/health` endpoint was kept as a standard health check.

---

## Accepted Risks (documented, with mitigations)

### A. Contact endpoint is unauthenticated by design — `api/tickets/[id]/contact`
Widget visitors have no session, so this endpoint cannot require auth. Mitigations in place: ticket IDs are unguessable UUIDs; the update requires a matching `business_id`; and the write only succeeds while `customer_name = 'Anonymous'`, making it one-shot — an attacker cannot overwrite real contact details. Worst case is filling an anonymous ticket's contact field once. **Production next step:** a short-lived one-time token issued with `ticket_id` in the chat response.

### B. Escalation block is not transactional — `api/chat`
Ticket insert, conversation flag update, and system-message insert are sequential Supabase calls; a crash between them could leave the flag unset and allow a duplicate ticket on retry. Probability is low (single-region, sub-second window) and impact is a duplicate ticket, not data loss or leakage. **Production next step:** wrap the escalation block in a Postgres function (single transaction) or add a partial unique index on `tickets(conversation_id)`.

### C. No rate limiting on public endpoints
`/api/chat` can be scripted against a known `business_id`, consuming LLM quota and polluting analytics. Acceptable for an assessment deployment. **Production next step:** per-session/IP limits (Upstash) plus a per-business domain allowlist checked against the `Origin` header.

---

## Verified Correct (spot-check highlights)

- Every admin route resolves `business_id` from the session (`getBusinessIdFromSession`), never from client input; all queries filter on the server-resolved value.
- Mutating routes (`DELETE` document, `PATCH` ticket) enforce ownership with a `business_id` predicate on the mutation itself.
- `match_chunks` applies the tenant filter inside the similarity query — vector retrieval cannot cross tenants.
- Conversation lookup matches on `(session_id, business_id)` with a matching composite unique constraint — a visitor's session on one site cannot leak messages into another tenant (regression test for a real bug found in E2E).
- Chat history is loaded **before** the new user message is inserted (no duplicate turn in the prompt).
- Groq JSON parsing is defensive: missing fields get fallbacks, priority is validated against the allowed set, and parse failure degrades to a plain-text reply without escalation.
- Failed ingestion marks the document `failed` — no rows stuck in `processing`.
- `widget-config` selects only display fields; escalation rules and personality never reach anonymous visitors.
- No server secret carries a `NEXT_PUBLIC_` prefix.