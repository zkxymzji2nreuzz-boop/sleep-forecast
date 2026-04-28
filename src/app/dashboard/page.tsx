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
 *   - localStorage 記録 0〜9 件: フル分析グラフはロック表示
 *   - 10 件以上: 実データ表示
 *   - SSR 対策: マウント前は空配列を初期値として描画し、
 *               useEffect で実データに差し替える (hydration safe)
 */

import * as React from "react";
import Link from "next/link";
import {
  Bar,
  Line,
} from "react-chartjs-2";
import {
  Chart as ChartJS,
  BarController,
  BarElement,
  CategoryScale,
  Filler,
  Legend,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  ScatterController,
  Tooltip,
  type ChartData,
  type ChartOptions,
  type TooltipItem,
} from "chart.js";
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
} from "lucide-react";
import { AdBanner } from "@/components/AdBanner";
import { Breadcrumb } from "@/components/Breadcrumb";
import { CorrelationChart } from "@/components/CorrelationChart";
import { PredictionCard } from "@/components/PredictionCard";
import { Button } from "@/components/ui/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
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
import type { SleepRecord, PredictionResult, WeatherData } from "@/lib/types";

// ---------------------------------------------------------------------------
// Chart.js グローバル設定 (モジュールスコープで 1 度だけ実行)
// ---------------------------------------------------------------------------
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  LineController,
  BarController,
  ScatterController,
  Tooltip,
  Legend,
  Filler
);
ChartJS.defaults.color = "#9ba3b5";
ChartJS.defaults.borderColor = "rgba(139, 146, 165, 0.15)";
ChartJS.defaults.font.family = "'Inter', sans-serif";

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------
/** 折れ線グラフの解放に必要な最小記録数 */
const LINE_THRESHOLD = 5;
/** 散布図・気象別グラフの解放に必要な最小記録数 */
const DEMO_THRESHOLD = 10;

/** グラフ Y 軸ラベル用（短縮版：幅を節約） */
const QUALITY_LABEL_MAP: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: "最低",
  2: "悪い",
  3: "普通",
  4: "良い",
  5: "最高",
};

/** ツールチップ・テキスト表示用（フル版） */
const QUALITY_FULL_MAP: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: "とても悪い",
  2: "悪い",
  3: "普通",
  4: "良い",
  5: "とても良い",
};

const PRESSURE_BUCKETS = ["急上昇 (+3以上)", "横ばい", "急低下 (-3以下)"] as const;
const PRESSURE_BUCKET_COLORS = ["#4ade80", "#9ba3b5", "#ef4444"];

const MOON_BUCKETS = [
  "新月期 (0〜0.1)",
  "上弦期 (0.1〜0.45)",
  "満月期 (0.45〜0.55)",
  "下弦期 (0.55〜0.9)",
] as const;
const MOON_BUCKET_COLORS = ["#7c4dff", "#1d9bf0", "#facc15", "#4ade80"];

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
// 集計ヘルパ
// ---------------------------------------------------------------------------

/** records を date 昇順に並べ替える (折れ線グラフ用)。 */
function ascByDate(records: SleepRecord[]): SleepRecord[] {
  return [...records].sort((a, b) =>
    a.date < b.date ? -1 : a.date > b.date ? 1 : 0
  );
}

/** YYYY-MM-DD → MM/DD に短縮する。 */
function toShortLabel(isoDate: string): string {
  const [, mm, dd] = isoDate.split("-");
  return `${mm}/${dd}`;
}

/** 平均値を計算 (空なら 0) + 件数を返す。 */
function bucketStats(records: SleepRecord[]): { avg: number; count: number } {
  if (records.length === 0) return { avg: 0, count: 0 };
  const sum = records.reduce((acc, r) => acc + r.quality, 0);
  return { avg: sum / records.length, count: records.length };
}

/** 気圧 3 バケツに分ける。 */
function groupByPressure(records: SleepRecord[]) {
  const rise = records.filter((r) => r.weather.pressureDeltaHpa >= 3);
  const flat = records.filter(
    (r) => r.weather.pressureDeltaHpa > -3 && r.weather.pressureDeltaHpa < 3
  );
  const drop = records.filter((r) => r.weather.pressureDeltaHpa <= -3);
  return [bucketStats(rise), bucketStats(flat), bucketStats(drop)];
}

