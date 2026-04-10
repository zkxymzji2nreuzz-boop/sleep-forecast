/**
 * next-sitemap configuration.
 * - build 後の postbuild フックで実行される (package.json の "postbuild" スクリプト)
 * - robots.txt も同時に生成 (generateRobotsTxt: true)
 * - /api/* は SEO 対象外のため exclude
 *
 * NEXT_PUBLIC_SITE_URL が未設定の場合は Vercel のデフォルト URL にフォールバックし、
 * ローカルで build しても localhost URL が sitemap に埋まらないようにする。
 */

/** @type {import('next-sitemap').IConfig} */
const config = {
  siteUrl:
    process.env.NEXT_PUBLIC_SITE_URL || "https://sleep-forecast.vercel.app",
  generateRobotsTxt: true,
  sitemapSize: 5000,
  changefreq: "weekly",
  priority: 0.7,
  exclude: ["/api/*", "/server-sitemap.xml"],
  robotsTxtOptions: {
    policies: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/"],
      },
    ],
  },
};

module.exports = config;
