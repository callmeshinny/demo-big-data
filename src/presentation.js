import { t } from "./i18n.js";
import { INVALID_PRODUCT_ID } from "./data.js";

const CASES = () => [
  [t("first_rank"), (rank) => rank === 1],
  [t("lower_rank_hit"), (rank) => rank > 1],
  [t("outside_the_list"), (rank) => rank === null],
];

export function presentationExamples(run) {
  const ids = [];
  const unavailable = [];
  for (const [label, matches] of CASES()) {
    const example = run?.sessions.find((session) =>
      session.target && session.target !== INVALID_PRODUCT_ID && session.recommendations?.length && matches(session.targetRank));
    if (example) ids.push(example.user_session);
    else unavailable.push(label);
  }
  return { ids, unavailable };
}
