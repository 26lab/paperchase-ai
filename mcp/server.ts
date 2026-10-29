// MCP server (stdio) that exposes the ATAS bridge to Claude Code.
// Shipped inside the app and started as: "PaperChase AI.exe" mcp.js  with ELECTRON_RUN_AS_NODE=1.
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { BridgeClient } from "../shared/bridge-client";
import { appendJournal } from "../shared/journal";

const client = new BridgeClient();
const server = new McpServer({ name: "paperchase", version: "1.0.0" });

/** Tool results are JSON text; bridge refusals come back as tool errors with the reason. */
async function run(action: () => Promise<unknown>) {
  try {
    return { content: [{ type: "text" as const, text: JSON.stringify(await action(), null, 1) }] };
  } catch (error) {
    return { isError: true, content: [{ type: "text" as const, text: error instanceof Error ? error.message : String(error) }] };
  }
}

/** Like run(), but every trading action is journaled so PaperChase AI can show what Claude did. */
async function act(action: string, detail: string, call: () => Promise<unknown>) {
  const result = await run(call);
  const outcome = result.isError ? result.content[0]?.text ?? "" : "ok";
  // stdout is the MCP channel, so journal failures go to stderr only.
  await appendJournal({ source: "claude", action, detail: `${detail} → ${outcome}`, ok: !result.isError }).catch((error: unknown) => console.error("journal:", error));
  return result;
}

const read = (name: string, description: string, action: () => Promise<unknown>) =>
  server.registerTool(name, { description }, () => run(action));

read("atas_status", "Bridge status: symbol, portfolio, tick size, activated, state. Call this first.", () => client.read("status"));
read("atas_quote", "Live quote: last, best bid/ask with sizes, cumulative DOM volume, spread, tick size.", () => client.read("quote"));
read("atas_position", "Open position of this bridge: volume, average price, direction, open and closed PnL.", () => client.read("position"));
read("atas_orders", "Orders of this session with id, direction, type, price, trigger, filled/unfilled, state.", () => client.read("orders"));
read("atas_trades", "Executed fills of this session.", () => client.read("trades"));
read("atas_bridge_log", "Last 100 lines of the bridge log inside ATAS, for troubleshooting.", () => client.read("log"));
read(
  "atas_risk_status",
  "Safety status enforced inside ATAS: kill switch, real/demo account, day and session PnL, orders in the last minute and all limits. Check before trading; orders that break a limit are refused.",
  () => client.read("risk"),
);

server.registerTool(
  "atas_dom",
  { description: "Order book: bids (highest first) and asks (lowest first).", inputSchema: { levels: z.number().int().min(1).max(50).default(15) } },
  ({ levels }) =>
    run(async () => {
      const dom = await client.read("dom");
      return { bids: dom.bids.slice(0, levels), asks: dom.asks.slice(0, levels), time: dom.time };
    }),
);

server.registerTool(
  "atas_candles",
  {
    description: "Recent candles of the chart the bridge runs on (open, high, low, close, volume, delta, time) plus the forming candle.",
    inputSchema: { limit: z.number().int().min(1).max(2000).default(100) },
  },
  ({ limit }) =>
    run(async () => {
      const { candles, current } = await client.read("candles");
      return { candles: candles.slice(-limit), current };
    }),
);

server.registerTool(
  "atas_place_order",
  {
    description:
      "Place an order. sl_ticks/tp_ticks (market orders only) add a protective stop and take-profit; the leftover leg is cancelled when flat. Reuse request_id when retrying so a retry can never create a second order. The bridge refuses orders that break the safety limits (see atas_risk_status).",
    inputSchema: {
      direction: z.enum(["buy", "sell"]),
      order_type: z.enum(["market", "limit", "stop", "stoplimit"]),
      qty: z.number().positive(),
      price: z.number().positive().optional().describe("Required for limit and stoplimit"),
      trigger_price: z.number().positive().optional().describe("Required for stop and stoplimit"),
      sl_ticks: z.number().positive().optional(),
      tp_ticks: z.number().positive().optional(),
      request_id: z.string().min(4).max(64).optional(),
      comment: z.string().max(60).optional(),
    },
  },
  (args) =>
    act("Order", `${args.direction} ${args.qty} ${args.order_type}${args.price ? ` @ ${args.price}` : ""}${args.trigger_price ? ` stop ${args.trigger_price}` : ""}${args.sl_ticks ? ` SL ${args.sl_ticks}T` : ""}${args.tp_ticks ? ` TP ${args.tp_ticks}T` : ""}${args.comment ? ` – ${args.comment}` : ""}`, () =>
      client.placeOrder({
        direction: args.direction,
        type: args.order_type,
        qty: args.qty,
        price: args.price,
        triggerPrice: args.trigger_price,
        slTicks: args.sl_ticks,
        tpTicks: args.tp_ticks,
        requestId: args.request_id,
        comment: args.comment ?? "claude",
      }),
    ),
);

server.registerTool(
  "atas_cancel_order",
  { description: "Cancel a working order by id (see atas_orders).", inputSchema: { order_id: z.string().min(1) } },
  ({ order_id }) => act("Storno", order_id, () => client.cancelOrder(order_id)),
);

server.registerTool("atas_cancel_all_orders", { description: "Cancel all working orders." }, () =>
  act("Alle stornieren", "", () => client.cancelAll()),
);

server.registerTool(
  "atas_close_position",
  { description: "Flatten the position with a market order (full size unless volume is given).", inputSchema: { volume: z.number().positive().optional() } },
  ({ volume }) => act("Glattstellen", volume ? `${volume}` : "komplett", () => client.closePosition(volume)),
);

server.registerTool(
  "atas_kill_switch",
  {
    description:
      "EMERGENCY STOP: engage the kill switch. Blocks every new risk-increasing order; closing and cancelling still work. Only the human can release it in PaperChase AI or ATAS.",
    inputSchema: { reason: z.string().max(120).optional() },
  },
  ({ reason }) => act("Not-Aus", reason ?? "", () => client.kill(true, reason ?? "engaged by Claude")),
);

await server.connect(new StdioServerTransport());
