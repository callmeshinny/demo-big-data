import { test } from "node:test";
import assert from "node:assert/strict";
import { presentationExamples } from "../src/presentation.js";
import { routeFromHash } from "../src/navigation.js";

test("presentation selects the first observed session of each case", () => {
  const sessions = [
    { user_session: "missing", target: "p3", targetRank: null },
    ...[null, 2, 1, 4].map((targetRank, index) => ({
      user_session: String(index), target: "p3", targetRank, recommendations: [{}],
    })),
  ];
  assert.deepEqual(presentationExamples({ sessions }), { ids: ["2", "1", "0"], unavailable: [] });
  assert.deepEqual(presentationExamples({ sessions: sessions.slice(0, 1) }).ids, []);
});

test("experiment hashes and presentation resolve to their views", () => {
  assert.deepEqual(routeFromHash("#experiments-e4"), { tab: "experiments", experiment: "E4", presenting: false });
  assert.deepEqual(routeFromHash("#present"), { tab: "recommendation", presenting: true });
  assert.equal(routeFromHash("#data").tab, "data");
  assert.equal(routeFromHash("#other").tab, "recommendation");
});
