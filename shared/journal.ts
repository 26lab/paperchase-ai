// Activity journal shared by the MCP server (writes) and the app (reads): one JSON object per line.
import { appendFile, mkdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";

export interface JournalEntry {
  time: string;
  source: "claude" | "app";
  action: string;
  detail: string;
  ok: boolean;
}

// Same folder Electron uses as userData for productName "PaperChase AI".
export const journalPath = () => join(process.env.APPDATA ?? "", "PaperChase AI", "journal.jsonl");

export async function appendJournal(entry: Omit<JournalEntry, "time">): Promise<void> {
  const file = journalPath();
  await mkdir(dirname(file), { recursive: true });
  await appendFile(file, `${JSON.stringify({ time: new Date().toISOString(), ...entry })}\n`);
}

export async function readJournal(limit = 200): Promise<JournalEntry[]> {
  const text = await readFile(journalPath(), "utf8").catch(() => "");
  return text
    .split("\n")
    .filter(Boolean)
    .slice(-limit)
    .flatMap((line) => {
      try {
        return [JSON.parse(line) as JournalEntry];
      } catch {
        // A torn last line from a concurrent write is skipped, not fatal.
        return [];
      }
    })
    .toReversed();
}
