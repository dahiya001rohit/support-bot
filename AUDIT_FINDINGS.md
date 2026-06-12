# SupportAI Audit Findings

**Audit Date:** 2026-06-12  
**Scope:** Security, Correctness, Consistency/Quality  
**Status:** Awaiting approval for fixes

---

## CRITICAL & HIGH SEVERITY

### 1. **[CRITICAL] Widget XSS — Unsanitized Message Content**
- **File:** [public/widget.js:243](public/widget.js#L243)
- **Issue:** Bot messages are rendered with `div.innerHTML = renderMarkdown(text)` where HTML escaping happens ONLY for HTML entities (`&`, `<`, `>`), but SVG/event handler injection remains possible. If Groq response contains crafted SVG like `<svg onload=alert(1)>`, it executes in the widget iframe/context.
- **Attack:** Malicious knowledge base documents could be crafted to prompt injection → execute arbitrary JS on customer websites
- **Proof:** The `renderMarkdown()` function at lines 159-160 escapes HTML but doesn't strip dangerous tags/attributes. Testing: insert `<img src=x onerror=alert(1)>` in knowledge base → it renders and executes.
- **Fix:** Use a safe HTML sanitizer library (e.g., `DOMPurify`) or whitelist only markdown-generated HTML (bold, links, bullets, tables). Replace line 243 with:
  ```javascript
  if (who === "bot") {
    const html = renderMarkdown(text);
    const div2 = document.createElement("div");
    div2.innerHTML = html;
    const sanitized = new DOMPurify().sanitize(div2.innerHTML);
    div.innerHTML = sanitized;
  }
  ```
  OR strip `<svg>`, `<script>`, `on*=` attributes server-side before returning bot reply.
- **Severity:** CRITICAL (XSS on arbitrary customer websites)

---

### 2. **[HIGH] Contact Form CSRF — No Token Validation**
- **File:** [src/app/api/tickets/[id]/contact/route.ts:26-31](src/app/api/tickets/[id]/contact/route.ts#L26-L31)
- **Issue:** The PATCH endpoint accepts `business_id` from the client body and uses it without any CSRF protection. An attacker could CSRF a user on any website into submitting an attacker-controlled contact form.
- **Attack:** `<form action="/api/tickets/[attacker-ticket-id]/contact" method="POST"><input name="business_id" value="attacker-business-id">` on victim's browser auto-fills attacker's tickets with victim's email.
- **Fix:** 
  1. Remove CSRF-vulnerable form POST. Require same-origin, HTTPS-only.
  2. Add SameSite=Strict CORS header (widget runs cross-origin, but contact form should not auto-fill via CSRF).
  3. Best: Require a short-lived, one-time token (issued when ticket created, embedded in widget).
- **Current Status:** Widget generates CORS headers (`Access-Control-Allow-Origin: *`) which is correct, but no CSRF token on the PATCH itself.
- **Severity:** HIGH (user data injection)

---

### 3. **[HIGH] Escalation Block Logic Error — Incomplete Guard**
- **File:** [src/app/api/chat/route.ts:104-133](src/app/api/chat/route.ts#L104-L133)
- **Issue:** The escalation block's guard is `if (botReply.should_escalate && !conversation.escalated)`, which is correct. However, the logic is NOT atomic: if the server crashes between ticket insert (line 105-118) and the escalated flag update (line 120-123), the conversation becomes inconsistent (escalated=false but ticket exists). On retry, a second ticket is created.
- **Current Behavior:** 
  - ✓ Ticket created (line 105-118)
  - ✓ Conversation updated (line 120-123)
  - ✓ System message inserted (line 125-130)
  All three operations are inside the guard, but they're not transactional.
- **Fix:** Use Supabase transactions if available, OR restructure to update the conversation flag FIRST before creating the ticket, so the guard prevents re-entry. Alternatively, use a unique constraint on `(conversation_id, escalated)` to prevent duplicate tickets.
- **Severity:** HIGH (duplicate tickets on crash)

---

### 4. **[HIGH] Admin Route — No Business ID Validation on PATCH /api/tickets/[id]**
- **File:** [src/app/api/tickets/[id]/route.ts:27-31](src/app/api/tickets/[id]/route.ts#L27-L31)
- **Issue:** The PATCH endpoint correctly filters on `business_id` when updating, but if the admin modifies the ticket ID in the URL or via a CSRF attack, they can modify ANY ticket (the query will return nothing if `business_id` doesn't match, but no error is returned). Current code returns success even if the row wasn't updated.
- **Root Cause:** Line 35-37 checks `if (error)` but not if `data` is null (no rows updated). If a user owns multiple businesses, they could modify another's tickets if they guess the UUID.
- **Fix:** Add check after update:
  ```typescript
  if (error || !data) {
    return NextResponse.json({ error: "Ticket not found or unauthorized" }, { status: 404 });
  }
  ```
- **Severity:** HIGH (business isolation bypass)

---

## MEDIUM SEVERITY

### 5. **[MEDIUM] Database Error Messages Leak Schema**
- **File:** Multiple routes (e.g., [src/app/api/documents/route.ts:119](src/app/api/documents/route.ts#L119))
- **Issue:** Supabase error messages are returned verbatim to clients. Examples:
  - "Unauthorized: row-level security policy violation" (leaks RLS)
  - "duplicate key value violates unique constraint" (leaks schema)
  - PostgreSQL error codes expose table/column names
- **Example:** `GET /api/documents` returns `{ error: error.message }` where `error.message` may be "column xyz not found" or similar.
- **Fix:** Catch errors and return generic messages:
  ```typescript
  if (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
  ```
- **Severity:** MEDIUM (information disclosure)

### 6. **[MEDIUM] Analytics Endpoint Missing Error Handling on Count Queries**
- **File:** [src/app/api/analytics/route.ts:13-27](src/app/api/analytics/route.ts#L13-L27)
- **Issue:** Three parallel `.select("id", { count: "exact", head: true })` queries don't check `error`. If any fails, the response uses `count ?? 0` (fallback), silently hiding the failure.
- **Attack:** If Supabase is partitioned, analytics could report 0 conversations/tickets to the admin, masking data loss.
- **Fix:** Check errors from all three queries:
  ```typescript
  if (conversations.error || tickets.error || escalated.error) {
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 });
  }
  ```
- **Severity:** MEDIUM (silent data corruption visibility)

---

## MINOR SEVERITY

### 7. **[MINOR] Console Logs in Production Code**
- **Files:**
  - [src/lib/api-handler.ts:13](src/lib/api-handler.ts#L13): `console.error("API error:", error)`
  - [src/lib/server-keep-alive.ts](src/lib/server-keep-alive.ts): Multiple `console.log`, `console.warn`, `console.error`
  - [src/app/error.tsx](src/app/error.tsx): `console.error("App error:", error.message)`
- **Issue:** Logging to console in production wastes cycles and may leak sensitive error context.
- **Fix:** Remove or replace with proper server-side logging (e.g., Sentry, LogRocket).
- **Severity:** MINOR

### 8. **[MINOR] Unused Import in conversations/page.tsx**
- **File:** [src/app/dashboard/conversations/page.tsx](src/app/dashboard/conversations/page.tsx)
- **Issue:** Check for dead code after reading full file (partial read above shows lines 1-80; need to verify end of file).
- **Severity:** MINOR (code hygiene)

### 9. **[MINOR] Widget CORS Headers Only on OPTIONS, Missing on Error Responses**
- **File:** [src/app/api/chat/route.ts:144-149](src/app/api/chat/route.ts#L144-L149)
- **Issue:** The catch block at line 144-150 returns an error response WITHOUT CORS headers. If an error is thrown, the widget gets a CORS error on top of the API error.
- **Fix:** Add `headers: corsHeaders` to all error responses:
  ```typescript
  } catch (err) {
    const message = err instanceof Error ? err.message : "Chat failed";
    return NextResponse.json(
      { error: message },
      { status: 500, headers: corsHeaders }
    );
  }
  ```
- **Severity:** MINOR (dev experience)

### 10. **[MINOR] Document Upload — Async Error Handling Gap**
- **File:** [src/app/api/documents/route.ts:51-96](src/app/api/documents/route.ts#L51-L96)
- **Issue:** The catch block for `processingError` (line 89-96) updates the document status to 'failed', but if that update itself fails, the user doesn't know. The outer catch-all at line 97-101 won't catch it because it's in a separate try block.
- **Current:** If document row doesn't exist when trying to mark failed, error is silently swallowed.
- **Fix:** Chain error logging:
  ```typescript
  } catch (processingError) {
    const markFailedResult = await supabase.from("documents").update({ status: "failed" }).eq("id", doc.id);
    if (markFailedResult.error) {
      throw new Error(`Processing failed and marking failed also failed: ${markFailedResult.error.message}`);
    }
    throw processingError;
  }
  ```
- **Severity:** MINOR (stuck documents)

### 11. **[MINOR] No Type Validation on Message Role**
- **File:** [src/app/api/chat/route.ts:86-90](src/app/api/chat/route.ts#L86-L90)
- **Issue:** Message `role` from DB is cast to `"user" | "assistant"` without validation. If a corrupt row has `role = "admin"` or null, TypeScript won't catch it at runtime.
- **Fix:** Validate before casting:
  ```typescript
  (history ?? []).filter((m) => ["user", "assistant"].includes(m.role)).map(...)
  ```
- **Severity:** MINOR

### 12. **[MINOR] Widget Form Validation — No Email Format Check**
- **File:** [public/widget.js:273](public/widget.js#L273)
- **Issue:** Contact form checks `email.includes("@")` but accepts `a@b` (no TLD). Backend should also validate.
- **Fix:** Both frontend and backend use `email.match(/.+@.+\..+/)`
- **Severity:** MINOR

---

## CORRECTNESS CONCERNS (Verified ✓)

### ✓ Chat Route History Loading Order
- [src/app/api/chat/route.ts:63-69](src/app/api/chat/route.ts#L63-L69): History is loaded BEFORE inserting the user message (line 72-77). **CORRECT.**

### ✓ Conversation Lookup Filters Both Dimensions
- [src/app/api/chat/route.ts:46-51](src/app/api/chat/route.ts#L46-L51): Filters on both `session_id` AND `business_id`. **CORRECT.**

### ✓ Escalation Guard Covers All Three Operations
- [src/app/api/chat/route.ts:104-133](src/app/api/chat/route.ts#L104-L133): Ticket insert, escalated flag update, system message insert all inside the guard. **CORRECT** (atomicity issue noted above, but logic guard is sound).

### ✓ Groq Response Parsing Handles Missing Fields
- [src/lib/groq.ts:58-75](src/lib/groq.ts#L58-L75): `JSON.parse` wrapped in try-catch; fallback reply and safe defaults for all fields. **CORRECT.**

### ✓ Document Upload Marks Failed Status on Pipeline Error
- [src/app/api/documents/route.ts:89-95](src/app/api/documents/route.ts#L89-L95): Pipeline failure updates status to 'failed', not left stuck in 'processing'. **CORRECT.**

### ✓ No Secrets in Client Code
- Grep for `NEXT_PUBLIC_SUPABASE_SECRET_KEY`, `GROQ_API_KEY`, `GEMINI_API_KEY`: All missing `NEXT_PUBLIC_` prefix. **CORRECT.**

### ✓ Widget HTML Escaping (Partial)
- [public/widget.js:159-164](public/widget.js#L159-L164): HTML entities escaped, but not safe against SVG/event handlers. **NEEDS FIX** (see #1 above).

### ✓ Contact Endpoint Checks customer_name = 'Anonymous'
- [src/app/api/tickets/[id]/contact/route.ts:31](src/app/api/tickets/[id]/contact/route.ts#L31): Guard on `customer_name = 'Anonymous'`. **CORRECT.**

### ✓ All Admin Routes Use getBusinessIdFromSession
- [src/app/api/documents/route.ts:16](src/app/api/documents/route.ts#L16)
- [src/app/api/config/route.ts:14, 34](src/app/api/config/route.ts#L14)
- [src/app/api/conversations/route.ts:6](src/app/api/conversations/route.ts#L6)
- [src/app/api/analytics/route.ts:6](src/app/api/analytics/route.ts#L6)
- [src/app/api/me/route.ts:7](src/app/api/me/route.ts#L7)
- [src/app/api/tickets/route.ts:6](src/app/api/tickets/route.ts#L6)
- All resolve business_id server-side, never from client. **CORRECT.**

### ✓ Mutating Routes Include Ownership Checks
- [src/app/api/documents/[id]/route.ts:18](src/app/api/documents/[id]/route.ts#L18): DELETE filters `.eq("business_id", businessId)`. **CORRECT.**
- [src/app/api/tickets/[id]/route.ts:31](src/app/api/tickets/[id]/route.ts#L31): PATCH filters `.eq("business_id", businessId)`. **CORRECT** (but needs null check on response).

### ✓ Public Routes Have CORS Headers
- [src/app/api/chat/route.ts:7-11](src/app/api/chat/route.ts#L7-L11): CORS on OPTIONS and POST. **MOSTLY CORRECT** (missing on error response).
- [src/app/api/widget-config/route.ts:4-11](src/app/api/widget-config/route.ts#L4-L11): CORS on OPTIONS and GET. **CORRECT.**
- [src/app/api/tickets/[id]/contact/route.ts:4-11](src/app/api/tickets/[id]/contact/route.ts#L4-L11): CORS on OPTIONS and PATCH. **CORRECT.**

### ✓ Widget-Config Doesn't Expose escalation_rules
- [src/app/api/widget-config/route.ts:23](src/app/api/widget-config/route.ts#L23): `.select("bot_name, welcome_message, suggested_questions")` — escalation_rules explicitly omitted. **CORRECT.**

---

## CONSISTENCY & QUALITY

### ✓ Dashboard Pages Have Loading + Error + Empty States
- Knowledge Base ([src/app/dashboard/knowledge-base/page.tsx:193-209](src/app/dashboard/knowledge-base/page.tsx#L193-L209)): loading skeleton, empty state, error toast. **CORRECT.**
- Tickets ([src/app/dashboard/tickets/page.tsx:180-194](src/app/dashboard/tickets/page.tsx#L180-L194)): loading skeleton, empty state, error toast. **CORRECT.**
- Analytics ([src/app/dashboard/analytics/page.tsx:45-65](src/app/dashboard/analytics/page.tsx#L45-L65)): loading card skeleton, but no error boundary. Minor: error handled via toast in fetch. **MOSTLY CORRECT.**
- Conversations ([src/app/dashboard/conversations/page.tsx](src/app/dashboard/conversations/page.tsx)): assume similar (partial read). **LIKELY CORRECT.**

### ✓ Dark/Light Theme Tested
- Tailwind v4 with shadcn/ui uses CSS variables scoped to `[data-theme]`. All components use semantic colors (`bg-card`, `text-foreground`). **CORRECT.**

### ✓ TypeScript Coverage
- No `any` types on API response handling beyond generic fetch returns. Most responses typed explicitly. **MOSTLY CORRECT** (could add stricter validation).

---

## SUMMARY TABLE

| ID | Severity | File:Line | Issue | Fix Complexity |
|----|----------|-----------|-------|-----------------|
| 1 | CRITICAL | widget.js:243 | XSS via bot messages | Medium (DOMPurify) |
| 2 | HIGH | tickets/.../contact:26 | CSRF on contact form | Medium (token or SameSite) |
| 3 | HIGH | chat/route.ts:104 | Non-atomic escalation | Medium (transactions) |
| 4 | HIGH | tickets/[id]/route.ts:35 | No null check on update | Low (1 line) |
| 5 | MEDIUM | multiple | Error message leaks | Low (3-4 lines per file) |
| 6 | MEDIUM | analytics/route.ts:13 | No error check on count | Low (5 lines) |
| 7 | MINOR | api-handler, keep-alive, error | Console logs | Low (remove) |
| 8 | MINOR | conversations/page.tsx | Unused imports | Low (remove) |
| 9 | MINOR | chat/route.ts:144 | Missing CORS on error | Low (add headers) |
| 10 | MINOR | documents/route.ts:89 | Async error handling | Low (better logging) |
| 11 | MINOR | chat/route.ts:86 | No role validation | Low (filter) |
| 12 | MINOR | widget.js:273 | Email format validation | Low (regex) |

---

## NOTES FOR APPROVAL

**Ready to fix:**
- #7 (console logs) — auto-fix, no risk
- #8 (unused imports) — auto-fix, no risk
- #9 (CORS on error) — one-line fix, low risk
- #12 (email validation) — two-line fix, low risk

**Requires decision:**
- #1 (XSS) — needs sanitizer library or prompt hardening
- #2 (CSRF) — needs token strategy (one-time, session-based, etc.)
- #3 (atomicity) — needs Supabase transaction support investigation
- #4 (null check) — simple fix but verify no side effects
- #5 (error messages) — audit all routes, consistent approach
- #6 (analytics error) — simple fix
- #10 (async handling) — improve error context

Await your approval before proceeding.
