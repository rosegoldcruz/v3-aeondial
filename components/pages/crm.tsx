import { CalendarDays, Mail, Phone, TrendingUp } from "lucide-react";
import { Topbar } from "@/components/shell/topbar";
import { Avatar, Badge, ProgressBar, Row, Stat } from "@/components/ui/primitives";
import { RevenueAreaChart } from "@/components/pages/charts";
import { GridHalves, GridTwo, PageSection, SectionCard, StatGrid } from "@/components/pages/common";
import { formatDate, formatDateTime, formatShortDate, initials, money, stageTone, timeAgo } from "@/lib/ui/format";
import { getOrgId } from "@/lib/auth/session";
import { pipelineValueCents } from "@/lib/data/crm";
import { requireWorkspaceData } from "@/lib/data/page-data";
import { CRMActivitiesClient, CRMCampaignsClient, CRMContactsClient, CRMDealsClient, CRMLeadsClient, CRMOpportunitiesTable } from "@/components/pages/crm-clients";

export async function CRMDashboardView() {
  const data = await requireWorkspaceData();
  const orgId = await getOrgId();
  const pipeline = data.deals.filter((deal) => !["won", "lost"].includes(deal.stage));
  const pipelineVal = orgId ? await pipelineValueCents(orgId) : pipeline.reduce((sum, deal) => sum + Number(deal.value_cents), 0);
  const wonThisMonth = data.deals.filter((deal) => deal.stage === "won" && new Date(deal.updated_at).getMonth() === new Date().getMonth()).reduce((sum, deal) => sum + Number(deal.value_cents), 0);
  const stageGroups = ["lead", "qualified", "proposal", "negotiation", "won"].map((stage) => {
    const deals = data.deals.filter((deal) => deal.stage === stage);
    return { stage, count: deals.length, value: deals.reduce((sum, deal) => sum + Number(deal.value_cents), 0) };
  });
  const weekly = last8Weeks(data.deals.map((deal) => deal.created_at));

  return (
    <>
      <Topbar title="CRM Overview" right={null} />
      <PageSection>
        <StatGrid>
          <Stat label="Total Contacts" value={String(data.contacts.length)} />
          <Stat label="Open Deals" value={String(pipeline.length)} />
          <Stat label="Pipeline Value" value={money(pipelineVal)} />
          <Stat label="Won This Month" value={money(wonThisMonth)} />
        </StatGrid>

        <GridTwo
          left={
            <SectionCard title="Deals Created Per Week">
              <RevenueAreaChart data={weekly.map((item) => ({ label: item.label, value: item.value, target: Math.max(1, item.value - 1) }))} />
            </SectionCard>
          }
          right={
            <SectionCard title="Pipeline Stages">
              <div className="space-y-4">
                {stageGroups.map((stage, index) => {
                  const total = Math.max(1, pipeline.length);
                  return (
                    <div key={stage.stage} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <div className="text-foreground">{stage.stage}</div>
                        <div className="text-muted-foreground">{stage.count} deals · {money(stage.value)}</div>
                      </div>
                      <ProgressBar value={Math.round((stage.count / total) * 100)} color={index % 2 === 0 ? "bg-chart-1" : "bg-chart-2"} delay={index * 120} />
                    </div>
                  );
                })}
              </div>
            </SectionCard>
          }
        />

        <GridHalves
          left={
            <SectionCard title="Recent Deals">
              <div className="space-y-1">
                {data.deals.slice(0, 5).map((deal, index) => (
                  <Row key={deal.id} delay={index * 50}>
                    <div className="flex items-center gap-3">
                      <Avatar initials={initials(deal.contact_name ?? deal.title)} />
                      <div>
                        <div className="text-sm font-medium text-foreground">{deal.title}</div>
                        <div className="text-xs text-muted-foreground">{deal.contact_name ?? "Unassigned contact"} · {deal.owner_name ?? "Open queue"}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-accent">{money(deal.value_cents)}</div>
                      <Badge tone={stageTone(deal.stage)}>{deal.stage}</Badge>
                    </div>
                  </Row>
                ))}
              </div>
            </SectionCard>
          }
          right={
            <SectionCard title="Recent Contacts Added">
              <div className="space-y-1">
                {data.contacts.slice(0, 5).map((contact, index) => (
                  <Row key={contact.id} delay={index * 50}>
                    <div className="flex items-center gap-3">
                      <Avatar initials={initials(contact.name)} />
                      <div>
                        <div className="text-sm font-medium text-foreground">{contact.name}</div>
                        <div className="text-xs text-muted-foreground">{contact.email ?? "No email"} · {contact.company ?? "No company"}</div>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">{formatShortDate(contact.created_at)}</div>
                  </Row>
                ))}
              </div>
            </SectionCard>
          }
        />
      </PageSection>
    </>
  );
}

export async function CRMLeadsView() {
  const data = await requireWorkspaceData();
  return (
    <>
      <Topbar title="Leads" right={null} />
      <CRMLeadsClient leads={data.leads} users={data.users} />
    </>
  );
}

export async function CRMContactsView() {
  const data = await requireWorkspaceData();
  return (
    <>
      <Topbar title="Contacts" right={null} />
      <CRMContactsClient contacts={data.contacts} />
    </>
  );
}

