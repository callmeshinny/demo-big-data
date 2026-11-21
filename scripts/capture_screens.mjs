import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { preview } from "vite";
import { messages, setLanguage, t } from "../src/i18n.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const destination = path.join(root, "screenshots");
await mkdir(destination, { recursive: true });
const server = await preview({ root, preview: { host: "127.0.0.1", port: 0 } });
const home = `http://127.0.0.1:${server.httpServer.address().port}`;
const widths = [1280, 375];

try {
  const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || "chrome" });
  try {
    for (const locale of ["en", "vi"]) {
      setLanguage(locale);
      const folder = path.join(destination, locale);
      await mkdir(folder, { recursive: true });
      for (const width of widths) {
        const page = await browser.newPage({ viewport: { width, height: 900 } });
        page.setDefaultTimeout(8000);
        const errors = [];
        page.on("pageerror", (error) => errors.push(error.message));
        const capture = async (name) => {
          const text = await page.locator("body").innerText();
          const untranslated = Object.keys(messages.en).filter((key) => key.includes("_") && text.split(/\s+/).includes(key) && !["read_seconds", "input_bytes", "preprocessing_seconds"].includes(key));
          assert.deepEqual(untranslated, [], name);
          assert.deepEqual(errors, [], name);
          const overflow = await page.evaluate(() => {
            if (document.documentElement.scrollWidth <= window.innerWidth) return [];
            return [document.documentElement.scrollWidth, ...[...document.querySelectorAll("main *")].filter((el) =>
              !el.closest(".table-scroll") && el.getBoundingClientRect().right > window.innerWidth
            ).slice(0, 8).map((el) => [el.tagName, el.className, el.textContent.slice(0, 120)])];
          });
          assert.deepEqual(overflow, [], `Overflow in ${name} at ${width}`);
          await page.screenshot({ path: path.join(folder, `${name}-${width}.png`), fullPage: true });
        };
        await page.goto(`${home}/#recommendation`);
        await page.locator("html[lang=en]").waitFor();
        await page.getByLabel(messages.en.session, { exact: true }).selectOption("rank20");
        await page.getByRole("button", { name: "VI", exact: true }).click();
        await page.locator("html[lang=vi]").waitFor();
        assert.equal(await page.getByLabel(messages.vi.session, { exact: true }).inputValue(), "rank20");
        assert.equal(new URL(page.url()).hash, "#recommendation");
        if (locale === "en") {
          await page.getByRole("button", { name: "EN", exact: true }).click();
          await page.locator("html[lang=en]").waitFor();
          assert.equal(await page.getByLabel(messages.en.session, { exact: true }).inputValue(), "rank20");
        }
        const session = page.getByLabel(t("session"), { exact: true });
        const model = page.getByLabel("Model", { exact: true });
        for (const [id, result] of [
          ["rank1", t("hit_at_rank_0", 1)],
          ["rank20", t("hit_at_rank_0", 20)],
          ["miss", t("not_in_top_20")],
        ]) {
          await session.selectOption(id);
          await page.locator(".recommendations").getByText(result, { exact: true }).waitFor();
          const score = page.locator(".ranking td.score").first();
          assert.ok(await score.evaluate((cell) => {
            const text = document.createRange();
            text.selectNodeContents(cell);
            return text.getBoundingClientRect().width <= cell.clientWidth && getComputedStyle(cell).whiteSpace === "nowrap";
          }));
          assert.equal(await page.locator(".product-icon").count(), 0);
          await capture(id);
        }
        await page.getByText(t("price_unavailable"), { exact: true }).first().waitFor();
        await model.selectOption("missing:GRU");
        await page.getByText(t("no_predictions_available_for_this_model")).waitFor();
        await page.getByRole("heading", { name: t("actual_next_item") }).waitFor();
        await page.getByRole("heading", { name: t("history") }).waitFor();
        await capture("gru-no-output");
        await model.selectOption({ label: "Popularity" });
        assert.equal(await session.inputValue(), "miss");
        await page.locator(".recommendations table").waitFor();

        await page.getByRole("tab", { name: t("dataset") }).click();
        await page.getByRole("heading", { name: t("session_length") }).waitFor();
        await page.getByText(t("smoke_awaiting_tv2_confirmation"), { exact: true }).waitFor();
        const weekly = page.locator("section").filter({ has: page.getByRole("heading", { name: t("weekly_cudf_subsets"), exact: true }) });
        for (const key of ["missing_brand", "missing_category"]) {
          assert.equal(await weekly.getByRole("rowheader", { name: t(key), exact: true }).count(), 0);
        }
        assert.equal(await page.locator("[role=tabpanel] meter").count(), 21);
        await page.getByLabel(t("subset"), { exact: true }).selectOption("100");
        await capture("dataset");

        for (const id of ["e1", "e2", "e3", "e4", "e5"]) {
          await page.goto(`${home}/#experiments-${id}`);
          const panel = page.locator("[role=tabpanel] > .panel").filter({
            has: page.getByRole("heading", { name: new RegExp(`^${id} ·`, "i") }),
          });
          await panel.waitFor();
          assert.equal(await page.getByText(t("smoke_awaiting_tv2_confirmation"), { exact: true }).count(), 0);
          if (["e2", "e4"].includes(id)) {
            assert.equal(await panel.getByText(/118[,.]?113[,.]?591|25945758|25,945,758|30\.449049160999493/).count(), 0);
          }
          const toy = panel.locator(".toy-block");
          assert.equal(await panel.locator(".metric-chart meter").count(), await toy.locator("meter").count());
          assert.ok((await panel.locator(".metric-chart").first().innerText()).includes(t("not_available_yet")));
          if (["e1", "e3"].includes(id)) await toy.locator(".badge-toy").first().waitFor();
          if (id === "e3") {
            const checkbox = page.getByRole("checkbox");
            await checkbox.uncheck();
            await checkbox.check();
            assert.equal(await checkbox.evaluate((input) => getComputedStyle(input).accentColor), "rgb(98, 69, 31)");
          }
          await capture(`experiments-${id}`);
        }
        await page.route("**/dataset-overview.json", (route) => route.fulfill({ body: "{", contentType: "application/json" }));
        await page.goto(`${home}/#data`);
        await page.reload();
        const alert = page.getByRole("alert");
        await alert.getByText(t("could_not_load_the_dataset_overview"), { exact: true }).waitFor();
        await page.close();
      }
    }
  } finally {
    await browser.close();
  }
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  server.httpServer.closeAllConnections();
  await new Promise((resolve, reject) => server.httpServer.close((error) => error ? reject(error) : resolve()));
}
if (!process.exitCode) console.log(`Saved screenshots in ${destination}`);
