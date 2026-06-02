import { Topbar } from "@/components/shell/topbar";
import { Card, SectionTitle } from "@/components/ui/primitives";
import { getCurrentUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  return (
    <>
      <Topbar title="Settings" />
      <div className="p-5 md:p-8 space-y-4 max-w-2xl">
        <Card>
          <SectionTitle>Identity</SectionTitle>
          {user ? (
            <div className="text-sm text-ink space-y-1">
              <div>{(user as any).name ?? "—"}</div>
              <div className="text-muted">{(user as any).email}</div>
              <div className="text-[10px] uppercase tracking-wider text-ember">{(user as any).role}</div>
            </div>
          ) : (
            <div className="text-sm text-muted">No session. Sign in via ZITADEL.</div>
          )}
        </Card>
        <Card>
          <SectionTitle>Data Layer</SectionTitle>
          <div className="text-xs text-muted space-y-1">
            <div>Postgres — self-hosted (single source of truth)</div>
            <div>NocoDB — internal admin UI over the same Postgres</div>
            <div>AI — Vertex Gemini via OpenAI-compatible gateway</div>
          </div>
        </Card>
      </div>
    </>
  );
}
