import { t } from "./i18n.js";
import React from "react";
import { INVALID_PRODUCT_ID } from "./data.js";
import { productDisplay } from "./product.js";

const icons = new Map([
  ["electronics", "📱"],
  ["furniture", "🪑"],
  ["appliances", "🔌"],
  ["computers", "💻"],
  ["apparel", "👕"],
]);

export function ProductCard({ id, products }) {
  const { name, breadcrumb, category, price } = productDisplay(id, products);
  if (id === INVALID_PRODUCT_ID) return <div className="product-card missing">{name}</div>;

  return (
    <div className="product-card">
      <span className="product-icon" aria-hidden="true">{icons.get(category) ?? "📦"}</span>
      <div>
        <strong>{name}</strong>
        {breadcrumb && <small>{breadcrumb}</small>}
        <small className="product-id">{id}</small>
        <span className={price === t("not_available_yet") ? "missing" : undefined}>
          {price}
        </span>
      </div>
    </div>
  );
}
