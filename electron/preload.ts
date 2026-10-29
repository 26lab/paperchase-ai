import { contextBridge, ipcRenderer } from "electron";
import { IPC_CHANNEL, type IpcMethod, type PaperChaseApi } from "../shared/ipc";

const methods: IpcMethod[] = [
  "read", "placeOrder", "cancelOrder", "cancelAll", "closePosition", "kill",
  "preflight", "fix", "loadLayout", "saveLayout", "journal", "mcpCommand",
  "updateState", "checkForUpdates", "installUpdate",
  "botState", "botStart", "botStop", "botSaveConfig", "botSetApiKey", "botDeleteApiKey",
];

const api = Object.fromEntries(
  methods.map((method) => [method, (...args: unknown[]) => ipcRenderer.invoke(IPC_CHANNEL, method, ...args)]),
) as unknown as PaperChaseApi;

contextBridge.exposeInMainWorld("paperchase", api);
