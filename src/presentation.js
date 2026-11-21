import { INVALID_PRODUCT_ID } from "./data.js";

const CASES = [
  ["hạng đầu", (rank) => rank === 1],
  ["trúng ở hạng sau", (rank) => rank > 1],
  ["ngoài danh sách", (rank) => rank === null],
];

export function presentationExamples(run) {
  const ids = [];
  const unavailable = [];
  for (const [label, matches] of CASES) {
    const example = run?.sessions.find((session) =>
      session.target && session.target !== INVALID_PRODUCT_ID && session.recommendations?.length && matches(session.targetRank));
    if (example) ids.push(example.user_session);
    else unavailable.push(label);
  }
  return { ids, unavailable };
}
