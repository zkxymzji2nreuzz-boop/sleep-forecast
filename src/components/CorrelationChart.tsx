"use client";

/**
 * 気圧差 × 睡眠品質の散布図 + 回帰直線コンポーネント (F003)。
 *
 * Props:
 *   records: SleepRecord[]      — デモ or 実データを外部注入
 *   height?: number             — コンテナ高さ (デフォルト 240px)
 *
 * 仕様:
 *   - X 軸: pressureDeltaHpa (hPa)
 *   - Y 軸: quality 1〜5 固定
 *   - 散布点は quality 値で色分け (1:赤 → 5:青)
 *   - 線形回帰直線を破線で重ねる (records が 2 件未満なら非表示)
 *   - Tooltip 背景 #1a1f2e、タイトル "気圧変化: -3.7 hPa — 品質: 悪い (2)"
 */

import * as React from "react";
import { useDarkMode } from "@/lib/useDarkMode";
import {
  Chart as ChartJS,
  LinearScale,
  PointElement,
  LineElement,
  ScatterController,
  Tooltip,
  Legend,
  type ChartData,
  type ChartOptions,
  type TooltipItem,
} from "chart.js";
import { Scatter } from "react-chartjs-2";

import { calculateLinearRegression, calculatePearsonCorrelation } from "@/lib/correlation";
import type { SleepRecord } from "@/lib/types";

// ダッシュボード側でも同じ controller を register しているが、このコンポーネントを
// 単独で再利用するケースに備えて自前でも register しておく。
// ChartJS.register は idempotent なので二重実行しても問題ない。
ChartJS.register(
  LinearScale,
  PointElement,
  LineElement,
  ScatterController,
  Tooltip,
  Legend
);

/** quality 1/3/5 の色マッピング（記録フォームは3択のみ） */
const QUALITY_COLORS: Record<number, string> = {
  1: "#f87171",
  3: "#facc15",
  5: "#4ade80",
};

const QUALITY_LABELS: Record<number, string> = {
  1: "眠れなかった",
  3: "なんとか眠れた",
  5: "よく眠れた",
};

export type CorrelationChartProps = {
  records: SleepRecord[];
  /** px 単位の高さ (モバイル〜デスクトップ共通、Tailwind ではなく inline で指定) */
  height?: number;
};

