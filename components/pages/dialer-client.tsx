"use client";

import { useCallback, useEffect, useState } from "react";
import { Phone, PhoneOff, Loader2 } from "lucide-react";
import type { Call } from "@/types/models";

// ---------- Active Call Card ----------
export function ActiveCallCard({ call, onHangup, onDisposition }: {
  call: Call;
  onHangup: () => void;
  onDisposition: (d: string) => void;
}) {
  const [elapsed, setElapsed] = useState(0);
  const [showDisposition, setShowDisposition] = useState(false);

  useEffect(() => {
    if (call.status !== "answered" && call.status !== "ringing") return;
    const start = call.answered_at ? new Date(call.answered_at).getTime() : Date.now();
    const iv = setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => clearInterval(iv);
  }, [call.status, call.answered_at]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  const isActive = ["initiated", "ringing", "answered"].includes(call.status);
  const isEnded = ["completed", "failed", "cancelled", "busy", "no_answer"].includes(call.status);

  return (
    <div className={`rounded-xl border p-4 sm:p-5 ${isActive ? "border-accent shadow-[0_0_0_1px_rgba(82,187,255,0.25)] bg-card" : "border-border bg-card"}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">
            {call.direction === "outbound" ? "Outbound Call" : "Inbound Call"}
          </div>
          <div className="text-lg font-semibold text-foreground mt-1 break-all">{call.to_number}</div>
          <div className="text-sm text-muted-foreground capitalize mt-1">
            {call.status === "initiated" ? "Dialing..." : call.status}
          </div>
        </div>
        <div className="text-left sm:text-right">
          {isActive && (
            <div className="text-2xl font-semibold text-accent tabular-nums">{formatTime(elapsed)}</div>
          )}
          {isEnded && call.duration_s != null && (
            <div className="text-lg text-muted-foreground tabular-nums">{formatTime(call.duration_s)}</div>
          )}
        </div>
      </div>

      {isActive && (
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onHangup}
            className="flex-1 h-10 rounded-lg bg-destructive text-destructive-foreground font-medium text-sm flex items-center justify-center gap-2 hover:bg-destructive/90"
          >
            <PhoneOff size={16} /> Hang Up
          </button>
        </div>
      )}

      {isEnded && !call.disposition && !showDisposition && (
        <div className="mt-4">
          <button
            type="button"
            onClick={() => setShowDisposition(true)}
            className="w-full h-9 rounded-lg border border-border text-sm font-medium hover:bg-secondary"
          >
            Set Disposition
          </button>
        </div>
      )}

      {showDisposition && (
        <div className="mt-4 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          {["connected", "voicemail", "no_answer", "busy", "callback", "not_interested", "qualified"].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => { onDisposition(d); setShowDisposition(false); }}
              className="px-3 py-1.5 rounded-lg border border-border text-xs hover:bg-accent/10 hover:border-accent/40 capitalize"
            >
              {d.replace("_", " ")}
            </button>
          ))}
        </div>
      )}

      {call.disposition && (
        <div className="mt-3 text-xs text-muted-foreground">
          Disposition: <span className="text-foreground font-medium capitalize">{call.disposition.replace("_", " ")}</span>
        </div>
      )}
    </div>
  );
}

// ---------- Call Button (for lead cards) ----------
export function CallButton({ leadId, contactId, toNumber, size = "sm" }: {
  leadId?: string;
  contactId?: string;
  toNumber: string;
  size?: "sm" | "md";
}) {
  const [loading, setLoading] = useState(false);
  const [activeCall, setActiveCall] = useState<Call | null>(null);
  const [error, setError] = useState("");

  const startCall = useCallback(async () => {
    if (!toNumber) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/dialer/calls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toNumber, leadId, contactId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Call failed");
      } else {
        setActiveCall(data as Call);
      }
    } catch (err) {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, [toNumber, leadId, contactId]);

  const doHangup = useCallback(async () => {
    if (!activeCall) return;
    const res = await fetch(`/api/dialer/calls/${activeCall.id}/hangup`, { method: "POST" });
    if (res.ok) {
      const updated = await res.json();
      setActiveCall(updated);
    }
  }, [activeCall]);

  const doDisposition = useCallback(async (d: string) => {
    if (!activeCall) return;
    const res = await fetch(`/api/dialer/calls/${activeCall.id}/disposition`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ disposition: d }),
    });
    if (res.ok) {
      const updated = await res.json();
      setActiveCall(updated);
    }
  }, [activeCall]);

  // Poll for status updates while call is active
  useEffect(() => {
    if (!activeCall) return;
    if (["completed", "failed", "cancelled", "busy", "no_answer"].includes(activeCall.status)) return;
    const iv = setInterval(async () => {
      const res = await fetch(`/api/dialer/calls/${activeCall.id}`);
      if (res.ok) {
        const updated = await res.json();
        setActiveCall(updated);
      }
    }, 2000);
    return () => clearInterval(iv);
  }, [activeCall]);

  if (activeCall) {
    return (
      <div className="mt-3">
        <ActiveCallCard call={activeCall} onHangup={doHangup} onDisposition={doDisposition} />
      </div>
    );
  }

  const cls = size === "md"
    ? "h-9 px-4 text-sm"
    : "h-8 px-3 text-xs";

  return (
    <div>
      <button
        type="button"
        onClick={() => void startCall()}
        disabled={loading || !toNumber}
        className={`inline-flex items-center gap-1.5 rounded-lg font-medium border border-accent/40 bg-accent text-accent-foreground hover:bg-accent/90 disabled:opacity-50 ${cls}`}
      >
        {loading ? <Loader2 size={14} className="animate-spin" /> : <Phone size={14} />}
        Call
      </button>
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  );
}

// ---------- Recent Calls List ----------
export function RecentCallsList() {
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dialer/calls?limit=20")
      .then((r) => r.json())
      .then((data) => {
        setCalls(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="text-sm text-muted-foreground p-4 text-center">Loading calls...</div>;
  }

  if (calls.length === 0) {
    return <div className="text-sm text-muted-foreground p-4 text-center">No calls yet.</div>;
  }

  return (
    <div>
      <div className="grid gap-3 md:hidden">
        {calls.map((call) => (
          <div key={call.id} className="rounded-lg border border-border bg-secondary/30 p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="break-all text-sm font-medium text-foreground">{call.to_number}</div>
                <div className="mt-1 text-xs text-muted-foreground">{new Date(call.started_at).toLocaleString()}</div>
              </div>
              <span className="shrink-0 text-xs capitalize text-accent">{call.status}</span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-md bg-card px-2 py-1.5">
                <div className="text-muted-foreground">Duration</div>
                <div className="mt-1 font-medium text-foreground tabular-nums">
                  {call.duration_s != null ? `${Math.floor(call.duration_s / 60)}:${String(call.duration_s % 60).padStart(2, "0")}` : "—"}
                </div>
              </div>
              <div className="rounded-md bg-card px-2 py-1.5">
                <div className="text-muted-foreground">Disposition</div>
                <div className="mt-1 font-medium capitalize text-foreground">{call.disposition ?? "—"}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="hidden overflow-x-auto md:block">
      <table className="min-w-full text-sm">
        <thead className="bg-secondary/70 text-left text-xs uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="px-4 py-2">To</th>
            <th className="px-4 py-2">Status</th>
            <th className="px-4 py-2">Duration</th>
            <th className="px-4 py-2">Disposition</th>
            <th className="px-4 py-2">Time</th>
          </tr>
        </thead>
        <tbody>
          {calls.map((call) => (
            <tr key={call.id} className="border-t border-border">
              <td className="px-4 py-2 font-medium">{call.to_number}</td>
              <td className="px-4 py-2 capitalize">{call.status}</td>
              <td className="px-4 py-2 tabular-nums">
                {call.duration_s != null ? `${Math.floor(call.duration_s / 60)}:${String(call.duration_s % 60).padStart(2, "0")}` : "—"}
              </td>
              <td className="px-4 py-2 capitalize">{call.disposition ?? "—"}</td>
              <td className="px-4 py-2 text-muted-foreground">{new Date(call.started_at).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}
