import { NextResponse } from "next/server";
import { one } from "@/lib/db/pool";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const r = await one<{ ok: number }>("SELECT 1 AS ok");
    return NextResponse.json({ status: "healthy", db: r?.ok === 1, ts: new Date().toISOString() });
  } catch (e: any) {
    return NextResponse.json({ status: "degraded", db: false, error: e?.message }, { status: 503 });
  }
}
