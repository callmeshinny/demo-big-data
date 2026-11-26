import React from "react";
import { t } from "./i18n.js";

export const VIEWS = () => [
  { id: "recommendation", label: t("recommendations") },
  { id: "data", label: t("dataset") },
  { id: "experiments", label: t("experiments_e1_e5") },
];

/** Link navigation styled as a segmented control. The current view carries aria-current="page". */
export function MainNav({ tab }) {
  return <nav className="segmented tabs" aria-label={t("views_2")}>
    {VIEWS().map(({ id, label }) => (
      <a key={id} href={`#${id}`} aria-current={tab === id ? "page" : undefined}>{label}</a>
    ))}
  </nav>;
}

export function LanguageSwitch({ language, onChoose }) {
  return <div className="segmented segmented-small language-switch" role="group" aria-label={t("language")}>
    {["en", "vi"].map((code) => <button type="button" key={code}
      aria-pressed={language === code} onClick={() => onChoose(code)}>{code.toUpperCase()}</button>)}
  </div>;
}
