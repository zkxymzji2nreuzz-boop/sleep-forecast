import Link from "next/link";
import { ArrowLeft, Calendar, Tag, BookOpen, Pencil } from "lucide-react";

import type { ArticleFull, ArticleMeta } from "@/lib/types";
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
 */
export function ArticleLayout({ article, related }: Props) {
  const publishedLabel = formatJpDate(article.publishedAt);
  const updatedLabel = formatJpDate(article.updatedAt);
  const showUpdated = article.updatedAt !== article.publishedAt;

  return (
    <article className="container mx-auto max-w-screen-md px-4 pb-16 pt-8">
      {/* 戻るリンク */}
      <div className="mb-6">
        <Link
          href="/articles"
          className="inline-flex items-center gap-1.5 text-sm text-[#8b92a5] transition-colors hover:text-[#1d9bf0]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          記事一覧に戻る
        </Link>
      </div>

      {/* ヘッダー */}
      <header className="mb-8 border-b border-white/10 pb-6">
        <div className="mb-3 flex items-center gap-2 text-xs text-[#1d9bf0]">
          <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="font-medium uppercase tracking-wide">
            {article.category}
          </span>
        </div>

        <h1 className="text-2xl font-bold leading-tight text-[#e6e8ee] sm:text-3xl">
          {article.title}
        </h1>

        <p className="mt-3 text-sm text-[#8b92a5] sm:text-base">
          {article.description}
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-[#8b92a5]">
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
            <span className="inline-flex items-center gap-1.5">
              <Tag className="h-3.5 w-3.5" aria-hidden="true" />
              {article.tags.map((t) => (
                <span
                  key={t}
                  className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-[#e6e8ee]/80"
                >
                  #{t}
                </span>
              ))}
            </span>
          )}
        </div>
      </header>

      {/* 本文 (remark 変換済み HTML) */}
      <div
        className="prose prose-invert max-w-none prose-headings:text-[#e6e8ee] prose-p:text-[#e6e8ee]/90 prose-a:text-[#1d9bf0] prose-strong:text-[#e6e8ee] prose-li:text-[#e6e8ee]/90 prose-h2:mt-10 prose-h2:border-l-4 prose-h2:border-[#1d9bf0] prose-h2:pl-3 prose-h3:text-[#e6e8ee]"
        dangerouslySetInnerHTML={{ __html: article.contentHtml }}
      />

      {/* CTA: 記録を促す */}
      <aside className="mt-10 rounded-2xl border border-[#1d9bf0]/30 bg-gradient-to-br from-[#1d9bf0]/15 to-[#7c4dff]/10 p-6">
        <h2 className="text-lg font-semibold text-[#e6e8ee]">
          今日の睡眠を記録してみませんか
        </h2>
        <p className="mt-1 text-sm text-[#e6e8ee]/80">
          SleepForecast は毎朝 30 秒の記録で、気圧・気温・月齢から
          明日の眠気を予測します。自分の体のパターンを可視化してみましょう。
        </p>
        <div className="mt-4">
          <Button
            asChild
            className="bg-[#1d9bf0] text-white hover:bg-[#1a8cd8]"
          >
            <Link href="/record">今日の睡眠を記録する</Link>
          </Button>
        </div>
      </aside>

      {/* 関連記事 */}
      {related.length > 0 && (
        <section className="mt-12">
          <h2 className="mb-4 text-base font-semibold text-[#e6e8ee]">
            関連記事
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {related.map((r) => (
              <li key={r.slug}>
                <Link
                  href={`/articles/${r.slug}`}
                  className="block rounded-xl border border-white/10 bg-white/[0.03] p-4 transition-colors hover:border-[#1d9bf0]/50 hover:bg-white/[0.06]"
                >
                  <div className="text-[10px] uppercase tracking-wide text-[#1d9bf0]">
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

      {/* 医療免責 (必須) */}
      <p className="mt-10 rounded-lg border border-white/10 bg-white/[0.02] p-4 text-xs leading-relaxed text-[#8b92a5]">
        本記事は一般的な情報提供を目的としたものであり、医学的な診断・治療の代替ではありません。
        体調に不安がある場合は、必ず医療機関にご相談ください。
      </p>
    </article>
  );
}

/** YYYY-MM-DD を「2026年4月10日」表記に */
function formatJpDate(iso: string): string {
  const [y, m, d] = iso.split("-").map((s) => parseInt(s, 10));
  if (!y || !m || !d) return iso;
  return `${y}年${m}月${d}日`;
}
