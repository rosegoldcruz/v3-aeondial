import { NextRequest, NextResponse } from "next/server";
import { getOrgId } from "@/lib/auth/session";
import {
  getAgencyStats, listBusinesses, createBusiness,
  listPreviews, listCampaigns, listOpportunities,
  updateOpportunityStage, listAgentLogs, logAgentAction,
} from "@/lib/data/agency";
import { triggerWebhook } from "@/lib/n8n/client";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const orgId = await getOrgId();
  if (!orgId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const kind = req.nextUrl.searchParams.get("kind") ?? "stats";

  switch (kind) {
    case "stats":
      return NextResponse.json(await getAgencyStats(orgId));
    case "businesses":
      return NextResponse.json(await listBusinesses(orgId));
    case "previews":
      return NextResponse.json(await listPreviews(orgId));
    case "campaigns":
      return NextResponse.json(await listCampaigns(orgId));
    case "pipeline": {
      const stage = req.nextUrl.searchParams.get("stage") ?? undefined;
      return NextResponse.json(await listOpportunities(orgId, stage));
    }
    case "agents":
      return NextResponse.json(await listAgentLogs(orgId));
    default:
      return NextResponse.json({ error: "unknown kind" }, { status: 400 });
  }
}

export async function POST(req: NextRequest) {
  const orgId = await getOrgId();
  if (!orgId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await req.json()) as Record<string, unknown>;
  const action = typeof body.action === "string" ? body.action : "";

  if (action === "create_business") {
    const name = typeof body.business_name === "string" ? body.business_name.trim() : "";
    if (!name) return NextResponse.json({ error: "business_name required" }, { status: 400 });
    const biz = await createBusiness({
      org_id: orgId,
      business_name: name,
      category: str(body.category),
      city: str(body.city),
      state: str(body.state),
      phone: str(body.phone),
      email: str(body.email),
      website: str(body.website),
      domain: str(body.domain),
      rating: typeof body.rating === "number" ? body.rating : undefined,
      review_count: typeof body.review_count === "number" ? body.review_count : undefined,
      source: str(body.source),
      source_tier: str(body.source_tier),
    });
    // Trigger n8n workflow for new business discovery
    await triggerWebhook("aeon/agency/business-discovered", {
      event: "business-discovered",
      org_id: orgId,
      data: { business_id: biz?.id, business_name: name },
    }).catch(() => {});
    await logAgentAction({ org_id: orgId, agent_name: "system", action: "business_created", target_id: biz?.id ?? undefined, target_type: "business" });
    return NextResponse.json(biz, { status: 201 });
  }

  if (action === "update_stage") {
    const id = str(body.opportunity_id);
    const stage = str(body.stage);
    if (!id || !stage) return NextResponse.json({ error: "opportunity_id and stage required" }, { status: 400 });
    const opp = await updateOpportunityStage(orgId, id, stage);
    if (!opp) return NextResponse.json({ error: "not found" }, { status: 404 });
    // Trigger n8n on stage change
    await triggerWebhook("aeon/agency/stage-changed", {
      event: "stage-changed",
      org_id: orgId,
      data: { opportunity_id: id, new_stage: stage },
    }).catch(() => {});
    await logAgentAction({ org_id: orgId, agent_name: "system", action: "stage_changed", target_id: id, target_type: "opportunity", payload: { stage } });
    return NextResponse.json(opp);
  }

  if (action === "trigger_workflow") {
    const webhookPath = str(body.webhook_path);
    if (!webhookPath) return NextResponse.json({ error: "webhook_path required" }, { status: 400 });
    const result = await triggerWebhook(webhookPath, {
      event: str(body.event) || "manual",
      org_id: orgId,
      data: typeof body.data === "object" && body.data !== null ? (body.data as Record<string, unknown>) : {},
    });
    return NextResponse.json(result, { status: result.success ? 200 : 502 });
  }

  return NextResponse.json({ error: "unknown action" }, { status: 400 });
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}
