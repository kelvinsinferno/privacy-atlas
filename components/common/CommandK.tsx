"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { searchEntries } from "@/lib/search";
import type { SearchEntry } from "@/lib/search";
import { mono } from "@/lib/styles";
import EntrySwatch from "@/components/common/EntrySwatch";

/* ------------------------------------------------------------------ */
/*  Props                                                               */
/* ------------------------------------------------------------------ */

interface CommandKProps {
  searchIndex: SearchEntry[];
  onPick: (entry: SearchEntry) => void;
}

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */

export default function CommandK({ searchIndex, onPick }: CommandKProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlighted, setHighlighted] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  /* Keep open state accessible in the stable document listener. */
  const openRef = useRef(open);
  useEffect(() => { openRef.current = open; }, [open]);

  const results = useMemo(() => searchEntries(searchIndex, query), [searchIndex, query]);

  /* Stable open/close callbacks */
  const doOpen = useCallback(() => {
    setOpen(true);
    setQuery("");
    setHighlighted(0);
    setTimeout(() => inputRef.current?.focus(), 0);
  }, []);

  const doClose = useCallback(() => {
    setOpen(false);
  }, []);

  /* Global ⌘K / Ctrl+K toggle */
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        if (openRef.current) doClose(); else doOpen();
        return;
      }
      if (e.key === "Escape" && openRef.current) doClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [doOpen, doClose]);

  /* Arrow + Enter navigation inside the palette */
  const handlePaletteKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlighted((h) => Math.min(h + 1, results.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlighted((h) => Math.max(h - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const hit = results[highlighted];
        if (hit) { onPick(hit); doClose(); setQuery(""); }
      } else if (e.key === "Escape") {
        doClose();
      }
    },
    [results, highlighted, onPick, doClose]
  );

  const handlePick = useCallback(
    (entry: SearchEntry) => {
      onPick(entry);
      doClose();
      setQuery("");
    },
    [onPick, doClose]
  );

  const handleQueryChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    setHighlighted(0);
  }, []);

  /* Scroll highlighted item into view */
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const item = list.children[highlighted] as HTMLElement | undefined;
    if (item && typeof item.scrollIntoView === "function") {
      item.scrollIntoView({ block: "nearest" });
    }
  }, [highlighted]);

  if (!open) return null;

  return (
    /* Backdrop */
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Search"
      onClick={doClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(4,5,7,0.82)",
        backdropFilter: "blur(3px)",
        zIndex: 200,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingTop: "18vh",
      }}
    >
      {/* Palette card */}
      <div
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handlePaletteKeyDown}
        style={{
          width: 540,
          maxWidth: "calc(100vw - 32px)",
          background: "#0c0f14",
          border: "1px solid #2a5d63",
          borderRadius: 8,
          boxShadow: "0 30px 80px rgba(0,0,0,.7)",
          overflow: "hidden",
        }}
      >
        {/* Search input */}
        <div style={{ padding: "12px 14px", borderBottom: "1px solid #1a1f29", display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ color: "#5fd3c8", fontFamily: mono, fontSize: 14, flexShrink: 0 }}>⌘K</span>
          <input
            ref={inputRef}
            aria-label="Search the whole site"
            aria-autocomplete="list"
            aria-controls="commandk-listbox"
            aria-activedescendant={results.length > 0 ? `commandk-option-${highlighted}` : undefined}
            value={query}
            onChange={handleQueryChange}
            placeholder="search everything…"
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              color: "#e4e8f0",
              fontFamily: mono,
              fontSize: 14,
              caretColor: "#5fd3c8",
            }}
          />
          <span style={{ fontFamily: mono, fontSize: 10.5, color: "#3a4250", flexShrink: 0 }}>esc to close</span>
        </div>

        {/* Results list */}
        <ul
          id="commandk-listbox"
          ref={listRef}
          role="listbox"
          aria-label="Search results"
          style={{
            listStyle: "none",
            margin: 0,
            padding: 0,
            maxHeight: 320,
            overflowY: "auto",
          }}
        >
          {!query.trim() && (
            <li style={{ fontFamily: mono, fontSize: 11, color: "#7e8798", padding: "12px 16px", textAlign: "center" }}>
              type to search everything
            </li>
          )}
          {query.trim() && results.length === 0 && (
            <li style={{ fontFamily: mono, fontSize: 11, color: "#7e8798", padding: "12px 16px", textAlign: "center" }}>
              no matches
            </li>
          )}
          {results.map((entry, i) => {
            const isHighlighted = i === highlighted;
            return (
              <li
                key={entry.key}
                id={`commandk-option-${i}`}
                role="option"
                aria-selected={isHighlighted}
                onClick={() => handlePick(entry)}
                onMouseEnter={() => setHighlighted(i)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "9px 16px",
                  cursor: "pointer",
                  background: isHighlighted ? "#0e1a1e" : "transparent",
                  borderLeft: isHighlighted ? "2px solid #5fd3c8" : "2px solid transparent",
                  transition: "background .1s",
                }}
              >
                <EntrySwatch entry={entry} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontFamily: "Georgia, serif",
                      fontSize: 14,
                      color: isHighlighted ? "#e8ecf4" : "#d4dae6",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {entry.label}
                  </div>
                  <div
                    style={{
                      fontFamily: mono,
                      fontSize: 10.5,
                      color: "#7e8798",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      marginTop: 1,
                    }}
                  >
                    {entry.sub}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        {/* Footer */}
        <div
          style={{
            borderTop: "1px solid #1a1f29",
            padding: "7px 16px",
            display: "flex",
            gap: 16,
            fontFamily: mono,
            fontSize: 10.5,
            color: "#3a4250",
          }}
        >
          <span>↑↓ navigate</span>
          <span>↵ open</span>
          <span>esc close</span>
        </div>
      </div>
    </div>
  );
}
