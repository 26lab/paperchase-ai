// Response shapes of the ATAS MCP Bridge (atas-mcp/ATAS.McpBridge/McpBridgeStrategy.cs).

export type Direction = "Buy" | "Sell";

export interface BridgeStatus {
  id: string;
  version: string;
  port: number;
  symbol: string | null;
  portfolio: string | null;
  instrument: string | null;
  tickSize: number;
  activated: boolean;
  currentBar: number;
  state: string;
  time: string;
}

export interface Quote {
  last: number;
  bestBid: number;
  bestAsk: number;
  bidSize: number;
  askSize: number;
  cumBids: number;
  cumAsks: number;
  spread: number;
  tickSize: number;
  time: string;
}

export interface DomLevel {
  price: number;
  volume: number;
  side: "Bid" | "Ask" | "Trade";
  time: string;
}

export interface Dom {
  bids: DomLevel[];
  asks: DomLevel[];
  time: string;
}

export interface Candle {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  delta: number;
  time: string;
}

export interface Candles {
  candles: Candle[];
  current: Candle | null;
}

export interface Position {
  inPosition: boolean;
  direction: Direction | null;
  volume: number;
  averagePrice: number;
  openPnL: number;
  closedPnL: number;
  currentPosition: number;
  symbol: string | null;
  time: string;
}

export interface Order {
  id: string;
  direction: Direction;
  type: "Limit" | "Market" | "Stop" | "StopLimit";
  state: "None" | "Active" | "Done" | "Failed";
  status: string;
  price: number;
  triggerPrice: number;
  qty: number;
  unfilled: number;
  filled: number;
  comment: string | null;
  account: string | null;
  symbol: string | null;
  time: string;
}

export interface Fill {
  id: string;
  orderId: string;
  price: number;
  volume: number;
  direction: Direction;
  symbol: string | null;
  time: string;
}

export interface RiskLimits {
  demoOnly: boolean;
  maxOrderQty: number;
  maxPositionQty: number;
  maxOrdersPerMinute: number;
  dailyLossLimit: number;
  flattenOnLossLimit: boolean;
  allowedSymbols: string;
  maxPriceDeviationPct: number;
  requireToken: boolean;
}

export interface Risk {
  killSwitch: boolean;
  killReason: string;
  settingsKillSwitch: boolean;
  account: string | null;
  isRealAccount: boolean;
  tradingAllowed: boolean;
  dayPnL: number;
  sessionPnL: number;
  lossMetric: number;
  lossLimitTripped: boolean;
  ordersLastMinute: number;
  position: number;
  limits: RiskLimits;
  time: string;
}

export interface OrderRequest {
  direction: "buy" | "sell";
  type: "market" | "limit" | "stop" | "stoplimit";
  qty: number;
  price?: number;
  triggerPrice?: number;
  slTicks?: number;
  tpTicks?: number;
  requestId?: string;
  comment?: string;
}

export interface OrderResult {
  ok: true;
  message: string;
  requestId: string;
  direction: string;
  type: string;
  qty: number;
  price: number;
  triggerPrice: number;
  stopLoss: number;
  takeProfit: number;
  comment: string | null;
}

/** Read-only endpoints the UI and MCP server may poll. */
export const READ_ENDPOINTS = ["status", "quote", "dom", "candles", "position", "orders", "trades", "risk", "log"] as const;
export type ReadEndpoint = (typeof READ_ENDPOINTS)[number];

export interface ReadResults {
  status: BridgeStatus;
  quote: Quote;
  dom: Dom;
  candles: Candles;
  position: Position;
  orders: Order[];
  trades: Fill[];
  risk: Risk;
  log: { log: string[] };
}
