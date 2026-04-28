"use client";

/**
 * WeatherWidget v5 — P0ブラッシュアップ版
 *
 * レイアウト順:
 * 1. 今日の天気（テーブル形式）
 * 2. 週間天気予報（テーブル形式）
 * 3. 今夜の睡眠スコア（WSIスコアカード改善版）
 * 4. カウントダウン帯（ポジティブ表現）
 * 5. 気圧グラフ（Chart.js canvas、色変化付き）
 * 6. 明日の目覚め予報カード
 * 7. 睡眠×気圧 相関グラフ
 * 8. ケアヒント（1つに絞る）
 */

import * as React from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { fetchFullWeather } from "@/lib/weather";
import {
  computeWSI,
  getCareHints,
  computeWSIScore100,
  getPressureZone,
  PRESSURE_ZONE_CONFIG,
} from "@/lib/wsi";
import { DEFAULT_PREFECTURE_KEY, getRecords } from "@/lib/storage";
import { getPrefectureByCode } from "@/lib/prefectures";
import type {
  FullWeatherData,
  DailyForecast,
  HourlyWeatherData,
} from "@/lib/types";
import type { WSIScore } from "@/lib/wsi";

// ChartJS 登録
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// ─────────────────────────────────────────────────────────────────────────────
// ヘルパ
// ─────────────────────────────────────────────────────────────────────────────

function isToday(dateStr: string): boolean {
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  return dateStr === today;
}

function precipColor(prob: number): string {
  if (prob >= 70) return "#60a5fa";
  if (prob >= 40) return "#93c5fd";
  return "#8b92a5";
}

function weatherCodeToDisplay(
  code?: number,
  hour?: number
): { emoji: string; label: string } {
  if (code === undefined) return { emoji: "🌡", label: "不明" };
  const isNight = hour !== undefined && (hour >= 22 || hour <= 4);
  if (code === 0) return isNight ? { emoji: "🌕", label: "快晴" } : { emoji: "☀️", label: "快晴" };
  if (code === 1) return isNight ? { emoji: "🌙", label: "晴れ" } : { emoji: "🌤", label: "晴れ" };
  if (code === 2) return { emoji: "⛅", label: "曇り時々晴" };
  if (code === 3) return { emoji: "☁️", label: "曇り" };
  if (code === 45 || code === 48) return { emoji: "🌫", label: "霧" };
  if (code >= 51 && code <= 55) return { emoji: "🌦", label: "小雨" };
  if (code >= 61 && code <= 65) return { emoji: "🌧", label: "雨" };
  if (code >= 71 && code <= 77) return { emoji: "❄️", label: "雪" };
  if (code >= 80 && code <= 82) return { emoji: "🌦", label: "にわか雨" };
  if (code >= 85 && code <= 86) return { emoji: "🌨", label: "にわか雪" };
  if (code === 95) return { emoji: "⛈", label: "雷雨" };
  if (code >= 96) return { emoji: "⛈", label: "激しい雷雨" };
  return { emoji: "🌡", label: "不明" };
}

function pressureArrow(delta: number): { arrow: string; color: string } {
  if (isNaN(delta)) return { arrow: "—", color: "#8b92a5" };
  if (delta <= -3) return { arrow: "↙", color: "#f87171" };
  if (delta <= -1) return { arrow: "↘", color: "#fb923c" };
  if (delta >= 3)  return { arrow: "↑", color: "#4ade80" };
  if (delta >= 1)  return { arrow: "↗", color: "#60a5fa" };
  return                  { arrow: "→", color: "#8b92a5" };
}

// ─────────────────────────────────────────────────────────────────────────────
// WSIスコア 5段階ランク（新定義）
// ─────────────────────────────────────────────────────────────────────────────

function getWSIBadge(score100: number): { badge: string; color: string } {
  if (score100 >= 80) return { badge: "とても良い夜", color: "#10b981" };
  if (score100 >= 65) return { badge: "良い夜",       color: "#4a90d9" };
  if (score100 >= 45) return { badge: "普通の夜",     color: "#8b98a5" };
  if (score100 >= 25) return { badge: "注意の夜",     color: "#f59e0b" };
  return                     { badge: "難しい夜",     color: "#f87070" };
}

// ─────────────────────────────────────────────────────────────────────────────
// ① 今日の天気（テーブル形式）
// ─────────────────────────────────────────────────────────────────────────────

const ROW_H    = 32;
const HEADER_H = 36;

const TODAY_LABEL_ROWS: { label: string; h: number }[] = [
  { label: "時刻",   h: HEADER_H },
  { label: "天気",   h: ROW_H    },
  { label: "気温",   h: ROW_H    },
  { label: "降水確率", h: ROW_H  },
  { label: "降水量", h: ROW_H    },
  { label: "湿度",   h: ROW_H    },
  { label: "気圧",   h: HEADER_H },
];

