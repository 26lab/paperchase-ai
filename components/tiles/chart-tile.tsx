"use client";

import { useRef, useState } from "react";
import { useBridge, useCandles } from "@/lib/bridge-data";
import { num, priceDigits, signed } from "@/lib/format";
import { useBot } from "@/lib/use-bot";
import type { Level } from "@/shared/bot-types";
import { Tile } from "./tile";
import { useCandleData, useChart, useClaudeOverlay, usePriceLines } from "./use-chart";

const NO_LEVELS: Level[] = [];

export function ChartTile() {
  const { quote, position, orders } = useBridge();
  const candles = useCandles();
  const bot = useBot();
  const [showClaude, setShowClaude] = useState(true);
  const host = useRef<HTMLDivElement>(null);
  const chart = useChart(host);
  useCandleData(chart, candles);
  usePriceLines(chart, position, orders);
  useClaudeOverlay(chart, bot.lastDecision?.levels ?? NO_LEVELS, bot.markers, showClaude);

  const current = candles?.current;
  const digits = priceDigits(quote?.tickSize ?? 0.25);
  return (
    <Tile
      title="Chart"
      actions={
        <span className="tabular flex items-center gap-3 text-xs text-muted">
          <button
            type="button"
            aria-pressed={showClaude}
            onClick={() => setShowClaude((v) => !v)}
            className={showClaude ? "text-up" : "text-muted hover:text-fg"}
            title="Von Claude erkannte Marken und Bot-Einstiege einblenden"
          >
            Claude-Marken
          </button>
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
