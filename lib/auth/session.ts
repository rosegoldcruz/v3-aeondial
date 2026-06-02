import { getServerSession } from "next-auth";
import { authOptions } from "./options";
import { one } from "@/lib/db/pool";

// Resolves the current ZITADEL session to an org_id.
// Maps the OIDC subject -> users.zitadel_sub -> users.org_id.
// DEV fallback: if AEON_DEV_ORG_ID is set and no session exists, use it
// so the platform is runnable before ZITADEL is fully provisioned.
export async function getOrgId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  const sub = (session?.user as any)?.sub as string | undefined;

  if (sub) {
    const row = await one<{ org_id: string }>(
      "SELECT org_id FROM users WHERE zitadel_sub = $1 LIMIT 1",
      [sub]
    );
    if (row?.org_id) return row.org_id;
  }

  const devOrg = process.env.AEON_DEV_ORG_ID;
  if (devOrg && process.env.NODE_ENV !== "production") return devOrg;

  return null;
}

export async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  const sub = (session?.user as any)?.sub as string | undefined;
  if (!sub) return null;
  return one(
    "SELECT id, org_id, email, name, role, avatar_url FROM users WHERE zitadel_sub=$1 LIMIT 1",
    [sub]
  );
}
