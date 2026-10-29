// One decision per cycle: a single structured-output call to Claude.
import Anthropic, { APIError } from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { decisionSchema, type Decision } from "../../shared/bot-types";
import { SYSTEM_PROMPT } from "./prompt";

export const BOT_MODEL = "claude-opus-5-5";
// Claude Opus 5.5 list prices per token (input, output, cache read).
const PRICE = { input: 4 / 1e6, output: 20 / 1e6, cacheRead: 0.2 / 1e6, cacheWrite: 5 / 1e6 };

export interface DecisionResult {
  decision: Decision;
  costUsd: number;
}

export const HOLD = (reasoning: string): Decision => ({
  action: "hold",
  reasoning,
  confidence: 0,
  direction: null,
  quantity: null,
  stop_loss_ticks: null,
  take_profit_ticks: null,
});

export async function decide(apiKey: string, userMessage: string): Promise<DecisionResult> {
  const client = new Anthropic({ apiKey, timeout: 120_000 });
  const request = client.messages.parse({
    model: BOT_MODEL,
    max_tokens: 16_000,
    // The system prompt never changes, so its prefix is served from cache after the first call.
    system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: userMessage }],
    output_config: { effort: "medium", format: zodOutputFormat(decisionSchema) },
  });
  // API errors (auth, rate limit, network) propagate to the bot's error handling; anything else is
  // the SDK's client-side schema check failing (e.g. a stop outside 4-400 ticks) and becomes a hold.
  const response = await request.catch((error: unknown) => {
    if (error instanceof APIError) throw error;
    return null;
  });
  if (!response) return { decision: HOLD("Antwort von Claude lag außerhalb der erlaubten Werte – keine Aktion."), costUsd: 0 };
  const u = response.usage;
  const costUsd =
    u.input_tokens * PRICE.input +
    u.output_tokens * PRICE.output +
    (u.cache_read_input_tokens ?? 0) * PRICE.cacheRead +
    (u.cache_creation_input_tokens ?? 0) * PRICE.cacheWrite;

  // A refusal or an unparseable answer must never turn into an order.
  if (response.stop_reason === "refusal") return { decision: HOLD("Claude hat die Anfrage abgelehnt – keine Aktion."), costUsd };
  if (!response.parsed_output) return { decision: HOLD("Antwort von Claude war nicht auswertbar – keine Aktion."), costUsd };
  return { decision: response.parsed_output, costUsd };
}
