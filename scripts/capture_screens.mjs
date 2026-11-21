import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { preview } from "vite";

const root = fileURLToPath(new URL("../", import.meta.url));
const destination = path.join(root, "screenshots");
await mkdir(destination, { recursive: true });
const server = await preview({ root, preview: { host: "127.0.0.1", port: 0 } });
const home = `http://127.0.0.1:${server.httpServer.address().port}`;
const widths = [1280, 375];

try {
  const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || "chrome" });
  try {
    for (const width of widths) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      page.setDefaultTimeout(8000);
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      const capture = async (name) => {
        assert.deepEqual(errors, [], name);
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `Overflow in ${name} at ${width}`);
        await page.screenshot({ path: path.join(destination, `${name}-${width}.png`), fullPage: true });
      };
      await page.goto(`${home}/#recommendation`);
      const session = page.getByLabel("Phiên xem");
      const model = page.getByLabel("Model", { exact: true });
      for (const [id, result] of [
        ["rank1", /Trúng ở hạng 1$/],
        ["rank20", /Trúng ở hạng 20$/],
        ["miss", /Ngoài Top-20$/],
      ]) {
        await session.selectOption(id);
        await page.locator(".recommendations").getByText(result).waitFor();
        await capture(id);
      }
      await model.selectOption("missing:GRU");
      await page.getByText("Chưa có dự đoán cho model này").waitFor();
      await page.getByRole("heading", { name: "Thực tế khách xem tiếp" }).waitFor();
      await page.getByRole("heading", { name: "Lịch sử xem" }).waitFor();
      await capture("gru-no-output");
      await model.selectOption({ label: "Popularity" });
      assert.equal(await session.inputValue(), "miss");
      await page.locator(".recommendations table").waitFor();

      await page.getByRole("link", { name: "Chế độ trình bày", exact: true }).click();
      const next = page.getByRole("button", { name: "Ví dụ tiếp theo" });
      for (const id of ["rank1", "rank20", "miss"]) {
        await next.click();
        assert.equal(await session.inputValue(), id);
      }
      await capture("presentation");

      await page.getByRole("tab", { name: "Dữ liệu" }).click();
      await page.getByRole("heading", { name: "Độ dài phiên" }).waitFor();
      assert.equal(await page.getByText("Số đo preprocessing (TV1) — chưa xác nhận").count(), 0);
      await page.getByLabel("Tập con", { exact: true }).selectOption("100");
      await capture("dataset");

      for (const id of ["e1", "e2", "e3", "e4", "e5"]) {
        await page.goto(`${home}/#experiments-${id}`);
        const panel = page.locator("[role=tabpanel] > .panel").filter({
          has: page.getByRole("heading", { name: new RegExp(`^${id} ·`, "i") }),
        });
        await panel.waitFor();
        const toy = panel.locator(".toy-block");
        assert.equal(await panel.locator(".metric-chart meter").count(), await toy.locator("meter").count());
        assert.ok((await panel.locator(".metric-chart").first().innerText()).includes("Chưa có"));
        if (["e1", "e3"].includes(id)) await toy.locator(".badge-toy").first().waitFor();
        await capture(`experiments-${id}`);
      }
      await page.close();
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
