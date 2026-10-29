import type { ReactNode } from "react";
import { ActivityTile } from "@/components/tiles/activity-tile";
import { ChartTile } from "@/components/tiles/chart-tile";
import { TicketTile } from "@/components/tiles/ticket-tile";
import { BookTile, FillsTile, OrdersTile, PositionTile, SafetyTile } from "@/components/tiles/trading-tiles";
import type { SavedLayout } from "@/shared/ipc";

export interface TileDef {
  id: string;
  title: string;
  render: () => ReactNode;
  /** Default position in the 12-column desktop grid (rows are 40px). */
  x: number;
  y: number;
  w: number;
  h: number;
  minW: number;
  minH: number;
}

export const TILES: TileDef[] = [
  { id: "chart", title: "Chart", render: () => <ChartTile />, x: 0, y: 0, w: 8, h: 11, minW: 4, minH: 6 },
  { id: "ticket", title: "Order-Ticket", render: () => <TicketTile />, x: 8, y: 0, w: 4, h: 13, minW: 3, minH: 10 },
  { id: "position", title: "Position", render: () => <PositionTile />, x: 0, y: 11, w: 4, h: 4, minW: 3, minH: 4 },
  { id: "orders", title: "Offene Orders", render: () => <OrdersTile />, x: 4, y: 11, w: 4, h: 6, minW: 3, minH: 4 },
  { id: "safety", title: "Sicherheit", render: () => <SafetyTile />, x: 8, y: 13, w: 4, h: 8, minW: 3, minH: 7 },
  { id: "book", title: "Orderbuch", render: () => <BookTile />, x: 0, y: 15, w: 4, h: 10, minW: 2, minH: 6 },
  { id: "activity", title: "Aktivität", render: () => <ActivityTile />, x: 4, y: 17, w: 4, h: 8, minW: 3, minH: 4 },
  { id: "fills", title: "Fills", render: () => <FillsTile />, x: 8, y: 21, w: 4, h: 6, minW: 3, minH: 4 },
];

export const defaultLayout = (): SavedLayout => ({
  version: 1,
  layouts: { lg: TILES.map(({ id, x, y, w, h, minW, minH }) => ({ i: id, x, y, w, h, minW, minH })) },
  hidden: [],
});
