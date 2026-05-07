import Link from "next/link";
import {
  ArrowLeft,
  Tag,
  BookOpen,
  Moon,
  Sparkles,
  Info,
  BarChart2,
  PenLine,
  Twitter,
} from "lucide-react";
import type { ArticleFull, ArticleMeta } from "@/lib/types";
import { AdBanner } from "@/components/AdBanner";
import { Button } from "@/components/ui/button";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://sleep-forecast.vercel.app";

// ---------------------------------------------------------------------------
// Inline CTA helpers (REQ-P2-03)
// ---------------------------------------------------------------------------

/**
 * contentHtml を第 n 番目の </h2> タグの直後で前半・後半に分割する。
 * 見つからない場合は [html, ""] を返す。
 */
function splitHtmlAtNthH2(html: string, n: number): [string, string] {
  let count = 0;
  let idx = 0;
  while (count < n) {
    const pos = html.indexOf("</h2>", idx);
    if (pos === -1) return [html, ""];
    idx = pos + 5; // "</h2>".length === 5
    count++;
  }
  return [html.slice(0, idx), html.slice(idx)];
}

/** 記事本文中に差し込む小型 CTA バナー */
function ArticleInlineCta() {
  return (
    <aside
      aria-label="SleepForecast アプリのご案内"
      className="not-prose my-10 flex flex-col gap-3 rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/10 via-primary/[0.06] to-transparent p-5 sm:flex-row sm:items-center sm:justify-between sm:gap-6"
    >
      <div className="flex items-start gap-3">
        <Moon
          className="mt-0.5 h-5 w-5 shrink-0 text-primary/80"
          aria-hidden="true"
        />
        <p className="text-sm leading-relaxed text-foreground/90">
          <span className="font-semibold text-foreground">
            毎朝 15 秒の記録で
          </span>
          、気圧があなたの眠りにどう影響しているかがわかります。
          <span className="ml-1 text-xs text-muted-foreground">
            無料・登録不要
          </span>
        </p>
      </div>
      <Button
        asChild
        size="sm"
        className="shrink-0 rounded-full bg-primary px-5 text-sm font-medium text-white hover:opacity-90 focus-visible:ring-2 focus-visible:ring-primary/80 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <Link href="/record">今すぐ無料で始める →</Link>
      </Button>
    </aside>
  );
}

