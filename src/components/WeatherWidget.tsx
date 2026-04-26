"use client";

/**
 * WeatherWidget — 現在の気象・WSIスコア・気圧グラフ・5日間天気予報を表示。
 *
 * iOSアプリの HomeScreen (WSIScoreCard / PressureChart / WeatherSummary /
 * CareHintCard) に相当する統合ウィジェット。
 *
 * - ユーザーの設定都道府県 (localStorage) を使って /api/weather?type=full を呼ぶ
 * - 都道府県未設定の場合は東京 (13) をデフォルトに使用
 * - 気圧グラフは SVG インライン描画 (Chart.js 不要)
 */

import * as React from "react";
import { fetchFullWeather } from "@/lib/weather";
import { computeWSI, getCareHints, wsiColor } from "@/lib/wsi";
import { DEFAULT_PREFECTURE_KEY } from "@/lib/storage";
import { getPrefectureByCode } from "@/lib/prefectures";
import type { FullWeatherData, DailyForecast } from "@/lib/types";
import type { WSIScore } from "@/lib/wsi";

// ────────────────────────────────────────────────────────────────────────────
// 小さなヘルパ
// ────────────────────────────────────────────────────────────────────────────

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    const h = d.getHours();
    return `${h}時`;
  } catch {
    return "";
  }
}

