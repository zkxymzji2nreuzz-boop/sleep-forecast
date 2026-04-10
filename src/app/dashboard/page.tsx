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
 * その下に自然言語インサイト、最下部に医療免責を配置する。
 *
 * デモ/リアル切替:
 *   - localStorage 記録 0〜9 件: DEMO_RECORDS 表示 + サンプルバナー
 *   - 10 件以上:                 実データ表示
 *   - SSR 対策: マウント前は DEMO_RECORDS を初期値として描画し、
 *     useEffect で実データに差し替える (hydration safe)
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
import { DEMO_RECORDS } from "@/lib/demoData";
import { getRecords } from "@/lib/storage";
import type { SleepRecord, PredictionResult } from "@/lib/types";

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

ChartJS.defaults.color = "#8b92a5";
ChartJS.defaults.borderColor = "rgba(139, 146, 165, 0.15)";
ChartJS.defaults.font.family = "'Inter', sans-serif";

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------

const DEMO_THRESHOLD = 10;

const QUALITY_LABEL_MAP: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: "とても悪い",
  2: "悪い",
  3: "普通",
  4: "良い",
  5: "とても良い",
};

const PRESSURE_BUCKETS = ["急上昇 (+3以上)", "横ばい", "急低下 (-3以下)"] as const;
const PRESSURE_BUCKET_COLORS = ["#4ade80", "#8b92a5", "#ef4444"];

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
  bodyColor: "#8b92a5",
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
            return `品質: ${QUALITY_LABEL_MAP[q]} (${q})`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: { color: "rgba(139, 146, 165, 0.10)" },
        ticks: {
          color: "#8b92a5",
          maxRotation: 0,
          autoSkipPadding: 16,
        },
      },
      y: {
        min: 1,
        max: 5,
        ticks: {
          stepSize: 1,
          color: "#8b92a5",
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
            const counts =
              (ctx.dataset as { _counts?: number[] })._counts ?? [];
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
        ticks: { color: "#8b92a5", font: { size: 10 } },
      },
      y: {
        min: 0,
        max: 5,
        ticks: { stepSize: 0.5, color: "#8b92a5" },
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
  // 初期値は常に DEMO_RECORDS にしてマウント後に差し替える。
  const [records, setRecords] = React.useState<SleepRecord[]>(DEMO_RECORDS);
  const [isDemo, setIsDemo] = React.useState<boolean>(true);
  const [prediction, setPrediction] = React.useState<PredictionResult | null>(null);

  React.useEffect(() => {
    const real = getRecords();
    if (real.length >= DEMO_THRESHOLD) {
      setRecords(real);
      setIsDemo(false);
    } else {
      setRecords(DEMO_RECORDS);
      setIsDemo(true);
    }

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

  return (
    <div className="container mx-auto max-w-screen-md px-4 py-8 pb-16 sm:py-12">
      <Breadcrumb items={[{ name: "ホーム", href: "/" }, { name: "ダッシュボード" }]} />

      <header className="mb-6">
        <h1 className="text-2xl font-bold text-[#e6e8ee]">睡眠ダッシュボード</h1>
        <p className="mt-1 text-sm text-[#8b92a5]">
          過去 30 日の記録から、気象と睡眠品質の関係を分析します。
        </p>
      </header>

      {isDemo && <DemoBanner />}

      {/* 予測カード */}
      {prediction && (
        <div className="mb-8">
          <PredictionCard prediction={prediction} variant="full" />
        </div>
      )}

      {/* KPI カード */}
      <section
        aria-label="睡眠 KPI サマリー"
        className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4"
      >
        <KpiCard
          icon={<TrendingUp className="h-4 w-4" aria-hidden />}
          label="7 日平均品質"
          value={stats.avg7Days !== null ? stats.avg7Days.toFixed(1) : "--"}
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
        <KpiCard
          icon={<Moon className="h-4 w-4" aria-hidden />}
          label="最も浅かった日"
          value={
            stats.worstDay
              ? `${toShortLabel(stats.worstDay.date)} (品質${stats.worstDay.quality})`
              : "--"
          }
          small
        />
      </section>

      {/* 折れ線グラフ: quality 推移 */}
      <ChartCard title="過去 30 日の睡眠品質推移">
        <div className="h-[200px] overflow-hidden md:h-[280px]">
          <Line
            data={lineData}
            options={lineOptions}
            aria-label="過去 30 日の睡眠品質推移 折れ線グラフ"
            role="img"
          />
        </div>
      </ChartCard>

      {/* 散布図 + 回帰直線 */}
      <ChartCard title="気圧と睡眠品質の関係">
        <div className="h-[220px] overflow-hidden md:h-[280px]">
          <CorrelationChart records={records} height={280} />
        </div>
      </ChartCard>

      {/* 気象別平均 (Tabs) */}
      <ChartCard title="気象別の平均品質">
        <Tabs defaultValue="pressure" className="w-full">
          <TabsList className="mb-3 grid w-full grid-cols-2 gap-1 bg-[#0f1117] p-1">
            <TabsTrigger
              value="pressure"
              className="rounded-md text-[#8b92a5] data-[state=active]:bg-[#1d9bf0]/10 data-[state=active]:text-[#1d9bf0] data-[state=active]:shadow-none"
            >
              気圧別
            </TabsTrigger>
            <TabsTrigger
              value="moon"
              className="rounded-md text-[#8b92a5] data-[state=active]:bg-[#1d9bf0]/10 data-[state=active]:text-[#1d9bf0] data-[state=active]:shadow-none"
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
      </ChartCard>

      {/* 広告スロット: チャートセクション下 */}
      <AdBanner slot="dashboard-charts" format="horizontal" className="mb-6" />

      {/* 自然言語インサイト — B案: 感情別カラー */}
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

      {/* 医療免責 — C案要素取り込み: AlertCircle + amber テキスト */}
      <div className="mt-6 rounded-md border border-amber-700/30 bg-amber-900/10 px-4 py-3">
        <div className="flex items-start gap-2 text-xs text-amber-200">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" aria-hidden />
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

function DemoBanner() {
  return (
    // B案: グラデーション from-violet-500/10 to-sky-500/10
    <div
      role="status"
      className="mb-6 flex flex-col gap-3 rounded-lg border border-violet-400/30 bg-gradient-to-r from-violet-500/10 to-sky-500/10 p-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <p className="text-sm text-gray-200">
        📊 サンプルデータを表示しています。10 日以上記録するとあなた専用の分析に切り替わります。
      </p>
      <Button
        asChild
        variant="outline"
        size="sm"
        className="border-violet-400/50 bg-transparent text-violet-400 hover:bg-violet-500/10 hover:text-violet-300 focus-visible:ring-2 focus-visible:ring-violet-400"
      >
        <Link href="/record">
          今日を記録する
          <ArrowRight className="ml-1 h-4 w-4" aria-hidden />
        </Link>
      </Button>
    </div>
  );
}

type KpiCardProps = {
  icon: React.ReactNode;
  label: string;
  value: string;
  /** 文字数が多い (例: "04/03 (品質1)") 場合に 1 段階小さくする */
  small?: boolean;
};

function KpiCard({ icon, label, value, small }: KpiCardProps) {
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
