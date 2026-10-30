// Startup checks: is everything installed and running? Each check knows its own fix.
import { exec, execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import type { BridgeClient } from "../shared/bridge-client";

const run = promisify(execFile);
const runShell = promisify(exec);

export type CheckId = "atas-installed" | "atas-running" | "bridge-dll" | "bridge-active" | "account" | "claude-installed" | "mcp-registered";
export type CheckState = "ok" | "warn" | "error";
export type FixId = "open-atas-download" | "start-atas" | "install-bridge-dll" | "register-mcp" | "open-claude-download";

export interface CheckResult {
  id: CheckId;
  label: string;
  state: CheckState;
  detail: string;
  fix?: FixId;
  /** Blocking checks keep the user in the setup assistant instead of the dashboard. */
  blocking: boolean;
}

export interface PreflightEnv {
  atasExe: string;
  bundledDll: string;
  installedDll: string;
  mcpName: string;
  /** Command that starts the MCP server, as registered with Claude Code. */
  mcpCommand: { exe: string; args: string[] };
}

export const defaultAtasExe = String.raw`C:\Program Files (x86)\ATAS Platform\OFT.Platform.exe`;
export const installedDllPath = () => join(process.env.APPDATA ?? "", "ATAS", "Strategies", "ATAS.McpBridge.dll");

const sha256 = async (path: string) => createHash("sha256").update(await readFile(path)).digest("hex");
const exists = (path: string) => access(path).then(() => true, () => false);
export const quote = (arg: string) => (/^[\w.:\\/=@-]+$/u.test(arg) ? arg : `"${arg.replaceAll('"', String.raw`\"`)}"`);

async function isProcessRunning(imageName: string): Promise<boolean> {
  const { stdout } = await run("tasklist", ["/FI", `IMAGENAME eq ${imageName}`, "/NH"], { windowsHide: true });
  return stdout.toLowerCase().includes(imageName.toLowerCase());
}

/** Runs the Claude Code CLI through the shell, so both claude.exe and an npm claude.cmd are found. */
async function claude(args: string[]): Promise<string | null> {
  try {
    const { stdout } = await runShell(["claude", ...args].map((arg) => quote(arg)).join(" "), { windowsHide: true, timeout: 20_000 });
    return stdout;
  } catch {
    return null;
  }
}

async function checkBridgeDll(env: PreflightEnv): Promise<CheckResult> {
  const base = { id: "bridge-dll", label: "Bridge in ATAS installiert", fix: "install-bridge-dll", blocking: true } as const;
  if (!(await exists(env.installedDll))) return { ...base, state: "error", detail: "ATAS.McpBridge.dll fehlt im Strategien-Ordner." };
  const [installed, bundled] = await Promise.all([sha256(env.installedDll), sha256(env.bundledDll).catch(() => null)]);
  if (bundled && installed !== bundled) return { ...base, state: "warn", detail: "Installierte Bridge ist eine andere Version als die mitgelieferte." };
  return { ...base, state: "ok", detail: "Aktuelle Version installiert." };
}

async function checkBridge(client: BridgeClient): Promise<CheckResult[]> {
  const active = { id: "bridge-active", label: "Bridge aktiv (Strategie gestartet)", blocking: true } as const;
  const account = { id: "account", label: "Konto", blocking: false } as const;
  try {
    const [status, risk] = await Promise.all([client.read("status"), client.read("risk")]);
    const started = status.state === "Started";
    return [
      started
        ? { ...active, state: "ok", detail: `${status.symbol ?? "?"} · Port ${status.port}` }
        : { ...active, state: "error", detail: `Strategie ist „${status.state}“. Sie startet von selbst, sobald ATAS den Chart geladen hat – sonst auf dem Chart über „MCP Bridge“ fahren und Play klicken.` },
      risk.isRealAccount
        ? { ...account, state: "warn", detail: `${risk.account ?? "?"} ist ein ECHTES Konto.` }
        : { ...account, state: "ok", detail: `${risk.account ?? "?"} (Demo)` },
    ];
  } catch (error) {
    return [
      { ...active, state: "error", detail: error instanceof Error ? error.message : String(error) },
      { ...account, state: "warn", detail: "Unbekannt, solange die Bridge nicht erreichbar ist." },
    ];
  }
}

async function checkMcp(env: PreflightEnv): Promise<CheckResult[]> {
  const version = await claude(["--version"]);
  const installed: CheckResult = version
    ? { id: "claude-installed", label: "Claude Code installiert", state: "ok", detail: version.trim(), blocking: false }
    : { id: "claude-installed", label: "Claude Code installiert", state: "warn", detail: "Nicht gefunden. Für KI-Trading nötig, fürs Dashboard nicht.", fix: "open-claude-download", blocking: false };
  if (!version) return [installed];
  const listed = await claude(["mcp", "get", env.mcpName]);
  const registered: CheckResult = listed?.includes(env.mcpCommand.args.at(-1) ?? "\0")
    ? { id: "mcp-registered", label: "Claude ↔ ATAS verbunden (MCP)", state: "ok", detail: `MCP-Server „${env.mcpName}“ registriert.`, blocking: false }
    : { id: "mcp-registered", label: "Claude ↔ ATAS verbunden (MCP)", state: "warn", detail: "MCP-Server noch nicht (oder mit altem Pfad) registriert.", fix: "register-mcp", blocking: false };
  return [installed, registered];
}

export async function runPreflight(env: PreflightEnv, client: BridgeClient): Promise<CheckResult[]> {
  const atasInstalled = await exists(env.atasExe);
  const atasRunning = atasInstalled && (await isProcessRunning("OFT.Platform.exe"));
  const atas: CheckResult[] = [
    atasInstalled
      ? { id: "atas-installed", label: "ATAS Platform installiert", state: "ok", detail: env.atasExe, blocking: true }
      : { id: "atas-installed", label: "ATAS Platform installiert", state: "error", detail: "Klassisches ATAS (nicht ATAS X) wird benötigt.", fix: "open-atas-download", blocking: true },
    atasRunning
      ? { id: "atas-running", label: "ATAS läuft", state: "ok", detail: "OFT.Platform.exe aktiv", blocking: true }
      : { id: "atas-running", label: "ATAS läuft", state: "error", detail: "ATAS ist nicht gestartet.", fix: atasInstalled ? "start-atas" : undefined, blocking: true },
  ];
  const [dll, bridge, mcp] = await Promise.all([checkBridgeDll(env), atasRunning ? checkBridge(client) : Promise.resolve([]), checkMcp(env)]);
  return [...atas, dll, ...bridge, ...mcp];
}

/** Claude Code registration for the bundled MCP server (user scope: works in every folder). */
export async function registerMcp(env: PreflightEnv): Promise<void> {
  await claude(["mcp", "remove", env.mcpName, "-s", "user"]);
  const result = await claude(["mcp", "add", env.mcpName, "--scope", "user", "-e", "ELECTRON_RUN_AS_NODE=1", "--", env.mcpCommand.exe, ...env.mcpCommand.args]);
  if (result === null) throw new Error("claude mcp add ist fehlgeschlagen.");
}
