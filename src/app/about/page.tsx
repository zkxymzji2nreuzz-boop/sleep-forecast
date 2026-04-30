import type { Metadata } from "next";
import { Moon, Info, Database, Shield, BookOpen, ExternalLink } from "lucide-react";
import { Breadcrumb } from "@/components/Breadcrumb";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://sleep-forecast.vercel.app";

export const metadata: Metadata = {
  title: "運営者情報",
  description:
    "SleepForecastの運営者情報・開発ストーリー・データソース・お問い合わせ先をご案内します。",
  alternates: { canonical: `${SITE_URL}/about` },
};

/** Person 構造化データ（E-E-A-T 強化） */
const personJsonLd = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: "SleepForecast 運営者",
  url: SITE_URL,
  sameAs: ["https://twitter.com/Sleep_Forecast"],
  knowsAbout: [
    "気象病",
    "低気圧頭痛",
    "睡眠の質",
    "自律神経",
    "気圧と健康",
    "ヘルスケアアプリ開発",
  ],
  description:
    "気象病・低気圧による体調不良に悩む家族のために、睡眠と気象データの相関分析 Web アプリ SleepForecast を個人開発・運営しています。",
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
    name: "SleepForecast 運営者",
    url: SITE_URL,
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
      <div className="relative mb-10 rounded-b-[2rem] bg-gradient-to-b from-indigo-500/[0.06] via-purple-500/[0.03] to-transparent pb-8 pt-10 sm:pt-14 px-5">
        <div className="mb-3 flex justify-center">
          <Moon className="h-8 w-8 text-indigo-300/60" aria-hidden="true" />
        </div>
        <h1 className="text-center text-2xl font-bold tracking-tight text-[#e6e8ee] sm:text-3xl">
          運営者情報
        </h1>
        <div className="mt-6 h-px bg-gradient-to-r from-transparent via-indigo-400/30 to-transparent" />
      </div>

      <Breadcrumb items={[{ name: "ホーム", href: "/" }, { name: "運営者情報" }]} />

      <div className="space-y-10 text-sm leading-[1.85] text-[#e6e8ee]/85">

        {/* SleepForecast について */}
        <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 sm:p-6">
          <h2 className="mb-4 border-l-[3px] border-indigo-400/70 pl-4 text-lg font-bold text-[#e6e8ee] leading-snug">
            SleepForecast について
          </h2>
          <p>
            SleepForecastは、気温・湿度・気圧・月齢などの気象データと
            日々の睡眠記録を組み合わせて「明日の眠気レベル」を予測する、ウェアラブル不要の
            ヘルスケア Web アプリです。
          </p>
          <p className="mt-3">
            高価なデバイスを買わなくても、ブラウザひとつで毎朝 15 秒の入力を続けるだけで、
            気象があなたの眠りにどう影響しているかを見える化します。
            個人差が大きい気象病の症状を「自分のデータ」で把握できることが、本サービス最大の特徴です。
          </p>
        </section>

        {/* 開発ストーリー */}
        <section className="rounded-3xl border border-white/[0.08] bg-gradient-to-br from-indigo-500/[0.06] via-purple-500/[0.03] to-transparent p-6 sm:p-8">
          <h2 className="mb-4 flex items-center gap-2 border-l-[3px] border-indigo-400/70 pl-4 text-lg font-bold text-[#e6e8ee] leading-snug">
            <Moon className="h-5 w-5 text-indigo-300/70" aria-hidden="true" />
            開発ストーリー
          </h2>
          <p>
            開発者の家族に、低気圧や台風が近づくと頭痛や不眠に悩まされる「気象病」を抱えている
            人がいます。「明日は眠れるだろうか」という不安を少しでも和らげたい
            ── そんな思いから SleepForecast は生まれました。
          </p>
          <p className="mt-3">
            既存の気象病対策アプリは通知が中心ですが、SleepForecast は個人の過去データと
            気象データの相関分析を行い、自分だけの「眠りの天気予報」を提供します。
            誰もが自分の体調パターンを理解し、前もって備えられる世界を目指しています。
          </p>
          <p className="mt-3">
            2024年の開発開始から、実際に気象病に悩む方々のフィードバックをもとに改善を続けています。
            気象病は医学的に認知された疾患概念であり、本サービスはその実態に基づいた設計をしています。
          </p>
        </section>

        {/* 運営者情報 */}
        <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 sm:p-6">
          <h2 className="mb-4 border-l-[3px] border-indigo-400/70 pl-4 text-lg font-bold text-[#e6e8ee] leading-snug">
            運営者情報
          </h2>
          <dl className="space-y-3">
            <div className="flex gap-4">
              <dt className="w-28 shrink-0 font-medium text-[#a8b0c2]">運営者名</dt>
              <dd>SleepForecast 運営者</dd>
            </div>
            <div className="flex gap-4">
              <dt className="w-28 shrink-0 font-medium text-[#a8b0c2]">サービス名</dt>
              <dd>SleepForecast</dd>
            </div>
            <div className="flex gap-4">
              <dt className="w-28 shrink-0 font-medium text-[#a8b0c2]">開設年</dt>
              <dd>2024年</dd>
            </div>
            <div className="flex gap-4">
              <dt className="w-28 shrink-0 font-medium text-[#a8b0c2]">X（Twitter）</dt>
              <dd>
                <a
                  href="https://twitter.com/Sleep_Forecast"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-indigo-300 underline decoration-indigo-400/40 underline-offset-4 transition-colors hover:decoration-indigo-300"
                >
                  @Sleep_Forecast
                  <ExternalLink className="h-3 w-3" aria-hidden="true" />
                </a>
              </dd>
            </div>
            <div className="flex gap-4">
              <dt className="w-28 shrink-0 font-medium text-[#a8b0c2]">お問い合わせ</dt>
              <dd>
                <a
                  href="/contact"
                  className="text-indigo-300 underline decoration-indigo-400/40 underline-offset-4 transition-colors hover:decoration-indigo-300"
                >
                  お問い合わせページ
                </a>
                をご参照ください
              </dd>
            </div>
          </dl>
        </section>

        {/* データソース・参照情報 */}
        <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 sm:p-6">
          <h2 className="mb-4 flex items-center gap-2 border-l-[3px] border-indigo-400/70 pl-4 text-lg font-bold text-[#e6e8ee] leading-snug">
            <Database className="h-5 w-5 text-indigo-300/70" aria-hidden="true" />
            データソースと根拠
          </h2>
          <p className="mb-4 text-[#a8b0c2]">
            SleepForecast が使用する気象データ・アルゴリズムの根拠を明示します。
          </p>
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" aria-hidden="true" />
              <span>
                <strong className="text-[#e6e8ee]">気象データ：</strong>
                Open-Meteo（オープンソース気象 API）を使用。気象庁 JMA モデルおよびグローバルモデルを組み合わせ、日本全都道府県に対応しています。
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" aria-hidden="true" />
              <span>
                <strong className="text-[#e6e8ee]">気圧と睡眠の相関：</strong>
                気圧低下が自律神経（交感神経優位）に作用し、入眠障害・中途覚醒を招くことは複数の研究で示されています（天気痛・気象病の医学的知見に基づく）。
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" aria-hidden="true" />
              <span>
                <strong className="text-[#e6e8ee]">予測アルゴリズム：</strong>
                個人の過去記録と気象データの相関係数を算出し、個人差に応じた予測を行います。統計的に有意な傾向が確認できた場合のみ予測を提示します。
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" aria-hidden="true" />
              <span>
                <strong className="text-[#e6e8ee]">月齢データ：</strong>
                SunCalc ライブラリ（天文計算）を使用。月の満ち欠けと睡眠リズムの関係は時間生物学の分野で研究されています。
              </span>
            </li>
          </ul>
          <div className="mt-4 flex flex-wrap gap-2">
            <a
              href="https://open-meteo.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-full border border-white/10 px-3 py-1 text-xs text-[#a8b0c2] transition-colors hover:text-[#e6e8ee]"
            >
              <BookOpen className="h-3 w-3" aria-hidden="true" />
              Open-Meteo
              <ExternalLink className="h-3 w-3" aria-hidden="true" />
            </a>
          </div>
        </section>

        {/* プライバシー・透明性 */}
        <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 sm:p-6">
          <h2 className="mb-4 flex items-center gap-2 border-l-[3px] border-indigo-400/70 pl-4 text-lg font-bold text-[#e6e8ee] leading-snug">
            <Shield className="h-5 w-5 text-indigo-300/70" aria-hidden="true" />
            プライバシーと透明性
          </h2>
          <ul className="space-y-2 text-[#e6e8ee]/85">
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-indigo-400" aria-hidden="true">✓</span>
              <span>すべての睡眠記録はブラウザ（localStorage）のみに保存。外部サーバーへの送信は行いません。</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-indigo-400" aria-hidden="true">✓</span>
              <span>気象データの取得はサーバーサイドで行い、ユーザーの位置情報は都道府県レベルのみ使用します。</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-indigo-400" aria-hidden="true">✓</span>
              <span>Google Analytics（アクセス解析）および Google AdSense（広告配信）を使用しています。Cookie 設定はバナーから管理できます。</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-indigo-400" aria-hidden="true">✓</span>
              <span>本サービスは完全無料・登録不要です。ユーザーアカウントは存在せず、個人を特定する情報の取得は行っていません。</span>
            </li>
          </ul>
        </section>

        {/* サービスの目的 */}
        <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 sm:p-6">
          <h2 className="mb-4 border-l-[3px] border-indigo-400/70 pl-4 text-lg font-bold text-[#e6e8ee] leading-snug">
            サービスの目的
          </h2>
          <ul className="list-inside list-disc space-y-2 text-[#e6e8ee]/85">
            <li>気象データと睡眠品質の相関を可視化し、自己理解を促進する</li>
            <li>明日の睡眠品質を予測し、生活リズムの調整に役立てる</li>
            <li>気象病・低気圧頭痛に悩む方に、科学的根拠に基づく情報を提供する</li>
            <li>個人の体質・感受性に合わせたパーソナライズされた健康管理をサポートする</li>
          </ul>
        </section>

        {/* 医療免責 */}
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
          <p className="flex items-start gap-2 text-xs leading-relaxed text-[#a8b0c2]">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#a8b0c2]" aria-hidden="true" />
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
