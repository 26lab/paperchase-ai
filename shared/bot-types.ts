// Shared shapes of the Claude trading bot (main process engine <-> renderer page).
import { z } from "zod";

export const DEFAULT_STRATEGY = `Trendfolge im NQ auf 1-Minuten-Kerzen.
- Einstieg nur in Richtung des Trends (EMA 21 steigt → nur long, fällt → nur short).
- Bestätigung: EMA 9 kreuzt EMA 21 oder Rücksetzer an die EMA 21, Kerzen-Delta in Trendrichtung.
- Kein Einstieg, wenn der Preis mehr als 2 ATR von der EMA 21 entfernt ist (nicht hinterherlaufen).
- Stop 40 Ticks, Ziel 80 Ticks; bei klarer Gegenbewegung (Gegen-Cross, starkes Gegen-Delta) früher schließen.
- Lieber auslassen als ein unklares Setup handeln.`;

export const botConfigSchema = z.object({
  intervalMinutes: z.number().int().min(1).max(60),
  strategy: z.string().min(20).max(4000),
  maxTradesPerSession: z.number().int().min(1).max(50),
  /** Bot stops when its session PnL falls to minus this amount. */
  sessionLossStop: z.number().min(10).max(100_000),
  /** Off: the bot refuses to run on an account ATAS reports as real. */
  allowLiveAccount: z.boolean(),
});
export type BotConfig = z.infer<typeof botConfigSchema>;

export const DEFAULT_BOT_CONFIG: BotConfig = {
  intervalMinutes: 5,
  strategy: DEFAULT_STRATEGY,
  maxTradesPerSession: 5,
  sessionLossStop: 300,
  allowLiveAccount: false,
};

/** What Claude must answer each cycle (structured output, every field present; unused ones null). */
export const decisionSchema = z.object({
  action: z.enum(["hold", "open", "close", "cancel_orders"]),
  reasoning: z.string().describe("2-4 Sätze auf Deutsch: was du siehst und warum du so entscheidest"),
  confidence: z.number().min(0).max(1),
  // Entries are always market orders with a mandatory stop: the bridge only brackets market orders,
  // so a limit/stop entry would sit unprotected after its fill.
  direction: z.enum(["buy", "sell"]).nullable().describe("nur bei open"),
  quantity: z.number().int().min(1).nullable().describe("nur bei open, Kontrakte"),
  stop_loss_ticks: z.number().int().min(4).max(400).nullable().describe("Pflicht bei open"),
  take_profit_ticks: z.number().int().min(4).max(800).nullable().describe("optional bei open"),
});
export type Decision = z.infer<typeof decisionSchema>;

export interface BotState {
  running: boolean;
  hasApiKey: boolean;
  config: BotConfig;
  startedAt?: string;
  lastRunAt?: string;
  nextRunAt?: string;
  lastDecision?: Decision & { time: string };
  tradesThisSession: number;
  /** Bridge session PnL when the bot was started; the loss stop is measured from here. */
  sessionPnlAtStart?: number;
  sessionPnl?: number;
  costUsd: number;
  calls: number;
  stoppedReason?: string;
  error?: string;
}
