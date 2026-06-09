"use client";

import { useEffect, useState } from "react";

interface Rule {
  id: string; dial_ratio: number; max_attempts: number; attempt_delay_m: number;
  quiet_hours_start: number | null; quiet_hours_end: number | null;
  timezone: string; require_amd: boolean; active: boolean;
}

export default function DialRulesPage() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/dialer/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "list_rules" }),
    })
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d)) setRules(d); })
      .catch(() => {});
  }, []);

  async function createRule(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const form = e.target as HTMLFormElement;
    const fd = new FormData(form);
    await fetch("/api/dialer/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "create_rule",
        dial_ratio: Number(fd.get("dial_ratio")),
        max_attempts: Number(fd.get("max_attempts")),
        attempt_delay_m: Number(fd.get("attempt_delay_m")),
        quiet_hours_start: Number(fd.get("quiet_hours_start")) || null,
        quiet_hours_end: Number(fd.get("quiet_hours_end")) || null,
        timezone: fd.get("timezone") || "America/Chicago",
        require_amd: fd.get("require_amd") === "on",
      }),
    });
    setLoading(false);
    form.reset();
    const r = await fetch("/api/dialer/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "list_rules" }),
    });
    const d = await r.json();
    if (Array.isArray(d)) setRules(d);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dial Rules</h1>
        <p className="text-sm text-muted-foreground mt-1">Configure campaign dialing behavior, compliance, and limits</p>
      </div>

      <form onSubmit={createRule} className="rounded-xl border border-sidebar-border bg-sidebar p-5 space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Create Rule</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><label className="text-xs text-muted-foreground">Dial Ratio</label><input name="dial_ratio" type="number" defaultValue={3} min={1} max={5} className="w-full mt-1 bg-background border border-sidebar-border/50 rounded-lg px-3 py-2 text-sm text-foreground outline-none" /></div>
          <div><label className="text-xs text-muted-foreground">Max Attempts</label><input name="max_attempts" type="number" defaultValue={5} min={1} className="w-full mt-1 bg-background border border-sidebar-border/50 rounded-lg px-3 py-2 text-sm text-foreground outline-none" /></div>
          <div><label className="text-xs text-muted-foreground">Delay Between Attempts (min)</label><input name="attempt_delay_m" type="number" defaultValue={60} min={5} className="w-full mt-1 bg-background border border-sidebar-border/50 rounded-lg px-3 py-2 text-sm text-foreground outline-none" /></div>
          <div><label className="text-xs text-muted-foreground">Timezone</label><input name="timezone" defaultValue="America/Chicago" className="w-full mt-1 bg-background border border-sidebar-border/50 rounded-lg px-3 py-2 text-sm text-foreground outline-none" /></div>
          <div><label className="text-xs text-muted-foreground">Quiet Hours Start (0-23)</label><input name="quiet_hours_start" type="number" min={0} max={23} className="w-full mt-1 bg-background border border-sidebar-border/50 rounded-lg px-3 py-2 text-sm text-foreground outline-none" /></div>
          <div><label className="text-xs text-muted-foreground">Quiet Hours End (0-23)</label><input name="quiet_hours_end" type="number" min={0} max={23} className="w-full mt-1 bg-background border border-sidebar-border/50 rounded-lg px-3 py-2 text-sm text-foreground outline-none" /></div>
        </div>
        <div className="flex items-center gap-2">
          <input name="require_amd" type="checkbox" defaultChecked className="rounded" />
          <label className="text-xs text-muted-foreground">Enable Answering Machine Detection</label>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-accent/20 border border-accent/40 px-4 py-2 text-sm font-semibold text-accent hover:bg-accent/30 transition-colors disabled:opacity-50"
        >
          Create Rule
        </button>
      </form>

      <div className="rounded-xl border border-sidebar-border bg-sidebar p-5">
        <h3 className="text-sm font-semibold text-foreground mb-3">Active Rules ({rules.length})</h3>
        <div className="space-y-2">
          {rules.length === 0 && <p className="text-xs text-muted-foreground">No rules configured</p>}
          {rules.map((r) => (
            <div key={r.id} className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-sidebar-border/50">
              <div className="text-sm text-foreground">Ratio 1:{r.dial_ratio} · Max {r.max_attempts} attempts · {r.attempt_delay_m}m delay · {r.timezone}</div>
              <span className={`text-[10px] px-2 py-0.5 rounded ${r.active ? "bg-emerald-500/10 text-emerald-400" : "bg-zinc-500/10 text-zinc-400"}`}>{r.active ? "Active" : "Inactive"}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
