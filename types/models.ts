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
  id: string; org_id: string; name: string; company: string | null;
  email: string | null; phone: string | null; tags: string[];
  owner_id: string | null; created_at: string; updated_at: string;
}

export interface Deal {
  id: string; org_id: string; title: string; contact_id: string | null;
  stage: DealStage; value_cents: number; owner_id: string | null;
  expected_close: string | null; notes: string | null;
  created_at: string; updated_at: string;
}

export interface Activity {
  id: string; org_id: string; kind: ActivityKind;
  contact_id: string | null; deal_id: string | null; user_id: string | null;
  subject: string | null; body: string | null; occurred_at: string;
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
