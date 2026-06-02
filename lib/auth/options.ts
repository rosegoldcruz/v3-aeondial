import type { NextAuthOptions } from "next-auth";

// ZITADEL via the generic OIDC provider. No Clerk anywhere.
// Required env: ZITADEL_ISSUER, ZITADEL_CLIENT_ID, ZITADEL_CLIENT_SECRET, NEXTAUTH_SECRET
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
      wellKnown: `${process.env.ZITADEL_ISSUER ?? ""}/.well-known/openid-configuration`,
      authorization: { params: { scope: "openid email profile" } },
      idToken: true,
      checks: ["pkce", "state"],
      clientId: process.env.ZITADEL_CLIENT_ID,
      clientSecret: process.env.ZITADEL_CLIENT_SECRET,
      profile(profile: any) {
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
    async jwt({ token, profile }) {
      if (profile && (profile as any).sub) token.sub = (profile as any).sub;
      return token;
    },
    async session({ session, token }) {
      if (session.user) (session.user as any).sub = token.sub;
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
  requireEnv("ZITADEL_CLIENT_SECRET");
}
