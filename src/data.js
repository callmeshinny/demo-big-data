// Loading and validation for the two JSON files in public/.
// Pure functions (no React) so they can be tested with `node --test`.

export const MISSING = "Chưa có";
export const NOT_APPLICABLE = "Không áp dụng";

/** Known models of the project, in display order. Used only to list models that have no output yet. */
export const PROJECT_MODELS = ["Popularity", "GRU", "XLNet"];

export function modelKey(name) {
  return typeof name === "string" ? name.trim().toLowerCase() : "";
}

export function modelLabel(name) {
  const found = PROJECT_MODELS.find((m) => modelKey(m) === modelKey(name));
  return found ?? (typeof name === "string" && name.trim() ? name : MISSING);
}

const isObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const isId = (v) => typeof v === "string" && v.trim() !== "";
const isIdList = (v) => Array.isArray(v) && v.every(isId);

/** fetch + parse with readable errors. Returns { data } or { error }. */
export async function loadJson(url, fetchImpl = fetch) {
  let response;
  try {
    response = await fetchImpl(url, { cache: "no-store" });
  } catch (cause) {
    return { error: `Không tải được ${url}: ${cause.message}` };
  }
  if (!response.ok) return { error: `Không tải được ${url}: HTTP ${response.status}` };
  const text = await response.text();
  if (!text.trim()) return { error: `${url} rỗng` };
  try {
    return { data: JSON.parse(text) };
  } catch (cause) {
    return { error: `${url} không phải JSON hợp lệ: ${cause.message}` };
  }
}

// ---------------------------------------------------------------- Part A

function normalizeSession(raw, catalogSet, issues) {
  const id = raw.user_session;
  const problems = [];
  const prefix = isIdList(raw.prefix) ? raw.prefix : null;
  if (!prefix) problems.push("thiếu hoặc sai `prefix`");
  const target = isId(raw.target) ? raw.target : null;
  if (!target) problems.push("thiếu hoặc sai `target`");

  let recommendations = null;
  if (Array.isArray(raw.recommendations)) {
    const ok = raw.recommendations.every((r) => isObject(r) && isId(r.product_id) && Number.isInteger(r.rank));
    if (ok) {
      recommendations = raw.recommendations.map((r) => ({
        rank: r.rank,
        product_id: r.product_id,
        score: typeof r.score === "number" ? r.score : null,
      }));
    } else problems.push("sai `recommendations`");
  } else if (isIdList(raw.top20)) {
    // Contract fallback: artifact order gives the rank. No score is derived.
    recommendations = raw.top20.map((product_id, index) => ({ rank: index + 1, product_id, score: null }));
  } else {
    problems.push("thiếu hoặc sai `top20`");
  }

  let hidden = 0;
  if (recommendations && catalogSet) {
    // Technical IDs (padding/null/OOV/mask) are not in the catalog and are never shown.
    const kept = recommendations.filter((r) => catalogSet.has(r.product_id));
    hidden = recommendations.length - kept.length;
    recommendations = kept;
    if (hidden) problems.push(`ẩn ${hidden} ID không thuộc catalog`);
  }

  let targetRank = null;
  if (recommendations && target) {
    const hit = recommendations.find((r) => r.product_id === target);
    targetRank = hit ? hit.rank : null;
    if (raw.target_rank !== undefined && raw.target_rank !== targetRank) {
      problems.push(`target_rank trong file (${raw.target_rank}) khác thứ tự artifact (${targetRank ?? "ngoài Top-20"})`);
    }
  }

  if (problems.length) issues.push(`Session ${id}: ${problems.join("; ")}`);
  return { user_session: id, prefix, target, recommendations, targetRank, problems };
}

