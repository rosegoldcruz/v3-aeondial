"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";

interface CallRecord {
  id: string;
  provider_call_id: string;
  to_number: string;
  from_number: string;
  status: string;
  duration_s: number | null;
  disposition: string | null;
  recording_url: string | null;
  created_at: string;
}

export function Softphone() {
  const searchParams = useSearchParams();
  const [number, setNumber] = useState("");
  const [status, setStatus] = useState<"idle" | "dialing" | "connected" | "ended">("idle");
  const [activeCall, setActiveCall] = useState<CallRecord | null>(null);
  const [duration, setDuration] = useState(0);
  const [recentCalls, setRecentCalls] = useState<CallRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Handle ?call= query param from CRM click-to-call
  useEffect(() => {
    const callNum = searchParams.get("call");
    if (callNum) {
      setNumber(callNum);
    }
  }, [searchParams]);

  const loadRecent = useCallback(() => {
    fetch("/api/dialer/calls?limit=10")
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d)) setRecentCalls(d); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadRecent();
    const iv = setInterval(loadRecent, 5000);
    return () => clearInterval(iv);
  }, [loadRecent]);

  useEffect(() => {
    if (status === "connected") {
      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [status]);

  async function dial() {
    if (!number.trim()) return;
    setError(null);
    setStatus("dialing");
    try {
      const res = await fetch("/api/dialer/calls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toNumber: number.trim(), record: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Call failed");
      setActiveCall(data);
      setStatus("connected");
      setDuration(0);
      loadRecent();
    } catch (err) {
      setStatus("idle");
      setError(err instanceof Error ? err.message : "Call failed");
    }
  }

  async function hangup() {
    if (!activeCall) return;
    try {
      await fetch(`/api/dialer/calls/${activeCall.provider_call_id}/hangup`, { method: "POST" });
    } catch {}
    setStatus("ended");
    setTimeout(() => {
      setStatus("idle");
      setActiveCall(null);
      setDuration(0);
      loadRecent();
    }, 1500);
  }

  function formatDuration(s: number): string {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  }

  const pad = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"];

  return (
    <div className="flex flex-col gap-4">
      {/* Phone Display */}
      <div className="rounded-xl border border-sidebar-border bg-sidebar p-4">
        <div className="text-center space-y-2">
          <input
            type="tel"
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            placeholder="Enter number..."
            className="w-full bg-transparent text-center text-2xl font-mono text-foreground outline-none placeholder:text-muted-foreground/50"
            onKeyDown={(e) => { if (e.key === "Enter") dial(); }}
          />
          {status !== "idle" && (
            <div className={`text-xs font-medium uppercase tracking-wider ${
              status === "connected" ? "text-emerald-400" : status === "dialing" ? "text-yellow-400" : "text-muted-foreground"
            }`}>
              {status === "dialing" ? "Dialing..." : status === "connected" ? `On Call — ${formatDuration(duration)}` : "Call Ended"}
            </div>
          )}
          {error && <div className="text-xs text-red-400">{error}</div>}
        </div>

        {/* Dial Pad */}
        <div className="grid grid-cols-3 gap-2 mt-4">
          {pad.map((key) => (
            <button
              key={key}
              onClick={() => setNumber((n) => n + key)}
              disabled={status === "connected"}
              className="rounded-lg bg-background/50 border border-sidebar-border/50 py-3 text-lg font-medium text-foreground hover:bg-accent/10 hover:border-accent/30 transition-colors disabled:opacity-50"
            >
              {key}
            </button>
          ))}
        </div>

        {/* Call Controls */}
        <div className="flex gap-2 mt-4">
          {status === "idle" || status === "ended" ? (
            <button
              onClick={dial}
              className="flex-1 rounded-lg bg-emerald-500/20 border border-emerald-500/40 py-3 text-sm font-semibold text-emerald-400 hover:bg-emerald-500/30 transition-colors"
            >
              Call
            </button>
          ) : (
            <button
              onClick={hangup}
              className="flex-1 rounded-lg bg-red-500/20 border border-red-500/40 py-3 text-sm font-semibold text-red-400 hover:bg-red-500/30 transition-colors"
            >
              Hang Up
            </button>
          )}
          <button
            onClick={() => setNumber("")}
            disabled={status === "connected"}
            className="rounded-lg bg-background/50 border border-sidebar-border/50 px-4 py-3 text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Recent Calls */}
      <div className="rounded-xl border border-sidebar-border bg-sidebar p-4">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Recent Calls</h3>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {recentCalls.length === 0 && <p className="text-xs text-muted-foreground">No calls yet</p>}
          {recentCalls.map((call) => (
            <div key={call.id} className="flex items-center justify-between p-2 rounded-lg bg-background/50 border border-sidebar-border/50">
              <div className="min-w-0">
                <div className="text-xs font-medium text-foreground truncate">{call.to_number}</div>
                <div className="text-[10px] text-muted-foreground">{call.status} · {call.duration_s ? formatDuration(call.duration_s) : "—"}</div>
              </div>
              <button
                onClick={() => setNumber(call.to_number)}
                className="text-[10px] text-accent hover:underline shrink-0 ml-2"
              >
                Redial
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
