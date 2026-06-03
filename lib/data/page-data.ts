import { redirect } from "next/navigation";
import { getOrgId } from "@/lib/auth/session";
import { getWorkspaceData } from "@/lib/data/workspace";

export async function requireWorkspaceData() {
  const orgId = await getOrgId();
  if (!orgId) redirect("/login");
  return getWorkspaceData(orgId);
}
