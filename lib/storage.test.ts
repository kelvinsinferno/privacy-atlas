import { beforeEach, expect, test } from "vitest";
import { storage } from "./storage";

beforeEach(() => localStorage.clear());


test("set then get round-trips a private value", async () => {
  await storage.set("profile", JSON.stringify({ worry: "brokers" }), false);
  const r = await storage.get("profile", false);
  expect(JSON.parse(r!.value).worry).toBe("brokers");
});
test("get of an unset key returns null", async () => {
  expect(await storage.get("nope", false)).toBeNull();
});
test("shared and private namespaces do not collide", async () => {
  await storage.set("k", "priv", false);
  await storage.set("k", "shar", true);
  expect((await storage.get("k", false))!.value).toBe("priv");
  expect((await storage.get("k", true))!.value).toBe("shar");
});
test("set does not reject when localStorage.setItem throws (quota/private mode)", async () => {
  const orig = window.localStorage.setItem;
  window.localStorage.setItem = () => { throw new Error("QuotaExceededError"); };
  try {
    await expect(storage.set("k", "v", false)).resolves.toBeUndefined();
  } finally {
    window.localStorage.setItem = orig;
  }
});
test("get returns null when localStorage.getItem throws", async () => {
  const orig = window.localStorage.getItem;
  window.localStorage.getItem = () => { throw new Error("SecurityError"); };
  try {
    await expect(storage.get("k", false)).resolves.toBeNull();
  } finally {
    window.localStorage.getItem = orig;
  }
});
