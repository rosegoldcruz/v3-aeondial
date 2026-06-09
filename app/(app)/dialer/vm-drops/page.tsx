"use client";

import { useEffect, useState } from "react";

interface VMDrop {
  id: string; name: string; audio_url: string; duration_s: number | null; created_at: string;
}

export default function VMDropsPage() {
  const [drops, setDrops] = useState<VMDrop[]>([]);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/dialer/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "list_vm_drops" }),
    })
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d)) setDrops(d); })
      .catch(() => {});
  }, []);

  async function addDrop(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch("/api/dialer/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create_vm_drop", name, audio_url: url }),
    });
    setName(""); setUrl(""); setLoading(false);
    // Refresh
    const r = await fetch("/api/dialer/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "list_vm_drops" }),
    });
    const d = await r.json();
    if (Array.isArray(d)) setDrops(d);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Voicemail Drops</h1>
        <p className="text-sm text-muted-foreground mt-1">Upload and manage voicemail drop audio files</p>
      </div>

      <form onSubmit={addDrop} className="rounded-xl border border-sidebar-border bg-sidebar p-5 space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Add New Voicemail Drop</h3>
        <input
          value={name} onChange={(e) => setName(e.target.value)}
          placeholder="Name (e.g. 'Intro - Solar Offer')"
          required
          className="w-full bg-background border border-sidebar-border/50 rounded-lg px-3 py-2 text-sm text-foreground outline-none"
        />
        <input
          value={url} onChange={(e) => setUrl(e.target.value)}
          placeholder="Audio URL (MP3/WAV)"
          required
          className="w-full bg-background border border-sidebar-border/50 rounded-lg px-3 py-2 text-sm text-foreground outline-none"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-accent/20 border border-accent/40 px-4 py-2 text-sm font-semibold text-accent hover:bg-accent/30 transition-colors disabled:opacity-50"
        >
          Add Voicemail Drop
        </button>
      </form>

      <div className="rounded-xl border border-sidebar-border bg-sidebar p-5">
        <h3 className="text-sm font-semibold text-foreground mb-3">Library ({drops.length})</h3>
        <div className="space-y-2">
          {drops.length === 0 && <p className="text-xs text-muted-foreground">No voicemail drops yet</p>}
          {drops.map((drop) => (
            <div key={drop.id} className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-sidebar-border/50">
              <div>
                <div className="text-sm font-medium text-foreground">{drop.name}</div>
                <a href={drop.audio_url} target="_blank" rel="noopener noreferrer" className="text-xs text-accent hover:underline">{drop.audio_url}</a>
              </div>
              <span className="text-xs text-muted-foreground">{drop.duration_s ? `${drop.duration_s}s` : ""}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
