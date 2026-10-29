"use client";

import { OctagonX } from "lucide-react";
import { useActions } from "@/lib/actions";
import { useBridge } from "@/lib/bridge-data";
import { num, priceDigits, usd } from "@/lib/format";
import { Badge, Button, cx, pnlText } from "../ui";

export function Topbar() {
  const { quote, status, risk, connected } = useBridge();
  const { kill } = useActions();
  const digits = priceDigits(quote?.tickSize ?? 0.25);

  return (
    // pr-40 leaves room for the native window buttons (titleBarOverlay).
    <header className="drag-region flex h-14 shrink-0 items-center gap-3 border-b border-line bg-ink-2/40 pr-40 pl-5 backdrop-blur-xl">
      <div className="no-drag flex items-center gap-2 rounded-xl border border-line bg-panel/70 px-3 py-1.5">
        <span className="grid size-6 place-items-center rounded-full bg-gradient-to-br from-amber to-[#ff7a00] text-[10px] font-black text-[#1b0e00]">
          {(status?.symbol ?? "?").slice(0, 2)}
        </span>
        <span className="font-display font-semibold tracking-wide">{status?.symbol ?? "–"}</span>
        <span className="text-xs text-dim">{status?.instrument}</span>
      </div>
      <span className="tabular text-lg">{num(quote?.last, digits)}</span>
      {risk && (risk.isRealAccount ? <Badge tone="amber">LIVE · {risk.account}</Badge> : <Badge tone="up">DEMO · {risk.account}</Badge>)}
      <span className={cx("tabular ml-3 text-sm", pnlText(risk?.dayPnL))}>Tag {usd(risk?.dayPnL)}</span>
      <div className="flex-1" />
      <Button
        variant={risk?.killSwitch ? "sell" : "danger"}
        className="no-drag"
        disabled={!connected}
        onClick={() => void kill(!risk?.killSwitch)}
        aria-pressed={risk?.killSwitch ?? false}
      >
        <OctagonX className="size-4" aria-hidden />
        {risk?.killSwitch ? "Not-Aus aktiv – freigeben" : "Not-Aus"}
      </Button>
    </header>
  );
}
