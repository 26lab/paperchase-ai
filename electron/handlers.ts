// IPC handlers behind window.paperchase. Renderer input is untrusted: every argument is parsed first.
import { z } from "zod";
import type { BridgeClient } from "../shared/bridge-client";
import type { IpcMethod, Result } from "../shared/ipc";
import { appendJournal, readJournal } from "../shared/journal";
import { READ_ENDPOINTS } from "../shared/types";
import { createFixes } from "./fixes";
import { loadLayout, saveLayout } from "./layout-store";
import { runPreflight, type FixId, type PreflightEnv } from "./preflight";

export type Handlers = Record<IpcMethod, (...args: unknown[]) => Promise<Result<unknown>>>;

async function wrap<T>(fn: () => Promise<T> | T): Promise<Result<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

async function journaled<T>(action: string, detail: string, fn: () => Promise<T>): Promise<Result<T>> {
  const result = await wrap(fn);
  const entry = { source: "app" as const, action, detail: result.ok ? detail : `${detail} → ${result.error}`, ok: result.ok };
  await appendJournal(entry).catch((error: unknown) => console.error("journal:", error));
  return result;
}

const orderSchema = z.object({
  direction: z.enum(["buy", "sell"]),
  type: z.enum(["market", "limit", "stop", "stoplimit"]),
  qty: z.number().positive(),
  price: z.number().positive().optional(),
  triggerPrice: z.number().positive().optional(),
  slTicks: z.number().positive().optional(),
  tpTicks: z.number().positive().optional(),
  requestId: z.string().max(64).optional(),
  comment: z.string().max(60).optional(),
});

export function createHandlers(env: PreflightEnv, bridge: BridgeClient, layoutFile: () => string): Handlers {
  const fixes = createFixes(env);
  const fixIds = z.enum(Object.keys(fixes) as [FixId, ...FixId[]]);
  const mcpCommand = `claude mcp add ${env.mcpName} --scope user -e ELECTRON_RUN_AS_NODE=1 -- ${[env.mcpCommand.exe, ...env.mcpCommand.args].map((p) => `"${p}"`).join(" ")}`;

  return {
    read: (endpoint) => wrap(() => bridge.read(z.enum(READ_ENDPOINTS).parse(endpoint))),
    placeOrder: (input) => {
      const parsed = orderSchema.safeParse(input);
      if (!parsed.success) return Promise.resolve({ ok: false, error: z.prettifyError(parsed.error) });
      const order = { ...parsed.data, comment: parsed.data.comment ?? "app" };
      return journaled("Order", `${order.direction} ${order.qty} ${order.type}`, () => bridge.placeOrder(order));
    },
    cancelOrder: (id) => journaled("Storno", String(id), () => bridge.cancelOrder(z.string().min(1).parse(id))),
    cancelAll: () => journaled("Alle stornieren", "", () => bridge.cancelAll()),
    closePosition: () => journaled("Glattstellen", "komplett", () => bridge.closePosition()),
    kill: (engage) => journaled(engage ? "Not-Aus an" : "Not-Aus frei", "", () => bridge.kill(z.boolean().parse(engage), "PaperChase AI")),
    preflight: () => wrap(() => runPreflight(env, bridge)),
    fix: (id) => wrap(() => fixes[fixIds.parse(id)]()),
    loadLayout: () => wrap(() => loadLayout(layoutFile())),
    saveLayout: (layout) => wrap(() => saveLayout(layoutFile(), layout).then(() => null)),
    journal: () => wrap(() => readJournal()),
    mcpCommand: () => wrap(() => mcpCommand),
  };
}
