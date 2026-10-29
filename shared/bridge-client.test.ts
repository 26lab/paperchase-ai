import { createServer, type IncomingMessage, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { BridgeClient, BridgeError, TOKEN_HEADER } from "./bridge-client";

const TOKEN = "test-token";
let server: Server;
let client: BridgeClient;
const received: { path: string; token: string | undefined; body: Record<string, unknown> }[] = [];

const readBody = async (req: IncomingMessage) => {
  let raw = "";
  for await (const chunk of req) raw += String(chunk);
  return raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
};

beforeAll(async () => {
  process.env.ATAS_MCP_TOKEN = TOKEN;
  server = createServer(async (req, res) => {
    const body = await readBody(req);
    const token = req.headers[TOKEN_HEADER.toLowerCase()] as string | undefined;
    received.push({ path: req.url ?? "", token, body });
    res.setHeader("Content-Type", "application/json");
    if (token !== TOKEN) {
      res.statusCode = 401;
      res.end(JSON.stringify({ ok: false, error: "unauthorized" }));
    } else if (req.url === "/api/order" && body.qty === 3) {
      res.end(JSON.stringify({ ok: false, error: "refused by safety rules: qty 3 exceeds max qty per order 1" }));
    } else if (req.url === "/api/order") {
      res.end(JSON.stringify({ ok: true, message: "order sent", requestId: body.requestId }));
    } else {
      res.end(JSON.stringify({ state: "Started", symbol: "NQ" }));
    }
  });
  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", resolve);
  });
  client = new BridgeClient({ port: (server.address() as AddressInfo).port, timeoutMs: 2000 });
});

afterAll(() => {
  server.close();
  delete process.env.ATAS_MCP_TOKEN;
});

describe("BridgeClient", () => {
  it("sends the token and reads endpoints", async () => {
    const status = await client.read("status");
    expect(status.state).toBe("Started");
    expect(received.at(-1)?.token).toBe(TOKEN);
  });

  it("adds a requestId so retries are idempotent, and keeps a given one", async () => {
    const generated = await client.placeOrder({ direction: "buy", type: "market", qty: 1 });
    expect(generated.requestId).toMatch(/^[\da-f-]{16}$/u);
    const kept = await client.placeOrder({ direction: "buy", type: "market", qty: 1, requestId: "fixed-id" });
    expect(kept.requestId).toBe("fixed-id");
  });

  it("turns bridge refusals into BridgeError with the reason", async () => {
    await expect(client.placeOrder({ direction: "buy", type: "market", qty: 3 })).rejects.toThrow(/max qty per order/u);
  });

  it("reports a wrong token as BridgeError", async () => {
    process.env.ATAS_MCP_TOKEN = "wrong";
    await expect(client.read("status")).rejects.toBeInstanceOf(BridgeError);
    process.env.ATAS_MCP_TOKEN = TOKEN;
  });

  it("reports an unreachable bridge as BridgeError", async () => {
    const dead = new BridgeClient({ port: 1, timeoutMs: 500 });
    await expect(dead.health()).rejects.toThrow(/nicht erreichbar/u);
  });
});
