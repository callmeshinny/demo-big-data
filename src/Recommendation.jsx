import { t } from "./i18n.js";
import React, { useState } from "react";
import { INVALID_PRODUCT_ID, PROJECT_MODELS, modelKey, modelLabel, sessionContext } from "./data.js";
import EvaluationProtocol from "./EvaluationProtocol.jsx";
import { ProductCard } from "./ProductCard.jsx";
import { Issues, Notice } from "./ui.jsx";

/** Options for the model/run selector: every delivered run, plus project models with no output. */
function runOptions(group) {
  const options = group.runs.map((run) => ({
    value: `run:${run.label}`,
    label: group.runs.filter((r) => r.modelKey === run.modelKey).length > 1
      ? `${modelLabel(run.model)} — ${run.label}`
      : modelLabel(run.model),
    run,
  }));
  for (const model of PROJECT_MODELS) {
    if (!group.runs.some((r) => r.modelKey === modelKey(model))) {
      options.push({ value: `missing:${model}`, label: t("0_predictions_pending", model), run: null, model });
    }
  }
  return options;
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

  const products = productInfo?.dataKind === "real" ? productInfo.products : undefined;

  return (
    <>
      <div className="recommendation-status">
        <span className="badge badge-pending">{t("waiting_for_real_prediction_bundle")}</span>
      </div>
      <Notice kind="warn" title={t("real_prediction_bundle_missing")}>
        <p>{t("missing_real_bundle_files")}</p>
        <ul>{officialE1.length ? officialE1.map((row) => <li key={row.run_id}><code>{`../tv4-real-bundle/${row.run_id}.predictions.jsonl`}</code></li>) : <li>{t("e1_prediction_files")}</li>}
          <li><code>../tv4-real-bundle/catalog.json</code></li>
        </ul>
        <p>{t("optional_product_lookup_missing")}</p>
      </Notice>
      <details className="method-details">
        <summary>{t("method_details_and_sources")}</summary>
        <p>{t("recall_20_measures_how_often_the")}</p>
        <EvaluationProtocol protocol={protocol} />
        <p>{t("prediction_files")}</p>
        <ul>{officialE1.map((row) => <li key={row.run_id}><code>{`../tv4-real-bundle/${row.run_id}.predictions.jsonl`}</code></li>)}
          <li><code>../tv4-real-bundle/catalog.json</code></li>
        </ul>
        <ul>{officialE1.map((row) => {
          const config = official?.configs?.[row.run_id] ?? {};
          return <li key={row.run_id}>
            {t("run_id")} <code>{row.run_id}</code>; {t("catalog_sha_256")} <code>{config.catalog_sha256 ?? t("not_available_yet")}</code>; {t("source_metrics")} <code>{config.source_metrics ?? t("not_available_yet")}</code>
          </li>;
        })}</ul>
        <p>{t("prediction_sources")}</p>
      </details>

      <details className="toy-format-example">
        <summary>{t("format_example_toy_data_not_results")}</summary>
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
      </details>
    </>
  );
}
