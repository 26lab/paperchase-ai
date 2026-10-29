// Persists the dashboard tile layout as JSON in the app's userData folder.
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { z } from "zod";

const layoutItem = z.object({
  i: z.string(),
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
  minW: z.number().optional(),
  minH: z.number().optional(),
});

export const savedLayoutSchema = z.object({
  version: z.literal(1),
  layouts: z.record(z.string(), z.array(layoutItem)),
  hidden: z.array(z.string()),
});

export type SavedLayout = z.infer<typeof savedLayoutSchema>;

/** Returns null when nothing is saved or the file is unreadable, so the UI falls back to defaults. */
export async function loadLayout(file: string): Promise<SavedLayout | null> {
  try {
    return savedLayoutSchema.parse(JSON.parse(await readFile(file, "utf8")));
  } catch {
    return null;
  }
}

export async function saveLayout(file: string, layout: unknown): Promise<void> {
  const valid = savedLayoutSchema.parse(layout);
  await mkdir(dirname(file), { recursive: true });
  // Write-then-rename so a crash mid-write never leaves a half-written layout.
  await writeFile(`${file}.tmp`, JSON.stringify(valid));
  await rename(`${file}.tmp`, file);
}
