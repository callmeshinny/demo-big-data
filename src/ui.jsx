import React from "react";

export function Notice({ kind = "info", title, children }) {
  return (
    <section className={`notice notice-${kind}`} role={kind === "error" ? "alert" : "status"}>
      {title && <strong>{title}</strong>}
      {children && <div>{children}</div>}
    </section>
  );
}

export function DataKindBadge({ kind }) {
  if (kind === "toy") return <span className="badge badge-toy" title="Dữ liệu toy: chỉ kiểm tra định dạng, không phải kết quả benchmark">TOY · không phải benchmark</span>;
  if (kind === "real") return <span className="badge badge-real">Dữ liệu thật</span>;
  return <span className="badge badge-unknown" title="Artifact chưa ghi data_kind">data_kind: Chưa có</span>;
}

export function StatusBadge({ status }) {
  if (!status) return <span className="badge badge-unknown">Trạng thái: Chưa có</span>;
  return <span className={`badge badge-status-${status}`}>{status}</span>;
}

export function Issues({ issues }) {
  if (!issues?.length) return null;
  return (
    <details className="issues">
      <summary>{issues.length} cảnh báo về dữ liệu</summary>
      <ul>{issues.map((issue, i) => <li key={i}>{issue}</li>)}</ul>
    </details>
  );
}
