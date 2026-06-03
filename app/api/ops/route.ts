import { NextRequest, NextResponse } from "next/server";
import { getOrgId } from "@/lib/auth/session";
import { one } from "@/lib/db/pool";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const orgId = await getOrgId();
  if (!orgId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = (await req.json()) as Record<string, unknown>;
  const kind = text(body.kind);
  const title = text(body.title) || text(body.name);
  const assignee = await one<{ id: string }>("SELECT id FROM users WHERE org_id=$1 ORDER BY created_at LIMIT 1", [orgId]);
  if (!title) return NextResponse.json({ error: "title required" }, { status: 400 });

  if (kind === "work-orders") {
    return NextResponse.json(await one(
      `INSERT INTO work_orders (org_id, title, assignee_id, status, due_date, notes)
       VALUES ($1,$2,$3,'pending',CURRENT_DATE + INTERVAL '7 days',$4) RETURNING *`,
      [orgId, title, assignee?.id ?? null, nullableText(body.notes)]
    ), { status: 201 });
  }
  if (kind === "employees") {
    return NextResponse.json(await one(
      `INSERT INTO employees (org_id, name, role, email, phone, status)
       VALUES ($1,$2,$3,$4,$5,'active') RETURNING *`,
      [orgId, title, text(body.role) || text(body.category) || "Employee", nullableText(body.email), nullableText(body.phone)]
    ), { status: 201 });
  }
  if (kind === "timesheets") {
    const employee = await one<{ id: string }>("SELECT id FROM employees WHERE org_id=$1 ORDER BY created_at LIMIT 1", [orgId]);
    if (!employee) return NextResponse.json({ error: "employee required" }, { status: 400 });
    return NextResponse.json(await one(
      `INSERT INTO timesheets (org_id, employee_id, date, hours, job_code, status)
       VALUES ($1,$2,CURRENT_DATE,$3,$4,'pending') RETURNING *`,
      [orgId, employee.id, numeric(body.hours, 1), text(body.category) || "OPS"]
    ), { status: 201 });
  }
  if (kind === "sops") {
    return NextResponse.json(await one(
      `INSERT INTO sops (org_id, title, category, version, content)
       VALUES ($1,$2,$3,'1.0',$4) RETURNING *`,
      [orgId, title, text(body.category) || "Ops", text(body.body) || "## Procedure\nRecord the approved operating procedure."]
    ), { status: 201 });
  }
  return NextResponse.json(await one(
    `INSERT INTO tasks (org_id, title, assignee_id, status, priority, due_date)
     VALUES ($1,$2,$3,'open',$4,CURRENT_DATE + INTERVAL '3 days') RETURNING *`,
    [orgId, title, assignee?.id ?? null, text(body.priority) || text(body.category) || "medium"]
  ), { status: 201 });
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function nullableText(value: unknown): string | null {
  const valueText = text(value);
  return valueText || null;
}

function numeric(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}