function normalizeRun(raw, index, issues) {
  const label = isId(raw?.run_id) ? raw.run_id : `run #${index + 1}`;
  if (!isObject(raw)) {
    issues.push(`${label}: không phải object, bỏ qua`);
    return null;
  }
  if (!isId(raw.model)) {
    issues.push(`${label}: thiếu \`model\`, bỏ qua`);
    return null;
  }
  if (!Array.isArray(raw.sessions)) {
    issues.push(`${label}: thiếu mảng \`sessions\`, bỏ qua`);
    return null;
  }
  const catalog = isIdList(raw.catalog) && raw.catalog.length ? raw.catalog : null;
  if (!catalog) issues.push(`${label}: thiếu catalog, không lọc được ID kỹ thuật`);
  const catalogSet = catalog ? new Set(catalog) : null;

  const seen = new Set();
  const sessions = [];
  for (const s of raw.sessions) {
    if (!isObject(s) || !isId(s.user_session)) {
      issues.push(`${label}: một session thiếu \`user_session\`, bỏ qua`);
      continue;
    }
    if (seen.has(s.user_session)) {
      issues.push(`${label}: session ${s.user_session} bị trùng, giữ bản đầu`);
      continue;
    }
    seen.add(s.user_session);
    sessions.push(normalizeSession(s, catalogSet, issues));
  }
  if (!sessions.length) issues.push(`${label}: không có session hợp lệ`);

  const provenance = isObject(raw.provenance) ? raw.provenance : {};
  return {
    model: raw.model,
    modelKey: modelKey(raw.model),
    run_id: isId(raw.run_id) ? raw.run_id : null,
    label,
    subset: raw.subset ?? null,
    split: raw.split ?? null,
    data_kind: raw.data_kind ?? null,
    catalog_sha256: raw.catalog_sha256 ?? null,
    catalogSize: catalog ? catalog.length : null,
    evalPartition: provenance.eval_day ?? null,
    experiment: provenance.experiment ?? null,
    scoreAvailable: sessions.some((s) => s.recommendations?.some((r) => r.score !== null)),
    sessions,
  };
}

function groupKey(run) {
  const ids = run.sessions.map((s) => s.user_session).sort().join(",");
  return [run.subset, run.split, run.evalPartition, run.catalog_sha256, ids].join("|");
}

/**
 * Normalize demo-data.json. Accepts the v2 shape { runs: [...] } and the
 * legacy single-run shape { model, sessions, ... }.
 * Returns { groups, issues, fatal }.
 */
export function normalizeDemo(raw) {
  const issues = [];
  if (!isObject(raw)) return { groups: [], issues, fatal: "File dữ liệu không phải JSON object" };
  const rawRuns = Array.isArray(raw.runs) ? raw.runs : Array.isArray(raw.sessions) ? [raw] : null;
  if (!rawRuns) return { groups: [], issues, fatal: "Không tìm thấy `runs` hoặc `sessions`" };

  const runs = rawRuns.map((r, i) => normalizeRun(r, i, issues)).filter((r) => r && r.sessions.length);
  if (!runs.length) return { groups: [], issues, fatal: "Không có run nào có session hợp lệ" };

  const groups = new Map();
  for (const run of runs) {
    const key = groupKey(run);
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        subset: run.subset,
        split: run.split,
        evalPartition: run.evalPartition,
        catalogSize: run.catalogSize,
        sessionIds: run.sessions.map((s) => s.user_session),
        runs: [],
      });
    }
    groups.get(key).runs.push(run);
  }
  return { groups: [...groups.values()], issues, fatal: null };
}

/** History and target for a session, taken from the first run in the group that has them. */
export function sessionContext(group, sessionId) {
  let prefix = null;
  let target = null;
  for (const run of group.runs) {
    const s = run.sessions.find((x) => x.user_session === sessionId);
    if (!s) continue;
    prefix ??= s.prefix;
    target ??= s.target;
  }
  return { prefix, target };
}

// ---------------------------------------------------------------- Part B

export const EXPERIMENTS = ["E1", "E2", "E3", "E4", "E5"];

