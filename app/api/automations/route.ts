import { NextRequest, NextResponse } from "next/server";
import { getOrgId } from "@/lib/auth/session";
import {
  listWorkflows,
  listExecutions,
  triggerWebhook,
  setWorkflowActive,
  healthCheck,
} from "@/lib/n8n/client";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const orgId = await getOrgId();
  if (!orgId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const kind = req.nextUrl.searchParams.get("kind") ?? "workflows";

  if (kind === "health") {
    const ok = await healthCheck();
    return NextResponse.json({ status: ok ? "connected" : "unreachable" });
  }

  if (kind === "executions") {
    const execs = await listExecutions(50);
    return NextResponse.json(execs);
  }

  const workflows = await listWorkflows();
  return NextResponse.json(workflows);
}

export async function POST(req: NextRequest) {
  const orgId = await getOrgId();
  if (!orgId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await req.json()) as Record<string, unknown>;
  const action = typeof body.action === "string" ? body.action : "trigger";

  if (action === "trigger") {
    const webhookPath = typeof body.webhook_path === "string" ? body.webhook_path : "";
    if (!webhookPath) {
      return NextResponse.json({ error: "webhook_path required" }, { status: 400 });
    }
    const result = await triggerWebhook(webhookPath, {
      event: typeof body.event === "string" ? body.event : "manual",
      org_id: orgId,
      data: typeof body.data === "object" && body.data !== null
        ? (body.data as Record<string, unknown>)
        : {},
    });
    return NextResponse.json(result, { status: result.success ? 200 : 502 });
  }

  if (action === "toggle") {
    const workflowId = typeof body.workflow_id === "string" ? body.workflow_id : "";
    const active = body.active === true;
    if (!workflowId) {
      return NextResponse.json({ error: "workflow_id required" }, { status: 400 });
    }
    const ok = await setWorkflowActive(workflowId, active);
    return NextResponse.json({ success: ok }, { status: ok ? 200 : 502 });
  }

  return NextResponse.json({ error: "unknown action" }, { status: 400 });
}
