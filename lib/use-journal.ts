"use client";

import { useSyncExternalStore } from "react";
import type { JournalEntry } from "@/shared/ipc";
import { api, inApp } from "./api";
import { createPollStore } from "./poll-store";

const NONE: JournalEntry[] = [];

const store = createPollStore<JournalEntry[]>(async (prev) => {
  if (!inApp()) return;
  const result = await api().journal();
  // Same newest entry → nothing new; keep the old array so subscribers don't re-render.
  if (result.ok && result.data[0]?.time !== prev[0]?.time) return result.data;
}, 3000, NONE);

export const useJournal = () => useSyncExternalStore(store.subscribe, store.get, () => NONE);
