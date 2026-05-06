"use client";

/**
 * HomeClient — ホームページの Client Component。
 *
 * page.tsx を Server Component 化するため、clientロジック
 * （useState / useEffect / localStorage）をここに分離。
 * JSON-LD は Server Component 側の page.tsx で SSR する。
 *
 * ─ Phase 設計 ─────────────────────────────────────────────
 * P0 (0件)  : Hero(CTA1つ) → WeeklyRiskForecast(full) → AdBanner → WeatherWidget → 3ステップ → FAQ
 * P1 (1-6件): Hero(CTA2つ) → WeeklyRiskForecast(full) → AdBanner → WeatherWidget → FAQ
 * P2 (7件+) : WeeklyInsightCard → PredictionCard → AdBanner → WeatherWidget(+compact forecast) → FAQ
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { Activity, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdBanner } from "@/components/AdBanner";
import { PredictionCard } from "@/components/PredictionCard";
import { ContinuousRecordBadge } from "@/components/ContinuousRecordBadge";
import { WeatherWidget } from "@/components/WeatherWidget";
import { OnboardingBanner } from "@/components/OnboardingBanner";
import { WeeklyInsightCard } from "@/components/WeeklyInsightCard";
import { WeeklyRiskForecast } from "@/components/WeeklyRiskForecast";
import { getRecords, DEFAULT_PREFECTURE_KEY } from "@/lib/storage";
import { isDemoMode, getDemoCount, generateDemoRecords } from "@/lib/demo";
import { DemoModeBanner } from "@/components/DemoModeBanner";
import {
  predictTomorrow,
  calculateContinuousRecordBadge,
} from "@/lib/prediction";
import { fetchWeatherForecast, fetchFullWeather } from "@/lib/weather";
import { getPrefectureByCode } from "@/lib/prefectures";
import { calculateStats } from "@/lib/correlation";
import type { PredictionResult, DailyForecast } from "@/lib/types";

const FAQ_ITEMS = [
  {
    q: "SleepForecastとはどんなアプリですか？",
    a: "気圧・気温・湿度・月齢などの気象データを自動取得し、翌日の睡眠質を予測するWebアプリです。毎朝15秒の記録を続けることで、あなただけの「眠れない夜のパターン」が可視化されます。",
  },
  {
    q: "低気圧が来ると眠れなくなるのはなぜですか？",
    a: "気圧が下がると自律神経のバランスが乱れやすく、交感神経が優位になることで興奮状態が続き、入眠しにくくなります。SleepForecastは気圧変化を事前に検知し、対策を促します。",
  },
  {
    q: "登録や料金は必要ですか？",
    a: "完全無料・登録不要でご利用いただけます。記録データはお使いのブラウザの端末内にのみ保存され、外部サーバーへの送信は行いません。",
  },
  {
    q: "何日記録すると予測の精度が上がりますか？",
    a: "7日間以上の記録で相関分析が開始され、予測の信頼度が「中」になります。15日以上で「高」となり、気象パターンとあなたの睡眠との個人的な相関が分かるようになります。",
  },
  {
    q: "気象病の診断ができますか？",
    a: "SleepForecastは統計的な傾向をお伝えする情報提供サービスであり、医療行為・診断を目的としたものではありません。体調に不安がある場合は医療機関にご相談ください。",
  },
] as const;

export function HomeClient() {
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [badge, setBadge] = useState<ReturnType<typeof calculateContinuousRecordBadge> | null>(null);
  const [loading, setLoading] = useState(true);
  const [recordCount, setRecordCount] = useState<number>(0);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [dailyForecast, setDailyForecast] = useState<DailyForecast[] | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [demoCount, setDemoCount] = useState<number | null>(null);

  useEffect(() => {
    const loadPrediction = async () => {
      try {
        // デモモード判定（URL パラメータ ?demo=N）
        const demoCnt = getDemoCount();
        setDemoCount(demoCnt);
        const records = demoCnt !== null
          ? generateDemoRecords(demoCnt)
          : getRecords();
        setRecordCount(records.length);
        setIsLoaded(true);

        // 連続記録バッジを計算
        if (records.length > 0) {
          const stats = calculateStats(records);
          setBadge(calculateContinuousRecordBadge(stats.longestStreak));
        }

        // 都道府県コード: 記録 → 設定 → デフォルト (東京 "13")
        const prefCode =
          records.length > 0
            ? records[0].prefectureCode
            : (localStorage.getItem(DEFAULT_PREFECTURE_KEY) ?? "13");
        const prefecture = getPrefectureByCode(prefCode);

        if (prefecture) {
          if (records.length > 0) {
            // 記録ありの場合: WeeklyRiskForecast用フル予報 + 個人予測を並列取得
            const [fullWeatherResult, forecastResult] = await Promise.allSettled([
              fetchFullWeather(prefecture.latitude, prefecture.longitude),
              fetchWeatherForecast(prefecture.latitude, prefecture.longitude),
            ]);

            if (fullWeatherResult.status === "fulfilled") {
              setDailyForecast(fullWeatherResult.value.forecast);
            }
            if (forecastResult.status === "fulfilled") {
              const result = predictTomorrow(records, forecastResult.value);
              setPrediction(result);
            }
          } else {
            // 記録ゼロの場合: WeeklyRiskForecast用フル予報のみ取得
            const fullWeather = await fetchFullWeather(
              prefecture.latitude,
              prefecture.longitude
            );
            setDailyForecast(fullWeather.forecast);
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

  return (
    <div className="container mx-auto max-w-screen-md px-4 py-10 sm:py-14">
      {/* デモモードバナー */}
      {demoCount !== null && <DemoModeBanner recordCount={demoCount} />}

      {/* オンボーディングバナー（初回訪問・記録ゼロ時のみ / デモ時は非表示） */}
      {demoCount === null && <OnboardingBanner />}

      {/* ─── ヒーローセクション（P0 / P1: 記録7件未満） ─────────────────────── */}
      {isLoaded && recordCount < 7 && (
        <section className="mb-12 text-center sm:mb-16">
          <h1 className="mb-4 text-3xl font-bold leading-tight tracking-tight text-[#e6e8ee] sm:text-4xl md:text-5xl">
            気象病・低気圧から<br />明日の眠りを予報する
          </h1>
          <p className="mx-auto mb-8 max-w-md text-sm leading-relaxed text-[#a8b0c2] sm:text-base">
            気圧・気温・月齢からあなたの睡眠を読み解く
          </p>

          {/* P0: 記録ゼロ → シンプルに1つのCTA */}
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

          {/* P1: 1〜4件 → 記録 primary / ダッシュボード secondary */}
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

          {/* P1: 5〜6件 → ダッシュボード primary / 記録 secondary */}
          {recordCount >= 5 && recordCount < 7 && (
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
        </section>
      )}

      {/* ─── フェーズ別メインカード ───────────────────────────────────────────── */}
      {!loading && (
        <>
          {/* 連続記録バッジ */}
          {badge?.level && (
            <div className="mb-6">
              <ContinuousRecordBadge badge={badge} />
            </div>
          )}

          {/* P2: 週次インサイトカード（7件〜のみ） */}
          <WeeklyInsightCard />

          {/* P2: PredictionCard をプライマリ表示 */}
          {recordCount >= 7 && prediction && (
            <div className="mb-8">
              <PredictionCard
                prediction={prediction}
                variant="compact"
                streakDays={badge?.longestStreak}
              />
            </div>
          )}

          {/* P0 / P1: WeeklyRiskForecast をプライマリ表示 */}
          {recordCount < 7 && dailyForecast && (
            <div className="mb-8">
              <WeeklyRiskForecast
                forecast={dailyForecast}
                recordCount={recordCount}
                variant="full"
              />
            </div>
          )}
        </>
      )}

      {/* 広告スロット */}
      <AdBanner slot="hero-bottom" format="horizontal" className="mb-8" />

      {/* 気象ウィジェット */}
      <div className="mb-12">
        <WeatherWidget />

        {/* P2: WeeklyRiskForecast を compact で補足表示 */}
        {!loading && recordCount >= 7 && dailyForecast && (
          <div className="mt-4">
            <WeeklyRiskForecast
              forecast={dailyForecast}
              recordCount={recordCount}
              variant="compact"
            />
          </div>
        )}
      </div>

      {/* 3ステップで始める（P0 / P1 のみ表示） */}
      {isLoaded && recordCount < 7 && (
        <section aria-labelledby="howto-heading" className="mb-12 sm:mb-16">
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
              <li
                key={step}
                className="flex gap-4 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4"
              >
                <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-indigo-500/15 text-xs font-bold text-indigo-300">
                  {step}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[#e6e8ee]">
                    {href ? (
                      <a href={href} className="hover:underline decoration-indigo-400/50">
                        {title}
                      </a>
                    ) : (
                      title
                    )}
                  </p>
                  <p className="mt-0.5 text-xs leading-relaxed text-[#a8b0c2]">{desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* よくある質問 */}
      <section aria-labelledby="faq-heading" className="mb-12 sm:mb-16">
        <h2
          id="faq-heading"
          className="mb-6 text-center text-xl font-semibold text-[#e6e8ee] sm:text-2xl"
        >
          よくある質問
        </h2>
        <dl className="space-y-2">
          {FAQ_ITEMS.map((item, i) => (
            <div
              key={i}
              className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden"
            >
              <dt>
                <button
                  type="button"
                  aria-expanded={openFaq === i}
                  aria-controls={`faq-answer-${i}`}
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left"
                >
                  <span className="text-sm font-medium text-[#e6e8ee]">{item.q}</span>
                  <ChevronDown
                    className={`h-4 w-4 flex-shrink-0 text-indigo-400 transition-transform duration-200 ${
                      openFaq === i ? "rotate-180" : ""
                    }`}
                    aria-hidden="true"
                  />
                </button>
              </dt>
              <dd
                id={`faq-answer-${i}`}
                hidden={openFaq !== i}
                className="px-4 pb-4 text-sm leading-relaxed text-[#a8b0c2]"
              >
                {item.a}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <p className="text-center text-xs text-[#a8b0c2]/80">
        ※ 本サービスは医療行為・診断ではありません
      </p>
    </div>
  );
}
