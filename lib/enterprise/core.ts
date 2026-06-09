/**
 * AEON OS Enterprise Core — Unified data layer for all modules
 * Provides: teams, tags, custom fields, saved views, audit logs,
 * activities, attachments, notes, mentions, permissions, AI insights
 */

import { query, one } from "@/lib/db/pool";

// ─── Teams ───────────────────────────────────────────────────────────────────

export interface Team {
  id: string; org_id: string; name: string;
  description: string | null; color: string | null;
  created_at: string; updated_at: string;
}

export async function listTeams(orgId: string): Promise<Team[]> {
  return query<Team>("SELECT * FROM teams WHERE org_id=$1 ORDER BY name", [orgId]);
}

export async function createTeam(orgId: string, name: string, description?: string, color?: string): Promise<Team | null> {
  return one<Team>(
    "INSERT INTO teams (org_id, name, description, color) VALUES ($1,$2,$3,$4) RETURNING *",
    [orgId, name, description ?? null, color ?? null]
  );
}

// ─── Tags ────────────────────────────────────────────────────────────────────

export interface Tag {
  id: string; org_id: string; name: string;
  color: string | null; entity_type: string;
}

export async function listTags(orgId: string, entityType: string): Promise<Tag[]> {
  return query<Tag>(
    "SELECT * FROM tags WHERE org_id=$1 AND entity_type=$2 ORDER BY name",
    [orgId, entityType]
  );
}

export async function createTag(orgId: string, entityType: string, name: string, color?: string): Promise<Tag | null> {
  return one<Tag>(
    "INSERT INTO tags (org_id, name, entity_type, color) VALUES ($1,$2,$3,$4) ON CONFLICT (org_id, entity_type, name) DO UPDATE SET color=$4 RETURNING *",
    [orgId, name, entityType, color ?? "#6366f1"]
  );
}

export async function tagEntity(orgId: string, tagId: string, entityType: string, entityId: string): Promise<void> {
  await query(
    "INSERT INTO entity_tags (org_id, tag_id, entity_type, entity_id) VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING",
    [orgId, tagId, entityType, entityId]
  );
}

export async function getEntityTags(orgId: string, entityType: string, entityId: string): Promise<Tag[]> {
  return query<Tag>(
    `SELECT t.* FROM tags t
     JOIN entity_tags et ON et.tag_id = t.id
     WHERE et.org_id=$1 AND et.entity_type=$2 AND et.entity_id=$3`,
    [orgId, entityType, entityId]
  );
}

// ─── Custom Fields ───────────────────────────────────────────────────────────

export interface CustomField {
  id: string; org_id: string; entity_type: string;
  name: string; field_type: string; options: Record<string, unknown> | null;
  required: boolean; sort_order: number; active: boolean;
}

export async function listCustomFields(orgId: string, entityType: string): Promise<CustomField[]> {
  return query<CustomField>(
    "SELECT * FROM custom_fields WHERE org_id=$1 AND entity_type=$2 AND active=true ORDER BY sort_order",
    [orgId, entityType]
  );
}

export async function getCustomFieldValues(orgId: string, entityType: string, entityId: string): Promise<Record<string, string>> {
  const rows = await query<{ name: string; value: string }>(
    `SELECT cf.name, cfv.value
     FROM custom_field_values cfv
     JOIN custom_fields cf ON cf.id = cfv.custom_field_id
     WHERE cfv.org_id=$1 AND cfv.entity_type=$2 AND cfv.entity_id=$3`,
    [orgId, entityType, entityId]
  );
  const map: Record<string, string> = {};
  rows.forEach((r) => { map[r.name] = r.value; });
  return map;
}

// ─── Saved Views ─────────────────────────────────────────────────────────────

export interface SavedView {
  id: string; org_id: string; user_id: string;
  name: string; entity_type: string; view_type: string;
  filters: Record<string, unknown> | null;
  sort: Record<string, unknown> | null;
  columns: Record<string, unknown> | null;
  is_default: boolean; shared: boolean;
}

export async function listSavedViews(orgId: string, entityType: string): Promise<SavedView[]> {
  return query<SavedView>(
    "SELECT * FROM saved_views WHERE org_id=$1 AND entity_type=$2 ORDER BY name",
    [orgId, entityType]
  );
}

