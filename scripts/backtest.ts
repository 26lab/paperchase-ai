// npm run backtest – runs the strategy over the candles the ATAS bridge currently holds.
import { backtest, NQ_DEFAULTS } from "../shared/backtest";
import { BridgeClient } from "../shared/bridge-client";

const client = new BridgeClient();
const [{ candles }, status] = await Promise.all([client.read("candles"), client.read("status")]);
if (candles.length < 50) throw new Error(`Zu wenige Kerzen (${candles.length}) für einen Backtest.`);

const cfg = { ...NQ_DEFAULTS, tickSize: status.tickSize || NQ_DEFAULTS.tickSize };
const result = backtest(candles, cfg);
const usd = (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(2)} $`;
const first = candles[0]?.time.slice(0, 16).replace("T", " ");
const last = candles.at(-1)?.time.slice(0, 16).replace("T", " ");

console.log(`\nBacktest EMA 9/21 Trend-Cross · ${status.symbol} · ${candles.length} Kerzen (${first} → ${last})`);
console.log(`SL ${cfg.slTicks} / TP ${cfg.tpTicks} Ticks · Slippage ${cfg.slippageTicks} Tick · Gebühr ${cfg.commission} $ pro Trade\n`);
console.table(
  result.trades.map((t) => ({
    Seite: t.side,
    Einstieg: t.entryTime.slice(11, 16),
    Ausstieg: t.exitTime.slice(11, 16),
    Entry: t.entry,
    Exit: t.exit,
    Grund: t.reason,
    PnL: usd(t.pnl),
  })),
);
console.log(`Trades:          ${result.trades.length}`);
console.log(`Trefferquote:    ${(result.winRate * 100).toFixed(1)} %`);
console.log(`Profit-Faktor:   ${Number.isFinite(result.profitFactor) ? result.profitFactor.toFixed(2) : "∞"}`);
console.log(`Netto:           ${usd(result.netPnl)}`);
console.log(`Ø pro Trade:     ${usd(result.averageTrade)}`);
console.log(`Max. Drawdown:   ${usd(-result.maxDrawdown)}`);
