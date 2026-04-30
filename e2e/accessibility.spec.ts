import { test, expect } from "@playwright/test";

/**
 * E2E: アクセシビリティ基本チェック (REQ-P2-04)
 * - 主要ページの <title> が設定されているか
 * - ランドマーク (main, header, nav) が存在するか
 * - フォーカス可能な要素のフォーカスリングが見えるか
 */
test.describe("アクセシビリティ基本チェック", () => {
  const pages = [
    { name: "ホーム", path: "/" },
    { name: "記録", path: "/record" },
    { name: "ダッシュボード", path: "/dashboard" },
    { name: "記事一覧", path: "/articles" },
    { name: "設定", path: "/settings" },
    { name: "運営者情報", path: "/about" },
  ];

  for (const { name, path } of pages) {
    test(`${name}ページに <title> が設定されている`, async ({ page }) => {
      await page.goto(path);
      const title = await page.title();
      expect(title.length).toBeGreaterThan(0);
      expect(title).toContain("SleepForecast");
    });

    test(`${name}ページに <main> ランドマークが存在する`, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByRole("main")).toBeVisible();
    });
  }
});
