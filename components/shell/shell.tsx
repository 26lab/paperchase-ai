"use client";

import { AnimatePresence, motion } from "motion/react";
import { usePathname } from "next/navigation";
import { useSyncExternalStore, type ReactNode } from "react";
import { api, inApp } from "@/lib/api";
import { useBridge } from "@/lib/bridge-data";
import { usePreflight } from "@/lib/preflight";
import { useUpdate } from "@/lib/use-update";
import { CheckList } from "../check-list";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

// Pages that stay reachable while setup is incomplete.
const SETUP_SAFE = new Set(["/system/", "/settings/"]);
const noop = () => () => {};

function SetupAssistant() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 py-10">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Einrichtung abschließen</h1>
        <p className="mt-2 text-muted">
          PaperChase AI prüft bei jedem Start, ob ATAS, die Bridge und Claude bereit sind. Die roten Punkte müssen erledigt sein, bevor das Dashboard
          Daten zeigen kann – die meisten lassen sich per Klick beheben.
        </p>
      </div>
      <CheckList />
    </div>
  );
}

function Banner() {
  const { risk } = useBridge();
  const update = useUpdate();
  if (update.status === "ready")
    return (
      <div className="flex items-center gap-3 bg-up/10 px-5 py-1.5 text-sm font-semibold text-up">
        Update v{update.available} ist bereit.
        <button type="button" onClick={() => void api().installUpdate()} className="rounded-lg border border-up/40 px-2.5 py-0.5 text-xs hover:bg-up/15">
          Neu starten & installieren
        </button>
      </div>
    );
  if (risk?.killSwitch) return <div className="bg-down/15 px-5 py-2 text-sm font-semibold text-down">Not-Aus aktiv: {risk.killReason || "manuell"} – neue Positionen sind gesperrt.</div>;
  if (!risk?.isRealAccount) return null;
  return (
    <div className="bg-amber/15 px-5 py-2 text-sm font-semibold text-amber">
      Echtes Konto {risk.account}
      {risk.limits.demoOnly ? " – neue Positionen gesperrt (Demo only)." : " – Orders bewegen echtes Geld."}
    </div>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { blocked } = usePreflight();
  // Static export renders once without window; only the client knows whether it runs inside Electron.
  const desktop = useSyncExternalStore(noop, inApp, () => true);
  const gated = blocked && !SETUP_SAFE.has(pathname);

  if (!desktop) return <div className="grid h-full place-items-center text-muted">PaperChase AI läuft nur in der Desktop-App.</div>;

  return (
    <div className="flex h-full">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <Banner />
        <main id="main" className="scrollbar-thin min-h-0 flex-1 overflow-auto px-5 py-4">
          <AnimatePresence mode="wait">
            <motion.div key={gated ? "setup" : pathname} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
              {gated ? <SetupAssistant /> : children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
