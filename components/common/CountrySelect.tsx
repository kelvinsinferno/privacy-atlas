"use client";
import { S } from "@/lib/styles";
import { COUNTRIES } from "@/data/countries";

interface CountrySelectProps {
  value: string;
  onChange: (code: string) => void;
  placeholder?: string;
  style?: React.CSSProperties;
  ariaLabel?: string;
}

/** A single <select> over the ISO country list. Used by onboarding + the header. */
export default function CountrySelect({ value, onChange, placeholder = "— select your country —", style, ariaLabel = "your country" }: CountrySelectProps) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} aria-label={ariaLabel} style={{ ...S.input, marginBottom: 0, ...style }}>
      <option value="">{placeholder}</option>
      {COUNTRIES.map((c) => (
        <option key={c.code} value={c.code}>{c.flag} {c.name}</option>
      ))}
    </select>
  );
}
