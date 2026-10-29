import { z } from "zod";
import type { Result } from "../../shared/ipc";
import type { TradingBot } from "./bot";
import { deleteApiKey, saveApiKey } from "./secrets";

export type { TradingBot };
type Wrap = <T>(fn: () => Promise<T> | T) => Promise<Result<T>>;

export function botHandlers(bot: TradingBot, wrap: Wrap) {
  return {
    botState: () => wrap(() => bot.getState()),
    botStart: () => wrap(() => bot.start()),
    botStop: () => wrap(() => bot.stop()),
    botSaveConfig: (config: unknown) => wrap(() => bot.saveConfig(config)),
    botSetApiKey: (key: unknown) =>
      wrap(async () => {
        await saveApiKey(z.string().max(300).parse(key));
        await bot.refreshKeyState();
        return bot.getState();
      }),
    botDeleteApiKey: () =>
      wrap(async () => {
        if (bot.getState().running) await bot.stop("API-Schlüssel entfernt");
        await deleteApiKey();
        await bot.refreshKeyState();
        return bot.getState();
      }),
  };
}
