"use client";

import { Check, Copy } from "lucide-react";
import { useEffect, useState } from "react";
import { JournalList } from "@/components/journal-list";
import { PageHeader, Panel } from "@/components/page-header";
import { Badge, Button } from "@/components/ui";
import { api } from "@/lib/api";
import { usePreflight } from "@/lib/preflight";
import { useJournal } from "@/lib/use-journal";

const PROMPTS = [
  "Zeig mir Risk-Status, Position und Orderbuch.",
  "Analysiere die letzten 50 Kerzen und sag mir, ob ein Setup da ist – noch nicht handeln.",
  "Kauf 1 NQ Market mit 40 Ticks Stop und 80 Ticks Take-Profit.",
  "Schließ die Position und storniere alle Orders.",
];

function useCopy() {
  const [copied, setCopied] = useState<string | null>(null);
  const copy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(text);
    setTimeout(() => setCopied(null), 1500);
  };
  return { copied, copy };
}

function ConnectionPanel() {
  const { checks, fix } = usePreflight();
  const { copied, copy } = useCopy();
  const [command, setCommand] = useState("");
  const mcp = checks.find((c) => c.id === "mcp-registered");

  useEffect(() => {
    void api().mcpCommand().then((r) => r.ok && setCommand(r.data));
  }, []);

  return (
    <Panel title="Verbindung">
      <div className="flex items-center justify-between gap-3">
        <span className="font-semibold">MCP-Server „paperchase“</span>
        <Badge tone={mcp?.state === "ok" ? "up" : "amber"}>{mcp?.state === "ok" ? "registriert" : "nicht verbunden"}</Badge>
      </div>
      <p className="mt-2 text-sm text-muted">{mcp?.detail ?? "Claude Code nicht gefunden."}</p>
      {mcp?.fix && mcp.state !== "ok" && <Button className="mt-3" onClick={() => void fix("register-mcp")}>Jetzt verbinden</Button>}
      {command && (
        <div className="mt-4">
          <div className="mb-1 text-xs text-dim">Manuell registrieren:</div>
          <div className="flex items-start gap-2">
            <code className="tabular block flex-1 rounded-lg bg-black/30 p-2 text-xs break-all text-muted">{command}</code>
            <Button variant="ghost" aria-label="Befehl kopieren" onClick={() => void copy(command)}>
              {copied === command ? <Check className="size-4 text-up" /> : <Copy className="size-4" />}
            </Button>
          </div>
        </div>
      )}
    </Panel>
  );
}

function PromptsPanel() {
  const { copied, copy } = useCopy();
  return (
    <Panel title="Beispiele für Claude Code">
      <ul className="flex flex-col gap-1.5">
        {PROMPTS.map((prompt) => (
          <li key={prompt}>
            <button type="button" onClick={() => void copy(prompt)} className="flex w-full items-center gap-2 rounded-lg border border-line px-3 py-2 text-left text-sm hover:border-dim">
              <span className="flex-1">{prompt}</span>
              {copied === prompt ? <Check className="size-4 text-up" aria-label="kopiert" /> : <Copy className="size-4 text-dim" aria-hidden />}
            </button>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

export default function ClaudePage() {
  const entries = useJournal();
  return (
    <>
      <PageHeader title="Claude">
        Claude handelt über die MCP-Tools <code className="tabular text-fg">atas_*</code>. Jede Aktion läuft durch die Sicherheitsregeln in ATAS und landet im Journal.
      </PageHeader>
      <div className="grid gap-4 xl:grid-cols-[1fr_1.3fr]">
        <div className="flex flex-col gap-4">
          <ConnectionPanel />
          <PromptsPanel />
        </div>
        <Panel title="Journal">
          <JournalList entries={entries} />
        </Panel>
      </div>
    </>
  );
}
