import React from "react";
import { INVALID_PRODUCT_ID, MISSING } from "./data.js";

const icons = new Map([
  ["electronics", "📱"],
  ["furniture", "🪑"],
  ["appliances", "🔌"],
  ["computers", "💻"],
  ["apparel", "👕"],
]);

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const titleCase = (value) => value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

export function topCategory(product) {
  return product?.category_code?.split(".")[0] || null;
}

export function ProductCard({ id, products }) {
  if (id === INVALID_PRODUCT_ID) {
    return <div className="product-card missing">Mã không hợp lệ</div>;
  }
  const product = products?.get(id);
  const category = product?.category_code?.split(".").map(titleCase) ?? [];
  const leaf = category.at(-1);
  const brand = product?.brand && titleCase(product.brand);
  const name = brand && leaf ? `${brand} ${leaf}`
    : leaf ? `${leaf} (không rõ hãng)`
      : brand ? `${brand} (chưa rõ danh mục)` : `Sản phẩm #${id}`;

  return (
    <div className="product-card">
      <span className="product-icon" aria-hidden="true">{icons.get(topCategory(product)) ?? "📦"}</span>
      <div>
        <strong>{name}</strong>
        {leaf && <small>{category.join(" › ")}</small>}
        <small className="product-id">{id}</small>
        <span className={product?.price == null ? "missing" : undefined}>
          {product?.price == null ? MISSING : usd.format(product.price)}
        </span>
      </div>
    </div>
  );
}
