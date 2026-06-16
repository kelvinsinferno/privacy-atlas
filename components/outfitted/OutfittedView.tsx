"use client";

/* eslint-disable react/no-unescaped-entities -- lookbook copy is ported verbatim from the prototype */

import { useState, useRef, useEffect } from "react";
import { S, mono } from "@/lib/styles";
import { DOMAIN } from "@/data/ui-maps";
import { RTYPE_C, RTYPE_BADGE } from "@/data/ui-maps";
import { PERSONAS, KIT_CATEGORIES } from "@/data/personas";
import { RESOURCES } from "@/data/resources";
import { affiliate } from "@/data/affiliate";
import type { Model } from "@/lib/types";
import ItemImage from "./ItemImage";

interface OutfittedViewProps {
  model: Model;
  onInspect: (id: string) => void;
}

export default function OutfittedView({ model, onInspect }: OutfittedViewProps) {
  const { byId } = model;
  const [persona, setPersona] = useState<string | null>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  // When a look is opened, bring its full-kit sheet into view so it's never
  // lost below the fold on shorter screens (it expands below the looks grid).
  useEffect(() => {
    if (persona) sheetRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" });
  }, [persona]);

  return (
    <div style={S.outWrap}>
      <div style={S.outHero}>
        <div style={S.kicker}>OUTFITTED · privacy you'd actually wear</div>
        <h2 style={{ ...S.detailH, fontSize: 26, marginTop: 6 }}>Look like the future, not the bunker.</h2>
        <p style={{ color:"#9aa0b5", fontSize:14, lineHeight:1.6, maxWidth:640, marginTop:8 }}>
          The old picture of privacy is a paranoid in a tinfoil hat. This is the other one: head-to-toe kit that's designed, wearable, and quietly uncompromising. Every piece links back to what it actually does — and, honestly, what it doesn't.
        </p>
      </div>

      <div style={S.outSectLabel}>THE LOOKS</div>
      <div style={S.personaGridV2}>
        {PERSONAS.map((p) => {
          const items = p.look.map((id) => byId.get(id)).filter(Boolean) as NonNullable<ReturnType<typeof byId.get>>[];
          const hero = items.slice(0, 3);
          return (
            <button key={p.id} style={{ ...S.personaCardV2, ...(persona===p.id?{borderColor:"#5fd3c8"}:{}) }} onClick={()=>setPersona(persona===p.id?null:p.id)}>
              <div style={S.personaHero}>
                {hero.map((n, idx) => (
                  <div key={n.id} style={{ ...S.personaHeroCell, zIndex: 3-idx }}>
                    <ItemImage node={n} h={92} />
                  </div>
                ))}
                <div style={S.personaIconBadge}>{p.icon}</div>
              </div>
              <div style={{ padding: "12px 14px 14px" }}>
                <div style={{ fontFamily:mono, fontSize:17, color:"#fff" }}>{p.name}</div>
                <div style={{ ...S.tiny, color:"#969eb0", marginTop:2 }}>{p.tag}</div>
                <div style={{ fontSize:12.5, color:"#9aa0b5", lineHeight:1.5, marginTop:8 }}>{p.blurb}</div>
                <div style={{ ...S.tiny, color:"#5fd3c8", marginTop:10 }}>{persona===p.id ? "✕ close the look" : p.look.length + " pieces · see the full look →"}</div>
              </div>
            </button>
          );
        })}
      </div>

      {persona && (() => {
        const p = PERSONAS.find(x=>x.id===persona);
        if (!p) return null;
        return (
          <div ref={sheetRef} style={{ ...S.lookSheet, scrollMarginTop: 12 }}>
            <div style={{ fontFamily:mono, fontSize:14, color:"#fff", marginBottom:2 }}>{p.icon} {p.name} — the full kit</div>
            <div style={{ ...S.tiny, marginBottom:14 }}>{p.look.length} pieces. Tap any for the honest breakdown + where to get it.</div>
            <div style={S.lookItemGrid}>
              {p.look.map((nid)=>{ const n=byId.get(nid); if(!n) return null; const res=RESOURCES[nid]||[];
                return (
                  <div key={nid} style={S.lookCard} onClick={()=>onInspect(nid)}>
                    <ItemImage node={n} h={104} />
                    <div style={{ padding:"9px 11px 11px" }}>
                      <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                        <span style={{ width:7,height:7,borderRadius:7,background:DOMAIN[n.domain]?.c||"#fff",display:"inline-block",flexShrink:0 }} />
                        <span style={{ color:"#fff", fontSize:14 }}>{n.label}</span>
                      </div>
                      {res[0] && <div style={{ ...S.tiny, color:"#5fd3c8", marginTop:5 }}>{res[0].name}{res.length>1?" +"+(res.length-1):""}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      <div style={{ ...S.outSectLabel, marginTop:30 }}>SHOP BY CATEGORY</div>
      {KIT_CATEGORIES.map((cat)=>(
        <div key={cat.id} style={{ marginBottom: 24 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:11 }}>
            <span style={{ fontSize:17 }}>{cat.icon}</span>
            <span style={{ fontFamily:mono, fontSize:14, letterSpacing:1, color:"#fff" }}>{cat.name}</span>
          </div>
          <div style={S.catGridV2}>
            {cat.nodes.map((nid)=>{ const n=byId.get(nid); if(!n) return null; const res=RESOURCES[nid]||[];
              return (
                <div key={nid} style={S.productCard}>
                  <div onClick={()=>onInspect(nid)} style={{ cursor:"pointer" }}>
                    <ItemImage node={n} h={128} />
                  </div>
                  <div style={{ padding:"10px 12px 12px" }}>
                    <button style={S.productName} onClick={()=>onInspect(nid)}>{n.label}</button>
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    <div style={{ ...S.tiny, marginTop:3, lineHeight:1.45 }}>{(n as any).summary?.length>72?(n as any).summary.slice(0,70)+"…":(n as any).summary}</div>
                    <div style={{ marginTop:8, display:"flex", flexDirection:"column", gap:4 }}>
                      {res.map((r,i)=>(
                        <a key={i} href={affiliate(r.url)} target="_blank" rel="noopener noreferrer sponsored" style={S.productShop}>
                          <span style={{ ...S.resType, color: RTYPE_C[r.type]||"#9aa0b5", borderColor:"#1d2430" }}>{RTYPE_BADGE[r.type]||"LINK"}{r.price?" "+r.price:""}</span>
                          <span style={{ flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{r.name}</span>
                          <span style={{ opacity:0.4 }}>↗</span>
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <div style={S.outFoot}>
        Item visuals are original illustrations — real product photography drops into the same cards as it's added. Some links are affiliate links that fund the project at no extra cost to you, with free/open options listed first. Effectiveness claims come from each item's graph node, including the honest limits (most anti-recognition gear is partial and time-limited, never a cloak). Sourced in part from <span style={{ color:"#8ce29a" }}>Mozilla's 2025 anti-surveillance fashion testing</span>.
      </div>
    </div>
  );
}
