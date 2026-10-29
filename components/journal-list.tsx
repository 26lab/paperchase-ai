import { Bot, MousePointerClick, Radar } from "lucide-react";
import { time } from "@/lib/format";
import type { JournalEntry } from "@/shared/ipc";
import { cx, Empty } from "./ui";

export function JournalList({ entries, limit }: { entries: JournalEntry[]; limit?: number }) {
  if (entries.length === 0) return <Empty>Noch keine Aktivität. Aktionen von Claude und aus der App erscheinen hier.</Empty>;
  return (
    <ol className="flex flex-col gap-1">
      {entries.slice(0, limit).map((e) => (
        <li key={`${e.time}${e.action}${e.detail}`} className="flex items-start gap-2.5 rounded-lg px-2 py-1.5 text-sm hover:bg-white/[0.03]">
          {e.source === "claude" && <Bot className="mt-0.5 size-4 shrink-0 text-up" aria-label="Claude" />}
          {e.source === "bot" && <Radar className="mt-0.5 size-4 shrink-0 text-amber" aria-label="Bot" />}
          {e.source === "app" && <MousePointerClick className="mt-0.5 size-4 shrink-0 text-muted" aria-label="App" />}
          <span className="tabular shrink-0 text-xs leading-5 text-dim">{time(e.time)}</span>
          <span className={cx("shrink-0 font-semibold", !e.ok && "text-down")}>{e.action}</span>
          <span className="min-w-0 break-words text-muted">{e.detail}</span>
        </li>
      ))}
    </ol>
  );
}
