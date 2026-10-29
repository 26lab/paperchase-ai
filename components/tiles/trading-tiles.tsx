"use client";

import { X } from "lucide-react";
import { useActions } from "@/lib/actions";
import { useBridge } from "@/lib/bridge-data";
import { num, priceDigits, time, usd } from "@/lib/format";
import type { DomLevel, Order } from "@/shared/types";
import { Badge, Button, cx, Empty, pnlText, Stat } from "../ui";
import { Tile } from "./tile";

const orderPrice = (o: Order) => (o.type === "Stop" ? o.triggerPrice : o.price);

export function PositionTile() {
  const { position: p, risk, quote } = useBridge();
  const { closePosition } = useActions();
  const net = risk?.position ?? 0;
  const digits = priceDigits(quote?.tickSize ?? 0.25);
  return (
    <Tile title="Position" actions={p?.inPosition && <Button variant="ghost" className="py-1 text-xs" onClick={() => void closePosition()}>Schließen</Button>}>
      <div className="grid grid-cols-2 gap-2">
        <Stat label="Größe">
          <span className={net > 0 ? "text-up" : net < 0 ? "text-down" : ""}>{net > 0 ? `+${net}` : net}</span>{" "}
          <Badge tone={net > 0 ? "up" : net < 0 ? "down" : "neutral"}>{net > 0 ? "Long" : net < 0 ? "Short" : "Flat"}</Badge>
        </Stat>
        <Stat label="Ø Einstieg">{p?.inPosition ? num(p.averagePrice, digits) : "–"}</Stat>
        <Stat label="Offener PnL"><span className={pnlText(p?.openPnL)}>{usd(p?.openPnL)}</span></Stat>
        <Stat label="Session-PnL"><span className={pnlText(risk?.sessionPnL)}>{usd(risk?.sessionPnL)}</span></Stat>
      </div>
    </Tile>
  );
}

export function OrdersTile() {
  const { orders, quote } = useBridge();
  const { cancelOrder, cancelAll } = useActions();
  const active = orders.filter((o) => o.state === "Active").toReversed();
  const digits = priceDigits(quote?.tickSize ?? 0.25);
  return (
    <Tile title={`Offene Orders · ${active.length}`} actions={active.length > 0 && <Button variant="ghost" className="py-1 text-xs" onClick={() => void cancelAll()}>Alle stornieren</Button>}>
      {active.length === 0 ? (
        <Empty>Keine offenen Orders</Empty>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {active.map((o) => (
            <li key={o.id} className="flex items-center gap-3 rounded-xl border border-line px-3 py-2 text-sm">
              <Badge tone={o.direction === "Buy" ? "up" : "down"}>{o.direction}</Badge>
              <span className="font-semibold">{o.type}</span>
              <span className="tabular">{num(orderPrice(o), digits)}</span>
              <span className="tabular text-muted">{o.filled}/{o.qty}</span>
              <span className="min-w-0 flex-1 truncate text-xs text-dim">{o.comment}</span>
              <button type="button" aria-label={`Order ${o.id} stornieren`} onClick={() => void cancelOrder(o.id)} className="rounded-lg p-1 text-muted hover:bg-down/15 hover:text-down">
                <X className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Tile>
  );
}

function BookRow({ level, max, digits, ask }: { level: DomLevel; max: number; digits: number; ask: boolean }) {
  return (
    <div className="tabular relative flex justify-between px-2 py-[3px] text-[12.5px]">
      <span aria-hidden className={cx("absolute inset-y-0 right-0 rounded-sm", ask ? "bg-down/15" : "bg-up/15")} style={{ width: `${(level.volume / max) * 100}%` }} />
      <span className={cx("relative", ask ? "text-down" : "text-up")}>{num(level.price, digits)}</span>
      <span className="relative">{level.volume}</span>
    </div>
  );
}

export function BookTile() {
  const { dom, quote } = useBridge();
  if (!dom) return <Tile title="Orderbuch"><Empty>Warte auf Daten…</Empty></Tile>;
  const digits = priceDigits(quote?.tickSize ?? 0.25);
  const asks = dom.asks.slice(0, 10).toReversed();
  const bids = dom.bids.slice(0, 10);
  const max = Math.max(1, ...asks.map((l) => l.volume), ...bids.map((l) => l.volume));
  return (
    <Tile title="Orderbuch">
      {asks.map((l) => <BookRow key={`a${l.price}`} level={l} max={max} digits={digits} ask />)}
      <div className="tabular my-1 border-y border-line py-1 text-center text-sm">
        {num(quote?.last, digits)} <span className="text-xs text-dim">Spread {num(quote?.spread, digits)}</span>
      </div>
      {bids.map((l) => <BookRow key={`b${l.price}`} level={l} max={max} digits={digits} ask={false} />)}
    </Tile>
  );
}

export function FillsTile() {
  const { trades, quote } = useBridge();
  const digits = priceDigits(quote?.tickSize ?? 0.25);
  return (
    <Tile title="Fills">
      {trades.length === 0 ? (
        <Empty>Noch keine Ausführungen</Empty>
      ) : (
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-dim">
            <tr><th className="pb-1 font-semibold">Zeit</th><th className="font-semibold">Seite</th><th className="font-semibold">Preis</th><th className="text-right font-semibold">Menge</th></tr>
          </thead>
          <tbody className="tabular">
            {trades.toReversed().map((t) => (
              <tr key={t.id} className="border-t border-line/60">
                <td className="py-1.5">{time(t.time)}</td>
                <td className={t.direction === "Buy" ? "text-up" : "text-down"}>{t.direction}</td>
                <td>{num(t.price, digits)}</td>
                <td className="text-right">{t.volume}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Tile>
  );
}

export function SafetyTile() {
  const { risk } = useBridge();
  const { kill, closePosition, cancelAll } = useActions();
  const l = risk?.limits;
  return (
    <Tile title="Sicherheit" actions={risk && <Badge tone={risk.tradingAllowed ? "up" : "down"}>{risk.tradingAllowed ? "Handel erlaubt" : "gesperrt"}</Badge>}>
      <div className="grid grid-cols-2 gap-2">
        <Stat label="Konto">{risk?.isRealAccount ? <span className="text-amber">ECHT</span> : <span className="text-up">Demo</span>}</Stat>
        <Stat label="Max/Order · Position">{l ? `${l.maxOrderQty} · ${l.maxPositionQty}` : "–"}</Stat>
        <Stat label="Orders / Minute">{risk ? `${risk.ordersLastMinute} / ${l?.maxOrdersPerMinute}` : "–"}</Stat>
        <Stat label="Verlust · Limit">
          <span className={pnlText(risk?.lossMetric)}>{num(risk?.lossMetric, 0)}</span> / {l?.dailyLossLimit ? `-${l.dailyLossLimit}` : "aus"}
        </Stat>
      </div>
      <Button variant={risk?.killSwitch ? "sell" : "danger"} className="mt-3 w-full py-2.5" onClick={() => void kill(!risk?.killSwitch)}>
        {risk?.killSwitch ? "NOT-AUS AKTIV – freigeben" : "NOT-AUS"}
      </Button>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <Button onClick={() => void closePosition()}>Position schließen</Button>
        <Button onClick={() => void cancelAll()}>Alle stornieren</Button>
      </div>
    </Tile>
  );
}
