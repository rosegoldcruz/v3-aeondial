"use client";

import { useEffect, useState } from "react";
import type { N8nWorkflow, N8nExecution } from "@/lib/n8n/client";

export function AutomationsClient() {
  const [workflows, setWorkflows] = useState<N8nWorkflow[]>([]);
  const [status, setStatus] = useState<"loading" | "connected" | "unreachable">("loading");

  useEffect(() => {
    fetch("/api/automations?kind=health")
      .then((r) => r.json())
      .then((d) => setStatus(d.status === "connected" ? "connected" : "unreachable"))
      .catch(() => setStatus("unreachable"));

    fetch("/api/automations?kind=workflows")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setWorkflows(data); })
      .catch(() => {});
  }, []);

  const n8nUrl = typeof window !== "undefined"
    ? `${window.location.protocol}//${window.location.hostname}:5678`
    : "";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Automation Engine</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Powered by n8n — cross-module workflows, webhooks, and triggers
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
            status === "connected"
              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
              : status === "unreachable"
              ? "bg-red-500/10 text-red-400 border border-red-500/20"
              : "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${
              status === "connected" ? "bg-emerald-400" : status === "unreachable" ? "bg-red-400" : "bg-yellow-400"
            }`} />
            {status === "loading" ? "Checking..." : status === "connected" ? "Connected" : "Unreachable"}
          </span>
          {n8nUrl && (
            <a
              href={n8nUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent/10 border border-accent/30 text-accent text-sm font-medium hover:bg-accent/20 transition-colors"
            >
              Open n8n Editor
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          )}
        </div>
      </div>

      {/* Workflows Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {workflows.length === 0 && status !== "loading" && (
          <div className="col-span-full rounded-xl border border-dashed border-sidebar-border bg-sidebar/50 p-8 text-center">
            <div className="text-4xl mb-3">⚡</div>
            <h3 className="text-lg font-semibold text-foreground">No workflows yet</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
              Open the n8n editor to create your first automation workflow.
              Connect CRM events, deal updates, and more to automated actions.
            </p>
          </div>
        )}
        {workflows.map((wf) => (
          <div
            key={wf.id}
            className="rounded-xl border border-sidebar-border bg-sidebar p-4 space-y-3 hover:border-accent/30 transition-colors"
          >
            <div className="flex items-start justify-between">
              <h3 className="font-semibold text-foreground text-sm">{wf.name}</h3>
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider ${
                wf.active
                  ? "bg-emerald-500/10 text-emerald-400"
                  : "bg-zinc-500/10 text-zinc-400"
              }`}>
                {wf.active ? "Active" : "Inactive"}
              </span>
            </div>
            <div className="text-xs text-muted-foreground">
              Updated: {new Date(wf.updatedAt).toLocaleDateString()}
            </div>
            {wf.tags && wf.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {wf.tags.map((t) => (
                  <span key={t.id} className="px-1.5 py-0.5 rounded bg-accent/10 text-accent text-[10px]">
                    {t.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Quick Start */}
      <div className="rounded-xl border border-sidebar-border bg-sidebar p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Quick Start — AEON Events</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Create workflows in n8n triggered by these AEON webhook events:
        </p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { event: "deal-stage-change", desc: "When a deal moves stages" },
            { event: "lead-created", desc: "New lead enters CRM" },
            { event: "bid-accepted", desc: "Client accepts a bid" },
            { event: "call-completed", desc: "Agent finishes a call" },
            { event: "subscription-created", desc: "New subscription added" },
            { event: "task-overdue", desc: "Task passes due date" },
          ].map((item) => (
            <div key={item.event} className="flex items-start gap-2 p-3 rounded-lg bg-background/50 border border-sidebar-border/50">
              <code className="text-xs text-accent font-mono shrink-0">{item.event}</code>
              <span className="text-xs text-muted-foreground">{item.desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function AutomationRunsClient() {
  const [executions, setExecutions] = useState<N8nExecution[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/automations?kind=executions")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setExecutions(data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Automation Runs</h1>
        <p className="text-sm text-muted-foreground mt-1">Recent n8n workflow executions</p>
      </div>

      <div className="rounded-xl border border-sidebar-border bg-sidebar overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-sidebar-border text-left text-xs text-muted-foreground uppercase tracking-wider">
              <th className="px-4 py-3">Execution</th>
              <th className="px-4 py-3">Workflow</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Started</th>
              <th className="px-4 py-3">Duration</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Loading...</td></tr>
            )}
            {!loading && executions.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No executions yet</td></tr>
            )}
            {executions.map((ex) => {
              const duration = ex.stoppedAt
                ? `${((new Date(ex.stoppedAt).getTime() - new Date(ex.startedAt).getTime()) / 1000).toFixed(1)}s`
                : "—";
              return (
                <tr key={ex.id} className="border-b border-sidebar-border/50 hover:bg-sidebar-accent/30">
                  <td className="px-4 py-3 font-mono text-xs text-foreground">{ex.id.slice(0, 8)}</td>
                  <td className="px-4 py-3 text-foreground">{ex.workflowId}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium uppercase ${
                      ex.status === "success" ? "bg-emerald-500/10 text-emerald-400"
                        : ex.status === "error" ? "bg-red-500/10 text-red-400"
                        : "bg-yellow-500/10 text-yellow-400"
                    }`}>
                      {ex.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(ex.startedAt).toLocaleString()}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{duration}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
