// Turns Claude's decision into one concrete step, or refuses it. Pure, so it is tested without ATAS.
import type { Decision } from "../../shared/bot-types";
import type { OrderRequest } from "../../shared/types";

export interface PlanContext {
  /** Net position: + long, - short, 0 flat. */
  position: number;
  activeOrders: number;
  tradesThisSession: number;
  maxTradesPerSession: number;
  maxOrderQty: number;
  /** From the risk level. */
  minConfidence: number;
  maxStopTicks: number;
}

export type Step =
  | { kind: "none" }
  | { kind: "order"; order: OrderRequest }
  | { kind: "close" }
  | { kind: "cancel" }
  | { kind: "refused"; reason: string };

function planOpen(d: Decision, ctx: PlanContext): Step {
  if (ctx.position !== 0) return { kind: "refused", reason: "Schon eine Position offen – erst schließen, kein Aufstocken/Drehen in einem Schritt." };
  if (ctx.tradesThisSession >= ctx.maxTradesPerSession) return { kind: "refused", reason: `Maximal ${ctx.maxTradesPerSession} Trades pro Session erreicht.` };
  if (!d.direction) return { kind: "refused", reason: "open ohne Richtung." };
  if (!d.stop_loss_ticks) return { kind: "refused", reason: "open ohne Stop-Loss – jede Position braucht einen Stop." };
  if (d.confidence < ctx.minConfidence) return { kind: "refused", reason: `Sicherheit ${Math.round(d.confidence * 100)} % < ${Math.round(ctx.minConfidence * 100)} % der Risikostufe.` };
  if (d.stop_loss_ticks > ctx.maxStopTicks) return { kind: "refused", reason: `Stop ${d.stop_loss_ticks} Ticks > ${ctx.maxStopTicks} der Risikostufe.` };
  const qty = d.quantity ?? 1;
  if (qty > ctx.maxOrderQty) return { kind: "refused", reason: `${qty} Kontrakte > erlaubte ${ctx.maxOrderQty} pro Order.` };
  return {
    kind: "order",
    order: {
      direction: d.direction,
      type: "market",
      qty,
      slTicks: d.stop_loss_ticks,
      tpTicks: d.take_profit_ticks ?? undefined,
      comment: "bot",
    },
  };
}

export function planDecision(d: Decision, ctx: PlanContext): Step {
  switch (d.action) {
    case "hold":
      return { kind: "none" };
    case "open":
      return planOpen(d, ctx);
    case "close":
      return ctx.position === 0 ? { kind: "refused", reason: "close ohne offene Position." } : { kind: "close" };
    case "cancel_orders":
      return ctx.activeOrders === 0 ? { kind: "none" } : { kind: "cancel" };
  }
}
