import type { Metadata } from "next";
import Link from "next/link";
import { Moon, Cloud, Calendar, ArrowRight, Info } from "lucide-react";
import { Breadcrumb } from "@/components/Breadcrumb";
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

/** YYYY-MM-DD を「2026年4月10日」表記に */
function formatJpDate(iso: string): string {
  const [y, m, d] = iso.split("-").map((s) => parseInt(s, 10));
  if (!y || !m || !d) return iso;
  return `${y}年${m}月${d}日`;
}

export default function ArticlesIndexPage() {
  const articles = getAllArticlesMeta();

  return (
    <div className="container mx-auto max-w-[680px] px-5 pb-20 pt-10 sm:pt-14">
      <Breadcrumb items={[{ name: "ホーム", href: "/" }, { name: "記事一覧" }]} />

      {/* ヒーロー: 月夜のような柔らかな導入 */}
      <div className="relative">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-40 rounded-b-[3rem] bg-gradient-to-b from-indigo-500/[0.06] via-purple-500/[0.03] to-transparent"
        />
        <header className="mb-10">
          <div className="mb-3 flex items-center gap-2 text-xs text-indigo-300/80">
            <Moon className="h-4 w-4" aria-hidden="true" />
            <Cloud className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="font-medium tracking-wide">読みもの</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-[#e6e8ee] sm:text-4xl">
            睡眠と気象の読みもの
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-[#8b92a5] sm:text-base">
            気圧、気温、月のリズム。眠りの奥にある自然の声に、そっと耳を澄ませる読みものを集めました。
          </p>
        </header>
      </div>

      {articles.length === 0 ? (
        <p className="text-sm text-[#8b92a5]">
          今夜はまだ、新しい読みものは届いていません。
        </p>
      ) : (
        <ul className="grid gap-5">
          {articles.map((a) => (
            <li key={a.slug}>
              <Link
                href={`/articles/${a.slug}`}
                className="group relative block overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-br from-white/[0.04] via-white/[0.02] to-transparent p-6 transition-all duration-500 ease-out hover:-translate-y-0.5 hover:border-indigo-300/30 hover:from-indigo-500/10 hover:via-purple-500/[0.08] hover:to-rose-500/5 hover:shadow-[0_8px_30px_-12px_rgba(124,77,255,0.25)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f1117]"
              >
                {/* 左端のグラデーションアクセントバー (hover 時にのみ現れる) */}
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-y-0 left-0 w-[3px] bg-gradient-to-b from-indigo-400 to-purple-400 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                />

                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-indigo-300/15 bg-indigo-500/10 px-2.5 py-0.5 text-[11px] font-medium text-indigo-200/80">
                    {a.category}
                  </span>
                  <time
                    dateTime={a.publishedAt}
                    className="inline-flex items-center gap-1 text-[11px] text-[#8b92a5]"
                  >
                    <Calendar className="h-3 w-3" aria-hidden="true" />
                    {formatJpDate(a.publishedAt)}
                  </time>
                </div>

                <h2 className="text-lg font-semibold text-[#e6e8ee] sm:text-xl">
                  {a.title}
                </h2>
                <p className="mt-1.5 line-clamp-2 text-sm text-[#8b92a5]">
                  {a.description}
                </p>

                <div className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-indigo-300 transition-transform group-hover:translate-x-1">
                  続きを読む
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {/* 医療免責文 (法務要件・text-xs 固定) */}
      <div className="mt-14 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
        <div className="flex items-start gap-2">
          <Info
            className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#8b92a5]"
            aria-hidden="true"
          />
          <p className="text-xs leading-relaxed text-[#8b92a5]">
            本サービスで提供する記事は一般的な情報提供を目的としたものであり、医学的な診断・治療の代替ではありません。
            体調に不安がある場合は、必ず医療機関にご相談ください。
          </p>
        </div>
      </div>
    </div>
  );
}
