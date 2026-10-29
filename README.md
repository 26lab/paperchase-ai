# PaperChase AI

Desktop-Cockpit (Electron + Next.js) für ATAS mit Claude-Anbindung. Jede Order – aus der App oder von Claude –
läuft durch die Sicherheitsregeln der **MCP Bridge** in ATAS.

```
PaperChase AI.exe
├─ main (Electron)     Fenster, app://-Protokoll, IPC, System-Check, Layout-Speicher
├─ renderer (Next 16)  statischer Export: Dashboard-Kacheln, Seiten, WebGL-Hintergrund
└─ mcp.mjs             MCP-Server für Claude Code (läuft mit ELECTRON_RUN_AS_NODE=1, kein Python nötig)
         │ HTTP 127.0.0.1:8787 + Token
ATAS ── MCP Bridge (C#-Strategie, ../atas-mcp) ── Sicherheitsregeln
```

## Voraussetzungen

| Für | Was |
|---|---|
| Nutzen | Windows 10/11 · klassisches **ATAS Platform** (nicht ATAS X „Start“) · optional Claude Code |
| Entwickeln | zusätzlich Node 22+ · .NET 10 SDK (nur um die Bridge neu zu bauen) |

## Installation (Nutzer)

`release\PaperChase AI Setup 1.0.0.exe` ausführen (pro Benutzer, keine Admin-Rechte). Beim Start prüft die App:

| Check | Fix per Klick |
|---|---|
| ATAS installiert / läuft | Download-Seite öffnen / ATAS starten |
| Bridge-DLL installiert & aktuell | mitgelieferte DLL nach `%APPDATA%\ATAS\Strategies` kopieren |
| Bridge aktiv, Konto Demo/Live | Anleitung (Strategie auf dem Chart starten) |
| Claude Code installiert | Installationsseite öffnen |
| MCP-Server registriert | `claude mcp add paperchase …` (User-Scope) |

Rote Checks zeigen einen Setup-Assistenten statt des Dashboards. Deinstallation entfernt MCP-Registrierung und Bridge-DLL.

## Entwicklung

```bash
npm install
npm run dev        # Next dev + esbuild watch + Electron
npm run check      # oxlint (hartes Preset) + tsc + vitest
npm run dist       # check + build + NSIS-Installer nach release/
```

Bridge neu bauen: `..\atas-mcp\build-deploy.ps1`, dann `ATAS.McpBridge.dll` nach `resources/bridge/` kopieren.

```bash
npm run backtest   # EMA 9/21-Strategie über die Kerzen, die die Bridge gerade hält
```

## Releases & Auto-Update

Die App prüft beim Start GitHub Releases von **26lab/paperchase-ai**, lädt Updates im Hintergrund und installiert
beim nächsten Neustart (oder per Klick in Einstellungen / Banner). Updates behalten Bridge-DLL und Claude-Registrierung.

1. Repo `26lab/paperchase-ai` auf GitHub anlegen (privat geht, dann braucht die App zum Lesen ebenfalls ein Token – öffentlich ist einfacher).
2. `version` in `package.json` erhöhen.
3. GitHub-Token mit `repo`-Rechten setzen und veröffentlichen:
   ```powershell
   $env:GH_TOKEN = "<token>"
   npm run release
   ```

## Code-Signing

Aktuell unsigniert (SmartScreen: „Weitere Informationen → Trotzdem ausführen“). electron-builder signiert automatisch,
sobald `CSC_LINK` (Pfad/Base64 der .pfx) und `CSC_KEY_PASSWORD` gesetzt sind – oder `win.azureSignOptions` für Azure Trusted Signing.

## Aufbau

| Ordner | Inhalt |
|---|---|
| `app/` | Seiten: Dashboard, Orders & Historie, Claude, Sicherheit, System-Check, Einstellungen |
| `components/` | Shell (Sidebar/Topbar), Kacheln, Formular-Bausteine |
| `lib/` | Poll-Stores (`useSyncExternalStore`), Aktionen, Layout, WebGL-Shader |
| `electron/` | Main-Prozess, IPC-Handler (zod-validiert), Preflight + Fixes, Layout-Speicher |
| `mcp/` | MCP-Server (14 Tools `atas_*`, Aktionen werden ins Journal geschrieben) |
| `shared/` | Bridge-Client, Typen, Journal, IPC-Vertrag |

Daten: Layout `%APPDATA%\PaperChase AI\layout.json`, Journal `%APPDATA%\PaperChase AI\journal.jsonl`.

## Lint

oxlint mit `correctness`, `suspicious`, `perf`, `pedantic` = error und `--deny-warnings`.
Bewusst aus: `react/react-in-jsx-scope` (veraltet seit dem automatischen JSX-Runtime von React 17).
