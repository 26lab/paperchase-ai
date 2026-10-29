"use client";

import { Download, RefreshCw } from "lucide-react";
import { useState } from "react";
import { api } from "@/lib/api";
import { refreshUpdate, useUpdate } from "@/lib/use-update";
import type { UpdateState } from "@/shared/ipc";
import { Panel } from "./page-header";
import { Badge, Button } from "./ui";

const statusText: Record<UpdateState["status"], string> = {
  dev: "Entwicklungsversion – Updates nur in der installierten App",
  idle: "Noch nicht geprüft",
  checking: "Suche nach Updates…",
  downloading: "Update wird heruntergeladen…",
  ready: "Update bereit – wird beim nächsten Neustart installiert",
  current: "Aktuell",
  error: "Prüfung fehlgeschlagen",
};

export function UpdatePanel() {
  const update = useUpdate();
  const [checking, setChecking] = useState(false);

  const check = async () => {
    setChecking(true);
    await api().checkForUpdates();
    await refreshUpdate();
    setChecking(false);
  };

  return (
    <Panel title="App & Updates">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="font-semibold">
            PaperChase AI <span className="tabular text-muted">v{update.version}</span>
            {update.available && update.status !== "current" && <span className="ml-2"><Badge tone="up">v{update.available}</Badge></span>}
          </div>
          <div className="text-sm text-muted">{statusText[update.status]}</div>
          {update.status === "error" && update.message && <div className="mt-1 max-w-md truncate text-xs text-dim" title={update.message}>{update.message}</div>}
        </div>
        {update.status === "ready" ? (
          <Button variant="buy" onClick={() => void api().installUpdate()}>
            <Download className="size-4" aria-hidden />
            Neu starten & installieren
          </Button>
        ) : (
          <Button onClick={() => void check()} disabled={checking || update.status === "dev"}>
            <RefreshCw className={`size-4 ${checking ? "animate-spin" : ""}`} aria-hidden />
            Nach Updates suchen
          </Button>
        )}
      </div>
      <p className="mt-3 text-xs text-dim">Updates kommen aus GitHub Releases (26lab/paperchase-ai) und werden im Hintergrund geladen.</p>
    </Panel>
  );
}
