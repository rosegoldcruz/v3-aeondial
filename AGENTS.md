# AEON Dial v3 — Master Execution Contract

This is the convergence build. AEON Dial is no longer "a dialer." It is the
business operating system: CRM, Sales Ops, Finance, Bids, Intelligence (RAG),
Agent (coding/marketing), and the Dialer — all in one authenticated Next.js shell.

This file tells any coding agent (Claude Code, Cursor, Copilot) how to extend it
without breaking the spine.

## NON-NEGOTIABLE ARCHITECTURE
- One Next.js 14 App Router app. One shell. One sidebar. One auth.
- Auth: NextAuth + ZITADEL (OIDC). NEVER add Clerk. NEVER add Supabase auth.
- DB: ONE self-hosted Postgres via `pg`. No ORM. No second database.
- NocoDB sits OVER the same Postgres as the internal admin grid. It is not a
  separate source of truth. The app is the controlled application layer.
- AI: ONE layer — Vertex Gemini via OpenAI-compatible gateway (`lib/ai/client.ts`),
  reused from aeon-rag. Do not introduce a second AI SDK or vendor.
- Money: integer cents everywhere (`*_cents`). Format only at the edge (`fmtUSD`).
- Every table is org-scoped (`org_id`). Every query filters by org. No exceptions.

## SOURCE OF TRUTH ORDER
1. Runtime behavior (the live Postgres + ZITADEL on Hetzner)
2. Existing repo code (this app)
3. `database/schema.sql`
4. This file

## DIRECTORY MAP
- `app/(app)/<module>/page.tsx` — server page, fetches via `lib/data/*`
- `app/(app)/<module>/<module>-client.tsx` — client interactivity
- `app/api/<module>/route.ts` — API, always `getOrgId()` gate first
- `lib/db/pool.ts` — lazy pg pool (NEVER connects at build time)
- `lib/data/*` — all SQL lives here, org-scoped
- `lib/auth/*` — ZITADEL options + session→org resolver
- `lib/ai/client.ts` — the single AI provider
- `database/schema.sql` — the whole schema; extend here, then `npm run db:migrate`

## RULES FOR EXTENDING
1. New module = new route group + data file + API route + schema tables. Follow the
   finance module as the reference pattern (server page → client → /api → lib/data).
2. Add tables to `database/schema.sql` only. Keep `org_id` FK + index. Re-run migrate.
3. Mirror new tables into `types/models.ts`.
4. API routes: `export const dynamic = "force-dynamic"`, gate with `getOrgId()`,
   return 401 if null.
5. Never write fake values, placeholder secrets, or mock data into committed code.
   `.env.example` keys are empty. Real values live in `.env.local` / server runtime.
6. The lazy pool pattern is load-bearing: never instantiate `new Pool()` at module
   top level or the production build fails collecting page data.

## DIALER (deferred backend)
The `/dialer` shell is live. The Asterisk + PJSIP + ARI backend wires in from the
aeondial-telephony layer. Agent-first bridge model, concurrency 1 in progressive
mode, no AMD. State: UNREGISTERED → REGISTERED → AGENT_LEG_LIVE → READY → IN_CALL
→ WRAP_UP → READY. Do not mark the dialer "done" until the full live loop is proven.

## BUILD GATES (must pass before any commit)
- `npx tsc --noEmit` → 0 errors
- `npm run build` → exit 0, all routes compile
- Pool never connects during build.

## WHAT IS DONE (v3 foundation)
- Shell, sidebar, mobile nav, dark Aeon node-grid theme
- ZITADEL auth (NextAuth) + session→org resolver with dev fallback
- Postgres schema: orgs, users, contacts, deals, activities, entities,
  subscriptions, transactions, catalog_items, bids, bid_lines, rag_*, agent_runs
- Live modules: Dashboard, CRM pipeline, Sales Ops (recharts), Finance
  (VulpineOps ported), Bids (Mike-Logic calculator), Intelligence (Ask AEON),
  Agent (code/marketing/asset)
- API: finance, crm, bids, intelligence, agent, health, auth, finance toggle
- migrate + seed scripts (seed ports real SNRG entities + VulpineOps subs)

## WHAT IS NEXT (build order)
1. CRM: contact/deal create modals + drag pipeline (move endpoint exists)
2. Finance: add-subscription + add-transaction forms (POST /api/finance ready)
3. Bids: save bid → DB (POST /api/bids ready) + PDF export for Mike
4. Intelligence: wire retrieval to the aeon-rag vector store via the gateway
5. Dialer: ARI orchestration from aeondial-telephony
6. NocoDB: connect to POSTGRES_URL, verify table introspection
