"use client";

/**
 * HomeClient — ホームページの Client Component。
 *
 * page.tsx を Server Component 化するため、clientロジック
 * （useState / useEffect / localStorage）をここに分離。
 * JSON-LD は Server Component 側の page.tsx で SSR する。
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { Activity, Moon, Smartphone, Timer, Watch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { WeatherWidget } from "@/components/WeatherWidget";
import { OnboardingBanner } from "@/components/OnboardingBanner";
import { getRecords } from "@/lib/storage";
import {
  predictTomorrow,
  calculateContinuousRecordBadge,
} from "@/lib/prediction";
import { fetchWeatherForecast } from "@/lib/weather";
import { getPrefectureByCode } from "@/lib/prefectures";
import { calculateStats } from "@/lib/correlation";
import type { PredictionResult } from "@/lib/types";

const FEATURES = [
  {
    icon: Watch,
    title: "ウェアラブル不要",
    description:
      "高価なデバイスは要りません。ブラウザ 1 つであなたの睡眠を記録・予測します。",
  },
  {
    icon: Timer,
    title: "毎朝15秒で入力",
    description:
      "昨晩の眠りを 3 択でタップするだけ。気象データは自動で取得します。",
  },
  {
    icon: Moon,
    title: "明日の眠気を予報",
    description:
      "気圧・気温・月齢とあなたの過去データから、明日の睡眠品質を予測します。",
  },
] as const;

export function HomeClient() {
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [badge, setBadge] = useState<ReturnType<typeof calculateContinuousRecordBadge> | null>(null);
  const [loading, setLoading] = useState(true);
  const [recordCount, setRecordCount] = useState<number>(0);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [email, setEmail] = useState<string>("");
  const [currentPressure, setCurrentPressure] = useState<number | null>(null);

  useEffect(() => {
    const loadPrediction = async () => {
      try {
        const records = getRecords();
        setRecordCount(records.length);
        setIsLoaded(true);

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
            if (forecast?.pressureHpa != null) {
              setCurrentPressure(forecast.pressureHpa);
            }
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

  const handleEmailSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      const formspreeId = process.env.NEXT_PUBLIC_FORMSPREE_ID || "YOUR_FORM_ID";
      const response = await fetch(`https://formspree.io/f/${formspreeId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ email }),
      });
      if (response.ok) {
        setSubmitted(true);
      } else {
        console.error("通知登録エラー: HTTP", response.status);
      }
    } catch (err) {
      console.error("通知登録エラー:", err);
    }
  };

  return (
    <div className="container mx-auto max-w-screen-md px-4 py-10 sm:py-14">
      {/* オンボーディングバナー（初回訪問・記録ゼロ時のみ表示） */}
      <OnboardingBanner />

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
        <p className="mb-3 text-xs uppercase tracking-widest text-indigo-400">
          SleepForecast
        </p>
        <h1 className="mb-4 text-3xl font-bold leading-tight tracking-tight text-[#e6e8ee] sm:text-4xl md:text-5xl">
          気象病・低気圧から、明日の眠りを予報する
        </h1>
        <p className="mx-auto mb-8 max-w-md text-sm leading-relaxed text-[#9ba3b5] sm:text-base">
          気圧・気温・月齢からあなたの睡眠を読み解く
        </p>
        {isLoaded && (
          <>
            {recordCount === 0 && (
              <div className="mx-auto flex max-w-sm flex-col items-stretch justify-center gap-3">
                <Button asChild size="lg" className="h-12 w-full text-base">
                  <Link href="/record">
                    <Activity className="mr-1" aria-hidden="true" />
                    今日を記録する
                  </Link>
                </Button>
              </div>
            )}
            {recordCount >= 1 && recordCount <= 4 && (
              <div className="mx-auto flex max-w-sm flex-col items-stretch justify-center gap-3 sm:max-w-none sm:flex-row sm:items-center">
                <Button asChild size="lg" className="h-12 text-base">
                  <Link href="/record">
                    <Activity className="mr-1" aria-hidden="true" />
                    今日を記録する
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="h-9 border-indigo-400/40 text-sm text-[#e6e8ee] hover:bg-indigo-500/10 hover:text-[#e6e8ee]"
                >
                  <Link href="/dashboard">ダッシュボードを見る</Link>
                </Button>
              </div>
            )}
            {recordCount >= 5 && (
              <div className="mx-auto flex max-w-sm flex-col items-stretch justify-center gap-3 sm:max-w-none sm:flex-row sm:items-center">
                <Button asChild size="lg" className="h-12 text-base">
                  <Link href="/dashboard">
                    <Activity className="mr-1" aria-hidden="true" />
                    ダッシュボードで分析する
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="h-9 border-indigo-400/40 text-sm text-[#e6e8ee] hover:bg-indigo-500/10 hover:text-[#e6e8ee]"
                >
                  <Link href="/record">今日を記録する</Link>
                </Button>
              </div>
            )}
          </>
        )}
      </section>

      {/* 広告スロット: ヒーロー下 */}
      <AdBanner slot="hero-bottom" format="horizontal" className="mb-8" />

      {/* 気象・睡眠ウィジェット: 今夜の睡眠予報 + 気圧グラフ + 5日間予報 */}
      <div className="mb-12">
        <WeatherWidget />

        {/* iOSアプリ通知登録フォーム */}
        <div className="mt-8 rounded-2xl border border-white/10 bg-[#1a1f2e] p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-base font-semibold text-[#e6e8ee]">
                <Smartphone className="h-4 w-4 text-indigo-400" aria-hidden="true" />
                iOSアプリ開発中
              </p>
              <p className="mt-1 text-xs text-[#9ba3b5]">
                気圧急落アラートなど、通知機能を準備中です
              </p>
            </div>
          </div>

          {/* 今日の気象コンディション（prediction があれば表示） */}
          {prediction && currentPressure != null && (
            <p className="mt-3 text-xs text-[#9ba3b5]">
              今日の気圧: {Math.round(currentPressure)}hPaです
            </p>
          )}

          {/* 通知登録フォーム */}
          <div className="mt-4 border-t border-white/10 pt-4">
            {submitted ? (
              <p className="text-sm text-indigo-400">登録ありがとうございます！</p>
            ) : (
              <>
                <p className="mb-2 text-xs text-[#9ba3b5]">リリース時に通知を受け取る</p>
                <form
                  action={`https://formspree.io/f/${process.env.NEXT_PUBLIC_FORMSPREE_ID || "YOUR_FORM_ID"}`}
                  method="POST"
                  onSubmit={handleEmailSubmit}
                  className="flex flex-col gap-2 sm:flex-row"
                >
                  <Input
                    type="email"
                    name="email"
                    required
                    placeholder="メールアドレス"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="border-white/10 bg-[#0f1117] text-[#e6e8ee] placeholder:text-[#9ba3b5]"
                  />
                  <Button type="submit" className="h-10 whitespace-nowrap">
                    通知を受け取る
                  </Button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 3ステップで始める */}
      <section
        aria-labelledby="howto-heading"
        className="mb-12 sm:mb-16"
      >
        <h2
          id="howto-heading"
          className="mb-6 text-center text-xl font-semibold text-[#e6e8ee] sm:text-2xl"
        >
          3 ステップで始める
        </h2>
        <ol className="space-y-4">
          {[
            {
              step: "01",
              title: "今日の眠りを記録する",
              desc: "「よく眠れた」「なんとか眠れた」「眠れなかった」の 3 択でタップ。15 秒で完了します。",
              href: "/record",
            },
            {
              step: "02",
              title: "7 日間続けてみる",
              desc: "気象データは自動取得。記録を重ねるほど、あなただけのパターンが見えてきます。",
              href: null,
            },
            {
              step: "03",
              title: "ダッシュボードで傾向を把握",
              desc: "気圧・気温・月齢との相関グラフで、眠れない夜の原因が分かります。",
              href: "/dashboard",
            },
          ].map(({ step, title, desc, href }) => (
            <li key={step} className="flex gap-4 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
              <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-indigo-500/15 text-xs font-bold text-indigo-300">
                {step}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#e6e8ee]">
                  {href ? (
                    <a href={href} className="hover:underline decoration-indigo-400/50">
                      {title}
                    </a>
                  ) : title}
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-[#9ba3b5]">{desc}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

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
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-indigo-500/15 text-indigo-400">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <CardTitle className="text-base text-[#e6e8ee]">
                    {feature.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm leading-relaxed text-[#9ba3b5]">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <p className="text-center text-xs text-[#9ba3b5]/80">
        ※ 本サービスは医療行為・診断ではありません
      </p>
    </div>
  );
}
