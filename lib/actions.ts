"use client";

import { useCallback } from "react";
import type { Result } from "@/shared/ipc";
import type { OrderRequest } from "@/shared/types";
import { api } from "./api";
import { useBridge } from "./bridge-data";
import { useToast } from "./toast";

// A native, blocking dialog is intended here: nothing must be sent before the answer.
// oxlint-disable-next-line no-alert
const confirmed = (question: string) => window.confirm(question);

/** Trading actions with confirmations, toasts and an immediate refresh. */
export function useActions() {
  const { refresh, risk, status } = useBridge();
  const toast = useToast();

  const perform = useCallback(
    async <T,>(call: Promise<Result<T>>, success: (data: T) => string) => {
      const result = await call;
      if (result.ok) toast(success(result.data));
      else toast(result.error, "error");
      setTimeout(refresh, 350);
      return result.ok;
    },
    [refresh, toast],
  );

  const placeOrder = useCallback(
    (order: OrderRequest) => {
      if (risk?.isRealAccount) {
        const summary = `${order.direction === "buy" ? "KAUF" : "VERKAUF"} ${order.qty} ${status?.symbol ?? ""} ${order.type.toUpperCase()}`;
        if (!confirmed(`ECHTES KONTO ${risk.account ?? ""}\n\n${summary}\n\nWirklich senden?`)) return Promise.resolve(false);
      }
      return perform(api().placeOrder({ ...order, requestId: crypto.randomUUID().slice(0, 16) }), (r) =>
        `${r.direction} ${r.qty} ${r.type} gesendet${r.stopLoss ? ` · SL ${r.stopLoss}` : ""}${r.takeProfit ? ` · TP ${r.takeProfit}` : ""}`,
      );
    },
    [perform, risk, status],
  );

  return {
    placeOrder,
    cancelOrder: (id: string) => perform(api().cancelOrder(id), () => "Storno gesendet"),
    cancelAll: () => perform(api().cancelAll(), (r) => `${r.count} Order(s) storniert`),
    closePosition: () =>
      confirmed("Position mit einer Market-Order schließen?") ? perform(api().closePosition(), () => "Glattstellen gesendet") : Promise.resolve(false),
    // Engaging never asks: an emergency stop must act on the first click. Releasing it does ask.
    kill: (engage: boolean) =>
      engage || confirmed("Not-Aus freigeben? Danach sind neue Positionen wieder möglich.")
        ? perform(api().kill(engage), (r) =>
            r.engaged ? "Not-Aus aktiviert" : r.settingsKillSwitch ? "Frei – aber Kill-Switch in ATAS ist noch an" : "Not-Aus freigegeben",
          )
        : Promise.resolve(false),
  };
}
