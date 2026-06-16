import { defineConfig } from "wxt";

export default defineConfig({
  manifest: {
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
  },
});
