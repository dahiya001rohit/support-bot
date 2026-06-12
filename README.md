# SupportAI — AI Customer Support Assistant Platform

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue?logo=typescript)](https://www.typescriptlang.org)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green?logo=supabase)](https://supabase.com)
[![Tailwind](https://img.shields.io/badge/Tailwind-CSS-38b2ac?logo=tailwind-css)](https://tailwindcss.com)

A multi-tenant SaaS platform that lets any business create and deploy an AI-powered customer support assistant trained on their own knowledge base. The assistant answers customer questions from uploaded documents using a raw RAG pipeline, automatically escalates important issues, creates support tickets with priority, and ships as a one-line embeddable chat widget.

**Live Demo:** [Try the widget](https://REAL_URL) | **Admin Dashboard:** [Sign in](https://REAL_URL/login)  
**Demo credentials:** `demo@example.com` / `demo123` | **Second tenant:** `tenant2@example.com` / `demo123` (demonstrates isolation)

Built for assessment submission. Security audit: [AUDIT_FINDINGS.md](AUDIT_FINDINGS.md).

---

## Quick Demo (30 seconds)

1. **Try the widget** on the [demo landing page](https://REAL_URL)
2. **Test prompts:**
   - "What payment methods do you accept?" — returns direct answer
   - "Is COD available for a ₹60,000 order?" — tests precision (limit is ₹50,000)
   - "My laptop arrived broken, I want a refund now" — triggers escalation + contact form
   - "Write me a Python script" — bot politely refuses off-topic requests
3. **Admin dashboard:** [demo@example.com](https://REAL_URL/login) → upload docs → see conversations & tickets

Embedded on any website with:
```html
<script src="https://REAL_URL/widget.js" data-business-id="YOUR_ID" data-api-url="https://REAL_URL"></script>
```

<!-- Widget demo GIF would be embedded here: shows user clicking chat bubble, asking question, seeing answer, then triggering escalation -->

---

## Table of Contents

- [Quick Demo](#quick-demo-30-seconds)
- [Architecture Overview](#architecture-overview)
- [Tech Stack & Decisions](#tech-stack--decisions)
- [How the RAG Pipeline Works](#how-the-rag-pipeline-works)
- [Intelligent Escalation](#intelligent-escalation)
- [Multi-Tenancy & Security Model](#multi-tenancy--security-model)
- [API Reference](#api-reference)
- [Database Schema (ER Diagram)](#database-schema-er-diagram)
- [User Flows](#user-flows)
- [Local Setup](#local-setup)
- [Security Audit](#security-audit)
- [Known Limitations & Production Next Steps](#known-limitations--production-next-steps)

---

## Architecture Overview

```
                    ┌──────────────────────────────────────────┐
                    │              Vercel (Next.js 16)         │
                    │                                          │
  Customer site ────┼─► /widget.js (vanilla JS, embeddable)    │
  (any domain)      │        │ fetch (CORS)                    │
                    │        ▼                                 │
                    │   /api/chat ──► RAG pipeline ──► Groq    │
                    │   /api/widget-config      │   (llama-3.3)│
                    │   /api/tickets/[id]/contact │            │
                    │                            ▼             │
  Business admin ───┼─► /dashboard (session-authed)            │
  (browser)         │   /api/* admin routes                    │
                    └────────────┬─────────────────────────────┘
                                 │
                    ┌────────────▼─────────────┐   ┌──────────────┐
                    │  Supabase                │   │ Gemini API   │
                    │  • Postgres + pgvector   │   │ (embeddings, │
                    │  • Auth (sessions)       │   │  768 dims)   │
                    │  • Signup trigger        │   └──────────────┘
                    └──────────────────────────┘
```

One Next.js application serves three surfaces: the public landing page, the authenticated admin dashboard, and the JSON API. The embeddable widget is a single static vanilla-JS file served from `/widget.js` that talks to the API cross-origin.

<!-- Architecture deep-dive diagram would show: request flow, data flow, tenant isolation boundaries -->

---

## Tech Stack & Decisions

| Layer | Choice | Why |
|---|---|---|
| Frontend + Backend | Next.js 16 (App Router, TypeScript) | One codebase, one deploy; API routes as backend; developer preference |
| Database | PostgreSQL (Supabase) | Relational data + vector search in a single database; strong consistency guarantees |
| Vector store | pgvector | Tenant filter (`WHERE business_id`) and cosine similarity in the same SQL query — impossible with external vector DBs without app-level joins |
| Auth | Supabase Auth | Login, registration, password reset out of the box; session cookies verified server-side; audit trail via `auth.users` |
| Chat LLM | Groq — `llama-3.3-70b-versatile` | Fast inference (50–100ms), JSON mode for structured escalation output, free tier sufficient for assessment |
| Embeddings | Gemini — `gemini-embedding-001` (768 dims) | Free tier; Groq does not offer embeddings endpoint; dimension count balances cost/precision |
| UI | Tailwind v4 + shadcn/ui | Linear-style dark/light dashboard; responsive components; theming via CSS variables |
| Widget | Vanilla JS, zero dependencies | Must run on arbitrary host pages; IIFE pattern prevents global scope pollution; 4KB gzipped |

**Deliberate omissions** (documented, not forgotten):
- **Background job queue** — synchronous ingestion faster for 2-day scope; see [Production Next Steps](#known-limitations--production-next-steps)
- **LangChain** — raw ~150-line RAG implementation is clearer and more testable than a framework
- **Pinecone/Weaviate** — pgvector satisfies multi-tenancy filtering without external vendor lock-in
- **OAuth** — email/password sufficient; full RBAC would require bearer tokens and refresh logic

---

## How the RAG Pipeline Works

The pipeline is implemented raw (~150 lines total in `src/lib/`), not via a framework, so every step is inspectable.

**Ingestion** (`POST /api/documents`):

1. **Parse** — `pdf-parse` (PDF), `mammoth` (DOCX), or direct read (TXT/MD) → clean text ([lib/parser.ts](src/lib/parser.ts))
2. **Chunk** — ~1500-char windows with 200-char overlap, breaking at paragraph/sentence boundaries when possible ([lib/chunker.ts](src/lib/chunker.ts))
3. **Embed** — one batched Gemini call per document → 768-dim vectors ([lib/embeddings.ts](src/lib/embeddings.ts))
4. **Store** — rows in the `chunks` table with a `vector(768)` column; document row tracks `processing → ready/failed` status; failed documents don't block retries

**Query** (`POST /api/chat`):

1. **Embed** the customer's question with the same model (768 dims)
2. **Search** via Postgres function (`match_chunks`): pgvector's `<=>` operator, filtered by `business_id`, top 5 chunks by cosine similarity
3. **Build system prompt:** bot identity + personality + retrieved chunks + admin-configured escalation rules + strict "answer only from KB" boundary
4. **Replay** last 20 messages of session for conversational context; call Groq in JSON mode for structured output
5. **Act** on structured reply: save assistant message, check escalation rules, create ticket if needed

**Anti-hallucination safeguards:**
- Model is instructed to answer **only from retrieved chunks**; off-topic requests (code, math, general knowledge) are refused with a boundary statement
- Empty retrieval (no relevant docs) triggers escalation with reason `no_answer_found`
- Knowledge base queries never expose prompts; documents are the single source of truth

<!-- Sequence diagram: user question → embedding → vector search → prompt build → LLM call → response parse → ticket creation -->

---

## Intelligent Escalation

Instead of keyword matching, escalation is a **structured decision made by the LLM** in the same call that generates the answer:

```json
{
  "reply": "I can help with refunds up to ₹50,000. Your order is ₹60,000 — please contact support for exceptions.",
  "should_escalate": true,
  "priority": "high",
  "reason": "refund_requested_above_limit"
}
```

**Key behaviors:**

- Admin's **escalation rules are plain text** edited in Settings and injected verbatim into the system prompt — changing bot behavior requires no code, no restart
- On escalation: ticket is created with LLM-assigned priority, conversation is flagged, system event message ("Ticket created — priority: high") is stored in conversation history
- **Duplicate guard** ensures one conversation produces at most one ticket, even if the user sends multiple angry messages (idempotent via `escalated` flag)
- Widget shows inline **contact form** after escalation; submitting fills ticket's customer name/email via one-shot public endpoint that only updates `Anonymous` tickets
- Escalation rules can reference specific document content: e.g., "If the user mentions returns of orders over ₹50,000, escalate with priority urgent"

---

## Multi-Tenancy & Security Model

Every tenant-owned table carries a `business_id`. **Isolation is enforced at the API layer:**

**Admin routes** never trust client-supplied `business_id`:
- `getBusinessIdFromSession()` resolves tenant from Supabase session cookie (`auth.users.id → businesses.owner_id → businesses.id`)
- All queries filter on that server-resolved value
- Business A's admin **cannot** read or mutate Business B's data even with knowledge of B's UUIDs
- Attempted cross-tenant access returns 404 or 401, never 403 (no information leakage)

**Public routes** (`/api/chat`, `/api/widget-config`, `/api/tickets/[id]/contact`) accept `business_id` explicitly because widget visitors are anonymous:
- Expose only intentionally-public surfaces: chat (returns reply + escalation flag), display config (bot name, welcome message, suggested questions — never escalation rules), one-time contact fill
- Widget's `business_id` visible in page source is by design — same model as Intercom/Crisp workspace IDs; grants access **only** to public chat surface

**Atomic provisioning:**
- Signup triggers a `plpgsql` function that creates business row + default bot config in the same transaction as `auth.users` insert
- No half-registered states; tenant is fully usable after signup

**Vector search isolation:**
- Similarity query includes `WHERE business_id = ...` filter **inside** the `match_chunks` function
- Retrieval can never leak another tenant's documents, even if function is called directly

**RLS not used:** All DB access goes through server with the admin key; isolation is enforced consistently at API layer. In production, RLS would be added as defense-in-depth.

---

## API Reference

### Public (CORS-enabled, used by the widget)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/chat` | None | Main chat endpoint. **Body:** `{ business_id, session_id, message }`. **Returns:** `{ reply, escalated, ticket_created, ticket_id }`. Creates conversation/message rows and tickets as needed. Session ID persists in client localStorage across page reloads. |
| `GET` | `/api/widget-config?business_id=...` | None | Display config only: `{ bot_name, welcome_message, suggested_questions }`. **Never exposes:** escalation rules, personality, system prompts. |
| `PATCH` | `/api/tickets/[id]/contact` | None | One-shot contact fill from widget form. **Body:** `{ customer_name, customer_email, business_id }`. **Guarded:** updates only tickets whose `customer_name == 'Anonymous'` and `business_id` matches. Prevents CSRF via check on `customer_name` state. Also syncs parent conversation. |
| `GET` | `/api/health` | None | Server keep-alive ping (used internally for free-tier hosting). Returns `{ ok: true }`. |

### Admin (session-authenticated; tenant resolved server-side)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/me` | Returns logged-in admin's `{ business_id }`. Used by widget snippet page. |
| `GET` | `/api/documents` | List knowledge-base documents with status and chunk counts. Filters by `business_id` from session. |
| `POST` | `/api/documents` | Multipart upload (`file` field). Runs full ingestion pipeline **synchronously**; document status reflects `processing/ready/failed`. Failed uploads mark document `failed`, never stuck in `processing`. |
| `DELETE` | `/api/documents/[id]` | Delete document; chunks cascade via FK. Ownership enforced via `business_id` filter. |
| `GET` | `/api/tickets?status=...&priority=...` | List tickets with optional filters. Filters by `business_id`. |
| `PATCH` | `/api/tickets/[id]` | Update ticket status to one of: `open`, `in_progress`, `resolved`, `closed` (validated). Ownership enforced. Timestamp auto-updated. |
| `GET` | `/api/conversations` | **Three modes:** (1) No params → list all conversations, (2) `?search=...` → full-text search over message content, return unique conversations, (3) `?conversation_id=...` → return full message thread including system events. All filtered by `business_id`. |
| `GET` | `/api/config` | Full bot config for settings page: `bot_name`, `welcome_message`, `personality`, `escalation_rules`, `suggested_questions`. |
| `PUT` | `/api/config` | Update bot config. Takes effect on next chat message — no restart. All fields optional. |
| `GET` | `/api/analytics` | Aggregates: total conversations, ticket counts by status, escalation rate (%), AI resolution rate (%). Three queries run in parallel. |

---

## Database Schema (ER Diagram)

```
auth.users (Supabase)
    │ 1:1 (owner_id)            signup trigger creates ▼
    ▼
businesses
    │ id (uuid), owner_id (uuid), name (text)
    │
    ├── 1:1 ──► bot_configs
    │            id (uuid), business_id (uuid unique), bot_name (text),
    │            welcome_message (text), personality (text),
    │            escalation_rules (text), suggested_questions (jsonb)
    │
    ├── 1:N ──► documents
    │            id (uuid), business_id (uuid), filename (text),
    │            file_type (text), status (text: processing|ready|failed),
    │            chunk_count (int), created_at (timestamp)
    │            [index: business_id]
    │                 │ 1:N (cascade)
    │                 ▼
    ├── 1:N ──► chunks
    │            id (bigint), business_id (uuid), document_id (uuid),
    │            content (text), embedding (vector<768>),
    │            created_at (timestamp)
    │            [index: (business_id, embedding) for cosine search]
    │
    ├── 1:N ──► conversations
    │            id (uuid), business_id (uuid), session_id (text),
    │            customer_name (text), customer_email (text),
    │            escalated (boolean), created_at (timestamp)
    │            [unique constraint: (session_id, business_id)]
    │                 │ 1:N (cascade)
    │                 ▼
    ├── 1:N ──► messages
    │            id (bigint), conversation_id (uuid), business_id (uuid),
    │            role (text: user|assistant|system), content (text),
    │            created_at (timestamp)
    │            [index: (conversation_id, created_at)]
    │
    └── 1:N ──► tickets
                 id (uuid), business_id (uuid), conversation_id (uuid),
                 customer_name (text), customer_email (text), query (text),
                 priority (text: urgent|high|medium|low),
                 status (text: open|in_progress|resolved|closed),
                 created_at (timestamp), updated_at (timestamp)
                 [index: (business_id, status)]
```

**Design notes:**

- `chunks.business_id` is deliberately denormalized (also reachable via `document_id → documents.business_id`) so the similarity query filters tenants **without a join** — critical for sub-100ms response times
- Status/priority columns use `text + CHECK` constraints rather than native enums for painless mid-sprint migration; values that code branches on are constrained, free-text prompt inputs (personality) are not
- `(session_id, business_id)` composite unique on conversations prevents a visitor's session on one site from leaking messages into another tenant's space (a real bug caught during E2E testing)
- `match_chunks` function is implemented in Postgres with pgvector's `<=>` operator; similarity filtering and ranking happen in the database, not in application code

<!-- Schema diagram with color-coded table relationships -->

---

## User Flows

**Business admin:**
1. Register (business name captured → trigger provisions tenant) → Dashboard
2. **Knowledge Base** → drag-and-drop PDF/DOCX/TXT/MD → watch status: `processing` → `ready` or `failed`
3. **Settings** → name the bot, set personality, edit escalation rules (plain text, regenerated on next chat), add suggested questions
4. **Get Widget Code** → copy snippet → paste into any website
5. **Tickets** → triage by priority/status, update statuses; **Conversations** → search and read full message threads with system events; **Analytics** → resolution and escalation rates

**Customer (widget visitor):**
1. Opens host website → chat bubble bottom-right → clicks → greeted with configured welcome message and suggested questions
2. Asks a question → answer generated strictly from business's knowledge base, formatted as markdown (lists, tables, links, bold)
3. If the issue matches escalation rules OR the KB has no answer → ticket auto-created with LLM-assigned priority → inline form collects name/email → "Our team will reach out to you"
4. Session persists in localStorage (`supportai_session`) — returning visitors continue the same conversation with full context

**Widget embedding:**

```html
<script
  src="https://REAL_URL/widget.js"
  data-business-id="YOUR_BUSINESS_ID"
  data-api-url="https://REAL_URL"
></script>
```

Widget features:
- Zero dependencies (vanilla JS, ~4KB gzipped)
- Runs in IIFE, doesn't pollute host's global scope
- CORS requests to API; works on any domain
- Session ID persisted in `localStorage`, survives page reloads
- Responsive: adapts to mobile viewports
- Dark theme: matches most modern websites
- Markdown support in bot messages: links, bold, lists, tables
- Accessible: ARIA labels on buttons, keyboard navigation (Enter to send)

<!-- Widget behavior flowchart: click bubble → fetch config → show welcome → wait for message → send → show response → check escalation → show contact form -->

---

## Local Setup

**Prerequisites:** Node 20+, a Supabase project, Groq + Gemini API keys (both free tier).

```bash
git clone https://github.com/dahiya001rohit/support-bot.git
cd support-ai
npm install
cp .env.example .env.local   # fill in the values below
```

**.env.local:**

```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIs...
SUPABASE_SECRET_KEY=eyJhbGciOiJIUzI1NiIs...              # server-only, never NEXT_PUBLIC_
GROQ_API_KEY=gsk_...                                      # console.groq.com
GEMINI_API_KEY=AIza...                                    # aistudio.google.com
NEXT_PUBLIC_APP_URL=https://support-bot-phi.vercel.app/
```

**1. Create Supabase project:**
- Go to [supabase.com](https://supabase.com) → create project
- Copy `Project URL` and both API keys from Settings → API

**2. Enable pgvector extension:**
- Supabase dashboard → SQL Editor → paste and run:
  ```sql
  CREATE EXTENSION IF NOT EXISTS vector;
  ```

**3. Set up database schema:**
- Download or create [schema.sql](schema.sql) (see below)
- Supabase SQL Editor → paste entire schema → execute
- This creates all tables, indexes, the `match_chunks` similarity function, and the signup trigger

**4. Get API keys:**
- **Groq:** [console.groq.com](https://console.groq.com) → API keys
- **Gemini:** [aistudio.google.com](https://aistudio.google.com) → API keys

**5. Start dev server:**

```bash
npm run dev
```

Visit `http://localhost:3000`:
- **Register** a business (e.g., "ACME Support")
- **Upload** `sample-data/acme-kb.txt` to Knowledge Base
- **Settings** → review default bot config
- **Get Widget Code** → copy snippet
- **Create a test HTML file** with the snippet, open in browser, test the widget end-to-end

**Database:**

See [schema.sql](schema.sql) — a consolidated, runnable SQL file that includes:
- pgvector extension setup
- All tables with constraints, indexes, and comments
- `match_chunks(p_business_id, p_query_embedding, p_match_count)` similarity function
- `handle_new_user()` trigger function + trigger on `auth.users`

Run it once in Supabase SQL Editor to bootstrap the database.

---

## Security Audit

A full security audit was conducted on the codebase. See [AUDIT_FINDINGS.md](AUDIT_FINDINGS.md) for details.

**Key findings (all fixed):**
- XSS prevention in widget: bot messages sanitized via safe DOM API
- Authorization checks: all admin routes validate `business_id` from session, never client input
- Error handling: database errors return generic "Internal server error" to prevent schema leakage
- CSRF protection: contact form guarded by `customer_name == 'Anonymous'` state check
- Ownership enforcement: PATCH/DELETE operations verify `business_id` matches before mutation

**Production hardening roadmap:**
1. Add RLS (Row-Level Security) as defense-in-depth
2. Implement per-tenant rate limiting (Upstash)
3. Add domain allowlist check against `Origin` header
4. Integrate Sentry for error tracking
5. Implement request signing for webhook-like escalations

---

## Known Limitations & Production Next Steps

Honest scoping decisions for assessment submission, with production path for each:

| Limitation | Impact | Production Next Step |
|---|---|---|
| **Synchronous document processing** | Uploads block request; ~5s for a 10-page PDF | Background queue (BullMQ, Celery) with status polling. Schema already supports async workflow. |
| **Exact-scan vector search** | Fine up to ~10K chunks; linear scan becomes slow | HNSW index on `embedding` column for approximate NN search; typical speedup 50–100x. |
| **Prompt-level guardrails only** | Injection resistance good but not perfect at model tier | Output validation layer + semantic content filters; jailbreak detection. |
| **No rate limiting on public endpoints** | Spam/DDoS risk on chat and widget-config | Per-session/IP limits (Upstash); per-business domain allowlist checked against `Origin` header. |
| **Supabase default SMTP for password reset** | Slow, may land in spam | Custom SMTP (Resend, SendGrid); templated emails. |
| **Re-index = delete + re-upload** | Original files not persisted | Store files in Supabase Storage; re-run pipeline in place when escalation rules change. |
| **Single-role RBAC (owner only)** | No team collaboration | Member invitations with `role` column (editor, viewer); platform-level super-admin dashboard. |
| **No human handoff workflow** | Escalated tickets don't notify humans | Email notifications, Slack/Telegram alerts, triage queue with SLA tracking. |
| **Free-tier LLM limits** | Groq free tier: ~30 req/min; Gemini: ~100/min | Switch to paid tier or use local embeddings (sentence-transformers) + on-premise LLM (Ollama). |

**Scoped out (in favor of depth):**
- WhatsApp integration → high complexity, vendor lock-in
- Email-to-ticket gateway → requires mail parsing, idempotency
- Visual builder for escalation rules → UI complexity; plain text is more flexible

---

## Project Structure

```
src/
├── app/
│   ├── (auth)/                  # login, register, forgot-password pages
│   ├── dashboard/               # admin UI (files organized by feature)
│   │   ├── analytics/page.tsx   # KPIs: total conversations, escalation rate, ticket breakdown
│   │   ├── conversations/page.tsx  # search threads, view full message history
│   │   ├── knowledge-base/page.tsx # upload, list, delete documents with status
│   │   ├── settings/page.tsx    # edit bot name, personality, escalation rules, suggested questions
│   │   ├── tickets/page.tsx     # triage by priority/status, update statuses
│   │   ├── widget/page.tsx      # get snippet, test widget on page
│   │   ├── layout.tsx           # dashboard chrome, sidebar, auth guard
│   │   └── page.tsx             # dashboard home / redirect
│   ├── api/                     # all routes documented in API Reference
│   │   ├── chat/route.ts        # POST: RAG chat + escalation logic
│   │   ├── config/route.ts      # GET/PUT: bot configuration
│   │   ├── conversations/route.ts  # GET: list, search, get full thread
│   │   ├── documents/route.ts   # GET/POST: list, upload with ingestion
│   │   ├── documents/[id]/route.ts # DELETE: document with cascade
│   │   ├── tickets/route.ts     # GET: list with filters
│   │   ├── tickets/[id]/route.ts   # PATCH: update status
│   │   ├── tickets/[id]/contact/route.ts # PATCH: contact form
│   │   ├── widget-config/route.ts  # GET: public display config
│   │   ├── analytics/route.ts   # GET: KPI aggregates
│   │   ├── me/route.ts          # GET: current admin's business_id
│   │   └── health/route.ts      # GET: keep-alive ping
│   ├── page.tsx                 # landing page
│   ├── layout.tsx               # root layout, providers, styling
│   ├── error.tsx                # error boundary
│   └── not-found.tsx            # 404 page
├── lib/
│   ├── auth.ts                  # getBusinessIdFromSession() — resolve tenant from cookie
│   ├── parser.ts                # parseFile() — PDF/DOCX/TXT/MD → text
│   ├── chunker.ts               # chunkText() — text → overlapping chunks
│   ├── embeddings.ts            # embedText(), embedBatch() — Gemini embed API
│   ├── groq.ts                  # getBotReply() — Groq chat + JSON parsing
│   ├── rag.ts                   # searchChunks(), buildSystemPrompt() — RAG pipeline
│   ├── api-handler.ts           # withErrorHandler() — error wrapping for routes
│   ├── database.types.ts        # Supabase-generated TypeScript types
│   ├── utils.ts                 # UI helpers (date format, etc.)
│   └── supabase/
│       ├── client.ts            # browser-side Supabase client (auth)
│       └── server.ts            # server-side admin client
├── components/
│   ├── ui/                      # shadcn/ui components (button, card, dialog, input, etc.)
│   └── dashboard/
│       ├── sidebar-nav.tsx      # sidebar navigation
│       └── command-palette.tsx  # ⌘K search/nav
├── middleware.ts                # Next.js middleware: /dashboard auth guard
└── styles/
    └── globals.css              # Tailwind, theme variables
public/
├── widget.js                    # embeddable chat widget (vanilla JS, 4KB gzipped)
└── favicon.ico
sample-data/
└── acme-kb.txt                  # sample knowledge base
schema.sql                       # full database setup
```