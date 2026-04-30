import { test, expect } from "@playwright/test";

/**
 * E2E: 設定ページ (REQ-P2-04)
 */
test.describe("設定ページ", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/settings");
  });

  test("設定ページが表示される", async ({ page }) => {
    await expect(page).toHaveTitle(/設定/);
    await expect(page.getByRole("main")).toBeVisible();
  });

  test("CSVダウンロードボタンが存在する", async ({ page }) => {
    await expect(
      page.getByRole("button", { name: /CSVでダウンロード/ })
    ).toBeVisible();
  });

  test("JSONダウンロードボタンが存在する (REQ-P2-05)", async ({ page }) => {
    await expect(
      page.getByRole("button", { name: /JSONでダウンロード/ })
    ).toBeVisible();
  });

  test("全記録削除ボタンが存在する", async ({ page }) => {
    await expect(
      page.getByRole("button", { name: /全記録を削除/ })
    ).toBeVisible();
  });
});
