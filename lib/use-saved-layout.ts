"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SavedLayout } from "@/shared/ipc";
import { api, inApp } from "./api";
import { defaultLayout } from "./tiles";

const SAVE_DELAY_MS = 400;

/** Dashboard layout from userData/layout.json; changes are saved debounced. */
export function useSavedLayout() {
  const [layout, setLayout] = useState<SavedLayout | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (!inApp()) return;
    void api()
      .loadLayout()
      .then((result) => setLayout((result.ok && result.data) || defaultLayout()));
    return () => clearTimeout(timer.current);
  }, []);

  const update = useCallback((next: SavedLayout) => {
    setLayout(next);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => void api().saveLayout(next), SAVE_DELAY_MS);
  }, []);

  return { layout, update };
}
