import React from "react";
import { t } from "./i18n.js";

/**
 * "Key finding" callout (TV2 analysis.md, 24/11). Neutral highlight with no new colour meaning:
 * solid surface, 4 px --label left border, card radius and shadow; no glass, accent, green or red.
 * The headline is optional: it is passed only when the JSON values agree with it (src/findings.js).
 */
export function KeyFinding({ finding, level = 3, showLabel = true }) {
  const Heading = `h${level}`;
  return <aside className="key-finding" aria-label={t("key_finding")}>
    {showLabel && <p className="kf-label">{t("key_finding")}</p>}
    {finding.headline && <Heading className="kf-headline">{finding.headline}</Heading>}
    <p className="kf-body">{finding.body}</p>
    {finding.caveat && <p className="kf-caveat">{finding.caveat}</p>}
    <p className="kf-source">{t("kf_source")}</p>
  </aside>;
}
