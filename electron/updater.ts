// Auto-update from GitHub Releases (26lab/paperchase-ai). Downloads in the background,
// installs on the next quit or when the user clicks "Neu starten".
import { app } from "electron";
import { autoUpdater } from "electron-updater";

export interface UpdateState {
  status: "dev" | "idle" | "checking" | "downloading" | "ready" | "current" | "error";
  version: string;
  available?: string;
  message?: string;
}

let state: UpdateState = { status: app.isPackaged ? "idle" : "dev", version: app.getVersion() };
const set = (patch: Partial<UpdateState>) => {
  state = { ...state, ...patch };
};

export const updateState = () => state;

export function startAutoUpdate(): void {
  if (!app.isPackaged) return;
  // The default logger dumps whole HTTP responses (incl. cookies); state + UI are enough.
  autoUpdater.logger = null;
  autoUpdater.on("checking-for-update", () => set({ status: "checking", message: undefined }));
  autoUpdater.on("update-available", (info) => set({ status: "downloading", available: info.version }));
  autoUpdater.on("update-not-available", () => set({ status: "current" }));
  autoUpdater.on("update-downloaded", (info) => set({ status: "ready", available: info.version }));
  autoUpdater.on("error", (error) =>
    set({
      status: "error",
      // A 404 means the release feed does not exist yet – not a broken app.
      message: error.message.includes("404") ? "Noch kein Release auf GitHub (26lab/paperchase-ai) veröffentlicht." : error.message,
    }),
  );
  void checkForUpdates();
}

export async function checkForUpdates(): Promise<UpdateState> {
  if (!app.isPackaged) return state;
  // Errors (offline, no release yet) land in state via the "error" event.
  await autoUpdater.checkForUpdates().catch(() => null);
  return state;
}

export function installUpdate(): void {
  if (state.status === "ready") autoUpdater.quitAndInstall();
}
