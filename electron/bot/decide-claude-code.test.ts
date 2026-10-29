import { describe, expect, it } from "vitest";
import { decisionSchema } from "../../shared/bot-types";
import { jsonFromText } from "./decide-claude-code";

describe("jsonFromText (older Claude Code CLIs answer with fenced JSON text)", () => {
  it("extracts a fenced decision and adds a neutral confidence when missing", () => {
    const text = '```json\n{"action":"hold","direction":null,"quantity":null,"stop_loss_ticks":null,"take_profit_ticks":null,"reasoning":"kein Setup"}\n```';
    const parsed = decisionSchema.safeParse(jsonFromText(text));
    expect(parsed.success).toBe(true);
    expect(parsed.data?.confidence).toBe(0.5);
  });

  it("keeps a confidence the model gave", () => {
    expect(jsonFromText('{"action":"hold","confidence":0.9}')).toMatchObject({ confidence: 0.9 });
  });

  it("returns null for text without valid JSON, so the bot holds", () => {
    expect(jsonFromText("Ich würde abwarten.")).toBeNull();
    expect(jsonFromText("{kaputt")).toBeNull();
  });

  it("still rejects decisions outside the schema", () => {
    const text = '{"action":"open","direction":"buy","quantity":1,"stop_loss_ticks":9999,"take_profit_ticks":null,"reasoning":"x"}';
    expect(decisionSchema.safeParse(jsonFromText(text)).success).toBe(false);
  });
});
