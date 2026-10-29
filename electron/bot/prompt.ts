// What Claude sees each cycle: a frozen system prompt (cache-friendly) + one user message with
// the strategy and a compact market snapshot.
import { ema } from "../../shared/backtest";
import type { Decision } from "../../shared/bot-types";
import type { Candle, Dom, Order, Position, Quote, Risk } from "../../shared/types";

export const SYSTEM_PROMPT = `Du bist der Trading-Entscheider eines automatischen Systems für Futures (ATAS, meist NQ).
Alle paar Minuten bekommst du ein Marktbild und entscheidest genau eine Aktion:
- "hold": nichts tun (der Normalfall, wenn kein klares Setup nach der Strategie vorliegt)
- "open": neue Position per Market-Order. Pflicht: direction, quantity, stop_loss_ticks; take_profit_ticks optional.
  Nur wenn flat. Stop und Ziel hängt das System automatisch als Orders an.
- "close": offene Position komplett per Market schließen (z. B. Setup ungültig, Gegenbewegung).
- "cancel_orders": alle offenen Orders stornieren.

Regeln:
- Halte dich an die Strategie des Nutzers. Wenn sie etwas nicht abdeckt, entscheide konservativ.
- Kapitalerhalt geht vor: im Zweifel "hold". Kein Hinterherlaufen nach großen Kerzen.
- Die Limits im Marktbild (Kontrakte pro Order, Tagesverlust, Kill-Switch) setzt das System hart durch –
  plane innerhalb davon. Ist tradingAllowed false, ist nur "hold", "close" oder "cancel_orders" sinnvoll.
- Ticks: 1 Tick = tickSize Punkte. Rechne Stops über die ATR plausibel.
- Felder, die für deine Aktion nicht gelten, setzt du auf null.
- reasoning: 2–4 kurze Sätze auf Deutsch, konkret mit Preisen/Werten aus dem Marktbild.`;

const round = (v: number, d = 2) => Math.round(v * 10 ** d) / 10 ** d;

function atr(bars: Candle[], period = 14): number {
  const ranges = bars.slice(1).map((b, i) => {
    const prevClose = bars[i]?.close ?? b.close;
    return Math.max(b.high - b.low, Math.abs(b.high - prevClose), Math.abs(b.low - prevClose));
  });
  const recent = ranges.slice(-period);
  return recent.length > 0 ? recent.reduce((s, r) => s + r, 0) / recent.length : 0;
}

export interface SnapshotInput {
  symbol: string;
  candles: Candle[];
  current: Candle | null;
  quote: Quote;
  dom: Dom;
  position: Position;
  orders: Order[];
  risk: Risk;
  strategy: string;
  recentDecisions: (Decision & { time: string })[];
  tradesThisSession: number;
  maxTradesPerSession: number;
}

export function buildUserMessage(s: SnapshotInput): string {
  const bars = s.candles.slice(-200);
  const closes = bars.map((b) => b.close);
  const fast = ema(closes, 9);
  const slow = ema(closes, 21);
  const last60 = bars.slice(-60).map((b, i, arr) => {
    const idx = bars.length - arr.length + i;
    // [time, open, high, low, close, volume, delta, ema9, ema21]
    return [b.time.slice(11, 16), b.open, b.high, b.low, b.close, b.volume, b.delta, round(fast[idx] ?? 0), round(slow[idx] ?? 0)];
  });
  const snapshot = {
    now: new Date().toISOString(),
    symbol: s.symbol,
    tickSize: s.quote.tickSize,
    quote: { last: s.quote.last, bid: s.quote.bestBid, ask: s.quote.bestAsk, spread: s.quote.spread, domImbalancePct: round(((s.quote.cumBids - s.quote.cumAsks) / Math.max(1, s.quote.cumBids + s.quote.cumAsks)) * 100, 1) },
    indicators: { ema9: round(fast.at(-1) ?? 0), ema21: round(slow.at(-1) ?? 0), ema21Slope5: round((slow.at(-1) ?? 0) - (slow.at(-6) ?? 0)), atr14: round(atr(bars)) },
    candlesColumns: ["time", "open", "high", "low", "close", "volume", "delta", "ema9", "ema21"],
    candlesLast60: last60,
    formingCandle: s.current && { open: s.current.open, high: s.current.high, low: s.current.low, close: s.current.close, volume: s.current.volume, delta: s.current.delta },
    orderBook: { bids: s.dom.bids.slice(0, 8).map((l) => [l.price, l.volume]), asks: s.dom.asks.slice(0, 8).map((l) => [l.price, l.volume]) },
    position: { net: s.risk.position, averagePrice: s.position.averagePrice, openPnL: s.position.openPnL },
    workingOrders: s.orders.filter((o) => o.state === "Active").map((o) => ({ side: o.direction, type: o.type, price: o.type === "Stop" ? o.triggerPrice : o.price, qty: o.unfilled, comment: o.comment })),
    risk: {
      tradingAllowed: s.risk.tradingAllowed,
      killSwitch: s.risk.killSwitch,
      dayPnL: s.risk.dayPnL,
      sessionPnL: s.risk.sessionPnL,
      maxContractsPerOrder: s.risk.limits.maxOrderQty,
      dailyLossLimit: s.risk.limits.dailyLossLimit,
    },
    session: { tradesSoFar: s.tradesThisSession, maxTrades: s.maxTradesPerSession },
    yourLastDecisions: s.recentDecisions.slice(-5).map((d) => ({ time: d.time.slice(11, 16), action: d.action, direction: d.direction, reasoning: d.reasoning })),
  };
  return `Strategie des Nutzers:\n${s.strategy}\n\nMarktbild (JSON):\n${JSON.stringify(snapshot)}`;
}
