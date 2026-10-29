"use client";

import { useState } from "react";
import { useActions } from "@/lib/actions";
import { useBridge } from "@/lib/bridge-data";
import type { OrderRequest } from "@/shared/types";

export type Side = OrderRequest["direction"];
export type Kind = "market" | "limit" | "stop";
export interface Bracket {
  on: boolean;
  ticks: number;
}

/** Order-ticket state: derives entry/SL/TP prices and whether sending is allowed. */
export function useTicket() {
  const { quote, risk } = useBridge();
  const { placeOrder } = useActions();
  const [side, setSide] = useState<Side>("buy");
  const [kind, setKindRaw] = useState<Kind>("market");
  const [qty, setQty] = useState(1);
  const [price, setPrice] = useState(Number.NaN);
  const [sl, setSl] = useState<Bracket>({ on: true, ticks: 40 });
  const [tp, setTp] = useState<Bracket>({ on: false, ticks: 80 });
  const [sending, setSending] = useState(false);

  const tick = quote?.tickSize ?? 0.25;
  const buy = side === "buy";
  const bracket = kind === "market";
  const entry = bracket ? (buy ? quote?.bestAsk : quote?.bestBid) : price;
  const sign = buy ? 1 : -1;
  const net = risk?.position ?? 0;
  // Orders that shrink the position are allowed even while new risk is blocked.
  const reducing = net !== 0 && net > 0 !== buy;
  const canSend = !sending && Boolean(risk?.tradingAllowed || reducing) && qty > 0 && (bracket || price > 0);

  const setKind = (next: Kind) => {
    setKindRaw(next);
    if (next !== "market" && !(price > 0)) setPrice(quote?.last ?? Number.NaN);
  };

  const send = async () => {
    setSending(true);
    const order: OrderRequest = { direction: side, type: kind, qty, comment: "app" };
    if (kind === "limit") order.price = price;
    if (kind === "stop") order.triggerPrice = price;
    if (bracket && sl.on) order.slTicks = sl.ticks;
    if (bracket && tp.on) order.tpTicks = tp.ticks;
    await placeOrder(order);
    setSending(false);
  };

  return {
    side, setSide, kind, setKind, qty, setQty, price, setPrice, sl, setSl, tp, setTp,
    tick, buy, bracket, entry,
    slPrice: bracket && sl.on && entry ? entry - sign * sl.ticks * tick : undefined,
    tpPrice: bracket && tp.on && entry ? entry + sign * tp.ticks * tick : undefined,
    maxQty: Math.max(1, risk?.limits.maxOrderQty ?? 1),
    canSend,
    send,
  };
}
