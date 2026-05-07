"use client";

/**
 * ダッシュボードのチャートセクション（Chart.js を動的インポートで分割）。
 * dashboard/page.tsx から next/dynamic で遅延ロードすることで
 * ルートの First Load JS を削減する。
 *
 * 含むもの:
 *   - 折れ線グラフ (睡眠品質推移)
 *   - 散布図 (気圧 × 睡眠品質)
 *   - 棒グラフ タブ (気圧別 / 月齢別 / 曜日別)
 */

import * as React from "react";
import { Bar, Line } from "react-chartjs-2";
import { useDarkMode } from "@/lib/useDarkMode";
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
import { Lock } from "lucide-react";
import { CorrelationChart } from "@/components/CorrelationChart";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import type { SleepRecord } from "@/lib/types";

// ---------------------------------------------------------------------------
// Chart.js グローバル設定（このモジュールが初めてロードされたときに 1 回だけ実行）
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
// グローバルデフォルトはダークモード基準で初期化（実行時に useDarkMode で上書き）
ChartJS.defaults.color = "rgba(203, 213, 225, 0.85)";
ChartJS.defaults.borderColor = "rgba(255, 255, 255, 0.08)";
ChartJS.defaults.font.family = "'Inter', sans-serif";

// ---------------------------------------------------------------------------
// 閾値定数
// ---------------------------------------------------------------------------
/** 折れ線グラフの解放に必要な最小記録数 */
const LINE_THRESHOLD = 3;
/** 散布図・気象別グラフの解放に必要な最小記録数 */
const DEMO_THRESHOLD = 7;

// ---------------------------------------------------------------------------
// チャート用定数
// ---------------------------------------------------------------------------

// 記録フォームは 1/3/5 の3択のみ → Y軸は3点だけ表示
const QUALITY_LABEL_MAP: Record<number, string> = {
  1: "眠れなかった",
  3: "なんとか眠れた",
  5: "よく眠れた",
};

const PRESSURE_BUCKETS = ["急上昇 (+3以上)", "横ばい", "急低下 (-3以下)"] as const;
// 急上昇は緑(良い)に見えるのを避けるため青に変更 — 医学的に中立な配色
const PRESSURE_BUCKET_COLORS = ["#60a5fa", "#a8b0c2", "#ef4444"];

const DOW_LABELS = ["日", "月", "火", "水", "木", "金", "土"] as const;
const DOW_COLORS = [
  "#f87171",
  "#a8b0c2",
  "#a8b0c2",
  "#a8b0c2",
  "#a8b0c2",
  "#4ade80",
  "#60a5fa",
];

const MOON_BUCKETS = [
  "新月期 (0〜0.1)",
  "上弦期 (0.1〜0.45)",
  "満月期 (0.45〜0.55)",
  "下弦期 (0.55〜0.9)",
] as const;
const MOON_BUCKET_COLORS = ["#7c4dff", "#6366f1", "#facc15", "#4ade80"];

const TOOLTIP_BASE = {
  backgroundColor: "hsl(252 28% 14%)",
  borderColor: "#6366f1",
  borderWidth: 1,
  titleColor: "hsl(256 43% 93%)",
  bodyColor: "hsl(252 23% 65%)",
  padding: 10,
} as const;

// ---------------------------------------------------------------------------
// ヘルパ関数
// ---------------------------------------------------------------------------

function ascByDate(records: SleepRecord[]): SleepRecord[] {
  return [...records].sort((a, b) =>
    a.date < b.date ? -1 : a.date > b.date ? 1 : 0
  );
}

function calcMovingAverage(values: number[], window = 7): (number | null)[] {
  return values.map((_, i) => {
    const start = Math.max(0, i - window + 1);
    const slice = values.slice(start, i + 1);
    if (slice.length < 3) return null;
    return slice.reduce((a, b) => a + b, 0) / slice.length;
  });
}

function toShortLabel(isoDate: string): string {
  const [, mm, dd] = isoDate.split("-");
  return `${mm}/${dd}`;
}

function bucketStats(records: SleepRecord[]): { avg: number; count: number } {
  if (records.length === 0) return { avg: 0, count: 0 };
  const sum = records.reduce((acc, r) => acc + r.quality, 0);
  return { avg: sum / records.length, count: records.length };
}

function groupByPressure(records: SleepRecord[]) {
  const rise = records.filter((r) => r.weather.pressureDeltaHpa >= 3);
  const flat = records.filter(
    (r) => r.weather.pressureDeltaHpa > -3 && r.weather.pressureDeltaHpa < 3
  );
  const drop = records.filter((r) => r.weather.pressureDeltaHpa <= -3);
  return [bucketStats(rise), bucketStats(flat), bucketStats(drop)];
}

