# SupportAI — AI Customer Support Assistant Platform

A multi-tenant SaaS platform that lets any business create and deploy an AI-powered customer support assistant trained on their own knowledge base. The assistant answers customer questions from uploaded documents using a raw RAG pipeline, automatically escalates important issues, creates support tickets with priority, and ships as a one-line embeddable chat widget.

**Live URL:** https://YOUR-DEPLOY-URL.vercel.app
**Demo credentials:** see [Demo Access](#demo-access)

Built for the Magentic AI engineering assessment.

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Tech Stack & Decisions](#tech-stack--decisions)
- [How the RAG Pipeline Works](#how-the-rag-pipeline-works)
- [Intelligent Escalation](#intelligent-escalation)
- [Multi-Tenancy & Security Model](#multi-tenancy--security-model)
- [API Reference](#api-reference)
- [Database Schema (ER Diagram)](#database-schema-er-diagram)
- [User Flows](#user-flows)
- [Local Setup](#local-setup)
- [Demo Access](#demo-access)
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

---

## Tech Stack & Decisions

| Layer | Choice | Why |
|---|---|---|
| Frontend + Backend | Next.js 16 (App Router, TypeScript) | One codebase, one deploy; API routes as backend; JD-preferred stack |
| Database | PostgreSQL (Supabase) | Relational data + vector search in a single database |
| Vector store | pgvector | Tenant filter (`WHERE business_id`) and cosine similarity in the same SQL query — impossible with an external vector DB without app-level joins |
| Auth | Supabase Auth | Login, registration, and password reset out of the box; session cookies verified server-side |
| Chat LLM | Groq — `llama-3.3-70b-versatile` | Fast inference, JSON mode for structured escalation output |
| Embeddings | Gemini — `gemini-embedding-001` (768 dims) | Free tier; Groq does not offer an embeddings endpoint |
| UI | Tailwind v4 + shadcn/ui | Linear-style dark/light dashboard with a ⌘K command palette |
| Widget | Vanilla JS, zero dependencies | Must run on arbitrary host pages; an IIFE that leaks nothing into the host's global scope |

**Deliberate omissions** (documented, not forgotten): background job queue, LangChain, Pinecone, OAuth — see [Production Next Steps](#known-limitations--production-next-steps).

---

## How the RAG Pipeline Works

The pipeline is implemented raw (~150 lines total in `src/lib/`), not via a framework, so every step is inspectable.

**Ingestion** (`POST /api/documents`):

1. **Parse** — `pdf-parse` (PDF), `mammoth` (DOCX), or direct read (TXT/MD) → clean text (`lib/parser.ts`)
2. **Chunk** — ~1500-char windows with 200-char overlap, breaking at paragraph/sentence boundaries when possible (`lib/chunker.ts`)
3. **Embed** — one batched Gemini call per document → 768-dim vectors (`lib/embeddings.ts`)
4. **Store** — rows in the `chunks` table with a `vector(768)` column; the document row tracks `processing → ready/failed` status

**Query** (`POST /api/chat`):

1. Embed the customer's question with the same model
2. Cosine similarity search via a Postgres function (`match_chunks`) using pgvector's `<=>` operator, filtered by `business_id`, top 5 chunks
3. Build a system prompt: bot identity + personality + retrieved chunks + admin-configured escalation rules + a strict "answer only from the knowledge base" boundary
4. Replay the last 20 messages of the session for conversational context, call Groq in JSON mode
5. Parse the structured reply and act on it (see Escalation below)

Anti-hallucination is handled at the prompt level: the model is instructed to answer only from retrieved chunks, refuse off-topic requests (code, math, general knowledge), and escalate with reason `no_answer_found` when the knowledge base doesn't cover the question.

---

## Intelligent Escalation

Instead of keyword matching, escalation is a structured decision made by the LLM in the same call that generates the answer:

```json
{
  "reply": "string (markdown supported)",
  "should_escalate": true,
  "priority": "urgent | high | medium | low",
  "reason": "refund requested"
}
```

- The admin's **escalation rules are plain text** edited in Settings and injected verbatim into the system prompt — changing bot behavior requires no code or restart.
- On escalation, a ticket is created with the LLM-assigned priority, the conversation is flagged, and a **system event message** ("Ticket created — priority: high") is stored in the conversation history.
- A **duplicate guard** ensures one conversation produces at most one ticket, no matter how many angry messages follow.
- The widget then shows an inline **contact form**; submitting fills the ticket's customer name/email via a one-shot public endpoint that only updates tickets still marked `Anonymous`.

---

## Multi-Tenancy & Security Model

Every tenant-owned table carries a `business_id`. Isolation is enforced at the API layer:

- **Admin routes** never trust a client-supplied business id. `getBusinessIdFromSession()` resolves the tenant from the Supabase session cookie (`owner_id → businesses.id`); all queries filter on that value. Business A's admin cannot read or mutate Business B's data even with knowledge of B's ids.
- **Public routes** (`/api/chat`, `/api/widget-config`, `/api/tickets/[id]/contact`) accept `business_id` explicitly because widget visitors are anonymous. They expose only intentionally-public surfaces: chat, display config (never escalation rules), and one-time contact fill.
- The widget's `business_id` being visible in page source is by design — the same model as Intercom/Crisp workspace IDs. It grants access only to the public chat surface.
- **Registration provisioning is atomic**: a `plpgsql` trigger on `auth.users` creates the business row and default bot config in the same transaction as signup — no half-registered states.
- Vector search is tenant-scoped *inside* the similarity query (`WHERE business_id = ...` in `match_chunks`), so retrieval can never leak another tenant's documents.

RLS is intentionally not used: all DB access goes through the server with the service key, and isolation is enforced consistently at the API layer. In production I would add RLS as defense-in-depth.

---

## API Reference

### Public (CORS-enabled, used by the widget)

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/chat` | Main chat endpoint. Body: `{ business_id, session_id, message }`. Runs RAG, replays history, returns `{ reply, escalated, ticket_created, ticket_id }`. Creates conversation/message rows and tickets as needed. |
| `GET` | `/api/widget-config?business_id=` | Display config only: `{ bot_name, welcome_message, suggested_questions }`. Internal fields (escalation rules) are never exposed. |
| `PATCH` | `/api/tickets/[id]/contact` | One-shot contact fill from the widget form. Body: `{ customer_name, customer_email, business_id }`. Guarded: updates only tickets whose `customer_name` is still `Anonymous` and whose `business_id` matches. Also syncs the parent conversation. |

### Admin (session-authenticated; tenant resolved server-side)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/me` | Returns the logged-in admin's `{ business_id }` (used by the widget snippet page). |
| `GET` | `/api/documents` | List knowledge-base documents with status and chunk counts. |
| `POST` | `/api/documents` | Multipart upload (`file`). Runs the full ingestion pipeline synchronously; document status reflects `processing/ready/failed`. |
| `DELETE` | `/api/documents/[id]` | Delete a document; its chunks cascade. Ownership enforced. |
| `GET` | `/api/tickets?status=&priority=` | List tickets with optional filters. |
| `PATCH` | `/api/tickets/[id]` | Update ticket status (`open / in_progress / resolved / closed`), validated. Ownership enforced. |
| `GET` | `/api/conversations` | Three modes: list all; `?search=` full-text search over message content; `?conversation_id=` returns the full message thread including system events. |
| `GET` | `/api/config` | Full bot config for the settings page. |
| `PUT` | `/api/config` | Update bot name, welcome message, personality, escalation rules, suggested questions (validated). Takes effect on the next chat message — no restart. |
| `GET` | `/api/analytics` | Aggregates: total conversations, ticket counts by status, escalation rate, AI resolution rate. Three queries run in parallel. |

---

## Database Schema (ER Diagram)

```
auth.users (Supabase)
    │ 1:1 (owner_id)            signup trigger creates ▼
    ▼
businesses ──────────────────────────────────────────────┐
    │ id, owner_id, name                                 │
    │                                                    │
    ├── 1:1 ──► bot_configs                              │
    │            bot_name, welcome_message, personality, │
    │            escalation_rules, suggested_questions   │
    │                                                    │
    ├── 1:N ──► documents                                │
    │            filename, file_type,                    │
    │            status(processing|ready|failed),        │
    │            chunk_count                              │
    │                 │ 1:N (cascade)                    │
    │                 ▼                                  │
    ├── 1:N ──► chunks                                   │
    │            content, embedding vector(768)          │
    │            [idx: business_id]                      │
    │                                                    │
    ├── 1:N ──► conversations                            │
    │            session_id, customer_name/email,        │
    │            escalated                                │
    │            [unique: (session_id, business_id)]     │
    │                 │ 1:N (cascade)                    │
    │                 ▼                                  │
    ├── 1:N ──► messages                                 │
    │            role(user|assistant|system), content    │
    │            [idx: conversation_id, created_at]      │
    │                                                    │
    └── 1:N ──► tickets                                  │
                 conversation_id, customer_name/email,   │
                 query, priority(urgent|high|medium|low),│
                 status(open|in_progress|resolved|closed)│
                 [idx: business_id, status]              │
```

Notes:
- `chunks.business_id` is deliberately denormalized (also reachable via `document_id`) so the similarity query filters tenants without a join.
- Status/priority columns use `text + CHECK` constraints rather than native enums for painless mid-sprint migration; values that code branches on are constrained, free-text prompt inputs (personality) are not.
- The `(session_id, business_id)` composite unique on conversations prevents a visitor's session on one site from leaking messages into another tenant (a real bug caught during E2E testing).

---

## User Flows

**Business admin:**
1. Register (business name captured at signup → trigger provisions tenant) → Dashboard
2. Knowledge Base → drag-and-drop a PDF/DOCX/TXT/MD → watch it process into chunks
3. Settings → name the bot, set personality, edit escalation rules and suggested questions
4. Get Widget Code → copy the snippet → paste into any website
5. Tickets → triage by priority/status, update statuses; Conversations → search and read full threads; Analytics → resolution and escalation rates

**Customer (widget visitor):**
1. Opens the host website → chat bubble bottom-right → clicks → greeted with the configured welcome message and suggested questions
2. Asks a question → answer generated strictly from the business's knowledge base, with markdown (lists, tables, links)
3. If the issue matches escalation rules (or the KB has no answer) → ticket auto-created with priority → inline form collects their name/email → "Our team will reach out"
4. Session persists in localStorage — returning visitors continue the same conversation with full context

**Embedding the widget:**

```html
<script
  src="https://YOUR-DEPLOY-URL.vercel.app/widget.js"
  data-business-id="YOUR_BUSINESS_ID"
  data-api-url="https://YOUR-DEPLOY-URL.vercel.app"
></script>
```

---

## Local Setup

**Prerequisites:** Node 20+, a Supabase project, Groq + Gemini API keys (both free tier).

```bash
git clone https://github.com/YOUR_USERNAME/support-ai.git
cd support-ai
npm install
cp .env.example .env   # fill in the values below
```

`.env`:

```
NEXT_PUBLIC_SUPABASE_URL=          # Supabase → Settings → API
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=               # server-only, never NEXT_PUBLIC_
GROQ_API_KEY=                      # console.groq.com
GEMINI_API_KEY=                    # aistudio.google.com
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Database setup** — run `schema.sql` in the Supabase SQL editor (enables pgvector, creates all tables, the `match_chunks` similarity function, and the signup trigger).

```bash
npm run dev
```

Visit `http://localhost:3000`, register a business, upload `sample-data/acme-kb.txt`, and grab your widget snippet from **Get Widget Code**. Drop it into any local HTML file to test the widget end to end.

---

## Demo Access

| | |
|---|---|
| Live app | https://YOUR-DEPLOY-URL.vercel.app |
| Demo admin | `demo@example.com` / `PASSWORD_HERE` |
| Sample KB | `sample-data/acme-kb.txt` (already uploaded to the demo account) |

The demo account is pre-seeded with a knowledge base, several conversations (including escalated ones with filled contact details), and tickets across priorities. A second business account exists to demonstrate tenant isolation — its bot answers only from its own documents.

Suggested test prompts for the widget:
- "What payment methods do you accept?" — direct KB answer
- "Is COD available for a ₹60,000 order?" — tests retrieval precision (answer: no, the limit is ₹50,000)
- "My laptop arrived broken, I want a refund now" — triggers escalation, ticket, and the contact form
- "Write me a Python script" — boundary test; the bot politely refuses off-topic requests

---

## Known Limitations & Production Next Steps

Honest scoping decisions for the 2-day window, with the production path for each:

- **Synchronous document processing** — uploads block the request for large files. Next: background queue (BullMQ/worker) with status polling already supported by the schema.
- **Exact-scan vector search** — fine at thousands of chunks. Next: HNSW index on the embedding column for approximate search at scale.
- **Prompt-level guardrails only** — injection resistance is good but not perfect at this model tier. Next: output validation layer and content filters.
- **No rate limiting on public endpoints** — Next: per-session/IP limits (Upstash) plus a per-business domain allowlist checked against the `Origin` header.
- **Supabase default SMTP** for password reset emails — functional but slow and may land in spam. Next: custom SMTP (Resend).
- **Re-index = delete + re-upload** — original files aren't stored. Next: persist originals in Supabase Storage and re-run the pipeline in place.
- **RBAC is single-role** (one owner per business). Next: member invitations with role column; platform-level super-admin view.
- **Skipped bonus integrations** (WhatsApp, email-to-ticket, human handoff) in favor of depth on the core pipeline, tenant isolation, and contact capture.

---

## Project Structure

```
src/
├── app/
│   ├── (auth)/                  # login, register, forgot-password
│   ├── dashboard/               # admin UI (stats, KB, tickets, conversations, analytics, settings, widget)
│   ├── api/                     # all routes documented above
│   └── page.tsx                 # landing
├── lib/
│   ├── parser.ts                # file → text
│   ├── chunker.ts               # text → overlapping chunks
│   ├── embeddings.ts            # Gemini embed (single + batch)
│   ├── groq.ts                  # chat completion + structured JSON parsing
│   ├── rag.ts                   # vector search + system prompt builder
│   ├── auth.ts                  # session → business_id resolution
│   └── supabase/                # admin + browser clients
├── middleware.ts                # /dashboard protection
public/
└── widget.js                    # embeddable chat widget (vanilla JS)
sample-data/
└── acme-kb.txt                  # sample knowledge base
schema.sql                       # full database setup
```
