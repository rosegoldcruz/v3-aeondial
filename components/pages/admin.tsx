import { Topbar } from "@/components/shell/topbar";
import { Badge, Stat } from "@/components/ui/primitives";
import { AdminUsersClient, AdminIntegrationsClient } from "@/components/pages/workbench-clients";
import { PageSection, SectionCard, StatGrid, TextInput, SelectInput, ActionButton, GhostButton } from "@/components/pages/common";
import { requireWorkspaceData } from "@/lib/data/page-data";
import { query } from "@/lib/db/pool";
import { getOrgId } from "@/lib/auth/session";

export async function AdminUsersView() {
  const data = await requireWorkspaceData();
  return (
    <>
      <Topbar title="Users" right={null} />
      <AdminUsersClient users={data.users} />
    </>
  );
}

export async function AdminOrgView() {
  const data = await requireWorkspaceData();
  return (
    <>
      <Topbar title="Org Settings" right={null} />
      <PageSection>
        <StatGrid>
          <Stat label="Org Name" value="AEON Dial" />
          <Stat label="Plan" value="Enterprise" />
          <Stat label="Users" value={String(data.users.length)} />
          <Stat label="Data Retention" value="24 months" />
        </StatGrid>
        <SectionCard title="Organization">
          <div className="grid gap-4 md:grid-cols-2">
            <TextInput defaultValue="AEON Dial" />
            <SelectInput defaultValue="America/Phoenix"><option>America/Phoenix</option><option>UTC</option></SelectInput>
            <div className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">Logo upload placeholder</div>
            <div className="flex items-end"><ActionButton>Save</ActionButton></div>
          </div>
        </SectionCard>
      </PageSection>
    </>
  );
}

export async function AdminIntegrationsView() {
  const orgId = await getOrgId();
  let savedKeys: Record<string, boolean> = {
    DEEPSEEK_API_KEY: Boolean(process.env.DEEPSEEK_API_KEY),
    SENDGRID_API_KEY: Boolean(process.env.SENDGRID_API_KEY),
    TELNYX_API_KEY: Boolean(process.env.TELNYX_API_KEY),
    GOOGLE_DRIVE_CLIENT_ID: Boolean(process.env.GOOGLE_DRIVE_CLIENT_ID),
    TWILIO_ACCOUNT_SID: Boolean(process.env.TWILIO_ACCOUNT_SID),
  };
  if (orgId) {
    const rows = await query<{ key: string; value: string }>(
      "SELECT key, value FROM org_settings WHERE org_id=$1",
      [orgId]
    );
    for (const row of rows) {
      if (row.key in savedKeys) {
        savedKeys[row.key] = Boolean(row.value);
      }
    }
  }
  const integrations = [
    { name: "DeepSeek API", envKey: "DEEPSEEK_API_KEY", connected: savedKeys["DEEPSEEK_API_KEY"] },
    { name: "SendGrid", envKey: "SENDGRID_API_KEY", connected: savedKeys["SENDGRID_API_KEY"] },
    { name: "Telnyx", envKey: "TELNYX_API_KEY", connected: savedKeys["TELNYX_API_KEY"] },
    { name: "Google Drive", envKey: "GOOGLE_DRIVE_CLIENT_ID", connected: savedKeys["GOOGLE_DRIVE_CLIENT_ID"] },
    { name: "Twilio", envKey: "TWILIO_ACCOUNT_SID", connected: savedKeys["TWILIO_ACCOUNT_SID"] },
  ] as const;
  return (
    <>
      <Topbar title="Integrations" right={null} />
      <PageSection>
        <AdminIntegrationsClient integrations={integrations} />
      </PageSection>
    </>
  );
}

export async function AdminSettingsView() {
  const data = await requireWorkspaceData();
  return (
    <>
      <Topbar title="Settings" right={null} />
      <PageSection>
        <StatGrid>
          <Stat label="Org Name" value="AEON Dial" />
          <Stat label="Plan" value="Enterprise" />
          <Stat label="Users" value={String(data.users.length)} />
          <Stat label="Data Retention" value="24 months" />
        </StatGrid>
        <div className="grid gap-6 xl:grid-cols-2">
          <SectionCard title="Organization">
            <div className="grid gap-3">
              <TextInput defaultValue="AEON Dial" />
              <SelectInput defaultValue="America/Phoenix"><option>America/Phoenix</option><option>UTC</option></SelectInput>
            </div>
          </SectionCard>
          <SectionCard title="Notifications">
            <div className="grid gap-3">
              <SelectInput defaultValue="enabled"><option value="enabled">Email notifications enabled</option><option value="disabled">Disabled</option></SelectInput>
              <SelectInput defaultValue="daily"><option value="daily">Daily digest</option><option value="weekly">Weekly digest</option></SelectInput>
            </div>
          </SectionCard>
          <SectionCard title="Security">
            <div className="grid gap-3">
              <SelectInput defaultValue="60"><option value="60">60 minute session timeout</option><option value="30">30 minute session timeout</option></SelectInput>
              <SelectInput defaultValue="required"><option value="required">2FA required</option><option value="optional">2FA optional</option></SelectInput>
            </div>
          </SectionCard>
          <SectionCard title="Data">
            <div className="flex gap-3">
              <GhostButton>Export All Data</GhostButton>
              <ActionButton className="bg-destructive text-destructive-foreground border-destructive/40">Wipe Org Data</ActionButton>
            </div>
          </SectionCard>
        </div>
      </PageSection>
    </>
  );
}
