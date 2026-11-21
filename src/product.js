import { INVALID_PRODUCT_ID, MISSING } from "./data.js";

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const titleCase = (value) => value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

function topCategory(product) {
  return product?.category_code?.split(".")[0] || null;
}

export function productDisplay(id, products) {
  if (id === INVALID_PRODUCT_ID) return { name: "Mã không hợp lệ" };

  const product = products?.get(id);
  const category = product?.category_code?.split(".").map(titleCase) ?? [];
  const leaf = category.at(-1);
  const brand = product?.brand && titleCase(product.brand);
  const name = brand && leaf ? `${brand} ${leaf}`
    : leaf ? `${leaf} (không rõ hãng)`
      : brand ? `${brand} (chưa rõ danh mục)` : `Sản phẩm #${id}`;

  return {
    name,
    breadcrumb: category.join(" › "),
    category: topCategory(product),
    price: product?.price == null ? MISSING : usd.format(product.price),
  };
}

export function categoryHighlights(prefix, prefixCatalog, recommendations, products) {
  const categoryOf = (id) => topCategory(products?.get(id));
  const historyCategories = new Set();
  for (const id of prefix ?? []) {
    const category = prefixCatalog?.has(id) && categoryOf(id);
    if (category) historyCategories.add(category);
  }

  const matchingIds = new Set();
  let categorizedCount = 0;
  let matchingCount = 0;
  for (const { product_id: id } of recommendations ?? []) {
    const category = categoryOf(id);
    if (!category) continue;
    categorizedCount++;
    if (historyCategories.has(category)) {
      matchingIds.add(id);
      matchingCount++;
    }
  }
  const summary = historyCategories.size && categorizedCount
    ? `Nhóm đã xem: ${[...historyCategories].join(", ")}. ${matchingCount}/${categorizedCount} gợi ý có danh mục cùng nhóm.`
    : null;
  return { matchingIds, summary };
}