export async function createSavedView(data: {
  org_id: string; user_id: string; name: string; entity_type: string;
  view_type: string; filters?: Record<string, unknown>;
  sort?: Record<string, unknown>; columns?: Record<string, unknown>;
}): Promise<SavedView | null> {
  return one<SavedView>(
    `INSERT INTO saved_views (org_id, user_id, name, entity_type, view_type, filters, sort, columns)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [data.org_id, data.user_id, data.name, data.entity_type, data.view_type,
     JSON.stringify(data.filters ?? null), JSON.stringify(data.sort ?? null), JSON.stringify(data.columns ?? null)]
  );
}

// ─── Audit Logs ──────────────────────────────────────────────────────────────

export interface AuditLog {
  id: string; org_id: string; user_id: string | null;
  action: string; entity_type: string; entity_id: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  created_at: string;
}

export async function logAudit(data: {
  org_id: string; user_id?: string; action: string; entity_type: string;
  entity_id?: string; old_values?: Record<string, unknown>;
  new_values?: Record<string, unknown>;
}): Promise<void> {
  await query(
    `INSERT INTO audit_logs (org_id, user_id, action, entity_type, entity_id, old_values, new_values)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [data.org_id, data.user_id ?? null, data.action, data.entity_type,
     data.entity_id ?? null, JSON.stringify(data.old_values ?? null), JSON.stringify(data.new_values ?? null)]
  );
}

export async function listAuditLogs(orgId: string, entityType?: string, limit = 50): Promise<AuditLog[]> {
  if (entityType) {
    return query<AuditLog>(
      "SELECT * FROM audit_logs WHERE org_id=$1 AND entity_type=$2 ORDER BY created_at DESC LIMIT $3",
      [orgId, entityType, limit]
    );
  }
  return query<AuditLog>(
    "SELECT * FROM audit_logs WHERE org_id=$1 ORDER BY created_at DESC LIMIT $2",
    [orgId, limit]
  );
}

// ─── Activities (Unified Timeline) ───────────────────────────────────────────

export interface Activity {
  id: string; org_id: string; user_id: string | null;
  actor_type: string; actor_name: string | null;
  action: string; entity_type: string; entity_id: string;
  entity_name: string | null; metadata: Record<string, unknown> | null;
  created_at: string;
}

export async function logActivity(data: {
  org_id: string; user_id?: string; actor_name?: string;
  action: string; entity_type: string; entity_id: string;
  entity_name?: string; metadata?: Record<string, unknown>;
}): Promise<void> {
  await query(
    `INSERT INTO activities (org_id, user_id, actor_name, action, entity_type, entity_id, entity_name, metadata)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [data.org_id, data.user_id ?? null, data.actor_name ?? null, data.action,
     data.entity_type, data.entity_id, data.entity_name ?? null, JSON.stringify(data.metadata ?? null)]
  );
}

export async function getActivityTimeline(orgId: string, entityType: string, entityId: string, limit = 50): Promise<Activity[]> {
  return query<Activity>(
    `SELECT * FROM activities WHERE org_id=$1 AND entity_type=$2 AND entity_id=$3
     ORDER BY created_at DESC LIMIT $4`,
    [orgId, entityType, entityId, limit]
  );
}

// ─── AI Insights ─────────────────────────────────────────────────────────────

export interface AiInsight {
  id: string; org_id: string; entity_type: string; entity_id: string | null;
  insight_type: string; title: string; description: string | null;
  confidence: number | null; value_cents: number | null;
  metadata: Record<string, unknown> | null;
  dismissed: boolean; created_at: string;
}

export async function createAiInsight(data: {
  org_id: string; entity_type: string; entity_id?: string;
  insight_type: string; title: string; description?: string;
  confidence?: number; value_cents?: number; metadata?: Record<string, unknown>;
}): Promise<AiInsight | null> {
  return one<AiInsight>(
    `INSERT INTO ai_insights (org_id, entity_type, entity_id, insight_type, title, description, confidence, value_cents, metadata)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    [data.org_id, data.entity_type, data.entity_id ?? null, data.insight_type, data.title,
     data.description ?? null, data.confidence ?? null, data.value_cents ?? null, JSON.stringify(data.metadata ?? null)]
  );
}

