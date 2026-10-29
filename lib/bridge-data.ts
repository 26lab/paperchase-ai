"use client";

import { useSyncExternalStore } from "react";
import type { BridgeStatus, Candles, Dom, Fill, Order, Position, Quote, Risk } from "@/shared/types";
import { api, inApp } from "./api";
import { createPollStore } from "./poll-store";

export interface LiveData {
  status?: BridgeStatus;
  quote?: Quote;
  dom?: Dom;
  position?: Position;
  orders: Order[];
  trades: Fill[];
  risk?: Risk;
  connected: boolean;
  error?: string;
}

const EMPTY: LiveData = { orders: [], trades: [], connected: false };
const canPoll = () => inApp() && !document.hidden;

const liveStore = createPollStore<LiveData>(async (prev) => {
  if (!canPoll()) return;
  const p = api();
  const [status, quote, position, orders, trades, risk, dom] = await Promise.all([
    p.read("status"), p.read("quote"), p.read("position"), p.read("orders"), p.read("trades"), p.read("risk"), p.read("dom"),
  ]);
  if (!status.ok) return { ...prev, connected: false, error: status.error };
  return {
    connected: true,
    status: status.data,
    quote: quote.ok ? quote.data : prev.quote,
    position: position.ok ? position.data : prev.position,
    orders: orders.ok ? orders.data : prev.orders,
    trades: trades.ok ? trades.data : prev.trades,
    risk: risk.ok ? risk.data : prev.risk,
    dom: dom.ok ? dom.data : prev.dom,
  };
}, 1000, EMPTY);

const candleStore = createPollStore<Candles | null>(async () => {
  if (!canPoll()) return;
  const result = await api().read("candles");
  if (result.ok) return result.data;
}, 2000, null);

export function useBridge(): LiveData & { refresh: () => void } {
  const live = useSyncExternalStore(liveStore.subscribe, liveStore.get, () => EMPTY);
  return { ...live, refresh: () => void liveStore.refresh() };
}

export const useCandles = () => useSyncExternalStore(candleStore.subscribe, candleStore.get, () => null);
