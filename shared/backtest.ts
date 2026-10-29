// Backtest of the EMA 9/21 trend-cross strategy Claude traded on demo (see atas-mcp/trading-journal.md).
// The DOM filter of the live rules cannot be replayed: there is no order-book history.
import type { Candle } from "./types";

export interface BacktestConfig {
  tickSize: number;
  /** Money per point, NQ = 20 $. */
  pointValue: number;
  slTicks: number;
  tpTicks: number;
  /** Ticks lost on every fill (entry and exit). */
  slippageTicks: number;
  /** Round-turn fees per contract. */
  commission: number;
  /** Bars over which the EMA21 slope defines the trend. */
  trendBars: number;
}

export const NQ_DEFAULTS: BacktestConfig = { tickSize: 0.25, pointValue: 20, slTicks: 40, tpTicks: 80, slippageTicks: 1, commission: 4.5, trendBars: 5 };

export interface Trade {
  side: "long" | "short";
  entryTime: string;
  exitTime: string;
  entry: number;
  exit: number;
  reason: "TP" | "SL" | "Gegen-Cross" | "Datenende";
  pnl: number;
}

export interface BacktestResult {
  trades: Trade[];
  netPnl: number;
  winRate: number;
  profitFactor: number;
  maxDrawdown: number;
  averageTrade: number;
}

export function ema(values: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const out: number[] = [];
  for (const [i, v] of values.entries()) out.push(i === 0 ? v : (out[i - 1] ?? v) + k * (v - (out[i - 1] ?? v)));
  return out;
}

/** +1 bullish cross, -1 bearish cross, 0 none – on bar i (closed bar). */
function crossAt(fast: number[], slow: number[], i: number): number {
  const prev = (fast[i - 1] ?? 0) - (slow[i - 1] ?? 0);
  const now = (fast[i] ?? 0) - (slow[i] ?? 0);
  if (prev <= 0 && now > 0) return 1;
  if (prev >= 0 && now < 0) return -1;
  return 0;
}

interface Open {
  dir: 1 | -1;
  entry: number;
  entryTime: string;
  sl: number;
  tp: number;
}

function closeTrade(open: Open, exitPrice: number, exitTime: string, reason: Trade["reason"], cfg: BacktestConfig): Trade {
  // The take-profit is a limit order and fills at its price; stop and market exits slip against us.
  const slip = reason === "TP" ? 0 : cfg.slippageTicks * cfg.tickSize;
  const exit = exitPrice - open.dir * slip;
  const pnl = (exit - open.entry) * open.dir * cfg.pointValue - cfg.commission;
  return { side: open.dir === 1 ? "long" : "short", entryTime: open.entryTime, exitTime, entry: open.entry, exit, reason, pnl };
}

/** Exit of an open trade inside bar `b`, if any. SL wins when both levels are inside one bar (conservative). */
function exitInBar(open: Open, b: Candle, cfg: BacktestConfig): Trade | null {
  const hitSl = open.dir === 1 ? b.low <= open.sl : b.high >= open.sl;
  const hitTp = open.dir === 1 ? b.high >= open.tp : b.low <= open.tp;
  if (hitSl) return closeTrade(open, open.sl, b.time, "SL", cfg);
  if (hitTp) return closeTrade(open, open.tp, b.time, "TP", cfg);
  return null;
}

export function summarize(trades: Trade[]): BacktestResult {
  let equity = 0;
  let peak = 0;
  let maxDrawdown = 0;
  for (const t of trades) {
    equity += t.pnl;
    peak = Math.max(peak, equity);
    maxDrawdown = Math.max(maxDrawdown, peak - equity);
  }
  const wins = trades.filter((t) => t.pnl > 0);
  const grossWin = wins.reduce((s, t) => s + t.pnl, 0);
  const grossLoss = -trades.filter((t) => t.pnl <= 0).reduce((s, t) => s + t.pnl, 0);
  return {
    trades,
    netPnl: equity,
    winRate: trades.length > 0 ? wins.length / trades.length : 0,
    profitFactor: grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? Infinity : 0,
    maxDrawdown,
    averageTrade: trades.length > 0 ? equity / trades.length : 0,
  };
}

export function backtest(bars: Candle[], cfg: BacktestConfig = NQ_DEFAULTS): BacktestResult {
  const closes = bars.map((b) => b.close);
  const fast = ema(closes, 9);
  const slow = ema(closes, 21);
  const trades: Trade[] = [];
  let open: Open | null = null;

  // Signals form on the close of bar i; orders fill at the open of bar i + 1.
  for (let i = Math.max(21, cfg.trendBars + 1); i < bars.length - 1; i++) {
    const bar = bars[i] as Candle;
    const next = bars[i + 1] as Candle;
    if (open) {
      const hit = exitInBar(open, bar, cfg);
      if (hit) {
        trades.push(hit);
        open = null;
      }
    }
    const cross = crossAt(fast, slow, i);
    if (open && cross === -open.dir) {
      trades.push(closeTrade(open, next.open, next.time, "Gegen-Cross", cfg));
      open = null;
    }
    const slope = (slow[i] ?? 0) - (slow[i - cfg.trendBars] ?? 0);
    const trendOk = cross !== 0 && Math.sign(slope) === cross;
    const deltaOk = Math.sign(bar.delta) === cross;
    if (!open && trendOk && deltaOk) {
      const dir = cross as 1 | -1;
      const entry = next.open + dir * cfg.slippageTicks * cfg.tickSize;
      open = { dir, entry, entryTime: next.time, sl: entry - dir * cfg.slTicks * cfg.tickSize, tp: entry + dir * cfg.tpTicks * cfg.tickSize };
    }
  }
  const last = bars.at(-1);
  if (open && last) trades.push(closeTrade(open, last.close, last.time, "Datenende", cfg));
  return summarize(trades);
}
