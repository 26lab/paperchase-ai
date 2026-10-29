// A value refreshed on an interval while at least one component subscribes,
// consumed with useSyncExternalStore (no setState-in-effect polling).
export interface PollStore<T> {
  subscribe: (listener: () => void) => () => void;
  get: () => T;
  refresh: () => Promise<void>;
}

/** `load` returns undefined to keep the previous value (e.g. tab hidden or request failed). */
export function createPollStore<T>(load: (previous: T) => Promise<T | undefined>, intervalMs: number, initial: T): PollStore<T> {
  let value = initial;
  let timer: ReturnType<typeof setInterval> | undefined;
  let inFlight = false;
  const listeners = new Set<() => void>();

  const refresh = async () => {
    if (inFlight) return;
    inFlight = true;
    try {
      const next = await load(value);
      if (next !== undefined && next !== value) {
        value = next;
        for (const listener of listeners) listener();
      }
    } finally {
      inFlight = false;
    }
  };

  return {
    subscribe(listener) {
      listeners.add(listener);
      if (listeners.size === 1) {
        void refresh();
        timer = setInterval(() => void refresh(), intervalMs);
      }
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0) clearInterval(timer);
      };
    },
    get: () => value,
    refresh,
  };
}
