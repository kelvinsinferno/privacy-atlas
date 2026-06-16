"use client";

import React, { useId } from "react";

export interface Persona {
  id: string;
  name: string;
  icon: string;
  tag: string;
  blurb: string;
  look: string[];
}
export const PERSONAS: Persona[] = [
  { id:"traveler", name:"The Traveler", icon:"\u2708", tag:"borders, hotels, transit",
    blurb:"Crosses jurisdictions without leaving a trail. Dark on demand, clean devices, nothing skimmable.",
    look:["privacy-eyewear","signal-blocking-edc","faraday","device-os-hardening","travel-privacy","compartmented-phone"] },
  { id:"executive", name:"The Executive", icon:"\u25C6", tag:"boardrooms, targets, wealth",
    blurb:"A high-value target who refuses to look like one. Hardened comms and devices under a tailored exterior.",
    look:["privacy-eyewear","encrypted-messaging","device-os-hardening","strong-2fa","vehicle-data-privacy","signal-blocking-edc"] },
  { id:"activist", name:"The Organizer", icon:"\u25B2", tag:"protests, crowds, press",
    blurb:"Visible by choice, identifiable by none. Anti-recognition head-to-toe, resilient off-grid comms.",
    look:["adversarial-clothing","privacy-eyewear","anti-facial-recognition","encrypted-messaging","offline-mesh-messenger","faraday"] },
  { id:"minimalist", name:"The Minimalist", icon:"\u25CB", tag:"everyday, effortless",
    blurb:"No drama, no paranoia \u2014 just clean defaults that happen to be private. The gateway look.",
    look:["privacy-eyewear","signal-blocking-edc","ad-id-reset","encrypted-messaging","password-manager"] },
];

export interface KitCategory {
  id: string;
  name: string;
  icon: string;
  nodes: string[];
}
export const KIT_CATEGORIES: KitCategory[] = [
  { id:"eyewear", name:"Eyewear", icon:"\u25D1", nodes:["privacy-eyewear","anti-facial-recognition"] },
  { id:"apparel", name:"Apparel", icon:"\u25A4", nodes:["adversarial-clothing"] },
  { id:"carry", name:"Bags & Carry", icon:"\u25AD", nodes:["signal-blocking-edc","faraday"] },
  { id:"devices", name:"Devices", icon:"\u25A3", nodes:["device-os-hardening","strong-2fa","sandbox-bigtech-apps"] },
  { id:"comms", name:"Off-grid Comms", icon:"\u25C9", nodes:["offline-mesh-messenger","offgrid-mesh-radio","licensed-radio"] },
];

