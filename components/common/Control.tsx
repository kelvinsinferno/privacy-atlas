import React from "react";
import { S } from "@/lib/styles";

interface ControlProps {
  label: string;
  children: React.ReactNode;
}

export default function Control({ label, children }: ControlProps) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={S.ctrlLabel}>{label}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{children}</div>
    </div>
  );
}
