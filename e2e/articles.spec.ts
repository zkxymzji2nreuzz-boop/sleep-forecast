import { test, expect } from "@playwright/test";

/**
 * E2E: 記事ページ (REQ-P2-04)
 */
test.describe("記事一覧ページ", () => {
  test("記事一覧が表示される", async ({ page }) => {
    await page.goto("/articles");
    await expect(page).toHaveTitle(/記事/);

    // 少なくとも 1 件の記事カードが存在する
    const articleLinks = page.getByRole("link").filter({ hasText: /気圧|低気圧|気象病|睡眠/ });
    await expect(articleLinks.first()).toBeVisible();
  });
});

test.describe("記事詳細ページ", () => {
  test("気象病完全ガイドが表示される", async ({ page }) => {
    await page.goto("/articles/kishoubyou-kanzen-guide");

    // タイトルに「気象病」が含まれる
    await expect(page).toHaveTitle(/気象病/);

    // パンくずリスト
    await expect(page.getByRole("navigation", { name: /パンくず/ })).toBeVisible();

    // 本文コンテンツ
    await expect(page.getByRole("article")).toBeVisible();

    // インライン CTA が表示される
    await expect(
      page.getByRole("complementary", { name: /SleepForecast アプリ/ })
    ).toBeVisible();

    // 末尾 CTA の「記録する」ボタン
    await expect(page.getByRole("link", { name: /今日の睡眠を記録する/ })).toBeVisible();
  });

  test("記事の Article JSON-LD が出力されている", async ({ page }) => {
    await page.goto("/articles/kishoubyou-kanzen-guide");

    // <script type="application/ld+json"> が存在し、Article type が含まれる
    const jsonLd = await page.evaluate(() => {
      const scripts = Array.from(
        document.querySelectorAll('script[type="application/ld+json"]')
      );
      return scripts.map((s) => s.textContent).join("\n");
    });

    expect(jsonLd).toContain('"@type":"Article"');
    expect(jsonLd).toContain('"SleepForecast 運営者"');
  });

  test("404 — 存在しない記事スラッグはエラーページを返す", async ({ page }) => {
    const response = await page.goto("/articles/this-slug-does-not-exist-xyz");
    // Next.js の notFound() は 404 を返す
    expect(response?.status()).toBe(404);
  });
});
