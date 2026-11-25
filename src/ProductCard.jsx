import React from "react";
import { INVALID_PRODUCT_ID } from "./data.js";
import { productCardDisplay } from "./product.js";

export function ProductCard({ id, products }) {
  const { id: originalId, name, breadcrumb, price } = productCardDisplay(id, products);
  if (id === INVALID_PRODUCT_ID) return <div className="product-card missing">{name}</div>;

  return (
    <div className="product-card">
      <div>
        {name && <strong>{name}</strong>}
        {breadcrumb && <small>{breadcrumb}</small>}
        <small className="product-id">{originalId}</small>
        {price !== null && <span>{price}</span>}
      </div>
    </div>
  );
}
