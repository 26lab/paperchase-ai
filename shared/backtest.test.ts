import { describe, expect, it } from "vitest";
import { backtest, ema, NQ_DEFAULTS, summarize, type Trade } from "./backtest";
import type { Candle } from "./types";

const noCosts = { ...NQ_DEFAULTS, slippageTicks: 0, commission: 0 };
let minute = 0;
const bar = (open: number, high: number, low: number, close: number, delta: number): Candle => ({
  open, high, low, close, delta, volume: 100, time: new Date(Date.UTC(2026, 9, 29, 9, minute++)).toISOString(),
});
const withPnl = (pnl: number) => ({ pnl }) as Trade;

/** 40 falling bars, then a steady rise: produces exactly one bullish trend cross. */
function upturn(): Candle[] {
  minute = 0;
  const bars: Candle[] = [];
  for (let i = 0; i < 40; i++) bars.push(bar(100 - i * 0.5, 100.25 - i * 0.5, 99.5 - i * 0.5, 99.75 - i * 0.5, -10));
  for (let i = 0; i < 60; i++) bars.push(bar(80 + i, 81.5 + i, 79.75 + i, 81 + i, 25));
  return bars;
}

function firstTrade(bars: Candle[], cfg = NQ_DEFAULTS): Trade {
  const [trade] = backtest(bars, cfg).trades;
  if (!trade) throw new Error("expected a trade");
  return trade;
}

/** The upturn series with the entry bar widened so it reaches `low`/`high`. */
function withEntryBarRange(range: { high?: number; low?: number }): Candle[] {
  const bars = upturn();
  const trade = firstTrade(bars, noCosts);
  const entryBar = bars.find((b) => b.time === trade.entryTime);
  if (!entryBar) throw new Error("entry bar missing");
  entryBar.high = range.high ?? entryBar.high;
  entryBar.low = range.low ?? entryBar.low;
  return bars;
}

describe("ema", () => {
  it("starts at the first value and converges toward a constant series", () => {
    const out = ema([10, 10, 10, 20, 20, 20, 20, 20, 20, 20], 3);
    expect(out[0]).toBe(10);
    expect(out.at(-1)).toBeGreaterThan(19.9);
  });
});

describe("backtest", () => {
  it("goes long on a bullish trend cross and exits at the take-profit", () => {
    const result = backtest(upturn(), noCosts);
    expect(result.trades).toHaveLength(1);
    expect(result.trades[0]).toMatchObject({ side: "long", reason: "TP", pnl: 400 });
  });

  it("fills the take-profit limit without slippage but charges the commission", () => {
    // SL/TP sit relative to the (slipped) entry fill, so the target is still 80 ticks away.
    expect(firstTrade(upturn()).pnl).toBe(400 - 4.5);
  });

  it("slips the stop-loss fill against the trade", () => {
    const entry = firstTrade(upturn(), noCosts).entry;
    // 40 ticks stop + 1 tick slippage = 41 ticks × 5 $ + 4.50 $ commission
    expect(firstTrade(withEntryBarRange({ low: entry - 30 })).pnl).toBe(-(41 * 5) - 4.5);
  });

  it("takes the stop when stop and target are inside the same bar", () => {
    const entry = firstTrade(upturn(), noCosts).entry;
    expect(firstTrade(withEntryBarRange({ high: entry + 30, low: entry - 30 }), noCosts).reason).toBe("SL");
  });

  it("does not trade without delta confirmation", () => {
    const bars = upturn();
    for (const b of bars) b.delta = -5;
    expect(backtest(bars, noCosts).trades).toHaveLength(0);
  });
});

describe("summarize", () => {
  it("computes win rate, profit factor and max drawdown", () => {
    const result = summarize([withPnl(400), withPnl(-200), withPnl(-200), withPnl(400)]);
    expect(result).toMatchObject({ netPnl: 400, winRate: 0.5, profitFactor: 2, maxDrawdown: 400 });
  });
});