function formatDate(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00+09:00`);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
  const wd = weekdays[d.getDay()];
  return `${month}/${day}(${wd})`;
}

function isToday(dateStr: string): boolean {
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  return dateStr === today;
}

/** 気圧変化の方向をアイコン文字で返す */
function pressureTrendIcon(delta: number): string {
  if (delta <= -3) return "↘️";
  if (delta <= -1) return "↙";
  if (delta >= 3) return "↗️";
  if (delta >= 1) return "↑";
  return "→";
}

/** 降水確率に応じた色クラス */
function precipColor(prob: number): string {
  if (prob >= 70) return "text-blue-400";
  if (prob >= 40) return "text-blue-300";
  return "text-[#8b92a5]";
}

// ────────────────────────────────────────────────────────────────────────────
// SVG 気圧グラフ
// ────────────────────────────────────────────────────────────────────────────

interface PressureChartProps {
  times: string[];
  values: number[];
}

function PressureChart({ times, values }: PressureChartProps) {
  if (values.length < 2) {
    return (
      <div className="flex h-32 items-center justify-center text-sm text-[#8b92a5]">
        データ取得中…
      </div>
    );
  }

  const W = 600;
  const H = 120;
  const PAD = { top: 14, right: 16, bottom: 24, left: 48 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const minV = Math.min(...values);
  const maxV = Math.max(...values);
  const spread = maxV - minV || 2;
  const yMin = minV - spread * 0.15;
  const yMax = maxV + spread * 0.15;

  const toX = (i: number) => PAD.left + (i / (values.length - 1)) * chartW;
  const toY = (v: number) =>
    PAD.top + chartH - ((v - yMin) / (yMax - yMin)) * chartH;

  // path
  const pts = values.map((v, i) => `${toX(i).toFixed(1)},${toY(v).toFixed(1)}`);
  const linePath = `M ${pts.join(" L ")}`;

  // fill path (close to bottom)
  const fillPath = `M ${toX(0).toFixed(1)},${(PAD.top + chartH).toFixed(1)} L ${pts.join(" L ")} L ${toX(values.length - 1).toFixed(1)},${(PAD.top + chartH).toFixed(1)} Z`;

  // Y 軸ラベル: 3 段階
  const yTicks = [yMin, (yMin + yMax) / 2, yMax].map((v) => Math.round(v));

  // X 軸ラベル: 12時間ごと
  const xLabelIndices: number[] = [];
  for (let i = 0; i < times.length; i++) {
    try {
      const h = new Date(times[i]).getHours();
      if (h === 0 || h === 12) {
        xLabelIndices.push(i);
      }
    } catch {}
  }

  // 現在時刻のインデックス (最初のエントリが "1h 前" なので index=1 付近)
  const nowIdx = Math.min(1, values.length - 1);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      aria-label="72時間気圧推移グラフ"
    >
      <defs>
        <linearGradient id="pressGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1d9bf0" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#1d9bf0" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* グリッド線 */}
      {yTicks.map((tick) => (
        <line
          key={tick}
          x1={PAD.left}
          y1={toY(tick)}
          x2={W - PAD.right}
          y2={toY(tick)}
          stroke="#1e2433"
          strokeWidth="1"
        />
      ))}

      {/* X 軸ラベル目盛り */}
      {xLabelIndices.map((i) => (
        <g key={i}>
          <line
            x1={toX(i)}
            y1={PAD.top + chartH}
            x2={toX(i)}
            y2={PAD.top + chartH + 4}
            stroke="#1e2433"
            strokeWidth="1"
          />
          <text
            x={toX(i)}
            y={H - 4}
            textAnchor="middle"
            fill="#8b92a5"
            fontSize="10"
          >
            {formatTime(times[i])}
          </text>
        </g>
      ))}

      {/* Y 軸ラベル */}
      {yTicks.map((tick, ti) => (
        <text
          key={ti}
          x={PAD.left - 4}
          y={toY(tick) + 4}
          textAnchor="end"
          fill="#8b92a5"
          fontSize="10"
        >
          {tick}
        </text>
      ))}

      {/* fill */}
      <path d={fillPath} fill="url(#pressGrad)" />

      {/* line */}
      <path
        d={linePath}
        fill="none"
        stroke="#1d9bf0"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* 現在時刻のドット */}
      <circle
        cx={toX(nowIdx)}
        cy={toY(values[nowIdx])}
        r="4"
        fill="#1d9bf0"
      />
      <text
        x={toX(nowIdx)}
        y={toY(values[nowIdx]) - 8}
        textAnchor="middle"
        fill="#e6e8ee"
        fontSize="10"
        fontWeight="bold"
      >
        {values[nowIdx]}
      </text>
    </svg>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// 5 日間予報カード (横スクロール)
// ────────────────────────────────────────────────────────────────────────────

function DailyForecastRow({ forecast }: { forecast: DailyForecast[] }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {forecast.map((day) => {
        const isCurrentDay = isToday(day.date);
        return (
          <div
            key={day.date}
            className={`flex min-w-[80px] flex-col items-center gap-1 rounded-lg px-3 py-3 text-center ${
              isCurrentDay
                ? "border border-[#1d9bf0]/40 bg-[#1d9bf0]/10"
                : "border border-white/5 bg-[#12172a]"
            }`}
          >
            <span
              className={`text-xs font-medium ${isCurrentDay ? "text-[#1d9bf0]" : "text-[#8b92a5]"}`}
            >
              {isCurrentDay ? "今日" : formatDate(day.date)}
            </span>

            {/* 気温 */}
            <div className="flex flex-col">
              <span className="text-sm font-bold text-[#e6e8ee]">
                {day.tempMax}°
              </span>
              <span className="text-xs text-[#8b92a5]">{day.tempMin}°</span>
            </div>

            {/* 降水確率 */}
            <span className={`text-xs font-medium ${precipColor(day.precipProbability)}`}>
              {day.precipProbability}%
            </span>

            {/* 気圧トレンド */}
            <span
              className="text-sm"
              title={`気圧差: ${day.pressureDelta > 0 ? "+" : ""}${day.pressureDelta}hPa`}
            >
              {pressureTrendIcon(day.pressureDelta)}
            </span>

            {/* 平均気圧 */}
            <span className="text-[10px] text-[#8b92a5]">
              {Math.round((day.pressureMin + day.pressureMax) / 2)}
              <span className="text-[9px]">hPa</span>
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// WSI スコアカード
// ────────────────────────────────────────────────────────────────────────────

function WSIScoreCard({ score }: { score: WSIScore }) {
  const color = wsiColor(score.level);
  const bgAlpha = "20"; // 例: #4ade8020

  return (
    <div
      className="flex items-start gap-4 rounded-xl p-4"
      style={{
        background: `${color}${bgAlpha}`,
        borderLeft: `3px solid ${color}`,
      }}
    >
      {/* レベル数字 */}
      <div className="flex flex-col items-center gap-0.5 pt-0.5">
        <span
          className="text-4xl font-black leading-none tabular-nums"
          style={{ color }}
        >
          {score.level}
        </span>
        <span className="text-[10px] text-[#8b92a5]">/ 5</span>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-bold" style={{ color }}>
            {score.label}
          </span>
          <span className="text-xs text-[#8b92a5]">今夜の睡眠指数</span>
        </div>
        <p className="text-xs leading-relaxed text-[#b0b8cc]">{score.reason}</p>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// 現在気象サマリー (横並びバッジ)
// ────────────────────────────────────────────────────────────────────────────

function WeatherSummaryBadges({
  data,
}: {
  data: FullWeatherData["current"];
}) {
  const items = [
    {
      label: "気温",
      value: `${data.temperatureC}°C`,
    },
    {
      label: "気圧",
      value: `${data.pressureHpa} hPa`,
    },
    {
      label: "湿度",
      value: `${data.humidity}%`,
    },
    {
      label: "気圧変化",
      value: `${data.pressureDeltaHpa > 0 ? "+" : ""}${data.pressureDeltaHpa} hPa`,
    },
  ];

  return (
    <div className="grid grid-cols-4 gap-2">
      {items.map((item) => (
        <div
          key={item.label}
          className="flex flex-col items-center gap-0.5 rounded-lg border border-white/5 bg-[#12172a] py-2"
        >
          <span className="text-[10px] text-[#8b92a5]">{item.label}</span>
          <span className="text-xs font-bold text-[#e6e8ee]">{item.value}</span>
        </div>
      ))}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// ケアヒントリスト
// ────────────────────────────────────────────────────────────────────────────

function CareHintList({ hints }: { hints: string[] }) {
  if (hints.length === 0) return null;
  return (
    <ul className="space-y-2">
      {hints.map((hint, i) => (
        <li key={i} className="flex gap-2 text-xs leading-relaxed text-[#b0b8cc]">
          <span className="mt-0.5 text-[#1d9bf0] shrink-0">💡</span>
          <span>{hint}</span>
        </li>
      ))}
    </ul>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// メインコンポーネント
// ────────────────────────────────────────────────────────────────────────────

export function WeatherWidget() {
  const [data, setData] = React.useState<FullWeatherData | null>(null);
  const [wsiScore, setWsiScore] = React.useState<WSIScore | null>(null);
  const [careHints, setCareHints] = React.useState<string[]>([]);
  const [locationName, setLocationName] = React.useState<string>("東京");
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let isMounted = true;

    async function load() {
      try {
        // 都道府県コードを取得 (未設定なら東京=13)
        const code =
          typeof window !== "undefined"
            ? (window.localStorage.getItem(DEFAULT_PREFECTURE_KEY) ?? "13")
            : "13";

        const prefecture = getPrefectureByCode(code);
        const { latitude, longitude, name } = prefecture ?? {
          latitude: 35.6895,
          longitude: 139.6917,
          name: "東京都",
        };

        if (isMounted) setLocationName(name);

        const full = await fetchFullWeather(latitude, longitude);
        if (!isMounted) return;

        // WSI を計算
        // tempDelta: 今日の最高 - 最低 (forecast[0] があれば使う、なければ暫定)
        const todayForecast = full.forecast[0];
        const tempDelta = todayForecast
          ? todayForecast.tempMax - todayForecast.tempMin
          : 8; // フォールバック

        const score = computeWSI(
          full.current.pressureDeltaHpa,
          tempDelta,
          full.current.humidity
        );
        const hints = getCareHints(score);

        setData(full);
        setWsiScore(score);
        setCareHints(hints);
      } catch (err) {
        if (isMounted) {
          setError("気象データの取得に失敗しました");
          console.error("[WeatherWidget]", err);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    load();
    return () => {
      isMounted = false;
    };
  }, []);

  // ──── ローディング状態 ────
  if (loading) {
    return (
      <div className="animate-pulse space-y-3 rounded-xl border border-white/5 bg-[#1a1f2e] p-5">
        <div className="h-4 w-24 rounded bg-[#2a3045]" />
        <div className="h-14 rounded bg-[#2a3045]" />
        <div className="h-32 rounded bg-[#2a3045]" />
        <div className="flex gap-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-24 flex-1 rounded bg-[#2a3045]" />
          ))}
        </div>
      </div>
    );
  }

  // ──── エラー状態 ────
  if (error || !data || !wsiScore) {
    return (
      <div className="rounded-xl border border-white/5 bg-[#1a1f2e] p-5 text-sm text-[#8b92a5]">
        {error ?? "気象データを読み込めませんでした"}
      </div>
    );
  }

  return (
    <section
      aria-labelledby="weather-widget-heading"
      className="rounded-xl border border-white/5 bg-[#1a1f2e] p-5 space-y-5"
    >
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <h2
          id="weather-widget-heading"
          className="text-sm font-semibold text-[#e6e8ee]"
        >
          🌤 今夜の睡眠予報
        </h2>
        <span className="text-xs text-[#8b92a5]">{locationName}</span>
      </div>

      {/* WSI スコアカード */}
      <WSIScoreCard score={wsiScore} />

      {/* 現在気象サマリー */}
      <WeatherSummaryBadges data={data.current} />

      {/* 気圧グラフ */}
      {data.hourlyPressure.values.length > 1 && (
        <div>
          <p className="mb-2 text-xs text-[#8b92a5]">気圧推移（72時間）</p>
          <PressureChart
            times={data.hourlyPressure.times}
            values={data.hourlyPressure.values}
          />
        </div>
      )}

      {/* 5 日間予報 */}
      {data.forecast.length > 0 && (
        <div>
          <p className="mb-2 text-xs text-[#8b92a5]">
            天気予報（降水確率 / 気圧トレンド）
          </p>
          <DailyForecastRow forecast={data.forecast} />
        </div>
      )}

      {/* ケアヒント */}
      {careHints.length > 0 && (
        <div className="rounded-lg border border-white/5 bg-[#12172a] p-4">
          <p className="mb-3 text-xs font-semibold text-[#e6e8ee]">
            今夜のケアヒント
          </p>
          <CareHintList hints={careHints} />
        </div>
      )}
    </section>
  );
}
