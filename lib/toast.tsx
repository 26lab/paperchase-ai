"use client";

import { AnimatePresence, motion } from "motion/react";
import { createContext, use, useCallback, useMemo, useState, type ReactNode } from "react";

type Tone = "ok" | "error" | "info";
interface Toast {
  id: number;
  text: string;
  tone: Tone;
}

const ToastContext = createContext<((text: string, tone?: Tone) => void) | null>(null);
const toneClass: Record<Tone, string> = { ok: "border-l-up", error: "border-l-down", info: "border-l-amber" };
let nextId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((text: string, tone: Tone = "ok") => {
    const id = ++nextId;
    setToasts((list) => [...list, { id, text, tone }]);
    setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), 6000);
  }, []);
  const value = useMemo(() => push, [push]);

  return (
    <ToastContext value={value}>
      {children}
      <div className="pointer-events-none fixed right-5 bottom-5 z-50 flex w-96 flex-col gap-2" aria-live="polite">
        <AnimatePresence initial={false}>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40 }}
              className={`pointer-events-auto rounded-xl border border-l-4 border-line-2 bg-panel-2/95 px-4 py-3 text-sm shadow-2xl backdrop-blur ${toneClass[toast.tone]}`}
            >
              {toast.text}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext>
  );
}

export function useToast() {
  const value = use(ToastContext);
  if (!value) throw new Error("useToast needs <ToastProvider>");
  return value;
}
