"use client";
import { useState } from "react";
import { Topbar } from "@/components/shell/topbar";
import { Card, SectionTitle, Pill } from "@/components/ui/primitives";

export default function AgentPage() {
  const [kind, setKind] = useState<"code" | "marketing" | "asset">("code");
  const [prompt, setPrompt] = useState("");
  const [out, setOut] = useState("");
  const [loading, setLoading] = useState(false);

  async function run() {
    if (!prompt.trim()) return;
    setLoading(true); setOut("");
    try {
      const res = await fetch("/api/agent", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, prompt }),
      });
      const data = await res.json();
      setOut(data.output ?? data.error ?? "No response.");
    } catch (e: any) { setOut(`Error: ${e?.message}`); }
    finally { setLoading(false); }
  }

  return (
    <>
      <Topbar title="Agent" />
      <div className="p-5 md:p-8 space-y-4 max-w-3xl">
        <Card>
          <div className="flex gap-2 mb-3">
            <Pill active={kind === "code"} onClick={() => setKind("code")}>Code</Pill>
            <Pill active={kind === "marketing"} onClick={() => setKind("marketing")}>Marketing</Pill>
            <Pill active={kind === "asset"} onClick={() => setKind("asset")}>Asset</Pill>
          </div>
          <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={4}
            placeholder="Describe what to build or generate…"
            className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-ink text-sm outline-none focus:border-ember resize-none" />
          <button onClick={run} disabled={loading}
            className="mt-3 rounded-lg border border-ember bg-emberdim text-ember font-medium px-5 py-2 text-sm hover:bg-ember hover:text-bg transition-colors disabled:opacity-50">
            {loading ? "Running…" : "Run"}
          </button>
        </Card>
        {out && (<Card><SectionTitle>Output</SectionTitle><pre className="text-xs text-ink whitespace-pre-wrap leading-relaxed overflow-x-auto">{out}</pre></Card>)}
      </div>
    </>
  );
}
