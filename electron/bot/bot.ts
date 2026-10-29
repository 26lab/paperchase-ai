// The background trading bot: every N minutes it reads the market, asks Claude for one decision,
// checks it (plan.ts) and executes it through the bridge, which enforces its own safety rules too.
import { readFile, writeFile } from "node:fs/promises";
import { botConfigSchema, DEFAULT_BOT_CONFIG, type BotState, type Decision } from "../../shared/bot-types";
import type { BridgeClient } from "../../shared/bridge-client";
import { appendJournal } from "../../shared/journal";
import { decide } from "./decide";
import { planDecision, type Step } from "./plan";
import { buildUserMessage } from "./prompt";
import { loadApiKey } from "./secrets";

const MAX_CONSECUTIVE_ERRORS = 3;

export class TradingBot {
  private state: BotState = { running: false, hasApiKey: false, config: DEFAULT_BOT_CONFIG, tradesThisSession: 0, costUsd: 0, calls: 0 };
  private timer: ReturnType<typeof setTimeout> | undefined;
  private busy = false;
  private errors = 0;
  private readonly decisions: (Decision & { time: string })[] = [];

  constructor(
    private readonly bridge: BridgeClient,
    private readonly configFile: string,
  ) {}

  async init(): Promise<void> {
    const saved = await readFile(this.configFile, "utf8").then((t) => botConfigSchema.safeParse(JSON.parse(t)), () => null);
    if (saved?.success) this.state.config = saved.data;
    this.state.hasApiKey = (await loadApiKey()) !== null;
  }

  getState = (): BotState => ({ ...this.state });

  async refreshKeyState(): Promise<void> {
    this.state.hasApiKey = (await loadApiKey()) !== null;
  }

  async saveConfig(input: unknown): Promise<BotState> {
    const config = botConfigSchema.parse(input);
    await writeFile(this.configFile, JSON.stringify(config, null, 1));
    this.state.config = config;
    return this.getState();
  }

  async start(): Promise<BotState> {
    if (this.state.running) return this.getState();
    if (!(await loadApiKey())) throw new Error("Kein Anthropic-API-Schlüssel hinterlegt.");
    const risk = await this.bridge.read("risk");
    if (risk.isRealAccount && !this.state.config.allowLiveAccount) throw new Error(`Konto ${risk.account ?? ""} ist ein ECHTES Konto – in den Bot-Einstellungen ist Live nicht freigegeben.`);
    if (risk.killSwitch) throw new Error("Not-Aus ist aktiv – erst freigeben.");
    Object.assign(this.state, {
      running: true,
      startedAt: new Date().toISOString(),
      sessionPnlAtStart: risk.sessionPnL,
      sessionPnl: 0,
      tradesThisSession: 0,
      costUsd: 0,
      calls: 0,
      stoppedReason: undefined,
      error: undefined,
    });
    this.errors = 0;
    await this.log("Bot gestartet", `alle ${this.state.config.intervalMinutes} min · Konto ${risk.account ?? "?"}`, true);
    this.schedule(0);
    return this.getState();
  }

  async stop(reason = "manuell gestoppt"): Promise<BotState> {
    if (!this.state.running) return this.getState();
    clearTimeout(this.timer);
    Object.assign(this.state, { running: false, nextRunAt: undefined, stoppedReason: reason });
    await this.log("Bot gestoppt", reason, true);
    return this.getState();
  }

  private schedule(delayMs: number): void {
    clearTimeout(this.timer);
    this.state.nextRunAt = new Date(Date.now() + delayMs).toISOString();
    this.timer = setTimeout(() => void this.tick(), delayMs);
  }

  private log(action: string, detail: string, ok: boolean) {
    return appendJournal({ source: "bot", action, detail, ok }).catch((error: unknown) => console.error("journal:", error));
  }