/** 月齢 4 バケツに分ける (満月期優先)。 */
function groupByMoonPhase(records: SleepRecord[]) {
  const newMoon: SleepRecord[] = [];
  const firstQuarter: SleepRecord[] = [];
  const fullMoon: SleepRecord[] = [];
  const lastQuarter: SleepRecord[] = [];

  for (const r of records) {
    const p = r.weather.moonPhase;
    // 満月期優先 (0.45〜0.55)
    if (p >= 0.45 && p <= 0.55) {
      fullMoon.push(r);
    } else if (p >= 0 && p < 0.1) {
      newMoon.push(r);
    } else if (p >= 0.1 && p < 0.45) {
      firstQuarter.push(r);
    } else if (p > 0.55 && p < 0.9) {
      lastQuarter.push(r);
    }
    // 0.9..1.0 は新月側に近いが、bucket 外として無視 (spec 準拠)
  }

  return [
    bucketStats(newMoon),
    bucketStats(firstQuarter),
    bucketStats(fullMoon),
    bucketStats(lastQuarter),
  ];
}

// ---------------------------------------------------------------------------
// グラフ options ビルダ
// ---------------------------------------------------------------------------

/** カード共通の tooltip スタイル (プレーンオブジェクトで型幅を維持) */
const TOOLTIP_BASE = {
  backgroundColor: "#1a1f2e",
  borderColor: "#1d9bf0",
  borderWidth: 1,
  titleColor: "#e6e8ee",
  bodyColor: "#9ba3b5",
  padding: 10,
} as const;

function buildLineOptions(): ChartOptions<"line"> {
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 400 },
    plugins: {
      legend: { display: false },
      tooltip: {
        ...TOOLTIP_BASE,
        callbacks: {
          title: (items: TooltipItem<"line">[]) => {
            const item = items[0];
            const meta = (item.dataset as { _dates?: string[] })._dates;
            const iso = meta?.[item.dataIndex];
            if (!iso) return "";
            const [y, m, d] = iso.split("-");
            return `${y}/${m}/${d}`;
          },
          label: (ctx: TooltipItem<"line">) => {
            const q = Math.round(Number(ctx.parsed.y)) as 1 | 2 | 3 | 4 | 5;
            if (q < 1 || q > 5) return "";
            // ツールチップにはフル版ラベルを使う
            return `品質: ${QUALITY_FULL_MAP[q]} (${q})`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: { color: "rgba(139, 146, 165, 0.10)" },
        ticks: {
          color: "#9ba3b5",
          maxRotation: 0,
          autoSkipPadding: 16,
        },
      },
      y: {
        min: 1,
        max: 5,
        ticks: {
          stepSize: 1,
          color: "#9ba3b5",
          // Y 軸は短縮ラベルを使って横幅を節約する
          callback: (value) => {
            const v = Number(value);
            if (!Number.isInteger(v) || v < 1 || v > 5) return "";
            return QUALITY_LABEL_MAP[v as 1 | 2 | 3 | 4 | 5];
          },
        },
        grid: { color: "rgba(139, 146, 165, 0.10)" },
      },
    },
  };
}

