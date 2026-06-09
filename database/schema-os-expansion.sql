
-- ============================================================
-- AEON OS MASTER EXPANSION — ENTERPRISE SCHEMA
-- ============================================================

DO $$ BEGIN
  CREATE TYPE entity_status AS ENUM ('active','archived','deleted','draft','pending','on_hold');
  CREATE TYPE priority_level AS ENUM ('low','medium','high','critical');
  CREATE TYPE view_type AS ENUM ('table','kanban','calendar','timeline','gantt');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------- teams ----------
CREATE TABLE IF NOT EXISTS teams (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT,
  color       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_teams_org ON teams(org_id);

-- ---------- team members ----------
CREATE TABLE IF NOT EXISTS team_members (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  team_id     UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role        TEXT DEFAULT 'member',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(org_id, team_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_team_members_team ON team_members(team_id);

-- ---------- tags ----------
CREATE TABLE IF NOT EXISTS tags (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  color       TEXT DEFAULT '#6366f1',
  entity_type TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_tags_unique ON tags(org_id, entity_type, name);

-- ---------- entity tags ----------
CREATE TABLE IF NOT EXISTS entity_tags (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  tag_id      UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id   UUID NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(org_id, tag_id, entity_type, entity_id)
);
CREATE INDEX IF NOT EXISTS idx_entity_tags_entity ON entity_tags(entity_type, entity_id);

-- ---------- custom fields ----------
CREATE TABLE IF NOT EXISTS custom_fields (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  name        TEXT NOT NULL,
  field_type  TEXT NOT NULL DEFAULT 'text',
  options     JSONB,
  required    BOOLEAN DEFAULT false,
  sort_order  INTEGER DEFAULT 0,
  active      BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_custom_fields_org ON custom_fields(org_id, entity_type);

-- ---------- custom field values ----------
CREATE TABLE IF NOT EXISTS custom_field_values (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  custom_field_id UUID NOT NULL REFERENCES custom_fields(id) ON DELETE CASCADE,
  entity_type   TEXT NOT NULL,
  entity_id     UUID NOT NULL,
  value         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(org_id, custom_field_id, entity_type, entity_id)
);
CREATE INDEX IF NOT EXISTS idx_cfv_entity ON custom_field_values(entity_type, entity_id);

-- ---------- saved views ----------
CREATE TABLE IF NOT EXISTS saved_views (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  view_type   view_type NOT NULL DEFAULT 'table',
  filters     JSONB,
  sort        JSONB,
  columns     JSONB,
  is_default  BOOLEAN DEFAULT false,
  shared      BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_saved_views_org ON saved_views(org_id, entity_type);

-- ---------- audit logs ----------
CREATE TABLE IF NOT EXISTS audit_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  action      TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id   UUID,
  old_values  JSONB,
  new_values  JSONB,
  ip_address  TEXT,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_org ON audit_logs(org_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);

-- ---------- attachments ----------
CREATE TABLE IF NOT EXISTS attachments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id   UUID NOT NULL,
  file_name   TEXT NOT NULL,
  file_url    TEXT NOT NULL,
  file_size   INTEGER,
  mime_type   TEXT,
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_attachments_entity ON attachments(entity_type, entity_id);

-- ---------- internal notes ----------
CREATE TABLE IF NOT EXISTS internal_notes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id   UUID NOT NULL,
  content     TEXT NOT NULL,
  created_by  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_internal_notes_entity ON internal_notes(entity_type, entity_id);

-- ---------- mentions ----------
CREATE TABLE IF NOT EXISTS mentions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  note_id     UUID NOT NULL REFERENCES internal_notes(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  read_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_mentions_user ON mentions(user_id, read_at);

-- ---------- activities (unified timeline) ----------
CREATE TABLE IF NOT EXISTS activities (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  actor_type  TEXT DEFAULT 'user',
  actor_id    UUID,
  actor_name  TEXT,
  action      TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id   UUID NOT NULL,
  entity_name TEXT,
  metadata    JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_activities_entity ON activities(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_activities_created ON activities(created_at DESC);

-- ---------- ai insights ----------
CREATE TABLE IF NOT EXISTS ai_insights (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id   UUID,
  insight_type TEXT NOT NULL,
  title       TEXT NOT NULL,
  description TEXT,
  confidence  NUMERIC(3,2),
  value_cents INTEGER,
  metadata    JSONB,
  dismissed   BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ai_insights_org ON ai_insights(org_id, entity_type);
CREATE INDEX IF NOT EXISTS idx_ai_insights_dismissed ON ai_insights(org_id, dismissed) WHERE dismissed = false;

-- ---------- automation rules ----------
CREATE TABLE IF NOT EXISTS automation_rules (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT,
  trigger_event TEXT NOT NULL,
  conditions  JSONB NOT NULL DEFAULT '[]',
  actions     JSONB NOT NULL DEFAULT '[]',
  active      BOOLEAN DEFAULT true,
  run_count   INTEGER DEFAULT 0,
  last_run_at TIMESTAMPTZ,
  created_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_automation_rules_org ON automation_rules(org_id);
CREATE INDEX IF NOT EXISTS idx_automation_rules_trigger ON automation_rules(trigger_event);

-- ---------- permissions ----------
CREATE TABLE IF NOT EXISTS permissions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  team_id     UUID REFERENCES teams(id) ON DELETE CASCADE,
  module      TEXT NOT NULL,
  action      TEXT NOT NULL,
  allowed     BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(org_id, user_id, team_id, module, action)
);
CREATE INDEX IF NOT EXISTS idx_permissions_org ON permissions(org_id, module);

-- ============================================================
-- LEADS INTELLIGENCE PLATFORM
-- ============================================================

-- Lead enrichment
CREATE TABLE IF NOT EXISTS lead_enrichment (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  lead_id         UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  company_name    TEXT,
  industry        TEXT,
  employee_count  INTEGER,
  annual_revenue_cents INTEGER,
  website_tech    JSONB,
  social_profiles JSONB,
  enriched_at     TIMESTAMPTZ,
  source          TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_lead_enrichment_lead ON lead_enrichment(lead_id);

-- Lead scores
CREATE TABLE IF NOT EXISTS lead_scores (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  lead_id         UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  total_score     INTEGER NOT NULL DEFAULT 0,
  engagement_score INTEGER DEFAULT 0,
  intent_score    INTEGER DEFAULT 0,
  fit_score       INTEGER DEFAULT 0,
  behavior_score  INTEGER DEFAULT 0,
  recency_score   INTEGER DEFAULT 0,
  frequency_score INTEGER DEFAULT 0,
  monetary_score  INTEGER DEFAULT 0,
  scored_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_lead_scores_lead ON lead_scores(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_scores_total ON lead_scores(total_score DESC);

-- Lead sequences (automated follow-up)
CREATE TABLE IF NOT EXISTS lead_sequences (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  lead_id         UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  sequence_name   TEXT NOT NULL,
  step            INTEGER NOT NULL DEFAULT 1,
  channel         TEXT NOT NULL DEFAULT 'email',
  status          TEXT DEFAULT 'active',
  scheduled_at    TIMESTAMPTZ,
  sent_at         TIMESTAMPTZ,
  opened_at       TIMESTAMPTZ,
  clicked_at      TIMESTAMPTZ,
  replied_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_lead_sequences_lead ON lead_sequences(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_sequences_scheduled ON lead_sequences(scheduled_at) WHERE status = 'active';

-- Lead campaign attribution
CREATE TABLE IF NOT EXISTS lead_attribution (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  lead_id         UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  campaign_id     UUID,
  source          TEXT,
  medium          TEXT,
  term            TEXT,
  content         TEXT,
  landing_page    TEXT,
  referrer        TEXT,
  utm_data        JSONB,
  first_touch_at  TIMESTAMPTZ,
  last_touch_at   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_lead_attribution_lead ON lead_attribution(lead_id);

-- ============================================================
-- CONTACTS 360
-- ============================================================

CREATE TABLE IF NOT EXISTS organizations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  domain          TEXT,
  industry        TEXT,
  size            TEXT,
  annual_revenue_cents INTEGER,
  website         TEXT,
  linkedin_url    TEXT,
  address         TEXT,
  city            TEXT,
  state           TEXT,
  country         TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_organizations_org ON organizations(org_id);

CREATE TABLE IF NOT EXISTS contact_organizations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  contact_id      UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title           TEXT,
  is_primary      BOOLEAN DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(org_id, contact_id, organization_id)
);
CREATE INDEX IF NOT EXISTS idx_contact_orgs_contact ON contact_organizations(contact_id);

CREATE TABLE IF NOT EXISTS contact_relationships (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  contact_a_id    UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  contact_b_id    UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  relationship_type TEXT DEFAULT 'colleague',
  strength        INTEGER DEFAULT 1,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(org_id, contact_a_id, contact_b_id)
);
CREATE INDEX IF NOT EXISTS idx_contact_rels_a ON contact_relationships(contact_a_id);
CREATE INDEX IF NOT EXISTS idx_contact_rels_b ON contact_relationships(contact_b_id);

-- ============================================================
-- PIPELINE ENTERPRISE
-- ============================================================

CREATE TABLE IF NOT EXISTS pipelines (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  description     TEXT,
  entity_type     TEXT DEFAULT 'deal',
  color           TEXT,
  active          BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pipelines_org ON pipelines(org_id);

CREATE TABLE IF NOT EXISTS pipeline_stages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  pipeline_id     UUID NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  color           TEXT,
  probability     NUMERIC(5,2) DEFAULT 0,
  sort_order      INTEGER DEFAULT 0,
  requirements    JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pipeline_stages_pipeline ON pipeline_stages(pipeline_id);

CREATE TABLE IF NOT EXISTS deal_forecasts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  pipeline_id     UUID NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
  period_start    DATE NOT NULL,
  period_end      DATE NOT NULL,
  forecasted_cents INTEGER NOT NULL DEFAULT 0,
  weighted_cents  INTEGER NOT NULL DEFAULT 0,
  closed_cents    INTEGER NOT NULL DEFAULT 0,
  deal_count      INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_deal_forecasts_pipeline ON deal_forecasts(pipeline_id, period_start);

-- ============================================================
-- DEALS WORKSPACE
-- ============================================================

CREATE TABLE IF NOT EXISTS deal_tasks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  deal_id         UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  description     TEXT,
  assigned_to     UUID REFERENCES users(id) ON DELETE SET NULL,
  due_at          TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  status          TEXT DEFAULT 'pending',
  priority        priority_level DEFAULT 'medium',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_deal_tasks_deal ON deal_tasks(deal_id);

CREATE TABLE IF NOT EXISTS deal_approvals (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  deal_id         UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  approver_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  approval_type   TEXT NOT NULL,
  status          TEXT DEFAULT 'pending',
  notes           TEXT,
  requested_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  responded_at    TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_deal_approvals_deal ON deal_approvals(deal_id);

CREATE TABLE IF NOT EXISTS proposals (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  deal_id         UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  content         JSONB,
  total_cents     INTEGER,
  status          TEXT DEFAULT 'draft',
  sent_at         TIMESTAMPTZ,
  accepted_at     TIMESTAMPTZ,
  rejected_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_proposals_deal ON proposals(deal_id);

-- ============================================================
-- DIALER ENTERPRISE
-- ============================================================

CREATE TABLE IF NOT EXISTS callback_queue (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  lead_id         UUID REFERENCES leads(id) ON DELETE CASCADE,
  contact_id      UUID REFERENCES contacts(id) ON DELETE CASCADE,
  phone_number    TEXT NOT NULL,
  scheduled_at    TIMESTAMPTZ NOT NULL,
  reason          TEXT,
  assigned_to     UUID REFERENCES users(id) ON DELETE SET NULL,
  completed_at    TIMESTAMPTZ,
  status          TEXT DEFAULT 'pending',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_callback_queue_scheduled ON callback_queue(scheduled_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_callback_queue_assigned ON callback_queue(assigned_to, status);

CREATE TABLE IF NOT EXISTS call_scripts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  content         TEXT NOT NULL,
  campaign_id     UUID,
  tags            TEXT[],
  active          BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_call_scripts_org ON call_scripts(org_id);

CREATE TABLE IF NOT EXISTS qa_reviews (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  call_attempt_id UUID,
  reviewer_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  score           INTEGER,
  compliance_score INTEGER,
  script_adherence INTEGER,
  tone_score      INTEGER,
  notes           TEXT,
  reviewed_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_qa_reviews_call ON qa_reviews(call_attempt_id);

-- ============================================================
-- MARKETING ENGINE
-- ============================================================

CREATE TABLE IF NOT EXISTS journeys (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  description     TEXT,
  trigger_type    TEXT NOT NULL,
  trigger_config  JSONB,
  status          TEXT DEFAULT 'draft',
  entry_count     INTEGER DEFAULT 0,
  active          BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_journeys_org ON journeys(org_id);

CREATE TABLE IF NOT EXISTS journey_steps (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  journey_id      UUID NOT NULL REFERENCES journeys(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  step_type       TEXT NOT NULL,
  config          JSONB,
  sort_order      INTEGER DEFAULT 0,
  active          BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_journey_steps_journey ON journey_steps(journey_id);

CREATE TABLE IF NOT EXISTS ab_tests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  test_type       TEXT NOT NULL,
  variant_a       JSONB NOT NULL,
  variant_b       JSONB NOT NULL,
  winner          TEXT,
  started_at      TIMESTAMPTZ,
  ended_at        TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ab_tests_org ON ab_tests(org_id);

-- ============================================================
-- FINANCE ENTERPRISE
-- ============================================================

CREATE TABLE IF NOT EXISTS gl_accounts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  code            TEXT NOT NULL,
  name            TEXT NOT NULL,
  account_type    TEXT NOT NULL,
  parent_id       UUID REFERENCES gl_accounts(id) ON DELETE SET NULL,
  balance_cents   INTEGER DEFAULT 0,
  active          BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_gl_accounts_org ON gl_accounts(org_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_gl_accounts_code ON gl_accounts(org_id, code);

CREATE TABLE IF NOT EXISTS journal_entries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  entry_date      DATE NOT NULL,
  reference       TEXT,
  description     TEXT,
  debit_cents     INTEGER NOT NULL DEFAULT 0,
  credit_cents    INTEGER NOT NULL DEFAULT 0,
  account_id      UUID NOT NULL REFERENCES gl_accounts(id) ON DELETE CASCADE,
  entity_type     TEXT,
  entity_id       UUID,
  created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_journal_entries_org ON journal_entries(org_id, entry_date);

CREATE TABLE IF NOT EXISTS commissions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  deal_id         UUID REFERENCES deals(id) ON DELETE SET NULL,
  amount_cents    INTEGER NOT NULL,
  rate            NUMERIC(5,4),
  status          TEXT DEFAULT 'pending',
  paid_at         TIMESTAMPTZ,
  period_start    DATE,
  period_end      DATE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_commissions_user ON commissions(user_id, status);

-- ============================================================
-- OPERATIONS OS
-- ============================================================

CREATE TABLE IF NOT EXISTS projects (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  description     TEXT,
  status          TEXT DEFAULT 'planning',
  priority        priority_level DEFAULT 'medium',
  start_date      DATE,
  due_date        DATE,
  completed_at    TIMESTAMPTZ,
  owner_id        UUID REFERENCES users(id) ON DELETE SET NULL,
  team_id         UUID REFERENCES teams(id) ON DELETE SET NULL,
  budget_cents    INTEGER,
  actual_cents    INTEGER,
  progress        INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_projects_org ON projects(org_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);

CREATE TABLE IF NOT EXISTS project_tasks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  parent_id       UUID REFERENCES project_tasks(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  description     TEXT,
  assigned_to     UUID REFERENCES users(id) ON DELETE SET NULL,
  status          TEXT DEFAULT 'todo',
  priority        priority_level DEFAULT 'medium',
  start_date      DATE,
  due_date        DATE,
  completed_at    TIMESTAMPTZ,
  estimated_hours INTEGER,
  actual_hours    INTEGER,
  sort_order      INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_project_tasks_project ON project_tasks(project_id);

CREATE TABLE IF NOT EXISTS timesheets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id      UUID REFERENCES projects(id) ON DELETE SET NULL,
  task_id         UUID REFERENCES project_tasks(id) ON DELETE SET NULL,
  entry_date      DATE NOT NULL,
  hours           NUMERIC(4,2) NOT NULL DEFAULT 0,
  description     TEXT,
  billable        BOOLEAN DEFAULT true,
  approved        BOOLEAN DEFAULT false,
  approved_by     UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_timesheets_user ON timesheets(user_id, entry_date);

CREATE TABLE IF NOT EXISTS sops (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  content         TEXT NOT NULL,
  category        TEXT,
  version         INTEGER DEFAULT 1,
  owner_id        UUID REFERENCES users(id) ON DELETE SET NULL,
  active          BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sops_org ON sops(org_id);

-- ============================================================
-- INVENTORY ENTERPRISE
-- ============================================================

CREATE TABLE IF NOT EXISTS warehouses (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  code            TEXT,
  address         TEXT,
  city            TEXT,
  state           TEXT,
  country         TEXT,
  manager_id      UUID REFERENCES users(id) ON DELETE SET NULL,
  active          BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_warehouses_org ON warehouses(org_id);

CREATE TABLE IF NOT EXISTS purchase_orders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  po_number       TEXT NOT NULL,
  supplier_id     UUID,
  warehouse_id    UUID REFERENCES warehouses(id) ON DELETE SET NULL,
  status          TEXT DEFAULT 'draft',
  total_cents     INTEGER DEFAULT 0,
  ordered_at      TIMESTAMPTZ,
  expected_at     TIMESTAMPTZ,
  received_at     TIMESTAMPTZ,
  created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_org ON purchase_orders(org_id);

-- ============================================================
-- KNOWLEDGE BASE
-- ============================================================

CREATE TABLE IF NOT EXISTS documents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  content         TEXT,
  doc_type        TEXT DEFAULT 'document',
  folder_id       UUID,
  owner_id        UUID REFERENCES users(id) ON DELETE SET NULL,
  version         INTEGER DEFAULT 1,
  status          TEXT DEFAULT 'draft',
  ai_summary      TEXT,
  ai_tags         TEXT[],
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_documents_org ON documents(org_id);
CREATE INDEX IF NOT EXISTS idx_documents_search ON documents USING gin(to_tsvector('english', title || ' ' || COALESCE(content, '')));

CREATE TABLE IF NOT EXISTS document_versions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  document_id     UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  version         INTEGER NOT NULL,
  content         TEXT,
  changed_by      UUID REFERENCES users(id) ON DELETE SET NULL,
  change_summary  TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_doc_versions_doc ON document_versions(document_id);

CREATE TABLE IF NOT EXISTS meeting_notes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  content         TEXT,
  meeting_date    TIMESTAMPTZ,
  attendees       JSONB,
  action_items    JSONB,
  decisions       JSONB,
  ai_summary      TEXT,
  created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_meeting_notes_org ON meeting_notes(org_id);

-- ============================================================
-- EXECUTIVE COMMAND CENTER
-- ============================================================

CREATE TABLE IF NOT EXISTS ceo_metrics (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  metric_date     DATE NOT NULL,
  revenue_cents   INTEGER DEFAULT 0,
  pipeline_cents  INTEGER DEFAULT 0,
  new_leads       INTEGER DEFAULT 0,
  new_deals       INTEGER DEFAULT 0,
  closed_deals    INTEGER DEFAULT 0,
  calls_made      INTEGER DEFAULT 0,
  emails_sent     INTEGER DEFAULT 0,
  sms_sent        INTEGER DEFAULT 0,
  appointments    INTEGER DEFAULT 0,
  avg_deal_size_cents INTEGER DEFAULT 0,
  cac_cents       INTEGER DEFAULT 0,
  ltv_cents       INTEGER DEFAULT 0,
  churn_rate      NUMERIC(5,2),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ceo_metrics_org ON ceo_metrics(org_id, metric_date);

CREATE TABLE IF NOT EXISTS risk_alerts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  alert_type      TEXT NOT NULL,
  severity        TEXT NOT NULL DEFAULT 'medium',
  title           TEXT NOT NULL,
  description     TEXT,
  entity_type     TEXT,
  entity_id       UUID,
  recommended_action TEXT,
  dismissed       BOOLEAN DEFAULT false,
  dismissed_by    UUID REFERENCES users(id) ON DELETE SET NULL,
  dismissed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_risk_alerts_org ON risk_alerts(org_id, dismissed) WHERE dismissed = false;
