"use client";

import { Play, Square } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { usd } from "@/lib/format";
import { useToast } from "@/lib/toast";
import { botCall, useBot } from "@/lib/use-bot";
import { Panel } from "../page-header";
import { Badge, Button, pnlText, Stat } from "../ui";

const ACTION_LABEL = { hold: "Abwarten", open: "Einstieg", close: "Schließen", cancel_orders: "Orders stornieren" } as const;

function useCountdown(target?: string): string {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  if (!target) return "–";
  const seconds = Math.max(0, Math.round((Date.parse(target) - now) / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

export function BotStatus() {
  const bot = useBot();
  const toast = useToast();
  const countdown = useCountdown(bot.running ? bot.nextRunAt : undefined);
  const d = bot.lastDecision;

  const toggle = async () => {
    const error = await botCall(bot.running ? api().botStop() : api().botStart());
    toast(error ?? (bot.running ? "Bot gestoppt" : "Bot gestartet – erste Prüfung läuft"), error ? "error" : "ok");
  };

  return (
    <Panel title="Status">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Badge tone={bot.running ? "up" : "neutral"}>{bot.running ? "LÄUFT" : "GESTOPPT"}</Badge>
          <span className="text-sm text-muted">{bot.running ? `Nächste Prüfung in ${countdown}` : (bot.stoppedReason ?? "Bereit")}</span>
        </div>
        <Button variant={bot.running ? "danger" : "buy"} onClick={() => void toggle()} disabled={bot.config.engine === "api" && !bot.hasApiKey}>
          {bot.running ? <Square className="size-4" aria-hidden /> : <Play className="size-4" aria-hidden />}
          {bot.running ? "Bot stoppen" : "Bot starten"}
        </Button>
      </div>
      <div className="mt-4 grid grid-cols-4 gap-2">
        <Stat label="Session-PnL"><span className={pnlText(bot.sessionPnl)}>{usd(bot.sessionPnl)}</span></Stat>
        <Stat label="Trades">{bot.tradesThisSession} / {bot.config.maxTradesPerSession}</Stat>
        <Stat label="Prüfungen">{bot.calls}</Stat>
        <Stat label={bot.config.engine === "api" ? "Claude-Kosten" : "Kosten (rechnerisch, Abo)"}>{bot.costUsd.toFixed(2)} $</Stat>
      </div>
      {d && (
        <div className="mt-4 rounded-xl border border-line p-3">
          <div className="flex items-center gap-2 text-sm">
            <Badge tone={d.action === "open" ? (d.direction === "buy" ? "up" : "down") : d.action === "hold" ? "neutral" : "amber"}>{ACTION_LABEL[d.action]}</Badge>
            <span className="tabular text-xs text-dim">{new Date(d.time).toLocaleTimeString("de-DE")} · Sicherheit {Math.round(d.confidence * 100)} %</span>
          </div>
          <p className="mt-2 text-sm">{d.reasoning}</p>
        </div>
      )}
      {bot.error && <p className="mt-3 rounded-lg bg-down/10 p-2 text-sm text-down">{bot.error}</p>}
    </Panel>
  );
}
