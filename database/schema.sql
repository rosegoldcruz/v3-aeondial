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

-- ---------- automation engine (n8n integration) ----------
CREATE TABLE IF NOT EXISTS automation_workflows (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  n8n_workflow_id TEXT,
  name          TEXT NOT NULL,
  description   TEXT,
  trigger_event TEXT,
  active        BOOLEAN NOT NULL DEFAULT false,
  webhook_path  TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_automation_workflows_org ON automation_workflows(org_id);

CREATE TABLE IF NOT EXISTS automation_runs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  workflow_id     UUID REFERENCES automation_workflows(id) ON DELETE SET NULL,
  n8n_execution_id TEXT,
  status          TEXT NOT NULL DEFAULT 'pending',
  trigger_event   TEXT,
  payload         JSONB,
  result          JSONB,
  started_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at     TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_automation_runs_org ON automation_runs(org_id);
CREATE INDEX IF NOT EXISTS idx_automation_runs_workflow ON automation_runs(workflow_id);

-- ============================================================
-- AUTONOMOUS DIGITAL AGENCY MODULE
-- Discovery → Scoring → Preview → Outreach → Pipeline → Fulfill
-- ============================================================

DO $$ BEGIN
  CREATE TYPE digital_class AS ENUM ('INVISIBLE','WEAK','AVERAGE','STRONG','ADVANCED');
  CREATE TYPE opportunity_type AS ENUM ('NO_WEBSITE','BAD_WEBSITE','GOOD_WEBSITE_NO_CRM','HIGH_REVIEW_LOW_CONVERSION','HIGH_VALUE_TARGET','ALREADY_ADVANCED');
  CREATE TYPE agency_pipeline_stage AS ENUM ('DISCOVERED','SCORED','PREVIEW_GENERATED','EMAIL_SENT','OPENED','CLICKED','REPLIED','CALL_BOOKED','PROPOSAL_SENT','WON','LOST','CLIENT','RETAINER');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------- discovered businesses ----------
CREATE TABLE IF NOT EXISTS agency_businesses (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  business_name   TEXT NOT NULL,
  category        TEXT,
  address         TEXT,
  city            TEXT,
  state           TEXT,
  country         TEXT DEFAULT 'US',
  phone           TEXT,
  email           TEXT,
  website         TEXT,
  domain          TEXT,
  google_place_id TEXT,
  google_maps_url TEXT,
  rating          NUMERIC(2,1),
  review_count    INTEGER DEFAULT 0,
  hours           JSONB,
  photos          JSONB,
  services        TEXT[],
  source          TEXT,
  source_tier     TEXT,
  raw_payload     JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_agency_businesses_org ON agency_businesses(org_id);
CREATE INDEX IF NOT EXISTS idx_agency_businesses_domain ON agency_businesses(domain);
CREATE INDEX IF NOT EXISTS idx_agency_businesses_city ON agency_businesses(city, state);
CREATE INDEX IF NOT EXISTS idx_agency_businesses_category ON agency_businesses(category);

-- ---------- business contacts ----------
CREATE TABLE IF NOT EXISTS agency_business_contacts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  business_id     UUID NOT NULL REFERENCES agency_businesses(id) ON DELETE CASCADE,
  name            TEXT,
  title           TEXT,
  seniority       TEXT,
  email           TEXT,
  email_confidence NUMERIC(5,2),
  validation_status TEXT,
  phone           TEXT,
  linkedin_url    TEXT,
  is_primary      BOOLEAN DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_agency_contacts_business ON agency_business_contacts(business_id);

-- ---------- digital maturity scores ----------
CREATE TABLE IF NOT EXISTS agency_scores (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  business_id     UUID NOT NULL REFERENCES agency_businesses(id) ON DELETE CASCADE,
  total_score     INTEGER NOT NULL DEFAULT 0,
  classification  digital_class NOT NULL DEFAULT 'INVISIBLE',
  website_exists  INTEGER DEFAULT 0,
  mobile_friendly INTEGER DEFAULT 0,
  page_speed      INTEGER DEFAULT 0,
  clear_cta       INTEGER DEFAULT 0,
  contact_form    INTEGER DEFAULT 0,
  reviews_onsite  INTEGER DEFAULT 0,
  service_pages   INTEGER DEFAULT 0,
  tracking_pixel  INTEGER DEFAULT 0,
  crm_indicators  INTEGER DEFAULT 0,
  email_capture   INTEGER DEFAULT 0,
  modern_design   INTEGER DEFAULT 0,
  analytics       INTEGER DEFAULT 0,
  reasoning       TEXT,
  missing_infra   TEXT[],
  scored_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_agency_scores_business ON agency_scores(business_id);
CREATE INDEX IF NOT EXISTS idx_agency_scores_class ON agency_scores(classification);

-- ---------- website audits (AI) ----------
CREATE TABLE IF NOT EXISTS agency_audits (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id              UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  business_id         UUID NOT NULL REFERENCES agency_businesses(id) ON DELETE CASCADE,
  executive_summary   TEXT,
  design_quality      INTEGER,
  conversion_assessment TEXT,
  strongest_asset     TEXT,
  revenue_opportunities JSONB,
  infrastructure_gaps TEXT[],
  recommended_offer   TEXT,
  outreach_angle      TEXT,
  audit_reasoning     TEXT,
  audited_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_agency_audits_business ON agency_audits(business_id);

-- ---------- generated previews ----------
CREATE TABLE IF NOT EXISTS agency_previews (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  business_id     UUID NOT NULL REFERENCES agency_businesses(id) ON DELETE CASCADE,
  slug            TEXT NOT NULL,
  preview_url     TEXT NOT NULL,
  template_used   TEXT,
  sections        JSONB,
  copy_generated  JSONB,
  visits          INTEGER DEFAULT 0,
  cta_clicks      INTEGER DEFAULT 0,
  status          TEXT DEFAULT 'active',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_agency_previews_business ON agency_previews(business_id);
CREATE INDEX IF NOT EXISTS idx_agency_previews_slug ON agency_previews(slug);

-- ---------- outreach campaigns ----------
CREATE TABLE IF NOT EXISTS agency_campaigns (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  niche           TEXT,
  city            TEXT,
  state           TEXT,
  status          TEXT DEFAULT 'draft',
  sending_platform TEXT,
  daily_limit     INTEGER DEFAULT 40,
  warmup_day      INTEGER DEFAULT 0,
  total_sent      INTEGER DEFAULT 0,
  total_opens     INTEGER DEFAULT 0,
  total_clicks    INTEGER DEFAULT 0,
  total_replies   INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_agency_campaigns_org ON agency_campaigns(org_id);

-- ---------- email sequences ----------
CREATE TABLE IF NOT EXISTS agency_sequences (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  campaign_id     UUID REFERENCES agency_campaigns(id) ON DELETE SET NULL,
  business_id     UUID NOT NULL REFERENCES agency_businesses(id) ON DELETE CASCADE,
  to_email        TEXT NOT NULL,
  step            INTEGER NOT NULL DEFAULT 1,
  subject         TEXT,
  body            TEXT,
  preview_url     TEXT,
  sent_at         TIMESTAMPTZ,
  opened_at       TIMESTAMPTZ,
  clicked_at      TIMESTAMPTZ,
  replied_at      TIMESTAMPTZ,
  bounced         BOOLEAN DEFAULT false,
  status          TEXT DEFAULT 'queued',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_agency_sequences_business ON agency_sequences(business_id);
CREATE INDEX IF NOT EXISTS idx_agency_sequences_status ON agency_sequences(status);

-- ---------- suppression list ----------
CREATE TABLE IF NOT EXISTS agency_suppression (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  reason      TEXT,
  suppressed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_agency_suppression_email ON agency_suppression(org_id, email);

-- ---------- pipeline opportunities ----------
CREATE TABLE IF NOT EXISTS agency_opportunities (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  business_id       UUID NOT NULL REFERENCES agency_businesses(id) ON DELETE CASCADE,
  stage             agency_pipeline_stage NOT NULL DEFAULT 'DISCOVERED',
  opportunity_type  opportunity_type,
  recommended_offer TEXT,
  revenue_low_cents INTEGER,
  revenue_high_cents INTEGER,
  mrr_cents         INTEGER,
  priority_score    INTEGER DEFAULT 0,
  outreach_angle    TEXT,
  message_angle     TEXT,
  campaign_id       UUID REFERENCES agency_campaigns(id) ON DELETE SET NULL,
  preview_id        UUID REFERENCES agency_previews(id) ON DELETE SET NULL,
  call_booked_at    TIMESTAMPTZ,
  proposal_sent_at  TIMESTAMPTZ,
  won_at            TIMESTAMPTZ,
  lost_at           TIMESTAMPTZ,
  lost_reason       TEXT,
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_agency_opps_org ON agency_opportunities(org_id);
CREATE INDEX IF NOT EXISTS idx_agency_opps_stage ON agency_opportunities(stage);
CREATE INDEX IF NOT EXISTS idx_agency_opps_type ON agency_opportunities(opportunity_type);

-- ---------- proposals ----------
CREATE TABLE IF NOT EXISTS agency_proposals (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  opportunity_id  UUID NOT NULL REFERENCES agency_opportunities(id) ON DELETE CASCADE,
  tier            TEXT,
  total_cents     INTEGER,
  mrr_cents       INTEGER,
  sections        JSONB,
  pdf_url         TEXT,
  status          TEXT DEFAULT 'draft',
  sent_at         TIMESTAMPTZ,
  accepted_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_agency_proposals_opp ON agency_proposals(opportunity_id);

-- ---------- fulfillment projects ----------
CREATE TABLE IF NOT EXISTS agency_projects (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  opportunity_id  UUID NOT NULL REFERENCES agency_opportunities(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  package_type    TEXT,
  status          TEXT DEFAULT 'active',
  started_at      TIMESTAMPTZ DEFAULT now(),
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_agency_projects_org ON agency_projects(org_id);

-- ---------- fulfillment tasks ----------
CREATE TABLE IF NOT EXISTS agency_tasks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  project_id      UUID NOT NULL REFERENCES agency_projects(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  description     TEXT,
  status          TEXT DEFAULT 'pending',
  sort_order      INTEGER DEFAULT 0,
  due_at          TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_agency_tasks_project ON agency_tasks(project_id);

-- ---------- agent activity logs ----------
CREATE TABLE IF NOT EXISTS agency_agent_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  agent_name  TEXT NOT NULL,
  action      TEXT NOT NULL,
  target_id   UUID,
  target_type TEXT,
  payload     JSONB,
  result      JSONB,
  logged_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_agency_agent_logs_org ON agency_agent_logs(org_id);
CREATE INDEX IF NOT EXISTS idx_agency_agent_logs_agent ON agency_agent_logs(agent_name);

-- ---------- tracking events ----------
CREATE TABLE IF NOT EXISTS agency_tracking_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  business_id UUID REFERENCES agency_businesses(id) ON DELETE SET NULL,
  preview_id  UUID REFERENCES agency_previews(id) ON DELETE SET NULL,
  sequence_id UUID REFERENCES agency_sequences(id) ON DELETE SET NULL,
  event_type  TEXT NOT NULL,
  metadata    JSONB,
  ip_address  TEXT,
  user_agent  TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_agency_tracking_org ON agency_tracking_events(org_id);
CREATE INDEX IF NOT EXISTS idx_agency_tracking_type ON agency_tracking_events(event_type);

-- ============================================================
-- PROGRESSIVE POWER DIALER v2
-- ============================================================

DO $$ BEGIN
  CREATE TYPE agent_state AS ENUM ('AVAILABLE','DIALING','WAITING_FOR_CONNECT','CONNECTED','PAUSED','BREAK','OFFLINE');
  CREATE TYPE dial_outcome AS ENUM ('CONNECTED','VOICEMAIL_DROP','BUSY','NO_ANSWER','DISCONNECTED','FAILED','DNC','CALLBACK_REQUESTED','APPOINTMENT_BOOKED','SALE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------- dial sessions ----------
CREATE TABLE IF NOT EXISTS dial_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  campaign_id     UUID,
  status          TEXT NOT NULL DEFAULT 'active',
  dial_ratio      INTEGER NOT NULL DEFAULT 3,
  started_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at        TIMESTAMPTZ,
  total_attempts  INTEGER DEFAULT 0,
  total_connects  INTEGER DEFAULT 0,
  total_vm_drops  INTEGER DEFAULT 0,
  total_duration_s INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_dial_sessions_org ON dial_sessions(org_id);
CREATE INDEX IF NOT EXISTS idx_dial_sessions_user ON dial_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_dial_sessions_active ON dial_sessions(org_id, status) WHERE status = 'active';

-- ---------- agent presence ----------
CREATE TABLE IF NOT EXISTS agent_presence (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  state           agent_state NOT NULL DEFAULT 'OFFLINE',
  session_id      UUID REFERENCES dial_sessions(id) ON DELETE SET NULL,
  current_call_id UUID,
  last_state_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  total_talk_s    INTEGER DEFAULT 0,
  total_calls     INTEGER DEFAULT 0,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_agent_presence_user ON agent_presence(org_id, user_id);

-- ---------- call attempts (batch) ----------
CREATE TABLE IF NOT EXISTS call_attempts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  session_id      UUID NOT NULL REFERENCES dial_sessions(id) ON DELETE CASCADE,
  lead_id         UUID,
  contact_id      UUID,
  phone_number    TEXT NOT NULL,
  provider        TEXT,
  provider_call_id TEXT,
  batch_index     INTEGER NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'queued',
  outcome         dial_outcome,
  amd_result      TEXT,
  disposition     TEXT,
  started_at      TIMESTAMPTZ,
  connected_at    TIMESTAMPTZ,
  ended_at        TIMESTAMPTZ,
  duration_s      INTEGER,
  recording_url   TEXT,
  cancel_reason   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_call_attempts_session ON call_attempts(session_id);
CREATE INDEX IF NOT EXISTS idx_call_attempts_status ON call_attempts(status);
CREATE INDEX IF NOT EXISTS idx_call_attempts_provider ON call_attempts(provider_call_id);

-- ---------- call bridges ----------
CREATE TABLE IF NOT EXISTS call_bridges (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  session_id      UUID NOT NULL REFERENCES dial_sessions(id) ON DELETE CASCADE,
  winning_attempt_id UUID NOT NULL REFERENCES call_attempts(id),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bridge_started  TIMESTAMPTZ NOT NULL DEFAULT now(),
  bridge_ended    TIMESTAMPTZ,
  duration_s      INTEGER,
  recording_url   TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_call_bridges_session ON call_bridges(session_id);

-- ---------- voicemail drops ----------
CREATE TABLE IF NOT EXISTS voicemail_drops (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  audio_url       TEXT NOT NULL,
  campaign_id     UUID,
  duration_s      INTEGER,
  created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_voicemail_drops_org ON voicemail_drops(org_id);

-- ---------- campaign dial rules ----------
CREATE TABLE IF NOT EXISTS campaign_rules (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  campaign_id     UUID,
  dial_ratio      INTEGER NOT NULL DEFAULT 3,
  max_attempts    INTEGER NOT NULL DEFAULT 5,
  attempt_delay_m INTEGER NOT NULL DEFAULT 60,
  quiet_hours_start INTEGER,
  quiet_hours_end   INTEGER,
  timezone        TEXT DEFAULT 'America/Chicago',
  require_amd     BOOLEAN DEFAULT true,
  vm_drop_id      UUID REFERENCES voicemail_drops(id) ON DELETE SET NULL,
  active          BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_campaign_rules_org ON campaign_rules(org_id);

-- ---------- DNC list ----------
CREATE TABLE IF NOT EXISTS dnc_list (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  phone       TEXT NOT NULL,
  source      TEXT,
  reason      TEXT,
  added_by    UUID REFERENCES users(id) ON DELETE SET NULL,
  added_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_dnc_phone ON dnc_list(org_id, phone);
