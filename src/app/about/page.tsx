import type { Metadata } from "next";
import { Moon, Info, Database, Shield, BookOpen, ExternalLink, User } from "lucide-react";
import { Breadcrumb } from "@/components/Breadcrumb";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://sleep-forecast.vercel.app";

export const metadata: Metadata = {
  title: "運営者情報",
  description:
    "SleepForecastの運営者・辻要のプロフィール、開発ストーリー、データソース、お問い合わせ先をご案内します。",
  alternates: { canonical: `${SITE_URL}/about` },
};

/** Person 構造化データ（E-E-A-T 強化） */
const personJsonLd = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: "辻要",
  url: `${SITE_URL}/about`,
  sameAs: [
    "https://twitter.com/Sleep_Forecast",
    "https://note.com/sleep_forecast",
  ],
  knowsAbout: [
    "気象病",
    "低気圧頭痛",
    "睡眠の質",
    "自律神経",
    "気圧と健康",
    "ヘルスケアアプリ開発",
    "Webアプリケーション開発",
  ],
  description:
    "ITエンジニア。気象病に悩む家族のために、睡眠と気象データの相関分析 Web アプリ SleepForecast を個人開発・運営。",
};

/** WebSite 構造化データ */
const webSiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "SleepForecast",
  url: SITE_URL,
  description:
    "気圧・気温・月齢から明日の睡眠質を予報するヘルスケア Web アプリ。",
  inLanguage: "ja",
  publisher: {
    "@type": "Person",
    name: "辻要",
    url: `${SITE_URL}/about`,
  },
};

