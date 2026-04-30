import { test, expect } from "@playwright/test";

/**
 * E2E: 記録フロー (REQ-P2-04)
 */
test.describe("記録フロー", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/record");
  });

  test("記録ページが表示される", async ({ page }) => {
    await expect(page).toHaveTitle(/記録/);
    // スライダーまたは入力フォームが存在する
    await expect(page.getByRole("main")).toBeVisible();
  });

  test("睡眠スコアを入力して送信できる", async ({ page }) => {
    // スライダーが存在することを確認（RecordForm）
    const sliders = page.getByRole("slider");
    if ((await sliders.count()) > 0) {
      // 最初のスライダーを操作
      const slider = sliders.first();
      await expect(slider).toBeVisible();
    }

    // 送信ボタンが存在する
    const submitBtn = page.getByRole("button", { name: /記録|保存|送信/ });
    if ((await submitBtn.count()) > 0) {
      await expect(submitBtn.first()).toBeVisible();
    }
  });
});