export const ICON_VB = "0 0 120 120";
function IconFrame({ accent, children }: { accent: string; children?: React.ReactNode }) {
  const gid = useId();
  return (
    <svg viewBox={ICON_VB} width="100%" height="100%" preserveAspectRatio="xMidYMid meet" style={{ display: "block" }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={accent} stopOpacity="0.16" /><stop offset="100%" stopColor={accent} stopOpacity="0.03" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="120" height="120" fill={"url(#" + gid + ")"} />
      {children}
    </svg>
  );
}
export const KIT_ICONS: Record<string, (c: string) => React.ReactElement> = {
  "privacy-eyewear": (c) => (<IconFrame accent={c}><g fill="none" stroke={c} strokeWidth="2.2">
    <path d="M22 54 q0 -8 8 -8 h22 q6 0 6 6 v6 q0 10 -14 10 q-22 0 -22 -14 z" fill={c} fillOpacity="0.12" />
    <path d="M98 54 q0 -8 -8 -8 h-22 q-6 0 -6 6 v6 q0 10 14 10 q22 0 22 -14 z" fill={c} fillOpacity="0.12" />
    <path d="M58 52 q2 -4 4 0" /><path d="M22 50 l-8 -3" /><path d="M98 50 l8 -3" /></g>
    <g stroke={c} strokeWidth="1" opacity="0.5"><path d="M30 56 l18 6 M30 62 l18 6 M72 56 l18 6 M72 62 l18 6" /></g></IconFrame>),
  "anti-facial-recognition": (c) => (<IconFrame accent={c}><g fill="none" stroke={c} strokeWidth="2">
    <circle cx="60" cy="58" r="26" strokeDasharray="4 5" opacity="0.6" />
    <path d="M48 52 h8 M64 52 h8" strokeWidth="3" /><path d="M60 58 v8 M52 72 q8 6 16 0" /></g>
    <g stroke={c} strokeWidth="1.3" opacity="0.45"><path d="M30 30 l12 0 0 12 M90 30 l-12 0 0 12 M30 90 l12 0 0 -12 M90 90 l-12 0 0 -12" /></g></IconFrame>),
  "adversarial-clothing": (c) => (<IconFrame accent={c}><path d="M44 34 l16 -6 16 6 14 8 -8 14 -6 -3 v37 h-40 v-37 l-6 3 -8 -14 z"
    fill={c} fillOpacity="0.1" stroke={c} strokeWidth="2" strokeLinejoin="round" />
    <g fill={c} opacity="0.55">{[0,1,2,3,4].map(r=>[0,1,2,3].map(col=>((r+col)%2? <rect key={r+"-"+col} x={46+col*7} y={50+r*8} width="6" height="6"/>:null)))}</g></IconFrame>),
  "signal-blocking-edc": (c) => (<IconFrame accent={c}><rect x="34" y="40" width="52" height="40" rx="5" fill={c} fillOpacity="0.1" stroke={c} strokeWidth="2" />
    <path d="M34 52 h52" stroke={c} strokeWidth="1.5" opacity="0.6" />
    <g stroke={c} strokeWidth="2" fill="none" opacity="0.8"><path d="M60 30 q-10 0 -10 10" /><path d="M60 24 q-16 0 -16 16" opacity="0.5" /></g>
    <line x1="42" y1="26" x2="78" y2="62" stroke={c} strokeWidth="2.4" /></IconFrame>),
  "faraday": (c) => (<IconFrame accent={c}><rect x="40" y="30" width="40" height="60" rx="6" fill={c} fillOpacity="0.1" stroke={c} strokeWidth="2" />
    <rect x="46" y="38" width="28" height="40" rx="2" stroke={c} strokeWidth="1" opacity="0.4" fill="none" />
    <g stroke={c} strokeWidth="1.2" opacity="0.5">{[0,1,2,3,4,5].map(i=><line key={i} x1={46} y1={42+i*7} x2={74} y2={42+i*7}/>)}</g>
    <path d="M30 60 q-6 0 -6 -6" stroke={c} fill="none" strokeWidth="2" opacity="0.7"/><line x1="22" y1="48" x2="34" y2="60" stroke={c} strokeWidth="2"/></IconFrame>),
  "device-os-hardening": (c) => (<IconFrame accent={c}><rect x="42" y="26" width="36" height="68" rx="7" fill={c} fillOpacity="0.1" stroke={c} strokeWidth="2"/>
    <path d="M60 50 l10 5 v8 q0 9 -10 13 q-10 -4 -10 -13 v-8 z" fill={c} fillOpacity="0.25" stroke={c} strokeWidth="1.6"/>
    <path d="M55 62 l4 4 7 -8" stroke={c} strokeWidth="2" fill="none"/></IconFrame>),
  "strong-2fa": (c) => (<IconFrame accent={c}><rect x="40" y="44" width="40" height="26" rx="4" fill={c} fillOpacity="0.12" stroke={c} strokeWidth="2"/>
    <circle cx="60" cy="57" r="5" fill={c} fillOpacity="0.4" stroke={c} strokeWidth="1.5"/><line x1="60" y1="57" x2="60" y2="66" stroke={c} strokeWidth="2"/>
    <rect x="74" y="52" width="22" height="10" rx="5" fill={c} fillOpacity="0.2" stroke={c} strokeWidth="1.6"/><circle cx="92" cy="57" r="2.5" fill={c}/></IconFrame>),
  "sandbox-bigtech-apps": (c) => (<IconFrame accent={c}><rect x="32" y="40" width="26" height="26" rx="4" stroke={c} strokeWidth="2" fill={c} fillOpacity="0.12"/>
    <rect x="62" y="40" width="26" height="40" rx="4" stroke={c} strokeWidth="2" strokeDasharray="3 3" fill="none"/>
    <rect x="40" y="70" width="26" height="14" rx="3" stroke={c} strokeWidth="1.5" fill={c} fillOpacity="0.08"/></IconFrame>),
  "encrypted-messaging": (c) => (<IconFrame accent={c}><path d="M34 42 h52 q4 0 4 4 v24 q0 4 -4 4 h-30 l-12 10 v-10 h-6 q-4 0 -4 -4 v-24 q0 -4 4 -4 z"
    fill={c} fillOpacity="0.1" stroke={c} strokeWidth="2" strokeLinejoin="round"/>
    <path d="M54 56 v-4 q0 -6 6 -6 q6 0 6 6 v4" stroke={c} strokeWidth="1.8" fill="none"/><rect x="50" y="56" width="20" height="13" rx="2" fill={c} fillOpacity="0.4"/></IconFrame>),
  "offline-mesh-messenger": (c) => (<IconFrame accent={c}><g fill={c}><circle cx="40" cy="44" r="5"/><circle cx="80" cy="40" r="5"/><circle cx="60" cy="70" r="5"/><circle cx="36" cy="80" r="5"/><circle cx="84" cy="76" r="5"/></g>
    <g stroke={c} strokeWidth="1.4" opacity="0.5"><line x1="40" y1="44" x2="80" y2="40"/><line x1="40" y1="44" x2="60" y2="70"/><line x1="80" y1="40" x2="60" y2="70"/><line x1="60" y1="70" x2="36" y2="80"/><line x1="60" y1="70" x2="84" y2="76"/></g></IconFrame>),
  "offgrid-mesh-radio": (c) => (<IconFrame accent={c}><rect x="46" y="50" width="28" height="40" rx="4" fill={c} fillOpacity="0.12" stroke={c} strokeWidth="2"/>
    <line x1="60" y1="50" x2="60" y2="28" stroke={c} strokeWidth="2"/><circle cx="60" cy="26" r="3" fill={c}/>
    <g stroke={c} strokeWidth="1.5" fill="none" opacity="0.6"><path d="M68 30 q8 4 8 14"/><path d="M52 30 q-8 4 -8 14"/></g>
    <circle cx="60" cy="68" r="5" stroke={c} strokeWidth="1.5" fill="none"/></IconFrame>),
  "licensed-radio": (c) => (<IconFrame accent={c}><rect x="44" y="46" width="24" height="44" rx="4" fill={c} fillOpacity="0.12" stroke={c} strokeWidth="2"/>
    <line x1="64" y1="46" x2="72" y2="24" stroke={c} strokeWidth="2"/><rect x="49" y="52" width="14" height="9" rx="1" fill={c} fillOpacity="0.3"/>
    <g fill={c} opacity="0.6"><circle cx="52" cy="70" r="2"/><circle cx="60" cy="70" r="2"/><circle cx="52" cy="78" r="2"/><circle cx="60" cy="78" r="2"/></g></IconFrame>),
  "travel-privacy": (c) => (<IconFrame accent={c}><path d="M30 64 l44 -12 6 2 -10 16 z" fill={c} fillOpacity="0.18" stroke={c} strokeWidth="2" strokeLinejoin="round"/>
    <path d="M50 58 l22 -16 4 2 -10 20" stroke={c} strokeWidth="2" fill="none"/><line x1="30" y1="76 " x2="70" y2="76" stroke={c} strokeWidth="2" opacity="0.5"/></IconFrame>),
  "vehicle-data-privacy": (c) => (<IconFrame accent={c}><path d="M32 66 l6 -16 q2 -5 8 -5 h28 q6 0 8 5 l6 16 v10 h-8 v-6 h-40 v6 h-8 z"
    fill={c} fillOpacity="0.12" stroke={c} strokeWidth="2" strokeLinejoin="round"/><circle cx="44" cy="74" r="4" fill={c}/><circle cx="76" cy="74" r="4" fill={c}/>
    <line x1="42" y1="44" x2="78" y2="74" stroke={c} strokeWidth="2.2"/></IconFrame>),
  "password-manager": (c) => (<IconFrame accent={c}><rect x="40" y="52" width="40" height="32" rx="5" fill={c} fillOpacity="0.12" stroke={c} strokeWidth="2"/>
    <path d="M48 52 v-6 q0 -12 12 -12 q12 0 12 12 v6" stroke={c} strokeWidth="2" fill="none"/><circle cx="60" cy="66" r="4" fill={c}/><line x1="60" y1="66" x2="60" y2="74" stroke={c} strokeWidth="2"/></IconFrame>),
  "ad-id-reset": (c) => (<IconFrame accent={c}><g stroke={c} strokeWidth="2" fill="none"><path d="M44 60 a16 16 0 1 1 5 11" /><path d="M44 50 v10 h10"/></g>
    <circle cx="60" cy="60" r="4" fill={c}/></IconFrame>),
  "compartmented-phone": (c) => (<IconFrame accent={c}><rect x="38" y="28" width="30" height="58" rx="6" fill={c} fillOpacity="0.1" stroke={c} strokeWidth="2"/>
    <rect x="58" y="44" width="26" height="48" rx="6" fill="#0a0d12" stroke={c} strokeWidth="2"/>
    <circle cx="71" cy="84" r="2.5" fill={c}/><line x1="44" y1="36" x2="62" y2="36" stroke={c} strokeWidth="1.5" opacity="0.5"/>
    <text x="71" y="60" fill={c} fontSize="11" fontFamily="ui-monospace,monospace" textAnchor="middle">2</text></IconFrame>),
};
