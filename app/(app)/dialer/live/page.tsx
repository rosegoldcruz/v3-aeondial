import { Softphone } from "@/components/softphone";
import { getOrgId } from "@/lib/auth/session";
import { listCalls } from "@/lib/telephony/calls";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function DialerLivePage() {
  const orgId = await getOrgId();
  if (!orgId) redirect("/login");

  const calls = await listCalls(orgId, 50);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Live Dialer</h1>
          <p className="text-sm text-muted-foreground mt-1">Make calls via Twilio/Telnyx — primary with automatic failover</p>
        </div>
        <span className="text-xs text-muted-foreground">{calls.length} recent calls</span>
      </div>

      <div className="grid gap-6 lg:grid-cols-[380px,1fr]">
        {/* Softphone */}
        <Softphone />

        {/* Live Call Log */}
        <div className="rounded-xl border border-sidebar-border bg-sidebar p-4">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Live Call Log</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-sidebar-border text-left text-xs text-muted-foreground uppercase tracking-wider">
                  <th className="px-3 py-2">To</th>
                  <th className="px-3 py-2">From</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Duration</th>
                  <th className="px-3 py-2">Provider</th>
                  <th className="px-3 py-2">Time</th>
                </tr>
              </thead>
              <tbody>
                {calls.length === 0 && (
                  <tr><td colSpan={6} className="px-3 py-8 text-center text-muted-foreground text-xs">No calls yet. Use the softphone to make your first call.</td></tr>
                )}
                {calls.map((call) => (
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
                    <td className="px-3 py-2 text-xs text-muted-foreground">{call.duration_s ? `${Math.floor(call.duration_s / 60)}:${(call.duration_s % 60).toString().padStart(2, "0")}` : "—"}</td>
                    <td className="px-3 py-2 text-[10px] text-muted-foreground uppercase">{call.provider}</td>
                    <td className="px-3 py-2 text-[10px] text-muted-foreground">{new Date(call.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
