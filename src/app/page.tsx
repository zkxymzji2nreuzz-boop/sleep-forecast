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
      <HomeClient />
    </>
  );
}
