import { browser } from "wxt/browser";
import { defaultSettings } from "./alert-engine";
import type { FieldContext } from "./field-types";
import type { LeakClass, Settings } from "./types";

export async function getSettings(): Promise<Settings> {
  const { settings } = await browser.storage.local.get("settings");
  return settings ? { ...defaultSettings(), ...settings } : defaultSettings();
}

export async function setSettings(settings: Settings): Promise<void> {
  await browser.storage.local.set({ settings });
}

let writeChain: Promise<void> = Promise.resolve();

/** Serialized read-modify-write for settings. All mutations queue through one chain,
 *  so concurrent writers (popup, options, background) can't clobber each other. */
export function updateSettings(mutate: (s: Settings) => void): Promise<void> {
  writeChain = writeChain.then(async () => {
    const s = await getSettings();
    mutate(s);
    await setSettings(s);
  });
  return writeChain;
}

export async function recordDismissal(leakClass: LeakClass): Promise<void> {
  await updateSettings((s) => {
    s.dismissals[leakClass] = (s.dismissals[leakClass] ?? 0) + 1;
  });
}

export async function muteSite(host: string): Promise<void> {
  await updateSettings((s) => {
    if (!s.perSiteMutes.includes(host)) s.perSiteMutes.push(host);
  });
}

export async function getDoneMoveIds(): Promise<Set<string>> {
  const { mirroredProgress } = await browser.storage.local.get("mirroredProgress");
  return new Set<string>(Array.isArray(mirroredProgress) ? mirroredProgress : []);
}

export async function recordFieldDismissal(context: FieldContext): Promise<void> {
  await updateSettings((s) => {
    s.fieldDismissals[context] = (s.fieldDismissals[context] ?? 0) + 1;
  });
}

export async function fieldMuteSite(host: string): Promise<void> {
  await updateSettings((s) => {
    if (!s.fieldMutedSites.includes(host)) s.fieldMutedSites.push(host);
  });
}
