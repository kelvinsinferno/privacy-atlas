"use client";

/* ---------- my devices: global defaults that auto-select the right how-to variant ---------- */

import { useState } from "react";
import { S } from "@/lib/styles";
import { DEVICES } from "@/data/devices";
import LocalOnly from "@/components/common/LocalOnly";

export interface MyDevices {
  phone: string | null;
  desktop: string | null;
  browser: string | null;
}

interface DevicesModalProps {
  myDevices: MyDevices;
  saveDevices: (d: MyDevices) => void;
  onClose: () => void;
}

export default function DevicesModal({ myDevices, saveDevices, onClose }: DevicesModalProps) {
  const [local, setLocal] = useState<MyDevices>(myDevices || { phone: null, desktop: null, browser: null });
  const AXES: [keyof MyDevices, string][] = [["phone", "Your phone"], ["desktop", "Your computer"], ["browser", "Your browser"]];
  return (
    <div style={S.modalWrap} onClick={onClose}>
      <div style={{ ...S.modal, width: 460 }} onClick={(e) => e.stopPropagation()}>
        <div style={S.modalHead}>
          <span style={S.kicker}>MY DEVICES</span>
          <button style={S.skip} onClick={onClose}>close</button>
        </div>
        <p style={{ ...S.modalSub, marginTop: 0 }}>
          Set these once and every how-to opens with exact steps for <b style={{ color: "#fff" }}>your</b> hardware. You can still switch per-step.
        </p>
        <LocalOnly />
        {AXES.map(([axis, label]) => (
          <div key={axis} style={{ marginBottom: 14 }}>
            <div style={S.ctrlLabel}>{label}</div>
            {axis === "phone" ? (
              <select value={local.phone || ""} onChange={(e) => setLocal({ ...local, phone: e.target.value || null })} style={{ ...S.devSelect, width: "100%" }}>
                <option value="">— choose your phone —</option>
                {(DEVICES.phone || []).map((d) => <option key={d.k} value={d.k}>{d.label}</option>)}
              </select>
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {(DEVICES[axis] || []).map((d) => (
                  <button key={d.k} onClick={() => setLocal({ ...local, [axis]: local[axis] === d.k ? null : d.k })}
                    style={{ ...S.devChip, ...(local[axis] === d.k ? S.devChipOn : {}) }}>{d.label}</button>
                ))}
              </div>
            )}
          </div>
        ))}
        <button style={{ ...S.goalBtn, width: "auto", padding: "9px 20px" }} onClick={() => { saveDevices(local); onClose(); }}>save my devices</button>
      </div>
    </div>
  );
}
