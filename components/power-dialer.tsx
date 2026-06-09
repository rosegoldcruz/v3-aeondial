"use client";

import { useEffect, useState, useCallback } from "react";
import { Phone, PhoneOff, Play, Pause, SkipForward, Volume2, Users, BarChart3, BrainCircuit } from "lucide-react";

interface DialSession {
  id: string; dial_ratio: number; status: string;
  total_attempts: number; total_connects: number; total_vm_drops: number;
}

interface AgentPresence {
  state: string; total_calls: number; total_talk_s: number;
}

interface Lead {
  id: string; phone: string; first_name: string | null; last_name: string | null;
  score: number; priority: string;
}

interface Attempt {
  id: string; phone_number: string; status: string; outcome: string | null;
  batch_index: number;
}

interface SupervisorStats {
  available_agents: number; dialing_agents: number; connected_agents: number;
  calls_per_hour: number; connection_rate: number; vm_rate: number;
}

interface AiRec {
  type: string; message: string; estimated_value: number; lead_count: number;
}

const STATE_COLORS: Record<string, string> = {
  AVAILABLE: "text-emerald-400 bg-emerald-500/10",
  DIALING: "text-yellow-400 bg-yellow-500/10",
  WAITING_FOR_CONNECT: "text-blue-400 bg-blue-500/10",
  CONNECTED: "text-emerald-400 bg-emerald-500/10 animate-pulse",
  PAUSED: "text-orange-400 bg-orange-500/10",
  BREAK: "text-zinc-400 bg-zinc-500/10",
  OFFLINE: "text-red-400 bg-red-500/10",
};

