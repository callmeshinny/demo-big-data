// Browser checks against the production build (run `npm run build` first): `npm run test:e2e`.
// Interactions (chart select / Esc / keyboard / table <-> mark link / hit link / cross-links),
// rendered-text scans (raw i18n keys, NaN, undefined), console errors, HTTP >= 400 and overflow.
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { preview } from "vite";
import { messages } from "../src/i18n.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const server = await preview({ root, preview: { host: "127.0.0.1", port: 0 }, logLevel: "error" });
const home = `http://127.0.0.1:${server.httpServer.address().port}/`;
const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || "chrome" });
const keys = Object.keys(messages.en).filter((key) => key.includes("_") && messages.en[key] !== key);
const results = [];

async function open(hash, { width = 1280, height = 800, lang = "en", search = "" } = {}) {
  const context = await browser.newContext({ viewport: { width, height }, reducedMotion: "reduce" });
  await context.addInitScript((l) => { try { localStorage.setItem("tv4-language", l); } catch { /* optional */ } }, lang);
  const page = await context.newPage();
  page.problems = [];
  page.on("console", (message) => { if (message.type() === "error") page.problems.push(message.text()); });
  page.on("pageerror", (error) => page.problems.push(error.message));
  page.on("response", (response) => { if (response.status() >= 400) page.problems.push(`HTTP ${response.status()} ${response.url()}`); });
  await page.goto(`${home}${search}${hash}`, { waitUntil: "networkidle" });
  return page;
}

async function check(name, body) {
  try {
    await body();
    results.push(["ok", name]);
  } catch (error) {
    results.push(["FAIL", name, error.message.split("\n")[0]]);
  }
}

const views = ["#recommendation", "#dataset", "#experiments/e1", "#experiments/e2", "#experiments/e3", "#experiments/e4", "#experiments/e5"];

