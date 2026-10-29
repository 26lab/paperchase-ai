// Routes one decision to the configured engine: Anthropic API key or the Claude Code CLI (subscription).
import type { Engine } from "../../shared/bot-types";
import { decide, type DecisionResult } from "./decide";
import { decideWithClaudeCode, findClaudeExe } from "./decide-claude-code";
import { loadApiKey } from "./secrets";
import { StartRefused } from "./start-refused";

/** Throws when the engine cannot run at all, before the bot starts. */
export async function ensureEngineReady(engine: Engine): Promise<void> {
  if (engine === "claude-code") await findClaudeExe();
  else if (!(await loadApiKey())) throw new StartRefused("Kein Anthropic-API-Schlüssel hinterlegt.");
}

export async function askClaude(engine: Engine, message: string): Promise<DecisionResult> {
  if (engine === "claude-code") return decideWithClaudeCode(message);
  const apiKey = await loadApiKey();
  if (!apiKey) throw new Error("API-Schlüssel fehlt.");
  return decide(apiKey, message);
}
