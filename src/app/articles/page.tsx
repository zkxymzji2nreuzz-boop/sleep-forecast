import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, ArrowRight } from "lucide-react";

import { getAllArticlesMeta } from "@/lib/articles";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://sleep-forecast.vercel.app";

export const metadata: Metadata = {
  title: "記事一覧",
  description:
    "気象病・睡眠の質・月齢と睡眠など、SleepForecast が厳選した睡眠と気象に関する記事の一覧です。",
  alternates: {
    canonical: `${SITE_URL}/articles`,
  },
  openGraph: {
    type: "website",
    title: "記事一覧 | SleepForecast",
    description:
      "気象病・睡眠の質・月齢と睡眠に関する SleepForecast の記事一覧",
    url: `${SITE_URL}/articles`,
    siteName: "SleepForecast",
    locale: "ja_JP",
  },
};

export default function ArticlesIndexPage() {
  const articles = getAllArticlesMeta();

  return (
    <div className="container mx-auto max-w-screen-md px-4 pb-16 pt-10">
      <header className="mb-8">
        <div className="mb-2 flex items-center gap-2 text-xs text-[#1d9bf0]">
          <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="font-medium uppercase tracking-wide">Articles</span>
        </div>
        <h1 className="text-2xl font-bold text-[#e6e8ee] sm:text-3xl">
          睡眠と気象の読みもの
        </h1>
        <p className="mt-2 text-sm text-[#8b92a5]">
          気圧・気温・月齢と睡眠の関係を、科学的な知見をもとに分かりやすく解説します。
        </p>
      </header>

      {articles.length === 0 ? (
        <p className="text-sm text-[#8b92a5]">
          現在、公開されている記事はありません。
        </p>
      ) : (
        <ul className="grid gap-4">
          {articles.map((a) => (
            <li key={a.slug}>
              <Link
                href={`/articles/${a.slug}`}
                className="group block rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition-colors hover:border-[#1d9bf0]/50 hover:bg-white/[0.06]"
              >
                <div className="mb-2 flex items-center gap-2 text-[10px] uppercase tracking-wide text-[#1d9bf0]">
                  <span>{a.category}</span>
                  <span aria-hidden="true">·</span>
                  <time dateTime={a.publishedAt}>{a.publishedAt}</time>
                </div>
                <h2 className="text-lg font-semibold text-[#e6e8ee] sm:text-xl">
                  {a.title}
                </h2>
                <p className="mt-1.5 line-clamp-2 text-sm text-[#8b92a5]">
                  {a.description}
                </p>
                <div className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-[#1d9bf0] transition-transform group-hover:translate-x-0.5">
                  続きを読む
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-10 rounded-lg border border-white/10 bg-white/[0.02] p-4 text-xs leading-relaxed text-[#8b92a5]">
        本サービスで提供する記事は一般的な情報提供を目的としたものであり、医学的な診断・治療の代替ではありません。
        体調に不安がある場合は、必ず医療機関にご相談ください。
      </p>
    </div>
  );
}