export default function AboutPage() {
  return (
    <div className="container mx-auto max-w-[680px] px-5 pb-20">
      {/* Person 構造化データ（SSR 出力） */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(personJsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(webSiteJsonLd).replace(/</g, "\\u003c"),
        }}
      />

      {/* グラデーション・ミニヒーロー */}
      <div className="relative mb-10 rounded-b-[2rem] bg-gradient-to-b from-primary/[0.06] via-primary/[0.03] to-transparent pb-8 pt-10 sm:pt-14 px-5">
        <div className="mb-3 flex justify-center">
          <Moon className="h-8 w-8 text-primary/60" aria-hidden="true" />
        </div>
        <h1 className="text-center text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          運営者情報
        </h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          SleepForecast 開発者・辻要について
        </p>
        <div className="mt-6 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
      </div>

      <Breadcrumb items={[{ name: "ホーム", href: "/" }, { name: "運営者情報" }]} />

      <div className="space-y-10 text-sm leading-[1.85] text-foreground/85">

        {/* 著者プロフィール */}
        <section className="rounded-3xl border border-primary/15 bg-gradient-to-br from-primary/[0.08] via-primary/[0.04] to-transparent p-6 sm:p-8">
          <h2 className="mb-5 flex items-center gap-2 border-l-[3px] border-primary/70 pl-4 text-lg font-bold text-foreground leading-snug">
            <User className="h-5 w-5 text-primary/70" aria-hidden="true" />
            著者プロフィール
          </h2>
          <div className="flex items-start gap-5">
            {/* アバタープレースホルダー */}
            <div
              aria-hidden="true"
              className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/30 to-primary/15 text-2xl font-bold text-primary/60"
            >
              辻
            </div>
            <div className="min-w-0">
              <p className="text-base font-bold text-foreground">辻 要（つじ かなめ）</p>
              <p className="mt-0.5 text-xs text-muted-foreground">ITエンジニア / SleepForecast 開発者</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <a
                  href="https://twitter.com/Sleep_Forecast"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-full border border-border bg-card/60 px-3 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  <ExternalLink className="h-3 w-3" aria-hidden="true" />
                  X @Sleep_Forecast
                </a>
                <a
                  href="https://note.com/sleep_forecast"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-full border border-border bg-card/60 px-3 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  <ExternalLink className="h-3 w-3" aria-hidden="true" />
                  note
                </a>
              </div>
            </div>
          </div>
          <div className="mt-5 space-y-3 text-sm leading-[1.85]">
            <p>
              ITエンジニアとして Web サービスの開発に携わる傍ら、家族の「気象病」をきっかけに
              SleepForecast を個人開発しました。低気圧や台風が近づくたびに頭痛や不眠に悩まされる
              家族の様子を見て、「明日は眠れるだろうか」という不安を数字で見える化できないか、
              と考えたのが出発点です。
            </p>
            <p>
              既存の気象病アプリは「今日は注意」という通知が中心でしたが、それでは後手の対応しか
              できません。個人の過去データと気象データの相関を分析して、自分だけの「眠りの天気予報」
              を前日に届けるサービスを作りたいと思い、2024年に開発を開始しました。
            </p>
            <p>
              エンジニアとして培ったデータ分析・アルゴリズム設計の知識を活かしつつ、
              医療・健康情報の正確な取り扱いには細心の注意を払っています。
              気象病は医学的に認知された疾患概念であり、本サービスはその実態に基づいた設計をしています。
            </p>
          </div>
        </section>

        {/* 開発ストーリー */}
        <section className="rounded-3xl border border-border bg-gradient-to-br from-primary/[0.06] via-primary/[0.03] to-transparent p-6 sm:p-8">
          <h2 className="mb-4 flex items-center gap-2 border-l-[3px] border-primary/70 pl-4 text-lg font-bold text-foreground leading-snug">
            <Moon className="h-5 w-5 text-primary/70" aria-hidden="true" />
            SleepForecast について
          </h2>
          <p>
            SleepForecast は、気温・湿度・気圧・月齢などの気象データと
            日々の睡眠記録を組み合わせて「明日の眠気レベル」を予測する、ウェアラブル不要の
            ヘルスケア Web アプリです。
          </p>
          <p className="mt-3">
            高価なデバイスを買わなくても、ブラウザひとつで毎朝 15 秒の入力を続けるだけで、
            気象があなたの眠りにどう影響しているかを見える化します。
            個人差が大きい気象病の症状を「自分のデータ」で把握できることが、本サービス最大の特徴です。
          </p>
          <p className="mt-3">
            2024年の開発開始から、実際に気象病に悩む方々のフィードバックをもとに改善を続けています。
            誰もが自分の体調パターンを理解し、前もって備えられる世界を目指しています。
          </p>
        </section>

        {/* 監修者スロット（将来の専門家監修用） */}
        <section className="rounded-2xl border border-dashed border-border bg-card/30 p-5 sm:p-6">
          <h2 className="mb-3 border-l-[3px] border-primary/40 pl-4 text-base font-bold text-foreground leading-snug">
            専門家監修（準備中）
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            より正確・信頼性の高い情報をお届けするため、睡眠専門医または薬剤師による記事監修の導入を
            準備しています。監修者が決まり次第、こちらにプロフィールを掲載します。
          </p>
        </section>

        {/* 運営者情報 */}
        <section className="rounded-2xl border border-border bg-card/50 p-5 sm:p-6">
          <h2 className="mb-4 border-l-[3px] border-primary/70 pl-4 text-lg font-bold text-foreground leading-snug">
            運営者情報
          </h2>
          <dl className="space-y-3">
            <div className="flex gap-4">
              <dt className="w-28 shrink-0 font-medium text-muted-foreground">運営者名</dt>
              <dd>辻 要（辻要）</dd>
            </div>
            <div className="flex gap-4">
              <dt className="w-28 shrink-0 font-medium text-muted-foreground">サービス名</dt>
              <dd>SleepForecast</dd>
            </div>
            <div className="flex gap-4">
              <dt className="w-28 shrink-0 font-medium text-muted-foreground">開設年</dt>
              <dd>2024年</dd>
            </div>
            <div className="flex gap-4">
              <dt className="w-28 shrink-0 font-medium text-muted-foreground">X（Twitter）</dt>
              <dd>
                <a
                  href="https://twitter.com/Sleep_Forecast"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-primary/80 underline decoration-primary/40 underline-offset-4 transition-colors hover:decoration-primary/80"
                >
                  @Sleep_Forecast
                  <ExternalLink className="h-3 w-3" aria-hidden="true" />
                </a>
              </dd>
            </div>
            <div className="flex gap-4">
              <dt className="w-28 shrink-0 font-medium text-muted-foreground">note</dt>
              <dd>
                <a
                  href="https://note.com/sleep_forecast"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-primary/80 underline decoration-primary/40 underline-offset-4 transition-colors hover:decoration-primary/80"
                >
                  note.com/sleep_forecast
                  <ExternalLink className="h-3 w-3" aria-hidden="true" />
                </a>
              </dd>
            </div>
            <div className="flex gap-4">
              <dt className="w-28 shrink-0 font-medium text-muted-foreground">お問い合わせ</dt>
              <dd>
                <a
                  href="/contact"
                  className="text-primary/80 underline decoration-primary/40 underline-offset-4 transition-colors hover:decoration-primary/80"
                >
                  お問い合わせページ
                </a>
                をご参照ください
              </dd>
            </div>
          </dl>
        </section>

        {/* データソース・参照情報 */}
        <section className="rounded-2xl border border-border bg-card/50 p-5 sm:p-6">
          <h2 className="mb-4 flex items-center gap-2 border-l-[3px] border-primary/70 pl-4 text-lg font-bold text-foreground leading-snug">
            <Database className="h-5 w-5 text-primary/70" aria-hidden="true" />
            データソースと根拠
          </h2>
          <p className="mb-4 text-muted-foreground">
            SleepForecast が使用する気象データ・アルゴリズムの根拠を明示します。
          </p>
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
              <span>
                <strong className="text-foreground">気象データ：</strong>
                Open-Meteo（オープンソース気象 API）を使用。気象庁 JMA モデルおよびグローバルモデルを組み合わせ、日本全都道府県に対応しています。
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
              <span>
                <strong className="text-foreground">気圧と睡眠の相関：</strong>
                気圧低下が自律神経（交感神経優位）に作用し、入眠障害・中途覚醒を招くことは複数の研究で示されています（天気痛・気象病の医学的知見に基づく）。
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
              <span>
                <strong className="text-foreground">予測アルゴリズム：</strong>
                個人の過去記録と気象データの相関係数を算出し、個人差に応じた予測を行います。統計的に有意な傾向が確認できた場合のみ予測を提示します。
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
              <span>
                <strong className="text-foreground">月齢データ：</strong>
                SunCalc ライブラリ（天文計算）を使用。月の満ち欠けと睡眠リズムの関係は時間生物学の分野で研究されています。
              </span>
            </li>
          </ul>
          <div className="mt-4 flex flex-wrap gap-2">
            <a
              href="https://open-meteo.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              <BookOpen className="h-3 w-3" aria-hidden="true" />
              Open-Meteo
              <ExternalLink className="h-3 w-3" aria-hidden="true" />
            </a>
          </div>
        </section>

        {/* プライバシー・透明性 */}
        <section className="rounded-2xl border border-border bg-card/50 p-5 sm:p-6">
          <h2 className="mb-4 flex items-center gap-2 border-l-[3px] border-primary/70 pl-4 text-lg font-bold text-foreground leading-snug">
            <Shield className="h-5 w-5 text-primary/70" aria-hidden="true" />
            プライバシーと透明性
          </h2>
          <ul className="space-y-2 text-foreground/85">
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-primary" aria-hidden="true">✓</span>
              <span>すべての睡眠記録はブラウザ（localStorage）のみに保存。外部サーバーへの送信は行いません。</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-primary" aria-hidden="true">✓</span>
              <span>気象データの取得はサーバーサイドで行い、ユーザーの位置情報は都道府県レベルのみ使用します。</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-primary" aria-hidden="true">✓</span>
              <span>Google Analytics（アクセス解析）および Google AdSense（広告配信）を使用しています。Cookie 設定はバナーから管理できます。</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-primary" aria-hidden="true">✓</span>
              <span>本サービスは完全無料・登録不要です。ユーザーアカウントは存在せず、個人を特定する情報の取得は行っていません。</span>
            </li>
          </ul>
        </section>

        {/* サービスの目的 */}
        <section className="rounded-2xl border border-border bg-card/50 p-5 sm:p-6">
          <h2 className="mb-4 border-l-[3px] border-primary/70 pl-4 text-lg font-bold text-foreground leading-snug">
            サービスの目的
          </h2>
          <ul className="list-inside list-disc space-y-2 text-foreground/85">
            <li>気象データと睡眠品質の相関を可視化し、自己理解を促進する</li>
            <li>明日の睡眠品質を予測し、生活リズムの調整に役立てる</li>
            <li>気象病・低気圧頭痛に悩む方に、科学的根拠に基づく情報を提供する</li>
            <li>個人の体質・感受性に合わせたパーソナライズされた健康管理をサポートする</li>
          </ul>
        </section>

        {/* 医療免責 */}
        <div className="rounded-2xl border border-border bg-card/50 p-4">
          <p className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span>
              本サービスは医療行為・診断を目的としたものではありません。
              掲載情報は一般的な知見に基づくものであり、個々の症状に対する医療的助言ではありません。
              体調に不安がある場合は医療機関にご相談ください。
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
