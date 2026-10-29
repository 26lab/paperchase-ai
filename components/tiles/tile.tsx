import { GripVertical } from "lucide-react";
import type { ReactNode } from "react";

export const DRAG_HANDLE = "tile-drag-handle";

export function Tile({ title, actions, children }: { title: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <section
      aria-label={title}
      className="flex h-full flex-col overflow-hidden rounded-[var(--radius-tile)] border border-line bg-gradient-to-b from-panel-2/90 to-panel/90 shadow-[0_20px_60px_-30px_rgb(0_0_0/0.8)] backdrop-blur-md"
    >
      <header className="flex h-10 shrink-0 items-center gap-2 border-b border-line/70 pr-2 pl-1">
        <span className={`${DRAG_HANDLE} flex flex-1 cursor-grab items-center gap-1.5 self-stretch active:cursor-grabbing`} title="Ziehen zum Verschieben">
          <GripVertical className="size-4 text-dim" aria-hidden />
          <h2 className="font-display text-[11.5px] font-semibold tracking-[0.14em] text-muted uppercase">{title}</h2>
        </span>
        {actions}
      </header>
      <div className="scrollbar-thin min-h-0 flex-1 overflow-auto p-3">{children}</div>
    </section>
  );
}