function groupByDayOfWeek(records: SleepRecord[]) {
  const groups: SleepRecord[][] = Array.from({ length: 7 }, () => []);
  for (const r of records) {
    const dow = new Date(r.date + "T00:00:00+09:00").getDay();
    groups[dow].push(r);
  }
  return groups.map((g) => bucketStats(g));
}

function groupByMoonPhase(records: SleepRecord[]) {
  const newMoon: SleepRecord[] = [];
  const firstQuarter: SleepRecord[] = [];
  const fullMoon: SleepRecord[] = [];
  const lastQuarter: SleepRecord[] = [];

  for (const r of records) {
    const p = r.weather.moonPhase;
    if (p >= 0.45 && p <= 0.55) {
      fullMoon.push(r);
    } else if (p >= 0 && p < 0.1) {
      newMoon.push(r);
    } else if (p >= 0.1 && p < 0.45) {
      firstQuarter.push(r);
    } else if (p > 0.55 && p < 0.9) {
      lastQuarter.push(r);
    }
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

function buildLineOptions(isDark: boolean): ChartOptions<"line"> {
  const tickColor = isDark ? "rgba(203, 213, 225, 0.85)" : "rgba(30, 41, 59, 0.85)";
  const gridColor = isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.08)";
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 400 },
    clip: false,
    layout: { padding: { top: 8, bottom: 8, left: 4, right: 4 } },
    plugins: {
      legend: {
        display: true,
        position: "top" as const,
        align: "end" as const,
        labels: {
          color: tickColor,
          font: { size: 11 },
          boxWidth: 16,
          boxHeight: 2,
          padding: 12,
        },
      },
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
            const q = Math.round(Number(ctx.parsed.y));
            const QUALITY_FULL: Record<number, string> = {
              1: "眠れなかった", 3: "なんとか眠れた", 5: "よく眠れた",
            };
            return `品質: ${QUALITY_FULL[q] ?? q}`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: { color: gridColor },
        ticks: { color: tickColor, maxRotation: 0, autoSkipPadding: 16 },
      },
      y: {
        min: 1,
        max: 5,
        ticks: {
          stepSize: 1,
          color: tickColor,
          callback: (value) => {
            const v = Number(value);
            if (!Number.isInteger(v) || v < 1 || v > 5) return "";
            return QUALITY_LABEL_MAP[v as 1 | 2 | 3 | 4 | 5];
          },
        },
        grid: { color: gridColor },
      },
    },
  };
}

function buildBarOptions(isDark: boolean): ChartOptions<"bar"> {
  const tickColor = isDark ? "rgba(203, 213, 225, 0.85)" : "rgba(30, 41, 59, 0.85)";
  const gridColor = isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.08)";
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
        grid: { color: gridColor },
        ticks: { color: tickColor, font: { size: 10 } },
      },
      y: {
        min: 0,
        max: 5,
        ticks: { stepSize: 1, color: tickColor },
        grid: { color: gridColor },
      },
    },
  };
}

// ---------------------------------------------------------------------------
// 部品コンポーネント
// ---------------------------------------------------------------------------

type ChartCardProps = {
  title: string;
  children: React.ReactNode;
};

function ChartCard({ title, children }: ChartCardProps) {
  return (
    <section className="mb-6 rounded-xl bg-card p-4">
      <h2 className="mb-3 text-sm font-semibold text-foreground">{title}</h2>
      {children}
    </section>
  );
}

type LockedChartProps = {
  needed: number;
  current: number;
  children: React.ReactNode;
};