function TodayWeatherSection({ hourlyWeather }: { hourlyWeather: HourlyWeatherData }) {
  const nowMs = Date.now();
  let currentIdx = 0;
  let minDiff = Infinity;
  for (let i = 0; i < hourlyWeather.times.length; i++) {
    const diff = Math.abs(Date.parse(hourlyWeather.times[i]) - nowMs);
    if (diff < minDiff) { minDiff = diff; currentIdx = i; }
  }

  const hourlyDeltas = hourlyWeather.pressures.map((p, i) =>
    i === 0 ? NaN : Math.round(p - hourlyWeather.pressures[i - 1])
  );

  return (
    <div className="px-4 pb-3">
      <div className="flex">
        <div style={{ flexShrink: 0, width: "56px" }}>
          {TODAY_LABEL_ROWS.map(({ label, h }) => (
            <div key={label} style={{ height: `${h}px`, display: "flex", alignItems: "center", fontSize: "10px", color: "#8b92a5", fontWeight: label === "時刻" ? 600 : 400 }}>
              {label}
            </div>
          ))}
        </div>
        <div style={{ flex: 1, overflowX: "auto" }}>
          <div style={{ display: "flex", minWidth: "max-content" }}>
            {hourlyWeather.times.map((time, i) => {
              const hour = new Date(time).getHours();
              const w = weatherCodeToDisplay(hourlyWeather.weatherCodes[i], hour);
              const isCurrent = i === currentIdx;
              const pa = pressureArrow(hourlyDeltas[i]);
              const hourLabel = hour === 0 ? "翌0時" : `${hour}時`;
              return (
                <div key={time} style={{ flexShrink: 0, width: "54px", display: "flex", flexDirection: "column", borderLeft: isCurrent ? "1px solid rgba(167,139,250,0.30)" : "1px solid rgba(255,255,255,0.04)", background: isCurrent ? "rgba(167,139,250,0.08)" : "transparent" }}>
                  <div style={{ height: `${HEADER_H}px`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: 600, color: isCurrent ? "#a78bfa" : "#8b92a5" }}>{hourLabel}</div>
                  <div style={{ height: `${ROW_H}px`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "17px" }}>{w.emoji}</div>
                  <div style={{ height: `${ROW_H}px`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 700, color: "#e6e8ee" }}>{Math.round(hourlyWeather.temps[i])}°</div>
                  <div style={{ height: `${ROW_H}px`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", color: precipColor(hourlyWeather.precipProbs[i]) }}>{hourlyWeather.precipProbs[i]}%</div>
                  <div style={{ height: `${ROW_H}px`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", color: "#8b92a5" }}>{hourlyWeather.precipMm[i].toFixed(1)}mm</div>
                  <div style={{ height: `${ROW_H}px`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", color: "#8b92a5" }}>{hourlyWeather.humidity[i]}%</div>
                  <div style={{ height: `${HEADER_H}px`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontSize: "10px", color: "#8b92a5", gap: "1px" }}>
                    <span>{Math.round(hourlyWeather.pressures[i])}</span>
                    <span style={{ fontSize: "11px", color: pa.color }}>{pa.arrow}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ② 週間天気予報（テーブル形式）
// ─────────────────────────────────────────────────────────────────────────────

const WEEKLY_ROW_H = 36;
const WEEKLY_LABEL_ROWS = ["日付", "天気", "最高", "最低", "降水確率", "気圧帯"];

function DailyForecastSection({ forecast }: { forecast: DailyForecast[] }) {
  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
  return (
    <div style={{ display: "flex" }}>
      <div style={{ flexShrink: 0, width: "56px" }}>
        {WEEKLY_LABEL_ROWS.map((label) => (
          <div key={label} style={{ height: `${WEEKLY_ROW_H}px`, display: "flex", alignItems: "center", fontSize: "10px", color: "#8b92a5", fontWeight: label === "日付" ? 600 : 400 }}>
            {label}
          </div>
        ))}
      </div>
      <div style={{ flex: 1, minWidth: 0, display: "grid", gridTemplateColumns: `repeat(${forecast.length}, 1fr)` }}>
        {forecast.map((day) => {
          const isCurrentDay = isToday(day.date);
          const weather = weatherCodeToDisplay(day.weatherCode);
          const pressureAvg = Math.round((day.pressureMin + day.pressureMax) / 2);
          const zone = getPressureZone(pressureAvg);
          const zoneConfig = PRESSURE_ZONE_CONFIG[zone];
          const d = new Date(`${day.date}T00:00:00+09:00`);
          const dayLabel = isCurrentDay ? "今日" : `${d.getMonth() + 1}/${d.getDate()}`;
          const weekLabel = weekdays[d.getDay()];
          return (
            <div key={day.date} style={{ display: "flex", flexDirection: "column", borderLeft: isCurrentDay ? "1px solid rgba(29,155,240,0.25)" : "1px solid rgba(255,255,255,0.04)", background: isCurrentDay ? "rgba(29,155,240,0.07)" : "transparent" }}>
              <div style={{ height: `${WEEKLY_ROW_H}px`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: "10px", fontWeight: 700, color: isCurrentDay ? "#1d9bf0" : "#8b92a5" }}>{dayLabel}</span>
                <span style={{ fontSize: "9px", color: "#8b92a5" }}>{weekLabel}</span>
              </div>
              <div style={{ height: `${WEEKLY_ROW_H}px`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px" }}>{weather.emoji}</div>
              <div style={{ height: `${WEEKLY_ROW_H}px`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 700, color: "#fb923c" }}>{Math.round(day.tempMax)}°</div>
              <div style={{ height: `${WEEKLY_ROW_H}px`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", color: "#93c5fd" }}>{Math.round(day.tempMin)}°</div>
              <div style={{ height: `${WEEKLY_ROW_H}px`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", color: precipColor(day.precipProbability) }}>{day.precipProbability}%</div>
              <div style={{ height: `${WEEKLY_ROW_H}px`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: "9px", fontWeight: 700, padding: "2px 5px", borderRadius: "9999px", background: zoneConfig.bg, color: zoneConfig.color, whiteSpace: "nowrap" }}>{zoneConfig.label}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ③ 今夜の睡眠スコア（改善版: バッジ主役）
// ─────────────────────────────────────────────────────────────────────────────

function SleepScoreHero({ score100, wsiScore }: { score100: number; wsiScore: WSIScore }) {
  const { badge, color } = getWSIBadge(score100);
  const [expanded, setExpanded] = React.useState(false);

  return (
    <div
      className="rounded-2xl p-5 cursor-pointer"
      style={{ background: `${color}12`, border: `1px solid ${color}35` }}
      onClick={() => setExpanded(!expanded)}
    >
      <p className="text-xs font-semibold text-[#8b92a5] mb-3">🌙 今夜の睡眠スコア</p>

      {/* バッジ（主役）*/}
      <div className="flex items-center gap-3 mb-2">
        <span
          className="text-2xl font-black leading-none"
          style={{ color }}
        >
          {badge}
        </span>
        <span
          className="text-sm font-semibold tabular-nums"
          style={{ color: `${color}cc` }}
        >
          {score100}
          <span className="text-xs font-normal text-[#8b92a5]"> / 100</span>
        </span>
      </div>

      {/* タップで内訳 */}
      <p className="text-xs text-[#8b92a5]">
        タップで内訳を見る {expanded ? "∧" : "∨"}
      </p>

      {/* 展開: 内訳 */}
      {expanded && (
        <div className="mt-3 pt-3 border-t border-white/10">
          <p className="text-xs leading-relaxed text-[#b0b8cc]">{wsiScore.reason}</p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <div className="rounded-lg bg-black/20 p-2 text-center">
              <p className="text-[9px] text-[#8b92a5]">気圧変化</p>
              <p className="text-sm font-bold text-[#e6e8ee] tabular-nums">
                {wsiScore.pressureDelta6h >= 0 ? "+" : ""}{wsiScore.pressureDelta6h.toFixed(1)}
                <span className="text-[9px] font-normal text-[#8b92a5]">hPa</span>
              </p>
            </div>
            <div className="rounded-lg bg-black/20 p-2 text-center">
              <p className="text-[9px] text-[#8b92a5]">寒暖差</p>
              <p className="text-sm font-bold text-[#e6e8ee] tabular-nums">
                {wsiScore.tempDelta.toFixed(0)}
                <span className="text-[9px] font-normal text-[#8b92a5]">°C</span>
              </p>
            </div>
            <div className="rounded-lg bg-black/20 p-2 text-center">
              <p className="text-[9px] text-[#8b92a5]">湿度</p>
              <p className="text-sm font-bold text-[#e6e8ee] tabular-nums">
                {wsiScore.humidity}
                <span className="text-[9px] font-normal text-[#8b92a5]">%</span>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ④ カウントダウン帯（ポジティブ表現）
// ─────────────────────────────────────────────────────────────────────────────

interface CountdownBandProps {
  hourlyPressureTimes: string[];
  hourlyPressureValues: number[];
}

function CountdownBand({ hourlyPressureTimes, hourlyPressureValues }: CountdownBandProps) {
  // 現在以降の気圧データで「急落」（-3hPa/h以下）が最初に起きる時刻を探す
  const nowMs = Date.now();

  let hoursUntilDrop: number | null = null;
  let nowIdx = 0;
  let minDiff = Infinity;
  for (let i = 0; i < hourlyPressureTimes.length; i++) {
    const tMs = Date.parse(hourlyPressureTimes[i] + (hourlyPressureTimes[i].includes("+") ? "" : "+09:00"));
    const diff = Math.abs(tMs - nowMs);
    if (diff < minDiff) { minDiff = diff; nowIdx = i; }
  }

  for (let i = nowIdx + 1; i < hourlyPressureValues.length; i++) {
    const delta = hourlyPressureValues[i] - hourlyPressureValues[i - 1];
    if (delta <= -3) {
      hoursUntilDrop = i - nowIdx;
      break;
    }
  }

  const isStable = hoursUntilDrop === null;

  return (
    <div
      className="mx-5 mb-4 rounded-xl px-4 py-3"
      style={{
        background: isStable ? "rgba(16,185,129,0.12)" : "rgba(245,158,11,0.10)",
        border: `1px solid ${isStable ? "rgba(16,185,129,0.30)" : "rgba(245,158,11,0.30)"}`,
      }}
    >
      {isStable ? (
        <p className="text-sm font-semibold" style={{ color: "#10b981" }}>
          今夜は気圧安定です
        </p>
      ) : (
        <p className="text-sm font-semibold" style={{ color: "#f59e0b" }}>
          あと{hoursUntilDrop}時間は安定です &nbsp;⟶&nbsp; その後低下予測
        </p>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ⑤ 気圧グラフ（Chart.js版、今夜18時〜翌7時）
// ─────────────────────────────────────────────────────────────────────────────

interface NightPressureChartProps {
  hourlyPressureTimes: string[];
  hourlyPressureValues: number[];
}

// hPa/h変化に応じた色判定
function getSegmentColor(delta: number): { color: string; width: number } {
  if (delta <= -3) return { color: "#f87070", width: 4 };
  if (delta <= -2) return { color: "#f59e0b", width: 3 };
  return { color: "#378ADD", width: 2 };
}

function NightPressureChart({ hourlyPressureTimes, hourlyPressureValues }: NightPressureChartProps) {
  const chartRef = React.useRef<ChartJS<"line"> | null>(null);

  // 今夜18時〜翌朝7時（13ポイント）を抽出
  const now = new Date();
  const nowMs = now.getTime();

  // 今夜の18時 JST を計算
  const jstNow = new Date(nowMs + 9 * 3600 * 1000);
  const jstYear = jstNow.getUTCFullYear();
  const jstMonth = jstNow.getUTCMonth();
  const jstDate = jstNow.getUTCDate();

  // 対象時間帯のデータを抽出
  const targetPoints: { label: string; value: number; isNow: boolean; delta: number }[] = [];

  // 18時から7時まで1時間ごとに探す
  const targetHours: number[] = [];
  for (let h = 18; h <= 31; h++) {
    targetHours.push(h); // 18-23が今夜、24-31が翌0-7時
  }

  for (const h of targetHours) {
    const jstHour = h % 24;
    // JST→UTC変換: JST18〜23時 → UTC9〜14時(同日), JST翌0〜7時 → UTC15〜22時(同日)
    // いずれも jstDate の UTC 時刻に収まるため dOffset は常に 0
    const utcHour = jstHour - 9 + (jstHour < 9 ? 24 : 0);
    const correctedUtcMs = Date.UTC(jstYear, jstMonth, jstDate, utcHour, 0, 0);

    // 対応するhourlyデータを探す（±30分以内）
    let bestIdx = -1;
    let bestDiff = Infinity;
    for (let i = 0; i < hourlyPressureTimes.length; i++) {
      const timeStr = hourlyPressureTimes[i];
      const tMs = timeStr.includes("+") || timeStr.includes("Z")
        ? Date.parse(timeStr)
        : Date.parse(timeStr + "+09:00");
      const diff = Math.abs(tMs - correctedUtcMs);
      if (diff < bestDiff && diff <= 1800000) {
        bestDiff = diff;
        bestIdx = i;
      }
    }

    const labelH = h % 24;
    const label = h >= 24 ? `翌${labelH}時` : `${labelH}時`;
    const isNow = Math.abs(correctedUtcMs - nowMs) < 1800000;

    if (bestIdx >= 0) {
      const value = hourlyPressureValues[bestIdx];
      // 前のtargetPoint（1時間前）との差分でhPa/hを計算
      const delta = targetPoints.length > 0
        ? value - targetPoints[targetPoints.length - 1].value
        : 0;
      targetPoints.push({ label, value, isNow, delta });
    } else {
      // データがなければ前の値を補完
      const prevValue = targetPoints.length > 0 ? targetPoints[targetPoints.length - 1].value : 1013;
      targetPoints.push({ label, value: prevValue, isNow, delta: 0 });
    }
  }

  if (targetPoints.length < 2) {
    return (
      <div className="flex h-32 items-center justify-center text-sm text-[#8b92a5]">
        データ取得中…
      </div>
    );
  }

  const labels = targetPoints.map((p) => p.label);
  const values = targetPoints.map((p) => p.value);

  // 現在時刻インデックス
  const nowPointIdx = targetPoints.findIndex((p) => p.isNow);
  const currentIdx = nowPointIdx; // -1 のときはバンドを描画しない

  // セグメントごとの色情報
  const pointColors = targetPoints.map((p, i) => {
    if (i === 0) return "#378ADD";
    const { color } = getSegmentColor(p.delta);
    return color;
  });

  // Chart.jsの縦バンドプラグイン（現在時刻ハイライト）
  const currentBandPlugin = {
    id: "currentBand",
    beforeDraw: (chart: ChartJS) => {
      if (currentIdx < 0) return;
      const ctx = chart.ctx;
      const xAxis = chart.scales["x"];
      const yAxis = chart.scales["y"];
      if (!xAxis || !yAxis) return;

      const x = xAxis.getPixelForValue(currentIdx);
      const barWidth = xAxis.width / (labels.length - 1);

      ctx.save();
      ctx.fillStyle = "rgba(29,155,240,0.07)";
      ctx.fillRect(
        x - barWidth / 2,
        yAxis.top,
        barWidth,
        yAxis.height
      );
      ctx.restore();
    },
  };

  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const spread = maxVal - minVal || 4;

  const chartData = {
    labels,
    datasets: [
      {
        label: "気圧 (hPa)",
        data: values,
        borderColor: pointColors,
        borderWidth: 2,
        pointBackgroundColor: pointColors,
        pointRadius: 3,
        pointHoverRadius: 5,
        tension: 0.3,
        fill: false,
        segment: {
          borderColor: (ctx: { p0DataIndex: number }) => {
            const i = ctx.p0DataIndex + 1;
            if (i >= targetPoints.length) return "#378ADD";
            const { color } = getSegmentColor(targetPoints[i].delta);
            return color;
          },
          borderWidth: (ctx: { p0DataIndex: number }) => {
            const i = ctx.p0DataIndex + 1;
            if (i >= targetPoints.length) return 2;
            const { width } = getSegmentColor(targetPoints[i].delta);
            return width;
          },
        },
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context: { dataIndex: number; parsed: { y: number | null } }) => {
            const i = context.dataIndex;
            const val = context.parsed.y;
            if (val === null) return "";
            const delta = i > 0 ? targetPoints[i].delta : 0;
            return `${val.toFixed(1)} hPa (${delta >= 0 ? "+" : ""}${delta.toFixed(1)} hPa/h)`;
          },
        },
        backgroundColor: "#1e2433",
        titleColor: "#e6e8ee",
        bodyColor: "#b0b8cc",
        borderColor: "rgba(255,255,255,0.1)",
        borderWidth: 1,
      },
    },
    scales: {
      x: {
        ticks: {
          color: "#8b92a5",
          font: { size: 9 },
          maxRotation: 0,
          autoSkip: false,
          callback: (_: unknown, index: number) => {
            return targetPoints[index]?.label ?? "";
          },
        },
        grid: { color: "#1e2433" },
      },
      y: {
        position: "right" as const,
        min: Math.floor(minVal - spread * 0.2),
        max: Math.ceil(maxVal + spread * 0.2),
        ticks: {
          color: "#8b92a5",
          font: { size: 10 },
          callback: (val: number | string) => `${val}`,
        },
        grid: { color: "#1e2433" },
      },
    },
  };

  return (
    <div>
      {/* 凡例 */}
      <div className="mb-2 flex gap-4">
        <div className="flex items-center gap-1.5">
          <div className="h-0.5 w-5 rounded" style={{ background: "#378ADD" }} />
          <span className="text-[10px] text-[#8b92a5]">安定</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-0.5 w-5 rounded" style={{ background: "#f59e0b" }} />
          <span className="text-[10px] text-[#8b92a5]">やや変化</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-0.5 w-5 rounded" style={{ background: "#f87070" }} />
          <span className="text-[10px] text-[#8b92a5]">急落</span>
        </div>
      </div>

      {/* グラフ */}
      <div style={{ height: "160px", position: "relative" }}>
        <Line
          ref={chartRef}
          data={chartData}
          options={chartOptions}
          plugins={[currentBandPlugin]}
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ⑥ 明日の目覚め予報カード
// ─────────────────────────────────────────────────────────────────────────────

interface WakeupForecastProps {
  hourlyPressureTimes: string[];
  hourlyPressureValues: number[];
  currentPressureDelta: number;
  humidity: number;
  tempDelta: number;
  apparentTempC: number | undefined;
}

function getWakeupLevel(score100: number): { name: string; color: string; level: number } {
  if (score100 >= 80) return { name: "スッキリ",   color: "#10b981", level: 5 };
  if (score100 >= 65) return { name: "おだやか",   color: "#4a90d9", level: 4 };
  if (score100 >= 45) return { name: "ふつう",     color: "#8b98a5", level: 3 };
  if (score100 >= 25) return { name: "うとうと",   color: "#f59e0b", level: 2 };
  return                     { name: "どんより",   color: "#8b98a5", level: 1 };
}

function WakeupForecastCard({ hourlyPressureTimes, hourlyPressureValues, currentPressureDelta, humidity, tempDelta, apparentTempC }: WakeupForecastProps) {
  // 翌朝6-8時のデータを探して気圧デルタを計算
  const now = new Date();
  const nowMs = now.getTime();
  const jstNow = new Date(nowMs + 9 * 3600 * 1000);
  const jstYear = jstNow.getUTCFullYear();
  const jstMonth = jstNow.getUTCMonth();
  const jstDate = jstNow.getUTCDate();

  const tomorrow7JstMs = Date.UTC(jstYear, jstMonth, jstDate + 1, 7, 0, 0) - 9 * 3600 * 1000;

  // 翌朝6〜8時の平均気圧を取得
  const morningPressures: number[] = [];
  for (let i = 0; i < hourlyPressureTimes.length; i++) {
    const timeStr = hourlyPressureTimes[i];
    const tMs = timeStr.includes("+") || timeStr.includes("Z")
      ? Date.parse(timeStr)
      : Date.parse(timeStr + "+09:00");
    // 翌朝 6〜8時 JST (UTC では 21〜23時)
    const diffFromMorning = tMs - tomorrow7JstMs;
    if (Math.abs(diffFromMorning) <= 3600 * 1000) {
      morningPressures.push(hourlyPressureValues[i]);
    }
  }

  // 翌朝の気圧を現在気圧との差分で計算
  let morningDelta = currentPressureDelta;
  if (morningPressures.length > 0 && hourlyPressureValues.length > 0) {
    const morningAvg = morningPressures.reduce((a, b) => a + b, 0) / morningPressures.length;
    const currentPressure = hourlyPressureValues[0] || 1013;
    morningDelta = Math.round((morningAvg - currentPressure) * 10) / 10;
  }

  // 翌朝のWSIスコアを算出
  const morningScore = computeWSIScore100(morningDelta, tempDelta, humidity, apparentTempC);
  const { name, color } = getWakeupLevel(morningScore);

  return (
    <div
      className="rounded-2xl p-5"
      style={{
        background: `${color}10`,
        border: `1px solid ${color}30`,
      }}
    >
      <p className="text-xs font-semibold text-[#8b92a5] mb-3">☀️ 明日の目覚め予報</p>

      <span
        className="text-2xl font-black"
        style={{ color }}
      >
        {name}
      </span>
      <p className="mt-1 text-xs text-[#8b92a5]">
        翌朝の気圧から算出
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ⑦ 睡眠×気圧 相関グラフ
// ─────────────────────────────────────────────────────────────────────────────

const SAMPLE_CORRELATION_DATA = [
  { pressure: 1020, quality: 5 },
  { pressure: 1018, quality: 5 },
  { pressure: 1015, quality: 4 },
  { pressure: 1014, quality: 4 },
  { pressure: 1012, quality: 4 },
  { pressure: 1010, quality: 3 },
  { pressure: 1008, quality: 3 },
  { pressure: 1005, quality: 3 },
  { pressure: 1003, quality: 2 },
  { pressure: 1000, quality: 2 },
  { pressure: 997, quality: 2 },
  { pressure: 995, quality: 1 },
];

const QUALITY_COLORS: Record<number, string> = {
  5: "#4ade80",
  4: "#86efac",
  3: "#facc15",
  2: "#fb923c",
  1: "#f87171",
};

function CorrelationChart() {
  const [points, setPoints] = React.useState<{ pressure: number; quality: number }[]>([]);
  const [isSample, setIsSample] = React.useState(false);

  React.useEffect(() => {
    const records = getRecords();
    const validPoints = records
      .filter((r) => r.weather?.pressureHpa != null && r.quality != null)
      .map((r) => ({ pressure: r.weather.pressureHpa, quality: r.quality as number }));
    if (validPoints.length >= 5) {
      setPoints(validPoints.slice(-60));
      setIsSample(false);
    } else {
      setPoints(SAMPLE_CORRELATION_DATA);
      setIsSample(true);
    }
  }, []);

  if (points.length === 0) return null;

  const W = 600;
  const H = 165;
  const PAD = { top: 16, right: 20, bottom: 36, left: 42 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const pressures = points.map((p) => p.pressure);
  const pMin = Math.min(...pressures, 990);
  const pMax = Math.max(...pressures, 1025);
  const pRange = pMax - pMin || 1;

  const toX = (p: number) => PAD.left + ((p - pMin) / pRange) * chartW;
  const toY = (q: number) => PAD.top + chartH - ((q - 1) / 4) * chartH;

  const n = points.length;
  const sumX = pressures.reduce((a, b) => a + b, 0);
  const sumY = points.reduce((s, p) => s + p.quality, 0);
  const sumXY = points.reduce((s, p) => s + p.pressure * p.quality, 0);
  const sumX2 = pressures.reduce((s, p) => s + p * p, 0);
  const denom = n * sumX2 - sumX * sumX;
  const slope = denom !== 0 ? (n * sumXY - sumX * sumY) / denom : 0;
  const intercept = (sumY - slope * sumX) / n;
  const clamp = (v: number) => Math.max(PAD.top, Math.min(PAD.top + chartH, toY(v)));

  return (
    <div>
      {isSample && (
        <div className="mb-3 rounded-xl border border-[#facc15]/20 bg-[#facc15]/5 px-3 py-2 text-xs text-[#facc15]">
          サンプル表示中 — 睡眠記録が 5 件以上貯まると実データに切り替わります
        </div>
      )}
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" aria-label="睡眠品質と気圧の相関グラフ">
        <rect x={PAD.left} y={PAD.top} width={Math.max(0, toX(1000) - PAD.left)} height={chartH} fill="rgba(248,113,113,0.06)" />
        <rect x={Math.max(PAD.left, toX(1000))} y={PAD.top} width={Math.max(0, Math.min(toX(1008), W - PAD.right) - Math.max(PAD.left, toX(1000)))} height={chartH} fill="rgba(251,146,60,0.06)" />
        <rect x={Math.max(PAD.left, toX(1008))} y={PAD.top} width={Math.max(0, Math.min(toX(1016), W - PAD.right) - Math.max(PAD.left, toX(1008)))} height={chartH} fill="rgba(250,204,21,0.05)" />
        <rect x={Math.max(PAD.left, toX(1016))} y={PAD.top} width={Math.max(0, W - PAD.right - Math.max(PAD.left, toX(1016)))} height={chartH} fill="rgba(74,222,128,0.05)" />
        {[1, 2, 3, 4, 5].map((q) => (
          <g key={q}>
            <line x1={PAD.left} y1={toY(q)} x2={W - PAD.right} y2={toY(q)} stroke="#1e2433" strokeWidth="1" />
            <text x={PAD.left - 4} y={toY(q) + 4} textAnchor="end" fill="#8b92a5" fontSize="10">{q}</text>
          </g>
        ))}
        {Math.abs(slope) > 0.00001 && (
          <line x1={PAD.left} y1={clamp(slope * pMin + intercept)} x2={W - PAD.right} y2={clamp(slope * pMax + intercept)} stroke="#7856ff" strokeWidth="1.5" strokeDasharray="5 3" opacity="0.65" />
        )}
        {points.map((p, i) => (
          <circle key={i} cx={toX(p.pressure)} cy={toY(p.quality)} r="5" fill={QUALITY_COLORS[p.quality] ?? "#8b92a5"} fillOpacity="0.85" stroke="#0f1117" strokeWidth="1.5" />
        ))}
        {[pMin, Math.round((pMin + pMax) / 2), pMax].map((p) => (
          <text key={p} x={toX(p)} y={H - 14} textAnchor="middle" fill="#8b92a5" fontSize="10">{Math.round(p)}</text>
        ))}
        <text x={W / 2} y={H - 2} textAnchor="middle" fill="#8b92a5" fontSize="9">気圧 (hPa)</text>
        <text x={11} y={PAD.top + chartH / 2} textAnchor="middle" fill="#8b92a5" fontSize="9" transform={`rotate(-90, 11, ${PAD.top + chartH / 2})`}>睡眠の質</text>
      </svg>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
        {([5, 4, 3, 2, 1] as const).map((q) => (
          <div key={q} className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: QUALITY_COLORS[q] }} />
            <span className="text-[10px] text-[#8b92a5]">
              {q === 5 ? "とても良い" : q === 4 ? "良い" : q === 3 ? "普通" : q === 2 ? "悪い" : "とても悪い"}
            </span>
          </div>
        ))}
        <div className="flex items-center gap-1">
          <div className="w-4 h-0.5" style={{ background: "#7856ff", borderTop: "1px dashed #7856ff" }} />
          <span className="text-[10px] text-[#8b92a5]">傾向線</span>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ⑧ ケアヒント（1つに絞る）
// ─────────────────────────────────────────────────────────────────────────────

function CareHintSingle({ hints }: { hints: string[] }) {
  if (hints.length === 0) return null;
  const topHint = hints[0];
  return (
    <div className="flex gap-2 text-xs leading-relaxed text-[#b0b8cc]">
      <span className="mt-0.5 shrink-0 text-[#1d9bf0]">💡</span>
      <span>{topHint}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// スケルトンUI
// ─────────────────────────────────────────────────────────────────────────────

function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div
      className={`rounded-xl ${className}`}
      style={{
        background: "linear-gradient(90deg, #1a1f2e 25%, #252b3b 50%, #1a1f2e 75%)",
        backgroundSize: "200% 100%",
        animation: "skeleton-shimmer 1.5s infinite",
      }}
    />
  );
}

function WeatherWidgetSkeleton() {
  return (
    <>
      <style>{`
        @keyframes skeleton-shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
      <div className="space-y-4 rounded-2xl border border-white/5 bg-[#1a1f2e] p-5">
        <SkeletonBlock className="h-4 w-28" />
        <SkeletonBlock className="h-64" />
        <SkeletonBlock className="h-48" />
        <SkeletonBlock className="h-28" />
        <SkeletonBlock className="h-36" />
        <SkeletonBlock className="h-40" />
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// メインコンポーネント
// ─────────────────────────────────────────────────────────────────────────────

export function WeatherWidget() {
  const [data, setData] = React.useState<FullWeatherData | null>(null);
  const [wsiScore, setWsiScore] = React.useState<WSIScore | null>(null);
  const [score100, setScore100] = React.useState<number>(0);
  const [careHints, setCareHints] = React.useState<string[]>([]);
  const [locationName, setLocationName] = React.useState<string>("東京");
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let isMounted = true;
    async function load() {
      try {
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

        const todayForecast = full.forecast[0];
        const tempDelta = todayForecast ? todayForecast.tempMax - todayForecast.tempMin : 8;

        const score = computeWSI(
          full.current.pressureDeltaHpa,
          tempDelta,
          full.current.humidity
        );
        const s100 = computeWSIScore100(
          full.current.pressureDeltaHpa,
          tempDelta,
          full.current.humidity,
          full.current.apparentTemperatureC
        );
        const hints = getCareHints(score);

        setData(full);
        setWsiScore(score);
        setScore100(s100);
        setCareHints(hints);
      } catch (err) {
        if (isMounted) {
          setError("データを取得できませんでした。リロードしてください");
          console.error("[WeatherWidget]", err);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    load();
    return () => { isMounted = false; };
  }, []);

  // ── ローディング ──
  if (loading) return <WeatherWidgetSkeleton />;

  // ── エラー ──
  if (error || !data || !wsiScore) {
    return (
      <div className="rounded-2xl border border-white/5 bg-[#1a1f2e] p-5">
        <p className="text-sm text-[#8b92a5]">
          {error ?? "データを取得できませんでした。リロードしてください"}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="mt-3 text-xs text-[#1d9bf0] underline"
        >
          リロードする
        </button>
      </div>
    );
  }

  const todayForecast = data.forecast[0];
  const tempDelta = todayForecast ? todayForecast.tempMax - todayForecast.tempMin : 8;
  const apparent = data.current.apparentTemperatureC ?? data.current.temperatureC;

  return (
    <section
      aria-labelledby="weather-widget-heading"
      className="rounded-2xl border border-white/5 bg-[#1a1f2e] overflow-hidden"
    >
      {/* ── ヘッダー ── */}
      <div className="flex items-center justify-between px-5 pt-5 pb-1">
        <h2 id="weather-widget-heading" className="text-sm font-bold text-[#e6e8ee]">
          🌤 天気 &amp; 睡眠予報
        </h2>
        <span className="text-xs text-[#8b92a5]">📍 {locationName}</span>
      </div>

      {/* ── ① 今日の天気 ── */}
      {data.hourlyWeather?.times?.length > 0 && (
        <>
          <div className="px-4 pt-3 pb-1">
            <p className="text-xs font-semibold text-[#8b92a5] tracking-wide uppercase">今日の天気</p>
          </div>
          <TodayWeatherSection hourlyWeather={data.hourlyWeather} />
        </>
      )}

      <div className="mx-4 border-t border-white/5" />

      {/* ── ② 週間天気予報 ── */}
      <div className="px-4 pt-3 pb-4">
        <p className="mb-2 text-xs font-semibold text-[#8b92a5] tracking-wide uppercase">週間天気予報</p>
        <DailyForecastSection forecast={data.forecast} />
      </div>

      <div className="mx-4 border-t border-white/5" />

      {/* ── ③ 今夜の睡眠スコア ── */}
      <div className="px-5 pt-5 pb-4">
        <SleepScoreHero score100={score100} wsiScore={wsiScore} />
      </div>

      {/* ── ④ カウントダウン帯 ── */}
      {data.hourlyPressure.values.length > 1 && (
        <CountdownBand
          hourlyPressureTimes={data.hourlyPressure.times}
          hourlyPressureValues={data.hourlyPressure.values}
        />
      )}

      <div className="mx-5 border-t border-white/5" />

      {/* ── ⑤ 気圧グラフ（今夜18時〜翌7時、Chart.js） ── */}
      {data.hourlyPressure.values.length > 1 && (
        <div className="px-5 pt-5 pb-4">
          <p className="mb-3 text-xs font-semibold text-[#8b92a5] tracking-wide uppercase">
            気圧推移（今夜〜翌朝）
          </p>
          <NightPressureChart
            hourlyPressureTimes={data.hourlyPressure.times}
            hourlyPressureValues={data.hourlyPressure.values}
          />
        </div>
      )}

      <div className="mx-5 border-t border-white/5" />

      {/* ── ⑥ 明日の目覚め予報カード ── */}
      <div className="px-5 pt-5 pb-4">
        <WakeupForecastCard
          hourlyPressureTimes={data.hourlyPressure.times}
          hourlyPressureValues={data.hourlyPressure.values}
          currentPressureDelta={data.current.pressureDeltaHpa}
          humidity={data.current.humidity}
          tempDelta={tempDelta}
          apparentTempC={apparent}
        />
      </div>

      <div className="mx-5 border-t border-white/5" />

      {/* ── ⑦ 睡眠×気圧 相関グラフ ── */}
      <div className="px-5 pt-5 pb-4">
        <p className="mb-3 text-xs font-semibold text-[#8b92a5] tracking-wide uppercase">睡眠 × 気圧 相関</p>
        <CorrelationChart />
      </div>

      {/* ── ⑧ ケアヒント（1つに絞る） ── */}
      {careHints.length > 0 && (
        <>
          <div className="mx-5 border-t border-white/5" />
          <div className="px-5 pt-5 pb-6">
            <p className="mb-3 text-xs font-semibold text-[#e6e8ee]">💡 今夜のケアヒント</p>
            <CareHintSingle hints={careHints} />
          </div>
        </>
      )}
    </section>
  );
}