export function CorrelationChart({
  records,
  height = 240,
}: CorrelationChartProps) {
  const isDark = useDarkMode();
  const tickColor = isDark ? "rgba(203, 213, 225, 0.85)" : "rgba(30, 41, 59, 0.85)";
  const gridColor = isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.08)";

  // --- 散布点の準備 ---
  const scatterPoints = records.map((r) => ({
    x: r.weather.pressureDeltaHpa,
    y: r.quality,
    quality: r.quality,
    date: r.date,
  }));
  const pointColors = scatterPoints.map((p) => QUALITY_COLORS[p.quality]);

  // --- 回帰直線 + 相関係数の準備 (records >= 2 のみ) ---
  const xs = scatterPoints.map((p) => p.x);
  const ys = scatterPoints.map((p) => p.y);
  const regression =
    scatterPoints.length >= 2 ? calculateLinearRegression(xs, ys) : null;
  const pearsonR =
    xs.length >= 3 ? calculatePearsonCorrelation(xs, ys) : null;

  const datasets: ChartData<"scatter">["datasets"] = [
    {
      label: "睡眠品質",
      data: scatterPoints,
      backgroundColor: pointColors,
      borderColor: pointColors,
      pointRadius: 6,
      pointHoverRadius: 8,
      showLine: false,
      order: 2,
    },
  ];

  if (regression !== null && xs.length >= 2) {
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    // 全 xs が同値のケースは calculateLinearRegression が null を返しているのでここには来ない。
    // Scatter コントローラでは showLine: true で散布点 dataset を線に転用できる。
    datasets.push({
      label: "回帰直線",
      data: [
        { x: minX, y: regression.slope * minX + regression.intercept },
        { x: maxX, y: regression.slope * maxX + regression.intercept },
      ],
      borderColor: isDark ? "rgba(255, 255, 255, 0.3)" : "rgba(0, 0, 0, 0.25)",
      backgroundColor: "rgba(0, 0, 0, 0)",
      borderDash: [4, 4],
      borderWidth: 1.5,
      pointRadius: 0,
      pointHoverRadius: 0,
      fill: false,
      showLine: true,
      order: 1,
    });
  }

  const data: ChartData<"scatter"> = { datasets };

  const options: ChartOptions<"scatter"> = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 400 },
    clip: false,
    layout: { padding: { top: 8, bottom: 8, left: 4, right: 4 } },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: "hsl(252 28% 14%)",
        borderColor: "#6366f1",
        borderWidth: 1,
        titleColor: "hsl(256 43% 93%)",
        bodyColor: "rgba(203, 213, 225, 0.85)",
        padding: 10,
        callbacks: {
          title: (items: TooltipItem<"scatter">[]) => {
            if (!items.length) return "";
            const raw = items[0].raw as { x: number; y: number; quality?: number; date?: string };
            if (!raw.date) return "";
            const parts = raw.date.split("-");
            return `${parts[1]}月${parts[2]}日`;
          },
          label: (ctx: TooltipItem<"scatter">) => {
            const raw = ctx.raw as { x: number; y: number; quality?: number; date?: string };
            if (raw.quality === undefined) {
              // 回帰直線の点 → "傾向線" と表示
              return `傾向線 (${raw.x.toFixed(1)} hPa)`;
            }
            const q = raw.quality;
            const label = QUALITY_LABELS[q] ?? `品質 ${q}`;
            return `気圧変化: ${raw.x >= 0 ? "+" : ""}${raw.x.toFixed(1)} hPa — 品質: ${label}`;
          },
        },
      },
    },
    scales: {
      x: {
        type: "linear",
        title: {
          display: true,
          text: "前日比気圧 (hPa)",
          color: tickColor,
          font: { size: 11 },
        },
        grid: { color: gridColor },
        ticks: { color: tickColor },
      },
      y: {
        type: "linear",
        min: 1,
        max: 5,
        ticks: {
          stepSize: 1,
          color: tickColor,
          callback: (value) => {
            const v = Number(value);
            if (!Number.isInteger(v)) return "";
            return QUALITY_LABELS[v] ?? "";
          },
        },
        grid: { color: isDark ? "rgba(139, 146, 165, 0.10)" : "rgba(0, 0, 0, 0.06)" },
      },
    },
  };

  const validR = pearsonR !== null && !isNaN(pearsonR);

  // スクリーンリーダー用の代替テキストを動的生成（hooks は早期returnより前に呼ぶ）
  const chartAltText = React.useMemo(() => {
    if (records.length === 0) return "";
    const trend =
      validR && pearsonR !== null && pearsonR <= -0.3
        ? "気圧が下がるほど睡眠品質が低下する傾向があります"
        : validR && pearsonR !== null && pearsonR >= 0.3
        ? "気圧が上がるほど睡眠品質が向上する傾向があります"
        : "現時点では明確な相関は見られません";
    return `${records.length}日分の記録をもとにした、気圧変化と睡眠品質の散布図です。${
      validR && pearsonR !== null ? `相関係数 r = ${pearsonR.toFixed(2)}　` : ""
    }${trend}`;
  }, [records.length, validR, pearsonR]);

  if (records.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-sm text-muted-foreground"
        style={{ height }}
      >
        データがありません
      </div>
    );
  }

  return (
    <div>
      {/* スクリーンリーダー向け代替テキスト */}
      <p id="corr-chart-desc" className="sr-only">{chartAltText}</p>
      <div className="overflow-hidden" style={{ height }}>
        <Scatter
          data={data}
          options={options}
          role="img"
          aria-label="気圧と睡眠品質の散布図"
          aria-describedby="corr-chart-desc"
        />
      </div>
      {/* フッター: 相関係数 + 凡例 */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-y-2 text-[11px] text-muted-foreground">
        {validR && pearsonR !== null && (
          <span className="shrink-0 flex flex-wrap items-baseline gap-1">
            <span>
              相関係数 r = <span className={
                pearsonR <= -0.3 ? "font-semibold text-rose-600 dark:text-rose-400"
                : pearsonR >= 0.3 ? "font-semibold text-emerald-600 dark:text-emerald-400"
                : "text-muted-foreground"
              }>{pearsonR.toFixed(2)}</span>
            </span>
            <span className="text-[10px] text-muted-foreground/70">
              {pearsonR <= -0.5
                ? "（強い負の相関）"
                : pearsonR <= -0.3
                ? "（負の相関）"
                : pearsonR >= 0.5
                ? "（強い正の相関）"
                : pearsonR >= 0.3
                ? "（正の相関）"
                : "（相関なし）"}
            </span>
          </span>
        )}
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {([5, 3, 1] as const).map((q) => (
            <span key={q} className="flex items-center gap-1">
              <span
                className="inline-block h-2 w-2 shrink-0 rounded-full"
                style={{ background: QUALITY_COLORS[q] }}
                aria-hidden="true"
              />
              {QUALITY_LABELS[q]}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
