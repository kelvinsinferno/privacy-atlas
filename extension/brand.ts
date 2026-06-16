import { FONT } from "./styles";
import { ATLAS_URL } from "./constants";

/** Globe mark only (transparent bg), tuned to read at ~30px beside the wordmark. */
const GLOBE_MARK = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" role="img" aria-label="Privacy Atlas globe" style="height:30px;width:30px;display:block;flex-shrink:0;">
  <g transform="translate(80,80) scale(0.92)">
    <circle cx="0" cy="0" r="78" fill="none" stroke="#5fd3c8" stroke-width="4"/>
    <ellipse cx="0" cy="0" rx="34" ry="78" fill="none" stroke="#2a5d63" stroke-width="3"/>
    <ellipse cx="0" cy="0" rx="78" ry="34" fill="none" stroke="#2a5d63" stroke-width="3"/>
    <line x1="0" y1="-78" x2="60.1" y2="-19.1" stroke="#5fd3c8" stroke-width="4"/>
    <circle cx="0" cy="-78" r="11" fill="#5fd3c8"/>
    <circle cx="60.1" cy="-19.1" r="9" fill="#f0a868"/>
    <circle cx="24" cy="55.2" r="8" fill="#8ce29a"/>
    <circle cx="-51.4" cy="43.6" r="9" fill="#7fb2ff"/>
  </g>
</svg>`;

/** Brand header for innerHTML: globe mark + "PRIVACY ATLAS" wordmark as crisp HTML text, wrapped in a link to the site. */
export const BRAND_HEADER_HTML = `
<a href="${ATLAS_URL}" target="_blank" rel="noopener" title="Open privacyatlas.xyz" style="display:flex;align-items:center;gap:9px;text-decoration:none;cursor:pointer;">
  ${GLOBE_MARK}
  <span style="font-family:${FONT.mono};font-size:15px;font-weight:600;letter-spacing:2.5px;color:#e8ecf4;">PRIVACY ATLAS</span>
</a>`;
