// Contract between the renderer (window.paperchase) and the Electron main process.
import type { CheckResult, CheckState, FixId } from "../electron/preflight";
import type { SavedLayout } from "../electron/layout-store";
import type { JournalEntry } from "./journal";
import type { OrderRequest, OrderResult, ReadEndpoint, ReadResults } from "./types";

/** IPC rejects lose their message in Electron, so failures travel as values. */
export type Result<T> = { ok: true; data: T } | { ok: false; error: string };

export interface PaperChaseApi {
  read<E extends ReadEndpoint>(endpoint: E): Promise<Result<ReadResults[E]>>;
  placeOrder(order: OrderRequest): Promise<Result<OrderResult>>;
  cancelOrder(id: string): Promise<Result<unknown>>;
  cancelAll(): Promise<Result<{ count: number }>>;
  closePosition(): Promise<Result<unknown>>;
  kill(engage: boolean): Promise<Result<{ engaged: boolean; settingsKillSwitch: boolean }>>;
  preflight(): Promise<Result<CheckResult[]>>;
  fix(id: FixId): Promise<Result<string>>;
  loadLayout(): Promise<Result<SavedLayout | null>>;
  saveLayout(layout: SavedLayout): Promise<Result<null>>;
  journal(): Promise<Result<JournalEntry[]>>;
  mcpCommand(): Promise<Result<string>>;
}

export type { CheckResult, CheckState, FixId, SavedLayout, JournalEntry };

export const IPC_CHANNEL = "paperchase";
export type IpcMethod = keyof PaperChaseApi;
