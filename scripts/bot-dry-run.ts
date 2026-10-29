// npm run bot:dry-run – one bot decision via Claude Code with live ATAS data, WITHOUT placing an order.
import { DEFAULT_STRATEGY } from "../shared/bot-types";
import { BridgeClient } from "../shared/bridge-client";
import { decideWithClaudeCode } from "../electron/bot/decide-claude-code";
import { planDecision } from "../electron/bot/plan";
import { buildUserMessage } from "../electron/bot/prompt";

const b = new BridgeClient();
const [status, candles, quote, dom, position, orders, risk] = await Promise.all([
  b.read("status"), b.read("candles"), b.read("quote"), b.read("dom"), b.read("position"), b.read("orders"), b.read("risk"),
]);
const message = buildUserMessage({
  symbol: status.symbol ?? "?", candles: candles.candles, current: candles.current, quote, dom, position, orders, risk,
  strategy: DEFAULT_STRATEGY, recentDecisions: [], tradesThisSession: 0, maxTradesPerSession: 5,
});
console.log(`Marktbild: ${message.length} Zeichen, ${status.symbol} @ ${quote.last}`);
const started = Date.now();
const { decision, costUsd, raw } = await decideWithClaudeCode(message);
console.log(`Antwort nach ${((Date.now() - started) / 1000).toFixed(1)} s (rechnerisch ${costUsd.toFixed(3)} $):`);
if (process.argv.includes("--raw")) console.log("RAW:", JSON.stringify(raw, null, 1).slice(0, 3000));
console.log(decision);
const step = planDecision(decision, { position: risk.position, activeOrders: 0, tradesThisSession: 0, maxTradesPerSession: 5, maxOrderQty: risk.limits.maxOrderQty });
console.log("Würde ausführen (dry run, nichts gesendet):", step);
