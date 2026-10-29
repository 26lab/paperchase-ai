// The Anthropic API key, encrypted with Windows DPAPI (Electron safeStorage). Never sent to the renderer.
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { app, safeStorage } from "electron";

const keyFile = () => join(app.getPath("userData"), "anthropic.key");

export async function saveApiKey(key: string): Promise<void> {
  const trimmed = key.trim();
  if (!/^sk-ant-[\w-]{20,}$/u.test(trimmed)) throw new Error("Das sieht nicht nach einem Anthropic-API-Schlüssel aus (sk-ant-…).");
  if (!safeStorage.isEncryptionAvailable()) throw new Error("Windows-Verschlüsselung ist nicht verfügbar – Schlüssel wird nicht gespeichert.");
  await mkdir(dirname(keyFile()), { recursive: true });
  await writeFile(keyFile(), safeStorage.encryptString(trimmed));
}

export async function loadApiKey(): Promise<string | null> {
  try {
    return safeStorage.decryptString(await readFile(keyFile()));
  } catch {
    return null;
  }
}

export const deleteApiKey = () => rm(keyFile(), { force: true });
