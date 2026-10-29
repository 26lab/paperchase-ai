import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ZodError } from "zod";
import { loadLayout, saveLayout } from "./layout-store";

const sample = { version: 1 as const, layouts: { lg: [{ i: "chart", x: 0, y: 0, w: 8, h: 6 }] }, hidden: ["log"] };

describe("layout store", () => {
  it("round-trips a layout", async () => {
    const file = join(await mkdtemp(join(tmpdir(), "pc-")), "layout.json");
    await saveLayout(file, sample);
    await expect(loadLayout(file)).resolves.toEqual(sample);
  });

  it("returns null for missing or corrupt files instead of crashing", async () => {
    const dir = await mkdtemp(join(tmpdir(), "pc-"));
    await expect(loadLayout(join(dir, "nope.json"))).resolves.toBeNull();
    await writeFile(join(dir, "bad.json"), "{not json");
    await expect(loadLayout(join(dir, "bad.json"))).resolves.toBeNull();
  });

  it("rejects malformed layouts from the renderer", async () => {
    const file = join(await mkdtemp(join(tmpdir(), "pc-")), "layout.json");
    await expect(saveLayout(file, { version: 1, layouts: { lg: [{ i: "x" }] }, hidden: [] })).rejects.toThrow(ZodError);
  });
});
