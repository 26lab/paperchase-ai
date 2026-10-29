"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { useToast } from "@/lib/toast";
import { botCall, useBot } from "@/lib/use-bot";
import { DEFAULT_STRATEGY, type BotConfig } from "@/shared/bot-types";
import { Stepper, Switch } from "../form";
import { Panel } from "../page-header";
import { Button } from "../ui";

// Rough Claude Opus 5.5 estimate per decision, shown as guidance only; real cost comes from the API usage.
const MODEL_COST_PER_CHECK = 0.08;

function NumberRow({ id, label, hint, value, onChange, min, max }: { id: string; label: string; hint: string; value: number; onChange: (v: number) => void; min: number; max: number }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
        <span className="block text-xs font-normal text-dim">{hint}</span>
      </label>
      <Stepper id={id} value={value} onChange={onChange} step={1} min={min} max={max} />
    </div>
  );
}

export function BotConfigPanel() {
  const bot = useBot();
  const toast = useToast();
  // Edits stay local until saved; a fresh mount starts from the saved config.
  const [draft, setDraft] = useState<BotConfig>(bot.config);
  const set = <K extends keyof BotConfig>(key: K, value: BotConfig[K]) => setDraft((c) => ({ ...c, [key]: value }));
  const perHour = (60 / Math.max(1, draft.intervalMinutes)) * MODEL_COST_PER_CHECK;

  const save = async () => {
    const error = await botCall(api().botSaveConfig(draft));
    toast(error ?? "Bot-Einstellungen gespeichert", error ? "error" : "ok");
  };

  return (
    <Panel title="Einstellungen">
      <div className="flex flex-col gap-3">
        <NumberRow id="bot-interval" label="Prüfintervall" hint={`Minuten · ca. ${perHour.toFixed(2)} $/h Claude-Kosten`} value={draft.intervalMinutes} onChange={(v) => set("intervalMinutes", v)} min={1} max={60} />
        <NumberRow id="bot-trades" label="Max. Trades pro Session" hint="danach nur noch schließen" value={draft.maxTradesPerSession} onChange={(v) => set("maxTradesPerSession", v)} min={1} max={50} />
        <NumberRow id="bot-loss" label="Session-Verluststopp ($)" hint="Bot schließt alles und stoppt" value={draft.sessionLossStop} onChange={(v) => set("sessionLossStop", v)} min={10} max={100_000} />
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-semibold">
            Echtes Konto erlauben
            <span className="block text-xs font-normal text-dim">Aus = Bot startet nur auf Demo-Konten</span>
          </span>
          <Switch label="Echtes Konto erlauben" checked={draft.allowLiveAccount} onChange={(v) => set("allowLiveAccount", v)} />
        </div>
        <label htmlFor="bot-strategy" className="text-sm font-semibold">
          Strategie <span className="font-normal text-dim">(in normaler Sprache – Claude handelt danach)</span>
        </label>
        <textarea
          id="bot-strategy"
          name="bot-strategy"
          rows={8}
          value={draft.strategy}
          onChange={(e) => set("strategy", e.target.value)}
          className="scrollbar-thin rounded-xl border border-line bg-black/20 p-3 text-sm leading-relaxed outline-none focus:border-up/50"
        />
        <div className="flex gap-2">
          <Button variant="buy" onClick={() => void save()}>Speichern</Button>
          <Button variant="ghost" onClick={() => set("strategy", DEFAULT_STRATEGY)}>Standard-Strategie</Button>
        </div>
        {bot.running && <p className="text-xs text-amber">Änderungen gelten ab der nächsten Prüfung.</p>}
      </div>
    </Panel>
  );
}
