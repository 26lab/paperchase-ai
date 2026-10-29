// Engine "claude-code": one decision through the installed Claude Code CLI (the user's subscription).
// Locked down: no tools, no MCP servers (the paperchase server could otherwise trade on its own),
// no settings/hooks/CLAUDE.md, no saved session. Only the JSON decision comes back.
import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";
import { z } from "zod";
import { decisionSchema } from "../../shared/bot-types";
import { HOLD, type DecisionResult } from "./decide";
import { SYSTEM_PROMPT } from "./prompt";

const TIMEOUT_MS = 180_000;
// The CLI's validator cannot resolve zod's draft 2020-12 "$schema" URL, so it is left out.
const { $schema: _dialect, ...decisionJsonSchema } = z.toJSONSchema(decisionSchema);
const DECISION_JSON_SCHEMA = JSON.stringify(decisionJsonSchema);

const cliResultSchema = z.object({
  is_error: z.boolean(),
  result: z.string().optional(),
  structured_output: z.unknown().optional(),
  total_cost_usd: z.number().optional(),
});

let cachedExe: string | undefined;

/**
 * Older CLI versions ignore --json-schema and answer with the JSON as (fenced) text.
 * The result still goes through decisionSchema; only a missing confidence or levels list gets a neutral default.
 */
export function jsonFromText(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    const value: unknown = JSON.parse(text.slice(start, end + 1));
    return typeof value === "object" && value !== null ? { confidence: 0.5, levels: [], ...value } : null;
  } catch {
    return null;
  }
}

/** claude.exe from PATH; spawned without a shell so the JSON arguments need no quoting. */
export async function findClaudeExe(): Promise<string> {
  if (cachedExe) return cachedExe;
  const { stdout } = await promisify(execFile)("where.exe", ["claude"], { windowsHide: true }).catch(() => ({ stdout: "" }));
  const exe = stdout.split(/\r?\n/u).find((line) => line.toLowerCase().endsWith(".exe"));
  if (!exe) throw new Error("Claude Code (claude.exe) nicht gefunden – installieren oder Engine „API“ wählen.");
  cachedExe = exe;
  return exe;
}

function run(exe: string, args: string[], input: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(exe, args, { windowsHide: true });
    let out = "";
    let err = "";
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error("Claude Code hat nicht innerhalb von 3 Minuten geantwortet."));
    }, TIMEOUT_MS);
    child.stdout.on("data", (chunk: Buffer) => (out += chunk.toString()));
    child.stderr.on("data", (chunk: Buffer) => (err += chunk.toString()));
    child.on("error", reject);
    child.on("close", () => {
      clearTimeout(timer);
      if (out.trim()) resolve(out);
      else reject(new Error(`Claude Code ohne Antwort: ${err.trim().slice(0, 300) || "unbekannter Fehler"}`));
    });
    child.stdin.end(input);
  });
}

export async function decideWithClaudeCode(userMessage: string): Promise<DecisionResult & { raw: unknown }> {
  const exe = await findClaudeExe();
  const args = [
    "-p", "--output-format", "json", "--json-schema", DECISION_JSON_SCHEMA,
    "--system-prompt", SYSTEM_PROMPT,
    "--tools", "", "--strict-mcp-config", "--mcp-config", '{"mcpServers":{}}',
    "--setting-sources", "", "--no-session-persistence", "--model", "opus",
  ];
  const text = await run(exe, args, userMessage);
  const raw = cliResultSchema.parse(JSON.parse(text));
  // Errors (expired login, usage limit) are bot errors; the message tells the user what to fix.
  if (raw.is_error) throw new Error(`Claude Code: ${raw.result ?? "Fehler"}`);
  const costUsd = raw.total_cost_usd ?? 0;
  const parsed = decisionSchema.safeParse(raw.structured_output ?? jsonFromText(raw.result ?? ""));
  // An answer outside the schema must never turn into an order.
  const decision = parsed.success ? parsed.data : HOLD("Antwort von Claude Code war nicht auswertbar – keine Aktion.");
  return { decision, costUsd, raw: JSON.parse(text) };
}
