-- ============================================================
-- AEON Dial v3 — Unified Platform Schema
-- Self-hosted Postgres. No Supabase. NocoDB sits on top of this.
-- One org model. Multi-user. Role-based. Module-scoped tables.
-- ============================================================

-- ---------- extensions ----------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";  -- gen_random_uuid()

-- ---------- enums ----------
DO $$ BEGIN
  CREATE TYPE user_role     AS ENUM ('owner','admin','manager','employee');
  CREATE TYPE deal_stage    AS ENUM ('lead','qualified','proposal','negotiation','won','lost');
  CREATE TYPE activity_kind AS ENUM ('call','email','sms','meeting','note','task');
  CREATE TYPE txn_type      AS ENUM ('in','out');
  CREATE TYPE bid_status    AS ENUM ('draft','sent','accepted','rejected','expired');
  CREATE TYPE cabinet_line  AS ENUM ('framed','frameless');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------- org + identity ----------
CREATE TABLE IF NOT EXISTS orgs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  slug        TEXT UNIQUE NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  zitadel_sub   TEXT UNIQUE,            -- OIDC subject from ZITADEL
  email         TEXT NOT NULL,
  name          TEXT,
  role          user_role NOT NULL DEFAULT 'employee',
  active        BOOLEAN NOT NULL DEFAULT true,
  avatar_url    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (org_id, email)
);
CREATE INDEX IF NOT EXISTS idx_users_org ON users(org_id);

-- ============================================================
-- CRM MODULE
-- ============================================================
CREATE TABLE IF NOT EXISTS contacts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  title       TEXT,
  company     TEXT,
  email       TEXT,
  phone       TEXT,
  linkedin    TEXT,
  twitter     TEXT,
  birthday    DATE,
  referral_source TEXT,
  first_contact_date DATE,
  lifetime_value_cents BIGINT NOT NULL DEFAULT 0,
  health_score INT NOT NULL DEFAULT 100,
  health_tier  TEXT NOT NULL DEFAULT 'healthy',
  last_activity_at TIMESTAMPTZ,
  notes       TEXT,
  interests   TEXT,
  tags        TEXT[] DEFAULT '{}',
  owner_id    UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_contacts_org ON contacts(org_id);

