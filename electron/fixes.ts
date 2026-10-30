// One-click fixes offered next to failing preflight checks.
import { spawn } from "node:child_process";
import { copyFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { shell } from "electron";
import { registerMcp, type FixId, type PreflightEnv } from "./preflight";

export function createFixes(env: PreflightEnv): Record<FixId, () => Promise<string> | string> {
  return {
    "open-atas-download": async () => {
      await shell.openExternal("https://atas.net/download/");
      return "Download-Seite geöffnet. Nach der Installation ATAS starten und erneut prüfen.";
    },
    "start-atas": () => {
      spawn(env.atasExe, { detached: true, stdio: "ignore" }).unref();
      return "ATAS wird gestartet. Danach die Bridge auf dem Chart starten.";
    },
    "install-bridge-dll": async () => {
      await mkdir(dirname(env.installedDll), { recursive: true });
      await copyFile(env.bundledDll, env.installedDll);
      return "Bridge kopiert. In ATAS unten rechts in der Statusleiste „Strategien neu laden“ klicken – die Bridge startet danach von selbst.";
    },
    "register-mcp": async () => {
      await registerMcp(env);
      return "Claude Code ist verbunden. Neue Claude-Sitzung starten, damit die Tools geladen werden.";
    },
    "open-claude-download": async () => {
      await shell.openExternal("https://claude.com/claude-code");
      return "Installationsseite von Claude Code geöffnet.";
    },
  };
}
