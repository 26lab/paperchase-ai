"use client";

import { CircleAlert, CircleCheck, CircleX, LoaderCircle, RefreshCw } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import type { CheckState, FixId } from "@/shared/ipc";
import { usePreflight } from "@/lib/preflight";
import { Button } from "./ui";

const fixLabels: Record<FixId, string> = {
  "open-atas-download": "ATAS herunterladen",
  "start-atas": "ATAS starten",
  "install-bridge-dll": "Bridge installieren",
  "register-mcp": "Claude verbinden",
  "open-claude-download": "Claude Code holen",
};

const icons: Record<CheckState, React.ReactNode> = {
  ok: <CircleCheck className="size-5 text-up" aria-label="OK" />,
  warn: <CircleAlert className="size-5 text-amber" aria-label="Hinweis" />,
  error: <CircleX className="size-5 text-down" aria-label="Fehler" />,
};

export function CheckList() {
  const { checks, loading, rerun, fix } = usePreflight();
  const [fixing, setFixing] = useState<FixId | null>(null);

  const runFix = async (id: FixId) => {
    setFixing(id);
    await fix(id);
    setFixing(null);
  };

  return (
    <div className="flex flex-col gap-2">
      {checks.map((check, index) => (
        <motion.div
          key={check.id}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.04 }}
          className="flex items-center gap-4 rounded-2xl border border-line bg-panel/80 px-4 py-3"
        >
          {icons[check.state]}
          <div className="min-w-0 flex-1">
            <div className="font-semibold">
              {check.label}
              {check.blocking && check.state === "error" && <span className="ml-2 text-xs font-normal text-down">erforderlich</span>}
            </div>
            <div className="truncate text-sm text-muted" title={check.detail}>
              {check.detail}
            </div>
          </div>
          {check.fix && check.state !== "ok" && (
            <Button onClick={() => void runFix(check.fix as FixId)} disabled={fixing !== null}>
              {fixing === check.fix && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
              {fixLabels[check.fix]}
            </Button>
          )}
        </motion.div>
      ))}
      <Button variant="ghost" className="mt-1 self-start" onClick={() => void rerun()} disabled={loading}>
        <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} aria-hidden />
        Erneut prüfen
      </Button>
    </div>
  );
}
