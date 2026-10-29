"use client";

import { useSyncExternalStore } from "react";
import type { UpdateState } from "@/shared/ipc";
import { api, inApp } from "./api";
import { createPollStore } from "./poll-store";

const UNKNOWN: UpdateState = { status: "idle", version: "" };

const store = createPollStore<UpdateState>(async (prev) => {
  if (!inApp()) return;
  const result = await api().updateState();
  if (result.ok && (result.data.status !== prev.status || result.data.available !== prev.available)) return result.data;
}, 30_000, UNKNOWN);

export const useUpdate = () => useSyncExternalStore(store.subscribe, store.get, () => UNKNOWN);
export const refreshUpdate = () => store.refresh();
