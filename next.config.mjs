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

/** セキュリティヘッダー定義 */
const securityHeaders = [
  {
    // HTTPS 強制（HSTS）: 1年間 HTTPS のみ許可。Vercel が HTTPS を強制するため
    // max-age は最低 6 か月（推奨 1 年）。includeSubDomains は全サブドメインに適用。
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains",
  },
  {
    // クリックジャッキング防止
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    // MIME スニッフィング防止
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    // リファラー制限
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    // XSS 保護（modern browsers）
    key: "X-XSS-Protection",
    value: "1; mode=block",
  },
  {
    // Permissions Policy（不要な API を無効化）
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(self), payment=()",
  },
  {
    /**
     * Content Security Policy
     * - script-src: Next.js hydration に 'unsafe-inline'/'unsafe-eval' が必要
     * - style-src: Tailwind CSS の動的スタイルに 'unsafe-inline' が必要
     * - connect-src: GA4・Vercel Analytics のみ許可（天気APIはサーバーサイド経由）
     * - frame-ancestors: 埋め込みを完全禁止
     */
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://va.vercel-scripts.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self'",
      // Supabase: *.supabase.co (Auth API + DB API)
      "connect-src 'self' https://www.google-analytics.com https://analytics.google.com https://www.googletagmanager.com https://vitals.vercel-insights.com https://va.vercel-scripts.com https://*.supabase.co wss://*.supabase.co",
      "frame-src 'none'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self' https://formspree.io",
      "worker-src 'self' blob:",
      "manifest-src 'self'",
    ].join("; "),
  },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        // 全ページにセキュリティヘッダーを適用
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default withPWA(nextConfig);
