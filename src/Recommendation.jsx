import { t } from "./i18n.js";
import React, { useState } from "react";
import { formatValue, INVALID_PRODUCT_ID, modelLabel, sessionContext } from "./data.js";
import EvaluationProtocol from "./EvaluationProtocol.jsx";
import { ProductCard } from "./ProductCard.jsx";
import { Issues, Notice } from "./ui.jsx";

/** The official E1 runs are all present in the delivered sample. */
function runOptions(group) {
  return group.runs.map((run) => ({
    value: `run:${run.label}`,
    label: modelLabel(run.model),
    run,
  }));
}

export default function Recommendation({ state, productInfo, protocol, official }) {
  const { groups = [], issues = [], fatal, error } = state;
  const [choice, setChoice] = useState("");
  const [sessionChoice, setSessionChoice] = useState(() => new URLSearchParams(window.location.search).get("session"));

  const group = groups[0];
  const options = group ? runOptions(group) : [];
  const option = options.find((o) => o.value === choice) ?? options[0];

  const sessionIds = group?.sessionIds ?? [];
  const unknownSession = sessionChoice !== null && !sessionIds.includes(sessionChoice);
  const sessionId = sessionChoice ?? sessionIds[0] ?? "";

  if (error) return <Notice kind="error" title={t("could_not_load_recommendation_data")}>{error}</Notice>;
  if (fatal) {
    return (
      <>
        <Notice kind="error" title={t("invalid_recommendation_data")}>{fatal}</Notice>
        <Issues issues={issues} />
      </>
    );
  }
  if (!group) return <Notice kind="error" title={t("no_data")}>{t("demo_data_json_contains_no_runs")}</Notice>;

  const selectionError = unknownSession;
  const run = option?.run ?? null;
  const context = sessionContext(group, sessionId);
  const session = run?.sessions.find((s) => s.user_session === sessionId) ?? null;
  const officialE1 = official?.tables?.E1 ?? [];
  const sample = run?.sample;
  const count = sample?.n_selected ?? sessionIds.length;
  const total = sample?.n_total ?? sessionIds.length;

  const products = productInfo?.dataKind === "real" ? productInfo.products : undefined;

  return (
    <>
      <div className="recommendation-status">
        <span className="badge badge-real">{t("real_e1_predictions_partition", group.evalPartition ?? "—")}</span>
        <span>{t("showing_fixed_hash_sample", formatValue(count), formatValue(total), sample?.seed ?? "—")}</span>
      </div>
      <details className="method-details">
        <summary>{t("method_details_and_sources")}</summary>
        <p>{t("recall_20_measures_how_often_the")}</p>
        <EvaluationProtocol protocol={protocol} />
        <p>{t("optional_product_lookup_missing")}</p>
        <p>{t("sample_hash_explanation", sample?.seed ?? "—", formatValue(count))}</p>
      </details>
      <Issues issues={issues} />
      <section className="controls" aria-label={t("choose_data")}>
        <label>{t("model")} <select aria-label={t("model")} value={option?.value ?? ""} onChange={(e) => setChoice(e.target.value)}>
            {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </label>
        <label>{t("session")} <select aria-label={t("session")} value={sessionIds.includes(sessionId) ? sessionId : ""} onChange={(e) => setSessionChoice(e.target.value)}>
            {selectionError && <option value="" disabled>{t("choose_a_session")}</option>}
            {sessionIds.map((id) => <option key={id} value={id}>{id}</option>)}
          </select>
        </label>
      </section>
      <section className="e1-accuracy" aria-label={t("official_e1_metrics")}>
        <strong className="e1-accuracy-title">{t("official_e1_metrics")}</strong>
        {officialE1.map((row) => <div key={row.run_id}><strong>{modelLabel(row.model)}</strong>
          <span>{t("e1_recall_20")}: {Number(row["Recall@20"]).toFixed(4)}</span>
          <span>{t("e1_ndcg_20")}: {Number(row["NDCG@20"]).toFixed(4)}</span>
        </div>)}
      </section>

      {selectionError ? (
        <Notice kind="warn" title={t("session_not_found")}>
          <p>{t("session_id_0", sessionChoice)}</p>
          <button type="button" onClick={() => setSessionChoice(null)}>{t("choose_another_session")} </button>
        </Notice>
      ) : (
        <>
          <section className="grid">
            <article className="panel">
              <div className="panel-heading">
                <h2>{t("history")}</h2>
                <span>{context.prefix ? t("0_interactions", context.prefix.length) : ""}</span>
              </div>
              <p className="definition">{t("interaction_history_before_the_final_item")}</p>
              {context.prefix ? (
                <ol className="history" aria-label={t("history")}>
                  {context.prefix.map((id, index) => (
                    <li key={index}>
                      {index > 0 && <span className="arrow" aria-hidden="true">→</span>}
                      <ProductCard id={id} products={context.prefixCatalog?.has(id) ? products : undefined} />
                    </li>
                  ))}
                </ol>
              ) : <p className="missing">{t("not_available_yet")}</p>}
            </article>

            <article className="panel actual-panel">
              <h2>{t("actual_next_item")}</h2>
              {context.target ? <ProductCard id={context.target} products={context.targetCatalog?.has(context.target) ? products : undefined} /> : <p className="missing">{t("not_available_yet")}</p>}
              {session?.target && session.target !== INVALID_PRODUCT_ID && <p className={session.targetRank ? "match" : "miss"}>{session.targetRank ? t("hit_at_rank_0", session.targetRank) : t("not_in_top_20")}</p>}
            </article>
          </section>

          <section className="panel recommendations">
            <div className="panel-heading">
              <h2>{t("top_20_recommendations")}</h2>
              <span>{option ? (run ? modelLabel(run.model) : option.model) : ""}</span>
            </div>

            {!run ? (
              <div className="empty-state" role="status">
                <strong>{t("no_predictions_available_for_this_model")}</strong>
              </div>
            ) : !session ? (
              <div className="empty-state" role="status">
                <strong>{t("not_available_yet")}</strong>
                <p>{t("run")} {run.label} {t("does_not_contain_session")} {sessionId}.</p>
              </div>
            ) : !session.recommendations ? (
              <div className="empty-state" role="status">
                <strong>{t("not_available_yet")}</strong>
                <p>{t("the_recommendations_for_this_session_are")}</p>
              </div>
            ) : (
              <>
                <table className="ranking">
                  <thead><tr><th scope="col">{t("rank")}</th><th scope="col">{t("products")}</th><th scope="col">{t("score")}</th></tr></thead>
                  <tbody>
                    {session.recommendations.map((r) => {
                      const isTarget = r.product_id === session.target;
                      const inHistory = session.prefix?.includes(r.product_id);
                      return (
                        <tr className={isTarget ? "hit" : ""} key={`${r.rank}-${r.product_id}`}>
                          <td className="rank">{r.rank}</td>
                          <td>
                            <ProductCard id={r.product_id} products={products} />
                            {isTarget && <span className="tag tag-hit">{t("actual_item")}</span>}
                            {inHistory && <span className="tag tag-history">{t("in_history")}</span>}
                          </td>
                          <td className="missing score"><small>{t("not_available_yet")}</small></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {!run.scoreAvailable && <p className="definition">{t("ranked_ids_only")}</p>}
              </>
            )}
          </section>
        </>
      )}
    </>
  );
}
