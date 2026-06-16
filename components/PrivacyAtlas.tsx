"use client";

/* eslint-disable @typescript-eslint/no-explicit-any -- verbatim port of the prototype shell;
   permissive `any` is sanctioned by the task spec and tightens as children land. */
/* eslint-disable react/no-unescaped-entities -- welcome-panel copy is ported verbatim. */

import { useState, useMemo, useEffect, useCallback } from "react";

import { GRAPH } from "@/data/graph";
import { DOMAIN, THREAT_C } from "@/data/ui-maps";
import { DEVICES } from "@/data/devices";
import { buildModel } from "@/lib/model";
import { buildPath, prereqChain } from "@/lib/path";
import { S } from "@/lib/styles";
import Control from "@/components/common/Control";
import Legend from "@/components/common/Legend";
import GraphCanvas from "@/components/web/GraphCanvas";
import MobileEntryList from "@/components/web/MobileEntryList";
import DevicesModal from "@/components/detail/DevicesModal";
import Detail from "@/components/detail/Detail";
import JourneysView from "@/components/journeys/JourneysView";
import Onboarding from "@/components/path/Onboarding";
import PathView from "@/components/path/PathView";
import ThreatBoard from "@/components/threats/ThreatBoard";
import OutfittedView from "@/components/outfitted/OutfittedView";
import ContributePanel from "@/components/contribute/ContributePanel";
import { BrandLogoHorizontal, BrandLogoStacked } from "@/components/common/BrandLogo";
import CommandK from "@/components/common/CommandK";
import AILauncher from "@/components/ai/AILauncher";
import AIModal, { type AISeed } from "@/components/ai/AIModal";
import EntrySwatch from "@/components/common/EntrySwatch";
import { buildSearchIndex, searchEntries } from "@/lib/search";
import type { SearchEntry } from "@/lib/search";
import { parseDeepLink } from "@/lib/deep-link";
import { useIsMobile } from "@/hooks/use-is-mobile";
import CountrySelect from "@/components/common/CountrySelect";

/* friction rank lookup — module-scoped constant, no closure needed */
const fricRank: Record<string, number> = { none: 0, low: 1, med: 2, high: 3 };

