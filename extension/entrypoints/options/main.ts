import { LEAK_CLASSES } from "../../constants";
import { getSettings, updateSettings } from "../../lib/storage";
import { C, FONT } from "../../styles";
import { BRAND_HEADER_HTML } from "../../brand";
import { FIELD_CONTEXTS } from "../../lib/field-types";

async function render() {
  const app = document.getElementById("app")!;
  const s = await getSettings();
  app.innerHTML = `
    <div style="margin-bottom:6px;">${BRAND_HEADER_HTML}</div>
    <div style="font-family:${FONT.mono};font-size:11px;letter-spacing:1.1px;text-transform:uppercase;color:${C.muted2};margin-bottom:14px;">Settings</div>
    <p style="color:${C.muted};line-height:1.6;">All detection runs on your device. The lens never sends URLs or page content anywhere, keeps no history of the sites you visit, and only opens a page when you click "open in Atlas". <a href="https://github.com/kelvinsinferno/privacy-atlas" target="_blank" rel="noopener" style="color:${C.teal};">Source</a>.</p>
    <h2 style="font-family:${FONT.mono};font-size:11px;letter-spacing:1.1px;text-transform:uppercase;color:${C.muted2};margin-top:20px;">On-page alerts</h2>
    <label style="display:block;margin:6px 0;color:${C.text};"><input type="checkbox" id="toastToggle" ${s.toastsEnabled ? "checked" : ""}/> Show alert pop-ups on the page</label>
    <p style="color:${C.muted2};font-family:${FONT.mono};font-size:11px;line-height:1.5;margin:2px 0 0;">When off, nothing pops up on pages — the toolbar badge still counts what's detected, and you can open the popup to see it.</p>
    <h2 style="font-family:${FONT.mono};font-size:11px;letter-spacing:1.1px;text-transform:uppercase;color:${C.muted2};margin-top:20px;">Alert types</h2>
    ${LEAK_CLASSES.map((lc) => {
      const quieted = (s.dismissals[lc] ?? 0) >= 3;
      const quietedNote = quieted
        ? ` <span style="color:${C.muted2};font-family:${FONT.mono};font-size:11px;"> — quieted</span> <button data-resume="${lc}" style="background:none;border:0;color:${C.muted3};cursor:pointer;font-family:${FONT.mono};font-size:11px;">resume</button>`
        : "";
      return `<label style="display:block;margin:6px 0;color:${C.text};"><input type="checkbox" data-type="${lc}" ${s.perTypeEnabled[lc] ? "checked" : ""}/> ${lc}${quietedNote}</label>`;
    }).join("")}
    <h2 style="font-family:${FONT.mono};font-size:11px;letter-spacing:1.1px;text-transform:uppercase;color:${C.muted2};margin-top:20px;">Muted sites</h2>
    <div id="mutes">${s.perSiteMutes.length ? s.perSiteMutes.map((h) => `<div style="color:${C.text};margin:4px 0;font-family:${FONT.mono};font-size:12.5px;">${h} <button data-unmute="${h}" style="background:none;border:0;color:${C.muted3};cursor:pointer;font:inherit;">remove</button></div>`).join("") : `<div style="color:${C.muted2};">none</div>`}</div>
    <h2 style="font-family:${FONT.mono};font-size:11px;letter-spacing:1.1px;text-transform:uppercase;color:${C.muted2};margin-top:20px;">Field suggestions</h2>
    <label style="display:block;margin:6px 0;color:${C.text};"><input type="checkbox" id="fieldToggle" ${s.fieldSuggestionsEnabled ? "checked" : ""}/> Suggest a move when I focus an email / card / phone / address field</label>
    ${FIELD_CONTEXTS.map((fc) => ((s.fieldDismissals[fc] ?? 0) >= 3 ? `<div style="color:${C.text};margin:4px 0;font-family:${FONT.mono};font-size:12.5px;">${fc} <span style="color:${C.muted2};"> — quieted</span> <button data-fresume="${fc}" style="background:none;border:0;color:${C.muted3};cursor:pointer;font:inherit;">resume</button></div>` : "")).join("")}
    ${s.fieldMutedSites.length ? `<div style="margin-top:8px;color:${C.muted2};font-family:${FONT.mono};font-size:11px;">Field-muted sites:</div>` + s.fieldMutedSites.map((h) => `<div style="color:${C.text};margin:4px 0;font-family:${FONT.mono};font-size:12.5px;">${h} <button data-funmute="${h}" style="background:none;border:0;color:${C.muted3};cursor:pointer;font:inherit;">remove</button></div>`).join("") : ""}`;

  app.querySelectorAll<HTMLInputElement>("input[data-type]").forEach((cb) => {
    cb.addEventListener("change", async () => {
      const checked = cb.checked;
      const type = cb.dataset.type as (typeof LEAK_CLASSES)[number];
      await updateSettings((s) => {
        s.perTypeEnabled[type] = checked;
        // Re-enabling a type clears any auto-quiet accumulated for it
        if (checked) s.dismissals[type] = 0;
      });
      void render();
    });
  });

  app.querySelectorAll<HTMLButtonElement>("button[data-unmute]").forEach((b) => {
    b.addEventListener("click", async () => {
      await updateSettings((s) => { s.perSiteMutes = s.perSiteMutes.filter((h) => h !== b.dataset.unmute); });
      void render();
    });
  });

  // BUG 3b: wire resume buttons to reset dismissals for auto-quieted types
  app.querySelectorAll<HTMLButtonElement>("button[data-resume]").forEach((b) => {
    b.addEventListener("click", async () => {
      await updateSettings((s) => { s.dismissals[b.dataset.resume as (typeof LEAK_CLASSES)[number]] = 0; });
      void render();
    });
  });

  document.getElementById("toastToggle")?.addEventListener("change", async (e) => {
    const checked = (e.target as HTMLInputElement).checked;
    await updateSettings((s) => { s.toastsEnabled = checked; });
  });

  document.getElementById("fieldToggle")?.addEventListener("change", async (e) => {
    const checked = (e.target as HTMLInputElement).checked;
    await updateSettings((s) => { s.fieldSuggestionsEnabled = checked; });
  });

  app.querySelectorAll<HTMLButtonElement>("button[data-fresume]").forEach((b) => {
    b.addEventListener("click", async () => {
      await updateSettings((s) => { s.fieldDismissals[b.dataset.fresume as (typeof FIELD_CONTEXTS)[number]] = 0; });
      void render();
    });
  });

  app.querySelectorAll<HTMLButtonElement>("button[data-funmute]").forEach((b) => {
    b.addEventListener("click", async () => {
      await updateSettings((s) => { s.fieldMutedSites = s.fieldMutedSites.filter((h) => h !== b.dataset.funmute); });
      void render();
    });
  });
}
void render();
