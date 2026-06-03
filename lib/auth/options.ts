import type { NextAuthOptions } from "next-auth";
import { query } from "@/lib/db/pool";

interface ZitadelProfile {
  sub: string;
  name?: string;
  preferred_username?: string;
  email?: string;
  picture?: string;
}

interface TokenProfile {
  sub?: string;
}

interface SignInProfile {
  sub?: unknown;
}

// ZITADEL via the generic OIDC provider. No Clerk anywhere.
// Required env: ZITADEL_ISSUER, ZITADEL_CLIENT_ID, NEXTAUTH_SECRET
function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt" },
  providers: [
    {
      id: "zitadel",
      name: "ZITADEL",
      type: "oauth",
      wellKnown: `${process.env.ZITADEL_ISSUER}/.well-known/openid-configuration`,
      authorization: {
        params: {
          scope: "openid email profile",
          code_challenge_method: "S256",
        },
      },
      idToken: true,
      checks: ["pkce", "state"],
      clientId: process.env.ZITADEL_CLIENT_ID,
      clientSecret: "",
      profile(profile: ZitadelProfile) {
        return {
          id: profile.sub,
          name: profile.name ?? profile.preferred_username ?? null,
          email: profile.email ?? null,
          image: profile.picture ?? null,
        };
      },
    },
  ],
  callbacks: {
    async signIn({ user, profile }) {
      const sub = typeof (profile as SignInProfile | undefined)?.sub === "string"
        ? (profile as SignInProfile).sub
        : undefined;
      const orgId = process.env.AEON_DEV_ORG_ID;
      if (sub && orgId && process.env.POSTGRES_URL) {
        try {
          await query(
            `WITH updated AS (
               UPDATE users
               SET zitadel_sub=$2,
                   name=COALESCE(NULLIF($4,''), name),
                   email=COALESCE(NULLIF($3,''), email)
               WHERE org_id=$1 AND email=$3
               RETURNING id
             )
             INSERT INTO users (org_id, zitadel_sub, email, name, role)
             SELECT $1,$2,$3,$4,'owner'
             WHERE NOT EXISTS (SELECT 1 FROM updated)
             ON CONFLICT (zitadel_sub)
             DO UPDATE SET email=EXCLUDED.email, name=EXCLUDED.name`,
            [orgId, sub, user.email ?? "", user.name ?? ""]
          );
        } catch {
          return true;
        }
      }
      return true;
    },
    async jwt({ token, profile }) {
      const oidcProfile = profile as TokenProfile | undefined;
      if (oidcProfile?.sub) token.sub = oidcProfile.sub;
      return token;
    },
    async session({ session, token }) {
      if (session.user) (session.user as typeof session.user & { sub?: string }).sub = token.sub;
      return session;
    },
  },
  pages: { signIn: "/login" },
};

// Force eager evaluation guard for misconfig in production startup logs.
export function assertAuthEnv() {
  requireEnv("NEXTAUTH_SECRET");
  requireEnv("ZITADEL_ISSUER");
  requireEnv("ZITADEL_CLIENT_ID");
}
