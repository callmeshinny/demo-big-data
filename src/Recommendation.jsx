import React, { useMemo, useState } from "react";
import { INVALID_PRODUCT_ID, MISSING, PROJECT_MODELS, modelKey, modelLabel, sessionContext, usersBySession } from "./data.js";
import { ProductCard } from "./ProductCard.jsx";
import { categoryHighlights } from "./product.js";
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
      options.push({ value: `missing:${model}`, label: `${model} — chưa có dự đoán`, run: null, model });
    }
  }
  return options;
}

export default function Recommendation({ state, productInfo }) {
  const { groups = [], issues = [], fatal, error } = state;
  const [groupKey, setGroupKey] = useState("");
  const [choice, setChoice] = useState("");
  const [userId, setUserId] = useState(() => new URLSearchParams(window.location.search).get("user") ?? "");
  const [sessionChoice, setSessionChoice] = useState(() => new URLSearchParams(window.location.search).get("session"));

  const group = groups.find((g) => g.key === groupKey) ?? groups[0];
  const options = useMemo(() => (group ? runOptions(group) : []), [group]);
  const option = options.find((o) => o.value === choice) ?? options[0];

  const sessionUsers = useMemo(() => usersBySession(group), [group]);
  const users = [...new Set(sessionUsers.values())];
  const sessionIds = group?.sessionIds.filter((id) => !userId || sessionUsers.get(id) === userId) ?? [];
  const unknownUser = userId !== "" && !users.includes(userId);
  const unknownSession = sessionChoice !== null && !sessionIds.includes(sessionChoice);
  const sessionId = sessionChoice ?? sessionIds[0] ?? "";

  if (error) return <Notice kind="error" title="Không tải được dữ liệu gợi ý">{error}</Notice>;
  if (fatal) {
    return (
      <>
        <Notice kind="error" title="Dữ liệu gợi ý không hợp lệ">{fatal}</Notice>
        <Issues issues={issues} />
      </>
    );
  }
  if (!group) return <Notice kind="error" title="Không có dữ liệu">demo-data.json không có run nào.</Notice>;

  const selectionError = unknownUser || unknownSession;
  const run = option?.run ?? null;
  const context = sessionContext(group, sessionId);
  const session = run?.sessions.find((s) => s.user_session === sessionId) ?? null;

  const products = productInfo.products;
  const { matchingIds, summary } = categoryHighlights(
    context.prefix, context.prefixCatalog, session?.recommendations, products,
  );

  const changeGroup = (key) => {
    const next = groups.find((g) => g.key === key);
    setGroupKey(key);
    setUserId("");
    setSessionChoice(null);
    // Keep the same model if the new group has it.
    const keep = next && runOptions(next).find((o) => (o.run?.modelKey ?? modelKey(o.model)) === (option?.run?.modelKey ?? modelKey(option?.model)));
    setChoice(keep?.value ?? "");
  };

  return (
    <>
      <Issues issues={issues} />

      <section className="controls" aria-label="Chọn dữ liệu">
        <label>Bộ phiên
          <select value={group.key} onChange={(e) => changeGroup(e.target.value)}>
            {groups.map((g) => <option key={g.key} value={g.key}>{groupLabel(g)}</option>)}
          </select>
        </label>
        <label>Model
          <select value={option?.value ?? ""} onChange={(e) => setChoice(e.target.value)}>
            {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </label>
        {users.length > 0 && (
          <label>Người dùng
            <select value={unknownUser ? "" : userId} onChange={(event) => {
              setUserId(event.target.value);
              setSessionChoice(null);
            }}>
              <option value="">Tất cả</option>
              {users.map((id) => <option value={id} key={id}>{id}</option>)}
            </select>
          </label>
        )}
        <label>Phiên xem
          <select value={sessionIds.includes(sessionId) ? sessionId : ""} onChange={(e) => setSessionChoice(e.target.value)}>
            {selectionError && <option value="" disabled>Chọn phiên</option>}
            {sessionIds.map((id) => <option key={id} value={id}>{id}</option>)}
          </select>
        </label>
      </section>

      {selectionError ? (
        <Notice kind="warn" title={unknownUser ? "Không tìm thấy người dùng" : "Không tìm thấy phiên xem"}>
          <p>{unknownUser ? `Mã người dùng: ${userId}` : `Mã phiên: ${sessionChoice}`}</p>
          <button type="button" onClick={() => { setUserId(""); setSessionChoice(null); }}>
            Chọn lại phiên
          </button>
        </Notice>
      ) : (
        <>
          <div className="meta-row">
            <span>Model: <strong>{modelLabel(run?.model ?? option?.model)}</strong></span>
            <span>Run ID: <strong>{run?.run_id ?? MISSING}</strong></span>
            <span>Subset: <strong>{group.subset ?? MISSING}</strong></span>
            <span>Split: <strong>{group.split ?? MISSING}</strong></span>
            <span>Catalog: <strong>{group.catalogSize !== null ? `${group.catalogSize} items` : MISSING}</strong></span>
            {run?.catalog_sha256 && <span>SHA-256 catalog <code>{run.catalog_sha256}</code></span>}
            <span>Dự đoán <DataKindBadge kind={(run ?? group.runs[0])?.data_kind} /></span>
            {productInfo.dataKind === "toy" && <span>Thông tin sản phẩm <DataKindBadge kind={productInfo.dataKind} /></span>}
          </div>

          <section className="grid">
            <article className="panel">
              <div className="panel-heading">
                <h2>Lịch sử xem</h2>
                <span>{context.prefix ? `${context.prefix.length} lượt xem` : ""}</span>
              </div>
              <p className="definition">Các sản phẩm đã xem trước sản phẩm cuối phiên.</p>
              {context.prefix ? (
                <ol className="history" aria-label="Lịch sử xem">
                  {context.prefix.map((id, index) => (
                    <li key={index}>
                      {index > 0 && <span className="arrow" aria-hidden="true">→</span>}
                      <ProductCard id={id} products={context.prefixCatalog?.has(id) ? products : undefined} />
                    </li>
                  ))}
                </ol>
              ) : <p className="missing">{MISSING}</p>}
            </article>

            <article className="panel actual-panel">
              <h2>Thực tế khách xem tiếp</h2>
              {context.target ? <ProductCard id={context.target} products={context.targetCatalog?.has(context.target) ? products : undefined} /> : <p className="missing">{MISSING}</p>}
            </article>
          </section>

          <section className="panel recommendations">
            <div className="panel-heading">
              <h2>Top-20 gợi ý</h2>
              <span>{option ? (run ? modelLabel(run.model) : option.model) : ""}</span>
            </div>

            {!run ? (
              <div className="empty-state" role="status">
                <strong>Chưa có dự đoán cho model này</strong>
              </div>
            ) : !session ? (
              <div className="empty-state" role="status">
                <strong>{MISSING}</strong>
                <p>Run {run.label} không có session {sessionId}.</p>
              </div>
            ) : !session.recommendations ? (
              <div className="empty-state" role="status">
                <strong>{MISSING}</strong>
                <p>Dữ liệu gợi ý của phiên này bị thiếu hoặc sai định dạng.</p>
              </div>
            ) : (
              <>
                {session.target && session.target !== INVALID_PRODUCT_ID && (
                  <p className={session.targetRank ? "match" : "miss"}>
                    {session.targetRank ? `✅ Trúng ở hạng ${session.targetRank}` : "❌ Ngoài Top-20"}
                  </p>
                )}
                {summary && <p className="definition">{summary}</p>}
                {!run.scoreAvailable && (
                  <p className="definition">TV2 chưa xuất điểm cho từng sản phẩm.</p>
                )}
                <table className="ranking">
                  <thead><tr><th scope="col">Hạng</th><th scope="col">Sản phẩm</th><th scope="col">Điểm</th></tr></thead>
                  <tbody>
                    {session.recommendations.map((r) => {
                      const isTarget = r.product_id === session.target;
                      const inHistory = session.prefix?.includes(r.product_id);
                      return (
                        <tr className={isTarget ? "hit" : ""} key={`${r.rank}-${r.product_id}`}>
                          <td className="rank">{r.rank}</td>
                          <td>
                            <ProductCard id={r.product_id} products={products} />
                            {isTarget && <span className="tag tag-hit">Sản phẩm thực tế</span>}
                            {matchingIds.has(r.product_id) && <span className="tag tag-category">Cùng nhóm</span>}
                            {inHistory && <span className="tag">Đã xem</span>}
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
      )}
    </>
  );
}