try {
  for (const lang of ["en", "vi"]) {
    for (const width of [1280, 375]) {
      for (const hash of views) {
        await check(`${lang} ${width} ${hash}: clean text, no errors, no overflow`, async () => {
          const page = await open(hash, { width, lang });
          const text = await page.locator("body").innerText();
          assert.deepEqual(keys.filter((key) => text.split(/[\s:·,;()→]+/u).includes(key)), [], "raw i18n key");
          assert.ok(!/\bNaN\b|\bundefined\b/.test(text), "NaN/undefined on screen");
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth), 0, "horizontal overflow");
          assert.deepEqual(page.problems, []);
          await page.context().close();
        });
      }
    }
  }

  await check("chart: click selects + dims others + highlights table column; Esc clears", async () => {
    const page = await open("#experiments/e1");
    const bar = page.locator("[data-mark='GRU']").first();
    await bar.click();
    assert.equal(await bar.getAttribute("aria-pressed"), "true");
    assert.equal(await page.locator(".chart.has-selection").count(), 2, "both E1 charts share the selection");
    const dimmed = await page.locator("[data-mark='XLNet'] .mark").first().evaluate((el) => getComputedStyle(el).opacity);
    assert.equal(Number(dimmed), 0.35);
    assert.equal(await page.locator("th.is-selected").count(), 1);
    assert.match(await page.locator("th.is-selected").innerText(), /GRU/);
    await page.keyboard.press("Escape");
    assert.equal(await page.locator(".chart.has-selection").count(), 0);
    assert.equal(await page.locator("th.is-selected").count(), 0);
    await bar.click();
    await bar.click();
    assert.equal(await bar.getAttribute("aria-pressed"), "false", "click again clears");
    await page.context().close();
  });

  await check("table column -> chart mark", async () => {
    const page = await open("#experiments/e4");
    await page.locator(".column-select").nth(1).click();
    const pressed = await page.locator("[data-mark][aria-pressed='true']").count();
    assert.equal(pressed, 2, "the matching mark is selected in both E4 charts");
    await page.locator(".metric-table tbody td").first().click();
    assert.equal(await page.locator("th.is-selected").count(), 1, "clicking a cell selects its column");
    await page.context().close();
  });

  await check("chart keyboard: arrows move focus, Enter selects, tooltip shown, focus ring visible", async () => {
    const page = await open("#experiments/e5");
    const marks = page.locator(".chart").first().locator("[data-mark]");
    await marks.first().focus();
    await page.keyboard.press("ArrowRight");
    assert.equal(await page.evaluate(() => document.activeElement.getAttribute("data-mark")), await marks.nth(1).getAttribute("data-mark"));
    await page.keyboard.press("Enter");
    assert.equal(await marks.nth(1).getAttribute("aria-pressed"), "true");
    assert.ok(await page.locator(".tooltip").first().isVisible(), "tooltip for the focused mark");
    const ring = await marks.nth(1).locator(".hit").evaluate((el) => getComputedStyle(el).stroke);
    assert.notEqual(ring, "none");
    await page.keyboard.press("Escape");
    assert.equal(await marks.nth(1).getAttribute("aria-pressed"), "false");
    await page.context().close();
  });

  await check("E5 selection links to the same level in E2 (preselected); E3 never linked", async () => {
    const page = await open("#experiments/e5");
    await page.locator("[data-mark='25']").first().click();
    const link = page.locator(".selection-bar a");
    assert.equal(await link.getAttribute("href"), "#experiments/e2/25");
    await link.click();
    await page.waitForFunction(() => location.hash === "#experiments/e2/25");
    assert.equal(await page.locator("[data-mark='25'][aria-pressed='true']").count(), 2);
    assert.equal(await page.locator("a[href^='#experiments/e3']:not(.subtabs a)").count(), 0);
    await page.goBack();
    await page.waitForFunction(() => location.hash === "#experiments/e5");
    assert.equal(await page.locator(".subtabs [aria-current='page']").innerText().then((t) => t.includes("E5")), true, "back works");
    await page.context().close();
  });

  await check("tooltip stays inside a 375 px viewport", async () => {
    const page = await open("#experiments/e1", { width: 375, height: 812 });
    for (const key of ["Popularity", "XLNet"]) {
      const mark = page.locator(`[data-mark='${key}']`).first();
      await mark.scrollIntoViewIfNeeded();
      await mark.click();
      const box = await page.locator(".tooltip").first().boundingBox();
      assert.ok(box && box.x >= 0 && box.x + box.width <= 375, `${key}: ${JSON.stringify(box)}`);
      await page.keyboard.press("Escape");
    }
    await page.context().close();
  });

  await check("tooltip covers neither the selected mark nor any value/category label (1280 and 375)", async () => {
    for (const [hash, key] of [["#experiments/e1", "XLNet"], ["#experiments/e1", "Popularity"], ["#experiments/e5", "25"], ["#experiments/e5", "10"], ["#experiments/e3", null], ["#experiments/e2", "100"]]) {
      for (const width of [1280, 375]) {
        const page = await open(hash, { width, height: 900 });
        const mark = key ? page.locator(`[data-mark='${key}']`).first() : page.locator("[data-mark]").first();
        await mark.scrollIntoViewIfNeeded();
        await mark.click();
        await page.mouse.move(0, 0);
        const hits = await page.evaluate(() => {
          const chart = document.querySelector(".chart.has-selection");
          const tip = chart.querySelector(".tooltip").getBoundingClientRect();
          const overlap = (a, b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
          const things = [...chart.querySelectorAll(".mark-group.is-selected .mark, .chart-value, .chart-category, .chart-tick")];
          return things.filter((el) => { const r = el.getBoundingClientRect(); return r.width && overlap(tip, r); }).map((el) => el.textContent || el.tagName);
        });
        assert.deepEqual(hits, [], `${hash} ${key} @${width}`);
        await page.context().close();
      }
    }
  });

  await check("hit row and Actual-next-item panel highlight each other", async () => {
    const tip = await open("#recommendation");
    await tip.locator(".presenter-tip").click();
    await tip.locator("tr.is-hit").hover();
    assert.match(await tip.locator(".actual-panel").getAttribute("class"), /is-linked/);
    await tip.locator(".actual-panel").hover();
    assert.match(await tip.locator("tr.is-hit").getAttribute("class"), /is-linked/);
    assert.ok(/Hit — the actual item is ranked \d+ of 20/.test(await tip.locator(".hit-sentence").innerText()));
    await tip.context().close();
  });

  await check("glossary popover: opens, Esc closes and returns focus", async () => {
    const page = await open("#recommendation");
    const button = page.locator(".history-panel .glossary .popover-button");
    await button.click();
    assert.ok(await page.locator(".history-panel .popover").isVisible());
    await page.keyboard.press("Escape");
    assert.ok(!(await page.locator(".history-panel .popover").isVisible()));
    assert.ok(await button.evaluate((el) => el === document.activeElement));
    await page.context().close();
  });

  await check("presenter mode: ?present=1, toggle, remembered", async () => {
    const page = await open("#recommendation", { search: "?present=1" });
    assert.ok(await page.evaluate(() => document.documentElement.classList.contains("presenter")));
    assert.equal(await page.locator("body").evaluate((el) => getComputedStyle(el).fontSize), "18px");
    await page.locator(".presenter-toggle").click();
    assert.ok(!(await page.evaluate(() => document.documentElement.classList.contains("presenter"))));
    assert.equal(await page.evaluate(() => localStorage.getItem("tv4-presenter")), "0");
    await page.locator(".presenter-toggle").click();
    await page.goto(`${home}#experiments/e1`);
    assert.ok(await page.evaluate(() => document.documentElement.classList.contains("presenter")), "remembered");
    assert.ok(Number.parseFloat(await page.locator(".chart-tick").first().evaluate((el) => getComputedStyle(el).fontSize)) >= 14, "chart labels >= 14 px");
    await page.context().close();
  });

  await check("fold: History, Actual next item and Hit/Miss sentence visible at 1280x800 (EN, VI)", async () => {
    for (const lang of ["en", "vi"]) {
      const page = await open("#recommendation", { lang });
      for (const selector of [".history-panel", ".actual-panel", ".hit-sentence"]) {
        const box = await page.locator(selector).boundingBox();
        assert.ok(box && box.y >= 0 && box.y + box.height <= 800, `${lang} ${selector}: ${JSON.stringify(box)}`);
      }
      await page.context().close();
    }
  });

  await check("touch targets: summaries, links and buttons are >= 44 px tall (1280 and 375)", async () => {
    for (const [hash, width] of [["#experiments/e5", 1280], ["#experiments/e5", 375], ["#recommendation", 1280], ["#experiments/e1", 375]]) {
      const page = await open(hash, { width, height: 900 });
      const mark = page.locator("[data-mark]").first();
      if (await mark.count()) { await mark.scrollIntoViewIfNeeded(); await mark.click(); }
      const small = await page.evaluate(() => [...document.querySelectorAll("summary, .selection-bar a, .e1-strip a, .column-link, button, select")]
        .filter((el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.height < 43.5; })
        .map((el) => `${el.tagName} "${(el.textContent || "").trim().slice(0, 30)}" ${Math.round(el.getBoundingClientRect().height)}px`));
      assert.deepEqual(small, [], `${hash} @${width}`);
      await page.context().close();
    }
  });

  await check("header title never truncates (1024-1440, default and presenter, EN and VI)", async () => {
    for (const lang of ["en", "vi"]) for (const search of ["", "?present=1"]) for (const width of [1024, 1101, 1180, 1280, 1440]) {
      const page = await open("#recommendation", { width, lang, search });
      const fit = await page.evaluate(() => {
        const name = [...document.querySelectorAll(".brand-name > span")].find((el) => getComputedStyle(el).display !== "none");
        const inner = document.querySelector(".topbar-inner");
        return { clipped: name.scrollWidth > name.clientWidth + 0.5 || name.getBoundingClientRect().width < name.scrollWidth - 0.5,
          ellipsis: getComputedStyle(document.querySelector(".brand-name")).textOverflow === "ellipsis",
          rowOverflow: inner.scrollWidth > inner.clientWidth + 0.5, text: name.textContent };
      });
      assert.deepEqual([fit.clipped, fit.ellipsis, fit.rowOverflow], [false, false, false], `${lang} ${search || "default"} ${width}: ${fit.text}`);
      await page.context().close();
    }
  });

  await check("chart labels are never truncated (no ellipsis) at 1440/1280/768/375, EN and VI, default and presenter", async () => {
    for (const lang of ["en", "vi"]) for (const search of ["", "?present=1"]) for (const width of [1440, 1280, 768, 375]) {
      for (const hash of ["#experiments/e1", "#experiments/e2", "#experiments/e3", "#experiments/e4", "#experiments/e5"]) {
        const page = await open(hash, { width, lang, search });
        const cut = await page.evaluate(() => [...document.querySelectorAll("figure.chart svg text")].map((t) => t.textContent).filter((text) => text.includes("…") || text.includes("...")));
        assert.deepEqual(cut, [], `${lang} ${search || "default"} ${width} ${hash}`);
        await page.context().close();
      }
    }
  });

  await check("sticky header <= 56 px and anchors clear it", async () => {
    const page = await open("#experiments/e1", { width: 1440, height: 900 });
    const header = await page.locator(".topbar").boundingBox();
    assert.ok(header.height <= 56, `header ${header.height}`);
    const margin = await page.locator("#panel-e1").evaluate((el) => Number.parseFloat(getComputedStyle(el).scrollMarginTop));
    assert.ok(margin >= header.height);
    await page.context().close();
  });
} finally {
  await browser.close();
  await server.close();
}

for (const [status, name, detail] of results) console.log(`${status} - ${name}${detail ? `: ${detail}` : ""}`);
const failed = results.filter(([status]) => status !== "ok");
console.log(`\n# e2e checks ${results.length}, pass ${results.length - failed.length}, fail ${failed.length}`);
process.exit(failed.length ? 1 : 0);
