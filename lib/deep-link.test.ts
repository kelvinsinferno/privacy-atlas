import { expect, test } from "vitest";
import { parseDeepLink } from "./deep-link";

test("parses ?threat= into a threat selection", () => {
  expect(parseDeepLink("?threat=T-BROKER")).toEqual({ kind: "threat", id: "T-BROKER" });
});
test("parses ?node= into a node selection", () => {
  expect(parseDeepLink("?node=data-broker-removal")).toEqual({ kind: "node", id: "data-broker-removal" });
});
test("returns null when no recognized param is present", () => {
  expect(parseDeepLink("?foo=bar")).toBeNull();
  expect(parseDeepLink("")).toBeNull();
});
test("ignores empty values", () => {
  expect(parseDeepLink("?threat=")).toBeNull();
});
test("threat wins when both params are present", () => {
  expect(parseDeepLink("?node=some-node&threat=T-BROKER")).toEqual({ kind: "threat", id: "T-BROKER" });
});
test("decodes url-encoded values", () => {
  expect(parseDeepLink("?node=a%20b")).toEqual({ kind: "node", id: "a b" });
});
