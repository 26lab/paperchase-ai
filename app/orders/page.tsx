"use client";

import { useState } from "react";
import { Segmented } from "@/components/form";
import { PageHeader, Panel } from "@/components/page-header";
import { Badge, Empty } from "@/components/ui";
import { useActions } from "@/lib/actions";
import { useBridge } from "@/lib/bridge-data";
import { num, priceDigits, time } from "@/lib/format";
import type { Fill, Order } from "@/shared/types";

type Filter = "all" | "Active" | "Done";
const FILTERS = [
  { value: "all", label: "Alle" },
  { value: "Active", label: "Offen" },
  { value: "Done", label: "Erledigt" },
] as const satisfies readonly { value: Filter; label: string }[];
const HEADERS = ["Zeit", "Seite", "Typ", "Preis", "Menge", "Status", "Kommentar", ""];

function OrderRow({ order: o, digits, onCancel }: { order: Order; digits: number; onCancel: (id: string) => void }) {
  return (
    <tr className="border-t border-line/60">
      <td className="tabular py-2">{time(o.time)}</td>
      <td><Badge tone={o.direction === "Buy" ? "up" : "down"}>{o.direction}</Badge></td>
      <td>{o.type}</td>
      <td className="tabular">{o.type === "Market" ? "MKT" : num(o.type === "Stop" ? o.triggerPrice : o.price, digits)}</td>
      <td className="tabular">{o.filled}/{o.qty}</td>
      <td>{o.status}</td>
      <td className="max-w-48 truncate text-muted" title={o.comment ?? ""}>{o.comment}</td>
      <td className="text-right">
        {o.state === "Active" && (
          <button type="button" onClick={() => onCancel(o.id)} className="rounded-lg border border-line-2 px-2.5 py-1 text-xs text-muted hover:border-down hover:text-down">
            Storno
          </button>
        )}
      </td>
    </tr>
  );
}

function OrdersPanel({ orders, digits }: { orders: Order[]; digits: number }) {
  const { cancelOrder } = useActions();
  const [filter, setFilter] = useState<Filter>("all");
  const list = orders.filter((o) => filter === "all" || o.state === filter).toReversed();
  return (
    <Panel>
      <div className="mb-3 w-72">
        <Segmented label="Filter" options={FILTERS} value={filter} onChange={setFilter} />
      </div>
      {list.length === 0 ? (
        <Empty>Keine Orders</Empty>
      ) : (
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-dim">
            <tr>{HEADERS.map((h) => <th key={h} className="pb-2 font-semibold">{h}</th>)}</tr>
          </thead>
          <tbody>
            {list.map((o) => <OrderRow key={o.id} order={o} digits={digits} onCancel={(id) => void cancelOrder(id)} />)}
          </tbody>
        </table>
      )}
    </Panel>
  );
}

function FillsPanel({ trades, digits }: { trades: Fill[]; digits: number }) {
  return (
    <Panel title={`Fills · ${trades.length}`}>
      {trades.length === 0 ? (
        <Empty>Noch keine Ausführungen</Empty>
      ) : (
        <ul className="tabular flex flex-col text-sm">
          {trades.toReversed().map((t) => (
            <li key={t.id} className="flex justify-between border-t border-line/60 py-2 first:border-t-0">
              <span>{time(t.time)}</span>
              <span className={t.direction === "Buy" ? "text-up" : "text-down"}>{t.direction} {t.volume}</span>
              <span>{num(t.price, digits)}</span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

export default function OrdersPage() {
  const { orders, trades, quote } = useBridge();
  const digits = priceDigits(quote?.tickSize ?? 0.25);
  return (
    <>
      <PageHeader title="Orders & Historie">Alle Orders und Ausführungen der laufenden Bridge-Session.</PageHeader>
      <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
        <OrdersPanel orders={orders} digits={digits} />
        <FillsPanel trades={trades} digits={digits} />
      </div>
    </>
  );
}
