"use client";

import { useId } from "react";
import { useBridge } from "@/lib/bridge-data";
import { num, priceDigits } from "@/lib/format";
import { Segmented, Stepper, Switch } from "../form";
import { Button, cx } from "../ui";
import { Tile } from "./tile";
import { useTicket, type Bracket, type Kind, type Side } from "./use-ticket";

const SIDES = [
  { value: "buy", label: "Buy", tone: "up" },
  { value: "sell", label: "Sell", tone: "down" },
] as const satisfies readonly { value: Side; label: string; tone: "up" | "down" }[];
const KINDS = [
  { value: "market", label: "Market" },
  { value: "limit", label: "Limit" },
  { value: "stop", label: "Stop" },
] as const satisfies readonly { value: Kind; label: string }[];

function Field({ id, label, hint, children, muted }: { id: string; label: string; hint?: string; children: React.ReactNode; muted?: boolean }) {
  return (
    <div className={cx("flex items-center justify-between gap-3 text-sm font-semibold", muted && "opacity-40")}>
      <label htmlFor={id}>
        {label}
        {hint && <span className="block text-xs font-normal text-dim">{hint}</span>}
      </label>
      {children}
    </div>
  );
}

function BracketField({ id, label, value, onChange, active }: { id: string; label: string; value: Bracket; onChange: (b: Bracket) => void; active: boolean }) {
  return (
    <Field id={id} label={label} muted={!active}>
      <div className="flex items-center gap-2">
        <Stepper id={id} value={value.ticks} onChange={(ticks) => onChange({ ...value, ticks })} step={1} min={1} suffix="Ticks" />
        <Switch label={`${label} aktiv`} checked={value.on && active} onChange={(on) => onChange({ ...value, on })} />
      </div>
    </Field>
  );
}

export function TicketTile() {
  const { quote, position, status } = useBridge();
  const t = useTicket();
  const id = useId();
  const digits = priceDigits(quote?.tickSize ?? 0.25);

  return (
    <Tile title="Order-Ticket">
      <div className="flex flex-col gap-3.5">
        <Segmented label="Richtung" options={SIDES} value={t.side} onChange={t.setSide} />
        <Segmented label="Ordertyp" options={KINDS} value={t.kind} onChange={t.setKind} />
        {!t.bracket && (
          <Field id={`${id}-price`} label={t.kind === "limit" ? "Limit-Preis" : "Stop-Preis"}>
            <Stepper id={`${id}-price`} value={t.price} onChange={t.setPrice} step={t.tick} />
          </Field>
        )}
        <Field id={`${id}-qty`} label="Menge" hint={`max ${t.maxQty} pro Order`}>
          <Stepper id={`${id}-qty`} value={t.qty} onChange={t.setQty} step={1} min={1} max={t.maxQty} suffix="Kontr." />
        </Field>
        <BracketField id={`${id}-sl`} label="Stop-Loss" value={t.sl} onChange={t.setSl} active={t.bracket} />
        <BracketField id={`${id}-tp`} label="Take-Profit" value={t.tp} onChange={t.setTp} active={t.bracket} />

        <div className="flex items-end justify-between border-t border-line/70 pt-3">
          <span className="text-sm font-semibold">Erwarteter Preis</span>
          <span className="text-right">
            <span className="tabular block text-xl">{num(t.entry, digits)}</span>
            <span className="tabular text-xs text-dim">SL {num(t.slPrice, digits)} · TP {num(t.tpPrice, digits)}</span>
          </span>
        </div>
        <Button variant={t.buy ? "buy" : "sell"} className="py-3.5 text-base" disabled={!t.canSend} onClick={() => void t.send()}>
          {t.buy ? "Buy / Long" : "Sell / Short"}
        </Button>
        <p className="text-xs text-dim">
          {t.buy ? "Kauf" : "Verkauf"} {t.qty} {status?.symbol} {t.bracket ? "Market" : `${t.kind} @ ${num(t.price, digits)}`}
          {position?.inPosition && ` · offene Position ${position.direction} ${position.volume}`}
        </p>
      </div>
    </Tile>
  );
}
