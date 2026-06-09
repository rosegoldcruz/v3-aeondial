"use client";

import { useEffect, useState } from "react";

interface DNCEntry {
  id: string; phone: string; reason: string | null; added_at: string;
}

export default function CompliancePage() {
  const [dncList, setDncList] = useState<DNCEntry[]>([]);
  const [phone, setPhone] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/dialer/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "list_dnc" }),
    })
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d)) setDncList(d); })
      .catch(() => {});
  }, []);

  async function addDnc(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch("/api/dialer/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "add_dnc", phone, reason: reason || "manual" }),
    });
    setPhone(""); setReason(""); setLoading(false);
    const r = await fetch("/api/dialer/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "list_dnc" }),
    });
    const d = await r.json();
    if (Array.isArray(d)) setDncList(d);
  }

  async function removeDnc(id: string) {
    await fetch("/api/dialer/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "remove_dnc", id }),
    });
    setDncList((prev) => prev.filter((x) => x.id !== id));
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Compliance — DNC / TCPA</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage Do-Not-Call list and calling restrictions</p>
      </div>

      <form onSubmit={addDnc} className="rounded-xl border border-sidebar-border bg-sidebar p-5 space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Add DNC Number</h3>
        <div className="flex gap-2">
          <input
            value={phone} onChange={(e) => setPhone(e.target.value)}
            placeholder="Phone number"
            required
            className="flex-1 bg-background border border-sidebar-border/50 rounded-lg px-3 py-2 text-sm text-foreground outline-none"
          />
          <input
            value={reason} onChange={(e) => setReason(e.target.value)}
            placeholder="Reason (optional)"
            className="flex-1 bg-background border border-sidebar-border/50 rounded-lg px-3 py-2 text-sm text-foreground outline-none"
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-red-500/20 border border-red-500/40 px-4 py-2 text-sm font-semibold text-red-400 hover:bg-red-500/30 transition-colors disabled:opacity-50"
          >
            Block
          </button>
        </div>
      </form>

      <div className="rounded-xl border border-sidebar-border bg-sidebar p-5">
        <h3 className="text-sm font-semibold text-foreground mb-3">DNC List ({dncList.length} numbers)</h3>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {dncList.length === 0 && <p className="text-xs text-muted-foreground">No DNC entries</p>}
          {dncList.map((entry) => (
            <div key={entry.id} className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-sidebar-border/50">
              <div>
                <div className="text-sm font-mono text-foreground">{entry.phone}</div>
                {entry.reason && <div className="text-[10px] text-muted-foreground">{entry.reason}</div>}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] text-muted-foreground">{new Date(entry.added_at).toLocaleDateString()}</span>
                <button
                  onClick={() => removeDnc(entry.id)}
                  className="text-[10px] text-red-400 hover:underline"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
