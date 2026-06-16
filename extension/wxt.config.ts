import { defineConfig } from "wxt";

export default defineConfig({
  manifest: ({ browser }) => ({
    name: "Privacy Atlas",
    description: "See what's tracking you on any page and the move that defends it. On-device, no blocking, nothing leaves your browser.",
    permissions: ["storage", "scripting"],
    host_permissions: ["<all_urls>"],
    action: {
      default_popup: "popup/index.html",
      default_title: "Privacy Atlas",
      default_icon: {
        "16": "icon/16.png",
        "32": "icon/32.png",
        "48": "icon/48.png",
        "128": "icon/128.png",
      },
    },
    options_ui: { page: "options/index.html" },
    web_accessible_resources: [{ resources: ["fp-hook.js"], matches: ["<all_urls>"] }],
    // Firefox/AMO requires a stable add-on id and a data-collection declaration for new
    // extensions. We collect nothing → required: ["none"]. Scoped to Firefox so the Chrome
    // package is unaffected; Chrome ignores browser_specific_settings anyway.
    ...(browser === "firefox"
      ? {
          browser_specific_settings: {
            gecko: {
              id: "privacy-atlas@privacyatlas.xyz",
              data_collection_permissions: { required: ["none"] },
            },
          } as Record<string, unknown>,
        }
      : {}),
  }),
});
