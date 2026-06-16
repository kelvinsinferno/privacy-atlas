"use client";

/* eslint-disable @typescript-eslint/no-explicit-any -- verbatim port of the prototype's
   D3 force graph; D3 mutates node/link datums in place (x/y/fx/fy, source/target → objects),
   so loose `any` on datums mirrors the prototype and keeps the math intact. */

import { useRef, useState, useEffect, useMemo, Fragment } from "react";
import * as d3 from "d3";
import { useIsMobile } from "@/hooks/use-is-mobile";

import { S } from "@/lib/styles";
import { DOMAIN, DOMAIN_LETTER, THREAT_C, EDGE } from "@/data/ui-maps";
import type { Model, ModelNode } from "@/lib/types";

/** Pure helper: clamp a new pinch scale to [0.4, 2.5]. Exported for unit testing. */
export function clampScale(value: number): number {
  return Math.min(2.5, Math.max(0.4, value));
}

interface GraphCanvasProps {
  model: Model;
  visibleIds: Set<string>;
  selected: string | null;
  setSelected: (id: string | null) => void;
  neighborhood: Set<string> | null;
  pathInfo: { set: Set<string>; order?: string[] } | null;
  goal: string | null;
  matchesSearch: (n: ModelNode) => boolean;
  search: string;
  history: string[];
  goBack: () => void;
  byId: Map<string, ModelNode>;
  showThreats: boolean;
  setShowThreats: (updater: (b: boolean) => boolean) => void;
  done: Record<string, number | boolean>;
  showProgress: boolean;
}

