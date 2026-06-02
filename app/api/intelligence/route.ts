import { NextRequest, NextResponse } from "next/server";
import { getOrgId } from "@/lib/auth/session";
import { aeonModel } from "@/lib/ai/client";
import { generateText } from "ai";
import { query } from "@/lib/db/pool";

export const dynamic = "force-dynamic";

// RAG query endpoint. Retrieval against the aeon-rag vector store happens
// upstream via AEON_AI_BASE_URL (grounded gateway). We log Q/A here.
export async function POST(req: NextRequest) {
  const orgId = await getOrgId();
  if (!orgId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { question } = await req.json();
  if (!question) return NextResponse.json({ error: "question required" }, { status: 400 });

  const { text } = await generateText({
    model: aeonModel(),
    system:
      "You are AEON, the business intelligence agent for this organization. " +
      "Answer using retrieved company context. If you do not have grounded data, say so plainly. " +
      "Never fabricate figures.",
    prompt: question,
  });

  await query(
    "INSERT INTO rag_queries (org_id, question, answer) VALUES ($1,$2,$3)",
    [orgId, question, text]
  );
  return NextResponse.json({ answer: text });
}
