import { cache } from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "./options";
import { one } from "@/lib/db/pool";
import type { UserRole } from "@/types/models";

interface SessionUserWithSub {
  sub?: string;
  email?: string | null;
}

interface CurrentUser {
  id: string;
  org_id: string;
  email: string;
  name: string | null;
  role: UserRole;
  avatar_url: string | null;
}

// Resolves the current ZITADEL session to an org_id.
// Memoised with React cache() — within one server render the lookup
// runs exactly once no matter how many server components call it.
export const getOrgId = cache(async function getOrgId(): Promise<string | null> {
  if (!process.env.POSTGRES_URL) {
    const devOrg = process.env.AEON_DEV_ORG_ID;
    return devOrg ?? null;
  }

  try {
    const session = await getServerSession(authOptions);
    const sessionUser = session?.user as SessionUserWithSub | undefined;
    const sub = sessionUser?.sub;

    if (sub) {
      const row = await one<{ org_id: string }>(
        "SELECT org_id FROM users WHERE zitadel_sub = $1 LIMIT 1",
        [sub]
      );
      if (row?.org_id) return row.org_id;
    }

    if (sessionUser?.email) {
      const row = await one<{ org_id: string }>(
        "SELECT org_id FROM users WHERE email = $1 AND active = true LIMIT 1",
        [sessionUser.email]
      );
      if (row?.org_id) return row.org_id;
    }

    const devOrg = process.env.AEON_DEV_ORG_ID;
    if (devOrg) return devOrg;

    return null;
  } catch {
    return process.env.AEON_DEV_ORG_ID ?? null;
  }
});

export async function getCurrentUser(): Promise<CurrentUser | null> {
  if (!process.env.POSTGRES_URL) return null;

  try {
    const session = await getServerSession(authOptions);
    const sessionUser = session?.user as SessionUserWithSub | undefined;
    const sub = sessionUser?.sub;
    const email = sessionUser?.email;
    if (!sub && !email) return null;
    return one<CurrentUser>(
      `SELECT id, org_id, email, name, role, avatar_url
       FROM users
       WHERE (zitadel_sub=$1 AND $1 IS NOT NULL) OR (email=$2 AND $2 IS NOT NULL)
       ORDER BY zitadel_sub NULLS LAST
       LIMIT 1`,
      [sub ?? null, email ?? null]
    );
  } catch {
    return null;
  }
}