export default function GraphCanvas({ model, visibleIds, selected, setSelected, neighborhood, pathInfo, goal, matchesSearch, search, history, goBack, byId, showThreats, setShowThreats, done, showProgress }: GraphCanvasProps) {
  const { all, links } = model;
  const ref = useRef<SVGSVGElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [dims, setDims] = useState({ w: 900, h: 640 });
  const simRef = useRef<any>(null);
  const [, force] = useState(0);
  const [pan, setPan] = useState({ x: 0, y: 0 });   // view offset for centering on a node
  const panRef = useRef({ x: 0, y: 0 });
  useEffect(() => { panRef.current = pan; }, [pan]);
  const [scale, setScale] = useState(1);
  const scaleRef = useRef(1);
  useEffect(() => { scaleRef.current = scale; }, [scale]);
  const isMobile = useIsMobile();
  // explicit zoom step (complements pinch — discoverable + accessible + guaranteed on every device)
  const zoomBy = (f: number) => setScale((s) => { const ns = clampScale(s * f); scaleRef.current = ns; return ns; });
  const pinchRef = useRef<{ active: boolean; startDist: number; startScale: number } | null>(null);
  const longPressRef = useRef<{ timer: ReturnType<typeof setTimeout> | null; nodeId: string | null; startX: number; startY: number }>({ timer: null, nodeId: null, startX: 0, startY: 0 });
  const clearHoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [longPressedNode, setLongPressedNode] = useState<string | null>(null);
  const nodeMap = useRef(new Map<string, any>());    // live id -> node (for centering lookups)
  const [hovered, setHovered] = useState<string | null>(null);  // node id under the cursor
  const [kbIdx, setKbIdx] = useState(-1);                       // keyboard-focused node index (-1 = none)
  const userPanRef = useRef(false);                  // true once the user grabs the canvas; centering yields
  const bgDrag = useRef<any>(null);                  // active background-drag session
  const onBgDown = (e: any) => {
    if (e.target.setPointerCapture) try { e.target.setPointerCapture(e.pointerId); } catch (err) {} // eslint-disable-line @typescript-eslint/no-unused-vars
    bgDrag.current = { sx: e.clientX, sy: e.clientY, px: panRef.current.x, py: panRef.current.y, moved: false };
  };
  const onBgMove = (e: any) => {
    const d = bgDrag.current; if (!d) return;
    const dx = e.clientX - d.sx, dy = e.clientY - d.sy;
    if (!d.moved && Math.abs(dx) + Math.abs(dy) > 4) { d.moved = true; userPanRef.current = true; }
    if (d.moved) setPan({ x: d.px + dx, y: d.py + dy });
  };
  const onBgUp = () => {
    const d = bgDrag.current; bgDrag.current = null;
    if (d && !d.moved) setSelected(null);            // a clean click (no drag) still deselects
  };

  useEffect(() => {
    const ro = new ResizeObserver((ents) => {
      for (const e of ents) setDims({ w: e.contentRect.width, h: e.contentRect.height });
    });
    if (wrapRef.current) ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);

  const nodes = useMemo(() => all.filter((n) => visibleIds.has(n.id)).map((n) => ({ ...n })), [all, visibleIds]);
  /* per-threat counter coverage — drives the "weakening" visual on threat diamonds */
  const cov = useMemo(() => {
    const m = new Map<string, { d: number; n: number }>();
    links.forEach((l: any) => {
      if (l.type !== "counters") return;
      const t = l.target.id || l.target, src = l.source.id || l.source;
      if (!m.has(t)) m.set(t, { d: 0, n: 0 });
      const e = m.get(t)!; e.n++; if (done && done[src]) e.d++;
    });
    return m;
  }, [links, done]);
  const lset = useMemo(() => {
    const ids = new Set(nodes.map((n) => n.id));
    return links.filter((l: any) => ids.has(l.source.id || l.source) && ids.has(l.target.id || l.target))
      .map((l: any) => ({ ...l, source: l.source.id || l.source, target: l.target.id || l.target }));
  }, [nodes, links]);

  useEffect(() => {
    const sim = d3.forceSimulation(nodes as any)
      .force("link", d3.forceLink(lset).id((d: any) => d.id).distance((l: any) => l.type === "counters" ? 90 : 64).strength(0.35))
      .force("charge", d3.forceManyBody().strength(-180))
      .force("center", d3.forceCenter(dims.w / 2, dims.h / 2))
      .force("collide", d3.forceCollide(18))
      .force("x", d3.forceX(dims.w / 2).strength(0.04))
      .force("y", d3.forceY(dims.h / 2).strength(0.04))
      .on("tick", () => { nodes.forEach((n: any) => nodeMap.current.set(n.id, n)); force((x) => x + 1); });
    simRef.current = sim;
    sim.alpha(0.9).restart();
    return () => { sim.stop(); };
  }, [nodes, lset, dims.w, dims.h]);

  // when a node is selected, smoothly pan so it sits near center — orientation when arriving
  // from a path/journey step or clicking a relation in the detail panel.
  useEffect(() => {
    if (!selected) return;                            // deselect keeps the view where you left it
    userPanRef.current = false;                       // a new selection re-enables auto-centering
    let raf: number;
    const animate = () => {
      if (userPanRef.current) return;                 // user grabbed the canvas — stop steering
      const n = nodeMap.current.get(selected);
      if (n && typeof n.x === "number") {
        const targetX = dims.w / 2 - n.x;
        const targetY = dims.h / 2 - n.y;
        setPan((p) => {
          const nx = p.x + (targetX - p.x) * 0.18;
          const ny = p.y + (targetY - p.y) * 0.18;
          if (Math.abs(targetX - nx) > 0.5 || Math.abs(targetY - ny) > 0.5) raf = requestAnimationFrame(animate);
          return { x: nx, y: ny };
        });
      } else {
        raf = requestAnimationFrame(animate);
      }
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [selected, dims.w, dims.h]);

  const dragRef = useRef<any>(null);
  const onDown = (n: any) => (e: any) => { dragRef.current = n; simRef.current?.alphaTarget(0.2).restart(); }; // eslint-disable-line @typescript-eslint/no-unused-vars

  const onNodeTouchStart = (n: any) => (e: React.TouchEvent) => {
    onDown(n)(e as any);
    const t = e.touches[0];
    if (longPressRef.current.timer) clearTimeout(longPressRef.current.timer);
    if (clearHoverTimerRef.current) { clearTimeout(clearHoverTimerRef.current); clearHoverTimerRef.current = null; }
    longPressRef.current = {
      timer: setTimeout(() => {
        setHovered(longPressRef.current.nodeId);
        setLongPressedNode(longPressRef.current.nodeId);
      }, 450),
      nodeId: n.id,
      startX: t.clientX,
      startY: t.clientY,
    };
  };
  const onNodeTouchMove = (e: React.TouchEvent) => {
    if (!longPressRef.current.timer) return;
    const t = e.touches[0];
    const dx = t.clientX - longPressRef.current.startX;
    const dy = t.clientY - longPressRef.current.startY;
    if (Math.hypot(dx, dy) > 8) {
      clearTimeout(longPressRef.current.timer!);
      longPressRef.current.timer = null;
    }
  };
  const onNodeTouchEnd = () => {
    if (longPressRef.current.timer) {
      clearTimeout(longPressRef.current.timer);
      longPressRef.current.timer = null;
    }
    if (longPressedNode) {
      const id = longPressedNode;
      setLongPressedNode(null);
      if (clearHoverTimerRef.current) clearTimeout(clearHoverTimerRef.current);
      clearHoverTimerRef.current = setTimeout(() => setHovered((h) => (h === id ? null : h)), 600);
    }
  };

  useEffect(() => {
    const move = (e: any) => {
      if (!dragRef.current || !ref.current) return;
      const pt = ref.current.getBoundingClientRect();
      const s = scaleRef.current;
      const cx = ((e.touches ? e.touches[0].clientX : e.clientX) - pt.left - panRef.current.x) / s;
      const cy = ((e.touches ? e.touches[0].clientY : e.clientY) - pt.top - panRef.current.y) / s;
      dragRef.current.fx = cx; dragRef.current.fy = cy;
    };
    const up = () => {
      if (dragRef.current) { dragRef.current.fx = null; dragRef.current.fy = null; } dragRef.current = null; simRef.current?.alphaTarget(0);
      if (longPressRef.current.timer) { clearTimeout(longPressRef.current.timer); longPressRef.current.timer = null; }
    };
    window.addEventListener("mousemove", move); window.addEventListener("mouseup", up);
    window.addEventListener("touchmove", move, { passive: false }); window.addEventListener("touchend", up);
    return () => {
      window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", up);
      window.removeEventListener("touchmove", move); window.removeEventListener("touchend", up);
      if (clearHoverTimerRef.current) { clearTimeout(clearHoverTimerRef.current); clearHoverTimerRef.current = null; }
    };
  }, []);

  // Pinch-zoom: imperative listeners on the wrapper div so we can use { passive: false } on touchmove
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const onTS = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        const t1 = e.touches[0], t2 = e.touches[1];
        const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
        pinchRef.current = { active: true, startDist: dist, startScale: scaleRef.current };
      }
    };
    const onTM = (e: TouchEvent) => {
      if (pinchRef.current?.active && e.touches.length === 2) {
        e.preventDefault();
        const t1 = e.touches[0], t2 = e.touches[1];
        const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
        const ns = clampScale(pinchRef.current.startScale * (dist / pinchRef.current.startDist));
        scaleRef.current = ns;
        setScale(ns);
      }
    };
    const onTE = (e: TouchEvent) => { if (e.touches.length < 2) pinchRef.current = null; };
    el.addEventListener("touchstart", onTS, { passive: true });
    el.addEventListener("touchmove", onTM, { passive: false });
    el.addEventListener("touchend", onTE, { passive: true });
    return () => {
      el.removeEventListener("touchstart", onTS);
      el.removeEventListener("touchmove", onTM);
      el.removeEventListener("touchend", onTE);
    };
  }, []);

  const searching = search && search.trim().length > 0;
  const focusSet = pathInfo ? new Set([...pathInfo.set, goal]) : neighborhood;
  const dim = (id: string) => focusSet && !focusSet.has(id as any);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (nodes.length === 0) return;
    if (e.key === "ArrowDown" || e.key === "ArrowRight") {
      e.preventDefault();
      setKbIdx((k) => (k + 1) % nodes.length);
    } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
      e.preventDefault();
      setKbIdx((k) => (k <= 0 ? nodes.length - 1 : k - 1));
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (kbIdx >= 0 && kbIdx < nodes.length) setSelected(nodes[kbIdx].id);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setSelected(null);
      setKbIdx(-1);
    }
  };

  return (
    <div
      ref={wrapRef}
      tabIndex={0}
      role="application"
      aria-label={`Privacy map — ${nodes.filter((n: any) => n.kind !== "threat").length} moves and ${nodes.filter((n: any) => n.kind === "threat").length} threats. Use arrow keys to navigate, Enter to open a node, Escape to deselect.`}
      onKeyDown={onKeyDown}
      onFocus={(e) => { if (e.target === e.currentTarget) setKbIdx((k) => k < 0 ? 0 : k); }}
      style={{ position: "relative", width: "100%", height: "100%", outline: "none", touchAction: "none" }}
    >
      <svg ref={ref} width={dims.w} height={dims.h} style={{ display: "block", cursor: "grab" }}>
        <defs>
          <radialGradient id="vign" cx="50%" cy="45%" r="75%">
            <stop offset="0%" stopColor="#0c0f14" /><stop offset="100%" stopColor="#070809" />
          </radialGradient>
        </defs>
        <rect width={dims.w} height={dims.h} fill="url(#vign)"
          style={{ cursor: "grab", touchAction: "none" }}
          onPointerDown={onBgDown} onPointerMove={onBgMove} onPointerUp={onBgUp} onPointerCancel={onBgUp} />
        <g transform={`translate(${pan.x},${pan.y}) scale(${scale})`}>
        {/* edges */}
        <g>
          {lset.map((l: any) => {
            const s = l.source, t = l.target;
            if (typeof s !== "object") return null;
            const e = EDGE[l.type] || EDGE.enables;
            const faded = focusSet && !(focusSet.has(s.id) && focusSet.has(t.id));
            const onPath = pathInfo && pathInfo.set.has(s.id) && (pathInfo.set.has(t.id) || t.id === goal) && l.type === "prereq";
            return (
              <line key={l.id} x1={s.x} y1={s.y} x2={t.x} y2={t.y}
                stroke={onPath ? "#fff" : e.c} strokeWidth={onPath ? 2.4 : e.w}
                strokeDasharray={e.dash} opacity={faded ? 0.05 : onPath ? 0.95 : 0.3} />
            );
          })}
        </g>
        {/* nodes */}
        <g>
          {nodes.map((n: any, idx: number) => {
            if (typeof n.x !== "number") return null;
            const isThreat = n.kind === "threat";
            const baseCol = isThreat ? THREAT_C : (DOMAIN[n.domain]?.c || "#fff");
            const isDone = !!(showProgress && done && done[n.id]);
            const cv = isThreat && showProgress ? cov.get(n.id) : null;
            const covFrac = cv && cv.n ? cv.d / cv.n : 0;
            const col = isThreat
              ? (covFrac >= 1 ? "#5fd3c8" : covFrac >= 0.5 ? "#bfe08c" : covFrac > 0 ? "#f0a868" : THREAT_C)
              : baseCol;
            const r = isThreat ? 6 + (n.tier || 1) * 0.7 : 4 + (n.weight || 1) * 1.1;
            const sel = selected === n.id;
            const hit = matchesSearch(n);
            // when searching, the search result set IS the focus: matches bright + labeled, rest dimmed hard
            const faded = searching ? !hit : dim(n.id);
            const hov = hovered === n.id;
            const showLabel = sel || hov || (searching && hit) || (focusSet && focusSet.has(n.id) && !dim(n.id));
            const isKbFocused = kbIdx === idx;
            return (
              <g key={n.id} transform={`translate(${n.x},${n.y})`}
                onMouseDown={onDown(n)} onClick={(e) => { e.stopPropagation(); setSelected(n.id); }}
                onMouseEnter={() => setHovered(n.id)} onMouseLeave={() => setHovered(null)}
                onTouchStart={onNodeTouchStart(n)} onTouchMove={onNodeTouchMove} onTouchEnd={onNodeTouchEnd}
                style={{ cursor: "pointer", opacity: hov ? 1 : faded ? (searching ? 0.07 : 0.16) : 1, transition: "opacity .2s" }}>
                {isThreat ? (
                  <rect x={-r} y={-r} width={r * 2} height={r * 2} transform="rotate(45)"
                    fill="#1a0c0c" stroke={col} strokeWidth={sel ? 2.4 : 1.4} />
                ) : (
                  <circle r={r} fill={isDone || sel || (searching && hit) ? col : "#10141b"} stroke={col} strokeWidth={sel ? 2.6 : 1.5} />
                )}
                {isDone && !isThreat && r >= 5 && (
                  <text x={0} y={3} textAnchor="middle" fontSize={r * 1.1} fill="#070809" fontWeight="bold" style={{ pointerEvents: "none" }}>✓</text>
                )}
                {!isThreat && !isDone && (
                  <text x={0} y={4} textAnchor="middle" fontSize={r * 0.85} fill={col} fillOpacity={0.55} fontFamily="ui-monospace,monospace" fontWeight="bold" style={{ pointerEvents: "none" }}>
                    {DOMAIN_LETTER[n.domain] || ""}
                  </text>
                )}
                {isKbFocused && (
                  <circle r={r + 4} fill="none" stroke="#5fd3c8" strokeWidth={2} strokeDasharray="3,2" style={{ pointerEvents: "none" }} />
                )}
                {n.researched === false && <circle r={2} cx={r - 1} cy={-r + 1} fill="#f0c468" />}
                {showLabel && (
                  <text x={r + 5} y={3.5} fill="#d4dae6" fontSize={12.5} fontFamily="ui-monospace,monospace"
                    style={{ pointerEvents: "none" }} stroke="#070809" strokeWidth={3} paintOrder="stroke">
                    {(isDone && !isThreat ? "✓ " : "") + n.label + (isThreat && cv && cv.d > 0 ? " · " + cv.d + "/" + cv.n + " countered" : "")}
                  </text>
                )}
              </g>
            );
          })}
        </g>
        </g>
      </svg>

      {/* ---------- wayfinding overlays ---------- */}
      <div style={S.wayTop}>
        {(history && history.length > 0) && (
          <button style={S.wayBtn} onClick={goBack} title="back to where you came from">← back</button>
        )}
        {selected && (() => {
          const n = byId.get(selected) as any;
          if (!n) return null;
          const isT = n.kind === "threat";
          const c = isT ? THREAT_C : (DOMAIN[n.domain]?.c || "#fff");
          return (
            <div style={S.youAreHere}>
              <span style={{ width: 8, height: 8, background: c, borderRadius: isT ? 0 : 8, transform: isT ? "rotate(45deg)" : "none", display: "inline-block" }} />
              <span style={{ color: "#d4dae6" }}>you are at</span>
              <b style={{ color: "#fff" }}>{n.label}</b>
              <button style={S.wayClose} onClick={() => setSelected(null)} title="deselect">✕</button>
            </div>
          );
        })()}
      </div>

      {/* breadcrumb trail */}
      {history && history.length > 0 && (
        <div style={S.breadcrumbs}>
          <span style={S.tiny}>trail:</span>
          {history.slice(-6).map((id, i) => {
            const bn = byId.get(id) as any;
            if (!bn) return null;
            return (
              <Fragment key={id + i}>
                {i > 0 && <span style={{ color: "#3a4250" }}>›</span>}
                <button style={S.crumb} onClick={() => setSelected(id)}>{bn.label}</button>
              </Fragment>
            );
          })}
        </div>
      )}

      {/* explicit zoom control — mobile (pinch also works; this is the discoverable affordance) */}
      {isMobile && (
        <div style={{ position: "absolute", right: 12, top: 12, display: "flex", flexDirection: "column", gap: 6, zIndex: 5 }}>
          <button aria-label="zoom in" onClick={() => zoomBy(1.3)} style={S.zoomBtn}>＋</button>
          <button aria-label="zoom out" onClick={() => zoomBy(1 / 1.3)} style={S.zoomBtn}>－</button>
        </div>
      )}

      {/* solutions-only toggle + hint */}
      <div style={S.wayBottom}>
        <button onClick={() => setShowThreats((x) => !x)} style={{ ...S.solBtn, ...(!showThreats ? S.solBtnOn : {}) }}>
          {showThreats ? "◇ show solutions only" : "▲ showing solutions · click to show threats"}
        </button>
        <span style={S.canvasHint}>drag empty space to move around · hover or long-press a node for its name · pinch to zoom · drag nodes to rearrange · click to inspect & center</span>
      </div>
    </div>
  );
}
