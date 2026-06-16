/**
 * Inline SVG brand logos — background rect stripped for transparency.
 * Both components are purely presentational (no state, no props required).
 */

interface BrandLogoProps {
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Horizontal logo: globe mark left + "PRIVACY ATLAS" wordmark right.
 * Native viewBox 640×140. Renders at ~44px tall (width scales automatically).
 */
export function BrandLogoHorizontal({ className, style }: BrandLogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 640 140"
      role="img"
      aria-label="Privacy Atlas"
      className={className}
      style={{ height: 44, width: "auto", display: "block", ...style }}
    >
      <title>Privacy Atlas</title>
      {/* Globe mark — translate(78,70) scale(0.62) matches the source SVG */}
      <g transform="translate(78,70) scale(0.62)">
        <circle cx="0" cy="0" r="78" fill="none" stroke="#2a5d63" strokeWidth="3"/>
        <ellipse cx="0" cy="0" rx="34" ry="78" fill="none" stroke="#1d3336" strokeWidth="2.4"/>
        <ellipse cx="0" cy="0" rx="78" ry="30" fill="none" stroke="#1d3336" strokeWidth="2.4"/>
        <ellipse cx="0" cy="0" rx="78" ry="58" fill="none" stroke="#1d3336" strokeWidth="1.8"/>
        <line x1="0" y1="-78" x2="60.1" y2="-19.1" stroke="#5fd3c8" strokeWidth="2.8"/>
        <line x1="60.1" y1="-19.1" x2="-51.4" y2="43.6" stroke="#2a5d63" strokeWidth="2.4"/>
        <circle cx="0" cy="-78" r="8.5" fill="#5fd3c8"/>
        <circle cx="60.1" cy="-19.1" r="7" fill="#f0a868"/>
        <circle cx="-51.4" cy="43.6" r="7" fill="#7fb2ff"/>
        {/* Hollow nodes: transparent fill so they read correctly on any dark bg */}
        <circle cx="-60.1" cy="-19.1" r="6" fill="transparent" stroke="#d98ad9" strokeWidth="2.6"/>
        <circle cx="0" cy="78" r="6" fill="transparent" stroke="#c9c2b6" strokeWidth="2.6"/>
        <rect x="71.5" y="-6.5" width="13" height="13" transform="rotate(45 78 0)" fill="transparent" stroke="#5fd3c8" strokeWidth="2.4"/>
      </g>
      {/* Wordmark */}
      <text x="152" y="82" fontFamily="ui-monospace,Menlo,monospace" fontSize="34" letterSpacing="8" fill="#e8ecf4">PRIVACY ATLAS</text>
    </svg>
  );
}

/**
 * Stacked logo: globe mark centered above, wordmark, tagline.
 * Native viewBox 560×380. Renders at max-width ~260px (scales proportionally).
 */
export function BrandLogoStacked({ className, style }: BrandLogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 560 380"
      role="img"
      aria-label="Privacy Atlas"
      className={className}
      style={{ width: "100%", maxWidth: 260, height: "auto", display: "block", ...style }}
    >
      <title>Privacy Atlas</title>
      {/* Globe mark — centered at (280,140) matching the source SVG */}
      <g transform="translate(280,140)">
        <circle cx="0" cy="0" r="78" fill="none" stroke="#2a5d63" strokeWidth="2.5"/>
        <ellipse cx="0" cy="0" rx="34" ry="78" fill="none" stroke="#1d3336" strokeWidth="2"/>
        <ellipse cx="0" cy="0" rx="62" ry="78" fill="none" stroke="#1d3336" strokeWidth="1.5"/>
        <ellipse cx="0" cy="0" rx="78" ry="30" fill="none" stroke="#1d3336" strokeWidth="2"/>
        <ellipse cx="0" cy="0" rx="78" ry="58" fill="none" stroke="#1d3336" strokeWidth="1.5"/>
        {/* Lit path */}
        <line x1="0" y1="-78" x2="60.1" y2="-19.1" stroke="#5fd3c8" strokeWidth="2.2"/>
        <line x1="60.1" y1="-19.1" x2="24" y2="55.2" stroke="#2a5d63" strokeWidth="2"/>
        <line x1="24" y1="55.2" x2="-51.4" y2="43.6" stroke="#1d3336" strokeWidth="2"/>
        {/* Domain nodes */}
        <circle cx="0" cy="-78" r="7" fill="#5fd3c8"/>
        <circle cx="0" cy="-78" r="12.5" fill="none" stroke="#5fd3c8" strokeOpacity="0.3" strokeWidth="2"/>
        <circle cx="60.1" cy="-19.1" r="5.5" fill="#f0a868"/>
        <circle cx="24" cy="55.2" r="5" fill="#8ce29a"/>
        <circle cx="-51.4" cy="43.6" r="5.5" fill="#7fb2ff"/>
        {/* Hollow nodes: transparent fill so they read correctly on any dark bg */}
        <circle cx="-60.1" cy="-19.1" r="5" fill="transparent" stroke="#d98ad9" strokeWidth="2.2"/>
        <circle cx="-24" cy="-55.2" r="5" fill="transparent" stroke="#e8d9a0" strokeWidth="2.2"/>
        <circle cx="0" cy="78" r="5" fill="transparent" stroke="#c9c2b6" strokeWidth="2.2"/>
        {/* Threat diamond */}
        <rect x="72.5" y="-5.5" width="11" height="11" transform="rotate(45 78 0)" fill="transparent" stroke="#5fd3c8" strokeWidth="2"/>
      </g>
      {/* Wordmark */}
      <text x="280" y="306" textAnchor="middle" fontFamily="ui-monospace,Menlo,monospace" fontSize="30" letterSpacing="10" fill="#e8ecf4">PRIVACY ATLAS</text>
      {/* Tagline */}
      <text x="280" y="336" textAnchor="middle" fontFamily="ui-monospace,Menlo,monospace" fontSize="11" letterSpacing="4" fill="#969eb0">PRIVACY IS A WEB · NOT A CHECKLIST</text>
    </svg>
  );
}
