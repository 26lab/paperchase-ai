"use client";

import { KeyRound } from "lucide-react";
import { useState } from "react";
import { api } from "@/lib/api";
import { useToast } from "@/lib/toast";
import { botCall, useBot } from "@/lib/use-bot";
import { Panel } from "../page-header";
import { Badge, Button } from "../ui";

export function ApiKeyPanel() {
  const bot = useBot();
  const toast = useToast();
  const [key, setKey] = useState("");

  const save = async () => {
    const error = await botCall(api().botSetApiKey(key));
    setKey("");
    toast(error ?? "API-Schlüssel verschlüsselt gespeichert", error ? "error" : "ok");
  };

  return (
    <Panel title="Anthropic-API-Schlüssel">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted">Für die Entscheidungen von Claude (Abrechnung über deine Anthropic-Konsole).</span>
        <Badge tone={bot.hasApiKey ? "up" : "amber"}>{bot.hasApiKey ? "hinterlegt" : "fehlt"}</Badge>
      </div>
      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <label htmlFor="api-key" className="sr-only">API-Schlüssel</label>
        <input
          id="api-key"
          name="api-key"
          type="password"
          autoComplete="off"
          spellCheck={false}
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder={bot.hasApiKey ? "Neuen Schlüssel eingeben, um zu ersetzen…" : "sk-ant-…"}
          className="tabular min-w-0 flex-1 rounded-xl border border-line bg-black/20 px-3 py-2 text-sm outline-none focus:border-up/50"
        />
        <Button type="submit" disabled={key.length < 20}>
          <KeyRound className="size-4" aria-hidden />
          Speichern
        </Button>
        {bot.hasApiKey && <Button variant="ghost" onClick={() => void botCall(api().botDeleteApiKey()).then(() => toast("Schlüssel entfernt"))}>Entfernen</Button>}
      </form>
      <p className="mt-2 text-xs text-dim">Wird mit der Windows-Verschlüsselung (DPAPI) gespeichert und nie wieder angezeigt. Schlüssel erstellen: console.anthropic.com → API Keys.</p>
    </Panel>
  );
}