type Props = {
  article: ArticleFull;
  related: ArticleMeta[];
  /** 記事本文中（インライン CTA の直後）に挿入するオプションのデータバッジ */
  dataBadge?: React.ReactNode;
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
 *   - 読み幅は 680px (≒ 60〜75ch) に絞り、prose-lg + leading-[1.9] で長文を読みやすく
 *   - F003/F004 と揃えた indigo→purple→rose のウェルネスグラデーションを継承
 *   - 境界線は border ではなくグラデーションディバイダーで柔らかく表現
 */
// ---------------------------------------------------------------------------
// RelatedActions (REQ-21)
// ---------------------------------------------------------------------------

/**
 * 記事のカテゴリ・タグに応じた「次に試してほしいアクション」を提案するカード。
 * カテゴリ × タグマッチングで最大2件のアクションリンクを生成する。
 */
function RelatedActions({ article }: { article: ArticleFull }) {
  type Action = {
    href: string;
    icon: React.ReactNode;
    label: string;
    description: string;
  };

  const actions: Action[] = [];

  const tags = article.tags.map((t) => t.toLowerCase());
  const cat = article.category.toLowerCase();

  // 睡眠記録を促すアクション（汎用・常時追加）
  actions.push({
    href: "/record",
    icon: <PenLine className="h-4 w-4 text-primary/80" aria-hidden />,
    label: "今日の睡眠を記録する",
    description: "記録を続けると、気象との相関があなただけのグラフで見えてきます。",
  });

  // ダッシュボードへのアクション（気圧・相関・分析系タグがある場合）
  const dashboardTriggers = ["気圧", "相関", "分析", "睡眠改善", "気象病", "自律神経", "低気圧"];
  const needsDashboard = dashboardTriggers.some(
    (k) => tags.includes(k) || cat.includes(k)
  );
  if (needsDashboard) {
    actions.push({
      href: "/dashboard",
      icon: <BarChart2 className="h-4 w-4 text-purple-300" aria-hidden />,
      label: "ダッシュボードで分析する",
      description: "記録データから気圧・月齢別の睡眠パターンを確認できます。",
    });
  }

  // 記事一覧へのアクション（記事が2本以上ある補完用）
  if (actions.length < 2) {
    actions.push({
      href: "/articles",
      icon: <Sparkles className="h-4 w-4 text-rose-300" aria-hidden />,
      label: "ほかの読みものを見る",
      description: "気象病・睡眠・自律神経に関するコラムをまとめています。",
    });
  }

  return (
    <section
      aria-label="この記事を読んだ方へのおすすめアクション"
      className="mt-12 rounded-2xl border border-border bg-card/50 p-5 sm:p-6"
    >
      <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
        <Sparkles className="h-3.5 w-3.5 text-primary/80" aria-hidden />
        この記事を読んだ次のステップ
      </h2>
      <ul className="space-y-3">
        {actions.slice(0, 2).map((action) => (
          <li key={action.href}>
            <Link
              href={action.href}
              className="flex items-start gap-3 rounded-xl border border-border bg-card/50 p-4 transition-all duration-300 hover:border-primary/25 hover:bg-gradient-to-br hover:from-primary/[0.08] hover:to-primary/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/80"
            >
              <span className="mt-0.5 flex-shrink-0">{action.icon}</span>
              <div>
                <p className="text-sm font-semibold text-foreground">{action.label}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{action.description}</p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function ArticleLayout({ article, related, dataBadge }: Props) {
  return (
    <article className="container mx-auto max-w-[680px] px-5 pb-20 pt-10 sm:pt-14">
      {/* 戻るリンク (柔らかいトーンの「ほかの読みものを見る」) */}
      <div>
        <Link
          href="/articles"
          className="mb-10 inline-flex min-h-[44px] items-center gap-1.5 rounded-sm text-[13px] text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/80 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          ほかの読みものを見る
        </Link>
      </div>

      {/* ヘッダー */}
      <header className="relative mb-10">
        {/* カテゴリバッジ (BookOpen アイコン + ピル) */}
        <div className="mb-4 flex items-center gap-2">
          <BookOpen className="h-3.5 w-3.5 text-primary/80" aria-hidden="true" />
          <span className="rounded-full border border-primary/15 bg-primary/10 px-3 py-1 text-xs font-medium text-primary/70">
            {article.category}
          </span>
        </div>

        <h1 className="text-[28px] font-bold leading-[1.35] tracking-tight text-foreground sm:text-[34px]">
          {article.title}
        </h1>
        <p className="mt-3 text-sm text-muted-foreground sm:text-base">
          {article.description}
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-3 text-xs text-muted-foreground">
          {article.tags.length > 0 && (
            <span className="inline-flex flex-wrap items-center gap-1.5">
              <Tag className="h-3.5 w-3.5" aria-hidden="true" />
              {article.tags.map((t) => (
                <span
                  key={t}
                  className="rounded-full border border-primary/15 bg-primary/10 px-2.5 py-0.5 text-[11px] text-primary/70"
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
          className="mt-6 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent"
        />
      </header>

      {/* 目次 (H2 が 3 件以上あるときのみ表示) */}
      {article.toc.length >= 3 && (
        <nav
          aria-label="目次"
          className="mb-12 rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/[0.06] via-primary/[0.04] to-transparent p-5 sm:p-6"
        >
          <div className="mb-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary/80" aria-hidden="true" />
            <h2 className="text-sm font-semibold tracking-wide text-foreground">
              目次
            </h2>
          </div>
          <ol className="space-y-2 text-sm">
            {article.toc.map((item, index) => (
              <li key={item.id} className="leading-relaxed">
                <Link
                  href={`#${item.id}`}
                  className="inline-flex gap-2 rounded-sm text-foreground/85 transition-colors hover:text-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/80 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  <span className="mt-0.5 text-[11px] tabular-nums text-primary/80/70">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span>{item.text}</span>
                </Link>
              </li>
            ))}
          </ol>
        </nav>
      )}

      {/* 本文 (remark 変換済み HTML) — インライン CTA を第2 h2 直後に挿入 (REQ-P2-03) */}
      {(() => {
        const proseClass =
          "prose prose-invert prose-lg max-w-none prose-headings:font-bold prose-headings:tracking-tight prose-headings:text-foreground prose-h2:mb-5 prose-h2:mt-14 prose-h2:border-l-[3px] prose-h2:border-primary/70 prose-h2:pl-4 prose-h2:text-2xl prose-h2:leading-snug prose-h3:mt-10 prose-h3:text-xl prose-h3:text-foreground prose-p:leading-[1.9] prose-p:text-foreground/90 prose-a:text-primary/80 prose-a:decoration-primary/40 prose-a:underline-offset-4 hover:prose-a:decoration-primary/80 prose-blockquote:rounded-r-xl prose-blockquote:border-l-primary/60 prose-blockquote:bg-primary/[0.04] prose-blockquote:py-2 prose-blockquote:pr-4 prose-blockquote:text-foreground/80 prose-strong:font-semibold prose-strong:text-foreground prose-code:rounded-md prose-code:bg-card/70 prose-code:px-1.5 prose-code:py-0.5 prose-code:text-primary/70 prose-code:before:content-none prose-code:after:content-none prose-li:my-1 prose-li:leading-[1.85] prose-li:text-foreground/90";
        const [part1, part2] = splitHtmlAtNthH2(article.contentHtml, 2);
        return (
          <>
            <div
              className={proseClass}
              dangerouslySetInnerHTML={{ __html: part1 }}
            />
            {part2 && <ArticleInlineCta />}
            {part2 && dataBadge}
            {part2 && (
              <div
                className={proseClass}
                dangerouslySetInnerHTML={{ __html: part2 }}
              />
            )}
          </>
        );
      })()}

      {/* 広告スロット: 記事中間〜末尾 */}
      <AdBanner slot="article-mid" format="rectangle" className="mt-10" />

      {/* 関連アクション (REQ-21) */}
      <RelatedActions article={article} />

      {/* CTA区切り */}
      <div className="mt-14 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

      {/* CTA: 記録を促す (ウェルネスグラデーション) */}
      <aside className="mt-8 rounded-3xl border border-primary/25 bg-gradient-to-br from-primary/15 via-primary/[0.12] to-primary/[0.08] p-7 shadow-[0_12px_40px_-16px_rgba(124,77,255,0.4)] sm:p-8">
        <div className="flex items-center gap-2">
          <Moon className="h-5 w-5 text-primary/70" aria-hidden="true" />
          <h2 className="text-xl font-bold text-foreground">
            この記事を読んだら、今夜の眠りを記録してみませんか？
          </h2>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-foreground/80">
          毎朝たった 15 秒の記録から、気圧・気温・月齢があなたの眠りにどう響いているかを、やさしく見える化します。7日続けると、気象と睡眠の相関分析がスタートします。
        </p>
        <ul className="mt-3 space-y-1 text-xs text-foreground/60">
          <li>✓ 無料・登録不要で今すぐ始められる</li>
          <li>✓ データはあなたの端末のみに保存（外部送信なし）</li>
          <li>✓ 気圧・気温・月齢を自動取得</li>
        </ul>
        <div className="mt-5">
          <Button
            asChild
            className="w-full rounded-full bg-gradient-to-r from-primary to-primary/60 px-6 py-3 font-medium text-white shadow-lg shadow-primary/20 hover:opacity-90 focus-visible:ring-2 focus-visible:ring-primary/80 focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:w-auto"
          >
            <Link href="/record">今日の睡眠を記録する →</Link>
          </Button>
        </div>
      </aside>

      {/* X (Twitter) シェアボタン */}
      {(() => {
        const articleUrl = `${SITE_URL}/articles/${article.slug}`;
        const tweetText = `${article.title} | SleepForecast`;
        const hashtags = ["気象病", "睡眠", "SleepForecast"].join(",");
        const tweetUrl =
          `https://twitter.com/intent/tweet` +
          `?text=${encodeURIComponent(tweetText)}` +
          `&url=${encodeURIComponent(articleUrl)}` +
          `&hashtags=${encodeURIComponent(hashtags)}`;
        return (
          <div className="mt-8 flex justify-center">
            <a
              href={tweetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-border bg-card/60 px-5 py-2.5 text-sm font-medium text-foreground transition-all hover:border-[#1d9bf0]/40 hover:bg-[#1d9bf0]/10 hover:text-[#1d9bf0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/80"
            >
              <Twitter className="h-4 w-4" aria-hidden="true" />
              この記事を X でシェアする
            </a>
          </div>
        );
      })()}

      {/* 関連記事 */}
      {related.length > 0 && (
        <section className="mt-14">
          <h2 className="mb-6 flex items-center gap-2 text-base font-semibold text-foreground">
            <Sparkles className="h-4 w-4 text-primary/80" aria-hidden="true" />
            こちらの読みものもおすすめ
          </h2>
          <ul className="grid gap-4 sm:grid-cols-2">
            {related.map((r) => (
              <li key={r.slug}>
                <Link
                  href={`/articles/${r.slug}`}
                  className="block rounded-2xl border border-border bg-card/50 p-4 transition-all duration-500 hover:-translate-y-0.5 hover:border-primary/25 hover:bg-gradient-to-br hover:from-primary/[0.08] hover:to-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/80 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  <div className="text-[10px] font-medium text-primary">
                    {r.category}
                  </div>
                  <div className="mt-1 text-sm font-semibold text-foreground">
                    {r.title}
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
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
      <div className="mt-14 rounded-2xl border border-border bg-card/50 p-5">
        <div className="flex items-start gap-2">
          <Info
            className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
          <p className="text-xs leading-relaxed text-muted-foreground">
            本記事は一般的な情報提供を目的としたものであり、医学的な診断・治療の代替ではありません。
            体調に不安がある場合は、必ず医療機関にご相談ください。
          </p>
        </div>
      </div>
    </article>
  );
}

