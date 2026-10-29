"use client";

import { useSyncExternalStore } from "react";
import { DEFAULT_BOT_CONFIG, type BotState } from "@/shared/bot-types";
import type { Result } from "@/shared/ipc";
import { api, inApp } from "./api";
import { createPollStore } from "./poll-store";

const INITIAL: BotState = { running: false, hasApiKey: false, config: DEFAULT_BOT_CONFIG, tradesThisSession: 0, costUsd: 0, calls: 0, markers: [] };

const store = createPollStore<BotState>(async () => {
  if (!inApp()) return;
  const result = await api().botState();
  if (result.ok) return result.data;
}, 2000, INITIAL);

export const useBot = () => useSyncExternalStore(store.subscribe, store.get, () => INITIAL);

/** Runs a bot call, refreshes the shared state and returns the error text, if any. */
export async function botCall(call: Promise<Result<BotState>>): Promise<string | null> {
  const result = await call;
  await store.refresh();
  return result.ok ? null : result.error;
}
