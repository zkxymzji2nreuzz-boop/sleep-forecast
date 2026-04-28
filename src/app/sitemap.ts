import type { MetadataRoute } from 'next';
import { getAllArticlesMeta } from '@/lib/articles';

/**
 * sitemap.xml を動的生成する Server Route。
 * - 記事は getAllArticlesMeta() で動的取得（記事追加時に自動追従）
 * - getAllArticlesMeta は Node.js fs を使用する Server 専用関数。
 *   このファイルは Server Route なので問題なし。
 *   Client Component から import しないこと（ビルドエラーになる）。
 * - noindex 対象 (/dashboard, /record, /settings) は含めない
 */

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || 'https://sleep-forecast.vercel.app';

export default function sitemap(): MetadataRoute.Sitemap {
  const articles = getAllArticlesMeta();

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/articles`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/about`,
      lastModified: new Date('2026-04-10'),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${SITE_URL}/contact`,
      lastModified: new Date('2026-04-10'),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/privacy`,
      lastModified: new Date('2026-04-10'),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/terms`,
      lastModified: new Date('2026-04-10'),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ];

  // 記事追加時に自動追従（getAllArticlesMeta() による動的生成）
  const articleRoutes: MetadataRoute.Sitemap = articles.map((article) => ({
    url: `${SITE_URL}/articles/${article.slug}`,
    lastModified: new Date(article.updatedAt),
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }));

  return [...staticRoutes, ...articleRoutes];
}
