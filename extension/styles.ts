// extension/styles.ts — design tokens mirroring the Privacy Atlas web app (lib/styles.ts).
// Every extension surface uses these so the lens looks like part of the app. NOT Figma-first.
export const C = {
  bg: "#070809",
  surface: "#10141b",
  surface2: "#0d1016",
  surface3: "#0a0d12",
  border: "#232a36",
  border2: "#313846",
  text: "#d4dae6",
  textInput: "#e4e8f0",
  muted: "#9aa0b5",
  muted2: "#8893a4",
  muted3: "#969eb0",
  teal: "#5fd3c8",
  tealBorder: "#2a5d63",
  amber: "#f5b878",
  green: "#8ce29a",
  residual: "#b0846a",
} as const;
export const FONT = {
  body: "'Georgia', serif",
  mono: "ui-monospace, 'SF Mono', Menlo, monospace",
} as const;
