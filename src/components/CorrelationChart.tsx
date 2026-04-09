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

import { calculateLinearRegression } from "@/lib/correlation";
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

/** quality 1〜5 の色マッピング (spec.md 準拠) */
const QUALITY_COLORS: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: "#ef4444",
  2: "#f97316",
  3: "#facc15",
  4: "#4ade80",
  5: "#1d9bf0",
};

const QUALITY_LABELS: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: "とても悪い",
  2: "悪い",
  3: "普通",
  4: "良い",
  5: "とても良い",
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
  // --- 散布点の準備 ---
  const scatterPoints = records.map((r) => ({
    x: r.weather.pressureDeltaHpa,
    y: r.quality,
    quality: r.quality,
  }));
  const pointColors = scatterPoints.map((p) => QUALITY_COLORS[p.quality]);

  // --- 回帰直線の準備 (records >= 2 のみ) ---
  const xs = scatterPoints.map((p) => p.x);
  const ys = scatterPoints.map((p) => p.y);
  const regression =
    scatterPoints.length >= 2 ? calculateLinearRegression(xs, ys) : null;

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
      borderColor: "rgba(255, 255, 255, 0.3)",
      backgroundColor: "rgba(255, 255, 255, 0)",
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
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: "#1a1f2e",
        borderColor: "#1d9bf0",
        borderWidth: 1,
        titleColor: "#e6e8ee",
        bodyColor: "#8b92a5",
        padding: 10,
        callbacks: {
          label: (ctx: TooltipItem<"scatter">) => {
            const raw = ctx.raw as { x: number; y: number; quality?: number };
            if (raw.quality === undefined) {
              // 回帰直線の点 → "傾向線" と表示
              return `傾向線 (${raw.x.toFixed(1)} hPa)`;
            }
            const q = raw.quality as 1 | 2 | 3 | 4 | 5;
            const label = QUALITY_LABELS[q];
            return `気圧変化: ${raw.x.toFixed(1)} hPa — 品質: ${label} (${q})`;
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
          color: "#8b92a5",
          font: { size: 11 },
        },
        grid: { color: "rgba(139, 146, 165, 0.10)" },
        ticks: { color: "#8b92a5" },
      },
      y: {
        type: "linear",
        min: 1,
        max: 5,
        ticks: {
          stepSize: 1,
          color: "#8b92a5",
          callback: (value) => {
            const v = Number(value);
            if (!Number.isInteger(v) || v < 1 || v > 5) return "";
            return QUALITY_LABELS[v as 1 | 2 | 3 | 4 | 5];
          },
        },
        grid: { color: "rgba(139, 146, 165, 0.10)" },
      },
    },
  };

  if (records.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-sm text-[#8b92a5]"
        style={{ height }}
      >
        データがありません
      </div>
    );
  }

  return (
    <div className="overflow-hidden" style={{ height }}>
      <Scatter
        data={data}
        options={options}
        aria-label="気圧と睡眠品質の散布図と回帰直線"
        role="img"
      />
    </div>
  );
}
