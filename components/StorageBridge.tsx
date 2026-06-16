"use client";
import { useEffect } from "react";
import { storage } from "@/lib/storage";
declare global { interface Window { storage: typeof storage } }
export default function StorageBridge() {
  useEffect(() => { window.storage = storage; }, []);
  return null;
}
