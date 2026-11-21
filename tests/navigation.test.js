import { test } from "node:test";
import assert from "node:assert/strict";
import { routeFromHash } from "../src/navigation.js";

test("deep links open their tabs, with old presentation links opening Recommendations", () => {
  assert.deepEqual(routeFromHash("#experiments-e4"), { tab: "experiments", experiment: "E4" });
  assert.deepEqual(routeFromHash("#present"), { tab: "recommendation" });
  assert.equal(routeFromHash("#data").tab, "data");
  assert.equal(routeFromHash("#other").tab, "recommendation");
});