function LockedChart({ needed, current, children }: LockedChartProps) {
  if (current >= needed) return <>{children}</>;
  const remaining = needed - current;
  return (
    <div className="relative overflow-hidden rounded-lg">
      <div className="pointer-events-none select-none opacity-20 blur-[3px]">
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="flex flex-col items-center gap-2 rounded-xl border border-border bg-background/90 px-6 py-4 text-center shadow-lg">
          <Lock className="h-6 w-6 text-muted-foreground" aria-hidden />
          <p className="text-sm font-semibold text-foreground">
            あと{" "}
            <span className="text-primary/80">{remaining} 件</span>{" "}
            で解放
          </p>
          <p className="text-xs text-muted-foreground">記録を続けると分析が見えてきます</p>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// メインコンポーネント
// ---------------------------------------------------------------------------

type Props = {
  records: SleepRecord[];
};

export function DashboardChartsSection({ records }: Props) {
  const isDark = useDarkMode();

  // ChartJS グローバルデフォルトをテーマに合わせてリアルタイム更新
  React.useEffect(() => {
    ChartJS.defaults.color = isDark ? "rgba(203, 213, 225, 0.85)" : "rgba(30, 41, 59, 0.85)";
    ChartJS.defaults.borderColor = isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.08)";
  }, [isDark]);

  // --- 折れ線グラフ dataset ---
  const lineData = React.useMemo<ChartData<"line">>(() => {
    const asc = ascByDate(records).slice(-30);
    const labels = asc.map((r) => toShortLabel(r.date));
    const values = asc.map((r) => r.quality);
    const movingAvg = calcMovingAverage(values);
    return {
      labels,
      datasets: [
        {
          label: "日次品質",
          data: values,
          borderColor: "#6366f1",
          backgroundColor: "rgba(99, 102, 241, 0.10)",
          borderWidth: 2,
          pointBackgroundColor: "#6366f1",
          pointBorderColor: "hsl(252 28% 14%)",
          pointBorderWidth: 2,
          pointRadius: 3,
          pointHoverRadius: 5,
          fill: true,
          tension: 0.25,
          order: 2,
          _dates: asc.map((r) => r.date),
        } as ChartData<"line">["datasets"][number] & { _dates: string[] },
        {
          label: "7日平均",
          data: movingAvg,
          borderColor: "#a78bfa",
          backgroundColor: "transparent",
          borderWidth: 2,
          borderDash: [4, 3],
          pointRadius: 0,
          pointHoverRadius: 4,
          fill: false,
          tension: 0.4,
          order: 1,
          spanGaps: false,
        } as ChartData<"line">["datasets"][number],
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

  // --- 棒グラフ (曜日別) ---
  const dowBarData = React.useMemo<ChartData<"bar">>(() => {
    const buckets = groupByDayOfWeek(records);
    const values = buckets.map((b) => (b.count === 0 ? 0 : b.avg));
    const counts = buckets.map((b) => b.count);
    return {
      labels: [...DOW_LABELS],
      datasets: [
        {
          label: "平均品質",
          data: values,
          backgroundColor: DOW_COLORS,
          borderColor: DOW_COLORS,
          borderWidth: 1,
          borderRadius: 6,
          _counts: counts,
        } as ChartData<"bar">["datasets"][number] & { _counts: number[] },
      ],
    };
  }, [records]);

  const lineOptions = React.useMemo(() => buildLineOptions(isDark), [isDark]);
  const barOptions = React.useMemo(() => buildBarOptions(isDark), [isDark]);

  return (
    <>
      {/* ── ③ 折れ線グラフ: quality 推移（3件未満はロック） ── */}
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

      {/* ── ④ 散布図 + 回帰直線（7件未満はロック） ── */}
      <ChartCard title="気圧と睡眠品質の関係">
        <LockedChart needed={DEMO_THRESHOLD} current={records.length}>
          <div className="h-[220px] overflow-hidden md:h-[280px]">
            <CorrelationChart records={records} height={280} />
          </div>
        </LockedChart>
      </ChartCard>

      {/* ── ⑤ 気象別平均 (Tabs)（7件未満はロック） ── */}
      <ChartCard title="気象・曜日別の平均品質">
        <LockedChart needed={DEMO_THRESHOLD} current={records.length}>
          <Tabs defaultValue="pressure" className="w-full">
            <TabsList className="mb-3 grid w-full grid-cols-3 gap-1 bg-background p-1">
              <TabsTrigger
                value="pressure"
                className="rounded-md text-muted-foreground data-[state=active]:bg-primary/[0.07] data-[state=active]:text-primary/80 data-[state=active]:shadow-none"
              >
                気圧別
              </TabsTrigger>
              <TabsTrigger
                value="moon"
                className="rounded-md text-muted-foreground data-[state=active]:bg-primary/[0.07] data-[state=active]:text-primary/80 data-[state=active]:shadow-none"
              >
                月齢別
              </TabsTrigger>
              <TabsTrigger
                value="dow"
                className="rounded-md text-muted-foreground data-[state=active]:bg-primary/[0.07] data-[state=active]:text-primary/80 data-[state=active]:shadow-none"
              >
                曜日別
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
            <TabsContent value="dow" className="mt-0">
              <div className="h-[180px] overflow-hidden md:h-[240px]">
                <Bar
                  data={dowBarData}
                  options={barOptions}
                  aria-label="曜日別の平均睡眠品質"
                  role="img"
                />
              </div>
              <p className="mt-2 text-[10px] text-muted-foreground">
                曜日ごとの平均睡眠品質。週末の生活リズムの乱れや週明けの疲れを確認できます。
              </p>
            </TabsContent>
          </Tabs>
        </LockedChart>
      </ChartCard>
    </>
  );
}
