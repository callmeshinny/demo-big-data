import React, { useState } from "react";
import { formatValue, MISSING } from "./data.js";
import { histogramBuckets } from "./dataset.js";
import { Notice } from "./ui.jsx";

const ROWS = [
  ["Sự kiện tuần trước làm sạch", "n_events"],
  ["Sự kiện sau bỏ lặp liên tiếp", "events_after_repeat_removal"],
  ["Phiên", "distinct", "user_session"],
  ["Người dùng", "distinct", "user_id"],
  ["Sản phẩm", "distinct", "product_id"],
  ["Danh mục", "distinct", "category_code"],
  ["Thương hiệu", "distinct", "brand"],
  ["Thiếu thương hiệu", "missing", "brand"],
  ["Thiếu danh mục", "missing", "category_code"],
  ["Lượt xem", "event_types", "view"],
  ["Thêm vào giỏ", "event_types", "cart"],
  ["Mua hàng", "event_types", "purchase"],
  ["Chuỗi đủ điều kiện", "sequence_count"],
  ["Kích thước từ vựng", "vocabulary_size"],
];

const PIPELINE = [
  ["CSV gốc", "Đọc các sự kiện của cửa hàng.", "TV1"],
  ["Làm sạch", "Chuẩn hóa thời gian, bỏ phiên null và sản phẩm lặp liên tiếp.", "TV1"],
  ["First-seen tháng", "Ghi nhận lần xuất hiện đầu tiên của sản phẩm.", "TV1"],
  ["Fit workflow", "Tạo mapping và catalog.", "TV1"],
  ["Tạo chuỗi", "Giữ tối đa 20 sản phẩm mỗi chuỗi.", "TV1"],
  ["Chia tập", "Chia train, validation và test theo ngày.", "TV1"],
  ["Model", "Huấn luyện và chạy đánh giá.", "TV2 / TV3"],
  ["Top-20", "Xuất danh sách gợi ý cho từng phiên.", "TV2"],
];

export default function Dataset({ state }) {
  const [selected, setSelected] = useState("");
  if (state.error || state.fatal) return <Notice kind="error" title="Không tải được dữ liệu tập dữ liệu">{state.error ?? state.fatal}</Notice>;
  const { overview } = state;
  const raw = overview.raw_month;
  const subset = overview.subsets.find((row) => String(row.subset) === selected) ?? overview.subsets[0];
  const buckets = histogramBuckets(subset?.session_length_histogram);
  const max = Math.max(0, ...buckets.map((bucket) => bucket.count ?? 0));
  return (
    <>
      {!overview.confirmed_by_tv1 && <Notice kind="warn" title="Số liệu lấy từ manifest TV1, chờ TV1 xác nhận hiển thị" />}
      <section className="panel">
        <h2>Dữ liệu thương mại điện tử</h2>
        <p>Tập Kaggle eCommerce ghi lại hoạt động trong cửa hàng đa danh mục vào tháng 10/2019. Mỗi sự kiện là một lượt xem, thêm vào giỏ hoặc mua sản phẩm. Một phiên nhóm các sự kiện trong cùng lượt truy cập.</p>
        <h3>Dữ liệu gốc cả tháng</h3>
        <dl className="env">
          {[
            ["Số dòng", raw.row_count], ["Bắt đầu (UTC)", raw.min_timestamp_utc], ["Kết thúc (UTC)", raw.max_timestamp_utc],
            ["Thiếu thương hiệu", raw.missing?.brand], ["Thiếu danh mục", raw.missing?.category_code],
          ].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{formatValue(value)}</dd></div>)}
        </dl>
        <p className="definition">Nguồn <code>{formatValue(raw.source)}</code></p>
      </section>
      <section className="panel">
        <h2>Các tập con cuDF trong tuần</h2>
        <div className="table-scroll">
          <table className="config-table">
            <thead><tr><th scope="col">Chỉ số</th>{overview.subsets.map((row) => <th scope="col" key={row.subset}>{row.subset}%</th>)}</tr></thead>
            <tbody>{ROWS.map(([label, field, key]) => <tr key={label}><th scope="row">{label}</th>{overview.subsets.map((row) => <td key={row.subset}>{formatValue(key ? row[field]?.[key] : row[field])}</td>)}</tr>)}</tbody>
          </table>
        </div>
        <p className="definition">100% = tuần đầu tháng 10 (01–07/10 UTC). Chuỗi đủ điều kiện có ít nhất hai tương tác.</p>
      </section>
      <section className="panel">
        <h2>Độ dài phiên</h2>
        {subset && <label>Tập con <select value={subset.subset} onChange={(event) => setSelected(event.target.value)}>
          {overview.subsets.map((row) => <option key={row.subset} value={row.subset}>{row.subset}%</option>)}
        </select></label>}
        <p className="definition">Phiên có một sự kiện bị loại vì model cần một sản phẩm lịch sử và một sản phẩm mục tiêu.</p>
        {buckets.length ? <>
          <p className="definition">{buckets.at(-1).label} là tổng các nhóm dài hơn.</p>
          <ul className="bars">{buckets.map((bucket, index) => <li key={bucket.label}>
            <span>{bucket.label}</span>
            {bucket.count !== null && <meter className={index === 0 ? "highlight-bar" : ""} min={0} max={max || 1} value={bucket.count} aria-label={`Số phiên dài ${bucket.label}`} />}
            <span>{formatValue(bucket.count)}</span>
          </li>)}</ul>
        </> : <p>{MISSING}</p>}
      </section>
      <section className="panel">
        <h2>Quy trình xử lý</h2>
        <ol className="pipeline">{PIPELINE.map(([label, description, owner]) => <li key={label}><strong>{label}</strong> · {owner}<p>{description}</p></li>)}</ol>
      </section>
    </>
  );
}
