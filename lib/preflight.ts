"use client";

import { useState, useSyncExternalStore } from "react";
import type { CheckResult, FixId } from "@/shared/ipc";
import { api, inApp } from "./api";
import { createPollStore } from "./poll-store";
import { useToast } from "./toast";

const RECHECK_MS = 15_000;
const NONE: CheckResult[] = [];

const store = createPollStore<CheckResult[]>(async () => {
  if (!inApp()) return;
  const result = await api().preflight();
  if (result.ok) return result.data;
}, RECHECK_MS, NONE);

export function usePreflight() {
  const checks = useSyncExternalStore(store.subscribe, store.get, () => NONE);
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const rerun = async () => {
    setBusy(true);
    await store.refresh();
    setBusy(false);
  };

  const fix = async (id: FixId) => {
    const result = await api().fix(id);
    toast(result.ok ? result.data : result.error, result.ok ? "ok" : "error");
    await rerun();
  };

  return {
    checks,
    loading: busy || checks === NONE,
    /** A check that must pass before trading has failed. */
    blocked: checks.some((c) => c.blocking && c.state === "error"),
    rerun,
    fix,
  };
}
