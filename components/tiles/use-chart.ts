"use client";

import {
  CandlestickSeries,
  ColorType,
  createChart,
  HistogramSeries,
  LineStyle,
  type IChartApi,
  type IPriceLine,
  type ISeriesApi,
  type UTCTimestamp,
} from "lightweight-charts";
import { useEffect, useRef, type RefObject } from "react";
import type { Candle, Candles, Order, Position } from "@/shared/types";

interface ChartHandles {
  api: IChartApi;
  price: ISeriesApi<"Candlestick">;
  volume: ISeriesApi<"Histogram">;
}

// Lightweight Charts renders in UTC; shift by the local offset so the axis shows wall-clock time.
const TZ_SHIFT = -new Date().getTimezoneOffset() * 60;
const toTime = (c: Candle) => (Math.floor(Date.parse(c.time) / 1000) + TZ_SHIFT) as UTCTimestamp;
const toBar = (c: Candle) => ({ time: toTime(c), open: c.open, high: c.high, low: c.low, close: c.close });
const toVolume = (c: Candle) => ({ time: toTime(c), value: c.volume, color: c.close >= c.open ? "rgba(31,224,124,.35)" : "rgba(255,77,94,.35)" });

export function useChart(host: RefObject<HTMLDivElement | null>) {
  const chart = useRef<ChartHandles | null>(null);
  useEffect(() => {
    if (!host.current) return;
    const api = createChart(host.current, {
      autoSize: true,
      layout: { background: { type: ColorType.Solid, color: "transparent" }, textColor: "#8aa79f", fontFamily: "var(--font-plex-mono)", attributionLogo: false },
      grid: { vertLines: { color: "rgba(26,51,44,.45)" }, horzLines: { color: "rgba(26,51,44,.45)" } },
      rightPriceScale: { borderColor: "#1a332c" },
      timeScale: { borderColor: "#1a332c", timeVisible: true, secondsVisible: false },
      crosshair: { mode: 0 },
    });
    const price = api.addSeries(CandlestickSeries, { upColor: "#1fe07c", downColor: "#ff4d5e", borderVisible: false, wickUpColor: "#1fe07c", wickDownColor: "#ff4d5e" });
    const volume = api.addSeries(HistogramSeries, { priceFormat: { type: "volume" }, priceScaleId: "vol" });
    api.priceScale("vol").applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });
    chart.current = { api, price, volume };
    return () => {
      api.remove();
      chart.current = null;
    };
  }, [host]);
  return chart;
}

/** Full redraw when bars are added, cheap update() while only the forming bar changes. */
export function useCandleData(chart: RefObject<ChartHandles | null>, candles: Candles | null) {
  const barCount = useRef(0);
  useEffect(() => {
    const c = chart.current;
    if (!c || !candles) return;
    const bars = candles.current ? [...candles.candles, candles.current] : candles.candles;
    const unique = [...new Map(bars.map((b) => [toTime(b), b])).values()].toSorted((a, b) => toTime(a) - toTime(b));
    const last = unique.at(-1);
    if (last && unique.length === barCount.current) {
      c.price.update(toBar(last));
      c.volume.update(toVolume(last));
      return;
    }
    c.price.setData(unique.map((b) => toBar(b)));
    c.volume.setData(unique.map((b) => toVolume(b)));
    barCount.current = unique.length;
  }, [chart, candles]);
}

/** Dashed lines for the entry and every working order (SL red, TP green, others amber). */
export function usePriceLines(chart: RefObject<ChartHandles | null>, position: Position | undefined, orders: Order[]) {
  const lines = useRef<IPriceLine[]>([]);
  useEffect(() => {
    const c = chart.current;
    if (!c) return;
    for (const line of lines.current) c.price.removePriceLine(line);
    lines.current = [];
    const add = (price: number, color: string, title: string) => {
      if (price > 0) lines.current.push(c.price.createPriceLine({ price, color, lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: true, title }));
    };
    if (position?.inPosition) add(position.averagePrice, "#e6f2ee", "Entry");
    for (const o of orders.filter((order) => order.state === "Active")) {
      const kind = o.comment?.startsWith("mcp-sl") ? "SL" : o.comment?.startsWith("mcp-tp") ? "TP" : o.direction;
      add(o.type === "Stop" ? o.triggerPrice : o.price, kind === "SL" ? "#ff4d5e" : kind === "TP" ? "#1fe07c" : "#ffc04d", `${kind} ${o.unfilled}`);
    }
  }, [chart, position, orders]);
}