export function normalizeResults(raw) {
  const issues = [];
  if (!isObject(raw)) return { runs: [], meta: {}, issues, fatal: "File kết quả không phải JSON object" };
  if (!Array.isArray(raw.runs)) return { runs: [], meta: {}, issues, fatal: "Không tìm thấy mảng `runs`" };
  const runs = [];
  raw.runs.forEach((r, i) => {
    if (!isObject(r) || !isId(r.run_id) || !isId(r.experiment)) {
      issues.push(`Record #${i + 1}: thiếu \`run_id\` hoặc \`experiment\`, bỏ qua`);
      return;
    }
    runs.push({
      ...r,
      model: r.model ?? null,
      kind: r.kind ?? (r.model ? "model" : "io"),
      matrix_run_id: r.matrix_run_id ?? r.run_id,
      planned: isObject(r.planned) ? r.planned : {},
      actual: isObject(r.actual) ? r.actual : {},
      environment: isObject(r.environment) ? r.environment : {},
      metrics: isObject(r.metrics) ? r.metrics : {},
      sources: isObject(r.sources) ? r.sources : {},
    });
  });
  return {
    runs,
    meta: {
      package_id: raw.package_id ?? null,
      confirmed_by_tv2: raw.confirmed_by_tv2 === true,
      team_commit: raw.team_commit ?? null,
    },
    issues,
    fatal: null,
  };
}

/** Official = not toy. Toy runs are reference only and never mixed with official ones. */
export function splitByKind(runs, experiment) {
  const inExp = runs.filter((r) => r.experiment === experiment);
  return {
    official: inExp.filter((r) => r.data_kind !== "toy"),
    toy: inExp.filter((r) => r.data_kind === "toy"),
  };
}

// ---------------------------------------------------------------- formatting

/** Display a delivered value. Never invents: null/undefined -> "Chưa có". */
export function formatValue(value) {
  if (value === null || value === undefined || value === "") return MISSING;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return String(value);
    if (Number.isInteger(value)) return value.toLocaleString("en-US");
    return Number(value.toPrecision(4)).toLocaleString("en-US", { maximumFractionDigits: 10 });
  }
  if (typeof value === "boolean") return value ? "true" : "false";
  if (Array.isArray(value)) return value.length ? value.map(formatValue).join(", ") : MISSING;
  if (isObject(value)) {
    const entries = Object.entries(value);
    return entries.length ? entries.map(([k, v]) => `${k}: ${formatValue(v)}`).join(" · ") : MISSING;
  }
  return String(value);
}

/** Full-precision text for a tooltip. */
export function exactValue(value) {
  if (value === null || value === undefined) return MISSING;
  return typeof value === "object" ? JSON.stringify(value) : String(value);
}

// Planned/actual fields that do not apply to a model, per contract section 2.
const POPULARITY_NA = new Set([
  "train_batch_size", "eval_batch_size", "epochs", "seed", "learning_rate", "device",
  "peak_cuda_reserved_bytes",
]);

export function isApplicable(run, field) {
  if (modelKey(run.model) === "popularity") return !POPULARITY_NA.has(field);
  return true;
}

export function displayCell(run, field, value) {
  if ((value === null || value === undefined) && !isApplicable(run, field)) return NOT_APPLICABLE;
  return formatValue(value);
}

// Fields where planned and actual can be compared directly.
const COMPARABLE = new Set([
  "train_batch_size", "eval_batch_size", "epochs", "sequence_length", "seed",
  "learning_rate", "subset", "split", "device", "input_format",
]);

/** "same" | "different" | null (not comparable or a side is missing). */
export function compareConfig(field, planned, actual) {
  if (!COMPARABLE.has(field)) return null;
  if (planned === null || planned === undefined || actual === null || actual === undefined) return null;
  return String(planned).toLowerCase() === String(actual).toLowerCase() ? "same" : "different";
}
