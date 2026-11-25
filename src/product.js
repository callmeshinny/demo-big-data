import { t } from "./i18n.js";
import { INVALID_PRODUCT_ID } from "./data.js";

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const titleCase = (value) => value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

export function productDisplay(id, products) {
  if (id === INVALID_PRODUCT_ID) return { name: t("invalid_id") };

  const product = products?.get(id);
  const category = product?.category_code?.split(".").map(titleCase) ?? [];
  const leaf = category.at(-1);
  const brand = product?.brand && titleCase(product.brand);
  const name = brand && leaf ? `${brand} ${leaf}`
    : leaf ? t("0_brand_unknown", leaf)
      : brand ? t("0_category_unknown", brand) : t("product_0", id);

  return {
    name,
    breadcrumb: category.join(" › "),
    price: product?.price == null ? t("price_unavailable") : usd.format(product.price),
  };
}

export function productCardDisplay(id, products) {
  if (id === INVALID_PRODUCT_ID) return { id: null, name: t("invalid_id"), breadcrumb: null, price: null };
  const product = products?.get(id);
  if (!product) return { id, name: null, breadcrumb: null, price: null };
  const display = productDisplay(id, products);
  return {
    id,
    name: product.brand || product.category_code ? display.name : null,
    breadcrumb: display.breadcrumb || null,
    price: product.price == null ? null : display.price,
  };
}
