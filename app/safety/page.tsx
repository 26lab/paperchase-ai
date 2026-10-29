"use client";

import { PageHeader, Panel } from "@/components/page-header";
import { Badge, Button, pnlText, Stat } from "@/components/ui";
import { useActions } from "@/lib/actions";
import { useBridge } from "@/lib/bridge-data";
import { num, usd } from "@/lib/format";
import type { Risk, RiskLimits } from "@/shared/types";

const yesNo = (value: boolean) => (value ? "an" : "aus");

const ruleRows = (l: RiskLimits) =>
  [
    ["Nur Demo-Konten", yesNo(l.demoOnly), "Neue Positionen auf echten Konten werden abgelehnt."],
    ["Max. Kontrakte pro Order", String(l.maxOrderQty), ""],
    ["Max. Position (inkl. offener Orders)", String(l.maxPositionQty), ""],
    ["Max. Orders pro Minute", String(l.maxOrdersPerMinute), "Bremse gegen Order-Schleifen."],
    ["Verlust-Limit", l.dailyLossLimit ? `${num(l.dailyLossLimit, 0)} $` : "aus", "Schlechterer Wert aus Konto-Tag und Bridge-Session."],
    ["Bei Limit glattstellen + Not-Aus", yesNo(l.flattenOnLossLimit), ""],
    ["Erlaubte Symbole", l.allowedSymbols || "alle", ""],
    ["Max. Preisabstand Limit/Stop", `${num(l.maxPriceDeviationPct, 1)} %`, "Schutz vor Tippfehlern."],
    ["API-Token erforderlich", yesNo(l.requireToken), ""],
  ] as const;

function RulesPanel({ limits }: { limits: RiskLimits }) {
  return (
    <Panel title="Regeln">
      <dl className="divide-y divide-line/60">
        {ruleRows(limits).map(([label, value, hint]) => (
          <div key={label} className="flex items-center justify-between gap-4 py-2.5">
            <dt>
              <div className="font-semibold">{label}</div>
              {hint && <div className="text-xs text-dim">{hint}</div>}
            </dt>
            <dd className="tabular text-right">{value}</dd>
          </div>
        ))}
      </dl>
    </Panel>
  );
}

function StatusPanel({ risk }: { risk: Risk }) {
  return (
    <Panel title="Status">
      <div className="grid grid-cols-2 gap-2">
        <Stat label="Konto">{risk.account}</Stat>
        <Stat label="Typ">{risk.isRealAccount ? <span className="text-amber">ECHT</span> : <span className="text-up">Demo</span>}</Stat>
        <Stat label="Tag"><span className={pnlText(risk.dayPnL)}>{usd(risk.dayPnL)}</span></Stat>
        <Stat label="Session"><span className={pnlText(risk.sessionPnL)}>{usd(risk.sessionPnL)}</span></Stat>
        <Stat label="Orders / Minute">{risk.ordersLastMinute}</Stat>
        <Stat label="Handel">{risk.tradingAllowed ? <Badge tone="up">erlaubt</Badge> : <Badge tone="down">gesperrt</Badge>}</Stat>
      </div>
      {risk.killSwitch && <p className="mt-3 rounded-lg bg-down/10 p-2 text-sm text-down">Not-Aus: {risk.killReason || "manuell"}</p>}
    </Panel>
  );
}

function EmergencyPanel({ killed }: { killed: boolean }) {
  const { kill, closePosition, cancelAll } = useActions();
  return (
    <Panel title="Notfall">
      <Button variant={killed ? "sell" : "danger"} className="w-full py-3" onClick={() => void kill(!killed)}>
        {killed ? "NOT-AUS AKTIV – freigeben" : "NOT-AUS AUSLÖSEN"}
      </Button>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <Button onClick={() => void closePosition()}>Position schließen</Button>
        <Button onClick={() => void cancelAll()}>Alle stornieren</Button>
      </div>
      <p className="mt-3 text-xs text-dim">Schließen und Stornieren funktionieren immer – auch bei aktivem Not-Aus. Claude kann den Not-Aus nur auslösen, nie freigeben.</p>
    </Panel>
  );
}

export default function SafetyPage() {
  const { risk } = useBridge();
  if (!risk) return <PageHeader title="Sicherheit">Warte auf die Bridge…</PageHeader>;
  return (
    <>
      <PageHeader title="Sicherheit">Die Regeln laufen in ATAS selbst – auch Claude kann sie nicht umgehen. Ändern: ATAS → Chart strategies → MCP Bridge → Safety.</PageHeader>
      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <RulesPanel limits={risk.limits} />
        <div className="flex flex-col gap-4">
          <StatusPanel risk={risk} />
          <EmergencyPanel killed={risk.killSwitch} />
        </div>
      </div>
    </>
  );
}
