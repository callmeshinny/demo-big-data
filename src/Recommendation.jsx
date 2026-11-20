import React, { useEffect, useMemo, useState } from "react";
import { MISSING, PROJECT_MODELS, modelKey, modelLabel, sessionContext } from "./data.js";
import { DataKindBadge, Issues, Notice } from "./ui.jsx";

function groupLabel(group) {
  const parts = [
    group.subset ?? "subset ?",
    group.split ?? "split ?",
    group.evalPartition !== null ? `partition ${group.evalPartition}` : null,
    `${group.sessionIds.length} session`,
  ].filter(Boolean);
  return parts.join(" · ");
}

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
      options.push({ value: `missing:${model}`, label: `${model} — chưa có output`, run: null, model });
    }
  }
  return options;
}

export default function Recommendation({ state }) {
  const { groups = [], issues = [], fatal, error } = state;
  const [groupKey, setGroupKey] = useState("");
  const [choice, setChoice] = useState("");
  const [sessionId, setSessionId] = useState("");

  const group = groups.find((g) => g.key === groupKey) ?? groups[0];
  const options = useMemo(() => (group ? runOptions(group) : []), [group]);
  const option = options.find((o) => o.value === choice) ?? options[0];

  // Keep the session valid for the current group without resetting the model choice.
  useEffect(() => {
    if (group && !group.sessionIds.includes(sessionId)) setSessionId(group.sessionIds[0] ?? "");
  }, [group, sessionId]);

  if (error) return <Notice kind="error" title="Không tải được dữ liệu recommendation">{error}</Notice>;
  if (fatal) {
    return (
      <>
        <Notice kind="error" title="Dữ liệu recommendation không hợp lệ">{fatal}</Notice>
        <Issues issues={issues} />
      </>
    );
  }
  if (!group) return <Notice kind="error" title="Không có dữ liệu">demo-data.json không có run nào.</Notice>;

  const run = option?.run ?? null;
  const context = sessionContext(group, sessionId);
  const session = run?.sessions.find((s) => s.user_session === sessionId) ?? null;

  const changeGroup = (key) => {
    const next = groups.find((g) => g.key === key);
    setGroupKey(key);
    // Keep the same model if the new group has it.
    const keep = next && runOptions(next).find((o) => (o.run?.modelKey ?? modelKey(o.model)) === (option?.run?.modelKey ?? modelKey(option?.model)));
    setChoice(keep?.value ?? "");
  };

  return (
    <>
      <Issues issues={issues} />

      <section className="controls" aria-label="Chọn dữ liệu">
        <label>Bộ session
          <select value={group.key} onChange={(e) => changeGroup(e.target.value)}>
            {groups.map((g) => <option key={g.key} value={g.key}>{groupLabel(g)}</option>)}
          </select>
        </label>
        <label>Model / run
          <select value={option?.value ?? ""} onChange={(e) => setChoice(e.target.value)}>
            {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </label>
        <label>Session
          <select value={sessionId} onChange={(e) => setSessionId(e.target.value)}>
            {group.sessionIds.map((id) => <option key={id} value={id}>{id}</option>)}
          </select>
        </label>
      </section>

      <div className="meta-row">
        <span>Run ID: <strong>{run?.run_id ?? MISSING}</strong></span>
        <span>Subset: <strong>{group.subset ?? MISSING}</strong></span>
        <span>Split: <strong>{group.split ?? MISSING}</strong></span>
        <span>Catalog: <strong>{group.catalogSize !== null ? `${group.catalogSize} items` : MISSING}</strong></span>
        {run ? <DataKindBadge kind={run.data_kind} /> : <DataKindBadge kind={group.runs[0]?.data_kind} />}
      </div>

      <section className="grid">
        <article className="panel">
          <div className="panel-heading">
            <div><p className="eyebrow">Input</p><h2>Session history</h2></div>
            <span>{context.prefix ? `${context.prefix.length} item${context.prefix.length === 1 ? "" : "s"}` : ""}</span>
          </div>
          <p className="definition">Prefix trước item cuối (item cuối được tách làm target)</p>
          {context.prefix ? (
            <ol className="history" aria-label="Session history">
              {context.prefix.map((id, index) => (
                <li key={`${id}-${index}`}>
                  {index > 0 && <span className="arrow" aria-hidden="true">→</span>}
                  <span className="product-chip">{id}</span>
                </li>
              ))}
            </ol>
          ) : <p className="missing">{MISSING}</p>}
        </article>

        <article className="panel actual-panel">
          <p className="eyebrow">Ground truth</p>
          <h2>Actual next item</h2>
          <div className={context.target ? "actual-id" : "actual-id missing"}>{context.target ?? MISSING}</div>
          {session?.recommendations && session.target ? (
            <p className={session.targetRank ? "match" : "miss"}>
              {session.targetRank ? `Hit · rank ${session.targetRank} / 20` : "Miss · ngoài Top-20"}
            </p>
          ) : <p className="muted">Kết quả hit/miss: {MISSING}</p>}
        </article>
      </section>

      <section className="panel recommendations">
        <div className="panel-heading">
          <div><p className="eyebrow">Output</p><h2>Top-20 recommendations</h2></div>
          <span>{option ? (run ? modelLabel(run.model) : option.model) : ""}</span>
        </div>

        {!run ? (
          <div className="empty-state" role="status">
            <strong>{MISSING}</strong>
            <p>{option?.model} chưa có prediction output cho bộ session này. Không hiển thị ranking giả.</p>
          </div>
        ) : !session ? (
          <div className="empty-state" role="status">
            <strong>{MISSING}</strong>
            <p>Run {run.label} không có session {sessionId}.</p>
          </div>
        ) : !session.recommendations ? (
          <div className="empty-state" role="status">
            <strong>{MISSING}</strong>
            <p>Dữ liệu recommendation của session này bị thiếu hoặc sai định dạng.</p>
          </div>
        ) : (
          <>
            {!run.scoreAvailable && (
              <p className="definition">Score: {MISSING} — TV2 chưa xuất score theo từng item. Thứ hạng giữ đúng thứ tự artifact.</p>
            )}
            <table className="ranking">
              <thead><tr><th scope="col">Rank</th><th scope="col">Product ID</th><th scope="col">Score</th></tr></thead>
              <tbody>
                {session.recommendations.map((r) => {
                  const isTarget = r.product_id === session.target;
                  const inHistory = session.prefix?.includes(r.product_id);
                  return (
                    <tr className={isTarget ? "hit" : ""} key={`${r.rank}-${r.product_id}`}>
                      <td className="rank">{r.rank}</td>
                      <td>
                        <span className="rank-id">{r.product_id}</span>
                        {isTarget && <span className="tag tag-hit">Actual next item</span>}
                        {inHistory && <span className="tag">Đã có trong history</span>}
                      </td>
                      <td className={r.score === null ? "missing score" : "score"}>{r.score === null ? MISSING : r.score}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </>
        )}
      </section>
    </>
  );
}
