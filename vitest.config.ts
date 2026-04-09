import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

/**
 * Vitest 設定 — SleepForecast の単体テスト用。
 *
 * - jsdom 環境で localStorage などブラウザ API を利用
 * - `@/` エイリアスは tsconfig の `paths` に合わせて `src/` を指す
 * - setupFiles で @testing-library/jest-dom の matchers を有効化
 */
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/__tests__/**/*.test.{ts,tsx}"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