export async function CRMPipelineView() {
  const data = await requireWorkspaceData();
  const stages = ["lead", "qualified", "proposal", "negotiation", "won"] as const;
  return (
    <>
      <Topbar title="Pipeline" right={null} />
      <PageSection>
        <div className="grid gap-4 xl:grid-cols-5">
          {stages.map((stage) => {
            const deals = data.deals.filter((deal) => deal.stage === stage);
            const total = deals.reduce((sum, deal) => sum + Number(deal.value_cents), 0);
            return (
              <div key={stage} className="rounded-xl border border-border bg-card p-4">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-foreground capitalize">{stage}</div>
                    <div className="text-xs text-muted-foreground">{deals.length} deals · {money(total)}</div>
                  </div>
                  <Badge tone={stageTone(stage)}>{deals.length}</Badge>
                </div>
                <div className="space-y-3">
                  {deals.length ? deals.map((deal) => (
                    <div key={deal.id} className="rounded-xl border border-border bg-secondary/40 p-3">
                      <div className="text-sm font-medium text-foreground">{deal.title}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{deal.contact_name ?? "No contact linked"}</div>
                      <div className="mt-3 text-sm font-semibold text-accent">{money(deal.value_cents)}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{formatDate(deal.expected_close)}</div>
                    </div>
                  )) : (
                    <div className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">No deals</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </PageSection>
    </>
  );
}

export async function CRMDealsView() {
  const data = await requireWorkspaceData();
  return (
    <>
      <Topbar title="Deals" right={null} />
      <CRMDealsClient deals={data.deals} />
    </>
  );
}

export async function CRMOpportunitiesView() {
  const data = await requireWorkspaceData();
  return (
    <>
      <Topbar title="Opportunities" right={null} />
      <CRMOpportunitiesTable deals={data.deals} />
    </>
  );
}

export async function CRMActivitiesView() {
  const data = await requireWorkspaceData();
  return (
    <>
      <Topbar title="Activities" right={null} />
      <CRMActivitiesClient activities={data.activities} />
    </>
  );
}

export async function CRMCampaignsView() {
  const data = await requireWorkspaceData();
  return (
    <>
      <Topbar title="Campaigns" right={null} />
      <CRMCampaignsClient campaigns={data.campaigns} />
    </>
  );
}

export async function CRMCalendarView() {
  const data = await requireWorkspaceData();
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const days = Array.from({ length: end.getDate() }, (_, index) => {
    const day = index + 1;
    const iso = new Date(now.getFullYear(), now.getMonth(), day).toISOString().slice(0, 10);
    const items = data.activities.filter((activity) => new Date(activity.occurred_at).toISOString().slice(0, 10) === iso);
    return { day, items };
  });
  const upcoming = data.activities.filter((activity) => new Date(activity.occurred_at) >= now).slice(0, 7);

  return (
    <>
      <Topbar title="Calendar" right={null} />
      <PageSection>
        <StatGrid>
          <Stat label="Meetings This Month" value={String(data.activities.filter((activity) => activity.kind === "meeting" && new Date(activity.occurred_at).getMonth() === now.getMonth()).length)} />
          <Stat label="Follow Ups" value={String(data.activities.filter((activity) => activity.kind === "task").length)} />
          <Stat label="Calls Logged" value={String(data.activities.filter((activity) => activity.kind === "call").length)} />
          <Stat label="Upcoming Events" value={String(upcoming.length)} />
        </StatGrid>
        <SectionCard title="Monthly Activity Calendar">
          <div className="grid gap-3 md:grid-cols-4 xl:grid-cols-7">
            {days.map((day) => (
              <div key={day.day} className="min-h-[120px] rounded-xl border border-border bg-secondary/30 p-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-foreground">{day.day}</div>
                  <Badge tone={day.items.length ? "accent" : "muted"}>{day.items.length}</Badge>
                </div>
                <div className="mt-3 space-y-2">
                  {day.items.slice(0, 3).map((item) => (
                    <div key={item.id} className="rounded-lg bg-card px-2 py-1 text-xs text-muted-foreground">{item.kind} · {item.contact_name ?? item.subject ?? "Activity"}</div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
        <SectionCard title="Next 7 Days">
          <div className="space-y-3">
            {upcoming.map((event) => (
              <div key={event.id} className="flex items-center justify-between rounded-lg border border-border bg-secondary/30 px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-accent/10 p-2 text-accent"><CalendarDays size={16} /></div>
                  <div>
                    <div className="text-sm font-medium text-foreground">{event.subject ?? "Scheduled activity"}</div>
                    <div className="text-xs text-muted-foreground">{event.contact_name ?? "General queue"} · {formatDateTime(event.occurred_at)}</div>
                  </div>
                </div>
                <Badge tone={stageTone(event.kind)}>{event.kind}</Badge>
              </div>
            ))}
          </div>
        </SectionCard>
      </PageSection>
    </>
  );
}

function last8Weeks(values: string[]) {
  return Array.from({ length: 8 }, (_, index) => {
    const start = new Date();
    start.setDate(start.getDate() - (7 * (7 - index)));
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    const count = values.filter((value) => {
      const date = new Date(value);
      return date >= start && date <= end;
    }).length;
    return {
      label: `W${index + 1}`,
      value: count,
    };
  });
}
