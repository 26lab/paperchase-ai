"use client";

import {
  CandlestickSeries,
  ColorType,
  createChart,
  createSeriesMarkers,
  HistogramSeries,
  LineStyle,
  type IChartApi,
  type IPriceLine,
  type ISeriesApi,
  type ISeriesMarkersPluginApi,
  type Time,
  type UTCTimestamp,
} from "lightweight-charts";
import { useEffect, useRef, type RefObject } from "react";
import type { BotMarker, Level } from "@/shared/bot-types";
import type { Candle, Candles, Order, Position } from "@/shared/types";

interface ChartHandles {
  api: IChartApi;
  price: ISeriesApi<"Candlestick">;
  volume: ISeriesApi<"Histogram">;
}

// Lightweight Charts renders in UTC; shift by the local offset so the axis shows wall-clock time.
const TZ_SHIFT = -new Date().getTimezoneOffset() * 60;
const timeOf = (iso: string) => (Math.floor(Date.parse(iso) / 1000) + TZ_SHIFT) as UTCTimestamp;
const toTime = (c: Candle) => timeOf(c.time);
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

const LEVEL_STYLE: Record<Level["kind"], { color: string; style: LineStyle }> = {
  support: { color: "#2dd4bf", style: LineStyle.Solid },
  resistance: { color: "#fb923c", style: LineStyle.Solid },
  entry_zone: { color: "#ffc04d", style: LineStyle.Dotted },
  target_zone: { color: "#1fe07c", style: LineStyle.Dotted },
  invalidation: { color: "#c084fc", style: LineStyle.LargeDashed },
};

const MARKER_STYLE = {
  long: { shape: "arrowUp", position: "belowBar", color: "#1fe07c" },
  short: { shape: "arrowDown", position: "aboveBar", color: "#ff4d5e" },
  close: { shape: "circle", position: "aboveBar", color: "#8aa79f" },
} as const;

/** Claude's levels (lines, zones as two edges) and the bot's entry/exit arrows. */
export function useClaudeOverlay(chart: RefObject<ChartHandles | null>, levels: Level[], markers: BotMarker[], visible: boolean) {
  const lines = useRef<IPriceLine[]>([]);
  const plugin = useRef<ISeriesMarkersPluginApi<Time> | null>(null);
  useEffect(() => {
    const c = chart.current;
    if (!c) return;
    for (const line of lines.current) c.price.removePriceLine(line);
    lines.current = [];
    plugin.current ??= createSeriesMarkers(c.price);
    plugin.current.setMarkers(
      visible
        ? markers.map((m) => ({ time: timeOf(m.candleTime), text: m.text, ...MARKER_STYLE[m.kind] })).toSorted((a, b) => a.time - b.time)
        : [],
    );
    if (!visible) return;
    for (const level of levels) {
      const { color, style } = LEVEL_STYLE[level.kind];
      const edges = level.price_high === null ? [level.price] : [level.price, level.price_high];
      for (const [index, price] of edges.entries()) {
        const title = index === 0 ? level.label : "";
        lines.current.push(c.price.createPriceLine({ price, color, lineWidth: 1, lineStyle: style, axisLabelVisible: index === 0, title }));
      }
    }
  }, [chart, levels, markers, visible]);
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