function buildBarOptions(): ChartOptions<"bar"> {
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 400 },
    plugins: {
      legend: { display: false },
      tooltip: {
        ...TOOLTIP_BASE,
        callbacks: {
          label: (ctx: TooltipItem<"bar">) => {
            const counts = (ctx.dataset as { _counts?: number[] })._counts ?? [];
            const count = counts[ctx.dataIndex] ?? 0;
            if (count === 0) return "データなし";
            const y = ctx.parsed.y ?? 0;
            return `平均品質: ${y.toFixed(2)} (${count} 件)`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: { color: "rgba(139, 146, 165, 0.10)" },
        ticks: { color: "#9ba3b5", font: { size: 10 } },
      },
      y: {
        min: 0,
        max: 5,
        ticks: { stepSize: 0.5, color: "#9ba3b5" },
        grid: { color: "rgba(139, 146, 165, 0.10)" },
      },
    },
  };
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

  React.useEffect(() => {
    const real = getRecords();
    setRecords(real);
    setIsLoaded(true);
    setStreakDays(getStreakDays());

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

  // --- 折れ線グラフ dataset ---
  const lineData = React.useMemo<ChartData<"line">>(() => {
    const asc = ascByDate(records).slice(-30);
    const labels = asc.map((r) => toShortLabel(r.date));
    const values = asc.map((r) => r.quality);
    return {
      labels,
      datasets: [
        {
          label: "品質",
          data: values,
          // B案: violet (#a78bfa) ライン
          borderColor: "#a78bfa",
          backgroundColor: "rgba(167, 139, 250, 0.12)",
          borderWidth: 2,
          pointBackgroundColor: "#a78bfa",
          pointBorderColor: "#1a1f2e",
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
          fill: true,
          tension: 0.25,
          // カスタムキーで tooltip タイトルに元日付を渡す
          _dates: asc.map((r) => r.date),
        } as ChartData<"line">["datasets"][number] & { _dates: string[] },
      ],
    };
  }, [records]);

  // --- 棒グラフ (気圧別) ---
  const pressureBarData = React.useMemo<ChartData<"bar">>(() => {
    const buckets = groupByPressure(records);
    const values = buckets.map((b) => (b.count === 0 ? 0 : b.avg));
    const counts = buckets.map((b) => b.count);
    return {
      labels: [...PRESSURE_BUCKETS],
      datasets: [
        {
          label: "平均品質",
          data: values,
          backgroundColor: PRESSURE_BUCKET_COLORS,
          borderColor: PRESSURE_BUCKET_COLORS,
          borderWidth: 1,
          borderRadius: 6,
          _counts: counts,
        } as ChartData<"bar">["datasets"][number] & { _counts: number[] },
      ],
    };
  }, [records]);

  // --- 棒グラフ (月齢別) ---
  const moonBarData = React.useMemo<ChartData<"bar">>(() => {
    const buckets = groupByMoonPhase(records);
    const values = buckets.map((b) => (b.count === 0 ? 0 : b.avg));
    const counts = buckets.map((b) => b.count);
    return {
      labels: [...MOON_BUCKETS],
      datasets: [
        {
          label: "平均品質",
          data: values,
          backgroundColor: MOON_BUCKET_COLORS,
          borderColor: MOON_BUCKET_COLORS,
          borderWidth: 1,
          borderRadius: 6,
          _counts: counts,
        } as ChartData<"bar">["datasets"][number] & { _counts: number[] },
      ],
    };
  }, [records]);

  // --- インサイト ---
  const insights = React.useMemo(() => generateInsights(records), [records]);

  const lineOptions = React.useMemo(() => buildLineOptions(), []);
  const barOptions = React.useMemo(() => buildBarOptions(), []);

  // 記録がない場合の空状態
  if (isLoaded && records.length === 0) {
    return (
      <div className="container mx-auto max-w-screen-md px-4 py-8 pb-16 sm:py-12">
        <Breadcrumb items={[{ name: "ホーム", href: "/" }, { name: "ダッシュボード" }]} />
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-[#e6e8ee]">睡眠ダッシュボード</h1>
          <p className="mt-1 text-sm text-[#9ba3b5]">
            過去 30 日の記録から、気象と睡眠品質の関係を分析します。
          </p>
        </header>
        <div className="flex flex-col items-center justify-center gap-6 rounded-xl border border-gray-700/50 bg-[#1a1f2e] px-6 py-16 text-center">
          <Moon className="h-12 w-12 text-violet-400 opacity-60" aria-hidden />
          <div>
            <h2 className="text-lg font-semibold text-[#e6e8ee]">まだ記録がありません</h2>
            <p className="mt-2 text-sm text-[#9ba3b5]">
              毎日の睡眠を記録すると、気圧との関係やあなただけのパターンが見えてきます。<br />
              まずは今日の眠りを記録してみましょう。
            </p>
          </div>
          <Button asChild size="lg" className="bg-[#1d9bf0] text-white hover:bg-[#1a8cd8]">
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

      <header className="mb-6">
        <h1 className="text-2xl font-bold text-[#e6e8ee]">睡眠ダッシュボード</h1>
        <p className="mt-1 text-sm text-[#9ba3b5]">
          過去 30 日の記録から、気象と睡眠品質の関係を分析します。
        </p>
        {/* データ保存場所の注記 */}
        <p className="mt-2 text-xs text-[#9ba3b5]/70">
          <Info className="mb-0.5 mr-1 inline-block h-3 w-3" aria-hidden />
          記録はこのブラウザの端末内に保存されています。他の端末・ブラウザとは同期されません。
        </p>
      </header>

      {/* 分析解禁まで進捗バー（記録1〜6件） */}
      {records.length > 0 && records.length < 7 && (
        <div className="mb-6 rounded-2xl border border-indigo-400/20 bg-indigo-500/[0.05] p-5">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-semibold text-[#e6e8ee]">
              相関分析まであと{" "}
              <span className="text-indigo-300">{7 - records.length}</span> 日！
            </span>
            <span className="text-xs text-[#9ba3b5]">
              {records.length} / 7 件
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-700"
              style={{ width: `${(records.length / 7) * 100}%` }}
              role="progressbar"
              aria-valuenow={records.length}
              aria-valuemin={0}
              aria-valuemax={7}
              aria-label="相関分析解禁まで"
            />
          </div>
          <p className="mt-2 text-xs leading-relaxed text-[#9ba3b5]">
            {records.length === 1 && "よいスタートです！毎日の記録で、気象と睡眠の関係が少しずつ見えてきます。"}
            {records.length === 2 && "2日分の記録！続けることで、あなただけのパターンが浮かび上がります。"}
            {records.length === 3 && "3日目！折り返し地点が近づいています。低気圧の夜もぜひ記録してみてください。"}
            {(records.length === 4 || records.length === 5) && "もうすぐです！気象と睡眠の相関グラフが解放されます。"}
            {records.length === 6 && "あと1日！明日の記録で相関分析がスタートします 🎉"}
          </p>
          <Link
            href="/record"
            className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-indigo-300 hover:text-indigo-200 transition-colors"
          >
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            今日を記録する
          </Link>
        </div>
      )}

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
              ? QUALITY_FULL_MAP[Math.round(stats.avg7Days) as 1 | 2 | 3 | 4 | 5]
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
        {/* worstDay: 日付をメイン値・品質をサブラベルに分けてスッキリ表示 */}
        <KpiCard
          icon={<Moon className="h-4 w-4" aria-hidden />}
          label="最も浅かった日"
          value={stats.worstDay ? toShortLabel(stats.worstDay.date) : "--"}
          subtitle={
            stats.worstDay
              ? QUALITY_FULL_MAP[stats.worstDay.quality as 1 | 2 | 3 | 4 | 5]
              : undefined
          }
        />
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
                <p className="text-sm leading-relaxed text-[#e6e8ee]">
                  {item.message}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ── ③ 折れ線グラフ: quality 推移（5件未満はロック） ── */}
      <ChartCard title="過去 30 日の睡眠品質推移">
        <LockedChart needed={LINE_THRESHOLD} current={records.length}>
          <div className="h-[200px] overflow-hidden md:h-[280px]">
            <Line
              data={lineData}
              options={lineOptions}
              aria-label="過去 30 日の睡眠品質推移 折れ線グラフ"
              role="img"
            />
          </div>
        </LockedChart>
      </ChartCard>

      {/* ── ④ 散布図 + 回帰直線（10件未満はロック） ── */}
      <ChartCard title="気圧と睡眠品質の関係">
        <LockedChart needed={DEMO_THRESHOLD} current={records.length}>
          <div className="h-[220px] overflow-hidden md:h-[280px]">
            <CorrelationChart records={records} height={280} />
          </div>
        </LockedChart>
      </ChartCard>

      {/* ── ⑤ 気象別平均 (Tabs)（10件未満はロック） ── */}
      <ChartCard title="気象別の平均品質">
        <LockedChart needed={DEMO_THRESHOLD} current={records.length}>
          <Tabs defaultValue="pressure" className="w-full">
            <TabsList className="mb-3 grid w-full grid-cols-2 gap-1 bg-[#0f1117] p-1">
              <TabsTrigger
                value="pressure"
                className="rounded-md text-[#9ba3b5] data-[state=active]:bg-[#1d9bf0]/10 data-[state=active]:text-[#1d9bf0] data-[state=active]:shadow-none"
              >
                気圧別
              </TabsTrigger>
              <TabsTrigger
                value="moon"
                className="rounded-md text-[#9ba3b5] data-[state=active]:bg-[#1d9bf0]/10 data-[state=active]:text-[#1d9bf0] data-[state=active]:shadow-none"
              >
                月齢別
              </TabsTrigger>
            </TabsList>
            <TabsContent value="pressure" className="mt-0">
              <div className="h-[180px] overflow-hidden md:h-[240px]">
                <Bar
                  data={pressureBarData}
                  options={barOptions}
                  aria-label="気圧別の平均睡眠品質"
                  role="img"
                />
              </div>
            </TabsContent>
            <TabsContent value="moon" className="mt-0">
              <div className="h-[180px] overflow-hidden md:h-[240px]">
                <Bar
                  data={moonBarData}
                  options={barOptions}
                  aria-label="月齢別の平均睡眠品質"
                  role="img"
                />
              </div>
            </TabsContent>
          </Tabs>
        </LockedChart>
      </ChartCard>

      {/* 広告スロット: チャートセクション下 */}
      <AdBanner slot="dashboard-charts" format="horizontal" className="mb-6" />

      {/* ── ⑥ 「今日を記録する」CTA — 常時表示 ── */}
      <div className="mb-6 flex items-center justify-between gap-3 rounded-lg border border-violet-400/20 bg-violet-500/5 p-4">
        <div>
          <p className="text-sm font-medium text-[#e6e8ee]">今日の眠りを記録する</p>
          <p className="mt-0.5 text-xs text-[#9ba3b5]">毎日記録すると、あなただけの傾向が見えてきます</p>
        </div>
        <Button
          asChild
          size="sm"
          className="flex-shrink-0 bg-[#a78bfa] text-white hover:bg-[#9061f9]"
        >
          <Link href="/record">
            記録する
            <ArrowRight className="ml-1 h-4 w-4" aria-hidden />
          </Link>
        </Button>
      </div>

      {/* ── ⑦ 記録促進バナー（下部へ移動・ページ冒頭の圧迫感を解消） ── */}
      {records.length > 0 && records.length < DEMO_THRESHOLD && (
        <div className="mb-6 rounded-lg border border-sky-400/30 bg-sky-500/5 p-3">
          <p className="text-sm text-gray-200">
            📈 あと{" "}
            <span className="font-bold text-sky-400">
              {DEMO_THRESHOLD - records.length} 日
            </span>{" "}
            記録するとフル分析が解放されます。引き続き記録を続けてみてください。
          </p>
        </div>
      )}

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
    <div className="flex flex-col gap-2 rounded-xl border border-gray-700/50 bg-gradient-to-br from-gray-900 to-[#161a24] p-4 shadow-md transition-all duration-200 hover:border-violet-400/30 hover:shadow-lg">
      <div className="flex items-center gap-2 text-gray-400">
        <span className="text-violet-400">{icon}</span>
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p
        className={`font-bold tabular-nums text-gray-100 ${
          small ? "text-lg" : "text-2xl"
        }`}
      >
        {value}
      </p>
      {subtitle && (
        <p className="text-xs text-[#9ba3b5]">{subtitle}</p>
      )}
    </div>
  );
}

type ChartCardProps = {
  title: string;
  children: React.ReactNode;
};

function ChartCard({ title, children }: ChartCardProps) {
  return (
    <section className="mb-6 rounded-xl bg-[#1a1f2e] p-4">
      <h2 className="mb-3 text-sm font-semibold text-[#e6e8ee]">{title}</h2>
      {children}
    </section>
  );
}

type LockedChartProps = {
  /** 解放に必要な最小記録数 */
  needed: number;
  /** 現在の記録数 */
  current: number;
  children: React.ReactNode;
};

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

/**
 * 記録数が閾値未満のとき、グラフをぼかしてロックオーバーレイを表示する。
 * 閾値以上なら children をそのまま描画する。
 */
function LockedChart({ needed, current, children }: LockedChartProps) {
  if (current >= needed) return <>{children}</>;
  const remaining = needed - current;
  return (
    <div className="relative overflow-hidden rounded-lg">
      {/* グラフ本体: ぼかし + 半透明でロック感を演出 */}
      <div className="pointer-events-none select-none opacity-20 blur-[3px]">
        {children}
      </div>
      {/* ロックオーバーレイ */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="flex flex-col items-center gap-2 rounded-xl border border-gray-700/60 bg-[#0f1117]/90 px-6 py-4 text-center shadow-lg">
          <span className="text-2xl" aria-hidden>🔒</span>
          <p className="text-sm font-semibold text-[#e6e8ee]">
            あと{" "}
            <span className="text-violet-400">{remaining} 件</span>{" "}
            で解放
          </p>
          <p className="text-xs text-[#9ba3b5]">記録を続けると分析が見えてきます</p>
        </div>
      </div>
    </div>
  );
}
