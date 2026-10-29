"use client";

import { ApiKeyPanel } from "@/components/bot/api-key-panel";
import { BotConfigPanel } from "@/components/bot/bot-config-panel";
import { BotStatus } from "@/components/bot/bot-status";
import { JournalList } from "@/components/journal-list";
import { PageHeader, Panel } from "@/components/page-header";
import { useBot } from "@/lib/use-bot";
import { useJournal } from "@/lib/use-journal";

export default function BotPage() {
  const bot = useBot();
  const decisions = useJournal().filter((e) => e.source === "bot");
  return (
    <>
      <PageHeader title="Bot">
        Claude prüft alle {bot.config.intervalMinutes} Minuten den Markt und entscheidet nach deiner Strategie. Jede Order läuft zusätzlich durch die
        Sicherheitsregeln in ATAS. Läuft auch weiter, wenn du das Fenster schließt (Symbol im Infobereich).
      </PageHeader>
      <div className="grid gap-4 xl:grid-cols-[1.15fr_1fr]">
        <div className="flex flex-col gap-4">
          <BotStatus />
          <Panel title="Entscheidungen">
            <JournalList entries={decisions} limit={60} />
          </Panel>
        </div>
        <div className="flex flex-col gap-4">
          {/* Remount when the saved config changes so the form starts from it. */}
          <BotConfigPanel key={JSON.stringify(bot.config)} />
          <ApiKeyPanel />
        </div>
      </div>
    </>
  );
}
