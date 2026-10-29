import { join, normalize, relative } from "node:path";
import { pathToFileURL } from "node:url";
import { app, BrowserWindow, ipcMain, net, protocol, shell } from "electron";
import { BridgeClient } from "../shared/bridge-client";
import { IPC_CHANNEL, type IpcMethod } from "../shared/ipc";
import { createHandlers } from "./handlers";
import { defaultAtasExe, installedDllPath, type PreflightEnv } from "./preflight";
import { startAutoUpdate } from "./updater";

const DEV_URL = process.env.PAPERCHASE_DEV_URL;
const resourcesDir = app.isPackaged ? process.resourcesPath : join(app.getAppPath(), "resources");
const rendererDir = join(app.getAppPath(), "out");
// The MCP script is asar-unpacked so Claude Code can start it with ELECTRON_RUN_AS_NODE.
const mcpScript = join(app.getAppPath().replace("app.asar", "app.asar.unpacked"), "dist-electron", "mcp.mjs");

const env: PreflightEnv = {
  atasExe: defaultAtasExe,
  bundledDll: join(resourcesDir, "bridge", "ATAS.McpBridge.dll"),
  installedDll: installedDllPath(),
  mcpName: "paperchase",
  mcpCommand: { exe: process.execPath, args: [mcpScript] },
};
const handlers = createHandlers(env, new BridgeClient(), () => join(app.getPath("userData"), "layout.json"));

protocol.registerSchemesAsPrivileged([{ scheme: "app", privileges: { standard: true, secure: true, supportFetchAPI: true } }]);

/** Serves the static Next.js export; refuses paths outside out/. */
function serveRenderer(request: Request): Promise<Response> {
  const pathname = decodeURIComponent(new URL(request.url).pathname);
  const withIndex = pathname.endsWith("/") ? `${pathname}index.html` : pathname.includes(".") ? pathname : `${pathname}/index.html`;
  const file = normalize(join(rendererDir, withIndex));
  if (relative(rendererDir, file).startsWith("..")) return Promise.resolve(new Response("Forbidden", { status: 403 }));
  return net.fetch(pathToFileURL(file).toString()).catch(() => new Response("Not found", { status: 404 }));
}

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1480,
    height: 920,
    minWidth: 1100,
    minHeight: 700,
    show: false,
    backgroundColor: "#050d0b",
    titleBarStyle: "hidden",
    titleBarOverlay: { color: "#00000000", symbolColor: "#8aa79f", height: 56 },
    icon: join(resourcesDir, "icon.png"),
    webPreferences: { preload: join(__dirname, "preload.js"), contextIsolation: true, sandbox: true, nodeIntegration: false },
  });
  win.once("ready-to-show", () => win.show());
  // External links open in the browser; the app window never navigates away.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("https://")) void shell.openExternal(url);
    return { action: "deny" };
  });
  win.webContents.on("will-navigate", (event, url) => {
    if (!url.startsWith(DEV_URL ?? "app://")) event.preventDefault();
  });
  void win.loadURL(DEV_URL ?? "app://local/");
}

app.on("ready", () => {
  protocol.handle("app", serveRenderer);
  ipcMain.handle(IPC_CHANNEL, (_event, method: string, ...args: unknown[]) => {
    const handler = Object.hasOwn(handlers, method) ? handlers[method as IpcMethod] : undefined;
    return handler ? handler(...args) : { ok: false, error: `Unbekannte Aktion: ${method}` };
  });
  createWindow();
  startAutoUpdate();
});

app.on("window-all-closed", () => app.quit());
