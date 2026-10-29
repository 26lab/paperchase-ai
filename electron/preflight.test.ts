import { describe, expect, it } from "vitest";
import { quote } from "./preflight";

describe("quote (shell arguments for the claude CLI)", () => {
  it("leaves plain arguments alone", () => {
    expect(quote("mcp")).toBe("mcp");
    expect(quote("ELECTRON_RUN_AS_NODE=1")).toBe("ELECTRON_RUN_AS_NODE=1");
  });

  it("wraps paths with spaces and escapes quotes", () => {
    expect(quote(String.raw`C:\Program Files\PaperChase AI\PaperChase AI.exe`)).toBe(String.raw`"C:\Program Files\PaperChase AI\PaperChase AI.exe"`);
    expect(quote('a"b')).toBe(String.raw`"a\"b"`);
  });

  it("quotes shell metacharacters so they cannot chain commands", () => {
    expect(quote("x & del *")).toBe('"x & del *"');
  });
});
