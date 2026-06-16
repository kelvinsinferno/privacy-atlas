import { browser } from "wxt/browser";
import leakMapJson from "../data/leak-map.json";
import graphJson from "../data/graph-subset.json";
import radarJson from "../data/tracker-radar.min.json";
import { ATLAS_URL, LEAK_CLASSES } from "../constants";
import { classify } from "../lib/classifier";
import { decide } from "../lib/alert-engine";
import { getSettings, getDoneMoveIds, recordDismissal, muteSite, recordFieldDismissal, fieldMuteSite } from "../lib/storage";
import fieldMapJson from "../data/field-map.json";
import { fieldSuggestion } from "../lib/field-suggest";
import type { LeakMap, GraphSubset, TrackerRadar, LeakClass } from "../lib/types";
import type { FieldMap } from "../lib/field-types";
import type { LensMessage } from "../lib/messages";

const leakMap = leakMapJson as LeakMap;
const graph = graphJson as GraphSubset;
const radar = radarJson as TrackerRadar;
const fieldMap = fieldMapJson as FieldMap;

function isLeakClass(v: string): v is LeakClass {
  return (LEAK_CLASSES as readonly string[]).includes(v);
}

export default defineBackground(() => {
  browser.runtime.onMessage.addListener(async (msg: LensMessage, sender) => {
    if (msg.type === "analyze") {
      const hits = classify(msg.signals, leakMap, radar);
      const [settings, doneMoveIds] = await Promise.all([getSettings(), getDoneMoveIds()]);
      const result = decide({ hits, doneMoveIds, settings, currentHost: msg.host, graph, atlasUrl: ATLAS_URL });
      const tabId = sender.tab?.id;
      if (tabId !== undefined) {
        await browser.action.setBadgeText({ tabId, text: result.badge ? String(result.badge) : "" });
        await browser.action.setBadgeBackgroundColor({ tabId, color: "#b0846a" });
      }
      return result;
    }
    if (msg.type === "dismiss") {
      if (isLeakClass(msg.leakClass)) await recordDismissal(msg.leakClass);
      return { ok: true };
    }
    if (msg.type === "muteSite") { await muteSite(msg.host); return { ok: true }; }
    if (msg.type === "fieldSuggest") {
      const [settings, doneMoveIds] = await Promise.all([getSettings(), getDoneMoveIds()]);
      return fieldSuggestion({
        context: msg.context,
        doneMoveIds,
        settings,
        currentHost: msg.host,
        graph,
        fieldMap,
        atlasUrl: ATLAS_URL,
      });
    }
    if (msg.type === "fieldDismiss") { await recordFieldDismissal(msg.context); return { ok: true }; }
    if (msg.type === "fieldMuteSite") { await fieldMuteSite(msg.host); return { ok: true }; }
    return; // no response for unrecognized message types
  });
});
