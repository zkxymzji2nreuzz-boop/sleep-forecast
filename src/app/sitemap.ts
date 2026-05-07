import type { MetadataRoute } from "next";
import { getAllArticlesMeta } from "@/lib/articles";

const BASE_URL = "https://sleep-forecast.vercel.app";

/**
 * Next.js App Router の sitemap.ts。
 * 静的ページは固定日付（毎デプロイで "更新あり" を誤送信しないよう）、
 * 記事ページは frontmatter の updatedAt を使用する。
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL,                     lastModified: new Date("2026-05-08"), changeFrequency: "weekly",   priority: 1.0 },
    { url: `${BASE_URL}/record`,         lastModified: new Date("2026-05-08"), changeFrequency: "monthly",  priority: 0.8 },
    { url: `${BASE_URL}/dashboard`,      lastModified: new Date("2026-05-08"), changeFrequency: "monthly",  priority: 0.8 },
    { url: `${BASE_URL}/articles`,       lastModified: new Date("2026-05-08"), changeFrequency: "weekly",   priority: 0.7 },
    { url: `${BASE_URL}/about`,          lastModified: new Date("2026-05-08"), changeFrequency: "monthly",  priority: 0.6 },
    { url: `${BASE_URL}/settings`,       lastModified: new Date("2026-05-08"), changeFrequency: "yearly",   priority: 0.4 },
    { url: `${BASE_URL}/privacy`,        lastModified: new Date("2026-05-08"), changeFrequency: "yearly",   priority: 0.3 },
    { url: `${BASE_URL}/terms`,          lastModified: new Date("2026-05-08"), changeFrequency: "yearly",   priority: 0.3 },
    { url: `${BASE_URL}/contact`,        lastModified: new Date("2026-05-08"), changeFrequency: "yearly",   priority: 0.3 },
  ];

  let articlePages: MetadataRoute.Sitemap = [];
  try {
    const articles = getAllArticlesMeta();
    articlePages = articles.map((article) => ({
      url: `${BASE_URL}/articles/${article.slug}`,
      lastModified: new Date(article.updatedAt),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    }));
  } catch {
    // ビルド時に記事が見つからなくてもクラッシュさせない
  }

  return [...staticPages, ...articlePages];
}
