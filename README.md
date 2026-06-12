# SupportAI — AI Customer Support Assistant Platform

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue?logo=typescript)](https://www.typescriptlang.org)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green?logo=supabase)](https://supabase.com)
[![Tailwind](https://img.shields.io/badge/Tailwind-CSS-38b2ac?logo=tailwind-css)](https://tailwindcss.com)

A multi-tenant SaaS platform that lets any business create and deploy an AI-powered customer support assistant trained on their own knowledge base. The assistant answers customer questions from uploaded documents using a raw RAG pipeline, automatically escalates important issues, creates support tickets with priority, and ships as a one-line embeddable chat widget.

**Live:** [support-bot-phi.vercel.app](https://support-bot-phi.vercel.app) · **Admin sign-in:** [/login](https://support-bot-phi.vercel.app/login) · **Security audit:** [AUDIT_FINDINGS.md](AUDIT_FINDINGS.md)

---

## Demo Access

| Tenant | Login | Knowledge Base | Bot |
|---|---|---|---|
| **Acme Corp** (electronics retail) | `demo@acmecorp.test` / `Demo@1234` | [sample-data/acme-kb.txt](sample-data/acme-kb.txt) | AcmeBot |
| **FitFuel** (sports nutrition) | `demo@fitfuel.test` / `Demo@1234` | [sample-data/fitfuel-kb.txt](sample-data/fitfuel-kb.txt) | FuelBot |

Both tenants are pre-seeded with conversations, escalated tickets, and filled contact details. Each bot answers **only** from its own knowledge base — ask FitFuel's bot about laptop warranties to see tenant isolation in action.

**Acme test prompts:**
- "What payment methods do you accept?" — direct KB answer
- "Is COD available for a ₹60,000 order?" — retrieval precision (the limit is ₹50,000)
- "My laptop arrived broken, I want a refund now" — escalation + ticket + contact form
- "Write me a Python script" — boundary test; the bot politely refuses off-topic requests

**FitFuel test prompts:**
- "How do I take creatine?" — usage guidance from KB
- "Can I get a refund on opened protein?" — Taste Guarantee policy
- "Do you ship internationally?" — India-only answer

Embed the widget on any website:

```html
<script
  src="https://support-bot-phi.vercel.app/widget.js"
  data-business-id="YOUR_BUSINESS_ID"
  data-api-url="https://support-bot-phi.vercel.app"
></script>
```

---

## Table of Contents

- [Demo Access](#demo-access)
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
- [Project Structure](#project-structure)

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

---

## Tech Stack & Decisions

| Layer | Choice | Why |
|---|---|---|
| Frontend + Backend | Next.js 16 (App Router, TypeScript) | One codebase, one deploy; API routes as backend |
| Database | PostgreSQL (Supabase) | Relational data + vector search in a single database; strong consistency guarantees |
| Vector store | pgvector | Tenant filter (`WHERE business_id`) and cosine similarity in the same SQL query — impossible with external vector DBs without app-level joins |
| Auth | Supabase Auth | Login, registration, password reset out of the box; session cookies verified server-side |
| Chat LLM | Groq — `llama-3.3-70b-versatile` | Fast inference, JSON mode for structured escalation output, free tier sufficient for assessment |
| Embeddings | Gemini — `gemini-embedding-001` (768 dims) | Free tier; Groq does not offer an embeddings endpoint |
| UI | Tailwind v4 + shadcn/ui | Linear-style dark/light dashboard with ⌘K command palette; theming via CSS variables |
| Widget | Vanilla JS, zero dependencies | Must run on arbitrary host pages; IIFE pattern prevents global scope pollution |

**Deliberate omissions** (documented, not forgotten):
- **Background job queue** — synchronous ingestion is simpler and sufficient for the 2-day scope; see [Production Next Steps](#known-limitations--production-next-steps)
- **LangChain** — the raw ~150-line RAG implementation is clearer, fully explainable, and more testable than a framework
- **Pinecone/Weaviate** — pgvector satisfies multi-tenancy filtering without an extra service or vendor lock-in
- **OAuth** — email/password covers the requirement; OAuth providers are a config toggle in Supabase

---

## How the RAG Pipeline Works

The pipeline is implemented raw (~150 lines total in `src/lib/`), not via a framework, so every step is inspectable.

**Ingestion** (`POST /api/documents`):

1. **Parse** — `pdf-parse` (PDF), `mammoth` (DOCX), or direct read (TXT/MD) → clean text ([lib/parser.ts](src/lib/parser.ts))
2. **Chunk** — ~1500-char windows with 200-char overlap, breaking at paragraph/sentence boundaries when possible ([lib/chunker.ts](src/lib/chunker.ts))
3. **Embed** — one batched Gemini call per document → 768-dim vectors ([lib/embeddings.ts](src/lib/embeddings.ts))
4. **Store** — rows in the `chunks` table with a `vector(768)` column; the document row tracks `processing → ready/failed` status

**Query** (`POST /api/chat`):

1. **Embed** the customer's question with the same model
2. **Search** via a Postgres function (`match_chunks`): pgvector's `<=>` cosine operator, filtered by `business_id`, top 5 chunks
3. **Build the system prompt:** bot identity + personality + retrieved chunks + admin-configured escalation rules + a strict "answer only from the knowledge base" boundary
4. **Replay** the last 20 messages of the session for conversational context; call Groq in JSON mode
5. **Act** on the structured reply: save the assistant message, evaluate escalation, create a ticket if needed

**Anti-hallucination safeguards:**
- The model answers **only from retrieved chunks**; off-topic requests (code, math, general knowledge) are refused with a boundary statement
- Empty or irrelevant retrieval triggers escalation with reason `no_answer_found`
- Documents are the single source of truth; system prompts are never exposed to visitors

---

## Intelligent Escalation

Instead of keyword matching, escalation is a **structured decision made by the LLM** in the same call that generates the answer:

```json
{
  "reply": "I'm sorry your laptop arrived damaged. Per our policy...",
  "should_escalate": true,
  "priority": "high",
  "reason": "refund requested for damaged product"
}
```

**Key behaviors:**

- The admin's **escalation rules are plain text**, edited in Settings and injected verbatim into the system prompt — changing bot behavior requires no code and no restart
- On escalation: a ticket is created with the LLM-assigned priority, the conversation is flagged, and a system event message ("Ticket created — priority: high") is stored in conversation history
- A **duplicate guard** ensures one conversation produces at most one ticket, no matter how many follow-up messages arrive (idempotent via the `escalated` flag)
- The widget then shows an inline **contact form**; submitting fills the ticket's customer name/email via a one-shot public endpoint that only updates tickets still marked `Anonymous`
- Informational questions that the bot answers successfully do **not** escalate — only action requests, problems, and rule matches do

---

## Multi-Tenancy & Security Model

Every tenant-owned table carries a `business_id`. **Isolation is enforced at the API layer:**

**Admin routes** never trust a client-supplied `business_id`:
- `getBusinessIdFromSession()` resolves the tenant from the Supabase session cookie (`auth.users.id → businesses.owner_id → businesses.id`)
- All queries filter on that server-resolved value
- Business A's admin **cannot** read or mutate Business B's data, even with knowledge of B's UUIDs
- Cross-tenant probes return 404/401 — indistinguishable from non-existent resources

**Public routes** (`/api/chat`, `/api/widget-config`, `/api/tickets/[id]/contact`) accept `business_id` explicitly because widget visitors are anonymous:
- They expose only intentionally-public surfaces: chat, display config (bot name, welcome message, suggested questions — never escalation rules), and one-time contact fill
- The widget's `business_id` being visible in page source is by design — the same model as Intercom/Crisp workspace IDs; it grants access **only** to the public chat surface

**Atomic provisioning:**
- Signup fires a `plpgsql` trigger that creates the business row + default bot config in the same transaction as the `auth.users` insert — no half-registered states

**Vector search isolation:**
- The similarity query includes the `business_id` filter **inside** the `match_chunks` function — retrieval can never leak another tenant's documents

**RLS not used:** all DB access goes through the server with the admin key; isolation is enforced consistently at the API layer. In production, RLS would be added as defense-in-depth.

---

## API Reference

### Public (CORS-enabled, used by the widget)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/chat` | None | Main chat endpoint. **Body:** `{ business_id, session_id, message }`. **Returns:** `{ reply, escalated, ticket_created, ticket_id }`. Creates conversation/message rows and tickets as needed. The session ID persists in client localStorage across reloads. |
| `GET` | `/api/widget-config?business_id=...` | None | Display config only: `{ bot_name, welcome_message, suggested_questions }`. **Never exposes** escalation rules, personality, or prompts. |
| `PATCH` | `/api/tickets/[id]/contact` | None | One-shot contact fill from the widget form. **Body:** `{ customer_name, customer_email, business_id }`. **Guarded:** updates only tickets whose `customer_name == 'Anonymous'` and whose `business_id` matches; also syncs the parent conversation. |
| `GET` | `/api/health` | None | Health check. Returns `{ ok: true }`. |

### Admin (session-authenticated; tenant resolved server-side)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/me` | Returns the logged-in admin's `{ business_id }`. Used by the widget snippet page. |
| `GET` | `/api/documents` | List knowledge-base documents with status and chunk counts. |
| `POST` | `/api/documents` | Multipart upload (`file` field). Runs the full ingestion pipeline **synchronously**; document status reflects `processing/ready/failed`. Failed uploads are marked `failed`, never stuck in `processing`. |
| `DELETE` | `/api/documents/[id]` | Delete a document; chunks cascade via FK. Ownership enforced. |
| `GET` | `/api/tickets?status=...&priority=...` | List tickets with optional filters. |
| `PATCH` | `/api/tickets/[id]` | Update ticket status: `open`, `in_progress`, `resolved`, `closed` (validated). Ownership enforced; non-owned IDs return 404. |
| `GET` | `/api/conversations` | **Three modes:** no params → list all; `?search=...` → full-text search over message content; `?conversation_id=...` → full message thread including system events. |
| `GET` | `/api/config` | Full bot config for the settings page. |
| `PUT` | `/api/config` | Update bot config (name, welcome message, personality, escalation rules, suggested questions). Takes effect on the next chat message — no restart. |
| `GET` | `/api/analytics` | Aggregates: total conversations, ticket counts by status, escalation rate, AI resolution rate. Three queries run in parallel. |

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
    │            bot_name, welcome_message, personality,
    │            escalation_rules, suggested_questions (jsonb)
    │
    ├── 1:N ──► documents
    │            filename, file_type,
    │            status (processing|ready|failed), chunk_count
    │            [index: business_id]
    │                 │ 1:N (cascade)
    │                 ▼
    ├── 1:N ──► chunks
    │            content, embedding vector(768)
    │            [index: business_id]
    │
    ├── 1:N ──► conversations
    │            session_id, customer_name, customer_email, escalated
    │            [unique: (session_id, business_id)]
    │                 │ 1:N (cascade)
    │                 ▼
    ├── 1:N ──► messages
    │            role (user|assistant|system), content
    │            [index: (conversation_id, created_at)]
    │
    └── 1:N ──► tickets
                 conversation_id, customer_name, customer_email, query,
                 priority (urgent|high|medium|low),
                 status (open|in_progress|resolved|closed)
                 [index: (business_id, status)]
```

**Design notes:**

- `chunks.business_id` is deliberately denormalized (also reachable via `document_id`) so the similarity query filters tenants **without a join**
- Status/priority columns use `text + CHECK` constraints rather than native enums for painless migration; values that code branches on are constrained, free-text prompt inputs (personality) are not
- The `(session_id, business_id)` composite unique on conversations prevents a visitor's session on one site from leaking messages into another tenant — a real bug caught and fixed during E2E testing
- `match_chunks` runs similarity filtering and ranking in the database via pgvector's `<=>` operator, not in application code

---

## User Flows

**Business admin:**
1. Register (business name captured → trigger provisions the tenant) → Dashboard
2. **Knowledge Base** → drag-and-drop PDF/DOCX/TXT/MD → watch status: `processing` → `ready` or `failed`
3. **Settings** → name the bot, set personality, edit escalation rules, manage suggested questions
4. **Get Widget Code** → copy the snippet → paste into any website
5. **Tickets** → triage by priority/status, update statuses; **Conversations** → search and read full threads with system events; **Analytics** → resolution and escalation rates

**Customer (widget visitor):**
1. Opens the host website → chat bubble bottom-right → greeted with the configured welcome message and suggested questions
2. Asks a question → answer generated strictly from the business's knowledge base, with markdown formatting (lists, tables, links, bold)
3. If the issue matches escalation rules OR the KB has no answer → ticket auto-created with LLM-assigned priority → inline form collects name/email
4. Session persists in localStorage — returning visitors continue the same conversation with full context

---

## Local Setup

**Prerequisites:** Node 20+, a Supabase project, Groq + Gemini API keys (both free tier).

```bash
git clone https://github.com/dahiya001rohit/support-bot.git
cd support-bot
npm install
cp .env.example .env.local   # fill in the values below
```

**.env.local:**

```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SECRET_KEY=sb_secret_...                         # server-only, never NEXT_PUBLIC_
GROQ_API_KEY=gsk_...                                      # console.groq.com
GEMINI_API_KEY=AIza...                                    # aistudio.google.com
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Database setup** — run [schema.sql](schema.sql) once in the Supabase SQL Editor. It creates, in dependency order: the pgvector extension, all tables with constraints and indexes, the `match_chunks` similarity function, and the `handle_new_user` signup trigger.

```bash
npm run dev
```

Visit `http://localhost:3000` → register a business → upload [sample-data/acme-kb.txt](sample-data/acme-kb.txt) → grab the snippet from **Get Widget Code** → drop it into any local HTML file to test the widget end to end.

---

## Security Audit

A full security and quality audit was conducted before submission — see [AUDIT_FINDINGS.md](AUDIT_FINDINGS.md) for every finding, its severity, and the fix.

**Highlights (all resolved):**
- Widget XSS hardening: escape-before-format pipeline verified against injected payloads in knowledge-base documents
- Ownership enforcement: mutating routes return 404 on non-owned resources instead of silently "succeeding"
- Generic error responses: database error strings no longer leak schema details to clients
- CORS on all response paths of public endpoints, including errors
- Defensive LLM output parsing: invalid priorities, missing fields, and JSON parse failures all degrade safely

**Documented accepted risks** (with mitigations and production next steps): unauthenticated contact endpoint (one-shot, UUID-guarded), non-transactional escalation block, and absent rate limiting — details in the audit file.

---

## Known Limitations & Production Next Steps

Honest scoping decisions for the 2-day window, with the production path for each:

| Limitation | Impact | Production Next Step |
|---|---|---|
| **Synchronous document processing** | Uploads block the request; ~5s for a 10-page PDF | Background queue (BullMQ) with status polling — the schema already supports it |
| **Exact-scan vector search** | Fine up to ~10K chunks | HNSW index on the embedding column for approximate NN search |
| **Prompt-level guardrails only** | Injection resistance is good but not perfect at this model tier | Output validation layer + content filters |
| **No rate limiting on public endpoints** | Spam risk on chat | Per-session/IP limits (Upstash); per-business domain allowlist checked against `Origin` |
| **Supabase default SMTP** | Reset emails are slow, may land in spam | Custom SMTP (Resend) with templated emails |
| **Re-index = delete + re-upload** | Original files not persisted | Store originals in Supabase Storage; re-run the pipeline in place |
| **Single-role RBAC (owner only)** | No team collaboration | Member invitations with a role column; platform-level super-admin view |
| **No human handoff notifications** | Escalated tickets don't alert humans | Email/Slack alerts, triage queue with SLA tracking |

**Scoped out in favor of depth:** WhatsApp integration, email-to-ticket gateway, visual escalation-rule builder.

---

## Project Structure

```
src/
├── app/
│   ├── (auth)/                  # login, register, forgot-password, reset-password
│   ├── dashboard/               # admin UI
│   │   ├── analytics/page.tsx   # KPIs: conversations, escalation rate, ticket breakdown
│   │   ├── conversations/page.tsx  # search threads, full message history
│   │   ├── knowledge-base/page.tsx # upload, list, delete documents
│   │   ├── settings/page.tsx    # bot name, personality, escalation rules, suggestions
│   │   ├── tickets/page.tsx     # triage by priority/status
│   │   ├── widget/page.tsx      # embed snippet with copy button
│   │   ├── layout.tsx           # sidebar, theme toggle, ⌘K palette
│   │   └── page.tsx             # stats overview
│   ├── api/                     # all routes documented above
│   ├── page.tsx                 # landing page
│   ├── layout.tsx               # root layout, theme provider
│   ├── globals.css              # Tailwind v4 + theme variables
│   ├── error.tsx                # error boundary
│   └── not-found.tsx            # 404 page
├── lib/
│   ├── auth.ts                  # getBusinessIdFromSession()
│   ├── parser.ts                # file → text (pdf/docx/txt/md)
│   ├── chunker.ts               # text → overlapping chunks
│   ├── embeddings.ts            # Gemini embed (single + batch)
│   ├── groq.ts                  # chat completion + defensive JSON parsing
│   ├── rag.ts                   # vector search + system prompt builder
│   ├── api-handler.ts           # route error wrapping
│   ├── database.types.ts        # Supabase-generated types
│   └── supabase/                # browser + admin clients
├── components/
│   ├── ui/                      # shadcn/ui components
│   └── dashboard/               # sidebar nav, command palette
├── middleware.ts                # /dashboard auth guard
public/
└── widget.js                    # embeddable chat widget (vanilla JS)
sample-data/
├── acme-kb.txt                  # demo KB — Acme Corp (electronics)
└── fitfuel-kb.txt               # demo KB — FitFuel (nutrition)
schema.sql                       # complete database setup (run once)
AUDIT_FINDINGS.md                # security & quality audit with fixes
```