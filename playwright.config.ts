import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E テスト設定 (REQ-P2-04)
 *
 * テスト対象フロー:
 *   1. ホームページ表示
 *   2. 記録フロー（RecordForm の入力・送信）
 *   3. ダッシュボード表示
 *   4. 記事一覧ページ表示
 *   5. 記事詳細ページ表示
 *   6. 設定ページ（都道府県選択）
 *   7. 404 ページ
 *
 * 実行方法:
 *   npx playwright test
 *   npx playwright test --ui
 */
export default defineConfig({
  testDir: "./e2e",
  /* 最大並列数: CI では 1 ワーカーに制限する */
  workers: process.env.CI ? 1 : undefined,
  /* テスト失敗時のリトライ回数 */
  retries: process.env.CI ? 2 : 0,
  /* ヘッドレスモード */
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000",
    /* スクリーンショットを失敗時のみ保存 */
    screenshot: "only-on-failure",
    /* トレースを失敗時のみ記録 */
    trace: "on-first-retry",
  },
  /* テスト対象ブラウザ */
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile-safari",
      use: { ...devices["iPhone 14"] },
    },
  ],
  /* テスト前に dev サーバーを起動する（CI 以外） */
  webServer: process.env.CI
    ? undefined
    : {
        command: "npm run dev",
        url: "http://localhost:3000",
        reuseExistingServer: true,
        timeout: 120_000,
      },
});
