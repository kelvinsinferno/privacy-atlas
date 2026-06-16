import { browser } from "wxt/browser";
import { getSettings, updateSettings } from "../../lib/storage";
import { C, FONT } from "../../styles";
import { BRAND_HEADER_HTML } from "../../brand";
import { ATLAS_URL } from "../../constants";
import type { ToastPayload } from "../../lib/types";

async function render() {
  const app = document.getElementById("app")!;
  const settings = await getSettings();
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  const tabId = tab?.id;
  const host = tab?.url ? new URL(tab.url).hostname : "";
  const muted = settings.perSiteMutes.includes(host);

  // Pull findings live from the content script (avoids flaky storage.session cache).
  let findings: ToastPayload[] = [];
  if (tabId !== undefined) {
    try {
      const res = await browser.tabs.sendMessage(tabId, { type: "getFindings" });
      if (Array.isArray(res)) findings = res as ToastPayload[];
    } catch { /* content script not present on this page (e.g. chrome://) — leave empty */ }
  }

  // Build the risk list HTML.
  const riskListHtml = findings.length === 0
    ? `<div style="color:${C.muted};font-size:12px;margin-top:4px;">No trackers detected on this page yet.</div>`
    : findings.map((f) => {
        const moveLinks = f.moves.map((m) =>
          `<div style="margin-top:3px;">
            <a href="${ATLAS_URL}/?node=${m.id}" target="_blank" rel="noopener"
               style="font-family:${FONT.mono};font-size:11px;color:${C.teal};text-decoration:none;">→ ${m.label}</a>
            <span style="font-family:${FONT.mono};font-size:10px;color:${C.muted3};margin-left:6px;">${f.mode === "adopt" ? "defend" : "you're equipped — use it"}</span>
          </div>`
        ).join("");
        return `<div style="margin-bottom:10px;">
          <div style="font-family:${FONT.mono};font-weight:700;color:${C.amber};font-size:12px;">${f.threatLabel}</div>
          ${moveLinks}
        </div>`;
      }).join("");

  app.innerHTML = `
    <div style="margin-bottom:10px;">${BRAND_HEADER_HTML}</div>
    <div style="color:${C.muted};line-height:1.5;margin-bottom:10px;font-size:12px;">Watching this page for trackers and naming the Atlas move that defends each. All on-device — nothing leaves your browser.</div>
    <div style="margin-bottom:8px;color:${C.muted};font-size:12px;">Site: <code style="font-family:${FONT.mono};color:${C.teal};">${host || "—"}</code> ${muted ? `<span style="color:${C.muted3};">(muted)</span>` : ""}</div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;">
      <button id="toggleMute" style="font-family:${FONT.mono};font-size:11px;background:${C.surface};border:1px solid ${C.border};color:${C.text};border-radius:20px;padding:6px 12px;cursor:pointer;">${muted ? "Unmute this site" : "Mute this site"}</button>
      <button id="toggleToasts" title="Show or hide on-page alert pop-ups (all sites). The toolbar badge still counts either way." style="font-family:${FONT.mono};font-size:11px;background:${C.surface};border:1px solid ${C.border};color:${settings.toastsEnabled ? C.text : C.amber};border-radius:20px;padding:6px 12px;cursor:pointer;">${settings.toastsEnabled ? "Turn off pop-ups" : "Turn on pop-ups"}</button>
    </div>
    <div style="margin-top:14px;margin-bottom:4px;font-family:${FONT.mono};font-size:11px;color:${C.muted2};text-transform:uppercase;letter-spacing:.6px;">Risks on this page</div>
    <div style="border-top:1px solid ${C.border};padding-top:10px;">
      ${riskListHtml}
    </div>
    <a href="${ATLAS_URL}" target="_blank" rel="noopener" style="display:block;margin-top:12px;font-family:${FONT.mono};font-size:11px;color:${C.teal};">Open Privacy Atlas →</a>`;

  document.getElementById("toggleMute")!.addEventListener("click", async () => {
    await updateSettings((s) => {
      s.perSiteMutes = s.perSiteMutes.includes(host)
        ? s.perSiteMutes.filter((h) => h !== host)
        : [...s.perSiteMutes, host];
    });
    // Clear visible toasts on the page when muting (no-op if content script isn't present).
    if (tabId !== undefined) {
      browser.tabs.sendMessage(tabId, { type: "clearToasts" }).catch(() => {});
    }
    void render();
  });

  document.getElementById("toggleToasts")!.addEventListener("click", async () => {
    const turningOff = settings.toastsEnabled; // captured pre-flip: true → we're switching alerts off
    await updateSettings((s) => { s.toastsEnabled = !s.toastsEnabled; });
    // Clear any pop-ups already on the page when switching off (no-op if no content script).
    if (turningOff && tabId !== undefined) {
      browser.tabs.sendMessage(tabId, { type: "clearToasts" }).catch(() => {});
    }
    void render();
  });
}
void render();