  /** Bot-level stops, checked before every decision. Returns a reason to stop, or null. */
  private async guardrails(): Promise<string | null> {
    const risk = await this.bridge.read("risk");
    this.state.sessionPnl = risk.sessionPnL - (this.state.sessionPnlAtStart ?? risk.sessionPnL);
    if (risk.killSwitch) return `Not-Aus aktiv (${risk.killReason || "manuell"})`;
    if (risk.isRealAccount && !this.state.config.allowLiveAccount) return "Konto ist ein echtes Konto, Live nicht freigegeben";
    if (this.state.sessionPnl <= -this.state.config.sessionLossStop) {
      // Flatten before stopping so no position is left running without the bot watching it.
      await this.bridge.cancelAll().catch(() => null);
      await this.bridge.closePosition().catch(() => null);
      return `Session-Verlust ${this.state.sessionPnl.toFixed(0)} $ ≤ -${this.state.config.sessionLossStop} $ – Position geschlossen`;
    }
    return null;
  }

  private async tick(): Promise<void> {
    if (!this.state.running || this.busy) return;
    this.busy = true;
    try {
      const stopReason = await this.guardrails();
      if (stopReason) {
        await this.stop(stopReason);
        return;
      }
      await this.cycle();
      this.errors = 0;
    } catch (error) {
      this.errors++;
      this.state.error = error instanceof Error ? error.message : String(error);
      await this.log("Bot-Fehler", this.state.error, false);
      if (this.errors >= MAX_CONSECUTIVE_ERRORS) await this.stop(`${MAX_CONSECUTIVE_ERRORS} Fehler in Folge: ${this.state.error}`);
    } finally {
      this.busy = false;
      if (this.state.running) this.schedule(this.state.config.intervalMinutes * 60_000);
    }
  }

  private async cycle(): Promise<void> {
    const apiKey = await loadApiKey();
    if (!apiKey) throw new Error("API-Schlüssel fehlt.");
    const [status, candles, quote, dom, position, orders, risk] = await Promise.all([
      this.bridge.read("status"), this.bridge.read("candles"), this.bridge.read("quote"), this.bridge.read("dom"),
      this.bridge.read("position"), this.bridge.read("orders"), this.bridge.read("risk"),
    ]);
    const message = buildUserMessage({
      symbol: status.symbol ?? "?",
      candles: candles.candles,
      current: candles.current,
      quote, dom, position, orders, risk,
      strategy: this.state.config.strategy,
      recentDecisions: this.decisions,
      tradesThisSession: this.state.tradesThisSession,
      maxTradesPerSession: this.state.config.maxTradesPerSession,
    });

    const { decision, costUsd } = await decide(apiKey, message);
    const stamped = { ...decision, time: new Date().toISOString() };
    this.decisions.push(stamped);
    this.decisions.splice(0, Math.max(0, this.decisions.length - 20));
    Object.assign(this.state, { lastDecision: stamped, lastRunAt: stamped.time, costUsd: this.state.costUsd + costUsd, calls: this.state.calls + 1, error: undefined });

    const step = planDecision(decision, {
      position: risk.position,
      activeOrders: orders.filter((o) => o.state === "Active").length,
      tradesThisSession: this.state.tradesThisSession,
      maxTradesPerSession: this.state.config.maxTradesPerSession,
      maxOrderQty: risk.limits.maxOrderQty,
    });
    await this.execute(step, decision);
  }

  private async execute(step: Step, d: Decision): Promise<void> {
    const why = `${d.reasoning} (Sicherheit ${Math.round(d.confidence * 100)} %)`;
    switch (step.kind) {
      case "none":
        await this.log(d.action === "hold" ? "Abwarten" : "Nichts zu tun", why, true);
        return;
      case "refused":
        await this.log(`Abgelehnt: ${d.action}`, `${step.reason} – ${why}`, false);
        return;
      case "order": {
        // A refusal by the bridge's safety rules is an expected outcome, not a bot error.
        const r = await this.bridge.placeOrder(step.order).catch(async (error: unknown) => {
          await this.log("Bridge lehnt ab", `${error instanceof Error ? error.message : String(error)} – ${why}`, false);
          return null;
        });
        if (!r) return;
        this.state.tradesThisSession++;
        await this.log(`Einstieg ${step.order.direction === "buy" ? "LONG" : "SHORT"}`, `${step.order.qty} Market · SL ${r.stopLoss || "–"} · TP ${r.takeProfit || "–"} – ${why}`, true);
        return;
      }
      case "close":
        await this.bridge.closePosition();
        await this.log("Position geschlossen", why, true);
        return;
      case "cancel":
        await this.bridge.cancelAll();
        await this.log("Orders storniert", why, true);
    }
  }
}
