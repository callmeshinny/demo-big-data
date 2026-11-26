import assert from "node:assert/strict";
import { test } from "node:test";
import { messages, readLanguage, setLanguage, t } from "../src/i18n.js";

test("both locales provide the same UI keys and interpolate values", () => {
  assert.deepEqual(Object.keys(messages.en).sort(), Object.keys(messages.vi).sort());
  assert.equal(readLanguage(), "en");
  setLanguage("en");
  assert.equal(t("hit_at_rank_0", 20), "Hit at rank 20");
  assert.equal(t("e5_x_axis_events"), "Events (count)");
  assert.equal(t("section_data_could_not_be_loaded"), "This section's data could not be loaded. Please refresh; the presenter has a backup.");
  setLanguage("vi");
  assert.equal(t("hit_at_rank_0", 20), "✅ Trúng ở hạng 20");
  assert.equal(t("e5_x_axis_events"), "Số sự kiện");
  assert.equal(t("section_data_could_not_be_loaded"), "Không thể tải dữ liệu cho mục này. Vui lòng tải lại trang; người thuyết trình đã có bản dự phòng.");
});
