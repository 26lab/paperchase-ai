"use client";

import { useRef } from "react";
import { useBridge, useCandles } from "@/lib/bridge-data";
import { num, priceDigits, signed } from "@/lib/format";
import { Tile } from "./tile";
import { useCandleData, useChart, usePriceLines } from "./use-chart";

export function ChartTile() {
  const { quote, position, orders } = useBridge();
  const candles = useCandles();
  const host = useRef<HTMLDivElement>(null);
  const chart = useChart(host);
  useCandleData(chart, candles);
  usePriceLines(chart, position, orders);

  const current = candles?.current;
  const digits = priceDigits(quote?.tickSize ?? 0.25);
  return (
    <Tile
      title="Chart"
      actions={
        <span className="tabular flex gap-3 text-xs text-muted">
          <span>Bid {num(quote?.bestBid, digits)}</span>
          <span>Ask {num(quote?.bestAsk, digits)}</span>
          {current && <span className={current.delta >= 0 ? "text-up" : "text-down"}>Δ {signed(current.delta, 0)}</span>}
        </span>
      }
    >
      <div ref={host} className="size-full min-h-40" />
    </Tile>
  );
}
