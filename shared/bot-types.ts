// Shared shapes of the Claude trading bot (main process engine <-> renderer page).
import { z } from "zod";

export const DEFAULT_STRATEGY = `Trendfolge im NQ auf 1-Minuten-Kerzen.
- Einstieg nur in Richtung des Trends (EMA 21 steigt → nur long, fällt → nur short).
- Bestätigung: EMA 9 kreuzt EMA 21 oder Rücksetzer an die EMA 21, Kerzen-Delta in Trendrichtung.
- Kein Einstieg, wenn der Preis mehr als 2 ATR von der EMA 21 entfernt ist (nicht hinterherlaufen).
- Stop 40 Ticks, Ziel 80 Ticks; bei klarer Gegenbewegung (Gegen-Cross, starkes Gegen-Delta) früher schließen.
- Lieber auslassen als ein unklares Setup handeln.`;

export const ENGINES = ["api", "claude-code"] as const;
export type Engine = (typeof ENGINES)[number];

export const botConfigSchema = z.object({
  /** api = Anthropic API key (prepaid credits); claude-code = the installed Claude Code CLI (subscription). */
  engine: z.enum(ENGINES).default("api"),
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
  engine: "api",
  intervalMinutes: 5,
  strategy: DEFAULT_STRATEGY,
  maxTradesPerSession: 5,
  sessionLossStop: 300,
  allowLiveAccount: false,
};

export const LEVEL_KINDS = ["support", "resistance", "entry_zone", "target_zone", "invalidation"] as const;

/** A price level or zone Claude sees; drawn on the PaperChase chart. */
export const levelSchema = z.object({
  kind: z.enum(LEVEL_KINDS),
  price: z.number().describe("Linie, bzw. untere Kante einer Zone"),
  price_high: z.number().nullable().describe("obere Kante bei Zonen, sonst null"),
  label: z.string().describe("2-5 Wörter, z. B. 'Widerstand Hochs 14:05'"),
});
export type Level = z.infer<typeof levelSchema>;

/** Arrow on the chart where the bot acted. candleTime is the newest candle Claude saw. */
export interface BotMarker {
  candleTime: string;
  kind: "long" | "short" | "close";
  text: string;
}

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
  levels: z.array(levelSchema).max(6).describe("bis zu 6 Marken, die deine Entscheidung tragen"),
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
  /** Entries and exits of this run, newest last (max 50). */
  markers: BotMarker[];
  tradesThisSession: number;
  /** Bridge session PnL when the bot was started; the loss stop is measured from here. */
  sessionPnlAtStart?: number;
  sessionPnl?: number;
  costUsd: number;
  calls: number;
  stoppedReason?: string;
  error?: string;
}
