import { Topbar } from "@/components/shell/topbar";
import { Card, SectionTitle, Badge } from "@/components/ui/primitives";

export default function DialerPage() {
  return (
    <>
      <Topbar title="Dialer" right={<Badge tone="muted">ARI pending</Badge>} />
      <div className="p-5 md:p-8 space-y-4 max-w-3xl">
        <Card>
          <SectionTitle>AEON Dial — Progressive Call Center</SectionTitle>
          <p className="text-sm text-muted leading-relaxed">
            Agent-first bridge model. The dialer shell lives here; the Asterisk + PJSIP + ARI
            backend wires in from the aeondial-telephony layer. State machine:
            UNREGISTERED → REGISTERED → AGENT_LEG_LIVE → READY → IN_CALL → WRAP_UP → READY.
          </p>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            {["READY","IN_CALL","WRAP_UP"].map((s) => (
              <div key={s} className="rounded-lg border border-line bg-surface py-3">
                <div className="text-[10px] uppercase tracking-wider text-muted">{s}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}
