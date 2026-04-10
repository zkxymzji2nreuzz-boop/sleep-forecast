import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  getAllArticleSlugs,
  getArticleBySlug,
  getRelatedArticles,
} from "@/lib/articles";
import { ArticleLayout } from "@/components/ArticleLayout";

type Params = {
  params: { slug: string };
};

/** 静的生成: ビルド時に全スラッグをプリレンダリング */
export function generateStaticParams() {
  return getAllArticleSlugs().map((slug) => ({ slug }));
}

/** サイト URL (OGP / JSON-LD の canonical 用) */
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://sleep-forecast.vercel.app";

/** 記事ごとの metadata (title / description / OGP) を生成 */
export async function generateMetadata({
  params,
}: Params): Promise<Metadata> {
  const article = await getArticleBySlug(params.slug);
  if (!article) {
    return {
      title: "記事が見つかりませんでした",
    };
  }

  const url = `${SITE_URL}/articles/${article.slug}`;

  return {
    title: article.title,
    description: article.description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      type: "article",
      title: article.title,
      description: article.description,
      url,
      siteName: "SleepForecast",
      publishedTime: article.publishedAt,
      modifiedTime: article.updatedAt,
      tags: article.tags,
      locale: "ja_JP",
    },
    twitter: {
      card: "summary_large_image",
      title: article.title,
      description: article.description,
    },
  };
}

export default async function ArticlePage({ params }: Params) {
  const article = await getArticleBySlug(params.slug);
  if (!article) {
    notFound();
  }

  const related = getRelatedArticles(article.relatedSlugs);
  const url = `${SITE_URL}/articles/${article.slug}`;

  // Article schema (schema.org) を JSON-LD として埋め込む
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.description,
    datePublished: article.publishedAt,
    dateModified: article.updatedAt,
    inLanguage: "ja",
    author: {
      "@type": "Organization",
      name: "SleepForecast",
    },
    publisher: {
      "@type": "Organization",
      name: "SleepForecast",
      url: SITE_URL,
    },
    url,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": url,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        // Server Component なので XSS リスクは極小。信頼できるソース (リポ内の MD) のみ。
        // 追加防御: </script> 早期終端を防ぐため "<" を \u003c にエスケープ。
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <ArticleLayout article={article} related={related} />
    </>
  );
}
