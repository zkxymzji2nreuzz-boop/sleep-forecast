"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Activity, Moon, Timer, Watch } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AdBanner } from "@/components/AdBanner";
import { PredictionCard } from "@/components/PredictionCard";
import { ContinuousRecordBadge } from "@/components/ContinuousRecordBadge";
import { getRecords } from "@/lib/storage";
import {
  predictTomorrow,
  calculateContinuousRecordBadge,
} from "@/lib/prediction";
import { fetchWeatherForecast } from "@/lib/weather";
import { getPrefectureByCode } from "@/lib/prefectures";
import { calculateStats } from "@/lib/correlation";
import type { PredictionResult } from "@/lib/types";

/**
 * ランディングページ。
 * F001 では予測機能は未実装のため、コピーと CTA のみのスケルトン。
 */
const FEATURES = [
  {
    icon: Watch,
    title: "ウェアラブル不要",
    description:
      "高価なデバイスは要りません。ブラウザ 1 つであなたの睡眠を記録・予測します。",
  },
  {
    icon: Timer,
    title: "毎朝 30 秒で入力",
    description:
      "昨晩の眠りを 5 段階でタップするだけ。気象データは自動で取得します。",
  },
  {
    icon: Moon,
    title: "明日の眠気を予報",
    description:
      "気圧・気温・月齢とあなたの過去データから、明日の睡眠品質を予測します。",
  },
] as const;

export default function HomePage() {
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [badge, setBadge] = useState<ReturnType<typeof calculateContinuousRecordBadge> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPrediction = async () => {
      try {
        const records = getRecords();

        // 連続記録バッジを計算
        if (records.length > 0) {
          const stats = calculateStats(records);
          setBadge(calculateContinuousRecordBadge(stats.longestStreak));
        }

        // 予測を計算
        if (records.length > 0) {
          const lastRecord = records[0];
          const prefecture = getPrefectureByCode(lastRecord.prefectureCode);

          if (prefecture) {
            const forecast = await fetchWeatherForecast(
              prefecture.latitude,
              prefecture.longitude
            );
            const result = predictTomorrow(records, forecast);
            setPrediction(result);
          }
        }
      } catch (err) {
        console.error("予測計算エラー:", err);
      } finally {
        setLoading(false);
      }
    };

    loadPrediction();
  }, []);

  /** WebApplication JSON-LD (SEO 構造化データ) */
  const webAppJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "SleepForecast",
    url: "https://sleep-forecast.vercel.app",
    applicationCategory: "HealthApplication",
    operatingSystem: "Web",
    offers: { "@type": "Offer", price: "0" },
  };

  return (
    <div className="container mx-auto max-w-screen-md px-4 py-10 sm:py-14">
      {/* WebApplication 構造化データ */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(webAppJsonLd).replace(/</g, "\\u003c"),
        }}
      />

      {/* 連続記録バッジ + 予測カード */}
      {!loading && (
        <>
          {badge?.level && (
            <div className="mb-6">
              <ContinuousRecordBadge badge={badge} />
            </div>
          )}

          {prediction && (
            <div className="mb-12">
              <PredictionCard prediction={prediction} variant="compact" />
            </div>
          )}
        </>
      )}

      <section className="mb-12 text-center sm:mb-16">
        <p className="mb-3 text-xs uppercase tracking-widest text-[#1d9bf0]">
          SleepForecast
        </p>
        <h1 className="mb-4 text-3xl font-bold leading-tight tracking-tight text-[#e6e8ee] sm:text-4xl md:text-5xl">
          明日の眠気を予報する
        </h1>
        <p className="mx-auto mb-8 max-w-md text-sm leading-relaxed text-[#8b92a5] sm:text-base">
          気圧・気温・月齢からあなたの睡眠を読み解く
        </p>

        <div className="mx-auto flex max-w-sm flex-col items-stretch justify-center gap-3 sm:max-w-none sm:flex-row">
          <Button asChild size="lg" className="h-12 text-base">
            <Link href="/record">
              <Activity className="mr-1" aria-hidden="true" />
              今日を記録する
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="lg"
            className="h-12 border-[#1d9bf0]/40 text-base text-[#e6e8ee] hover:bg-[#1d9bf0]/10 hover:text-[#e6e8ee]"
          >
            <Link href="/dashboard">ダッシュボードを見る</Link>
          </Button>
        </div>
      </section>

      {/* 広告スロット: ヒーロー下 */}
      <AdBanner slot="hero-bottom" format="horizontal" className="mb-8" />

      <section
        aria-labelledby="features-heading"
        className="mb-12 sm:mb-16"
      >
        <h2
          id="features-heading"
          className="mb-6 text-center text-xl font-semibold text-[#e6e8ee] sm:text-2xl"
        >
          SleepForecast の特徴
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {FEATURES.map((feature) => {
            const Icon = feature.icon;
            return (
              <Card
                key={feature.title}
                className="border-white/5 bg-[#1a1f2e]"
              >
                <CardHeader className="space-y-2 pb-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[#1d9bf0]/15 text-[#1d9bf0]">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <CardTitle className="text-base text-[#e6e8ee]">
                    {feature.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm leading-relaxed text-[#8b92a5]">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <p className="text-center text-xs text-[#8b92a5]/80">
        ※ 本サービスは医療行為・診断ではありません
      </p>
    </div>
  );
}
