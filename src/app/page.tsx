/**
 * ホームページ — Server Component。
 *
 * - WebApplication JSON-LD を SSR で出力（Google クローラーが初回取得可能）
 * - client ロジック（useState / useEffect / localStorage）は HomeClient に委譲
 */

import type { Metadata } from "next";
import { HomeClient } from "@/components/HomeClient";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://sleep-forecast.vercel.app";

export const metadata: Metadata = {
  title: "SleepForecast — 明日の眠りを気象から予報する",
  description:
    "気象病・低気圧が気になる方へ。気圧・気温・月齢から明日の睡眠質を予報するアプリ。毎朝15秒の記録で、あなただけの眠れない夜のパターンが分かります。",
  alternates: {
    canonical: SITE_URL,
  },
  openGraph: {
    type: "website",
    title: "SleepForecast — 明日の眠りを気象から予報する",
    description:
      "気象病・低気圧が気になる方へ。気圧・気温・月齢から明日の睡眠質を予報するアプリ。毎朝15秒の記録で、あなただけの眠れない夜のパターンが分かります。",
    url: SITE_URL,
  },
};

const webAppJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "SleepForecast",
  url: SITE_URL,
  applicationCategory: "HealthApplication",
  operatingSystem: "Web",
  offers: { "@type": "Offer", price: "0" },
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "SleepForecastとはどんなアプリですか？",
      acceptedAnswer: {
        "@type": "Answer",
        text: "気圧・気温・湿度・月齢などの気象データを自動取得し、翌日の睡眠質を予測するWebアプリです。毎朝15秒の記録を続けることで、あなただけの「眠れない夜のパターン」が可視化されます。",
      },
    },
    {
      "@type": "Question",
      name: "低気圧が来ると眠れなくなるのはなぜですか？",
      acceptedAnswer: {
        "@type": "Answer",
        text: "気圧が下がると自律神経のバランスが乱れやすく、交感神経が優位になることで興奮状態が続き、入眠しにくくなります。SleepForecastは気圧変化を事前に検知し、対策を促します。",
      },
    },
    {
      "@type": "Question",
      name: "登録や料金は必要ですか？",
      acceptedAnswer: {
        "@type": "Answer",
        text: "完全無料・登録不要でご利用いただけます。記録データはお使いのブラウザの端末内にのみ保存され、外部サーバーへの送信は行いません。",
      },
    },
    {
      "@type": "Question",
      name: "データはどこに保存されますか？",
      acceptedAnswer: {
        "@type": "Answer",
        text: "すべての記録データはブラウザのlocalStorageに保存されます。外部サーバーや第三者への送信は行わないため、プライバシーが守られます。",
      },
    },
    {
      "@type": "Question",
      name: "何日記録すると予測の精度が上がりますか？",
      acceptedAnswer: {
        "@type": "Answer",
        text: "7日間以上の記録で相関分析が開始され、予測の信頼度が「中」になります。15日以上で「高」となり、気象パターンとあなたの睡眠との個人的な相関が分かるようになります。",
      },
    },
    {
      "@type": "Question",
      name: "気象病の診断ができますか？",
      acceptedAnswer: {
        "@type": "Answer",
        text: "SleepForecastは統計的な傾向をお伝えする情報提供サービスであり、医療行為・診断を目的としたものではありません。体調に不安がある場合は医療機関にご相談ください。",
      },
    },
  ],
};

export default function HomePage() {
  return (
    <>
      {/* WebApplication 構造化データ（SSR で出力） */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(webAppJsonLd).replace(/</g, "\\u003c"),
        }}
      />
      {/* FAQPage 構造化データ（Google リッチリザルト対応） */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(faqJsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <HomeClient />
    </>
  );
}