export function PowerDialer() {
  const [session, setSession] = useState<DialSession | null>(null);
  const [presence, setPresence] = useState<AgentPresence | null>(null);
  const [dialRatio, setDialRatio] = useState(3);
  const [agentPhone, setAgentPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [batchLeads, setBatchLeads] = useState<Lead[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [supervisor, setSupervisor] = useState<SupervisorStats | null>(null);
  const [aiRecs, setAiRecs] = useState<AiRec[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Load agent phone from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("aeon_agent_phone");
    if (saved) setAgentPhone(saved);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/dialer/session");
      const data = await res.json();
      setSession(data.session);
      setPresence(data.presence);
      if (data.session?.dial_ratio) setDialRatio(data.session.dial_ratio);
    } catch {}
  }, []);

  const refreshSupervisor = useCallback(async () => {
    try {
      const res = await fetch("/api/dialer/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "supervisor_stats" }),
      });
      const data = await res.json();
      setSupervisor(data);
    } catch {}
  }, []);

  const refreshAi = useCallback(async () => {
    try {
      const res = await fetch("/api/dialer/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "ai_recommendations" }),
      });
      const data = await res.json();
      if (Array.isArray(data)) setAiRecs(data);
    } catch {}
  }, []);

  useEffect(() => {
    refresh();
    refreshSupervisor();
    refreshAi();
    const iv = setInterval(() => { refresh(); refreshSupervisor(); }, 3000);
    return () => clearInterval(iv);
  }, [refresh, refreshSupervisor, refreshAi]);

  async function startSession() {
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/dialer/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start", dial_ratio: dialRatio }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSession(data.session);
      setPresence({ state: "AVAILABLE", total_calls: 0, total_talk_s: 0 });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start");
    }
    setLoading(false);
  }

  async function endSession() {
    setLoading(true);
    await fetch("/api/dialer/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "end" }),
    });
    setSession(null);
    setBatchLeads([]);
    setAttempts([]);
    setLoading(false);
  }

  async function nextBatch() {
    if (!agentPhone.trim()) {
      setError("Enter your agent phone number first");
      return;
    }
    localStorage.setItem("aeon_agent_phone", agentPhone);
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/dialer/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "next_batch", agent_phone: agentPhone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setBatchLeads(data.leads || []);
      setAttempts(data.attempts || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Batch failed");
    }
    setLoading(false);
  }

  async function setState(state: string) {
    await fetch("/api/dialer/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "set_state", state }),
    });
    refresh();
  }

  const isActive = session?.status === "active";
  const state = presence?.state || "OFFLINE";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Power Dialer</h1>
          <p className="text-sm text-muted-foreground mt-1">Progressive batch dialing — first human answer wins</p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${STATE_COLORS[state] || STATE_COLORS.OFFLINE}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-current" />
            {state.replace(/_/g, " ")}
          </span>
        </div>
      </div>

      {/* Session Controls */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-sidebar-border bg-sidebar p-5 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Session Control</h3>

          {!isActive ? (
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground">Dial Ratio (1:N)</label>
                <select
                  value={dialRatio}
                  onChange={(e) => setDialRatio(Number(e.target.value))}
                  className="w-full mt-1 bg-background border border-sidebar-border/50 rounded-lg px-3 py-2 text-sm text-foreground outline-none"
                >
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>1:{n} — Dial {n} leads per batch</option>
                  ))}
                </select>
              </div>
              <button
                onClick={startSession}
                disabled={loading}
                className="w-full rounded-lg bg-emerald-500/20 border border-emerald-500/40 py-3 text-sm font-semibold text-emerald-400 hover:bg-emerald-500/30 transition-colors disabled:opacity-50"
              >
                <Play size={16} className="inline mr-2" />
                Start Dial Session
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-xs text-muted-foreground">
                Ratio: 1:{session.dial_ratio} · Attempts: {session.total_attempts} · Connects: {session.total_connects} · VM Drops: {session.total_vm_drops}
              </div>
              <button
                onClick={nextBatch}
                disabled={loading || state === "DIALING" || state === "WAITING_FOR_CONNECT"}
                className="w-full rounded-lg bg-accent/20 border border-accent/40 py-3 text-sm font-semibold text-accent hover:bg-accent/30 transition-colors disabled:opacity-50"
              >
                <Phone size={16} className="inline mr-2" />
                {state === "DIALING" ? "Dialing..." : state === "WAITING_FOR_CONNECT" ? "Waiting for connect..." : "Next Batch"}
              </button>
              <div className="flex gap-2">
                <button onClick={() => setState("PAUSED")} className="flex-1 rounded-lg bg-orange-500/10 border border-orange-500/30 py-2 text-xs text-orange-400 hover:bg-orange-500/20"><Pause size={14} className="inline mr-1" />Pause</button>
                <button onClick={() => setState("AVAILABLE")} className="flex-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 py-2 text-xs text-emerald-400 hover:bg-emerald-500/20"><Play size={14} className="inline mr-1" />Resume</button>
                <button onClick={endSession} className="flex-1 rounded-lg bg-red-500/10 border border-red-500/30 py-2 text-xs text-red-400 hover:bg-red-500/20"><PhoneOff size={14} className="inline mr-1" />End</button>
              </div>
            </div>
          )}

          {error && <div className="text-xs text-red-400">{error}</div>}
        </div>

        {/* Agent Config */}
        <div className="rounded-xl border border-sidebar-border bg-sidebar p-5 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Agent Configuration</h3>
          <div>
            <label className="text-xs text-muted-foreground">Your Agent Phone (Leg)</label>
            <input
              type="tel"
              value={agentPhone}
              onChange={(e) => setAgentPhone(e.target.value)}
              placeholder="+14803648205"
              className="w-full mt-1 bg-background border border-sidebar-border/50 rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-accent/50"
            />
            <p className="text-[10px] text-muted-foreground mt-1">We call this number first. When you answer, we bridge the lead.</p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="p-2 rounded-lg bg-background/50"><div className="text-lg font-bold text-foreground">{presence?.total_calls ?? 0}</div><div className="text-[10px] text-muted-foreground">Calls Today</div></div>
            <div className="p-2 rounded-lg bg-background/50"><div className="text-lg font-bold text-foreground">{Math.floor((presence?.total_talk_s ?? 0) / 60)}m</div><div className="text-[10px] text-muted-foreground">Talk Time</div></div>
          </div>
        </div>

        {/* Supervisor Stats */}
        <div className="rounded-xl border border-sidebar-border bg-sidebar p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Users size={14} className="text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">Team Live</h3>
          </div>
          {supervisor ? (
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 rounded-lg bg-background/50 text-center"><div className="text-lg font-bold text-emerald-400">{supervisor.available_agents}</div><div className="text-[10px] text-muted-foreground">Available</div></div>
              <div className="p-2 rounded-lg bg-background/50 text-center"><div className="text-lg font-bold text-blue-400">{supervisor.dialing_agents}</div><div className="text-[10px] text-muted-foreground">Dialing</div></div>
              <div className="p-2 rounded-lg bg-background/50 text-center"><div className="text-lg font-bold text-emerald-400">{supervisor.connected_agents}</div><div className="text-[10px] text-muted-foreground">Connected</div></div>
              <div className="p-2 rounded-lg bg-background/50 text-center"><div className="text-lg font-bold text-accent">{supervisor.calls_per_hour}</div><div className="text-[10px] text-muted-foreground">Calls/Hr</div></div>
              <div className="p-2 rounded-lg bg-background/50 text-center"><div className="text-lg font-bold text-accent">{supervisor.connection_rate}%</div><div className="text-[10px] text-muted-foreground">Connect Rate</div></div>
              <div className="p-2 rounded-lg bg-background/50 text-center"><div className="text-lg font-bold text-yellow-400">{supervisor.vm_rate}%</div><div className="text-[10px] text-muted-foreground">VM Rate</div></div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No team data yet</p>
          )}
        </div>
      </div>

      {/* Active Batch */}
      {batchLeads.length > 0 && (
        <div className="rounded-xl border border-sidebar-border bg-sidebar p-5">
          <h3 className="text-sm font-semibold text-foreground mb-3">Active Batch</h3>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {batchLeads.map((lead, i) => {
              const att = attempts.find((a) => a.batch_index === i);
              const attStatus = att?.status || "queued";
              return (
                <div key={lead.id} className={`p-3 rounded-lg border ${
                  attStatus === "connected" ? "border-emerald-500/40 bg-emerald-500/10" :
                  attStatus === "cancelled" ? "border-red-500/30 bg-red-500/5" :
                  attStatus === "ringing" ? "border-blue-500/40 bg-blue-500/10 animate-pulse" :
                  "border-sidebar-border bg-background/50"
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-foreground">{lead.phone}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-medium ${
                      attStatus === "connected" ? "bg-emerald-500/20 text-emerald-400" :
                      attStatus === "cancelled" ? "bg-red-500/20 text-red-400" :
                      attStatus === "ringing" ? "bg-blue-500/20 text-blue-400" :
                      "bg-zinc-500/10 text-zinc-400"
                    }`}>
                      {attStatus}
                    </span>
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-1">
                    {lead.first_name} {lead.last_name} · Score: {lead.score}
                  </div>
                  {att?.outcome && <div className="text-[10px] text-muted-foreground mt-0.5">Outcome: {att.outcome}</div>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* AI Recommendations */}
      {aiRecs.length > 0 && (
        <div className="rounded-xl border border-sidebar-border bg-sidebar p-5">
          <div className="flex items-center gap-2 mb-3">
            <BrainCircuit size={14} className="text-accent" />
            <h3 className="text-sm font-semibold text-foreground">AEON Intelligence</h3>
          </div>
          <div className="space-y-2">
            {aiRecs.map((rec, i) => (
              <div key={i} className="p-3 rounded-lg bg-background/50 border border-sidebar-border/50">
                <p className="text-xs text-foreground">{rec.message}</p>
                {rec.estimated_value > 0 && <p className="text-[10px] text-accent mt-1">Est. value: ${(rec.estimated_value / 100).toLocaleString()}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
