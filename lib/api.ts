import type { PaperChaseApi, Result } from "@/shared/ipc";

declare global {
  interface Window {
    paperchase?: PaperChaseApi;
  }
}

/** The preload bridge; missing when the UI is opened in a plain browser instead of the app. */
export function api(): PaperChaseApi {
  if (!window.paperchase) throw new Error("PaperChase AI läuft nicht in der Desktop-App.");
  return window.paperchase;
}

export const inApp = () => typeof window !== "undefined" && window.paperchase !== undefined;

export async function unwrap<T>(result: Promise<Result<T>>): Promise<T> {
  const value = await result;
  if (!value.ok) throw new Error(value.error);
  return value.data;
}
