"use client";

/**
 * SleepForecast ダッシュボード (F003)。
 *
 * 4 つの可視化ゾーン:
 *   1. KPI カード 4 枚 (7 日平均 / 今月記録 / 最長連続 / 最も浅かった日)
 *   2. 折れ線グラフ — 過去 30 日の睡眠品質推移
 *   3. 散布図 + 回帰直線 — 気圧 × 睡眠品質
 *   4. 気象別平均グラフ (Tabs: 気圧別 / 月齢別)
 *
 * その下に医療免責を配置する。
 *
 * デモ/リアル切替:
 *   - localStorage 記録 0〜2 件: 折れ線グラフ・相関グラフはロック表示
 *   - 3 件以上: 折れ線グラフ解放 / 7 件以上: 相関グラフ解放
 *   - SSR 対策: マウント前は空配列を初期値として描画し、
 *               useEffect で実データに差し替える (hydration safe)
 */

import * as React from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Flame,
  Info,
  Moon,
  TrendingUp,
  Wind,
} from "lucide-react";
import { AdBanner } from "@/components/AdBanner";
import { Breadcrumb } from "@/components/Breadcrumb";
import { DemoModeBanner } from "@/components/DemoModeBanner";
import { OnboardingProgress } from "@/components/OnboardingProgress";
import { AchievementsSection } from "@/components/AchievementsSection";
import { MonthlySummaryReport } from "@/components/MonthlySummaryReport";
import { PredictionCard } from "@/components/PredictionCard";
import { Button } from "@/components/ui/button";

import {
  calculateStats,
  generateInsights,
  type DashboardStats,
  type InsightItem,
} from "@/lib/correlation";
import {
  predictTomorrow,
} from "@/lib/prediction";
import { fetchWeatherForecast } from "@/lib/weather";
import { getPrefectureByCode } from "@/lib/prefectures";
import { getRecords, getStreakDays } from "@/lib/storage";
import { getDemoCount, generateDemoRecords } from "@/lib/demo";
import type { SleepRecord, PredictionResult, WeatherData } from "@/lib/types";

/** Chart.js を含むセクションを動的インポートで分割（First Load JS 削減） */
const DashboardChartsSection = dynamic(
  () => import("@/components/DashboardChartsSection").then((m) => ({ default: m.DashboardChartsSection })),
  {
    ssr: false,
    loading: () => (
      <div className="space-y-6">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="mb-6 h-[280px] animate-pulse rounded-xl bg-[#1a1f2e]"
            aria-hidden
          />
        ))}
      </div>
    ),
  }
);

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------

/**
 * 平均品質スコア（連続値）→ 3段階ラベルに変換。
 * 記録フォームは 1 / 3 / 5 の3択なので、平均は 1〜5 の実数になる。
 */
function qualityLabel(avg: number): string {
  if (avg < 2) return "眠れなかった";
  if (avg < 4) return "なんとか眠れた";
  return "よく眠れた";
}

// B案: 感情別カラー (warning=rose / info=sky / positive=emerald)
const INSIGHT_BORDER: Record<InsightItem["severity"], string> = {
  warning: "border-rose-400 bg-rose-500/5",
  info: "border-sky-400 bg-sky-500/5",
  positive: "border-emerald-400 bg-emerald-500/5",
};

const INSIGHT_ICON: Record<InsightItem["severity"], React.ReactNode> = {
  warning: <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" aria-hidden />,
  info: <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-400" aria-hidden />,
  positive: <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" aria-hidden />,
};

// ---------------------------------------------------------------------------
// 集計ヘルパ（KPI カード・インサイト用の非チャート関数）
// ---------------------------------------------------------------------------

/** YYYY-MM-DD → MM/DD に短縮する（KPI カードのworstDay表示用）。 */
function toShortLabel(isoDate: string): string {
  const [, mm, dd] = isoDate.split("-");
  return `${mm}/${dd}`;
}

// ---------------------------------------------------------------------------
// ページコンポーネント
// ---------------------------------------------------------------------------

