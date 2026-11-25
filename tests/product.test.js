import { setLanguage, t } from "../src/i18n.js";
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { INVALID_PRODUCT_ID, loadJson, normalizeProductInfo } from "../src/data.js";
import { productCardDisplay, productDisplay } from "../src/product.js";

const smartphone = { brand: "samsung", category_code: "electronics.smartphone", price: 130.76 };
const display = (metadata) => productDisplay("p3", new Map([["p3", metadata]]));

setLanguage(process.env.TV4_TEST_LANGUAGE);

test("toy product lookup is not shipped in the default public path", () => {
  assert.equal(existsSync(new URL("../public/product-info.json", import.meta.url)), false);
});

test("display name handles all combinations of brand and category", () => {
  assert.equal(display(smartphone).name, "Samsung Smartphone");
  assert.equal(display({ ...smartphone, brand: null }).name, t("0_brand_unknown", "Smartphone"));
  assert.equal(display({ ...smartphone, category_code: null }).name, t("0_category_unknown", "Samsung"));
  assert.equal(display({}).name, t("product_0", "p3"));
  assert.equal(productDisplay(INVALID_PRODUCT_ID).name, t("invalid_id"));
});

test("category breadcrumb is readable", () => {
  assert.equal(display(smartphone).breadcrumb, "Electronics › Smartphone");
});

test("USD price displays two decimals, including true zero", () => {
  assert.equal(display(smartphone).price, "$130.76");
  assert.equal(display({ price: 0 }).price, "$0.00");
  assert.equal(display({ price: null }).price, t("price_unavailable"));
});

test("missing file or entry falls back to the original product ID", async () => {
  const failed = await loadJson("product-info.json", async () => ({ ok: false, status: 404 }));
  assert.ok(failed.error);
  const missingFile = normalizeProductInfo(failed.data);
  assert.equal(productDisplay("p3", missingFile.products).name, t("product_0", "p3"));
  const missingEntry = normalizeProductInfo({ products: { p4: smartphone } });
  assert.equal(productDisplay("p3", missingEntry.products).name, t("product_0", "p3"));
});

test("cards show only the original ID unless a real lookup entry exists", () => {
  assert.deepEqual(productCardDisplay("p3"), { id: "p3", name: null, breadcrumb: null, price: null });
  assert.deepEqual(productCardDisplay("p3", new Map([["p3", { brand: "samsung", category_code: "electronics.smartphone", price: null }]])), {
    id: "p3", name: "Samsung Smartphone", breadcrumb: "Electronics › Smartphone", price: null,
  });
});
