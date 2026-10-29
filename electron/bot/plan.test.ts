import { describe, expect, it } from "vitest";
import type { Decision } from "../../shared/bot-types";
import { planDecision, type PlanContext } from "./plan";

const flat: PlanContext = { position: 0, activeOrders: 0, tradesThisSession: 0, maxTradesPerSession: 5, maxOrderQty: 1, minConfidence: 0.6, maxStopTicks: 80 };
const base: Decision = { action: "hold", reasoning: "test", confidence: 0.5, direction: null, quantity: null, stop_loss_ticks: null, take_profit_ticks: null, levels: [] };
const open = (patch: Partial<Decision>): Decision => ({ ...base, action: "open", confidence: 0.7, direction: "buy", quantity: 1, stop_loss_ticks: 40, take_profit_ticks: 80, ...patch });

describe("planDecision", () => {
  it("turns a valid open into a bracketed market order", () => {
    expect(planDecision(open({}), flat)).toEqual({
      kind: "order",
      order: { direction: "buy", type: "market", qty: 1, slTicks: 40, tpTicks: 80, comment: "bot" },
    });
  });

  it("refuses an open without stop-loss", () => {
    expect(planDecision(open({ stop_loss_ticks: null }), flat)).toMatchObject({ kind: "refused", reason: expect.stringMatching(/Stop-Loss/u) });
  });

  it("refuses to add to or flip an open position", () => {
    expect(planDecision(open({ direction: "sell" }), { ...flat, position: 1 })).toMatchObject({ kind: "refused" });
  });

  it("refuses more contracts than allowed per order", () => {
    expect(planDecision(open({ quantity: 3 }), flat)).toMatchObject({ kind: "refused", reason: expect.stringMatching(/3 Kontrakte/u) });
  });

  it("stops opening once the session trade limit is reached", () => {
    expect(planDecision(open({}), { ...flat, tradesThisSession: 5 })).toMatchObject({ kind: "refused", reason: expect.stringMatching(/Maximal 5/u) });
  });

  it("closes only when a position exists and cancels only when orders exist", () => {
    expect(planDecision({ ...base, action: "close" }, flat)).toMatchObject({ kind: "refused" });
    expect(planDecision({ ...base, action: "close" }, { ...flat, position: -1 })).toEqual({ kind: "close" });
    expect(planDecision({ ...base, action: "cancel_orders" }, flat)).toEqual({ kind: "none" });
    expect(planDecision({ ...base, action: "cancel_orders" }, { ...flat, activeOrders: 2 })).toEqual({ kind: "cancel" });
  });

  it("refuses entries below the risk level's confidence or above its stop", () => {
    expect(planDecision(open({ confidence: 0.5 }), flat)).toMatchObject({ kind: "refused", reason: expect.stringMatching(/50 % < 60 %/u) });
    expect(planDecision(open({ stop_loss_ticks: 120 }), flat)).toMatchObject({ kind: "refused", reason: expect.stringMatching(/120 Ticks/u) });
  });

  it("does nothing on hold", () => {
    expect(planDecision(base, flat)).toEqual({ kind: "none" });
  });
});
