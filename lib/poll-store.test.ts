import { afterEach, describe, expect, it, vi } from "vitest";
import { createPollStore } from "./poll-store";

afterEach(() => vi.useRealTimers());

// A load that returns nothing means "no new value".
// oxlint-disable-next-line require-await -- the store expects an async loader
const nothingNew = async (): Promise<undefined> => {};

describe("createPollStore", () => {
  it("polls only while subscribed and notifies on new values", async () => {
    vi.useFakeTimers();
    let calls = 0;
    const store = createPollStore(() => Promise.resolve(++calls), 1000, 0);
    const listener = vi.fn<() => void>();

    const unsubscribe = store.subscribe(listener);
    await vi.advanceTimersByTimeAsync(2500);
    expect(store.get()).toBe(3);
    expect(listener).toHaveBeenCalledTimes(3);

    unsubscribe();
    await vi.advanceTimersByTimeAsync(5000);
    expect(calls).toBe(3);
  });

  it("keeps the previous value when load returns undefined", async () => {
    const store = createPollStore<number>(nothingNew, 1000, 7);
    await store.refresh();
    expect(store.get()).toBe(7);
  });
});
