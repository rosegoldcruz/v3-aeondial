import { NextRequest, NextResponse } from "next/server";
import { getOrgId } from "@/lib/auth/session";
import { aeonModel } from "@/lib/ai/client";
import { generateText } from "ai";
import { query } from "@/lib/db/pool";

export const dynamic = "force-dynamic";

const SYSTEMS: Record<string, string> = {
  code: "You are AEON's coding agent. Produce production-grade, runnable code. No placeholders, no fake values.",
  marketing: "You are AEON's marketing agent. Produce sharp, on-brand copy and campaign assets.",
  asset: "You are AEON's asset agent. Produce structured creative briefs and asset specs.",
};

export async function POST(req: NextRequest) {
  const orgId = await getOrgId();
  if (!orgId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!process.env.DEEPSEEK_API_KEY) return NextResponse.json({ error: "Add API key in /admin/integrations" }, { status: 400 });
  const body = (await req.json()) as Record<string, unknown>;
  const kind = typeof body.kind === "string" ? body.kind : "code";
  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  if (!prompt) return NextResponse.json({ error: "prompt required" }, { status: 400 });

  const { text } = await generateText({
    model: aeonModel(),
    system: SYSTEMS[kind] ?? SYSTEMS.code,
    prompt,
  });

  await query(
    "INSERT INTO agent_runs (org_id, kind, prompt, output, status) VALUES ($1,$2,$3,$4,'done')",
    [orgId, kind, prompt, text]
  );
  return NextResponse.json({ output: text });
}
