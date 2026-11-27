import React from "react";
import { t } from "./i18n.js";

/**
 * "Key finding" callout (TV2 analysis.md, 24/11). Neutral highlight with no new colour meaning:
 * solid surface, 4 px --label left border, card radius and shadow; no glass, accent, green or red.
 * The headline is optional: it is passed only when the JSON values agree with it (src/findings.js).
 * The source line is shown once per tab (KeyFindingSource), not in every callout.
 */
export function KeyFinding({ finding, level = 3, showLabel = true }) {
  const Heading = `h${level}`;
  return <aside className="key-finding" aria-label={t("key_finding")}>
    {showLabel && <p className="kf-label">{t("key_finding")}</p>}
    {finding.headline && <Heading className="kf-headline">{finding.headline}</Heading>}
    <p className="kf-body">{finding.body}</p>
    {finding.caveat && <p className="kf-caveat">{finding.caveat}</p>}
  </aside>;
}

/** One footnote per tab naming where the Key findings come from. */
export function KeyFindingSource() {
  return <p className="definition kf-footnote">{t("kf_source_footnote")}</p>;
}
