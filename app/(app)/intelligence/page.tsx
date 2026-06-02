"use client";
import { useState } from "react";
import { Topbar } from "@/components/shell/topbar";
import { Card, SectionTitle } from "@/components/ui/primitives";

export default function IntelligencePage() {
  const [q, setQ] = useState("");
  const [a, setA] = useState("");
  const [loading, setLoading] = useState(false);

  async function ask() {
    if (!q.trim()) return;
    setLoading(true); setA("");
    try {
      const res = await fetch("/api/intelligence", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      const data = await res.json();
      setA(data.answer ?? data.error ?? "No response.");
    } catch (e: any) { setA(`Error: ${e?.message}`); }
    finally { setLoading(false); }
  }

  return (
    <>
      <Topbar title="Intelligence" />
      <div className="p-5 md:p-8 space-y-4 max-w-3xl">
        <Card>
          <SectionTitle>Ask AEON</SectionTitle>
          <textarea value={q} onChange={(e) => setQ(e.target.value)} rows={3}
            placeholder="Ask about the business — deals, finances, SOPs, anything in the knowledge base."
            className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-ink text-sm outline-none focus:border-ember resize-none" />
          <button onClick={ask} disabled={loading}
            className="mt-3 rounded-lg border border-ember bg-emberdim text-ember font-medium px-5 py-2 text-sm hover:bg-ember hover:text-bg transition-colors disabled:opacity-50">
            {loading ? "Thinking…" : "Ask"}
          </button>
        </Card>
        {a && (<Card><SectionTitle>Answer</SectionTitle><div className="text-sm text-ink whitespace-pre-wrap leading-relaxed">{a}</div></Card>)}
      </div>
    </>
  );
}
