# AEON Dial v3 — Business Operating System

One authenticated shell. CRM + Sales Ops + Finance + Bids + Intelligence + Agent + Dialer.
Self-hosted Postgres (single source of truth) + NocoDB admin. ZITADEL auth. No Clerk. No Supabase.

## Stack (locked)
- Next.js 14.2 App Router, TypeScript, Tailwind
- Auth: NextAuth + ZITADEL (OIDC) — Google/Microsoft/GitHub upstream
- DB: self-hosted Postgres via `pg` (no ORM)
- Admin DB UI: NocoDB over the same Postgres
- AI: Vertex Gemini via OpenAI-compatible gateway (reused from aeon-rag)
- Deploy: PM2 on Hetzner, port 3000, behind nginx at crm.aeondial.com

## Modules
| Route | Module | Data |
|---|---|---|
| /dashboard | Command center | live aggregates |
| /crm | Contacts, deals, pipeline | Postgres |
| /sales | Sales ops dashboard (recharts) | Postgres |
| /finance | Subscriptions + ledger (VulpineOps ported) | Postgres |
| /bids | Mike-Logic cabinet calculator + saved bids | Postgres |
| /intelligence | RAG agent (Ask AEON) | gateway + log |
| /agent | Coding / marketing / asset agent | gateway + log |
| /dialer | Progressive call center (ARI wires later) | stub |
| /settings | Identity + data layer | session |

## First run (server)
```bash
# 1. env
cp .env.example .env.local   # fill ALL values

# 2. install
npm install

# 3. database
npm run db:migrate           # applies database/schema.sql
npm run db:seed              # ports SNRG entities + VulpineOps subscriptions
# seed prints an org id -> set AEON_DEV_ORG_ID to run before ZITADEL is fully wired

# 4. build + run
npm run build
pm2 start ecosystem.config.cjs
```

## Auth (ZITADEL)
Create an OIDC app in ZITADEL, redirect URI: `https://crm.aeondial.com/api/auth/callback/zitadel`.
Fill ZITADEL_ISSUER / CLIENT_ID / CLIENT_SECRET and NEXTAUTH_SECRET.

## NocoDB
Point NocoDB at the same POSTGRES_URL as a new external data source. It auto-introspects every
table in `database/schema.sql`. Use it as the internal admin grid; the app remains the
controlled application layer. Do not let NocoDB and the app diverge — Postgres is the single truth.

## Money
All amounts stored as integer cents (`*_cents`). Format only at the edge with `fmtUSD`.