CREATE TABLE IF NOT EXISTS deals (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  contact_id    UUID REFERENCES contacts(id) ON DELETE SET NULL,
  stage         deal_stage NOT NULL DEFAULT 'lead',
  value_cents   BIGINT NOT NULL DEFAULT 0,
  probability   INT NOT NULL DEFAULT 20,
  owner_id      UUID REFERENCES users(id) ON DELETE SET NULL,
  expected_close DATE,
  next_action   TEXT,
  competitor    TEXT,
  last_stage_change TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_deals_org_stage ON deals(org_id, stage);

CREATE TABLE IF NOT EXISTS activities (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  kind        activity_kind NOT NULL,
  contact_id  UUID REFERENCES contacts(id) ON DELETE CASCADE,
  deal_id     UUID REFERENCES deals(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  subject     TEXT,
  body        TEXT,
  sentiment   TEXT NOT NULL DEFAULT 'neutral',
  duration_seconds INT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_activities_org ON activities(org_id, occurred_at DESC);

ALTER TABLE activities ADD COLUMN IF NOT EXISTS sentiment TEXT NOT NULL DEFAULT 'neutral';
ALTER TABLE activities ADD COLUMN IF NOT EXISTS duration_seconds INT;

CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  company TEXT,
  email TEXT,
  phone TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  source TEXT,
  campaign TEXT,
  budget_range TEXT,
  pain_points TEXT,
  decision_timeline TEXT,
  last_contacted_at TIMESTAMPTZ,
  notes TEXT,
  tags TEXT[] DEFAULT '{}',
  sentiment TEXT NOT NULL DEFAULT 'neutral',
  score INT NOT NULL DEFAULT 0,
  score_tier TEXT NOT NULL DEFAULT 'cold',
  owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_leads_org_status ON leads(org_id, status);

CREATE TABLE IF NOT EXISTS lead_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  subject TEXT,
  body TEXT,
  sentiment TEXT NOT NULL DEFAULT 'neutral',
  duration_seconds INT,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_lead_activities_lead ON lead_activities(lead_id, occurred_at DESC);

-- Idempotent column adds for existing databases
ALTER TABLE leads ADD COLUMN IF NOT EXISTS score INT NOT NULL DEFAULT 0;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS score_tier TEXT NOT NULL DEFAULT 'cold';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS campaign TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS budget_range TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS pain_points TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS decision_timeline TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS last_contacted_at TIMESTAMPTZ;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS sentiment TEXT DEFAULT 'neutral';

ALTER TABLE contacts ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS linkedin TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS twitter TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS birthday DATE;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS referral_source TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS first_contact_date DATE;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS lifetime_value_cents BIGINT NOT NULL DEFAULT 0;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS health_score INT NOT NULL DEFAULT 100;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS health_tier TEXT NOT NULL DEFAULT 'healthy';
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS interests TEXT;

ALTER TABLE deals ADD COLUMN IF NOT EXISTS probability INT NOT NULL DEFAULT 20;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS next_action TEXT;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS competitor TEXT;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS last_stage_change TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_leads_org_score ON leads(org_id, score DESC);
CREATE INDEX IF NOT EXISTS idx_leads_org_tier ON leads(org_id, score_tier);

CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  sent INT NOT NULL DEFAULT 0,
  opens INT NOT NULL DEFAULT 0,
  clicks INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_campaigns_org_type ON campaigns(org_id, type);

-- ============================================================
-- FINANCE MODULE  (replaces VulpineOps localStorage)
-- ============================================================
CREATE TABLE IF NOT EXISTS entities (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,           -- "SNRG Labs", "Vulpine Homes", "CWV"
  legal_name  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (org_id, name)
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  entity_id     UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  amount_cents  BIGINT NOT NULL,
  category      TEXT NOT NULL,         -- AI, Dev, Infra, Media, Ops, ...
  active        BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_subs_entity ON subscriptions(entity_id);

CREATE TABLE IF NOT EXISTS transactions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  entity_id     UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  description   TEXT NOT NULL,
  amount_cents  BIGINT NOT NULL,
  type          txn_type NOT NULL,
  category      TEXT NOT NULL,
  occurred_on   DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_txn_entity ON transactions(entity_id, occurred_on DESC);

-- ============================================================
-- BIDS MODULE  (Vulpine cabinet pricing)
-- ============================================================
CREATE TABLE IF NOT EXISTS catalog_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  sku           TEXT,
  description   TEXT NOT NULL,
  line          cabinet_line NOT NULL,
  is_accessory  BOOLEAN NOT NULL DEFAULT false,
  list_cents    BIGINT NOT NULL,       -- list price in cents
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_catalog_org_line ON catalog_items(org_id, line);

CREATE TABLE IF NOT EXISTS inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sku TEXT,
  category TEXT,
  qty INT NOT NULL DEFAULT 0,
  cost_cents BIGINT NOT NULL DEFAULT 0,
  list_cents BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_inventory_items_org_category ON inventory_items(org_id, category);

CREATE TABLE IF NOT EXISTS bids (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  contact_id    UUID REFERENCES contacts(id) ON DELETE SET NULL,
  line          cabinet_line NOT NULL,
  price_margin  NUMERIC(6,4) NOT NULL DEFAULT 0.23,  -- Mike-Logic margin
  status        bid_status NOT NULL DEFAULT 'draft',
  list_total_cents   BIGINT NOT NULL DEFAULT 0,
  bid_total_cents    BIGINT NOT NULL DEFAULT 0,
  owner_id      UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bid_lines (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bid_id          UUID NOT NULL REFERENCES bids(id) ON DELETE CASCADE,
  catalog_item_id UUID REFERENCES catalog_items(id) ON DELETE SET NULL,
  description     TEXT NOT NULL,
  qty             INT NOT NULL DEFAULT 1,
  list_cents      BIGINT NOT NULL,
  factor          NUMERIC(8,5) NOT NULL,  -- computed factor applied
  bid_cents       BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_bidlines_bid ON bid_lines(bid_id);

-- ============================================================
-- INTELLIGENCE MODULE  (RAG — vectors live on aeon-rag box;
-- this table tracks documents + query log for the unified app)
-- ============================================================
CREATE TABLE IF NOT EXISTS rag_documents (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  source      TEXT NOT NULL,           -- drive id / url / upload
  title       TEXT,
  ingested_at TIMESTAMPTZ,
  status      TEXT NOT NULL DEFAULT 'pending',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rag_queries (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  question    TEXT NOT NULL,
  answer      TEXT,
  sources     JSONB DEFAULT '[]',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- AGENT MODULE  (coding / asset generation runs)
-- ============================================================
CREATE TABLE IF NOT EXISTS agent_runs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  kind        TEXT NOT NULL,           -- 'code' | 'marketing' | 'asset'
  prompt      TEXT NOT NULL,
  output      TEXT,
  status      TEXT NOT NULL DEFAULT 'queued',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- ORG SETTINGS  (key/value store for integration credentials)
-- ============================================================
CREATE TABLE IF NOT EXISTS org_settings (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  key        TEXT NOT NULL,
  value      TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (org_id, key)
);
CREATE INDEX IF NOT EXISTS idx_org_settings_org ON org_settings(org_id);

-- ============================================================
-- OPS, INVENTORY SUPPORT, COMPLIANCE, ADMIN AUDIT
-- ============================================================
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  assignee_id UUID REFERENCES users(id) ON DELETE SET NULL,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'open',
  priority TEXT NOT NULL DEFAULT 'medium',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tasks_org_status ON tasks(org_id, status);

CREATE TABLE IF NOT EXISTS work_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  assignee_id UUID REFERENCES users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  due_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_work_orders_org_status ON work_orders(org_id, status);

CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT,
  email TEXT,
  phone TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_employees_org_status ON employees(org_id, status);

CREATE TABLE IF NOT EXISTS timesheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  hours NUMERIC(5,2) NOT NULL,
  job_code TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_timesheets_org_date ON timesheets(org_id, date DESC);

CREATE TABLE IF NOT EXISTS sops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT,
  version TEXT NOT NULL DEFAULT '1.0',
  content TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sops_org_category ON sops(org_id, category);

CREATE TABLE IF NOT EXISTS dnc_numbers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  reason TEXT,
  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(org_id, phone)
);

CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource TEXT NOT NULL,
  resource_id TEXT,
  ip TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_log_org_created ON audit_log(org_id, created_at DESC);

-- ============================================================
-- DIALER MODULE (calls + recordings)
-- ============================================================
DO $$ BEGIN
  CREATE TYPE call_direction AS ENUM ('outbound','inbound');
  CREATE TYPE call_status AS ENUM ('initiated','ringing','answered','completed','failed','busy','no_answer','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS calls (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES users(id) ON DELETE SET NULL,
  lead_id         UUID REFERENCES leads(id) ON DELETE SET NULL,
  contact_id      UUID REFERENCES contacts(id) ON DELETE SET NULL,
  direction       call_direction NOT NULL DEFAULT 'outbound',
  from_number     TEXT,
  to_number       TEXT NOT NULL,
  status          call_status NOT NULL DEFAULT 'initiated',
  started_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  answered_at     TIMESTAMPTZ,
  ended_at        TIMESTAMPTZ,
  duration_s      INT,
  disposition     TEXT,
  recording_url   TEXT,
  ari_channel_id  TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_calls_org ON calls(org_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_calls_lead ON calls(lead_id);
CREATE INDEX IF NOT EXISTS idx_calls_contact ON calls(contact_id);
CREATE INDEX IF NOT EXISTS idx_calls_ari ON calls(ari_channel_id);

-- ============================================================
-- updated_at trigger
-- ============================================================
CREATE OR REPLACE FUNCTION touch_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER trg_contacts_touch BEFORE UPDATE ON contacts
    FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
  CREATE TRIGGER trg_deals_touch BEFORE UPDATE ON deals
    FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
  CREATE TRIGGER trg_bids_touch BEFORE UPDATE ON bids
    FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
  CREATE TRIGGER trg_leads_touch BEFORE UPDATE ON leads
    FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
  CREATE TRIGGER trg_tasks_touch BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
  CREATE TRIGGER trg_work_orders_touch BEFORE UPDATE ON work_orders
    FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
  CREATE TRIGGER trg_sops_touch BEFORE UPDATE ON sops
    FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
  CREATE TRIGGER trg_inventory_items_touch BEFORE UPDATE ON inventory_items
    FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
  CREATE TRIGGER trg_calls_touch BEFORE UPDATE ON calls
    FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
