// While the bot runs, closing the window hides it to the tray instead of quitting.
import { app, Menu, Tray, type BrowserWindow } from "electron";
import type { TradingBot } from "./bot/bot";

let quitting = false;

export function keepRunningInTray(win: BrowserWindow, bot: TradingBot, iconPath: string): void {
  const tray = new Tray(iconPath);
  const show = () => {
    win.show();
    win.focus();
  };
  const refreshMenu = () => {
    const running = bot.getState().running;
    tray.setToolTip(running ? "PaperChase AI – Bot läuft" : "PaperChase AI");
    tray.setContextMenu(
      Menu.buildFromTemplate([
        { label: "PaperChase AI öffnen", click: show },
        { label: running ? "Bot stoppen" : "Bot läuft nicht", enabled: running, click: () => void bot.stop("über Tray gestoppt").then(refreshMenu) },
        { type: "separator" },
        { label: "Beenden", click: () => app.quit() },
      ]),
    );
  };
  refreshMenu();
  tray.on("click", show);
  tray.on("right-click", refreshMenu);

  app.on("before-quit", () => {
    quitting = true;
  });
  win.on("close", (event) => {
    if (quitting || !bot.getState().running) return;
    event.preventDefault();
    win.hide();
    refreshMenu();
    tray.displayBalloon({ title: "Bot läuft weiter", content: "PaperChase AI ist im Infobereich. Rechtsklick auf das Symbol zum Stoppen oder Beenden.", iconType: "info" });
  });
}
