import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  Tag,
  BookOpen,
  Pencil,
  Moon,
  Sparkles,
  Info,
} from "lucide-react";

import type { ArticleFull, ArticleMeta } from "@/lib/types";
import { AdBanner } from "@/components/AdBanner";
import { Button } from "@/components/ui/button";

type Props = {
  article: ArticleFull;
  related: ArticleMeta[];
};

/**
 * 記事詳細ページのレイアウト。
 * - タイトル/メタ情報のヘッダー
 * - prose で HTML 本文をレンダリング
 * - 「今日の睡眠を記録する」CTA
 * - 関連記事カード
 * - 医療免責文 (法務要件)
 *
 * デザイン方針 (F005 Design B + A ハイブリッド):
 * - 読み幅は 680px (≒ 60〜75ch) に絞り、prose-lg + leading-[1.9] で長文を読みやすく
 * - F003/F004 と揃えた indigo→purple→rose のウェルネスグラデーションを継承
 * - 境界線は border ではなくグラデーションディバイダーで柔らかく表現
 */
export function ArticleLayout({ article, related }: Props) {
  const publishedLabel = formatJpDate(article.publishedAt);
  const updatedLabel = formatJpDate(article.updatedAt);
  const showUpdated = article.updatedAt !== article.publishedAt;

  return (
    <article className="container mx-auto max-w-[680px] px-5 pb-20 pt-10 sm:pt-14">
      {/* 戻るリンク (柔らかいトーンの「ほかの読みものを見る」) */}
      <div>
        <Link
          href="/articles"
          className="mb-10 inline-flex min-h-[44px] items-center gap-1.5 rounded-sm text-[13px] text-[#8b92a5] transition-colors hover:text-[#e6e8ee] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f1117]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          ほかの読みものを見る
        </Link>
      </div>

      {/* ヘッダー */}
      <header className="relative mb-10">
        {/* カテゴリバッジ (BookOpen アイコン + ピル) */}
        <div className="mb-4 flex items-center gap-2">
          <BookOpen className="h-3.5 w-3.5 text-indigo-300" aria-hidden="true" />
          <span className="rounded-full border border-indigo-300/20 bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-200/80">
            {article.category}
          </span>
        </div>

        <h1 className="text-[28px] font-bold leading-[1.35] tracking-tight text-[#e6e8ee] sm:text-[34px]">
          {article.title}
        </h1>

        <p className="mt-3 text-sm text-[#8b92a5] sm:text-base">
          {article.description}
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-3 text-xs text-[#8b92a5]">
          <span className="inline-flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
            公開: {publishedLabel}
          </span>
          {showUpdated && (
            <span className="inline-flex items-center gap-1">
              <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
              更新: {updatedLabel}
            </span>
          )}
          {article.tags.length > 0 && (
            <span className="inline-flex flex-wrap items-center gap-1.5">
              <Tag className="h-3.5 w-3.5" aria-hidden="true" />
              {article.tags.map((t) => (
                <span
                  key={t}
                  className="rounded-full border border-indigo-300/20 bg-indigo-500/10 px-2.5 py-0.5 text-[11px] text-indigo-200/80"
                >
                  #{t}
                </span>
              ))}
            </span>
          )}
        </div>

        {/* 旧 border-b の代わりに、柔らかなグラデーションディバイダー */}
        <div
          aria-hidden="true"
          className="mt-6 h-px bg-gradient-to-r from-transparent via-indigo-400/40 to-transparent"
        />
      </header>

      {/* 目次 (H2 が 3 件以上あるときのみ表示) */}
      {article.toc.length >= 3 && (
        <nav
          aria-label="目次"
          className="mb-12 rounded-2xl border border-indigo-300/20 bg-gradient-to-br from-indigo-500/[0.06] via-purple-500/[0.04] to-transparent p-5 sm:p-6"
        >
          <div className="mb-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-indigo-300" aria-hidden="true" />
            <h2 className="text-sm font-semibold tracking-wide text-[#e6e8ee]">
              目次
            </h2>
          </div>
          <ol className="space-y-2 text-sm">
            {article.toc.map((item, index) => (
              <li key={item.id} className="leading-relaxed">
                <Link
                  href={`#${item.id}`}
                  className="inline-flex gap-2 rounded-sm text-[#e6e8ee]/85 transition-colors hover:text-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f1117]"
                >
                  <span className="mt-0.5 text-[11px] tabular-nums text-indigo-300/70">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span>{item.text}</span>
                </Link>
              </li>
            ))}
          </ol>
        </nav>
      )}

      {/* 本文 (remark 変換済み HTML) — prose-lg + leading-[1.9] の月夜文庫 */}
      <div
        className="prose prose-invert prose-lg max-w-none prose-headings:font-bold prose-headings:tracking-tight prose-headings:text-[#e6e8ee] prose-h2:mb-5 prose-h2:mt-14 prose-h2:border-l-[3px] prose-h2:border-indigo-400/70 prose-h2:pl-4 prose-h2:text-2xl prose-h2:leading-snug prose-h3:mt-10 prose-h3:text-xl prose-h3:text-[#e6e8ee] prose-p:leading-[1.9] prose-p:text-[#e6e8ee]/90 prose-a:text-indigo-300 prose-a:decoration-indigo-400/40 prose-a:underline-offset-4 hover:prose-a:decoration-indigo-300 prose-blockquote:rounded-r-xl prose-blockquote:border-l-indigo-400/60 prose-blockquote:bg-indigo-500/[0.04] prose-blockquote:py-2 prose-blockquote:pr-4 prose-blockquote:text-[#e6e8ee]/80 prose-strong:font-semibold prose-strong:text-[#e6e8ee] prose-code:rounded-md prose-code:bg-white/[0.06] prose-code:px-1.5 prose-code:py-0.5 prose-code:text-indigo-200 prose-code:before:content-none prose-code:after:content-none prose-li:my-1 prose-li:leading-[1.85] prose-li:text-[#e6e8ee]/90"
        dangerouslySetInnerHTML={{ __html: article.contentHtml }}
      />

      {/* 広告スロット: 記事中間〜末尾 */}
      <AdBanner slot="article-mid" format="rectangle" className="mt-10" />

      {/* CTA: 記録を促す (ウェルネスグラデーション) */}
      <aside className="mt-14 rounded-3xl border border-indigo-300/25 bg-gradient-to-br from-indigo-500/15 via-purple-500/12 to-rose-500/8 p-7 shadow-[0_12px_40px_-16px_rgba(124,77,255,0.4)] sm:p-8">
        <div className="flex items-center gap-2">
          <Moon className="h-5 w-5 text-indigo-200" aria-hidden="true" />
          <h2 className="text-xl font-bold text-[#e6e8ee]">
            今夜の眠りを、明日の予報に。
          </h2>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-[#e6e8ee]/80">
          毎朝たった 30 秒の記録から、気圧・気温・月齢があなたの眠りにどう響いているかを、やさしく見える化します。
        </p>
        <div className="mt-5">
          <Button
            asChild
            className="rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 px-6 py-3 font-medium text-white shadow-lg shadow-indigo-500/25 hover:from-indigo-400 hover:to-purple-400 focus-visible:ring-2 focus-visible:ring-indigo-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f1117]"
          >
            <Link href="/record">今日の睡眠を記録する</Link>
          </Button>
        </div>
      </aside>

      {/* 関連記事 */}
      {related.length > 0 && (
        <section className="mt-14">
          <h2 className="mb-6 flex items-center gap-2 text-base font-semibold text-[#e6e8ee]">
            <Sparkles className="h-4 w-4 text-indigo-300" aria-hidden="true" />
            こちらの読みものもおすすめ
          </h2>
          <ul className="grid gap-4 sm:grid-cols-2">
            {related.map((r) => (
              <li key={r.slug}>
                <Link
                  href={`/articles/${r.slug}`}
                  className="block rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 transition-all duration-500 hover:-translate-y-0.5 hover:border-indigo-300/25 hover:bg-gradient-to-br hover:from-indigo-500/[0.08] hover:to-purple-500/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f1117]"
                >
                  <div className="text-[10px] font-medium text-[#1d9bf0]">
                    {r.category}
                  </div>
                  <div className="mt-1 text-sm font-semibold text-[#e6e8ee]">
                    {r.title}
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-[#8b92a5]">
                    {r.description}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 広告スロット: 記事末尾 */}
      <AdBanner slot="article-end" format="horizontal" className="mt-10" />

      {/* 医療免責 (必須・text-xs 固定) */}
      <div className="mt-14 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
        <div className="flex items-start gap-2">
          <Info
            className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#8b92a5]"
            aria-hidden="true"
          />
          <p className="text-xs leading-relaxed text-[#8b92a5]">
            本記事は一般的な情報提供を目的としたものであり、医学的な診断・治療の代替ではありません。
            体調に不安がある場合は、必ず医療機関にご相談ください。
          </p>
        </div>
      </div>
    </article>
  );
}

/** YYYY-MM-DD を「2026年4月10日」表記に */
function formatJpDate(iso: string): string {
  const [y, m, d] = iso.split("-").map((s) => parseInt(s, 10));
  if (!y || !m || !d) return iso;
  return `${y}年${m}月${d}日`;
}
