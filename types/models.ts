// Shared domain types — mirror database/schema.sql

export type UserRole = "owner" | "admin" | "manager" | "employee";
export type DealStage = "lead" | "qualified" | "proposal" | "negotiation" | "won" | "lost";
export type ActivityKind = "call" | "email" | "sms" | "meeting" | "note" | "task";
export type TxnType = "in" | "out";
export type BidStatus = "draft" | "sent" | "accepted" | "rejected" | "expired";
export type CabinetLine = "framed" | "frameless";

export interface Org { id: string; name: string; slug: string; created_at: string; }

export interface User {
  id: string; org_id: string; zitadel_sub: string | null;
  email: string; name: string | null; role: UserRole;
  active: boolean; avatar_url: string | null; created_at: string;
}

export interface Contact {
  id: string; org_id: string; name: string; title: string | null;
  company: string | null; email: string | null; phone: string | null;
  linkedin: string | null; twitter: string | null; birthday: string | null;
  referral_source: string | null; first_contact_date: string | null;
  lifetime_value_cents: number; health_score: number; health_tier: string;
  last_activity_at: string | null; notes: string | null; interests: string | null;
  tags: string[];
  owner_id: string | null; created_at: string; updated_at: string;
}

export interface Deal {
  id: string; org_id: string; title: string; contact_id: string | null;
  stage: DealStage; value_cents: number; probability: number; owner_id: string | null;
  expected_close: string | null; next_action: string | null; competitor: string | null;
  last_stage_change: string; notes: string | null;
  created_at: string; updated_at: string;
}

export interface Activity {
  id: string; org_id: string; kind: ActivityKind;
  contact_id: string | null; deal_id: string | null; user_id: string | null;
  subject: string | null; body: string | null; sentiment: string; duration_seconds: number | null; occurred_at: string;
}

export interface Lead {
  id: string; org_id: string; name: string; company: string | null;
  email: string | null; phone: string | null; status: string;
  source: string | null; campaign: string | null;
  budget_range: string | null; pain_points: string | null;
  decision_timeline: string | null; last_contacted_at: string | null;
  notes: string | null; tags: string[];
  sentiment: string; score: number; score_tier: string;
  owner_id: string | null;
  created_at: string; updated_at: string;
}

export interface LeadActivity {
  id: string; org_id: string; lead_id: string; kind: string;
  subject: string | null; body: string | null; sentiment: string;
  duration_seconds: number | null; user_id: string | null;
  occurred_at: string;
}

export interface Campaign {
  id: string; org_id: string; name: string; type: string; status: string;
  sent: number; opens: number; clicks: number; created_at: string;
}

export interface Entity { id: string; org_id: string; name: string; legal_name: string | null; created_at: string; }

export interface Subscription {
  id: string; org_id: string; entity_id: string; name: string;
  amount_cents: number; category: string; active: boolean; created_at: string;
}

export interface Transaction {
  id: string; org_id: string; entity_id: string; description: string;
  amount_cents: number; type: TxnType; category: string;
  occurred_on: string; created_at: string;
}

export interface CatalogItem {
  id: string; org_id: string; sku: string | null; description: string;
  line: CabinetLine; is_accessory: boolean; list_cents: number; created_at: string;
}

export interface InventoryItem {
  id: string; org_id: string; name: string; sku: string | null;
  category: string | null; qty: number; cost_cents: number; list_cents: number;
  created_at: string; updated_at: string;
}

export interface Bid {
  id: string; org_id: string; title: string; contact_id: string | null;
  line: CabinetLine; price_margin: number; status: BidStatus;
  list_total_cents: number; bid_total_cents: number;
  owner_id: string | null; created_at: string; updated_at: string;
}

export interface BidLine {
  id: string; bid_id: string; catalog_item_id: string | null;
  description: string; qty: number; list_cents: number;
  factor: number; bid_cents: number;
}

export interface RagDocument {
  id: string; org_id: string; source: string; title: string | null;
  ingested_at: string | null; status: string; created_at: string;
}

export interface RagQuery {
  id: string; org_id: string; user_id: string | null; question: string;
  answer: string | null; sources: unknown[]; created_at: string;
}

export interface AgentRun {
  id: string; org_id: string; user_id: string | null; kind: string;
  prompt: string; output: string | null; status: string; created_at: string;
}

export interface Task {
  id: string; org_id: string; title: string; assignee_id: string | null;
  due_date: string | null; status: string; priority: string;
  created_at: string; updated_at: string;
}

export interface WorkOrder {
  id: string; org_id: string; title: string; assignee_id: string | null;
  status: string; due_date: string | null; notes: string | null;
  created_at: string; updated_at: string;
}

export interface Employee {
  id: string; org_id: string; name: string; role: string | null;
  email: string | null; phone: string | null; status: string;
  user_id: string | null; created_at: string;
}

export interface Timesheet {
  id: string; org_id: string; employee_id: string; date: string;
  hours: string; job_code: string | null; status: string; created_at: string;
}

export interface Sop {
  id: string; org_id: string; title: string; category: string | null;
  version: string; content: string | null; created_at: string; updated_at: string;
}

export interface DncNumber {
  id: string; org_id: string; phone: string; reason: string | null; added_at: string;
}

export interface AuditLog {
  id: string; org_id: string; user_id: string | null; action: string;
  resource: string; resource_id: string | null; ip: string | null; created_at: string;
}

export type CallDirection = "outbound" | "inbound";
export type CallStatus = "initiated" | "ringing" | "answered" | "completed" | "failed" | "busy" | "no_answer" | "cancelled";

export interface Call {
  id: string; org_id: string; user_id: string | null;
  lead_id: string | null; contact_id: string | null;
  direction: CallDirection; from_number: string | null; to_number: string;
  status: CallStatus; started_at: string; answered_at: string | null;
  ended_at: string | null; duration_s: number | null;
  disposition: string | null; recording_url: string | null;
  ari_channel_id: string | null;
  created_at: string; updated_at: string;
}
