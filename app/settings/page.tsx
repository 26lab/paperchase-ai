"use client";

import { RotateCcw } from "lucide-react";
import { PageHeader, Panel } from "@/components/page-header";
import { Button, cx } from "@/components/ui";
import { UpdatePanel } from "@/components/update-panel";
import { useToast } from "@/lib/toast";
import { defaultLayout, TILES } from "@/lib/tiles";
import { useSavedLayout } from "@/lib/use-saved-layout";

export default function SettingsPage() {
  const { layout, update } = useSavedLayout();
  const toast = useToast();
  if (!layout) return null;

  const toggle = (id: string) =>
    update({ ...layout, hidden: layout.hidden.includes(id) ? layout.hidden.filter((h) => h !== id) : [...layout.hidden, id] });

  return (
    <div className="max-w-3xl">
      <PageHeader title="Einstellungen" />
      <Panel title="Dashboard-Kacheln">
        <p className="mb-3 text-sm text-muted">Auf dem Dashboard ziehst du Kacheln am Titel und änderst die Größe an der unteren rechten Ecke. Die Anordnung wird automatisch gespeichert.</p>
        <ul className="grid grid-cols-2 gap-2">
          {TILES.map((tile) => {
            const shown = !layout.hidden.includes(tile.id);
            return (
              <li key={tile.id}>
                <label className={cx("flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5", shown ? "border-up/30 bg-up/[0.05]" : "border-line")}>
                  <input type="checkbox" checked={shown} onChange={() => toggle(tile.id)} className="size-4 accent-[var(--color-up)]" />
                  <span className="font-semibold">{tile.title}</span>
                </label>
              </li>
            );
          })}
        </ul>
        <Button
          className="mt-4"
          onClick={() => {
            update(defaultLayout());
            toast("Layout zurückgesetzt");
          }}
        >
          <RotateCcw className="size-4" aria-hidden />
          Layout zurücksetzen
        </Button>
      </Panel>
      <div className="mt-4">
        <UpdatePanel />
      </div>
    </div>
  );
}
