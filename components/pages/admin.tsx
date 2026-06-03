import { Topbar } from "@/components/shell/topbar";
import { Badge, Stat } from "@/components/ui/primitives";
import { AdminUsersClient } from "@/components/pages/workbench-clients";
import { PageSection, SectionCard, StatGrid, TextInput, SelectInput, ActionButton, GhostButton } from "@/components/pages/common";
import { requireWorkspaceData } from "@/lib/data/page-data";

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
  const integrations = [
    ["DeepSeek API", Boolean(process.env.DEEPSEEK_API_KEY)],
    ["SendGrid", Boolean(process.env.SENDGRID_API_KEY)],
    ["Telnyx", Boolean(process.env.TELNYX_API_KEY)],
    ["Google Drive", Boolean(process.env.GOOGLE_DRIVE_CLIENT_ID)],
    ["Twilio", Boolean(process.env.TWILIO_ACCOUNT_SID)],
    ["NocoDB", true],
  ] as const;
  return (
    <>
      <Topbar title="Integrations" right={null} />
      <PageSection>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {integrations.map(([name, connected]) => (
            <div key={name} className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-foreground">{name}</div>
                <Badge tone={connected ? "success" : "muted"}>{connected ? "Connected" : "Not Connected"}</Badge>
              </div>
              <div className="mt-4"><TextInput type="password" defaultValue={connected ? "••••••••••••" : ""} placeholder="API key" /></div>
              <div className="mt-4"><ActionButton>{connected ? "Save" : "Connect"}</ActionButton></div>
            </div>
          ))}
        </div>
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
