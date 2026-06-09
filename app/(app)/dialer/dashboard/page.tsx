import { getOrgId } from "@/lib/auth/session";
import { listCalls } from "@/lib/telephony/calls";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

function fmtDuration(s: number | null): string {
  if (!s) return "—";
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export default async function DialerDashboardPage() {
  const orgId = await getOrgId();
  if (!orgId) redirect("/login");

  const calls = await listCalls(orgId, 100);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayCalls = calls.filter((c) => new Date(c.created_at) >= today);
  const completedCalls = calls.filter((c) => c.status === "completed");
  const totalDuration = completedCalls.reduce((sum, c) => sum + (c.duration_s || 0), 0);
  const avgDuration = completedCalls.length > 0 ? Math.round(totalDuration / completedCalls.length) : 0;
  const connectRate = todayCalls.length > 0
    ? Math.round((todayCalls.filter((c) => c.status === "completed" || c.status === "in-progress").length / todayCalls.length) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dialer Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Real-time call metrics from Twilio + Telnyx</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Calls Today", value: String(todayCalls.length) },
          { label: "Completed", value: String(completedCalls.length) },
          { label: "Avg Duration", value: fmtDuration(avgDuration) },
          { label: "Connect Rate", value: `${connectRate}%` },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-sidebar-border bg-sidebar p-4">
            <div className="text-xs text-muted-foreground uppercase tracking-wider">{s.label}</div>
            <div className="text-2xl font-bold text-foreground mt-1">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Recent Calls Table */}
      <div className="rounded-xl border border-sidebar-border bg-sidebar p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3">Recent Calls</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-sidebar-border text-left text-xs text-muted-foreground uppercase tracking-wider">
                <th className="px-3 py-2">To</th>
                <th className="px-3 py-2">From</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Duration</th>
                <th className="px-3 py-2">Disposition</th>
                <th className="px-3 py-2">Provider</th>
                <th className="px-3 py-2">Time</th>
              </tr>
            </thead>
            <tbody>
              {calls.length === 0 && (
                <tr><td colSpan={7} className="px-3 py-8 text-center text-muted-foreground text-xs">No calls yet. Go to Live Dialer to make calls.</td></tr>
              )}
              {calls.slice(0, 20).map((call) => (
                <tr key={call.id} className="border-b border-sidebar-border/50 hover:bg-sidebar-accent/30">
                  <td className="px-3 py-2 font-mono text-xs text-foreground">{call.to_number}</td>
                  <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{call.from_number}</td>
                  <td className="px-3 py-2">
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium uppercase ${
                      call.status === "completed" ? "bg-emerald-500/10 text-emerald-400"
                        : call.status === "in-progress" ? "bg-blue-500/10 text-blue-400"
                        : call.status === "busy" ? "bg-red-500/10 text-red-400"
                        : "bg-yellow-500/10 text-yellow-400"
                    }`}>
                      {call.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{fmtDuration(call.duration_s)}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{call.disposition ?? "—"}</td>
                  <td className="px-3 py-2 text-[10px] text-muted-foreground uppercase">{call.provider}</td>
                  <td className="px-3 py-2 text-[10px] text-muted-foreground">{new Date(call.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
