import { test, expect } from "@playwright/test";

/**
 * E2E: ホームページ
 */
test.describe("ホームページ", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("タイトルと主要 UI が表示される", async ({ page }) => {
    // <title> に SleepForecast が含まれる
    await expect(page).toHaveTitle(/SleepForecast/);

    // ヘッダーのロゴリンク
    await expect(page.getByRole("link", { name: /SleepForecast/ }).first()).toBeVisible();

    // ヒーローセクション（CTAボタン）— 実際のテキストは「今日を記録する」
    await expect(page.getByRole("link", { name: /今日を記録する/ }).first()).toBeVisible();
  });

  test("気圧感受度チェックカードのチェックボックスが動作する", async ({ page }) => {
    // チェックボックスが存在する
    const checkboxes = page.getByRole("checkbox");
    await expect(checkboxes.first()).toBeVisible();

    // チェックして状態が変わることを確認
    await checkboxes.first().check();
    await expect(checkboxes.first()).toBeChecked();
  });

  test("BottomNav が表示されリンクが機能する（モバイル）", async ({ page }) => {
    // モバイル幅でもナビゲーションが存在する
    const recordLink = page.getByRole("link", { name: /記録/ }).last();
    await expect(recordLink).toBeVisible();
    await recordLink.click();
    await expect(page).toHaveURL("/record");
  });
});
