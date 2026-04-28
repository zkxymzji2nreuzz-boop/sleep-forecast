/**
 * ホームページ — Server Component。
 *
 * - WebApplication JSON-LD を SSR で出力（Google クローラーが初回取得可能）
 * - client ロジック（useState / useEffect / localStorage）は HomeClient に委譲
 */

import { HomeClient } from "@/components/HomeClient";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://sleep-forecast.vercel.app";

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
