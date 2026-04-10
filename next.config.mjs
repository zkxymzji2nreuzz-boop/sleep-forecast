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
  workboxOptions: {
    skipWaiting: true,
    clientsClaim: true,
  },
});

/** @type {import('next').NextConfig} */
const nextConfig = {};

export default withPWA(nextConfig);
