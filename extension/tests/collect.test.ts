import { describe, it, expect } from "vitest";
import { hostsFromEntries, toResourceSignals } from "../lib/collect";

describe("collect", () => {
  it("extracts unique third-party hosts from resource entry names", () => {
    const hosts = hostsFromEntries(
      ["https://google-analytics.com/g.js", "https://google-analytics.com/c.js", "https://cdn.self.test/a.js"],
      "self.test",
    );
    expect(hosts).toEqual(["google-analytics.com", "cdn.self.test"]);
  });
  it("drops same-site (first-party) hosts when excludeHost matches the page", () => {
    const hosts = hostsFromEntries(["https://self.test/app.js"], "self.test");
    expect(hosts).toEqual([]);
  });
  it("wraps hosts as resource signals", () => {
    expect(toResourceSignals(["a.com"])).toEqual([{ kind: "resource", value: "a.com" }]);
  });
});
