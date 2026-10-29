// HTTP client for the MCP Bridge running inside ATAS. Used by the Electron main
// process and the MCP server; never by the renderer (the token stays out of the UI).
import { randomUUID } from "node:crypto";
import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { BridgeError } from "./bridge-error";
import type { OrderRequest, OrderResult, ReadEndpoint, ReadResults } from "./types";

export { BridgeError };
export const DEFAULT_PORT = 8787;
export const TOKEN_HEADER = "X-Bridge-Token";

const appData = () => process.env.APPDATA ?? "";
const bridgeDirs = () => [join(appData(), "ATAS"), join(appData(), "ATAS X")];

function readNewest(fileName: string): string {
  let best = { text: "", mtime: -1 };
  for (const dir of bridgeDirs()) {
    const path = join(dir, fileName);
    try {
      const { mtimeMs } = statSync(path);
      if (mtimeMs > best.mtime) best = { text: readFileSync(path, "utf8").trim(), mtime: mtimeMs };
    } catch {
      // File missing for this ATAS flavour - try the next one.
    }
  }
  return best.text;
}

export function discoverPort(): number {
  const port = Number(process.env.ATAS_MCP_PORT ?? readNewest("McpBridge.port"));
  return Number.isInteger(port) && port > 0 && port < 65_536 ? port : DEFAULT_PORT;
}

/** The bridge writes a fresh token on every strategy start, so it is re-read per request. */
export const readToken = () => process.env.ATAS_MCP_TOKEN ?? readNewest("McpBridge.token");

export interface BridgeClientOptions {
  host?: string;
  port?: number;
  timeoutMs?: number;
}

export class BridgeClient {
  readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor({ host = "127.0.0.1", port = discoverPort(), timeoutMs = 10_000 }: BridgeClientOptions = {}) {
    this.baseUrl = `http://${host}:${port}`;
    this.timeoutMs = timeoutMs;
  }

  async request<T>(path: string, body?: unknown): Promise<T> {
    const url = this.baseUrl + path;
    const init: RequestInit = {
      headers: { [TOKEN_HEADER]: readToken(), ...(body === undefined ? {} : { "Content-Type": "application/json" }) },
      signal: AbortSignal.timeout(this.timeoutMs),
      ...(body === undefined ? {} : { method: "POST", body: JSON.stringify(body) }),
    };
    let response: Response;
    try {
      response = await fetch(url, init);
    } catch (error) {
      throw new BridgeError(
        `ATAS-Bridge nicht erreichbar (${url}). Läuft ATAS mit gestarteter Strategie „MCP Bridge“? (${String(error)})`,
      );
    }
    const data: unknown = await response.json().catch(() => null);
    if (data === null) throw new BridgeError(`Ungültige Antwort der Bridge (HTTP ${response.status}) für ${path}`);
    if (typeof data === "object" && "ok" in data && data.ok === false) {
      const message = "error" in data ? String(data.error) : "Bridge meldet einen Fehler";
      throw new BridgeError(message);
    }
    return data as T;
  }

  health = () => this.request<{ ok: true; id: string; version: string }>("/api/health");
  read = <E extends ReadEndpoint>(endpoint: E) => this.request<ReadResults[E]>(`/api/${endpoint}`);

  /** A requestId makes the call idempotent: the bridge answers a repeat with the first result. */
  placeOrder = (order: OrderRequest) =>
    this.request<OrderResult>("/api/order", { ...order, requestId: order.requestId ?? randomUUID().slice(0, 16) });

  cancelOrder = (id: string) => this.request<{ ok: true; id: string }>("/api/order/cancel", { id });
  cancelAll = () => this.request<{ ok: true; count: number }>("/api/orders/cancel-all", {});
  closePosition = (volume?: number) =>
    this.request<{ ok: true; volume: number; direction: string }>("/api/position/close", volume ? { volume } : {});
  kill = (engage: boolean, reason?: string) =>
    this.request<{ ok: true; engaged: boolean; settingsKillSwitch: boolean; reason: string }>("/api/kill", {
      engage,
      reason,
    });
}