export async function listAiInsights(orgId: string, entityType?: string, limit = 20): Promise<AiInsight[]> {
  if (entityType) {
    return query<AiInsight>(
      `SELECT * FROM ai_insights WHERE org_id=$1 AND entity_type=$2 AND dismissed=false
       ORDER BY created_at DESC LIMIT $3`,
      [orgId, entityType, limit]
    );
  }
  return query<AiInsight>(
    `SELECT * FROM ai_insights WHERE org_id=$1 AND dismissed=false
     ORDER BY created_at DESC LIMIT $2`,
    [orgId, limit]
  );
}

export async function dismissAiInsight(orgId: string, id: string): Promise<void> {
  await query("UPDATE ai_insights SET dismissed=true WHERE id=$1 AND org_id=$2", [id, orgId]);
}

// ─── Permissions ─────────────────────────────────────────────────────────────

export interface Permission {
  id: string; org_id: string; user_id: string | null;
  team_id: string | null; module: string; action: string; allowed: boolean;
}

export async function checkPermission(
  orgId: string, userId: string, module: string, action: string
): Promise<boolean> {
  // Direct user permission
  const userPerm = await one<{ allowed: boolean }>(
    "SELECT allowed FROM permissions WHERE org_id=$1 AND user_id=$2 AND module=$3 AND action=$4 LIMIT 1",
    [orgId, userId, module, action]
  );
  if (userPerm) return userPerm.allowed;

  // Team permission
  const teamPerm = await one<{ allowed: boolean }>(
    `SELECT p.allowed FROM permissions p
     JOIN team_members tm ON tm.team_id = p.team_id
     WHERE p.org_id=$1 AND tm.user_id=$2 AND p.module=$3 AND p.action=$4
     LIMIT 1`,
    [orgId, userId, module, action]
  );
  if (teamPerm) return teamPerm.allowed;

  // Default: allow if no explicit deny
  return true;
}

export async function setPermission(data: {
  org_id: string; user_id?: string; team_id?: string;
  module: string; action: string; allowed: boolean;
}): Promise<void> {
  await query(
    `INSERT INTO permissions (org_id, user_id, team_id, module, action, allowed)
     VALUES ($1,$2,$3,$4,$5,$6)
     ON CONFLICT (org_id, user_id, team_id, module, action)
     DO UPDATE SET allowed=$6`,
    [data.org_id, data.user_id ?? null, data.team_id ?? null, data.module, data.action, data.allowed]
  );
}

// ─── Attachments ─────────────────────────────────────────────────────────────

export async function addAttachment(data: {
  org_id: string; entity_type: string; entity_id: string;
  file_name: string; file_url: string; file_size?: number; mime_type?: string; uploaded_by?: string;
}): Promise<void> {
  await query(
    `INSERT INTO attachments (org_id, entity_type, entity_id, file_name, file_url, file_size, mime_type, uploaded_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [data.org_id, data.entity_type, data.entity_id, data.file_name, data.file_url,
     data.file_size ?? null, data.mime_type ?? null, data.uploaded_by ?? null]
  );
}

export async function listAttachments(orgId: string, entityType: string, entityId: string): Promise<{ id: string; file_name: string; file_url: string; file_size: number | null; mime_type: string | null; created_at: string }[]> {
  return query(
    "SELECT id, file_name, file_url, file_size, mime_type, created_at FROM attachments WHERE org_id=$1 AND entity_type=$2 AND entity_id=$3 ORDER BY created_at DESC",
    [orgId, entityType, entityId]
  );
}

// ─── Internal Notes ──────────────────────────────────────────────────────────

export async function addNote(data: {
  org_id: string; entity_type: string; entity_id: string;
  content: string; created_by: string;
}): Promise<void> {
  await query(
    "INSERT INTO internal_notes (org_id, entity_type, entity_id, content, created_by) VALUES ($1,$2,$3,$4,$5)",
    [data.org_id, data.entity_type, data.entity_id, data.content, data.created_by]
  );
}

export async function listNotes(orgId: string, entityType: string, entityId: string): Promise<{ id: string; content: string; created_by: string; created_at: string }[]> {
  return query(
    `SELECT n.id, n.content, u.name as created_by, n.created_at
     FROM internal_notes n
     LEFT JOIN users u ON u.id = n.created_by
     WHERE n.org_id=$1 AND n.entity_type=$2 AND n.entity_id=$3
     ORDER BY n.created_at DESC`,
    [orgId, entityType, entityId]
  );
}