export default function PrivacyAtlas() {
  const [contributions, setContributions] = useState<any>({});
  /* community-editable from the start: VERIFIED node proposals merge into the live model,
     so the map itself grows from crowdsourcing — through the same review pipeline as everything else */
  const model = useMemo(() => buildModel(contributions), [contributions]);
  const { all, byId, links, adj } = model;
  const searchIndex = useMemo(() => buildSearchIndex(model), [model]);

  const [selectedRaw, setSelectedRaw] = useState<string | null>(null);     // id
  const [history, setHistory] = useState<string[]>([]);               // breadcrumb stack of visited ids
  const selected = selectedRaw;
  // history-aware selection: pushes the prior node onto the trail so navigation is reversible
  const setSelected = useCallback((id: string | null) => {
    setSelectedRaw((prev) => {
      if (id === prev) return prev;
      if (prev && id) setHistory((h) => (h[h.length - 1] === prev ? h : [...h.slice(-11), prev]));
      if (!id) setHistory([]); // closing clears the trail
      return id;
    });
  }, []);
  const goBack = useCallback(() => {
    setHistory((h) => {
      if (!h.length) { setSelectedRaw(null); return h; }
      const prev = h[h.length - 1];
      setSelectedRaw(prev);
      return h.slice(0, -1);
    });
  }, []);
  const [goal, setGoal] = useState<string | null>(null);              // target node id for path mode
  const [activeDomains, setActiveDomains] = useState<Set<string>>(() => new Set(Object.keys(DOMAIN)));
  const [combineMode, setCombineMode] = useState(false);
  const [showThreats, setShowThreats] = useState(true);
  const [actorFilter, setActorFilter] = useState<string | null>(null);
  const [maxFriction, setMaxFriction] = useState("high"); // none<low<med<high
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("map"); // land on THE WEB — the brand moment; the right column orients from there
  const [mapMode, setMapMode] = useState<"list" | "graph">("list"); // mobile map tab lands on the list; desktop ignores it and always renders the graph
  const [profile, setProfile] = useState<any>(null);
  const [onboarding, setOnboarding] = useState(false);
  const [myDevices, setMyDevices] = useState<any>({ phone: null, desktop: null, browser: null });
  const [devicesOpen, setDevicesOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  /* the center-stage assistant can be opened plain (the launcher) OR seeded by a specific
     surface — a how-to card's "stuck on a step?", a move's "ask AI" — which loads that
     card's steps + topic into the SAME modal instead of a cramped inline chat. */
  const [aiSeed, setAiSeed] = useState<AISeed | null>(null);
  const openAI = (seed?: AISeed) => { setAiSeed(seed ?? null); setAiOpen(true); };
  const closeAI = () => { setAiOpen(false); setAiSeed(null); };
  const [journeysHome, setJourneysHome] = useState(0);   // bumping this sends Journeys back to the mission list
  /* the web doubles as a MIRROR: completed moves paint the map, threats weaken as counters land.
     journeyProgress is the SINGLE shared source of truth — loaded once on mount, updated live
     whenever a step is toggled in Journeys or Path (no tab-switch needed to refresh the map). */
  const [doneMap, setDoneMap] = useState<Record<string, any>>({});
  const [showProgress, setShowProgress] = useState(true);
  /* load once on mount so doneMap is available regardless of which tab is active */
  useEffect(() => {
    (async () => { try { const r = await window.storage.get("journeyProgress", false); setDoneMap(r && r.value ? JSON.parse(r.value) : {}); } catch {} })();
  }, []);
  /* shared updater: updates the map state AND persists to storage in one call */
  const setJourneyProgress = useCallback(async (next: Record<string, any>) => {
    setDoneMap(next);
    try { await window.storage.set("journeyProgress", JSON.stringify(next), false); } catch { /* quota/access */ }
  }, []);
  const journeyStats = useMemo(() => {
    const dc = Object.values(doneMap).filter(Boolean).length;
    const covm = new Map<any, { d: number; n: number }>();
    model.links.forEach((l: any) => {
      if (l.type !== "counters") return;
      const t = l.target.id || l.target, src = l.source.id || l.source;
      if (!covm.has(t)) covm.set(t, { d: 0, n: 0 });
      const e = covm.get(t)!; e.n++; if (doneMap[src]) e.d++;
    });
    let weak = 0, beat = 0;
    covm.forEach((v) => { const f = v.n ? v.d / v.n : 0; if (f >= 1) beat++; else if (f >= 0.5) weak++; });
    return { dc, weak, beat };
  }, [model, doneMap]);
  const [aiPath, setAiPath] = useState<any>(null);             // AI-built custom path {moves:[ids], reason, ts}
  useEffect(() => {
    (async () => { try { const r = await window.storage.get("aiPath", false); if (r && r.value) setAiPath(JSON.parse(r.value)); } catch {} })();
  }, []);
  const handleAIPath = useCallback(async (p: any) => {
    const ids: string[] = [];
    (p.moves || []).forEach((lbl: any) => {
      const n = GRAPH.nodes.find((x: any) => x.label.toLowerCase() === String(lbl).trim().toLowerCase());
      if (n && !ids.includes(n.id)) ids.push(n.id);
    });
    if (ids.length < 3) return;                            // refuse to build a junk path
    const obj = { moves: ids, reason: p.reason || "", ts: Date.now() };
    setAiPath(obj);
    try { await window.storage.set("aiPath", JSON.stringify(obj), false); } catch {}
    const pr = p.profile || {};
    if (["brokers", "person", "crime", "state", "broad"].includes(pr.worry)) {
      // The AI never sees/returns phoneAge — carry the user's onboarding answer over
      // so an AI-built plan doesn't silently drop it.
      let prevPhoneAge: string | undefined;
      let prevCountry: string | undefined;
      try {
        const r = await window.storage.get("profile", false);
        if (r && r.value) { const j = JSON.parse(r.value); prevPhoneAge = j.phoneAge; prevCountry = j.country; }
      } catch { /* no prior profile */ }
      const prof = {
        worry: pr.worry,
        friction: ["low", "med", "high"].includes(pr.friction) ? pr.friction : "med",
        level: ["beginner", "intermediate", "advanced"].includes(pr.level) ? pr.level : "beginner",
        ...(prevPhoneAge ? { phoneAge: prevPhoneAge } : {}),
        ...(prevCountry ? { country: prevCountry } : {}),
      };
      setProfile(prof); setOnboarding(false);
      try { await window.storage.set("profile", JSON.stringify(prof), false); } catch {}
    }
    setTab("path");
  }, []);
  const clearAIPath = useCallback(async () => {
    setAiPath(null);
    try { await window.storage.set("aiPath", "", false); } catch {}
  }, []);

  /* deep-link handler: ?threat=<id> → Counter-Threats tab + select; ?node=<id> → map tab + select. */
  useEffect(() => {
    const dl = parseDeepLink(window.location.search);
    if (!dl) return;
    window.history.replaceState({}, "", window.location.pathname);
    // setState is deferred via setTimeout because this codebase's lint forbids synchronous
    // setState inside an effect (set-state-in-effect rule). Runs once on mount (deps []).
    setTimeout(() => {
      if (dl.kind === "threat") { setTab("threats"); setSelected(dl.id); }
      else { setTab("map"); setSelected(dl.id); }
    }, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onPick = useCallback((entry: SearchEntry) => {
    if (entry.nodeId) {
      setTab("map");
      setSelected(entry.nodeId);
    } else if (entry.tab) {
      setTab(entry.tab as "map" | "journeys" | "threats" | "outfitted" | "contribute" | "path");
      setSelected(null);
    }
    setSearch("");
  }, [setSelected, setTab, setSearch]);

  /* load device profile (personal storage) */
  useEffect(() => {
    (async () => {
      try { const r = await window.storage.get("devices", false); if (r && r.value) setMyDevices(JSON.parse(r.value)); } catch {}
    })();
  }, []);
  const saveDevices = useCallback(async (d: any) => {
    setMyDevices(d);
    try { await window.storage.set("devices", JSON.stringify(d), false); } catch {}
  }, []);

  /* load profile (personal storage). Don't force onboarding on first run —
     people want to explore the map first; "MY PATH" / "get my path" are the entry points. */
  useEffect(() => {
    (async () => {
      try {
        const r = await window.storage.get("profile", false);
        if (r && r.value) setProfile(JSON.parse(r.value));
      } catch { /* no profile yet */ }
    })();
  }, []);

  const saveProfile = useCallback(async (p: any) => {
    setProfile(p); setOnboarding(false); setTab("path");
    try { await window.storage.set("profile", JSON.stringify(p), false); } catch {}
  }, []);

  const path = useMemo(() => (profile ? buildPath(profile) : []), [profile]);

  /* map-tab control blocks — shared by the desktop left rail and the mobile Filters drawer.
     Defined here so all the closures/handlers/state it references stay in scope. */
  const controls = (
    <>
      <Control label="SEARCH">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="find a move or threat…" style={S.input} />
        {search.trim() && (
          <div style={S.searchResults}>
            {(() => {
              const hits = searchEntries(searchIndex, search);
              if (!hits.length) return <div style={S.tiny}>no matches</div>;
              return hits.map((entry) => (
                <button key={entry.key} onClick={() => onPick(entry)} style={S.searchHit}>
                  <EntrySwatch entry={entry} size={7} />
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{entry.label}</span>
                  <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 10, color: "#7e8798", flexShrink: 0, whiteSpace: "nowrap" }}>{entry.sub}</span>
                </button>
              ));
            })()}
          </div>
        )}
      </Control>

      <Control label="MY JOURNEY ON THE WEB">
        <button onClick={() => setShowProgress((x) => !x)} style={{ ...S.chip, opacity: showProgress ? 1 : 0.4, borderColor: "#2a5d63", color: "#5fd3c8" }}>
          {showProgress ? "● progress painted" : "○ knowledge view"}
        </button>
        <div style={{ ...S.tiny, width: "100%", margin: "4px 0 2px", lineHeight: 1.5 }}>
          {journeyStats.dc === 0
            ? "Nothing checked off yet — the unlit web is your exposure map."
            : journeyStats.dc + " moves done · " + journeyStats.beat + " threats fully countered · " + journeyStats.weak + " weakened. The unlit part is what's left."}
        </div>
      </Control>

      <Control label="DOMAINS">
        <button
          onClick={() => setCombineMode((x) => !x)}
          style={{ ...S.chip, opacity: combineMode ? 1 : 0.45, borderColor: combineMode ? "#5fd3c8" : "#3a4250", color: combineMode ? "#5fd3c8" : "#9aa0b5" }}
          aria-pressed={combineMode}
          aria-label="combine mode: tap domains to add or remove from combination"
        >
          ⊕ combine
        </button>
        {Object.entries(DOMAIN).map(([k, v]) => (
          <button key={k} onClick={(e) => {
            const allKeys = Object.keys(DOMAIN);
            setActiveDomains((prev) => {
              if (e.shiftKey || combineMode) {        // shift-click OR combine mode: toggle
                const ns = new Set(prev);
                if (ns.has(k)) ns.delete(k); else ns.add(k);
                return ns.size === 0 ? new Set(allKeys) : ns;  // never strand an empty map
              }
              if (prev.size === 1 && prev.has(k)) return new Set(allKeys);  // click solo again → all back on
              return new Set([k]);                    // click: isolate just this domain
            });
          }} style={{ ...S.chip, opacity: activeDomains.has(k) ? 1 : 0.32, borderColor: v.c }}>
            <span style={{ width: 8, height: 8, background: v.c, borderRadius: 8, display: "inline-block" }} />
            {v.label}
          </button>
        ))}
        {activeDomains.size < Object.keys(DOMAIN).length && (
          <button onClick={() => setActiveDomains(new Set(Object.keys(DOMAIN)))}
            style={{ ...S.chip, borderColor: "#3a4250", color: "#9aa0b5" }}
            aria-label="show all domains">⟲ show all</button>
        )}
        <div style={{ ...S.tiny, width: "100%", margin: "2px 0 4px" }}>
          {combineMode ? "tap = add/remove · shift-click = combine · ⊕ combine is ON" : "click = isolate one · shift-click = combine · tap ⊕ to multi-select"}
        </div>
        <button onClick={() => setShowThreats((x) => !x)} style={{ ...S.chip, opacity: showThreats ? 1 : 0.32, borderColor: THREAT_C }}>
          <span style={{ width: 8, height: 8, background: THREAT_C, transform: "rotate(45deg)", display: "inline-block" }} />
          Threats
        </button>
      </Control>

      <Control label="ADVERSARY (who are you defending against?)">
        <select value={actorFilter || ""} onChange={(e) => setActorFilter(e.target.value || null)} style={S.input}>
          <option value="">— anyone —</option>
          {(GRAPH.actors || []).map((a: any) => <option key={a.id} value={a.id}>{a.label}</option>)}
        </select>
      </Control>

      <Control label={`MAX FRICTION  ·  ${maxFriction}`}>
        <input type="range" min={0} max={3} value={["none","low","med","high"].indexOf(maxFriction)}
          onChange={(e) => setMaxFriction(["none","low","med","high"][+e.target.value])} style={{ width: "100%" }} />
        <div style={S.tiny}>Hide moves that cost more daily effort than this.</div>
      </Control>

      {goal && (
        <Control label="PATH MODE">
          <div style={S.tiny}>Showing the prerequisite chain to reach<br /><b style={{ color: "#fff" }}>{byId.get(goal)?.label}</b>.</div>
          <button onClick={() => setGoal(null)} style={S.clearBtn}>clear path</button>
        </Control>
      )}

      <div style={{ marginTop: "auto", paddingTop: 14 }}>
        <Legend />
      </div>
    </>
  );

  /* load community contributions from shared storage (the crowdsource prototype) */
  useEffect(() => {
    (async () => {
      try {
        const r = await window.storage.get("contributions", true);
        if (r && r.value) setContributions(JSON.parse(r.value));
      } catch { /* none yet */ }
    })();
  }, []);

  /* which ids pass the current filters */
  const visibleIds = useMemo(() => {
    const s = new Set<string>();
    all.forEach((n: any) => {
      if (n.kind === "threat") { if (showThreats) s.add(n.id); return; }
      if (!activeDomains.has(n.domain)) return;
      if (actorFilter && !(n.actors || []).includes(actorFilter)) return;
      if (n.cost && fricRank[n.cost.friction] > fricRank[maxFriction]) return;
      s.add(n.id);
    });
    return s;
  }, [all, activeDomains, showThreats, actorFilter, maxFriction]);

  /* mobile list-view rows: moves + threats that pass the current filters (search-aware) */
  const listEntries = useMemo(() => {
    const base = search.trim() ? searchEntries(searchIndex, search) : searchIndex;
    return base.filter((e) => (e.kind === "move" || e.kind === "threat") && !!e.nodeId && visibleIds.has(e.nodeId));
  }, [search, searchIndex, visibleIds]);

  /* path highlight set */
  const pathInfo = useMemo(() => (goal ? prereqChain(goal, links) : null), [goal, links]);

  /* neighborhood of selected (1 hop) */
  const neighborhood = useMemo(() => {
    if (!selected) return null;
    const s = new Set<string>([selected]);
    adj.get(selected)?.forEach((x: any) => s.add(x));
    return s;
  }, [selected, adj]);

  const matchesSearch = useCallback(
    (n: any) => !search || n.label.toLowerCase().includes(search.toLowerCase()) || n.id.includes(search.toLowerCase()),
    [search]
  );

  const isMobile = useIsMobile();
  /* mobile: bump tab tap target to ~44px tall (12.5px text + 13px vertical padding); desktop unchanged */
  const tabMobile = isMobile ? { padding: "13px 15px", fontSize: 12.5 } : {};

  /* the detail dossier — same prop set on desktop aside and mobile sheet */
  const detailEl = (
    <Detail
      node={byId.get(selected!)} model={model} setSelected={setSelected}
      setGoal={setGoal} contributions={contributions} setContributions={setContributions}
      myDevices={myDevices} saveDevices={saveDevices} openAI={openAI}
      country={profile?.country}
    />
  );

  return (
    <div style={S.app}>

      {/* ---------- header ---------- */}
      <header style={S.header}>
        <div style={{ display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
            <BrandLogoHorizontal />
            <span style={{ ...S.subtitle, maxWidth: 420 }}>a crisscrossing map of personal-privacy moves, the threats they answer, and the evidence behind them</span>
          </div>
          <a href="/extension" style={S.extCta} title="The Atlas as a browser extension — on every page you visit">
            ⊕ get the extension
          </a>
        </div>
        <div style={S.statline}>
          {GRAPH.nodes.length} moves · {GRAPH.threats.length} threats · {GRAPH.edges.length} links · seed v{GRAPH.version} · <span style={{ color: "#f0a868" }}>community-editable</span> · <a href="https://github.com/kelvinsinferno/privacy-atlas" target="_blank" rel="noopener noreferrer" style={{ color: "#5fd3c8", textDecoration: "none" }}>source ↗ (AGPL-3.0)</a>
        </div>
      </header>

      {/* ---------- onboarding ---------- */}
      {onboarding && <Onboarding onDone={saveProfile} onSkip={() => { setOnboarding(false); setTab("map"); }} />}

      {/* ---------- tabs ---------- */}
      <nav style={S.tabs} className="tabs-scroll" role="tablist" aria-label="App sections">
        {/* the site: home first, then browse/act/shop/build */}
        {["map", "journeys", "threats", "outfitted", "contribute"].map((t) => (
          <button key={t} onClick={() => { if (t === "journeys" && tab === "journeys") setJourneysHome((k) => k + 1); setTab(t); }} style={{ ...S.tab, ...(tab === t ? S.tabActive : {}), ...tabMobile }}
            role="tab" aria-selected={tab === t}>
            {t === "map" ? "◇ THE WEB" : t === "journeys" ? "◈ JOURNEYS" : t === "threats" ? "▲ COUNTER THREATS" : t === "outfitted" ? "✦ OUTFITTED" : "✎ CONTRIBUTE"}
          </button>
        ))}
        {/* you: the personal cluster, anchored right */}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
          <CountrySelect
            value={profile?.country ?? ""}
            onChange={(code) => {
              const next = { ...(profile || {}), country: code || undefined };
              setProfile(next);
              try { window.storage.set("profile", JSON.stringify(next), false); } catch {}
            }}
            placeholder="🌐 country"
            ariaLabel="your country (tailors regional info)"
            style={{ width: "auto", maxWidth: 170, padding: "6px 8px", fontSize: 12 }}
          />
          <button onClick={() => setTab("path")} style={{ ...S.tabPersonal, ...(tab === "path" ? S.tabPersonalActive : {}), ...tabMobile }}
            role="tab" aria-selected={tab === "path"}>
            ◎ MY PATH
          </button>
          <button onClick={() => setDevicesOpen(true)} style={{ ...S.redoBtn, borderColor: "#313846", color: "#9aa0b5" }}
            aria-label="my devices settings">
            ⚙ my devices{(() => { const l = myDevices.phone ? ((DEVICES.phone.find((d) => d.k === myDevices.phone) || {}).label || "") : ""; return l ? " · " + (l.length > 16 ? l.slice(0, 15) + "…" : l) : ""; })()}
          </button>
        </div>
      </nav>
      {devicesOpen && <DevicesModal myDevices={myDevices} saveDevices={saveDevices} onClose={() => setDevicesOpen(false)} />}

      <div style={S.body}>
        {/* ================= LEFT: controls (map only, desktop) ================= */}
        {tab === "map" && !isMobile && (
          <aside style={S.left}>{controls}</aside>
        )}

        {/* mobile map-tab: Filters drawer (controls) opened from a toolbar above the full-width map */}
        {isMobile && tab === "map" && filtersOpen && (
          <>
            <div style={S.drawerScrim} onClick={() => setFiltersOpen(false)} />
            <div style={S.drawer} role="dialog" aria-modal="true" aria-label="filters">
              <div style={S.drawerHead}>
                <span style={S.ctrlLabel}>FILTERS</span>
                <button style={S.sheetBack} aria-label="close filters" onClick={() => setFiltersOpen(false)}>✕</button>
              </div>
              {controls}
            </div>
          </>
        )}

        {/* ================= CENTER ================= */}
        {/* on mobile, the map tab stacks a toolbar above the full-width center */}
        <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
        {isMobile && tab === "map" && (
          <div style={S.mobileToolbar}>
            <button style={S.toolBtn} aria-label="open filters" onClick={() => setFiltersOpen(true)}>⚙ Filters</button>
            <button style={S.toolBtn} aria-label="switch between map and list" onClick={() => setMapMode((m) => (m === "list" ? "graph" : "list"))}>
              {mapMode === "list" ? "◇ map" : "▤ list"}
            </button>
          </div>
        )}
        <main style={S.center}>
          {tab === "journeys" && (
            <JourneysView model={model}
              onExplore={(id: string | null) => { setTab("map"); setSelected(id); }}
              onInspect={(id: string) => setSelected(id)} selected={selected} homeSignal={journeysHome}
              onAskAI={() => openAI()}
              done={doneMap} setDone={setJourneyProgress} />
          )}
          {tab === "path" && (
            <PathView path={path} profile={profile} setSelected={setSelected} model={model}
              onExplore={(id: string | null) => { setTab("map"); setSelected(id); }}
              onStart={() => setOnboarding(true)}
              aiPath={aiPath} onClearAIPath={clearAIPath}
              done={doneMap} />
          )}
          {tab === "map" && (
            isMobile && mapMode === "list" ? (
              <MobileEntryList entries={listEntries} onPick={onPick} />
            ) : (
              <GraphCanvas
                model={model} visibleIds={visibleIds} selected={selected} setSelected={setSelected}
                neighborhood={neighborhood} pathInfo={pathInfo} goal={goal} matchesSearch={matchesSearch} search={search}
                history={history} goBack={goBack} byId={byId}
                showThreats={showThreats} setShowThreats={setShowThreats}
                done={doneMap} showProgress={showProgress}
              />
            )
          )}
          {tab === "threats" && (
            <ThreatBoard model={model} setSelected={setSelected} onTrace={(id: string)=>{setTab("map");setSelected(id);}} />
          )}
          {tab === "outfitted" && (
            <OutfittedView model={model} onInspect={(id: string) => setSelected(id)} />
          )}
          {tab === "contribute" && (
            <ContributePanel contributions={contributions} setContributions={setContributions} byId={byId} />
          )}
        </main>
        </div>

        {/* ================= RIGHT: detail =================
            mobile: full-screen sheet when a node is selected (nothing otherwise);
            desktop: the 340px side panel with the welcome placeholder. */}
        {isMobile ? (
          selected && (
            <div style={S.detailSheet} role="dialog" aria-modal="true" aria-label="details">
              <div style={S.detailSheetBar}>
                <button style={S.sheetBack} aria-label="back" onClick={() => setSelected(null)}>‹ back</button>
                <span style={{ ...S.tiny, color: "#d4dae6", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{byId.get(selected)?.label}</span>
              </div>
              {detailEl}
            </div>
          )
        ) : (
        <aside style={S.right}>
          {selected ? (
            detailEl
          ) : (
            <div style={S.welcome}>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 18, marginTop: 10 }}>
                <BrandLogoStacked />
              </div>
              <p style={{ color: "#d4dae6", fontSize: 14, lineHeight: 1.65, marginTop: 8 }}>
                Every glowing dot is a <b style={{ color: "#fff" }}>move you can make</b> — and the lines between them are why privacy isn't a checklist: one move unlocks, strengthens, or trades off against others. Diamonds are the threats they defeat.
              </p>

              <div style={S.welcomeLabel}>HOW TO EXPLORE</div>
              <div style={S.welcomeRow}><span style={S.welcomeKey}>click a node</span><span>its full dossier opens here — what it does, exact how-to steps, what it costs, how it fails, sources to verify</span></div>
              <div style={S.welcomeRow}><span style={S.welcomeKey}>hover</span><span>see any node's name</span></div>
              <div style={S.welcomeRow}><span style={S.welcomeKey}>drag the dark</span><span>move around the web</span></div>
              <div style={S.welcomeRow}><span style={S.welcomeKey}>click a domain</span><span>isolate just that territory (left rail)</span></div>

              <div style={S.welcomeLabel}>OR LET US GUIDE YOU</div>
              <button style={{ ...S.welcomeBtn, borderColor: "#6b4a1f", color: "#f5b878" }} onClick={() => openAI()}>✦ Ask AI — it builds your plan</button>
              <button style={S.welcomeBtn} onClick={() => setTab("journeys")}>◈ pick a guided mission — themed quests, easy → deep</button>
              <button style={S.welcomeBtn} onClick={() => setOnboarding(true)}>◎ three quick questions → your personalized path</button>

              <div style={{ ...S.tiny, marginTop: 14, lineHeight: 1.6 }}>
                Everything you do here stays on your side — no account, no tracking, your progress never leaves your device. Deselect any node to get this guide back.
              </div>
            </div>
          )}
        </aside>
        )}
      </div>

      {/* ⌘K global command palette */}
      <CommandK searchIndex={searchIndex} onPick={onPick} />

      {/* persistent global AI launcher + center-stage assistant modal (every tab) */}
      <AILauncher onOpen={() => openAI()} hidden={aiOpen} />
      <AIModal
        open={aiOpen}
        onClose={closeAI}
        model={model}
        done={doneMap}
        nodeId={aiSeed?.nodeId}
        starters={aiSeed?.starters}
        sensitive={aiSeed?.sensitive}
        title={aiSeed?.title}
        deviceContext={profile?.phoneAge ? "phone_age:" + profile.phoneAge : undefined}
        regionContext={profile?.country ? "country:" + profile.country : undefined}
        onInspect={(id) => { setTab("map"); setSelected(id); closeAI(); }}
        onBuildPath={(path) => { handleAIPath(path); closeAI(); }}
      />
    </div>
  );
}
