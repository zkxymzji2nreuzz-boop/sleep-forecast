import withPWAInit from "@ducanh2912/next-pwa";

/**
 * @ducanh2912/next-pwa の wrap 設定。
 * - dest: 'public' → Service Worker を public/sw.js に出力
 * - disable: true (dev) → 開発中はホットリロード干渉を避けるため SW を無効化
 * - register: true → layout.tsx 側で手動登録せず自動登録させる
 * - workboxOptions.skipWaiting → 新 SW を即時反映
 */
const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  cacheOnFrontEndNav: true,
  aheadOfTimeCaching: false,
  fallbacks: {
    // オフライン時のフォールバックページ
    document: "/offline",
  },
  workboxOptions: {
    skipWaiting: true,
    clientsClaim: true,
    runtimeCaching: [
      {
        // 気象API: NetworkFirst（最新データ優先。オフライン時はキャッシュから）
        urlPattern: /^\/api\/weather/,
        handler: "NetworkFirst",
        options: {
          cacheName: "weather-api-cache",
          expiration: {
            maxEntries: 50,
            maxAgeSeconds: 60 * 60, // 1時間
          },
          networkTimeoutSeconds: 10,
        },
      },
      {
        // 記事ページ: NetworkFirst（最新コンテンツ優先）
        urlPattern: /^\/articles\//,
        handler: "NetworkFirst",
        options: {
          cacheName: "articles-cache",
          expiration: {
            maxEntries: 50,
            maxAgeSeconds: 60 * 60 * 24 * 7, // 7日間
          },
        },
      },
      {
        // 静的アセット（画像・フォント等）: CacheFirst
        urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico|woff2?|ttf|otf)$/,
        handler: "CacheFirst",
        options: {
          cacheName: "static-assets-cache",
          expiration: {
            maxEntries: 100,
            maxAgeSeconds: 60 * 60 * 24 * 30, // 30日間
          },
        },
      },
    ],
  },
});

/** @type {import('next').NextConfig} */
const nextConfig = {};

export default withPWA(nextConfig);