export default function DashboardPage() {
  // SSR/CSR 間のハイドレーション不整合を避けるため、
  // 初期値は空配列にしてマウント後に実データを読み込む。
  const [records, setRecords] = React.useState<SleepRecord[]>([]);
  const [isLoaded, setIsLoaded] = React.useState<boolean>(false);
  const [prediction, setPrediction] = React.useState<PredictionResult | null>(null);
  const [streakDays, setStreakDays] = React.useState<number>(0);
  const [todayWeather, setTodayWeather] = React.useState<WeatherData | null>(null);
  const [demoCount, setDemoCount] = React.useState<number | null>(null);

  React.useEffect(() => {
    // デモモード判定（URL パラメータ ?demo=N）
    const demoCnt = getDemoCount();
    setDemoCount(demoCnt);
    const real = demoCnt !== null ? generateDemoRecords(demoCnt) : getRecords();
    setRecords(real);
    setIsLoaded(true);
    setStreakDays(demoCnt !== null ? real.length : getStreakDays());

    // 予測を計算
    if (real.length > 0) {
      const loadPrediction = async () => {
        try {
          const lastRecord = real[0];
          const prefecture = getPrefectureByCode(lastRecord.prefectureCode);
          if (prefecture) {
            const forecast = await fetchWeatherForecast(
              prefecture.latitude,
              prefecture.longitude
            );
            const result = predictTomorrow(real, forecast);
            setPrediction(result);
            setTodayWeather(forecast);
          }
        } catch (err) {
          console.error("予測計算エラー:", err);
        }
      };
      loadPrediction();
    }
  }, []);

  // --- KPI 集計 ---
  const stats: DashboardStats = React.useMemo(
    () => calculateStats(records),
    [records]
  );

  // --- インサイト ---
  const insights = React.useMemo(() => generateInsights(records), [records]);

  // 記録がない場合の空状態
  if (isLoaded && records.length === 0) {
    return (
      <div className="container mx-auto max-w-screen-md px-4 py-8 pb-16 sm:py-12">
        <Breadcrumb items={[{ name: "ホーム", href: "/" }, { name: "ダッシュボード" }]} />
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-[#e6e8ee]">睡眠ダッシュボード</h1>
          <p className="mt-1 text-sm text-[#a8b0c2]">
            過去 30 日の記録から、気象と睡眠品質の関係を分析します。
          </p>
        </header>
        <div className="flex flex-col items-center justify-center gap-6 rounded-xl border border-gray-700/50 bg-[#1a1f2e] px-6 py-16 text-center">
          <Moon className="h-12 w-12 text-indigo-400 opacity-60" aria-hidden />
          <div>
            <h2 className="text-lg font-semibold text-[#e6e8ee]">まだ記録がありません</h2>
            <p className="mt-2 text-sm text-[#a8b0c2]">
              毎日の睡眠を記録すると、気圧との関係やあなただけのパターンが見えてきます。<br />
              まずは今日の眠りを記録してみましょう。
            </p>
          </div>
          <Button asChild size="lg" className="bg-indigo-500 text-white hover:bg-indigo-600">
            <Link href="/record">
              今日を記録する
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-screen-md px-4 py-8 pb-16 sm:py-12">
      <Breadcrumb items={[{ name: "ホーム", href: "/" }, { name: "ダッシュボード" }]} />

      {/* デモモードバナー */}
      {demoCount !== null && <DemoModeBanner recordCount={demoCount} />}

      <header className="mb-6">
        <h1 className="text-2xl font-bold text-[#e6e8ee]">睡眠ダッシュボード</h1>
        <p className="mt-1 text-sm text-[#a8b0c2]">
          過去 30 日の記録から、気象と睡眠品質の関係を分析します。
        </p>
        {/* データ保存場所の注記 */}
        <p className="mt-2 text-xs text-[#a8b0c2]/70">
          <Info className="mb-0.5 mr-1 inline-block h-3 w-3" aria-hidden />
          記録はこのブラウザの端末内に保存されています。他の端末・ブラウザとは同期されません。
        </p>
      </header>

      {/* オンボーディング 3段階アンロック進捗（1〜29件） */}
      <OnboardingProgress recordCount={records.length} />

      {/* 予測カード */}
      {prediction && (
        <div className="mb-8">
          <PredictionCard
            prediction={prediction}
            variant="full"
            streakDays={streakDays > 0 ? streakDays : undefined}
          />
        </div>
      )}

      {/* 気象アドバイスカード (REQ-27) */}
      {todayWeather && (
        <WeatherAdviceCard weather={todayWeather} />
      )}

      {/* ── ① KPI カード ── */}
      <section
        aria-label="睡眠 KPI サマリー"
        className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4"
      >
        {/* 7日平均: サブラベルに言語解釈を添える */}
        <KpiCard
          icon={<TrendingUp className="h-4 w-4" aria-hidden />}
          label="7 日平均品質"
          value={stats.avg7Days !== null ? stats.avg7Days.toFixed(1) : "--"}
          subtitle={
            stats.avg7Days !== null
              ? qualityLabel(stats.avg7Days)
              : undefined
          }
        />
        <KpiCard
          icon={<CalendarDays className="h-4 w-4" aria-hidden />}
          label="今月の記録"
          value={
            stats.recordCountThisMonth > 0
              ? `${stats.recordCountThisMonth}日`
              : "--"
          }
        />
        <KpiCard
          icon={<Flame className="h-4 w-4" aria-hidden />}
          label="最長連続"
          value={stats.longestStreak > 0 ? `${stats.longestStreak}日` : "--"}
        />
        {/* 気圧感受性スコア: データ十分なら表示、不足なら最も浅かった日 */}
        {stats.pressureSensitivity !== null ? (
          <KpiCard
            icon={<Wind className="h-4 w-4" aria-hidden />}
            label="気圧感受性"
            value={`${stats.pressureSensitivity} / 10`}
            subtitle={
              stats.pressureSensitivity >= 7 ? "高感受性" :
              stats.pressureSensitivity >= 4 ? "中感受性" : "低感受性"
            }
          />
        ) : (
          <KpiCard
            icon={<Moon className="h-4 w-4" aria-hidden />}
            label="最も浅かった日"
            value={stats.worstDay ? toShortLabel(stats.worstDay.date) : "--"}
            subtitle={
              stats.worstDay
                ? qualityLabel(stats.worstDay.quality)
                : undefined
            }
          />
        )}
      </section>

      {/* ── ② インサイト（KPI直下・グラフより先に表示） ── */}
      {insights.length > 0 && (
        <section aria-label="睡眠インサイト" className="mb-6 space-y-3">
          <h2 className="mb-2 text-sm font-semibold text-[#e6e8ee]">
            あなたへの気づき
          </h2>
          <ul className="space-y-3">
            {insights.map((item) => (
              <li
                key={item.key}
                className={`flex items-start gap-3 rounded-r-lg border-l-4 p-3 transition-colors duration-150 hover:opacity-90 ${INSIGHT_BORDER[item.severity]}`}
              >
                {INSIGHT_ICON[item.severity]}
                <div className="min-w-0 flex-1">
                  <p className="text-sm leading-relaxed text-[#e6e8ee]">
                    {item.message}
                  </p>
                  {item.articleSlug && item.articleLabel && (
                    <Link
                      href={`/articles/${item.articleSlug}`}
                      className="mt-1.5 inline-flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 hover:underline"
                    >
                      {item.articleLabel}
                      <ArrowRight className="h-3 w-3" aria-hidden />
                    </Link>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ── ③〜⑤ チャートセクション（Chart.js を動的インポートで遅延ロード） ── */}
      <DashboardChartsSection records={records} />

      {/* 広告スロット: チャートセクション下 */}
      <AdBanner slot="dashboard-charts" format="horizontal" className="mb-6" />

      {/* ── ⑥ 「今日を記録する」CTA — 常時表示 ── */}
      <div className="mb-6 flex items-center justify-between gap-3 rounded-lg border border-indigo-400/20 bg-indigo-500/[0.05] p-4">
        <div>
          <p className="text-sm font-medium text-[#e6e8ee]">今日の眠りを記録する</p>
          <p className="mt-0.5 text-xs text-[#a8b0c2]">毎日記録すると、あなただけの傾向が見えてきます</p>
        </div>
        <Button
          asChild
          size="sm"
          className="flex-shrink-0 bg-indigo-500 text-white hover:bg-indigo-600"
        >
          <Link href="/record">
            記録する
            <ArrowRight className="ml-1 h-4 w-4" aria-hidden />
          </Link>
        </Button>
      </div>

      {/* ── ⑦ 下部記録促進バナーは OnboardingProgress に統合済み ── */}

      {/* ── ⑧ 月次サマリーレポート ── */}
      <div className="mt-8">
        <MonthlySummaryReport records={records} />
      </div>

      {/* ── ⑨ 実績バッジ ── */}
      <div className="mt-6">
        <AchievementsSection records={records} />
      </div>

      {/* 医療免責 — C案要素取り込み: AlertCircle + amber テキスト */}
      <div className="mt-2 rounded-md border border-amber-700/30 bg-amber-900/10 px-4 py-3">
        <div className="flex items-start gap-2 text-xs text-amber-200">
          <AlertCircle
            className="mt-0.5 h-4 w-4 shrink-0 text-amber-500"
            aria-hidden
          />
          <p className="leading-relaxed">
            本ダッシュボードの分析・インサイトは統計的な傾向の参考情報であり、
            医療行為・診断を目的としたものではありません。
            体調に不安がある場合は医療機関にご相談ください。
          </p>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 部品コンポーネント
// ---------------------------------------------------------------------------

type KpiCardProps = {
  icon: React.ReactNode;
  label: string;
  value: string;
  /** 値の下に表示するサブラベル（例: 品質の言語解釈 "普通" など） */
  subtitle?: string;
  /** 文字数が多い場合に 1 段階小さくする */
  small?: boolean;
};

function KpiCard({ icon, label, value, subtitle, small }: KpiCardProps) {
  return (
    // B案: グラデーション背景 + ホバー時 violet ボーダー
    <div className="flex flex-col gap-2 rounded-xl border border-gray-700/50 bg-gradient-to-br from-gray-900 to-[#161a24] p-4 shadow-md transition-all duration-200 hover:border-indigo-400/30 hover:shadow-lg">
      <div className="flex items-center gap-2 text-gray-400">
        <span className="text-indigo-400">{icon}</span>
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p
        className={`font-bold tabular-nums text-gray-100 ${
          small ? "text-xl" : "text-3xl"
        }`}
      >
        {value}
      </p>
      {subtitle && (
        <p className="text-xs text-[#a8b0c2]">{subtitle}</p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// WeatherAdviceCard (REQ-27)
// ---------------------------------------------------------------------------

/**
 * 今日の気象データ（気圧変化・気温・湿度）に応じた
 * 具体的な睡眠前アクションアドバイスを表示するカード。
 */
function WeatherAdviceCard({ weather }: { weather: WeatherData }) {
  type Tip = { icon: string; text: string; color: string };
  const tips: Tip[] = [];

  // 気圧変化アドバイス (pressureDeltaHpa = 24h差)
  if (weather.pressureDeltaHpa <= -5) {
    tips.push({
      icon: "🌀",
      text: "気圧が急降下中。入浴は38〜40℃のぬるめで副交感神経を整えましょう。",
      color: "border-rose-400/50 bg-rose-500/[0.05]",
    });
    tips.push({
      icon: "💊",
      text: "頭痛や体のだるさを感じる場合は早めに横になって安静にしてください。",
      color: "border-rose-400/50 bg-rose-500/[0.05]",
    });
  } else if (weather.pressureDeltaHpa <= -3) {
    tips.push({
      icon: "🌧",
      text: "気圧がやや低め。就寝1時間前のスマホを控えてブルーライトを減らしましょう。",
      color: "border-amber-400/50 bg-amber-500/[0.05]",
    });
  } else if (weather.pressureDeltaHpa >= 3) {
    tips.push({
      icon: "☀️",
      text: "気圧が上昇傾向。体調が整いやすい日です。適度な運動で睡眠の質を高めましょう。",
      color: "border-emerald-400/50 bg-emerald-500/[0.05]",
    });
  } else {
    tips.push({
      icon: "🌤",
      text: "気圧は安定しています。規則正しい就寝時間を意識してみましょう。",
      color: "border-sky-400/50 bg-sky-500/[0.05]",
    });
  }

  // 気温アドバイス
  if (weather.temperatureC >= 27) {
    tips.push({
      icon: "🌡",
      text: "気温が高め。寝室を26〜28℃に保つと入眠しやすくなります。エアコンを活用して。",
      color: "border-orange-400/50 bg-orange-500/[0.05]",
    });
  } else if (weather.temperatureC <= 8) {
    tips.push({
      icon: "🧣",
      text: "冷え込みが強い夜。湯たんぽや靴下で足元を温めると深部体温が下がりやすくなります。",
      color: "border-indigo-400/50 bg-indigo-500/[0.05]",
    });
  }

  // 湿度アドバイス
  if (weather.humidity >= 75) {
    tips.push({
      icon: "💧",
      text: "湿度が高め。除湿機や換気で湿度50〜60%を目安にすると眠りが浅くなりにくいです。",
      color: "border-cyan-400/50 bg-cyan-500/[0.05]",
    });
  } else if (weather.humidity < 40) {
    tips.push({
      icon: "🌵",
      text: "空気が乾燥しています。加湿器で50%前後を保つと喉の乾燥を防げます。",
      color: "border-yellow-400/50 bg-yellow-500/[0.05]",
    });
  }

  if (tips.length === 0) return null;

  return (
    <section
      aria-label="今夜の睡眠アドバイス"
      className="mb-6 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4"
    >
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#e6e8ee]">
        <Moon className="h-4 w-4 text-indigo-300" aria-hidden />
        今夜の睡眠アドバイス
      </h2>
      <ul className="space-y-2">
        {tips.slice(0, 3).map((tip, i) => (
          <li
            key={i}
            className={`flex items-start gap-3 rounded-lg border-l-4 p-3 text-sm leading-relaxed text-[#e6e8ee]/90 ${tip.color}`}
          >
            <span className="text-base leading-none" aria-hidden>{tip.icon}</span>
            <span>{tip.text}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

