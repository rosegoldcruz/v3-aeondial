import { NextRequest, NextResponse } from "next/server";
import { getOrgId, getCurrentUser } from "@/lib/auth/session";
import {
  listTeams, createTeam, listTags, createTag, tagEntity, getEntityTags,
  listCustomFields, getCustomFieldValues, listSavedViews, createSavedView,
  listAuditLogs, logAudit, getActivityTimeline, logActivity,
  listAiInsights, createAiInsight, dismissAiInsight,
  checkPermission, setPermission,
  listAttachments, addAttachment, listNotes, addNote,
} from "@/lib/enterprise/core";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const orgId = await getOrgId();
  const user = await getCurrentUser();
  if (!orgId || !user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const kind = req.nextUrl.searchParams.get("kind") ?? "";
  const entityType = req.nextUrl.searchParams.get("entity_type") ?? "";
  const entityId = req.nextUrl.searchParams.get("entity_id") ?? "";

  switch (kind) {
    case "teams":
      return NextResponse.json(await listTeams(orgId));
    case "tags":
      return NextResponse.json(await listTags(orgId, entityType));
    case "entity_tags":
      return NextResponse.json(await getEntityTags(orgId, entityType, entityId));
    case "custom_fields":
      return NextResponse.json(await listCustomFields(orgId, entityType));
    case "custom_field_values":
      return NextResponse.json(await getCustomFieldValues(orgId, entityType, entityId));
    case "saved_views":
      return NextResponse.json(await listSavedViews(orgId, entityType));
    case "audit_logs":
      return NextResponse.json(await listAuditLogs(orgId, entityType || undefined));
    case "activities":
      return NextResponse.json(await getActivityTimeline(orgId, entityType, entityId));
    case "ai_insights":
      return NextResponse.json(await listAiInsights(orgId, entityType || undefined));
    case "attachments":
      return NextResponse.json(await listAttachments(orgId, entityType, entityId));
    case "notes":
      return NextResponse.json(await listNotes(orgId, entityType, entityId));
    case "permissions": {
      const module = req.nextUrl.searchParams.get("module") ?? "";
      const action = req.nextUrl.searchParams.get("action") ?? "";
      const allowed = await checkPermission(orgId, user.id, module, action);
      return NextResponse.json({ allowed });
    }
    default:
      return NextResponse.json({ error: "unknown kind" }, { status: 400 });
  }
}

export async function POST(req: NextRequest) {
  const orgId = await getOrgId();
  const user = await getCurrentUser();
  if (!orgId || !user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await req.json()) as Record<string, unknown>;
  const action = typeof body.action === "string" ? body.action : "";

  switch (action) {
    case "create_team": {
      const team = await createTeam(orgId, str(body.name), str(body.description), str(body.color));
      return NextResponse.json(team, { status: 201 });
    }
    case "create_tag": {
      const tag = await createTag(orgId, str(body.entity_type), str(body.name), str(body.color));
      return NextResponse.json(tag, { status: 201 });
    }
    case "tag_entity": {
      await tagEntity(orgId, str(body.tag_id), str(body.entity_type), str(body.entity_id));
      return NextResponse.json({ success: true });
    }
    case "create_saved_view": {
      const view = await createSavedView({
        org_id: orgId, user_id: user.id, name: str(body.name),
        entity_type: str(body.entity_type), view_type: str(body.view_type),
        filters: obj(body.filters), sort: obj(body.sort), columns: obj(body.columns),
      });
      return NextResponse.json(view, { status: 201 });
    }
    case "log_audit": {
      await logAudit({
        org_id: orgId, user_id: user.id, action: str(body.action),
        entity_type: str(body.entity_type), entity_id: str(body.entity_id) || undefined,
        old_values: obj(body.old_values), new_values: obj(body.new_values),
      });
      return NextResponse.json({ success: true });
    }
    case "log_activity": {
      await logActivity({
        org_id: orgId, user_id: user.id, actor_name: user.name || undefined,
        action: str(body.action), entity_type: str(body.entity_type),
        entity_id: str(body.entity_id), entity_name: str(body.entity_name) || undefined,
        metadata: obj(body.metadata),
      });
      return NextResponse.json({ success: true });
    }
    case "create_ai_insight": {
      const insight = await createAiInsight({
        org_id: orgId, entity_type: str(body.entity_type), entity_id: str(body.entity_id) || undefined,
        insight_type: str(body.insight_type), title: str(body.title),
        description: str(body.description) || undefined, confidence: num(body.confidence),
        value_cents: num(body.value_cents), metadata: obj(body.metadata),
      });
      return NextResponse.json(insight, { status: 201 });
    }
    case "dismiss_ai_insight": {
      await dismissAiInsight(orgId, str(body.id));
      return NextResponse.json({ success: true });
    }
    case "set_permission": {
      await setPermission({
        org_id: orgId, user_id: str(body.user_id) || undefined,
        team_id: str(body.team_id) || undefined, module: str(body.module),
        action: str(body.action_name), allowed: body.allowed === true,
      });
      return NextResponse.json({ success: true });
    }
    case "add_attachment": {
      await addAttachment({
        org_id: orgId, entity_type: str(body.entity_type), entity_id: str(body.entity_id),
        file_name: str(body.file_name), file_url: str(body.file_url),
        file_size: num(body.file_size), mime_type: str(body.mime_type) || undefined,
        uploaded_by: user.id,
      });
      return NextResponse.json({ success: true });
    }
    case "add_note": {
      await addNote({
        org_id: orgId, entity_type: str(body.entity_type), entity_id: str(body.entity_id),
        content: str(body.content), created_by: user.id,
      });
      return NextResponse.json({ success: true });
    }
    default:
      return NextResponse.json({ error: "unknown action" }, { status: 400 });
  }
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function num(v: unknown): number | undefined {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  return isNaN(n) ? undefined : n;
}

function obj(v: unknown): Record<string, unknown> | undefined {
  return typeof v === "object" && v !== null ? (v as Record<string, unknown>) : undefined;
}
