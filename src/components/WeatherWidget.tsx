"use client";

/**
 * WeatherWidget v2 — 完全リデザイン
 *
 * レイアウト:
 * 1. 週間天気予報 (トップ・しっかり版)
 * 2. 今夜の睡眠スコア (ヒーロー, 0-100)
 * 3. 気象指標 3カード (気圧 / 体感気温 / 大気質)
 * 4. 気圧推移グラフ (カラーゾーン付き)
 * 5. 睡眠×気圧 相関グラフ
 * 6. ケアヒント
 */

import * as React from "react";
import { fetchFullWeather } from "@/lib/weather";
import {
  computeWSI,
  getCareHints,
  computeWSIScore100,
  getScore100Display,
  getPressureZone,
  PRESSURE_ZONE_CONFIG,
} from "@/lib/wsi";
import { DEFAULT_PREFECTURE_KEY, getRecords } from "@/lib/storage";
import { getPrefectureByCode } from "@/lib/prefectures";
import type { FullWeatherData, DailyForecast, AQIData } from "@/lib/types";
import type { WSIScore, PressureZone } from "@/lib/wsi";

// ─────────────────────────────────────────────────────────────────────────────
// ヘルパ
// ─────────────────────────────────────────────────────────────────────────────

function formatTime(iso: string): string {
  try {
    return `${new Date(iso).getHours()}時`;
  } catch {
    return "";
  }
}

function formatDate(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00+09:00`);
  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
  return `${d.getMonth() + 1}/${d.getDate()}(${weekdays[d.getDay()]})`;
}

function isToday(dateStr: string): boolean {
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  return dateStr === today;
}

function pressureTrendIcon(delta: number): string {
  if (delta <= -3) return "↘️";
  if (delta <= -1) return "↙";
  if (delta >= 3) return "↗️";
  if (delta >= 1) return "↑";
  return "→";
}

function precipColor(prob: number): string {
  if (prob >= 70) return "text-blue-400";
  if (prob >= 40) return "text-blue-300";
  return "text-[#8b92a5]";
}

function weatherCodeToDisplay(code?: number): { emoji: string; label: string } {
  if (code === undefined) return { emoji: "🌡", label: "不明" };
  if (code === 0) return { emoji: "☀️", label: "快晴" };
  if (code === 1) return { emoji: "🌤", label: "晴れ" };
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

// ─────────────────────────────────────────────────────────────────────────────
// ① 週間天気予報
// ─────────────────────────────────────────────────────────────────────────────

function DailyForecastSection({ forecast }: { forecast: DailyForecast[] }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 snap-x snap-mandatory -mx-1 px-1">
      {forecast.map((day) => {
        const isCurrentDay = isToday(day.date);
        const weather = weatherCodeToDisplay(day.weatherCode);
        const pressureAvg = Math.round((day.pressureMin + day.pressureMax) / 2);
        const zone = getPressureZone(pressureAvg);
        const zoneConfig = PRESSURE_ZONE_CONFIG[zone];

        return (
          <div
            key={day.date}
            className="flex-shrink-0 snap-start flex flex-col items-center gap-2 rounded-2xl px-4 py-4 text-center"
            style={{
              minWidth: "100px",
              background: isCurrentDay
                ? "rgba(29,155,240,0.12)"
                : "rgba(18,23,42,0.8)",
              border: isCurrentDay
                ? "1px solid rgba(29,155,240,0.45)"
                : "1px solid rgba(255,255,255,0.06)",
            }}
          >
            {/* 日付 */}
            <span
              className={`text-xs font-semibold ${
                isCurrentDay ? "text-[#1d9bf0]" : "text-[#8b92a5]"
              }`}
            >
              {isCurrentDay ? "今日" : formatDate(day.date)}
            </span>

            {/* 天気アイコン */}
            <span className="text-3xl leading-none">{weather.emoji}</span>
            <span className="text-[10px] text-[#8b92a5] -mt-1">{weather.label}</span>

            {/* 気温 */}
            <div className="flex items-baseline gap-1.5">
              <span className="text-base font-bold text-[#e6e8ee]">
                {day.tempMax}°
              </span>
              <span className="text-xs text-[#8b92a5]">{day.tempMin}°</span>
            </div>

            {/* 降水確率 */}
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-[10px] text-[#8b92a5]">💧 降水</span>
              <span
                className={`text-sm font-semibold ${precipColor(day.precipProbability)}`}
              >
                {day.precipProbability}%
              </span>
            </div>

            {/* 気圧ゾーンバッジ */}
            <div
              className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold"
              style={{ color: zoneConfig.color, background: zoneConfig.bg }}
            >
              {zoneConfig.label}
            </div>

            {/* 気圧数値 + トレンド */}
            <div className="flex items-center gap-0.5 text-[11px] text-[#8b92a5]">
              <span>{pressureAvg}</span>
              <span className="text-[9px]">hPa</span>
              <span className="ml-0.5">{pressureTrendIcon(day.pressureDelta)}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ② 今夜の睡眠スコア（ヒーロー）
// ─────────────────────────────────────────────────────────────────────────────

function SleepScoreHero({
  score100,
  wsiScore,
}: {
  score100: number;
  wsiScore: WSIScore;
}) {
  const { label, color } = getScore100Display(score100);
  const radius = 50;
  const circ = 2 * Math.PI * radius;
  const pct = score100 / 100;

  return (
    <div
      className="rounded-2xl p-5"
      style={{
        background: `${color}12`,
        border: `1px solid ${color}35`,
      }}
    >
      <p className="text-xs font-semibold text-[#8b92a5] mb-4">🌙 今夜の睡眠スコア</p>
      <div className="flex items-center gap-5">
        {/* 円形プログレス */}
        <div className="relative flex-shrink-0 w-28 h-28">
          <svg viewBox="0 0 120 120" className="w-full h-full">
            <circle
              cx="60" cy="60" r={radius}
              fill="none" stroke="#1e2433" strokeWidth="9"
            />
            <circle
              cx="60" cy="60" r={radius}
              fill="none"
              stroke={color}
              strokeWidth="9"
              strokeLinecap="round"
              strokeDasharray={circ}
              strokeDashoffset={circ * (1 - pct)}
              transform="rotate(-90 60 60)"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span
              className="text-3xl font-black tabular-nums leading-none"
              style={{ color }}
            >
              {score100}
            </span>
            <span className="text-[10px] text-[#8b92a5] mt-0.5">/ 100</span>
          </div>
        </div>

        {/* テキスト情報 */}
        <div className="flex-1 min-w-0">
          <div
            className="text-lg font-bold leading-tight mb-2"
            style={{ color }}
          >
            {label}
          </div>
          <p className="text-xs leading-relaxed text-[#b0b8cc]">
            {wsiScore.reason}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ③ 気象指標 3カード
// ─────────────────────────────────────────────────────────────────────────────

function PressureCard({ hPa, delta }: { hPa: number; delta: number }) {
  const zone = getPressureZone(hPa);
  const cfg = PRESSURE_ZONE_CONFIG[zone];

  return (
    <div
      className="flex flex-col gap-2 rounded-xl p-3"
      style={{
        background: "#12172a",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <span className="text-[10px] text-[#8b92a5]">🌡 気圧</span>
      <div className="flex items-baseline gap-0.5">
        <span className="text-lg font-black text-[#e6e8ee] tabular-nums">
          {hPa}
        </span>
        <span className="text-[10px] text-[#8b92a5]">hPa</span>
      </div>
      <div
        className="self-start rounded-full px-2 py-0.5 text-[10px] font-semibold"
        style={{ color: cfg.color, background: cfg.bg }}
      >
        {cfg.label}
      </div>
      <span
        className={`text-[11px] ${
          delta <= -2
            ? "text-orange-400"
            : delta >= 2
              ? "text-sky-400"
              : "text-[#8b92a5]"
        }`}
      >
        24h {delta > 0 ? "+" : ""}
        {delta}hPa
      </span>
    </div>
  );
}

function ApparentTempCard({
  apparent,
  actual,
}: {
  apparent: number;
  actual: number;
}) {
  const diff = Math.round((apparent - actual) * 10) / 10;
  let comfort = "快適";
  let color = "#4ade80";
  if (apparent >= 35) {
    comfort = "危険な暑さ";
    color = "#f87171";
  } else if (apparent >= 30) {
    comfort = "かなり暑い";
    color = "#fb923c";
  } else if (apparent >= 25) {
    comfort = "やや暑い";
    color = "#facc15";
  } else if (apparent >= 18) {
    comfort = "快適";
    color = "#4ade80";
  } else if (apparent >= 12) {
    comfort = "やや肌寒い";
    color = "#60a5fa";
  } else if (apparent >= 5) {
    comfort = "肌寒い";
    color = "#93c5fd";
  } else {
    comfort = "とても寒い";
    color = "#bfdbfe";
  }

  return (
    <div
      className="flex flex-col gap-2 rounded-xl p-3"
      style={{
        background: "#12172a",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <span className="text-[10px] text-[#8b92a5]">🌡 体感気温</span>
      <div className="flex items-baseline gap-0.5">
        <span className="text-lg font-black text-[#e6e8ee] tabular-nums">
          {apparent}
        </span>
        <span className="text-[10px] text-[#8b92a5]">°C</span>
      </div>
      <div
        className="self-start rounded-full px-2 py-0.5 text-[10px] font-semibold"
        style={{ color, background: `${color}20` }}
      >
        {comfort}
      </div>
      <span className="text-[11px] text-[#8b92a5]">
        気温比 {diff >= 0 ? "+" : ""}
        {diff}°
      </span>
    </div>
  );
}

function AQICard({ aqi }: { aqi?: AQIData }) {
  if (!aqi) {
    return (
      <div
        className="flex flex-col gap-2 rounded-xl p-3"
        style={{
          background: "#12172a",
          border: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <span className="text-[10px] text-[#8b92a5]">🍃 大気質</span>
        <span className="text-lg font-black text-[#8b92a5]">--</span>
        <span className="text-[10px] text-[#8b92a5]">取得中</span>
        <span className="text-[11px] text-[#8b92a5]">PM2.5 --</span>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col gap-2 rounded-xl p-3"
      style={{
        background: "#12172a",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <span className="text-[10px] text-[#8b92a5]">🍃 大気質</span>
      <div className="flex items-baseline gap-0.5">
        <span className="text-lg font-black text-[#e6e8ee] tabular-nums">
          {aqi.usAqi}
        </span>
        <span className="text-[9px] text-[#8b92a5]">AQI</span>
      </div>
      <div
        className="self-start rounded-full px-2 py-0.5 text-[10px] font-semibold"
        style={{ color: aqi.color, background: `${aqi.color}20` }}
      >
        {aqi.category}
      </div>
      <span className="text-[11px] text-[#8b92a5]">
        PM2.5 {aqi.pm25}μg
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ④ 気圧推移グラフ（カラーゾーン付き）
// ─────────────────────────────────────────────────────────────────────────────

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
  const H = 145;
  const PAD = { top: 16, right: 16, bottom: 28, left: 48 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const minV = Math.min(...values);
  const maxV = Math.max(...values);
  const spread = maxV - minV || 4;
  const yMin = Math.min(minV - spread * 0.2, 995);
  const yMax = Math.max(maxV + spread * 0.2, 1022);

  const toX = (i: number) =>
    PAD.left + (i / (values.length - 1)) * chartW;
  const toY = (v: number) =>
    PAD.top + chartH - ((v - yMin) / (yMax - yMin)) * chartH;

  const pts = values.map(
    (v, i) => `${toX(i).toFixed(1)},${toY(v).toFixed(1)}`
  );
  const linePath = `M ${pts.join(" L ")}`;
  const fillPath = `M ${toX(0).toFixed(1)},${(PAD.top + chartH).toFixed(1)} L ${pts.join(" L ")} L ${toX(values.length - 1).toFixed(1)},${(PAD.top + chartH).toFixed(1)} Z`;

  // ゾーン境界 (hPa)
  const ZONE_BOUNDS = [1000, 1008, 1016] as const;

  // X軸ラベル
  const xLabelIndices: number[] = [];
  for (let i = 0; i < times.length; i++) {
    try {
      const h = new Date(times[i]).getHours();
      if (h === 0 || h === 12) xLabelIndices.push(i);
    } catch {}
  }

  // Y軸ラベル
  const yTicks = [yMin, (yMin + yMax) / 2, yMax].map(Math.round);

  // 現在時刻インデックス
  const nowMs = Date.now();
  let nowIdx = 0;
  let minDiff = Infinity;
  for (let i = 0; i < times.length; i++) {
    const diff = Math.abs(Date.parse(times[i]) - nowMs);
    if (diff < minDiff) {
      minDiff = diff;
      nowIdx = i;
    }
  }
  nowIdx = Math.min(nowIdx, values.length - 1);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      aria-label="72時間気圧推移グラフ"
    >
      <defs>
        <linearGradient id="pressGrad2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1d9bf0" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#1d9bf0" stopOpacity="0" />
        </linearGradient>
        <clipPath id="chartClip2">
          <rect
            x={PAD.left}
            y={PAD.top}
            width={chartW}
            height={chartH}
          />
        </clipPath>
      </defs>

      {/* ゾーン背景帯 (下から: danger, warning, caution, safe) */}
      {/* danger: yMin 〜 1000 */}
      <rect
        x={PAD.left}
        y={Math.max(PAD.top, toY(1000))}
        width={chartW}
        height={Math.max(0, PAD.top + chartH - Math.max(PAD.top, toY(1000)))}
        fill={PRESSURE_ZONE_CONFIG.danger.bg}
        clipPath="url(#chartClip2)"
      />
      {/* warning: 1000〜1008 */}
      <rect
        x={PAD.left}
        y={Math.max(PAD.top, toY(1008))}
        width={chartW}
        height={Math.max(0, toY(1000) - toY(1008))}
        fill={PRESSURE_ZONE_CONFIG.warning.bg}
        clipPath="url(#chartClip2)"
      />
      {/* caution: 1008〜1016 */}
      <rect
        x={PAD.left}
        y={Math.max(PAD.top, toY(1016))}
        width={chartW}
        height={Math.max(0, toY(1008) - toY(1016))}
        fill={PRESSURE_ZONE_CONFIG.caution.bg}
        clipPath="url(#chartClip2)"
      />
      {/* safe: 1016〜yMax */}
      <rect
        x={PAD.left}
        y={PAD.top}
        width={chartW}
        height={Math.max(0, toY(1016) - PAD.top)}
        fill={PRESSURE_ZONE_CONFIG.safe.bg}
        clipPath="url(#chartClip2)"
      />

      {/* ゾーン境界線 */}
      {ZONE_BOUNDS.map((bound) => {
        const y = toY(bound);
        if (y <= PAD.top || y >= PAD.top + chartH) return null;
        const zone: PressureZone =
          bound === 1000 ? "danger" : bound === 1008 ? "warning" : "caution";
        return (
          <line
            key={bound}
            x1={PAD.left}
            y1={y}
            x2={W - PAD.right}
            y2={y}
            stroke={PRESSURE_ZONE_CONFIG[zone].color}
            strokeWidth="0.5"
            strokeDasharray="4 3"
            opacity="0.45"
          />
        );
      })}

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

      {/* X軸ラベル */}
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

      {/* Y軸ラベル */}
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
      <path d={fillPath} fill="url(#pressGrad2)" />

      {/* line */}
      <path
        d={linePath}
        fill="none"
        stroke="#1d9bf0"
        strokeWidth="2.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* 現在時刻縦線 */}
      <line
        x1={toX(nowIdx)}
        y1={PAD.top}
        x2={toX(nowIdx)}
        y2={PAD.top + chartH}
        stroke="#f59e0b"
        strokeWidth="1.5"
        strokeDasharray="4 3"
        opacity="0.85"
      />
      <text
        x={toX(nowIdx)}
        y={PAD.top - 3}
        textAnchor="middle"
        fill="#f59e0b"
        fontSize="9"
        fontWeight="bold"
      >
        現在
      </text>

      {/* 現在値ドット */}
      <circle
        cx={toX(nowIdx)}
        cy={toY(values[nowIdx])}
        r="5"
        fill="#1d9bf0"
        stroke="#0f1117"
        strokeWidth="2"
      />
      <text
        x={toX(nowIdx) + 8}
        y={toY(values[nowIdx]) - 6}
        textAnchor="start"
        fill="#e6e8ee"
        fontSize="11"
        fontWeight="bold"
      >
        {values[nowIdx]}
      </text>
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ⑤ 睡眠×気圧 相関グラフ
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
  const [points, setPoints] = React.useState<
    { pressure: number; quality: number }[]
  >([]);
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
  const toY = (q: number) =>
    PAD.top + chartH - ((q - 1) / 4) * chartH;

  // 簡易線形回帰
  const n = points.length;
  const sumX = pressures.reduce((a, b) => a + b, 0);
  const sumY = points.reduce((s, p) => s + p.quality, 0);
  const sumXY = points.reduce((s, p) => s + p.pressure * p.quality, 0);
  const sumX2 = pressures.reduce((s, p) => s + p * p, 0);
  const denom = n * sumX2 - sumX * sumX;
  const slope = denom !== 0 ? (n * sumXY - sumX * sumY) / denom : 0;
  const intercept = (sumY - slope * sumX) / n;
  const clamp = (v: number) =>
    Math.max(PAD.top, Math.min(PAD.top + chartH, toY(v)));

  return (
    <div>
      {isSample && (
        <div className="mb-3 rounded-xl border border-[#facc15]/20 bg-[#facc15]/5 px-3 py-2 text-xs text-[#facc15]">
          📊 サンプル表示中 — 睡眠記録が 5 件以上貯まると実データに切り替わります
        </div>
      )}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        aria-label="睡眠品質と気圧の相関グラフ"
      >
        {/* ゾーン背景 */}
        <rect
          x={PAD.left}
          y={PAD.top}
          width={Math.max(0, toX(1000) - PAD.left)}
          height={chartH}
          fill="rgba(248,113,113,0.06)"
        />
        <rect
          x={Math.max(PAD.left, toX(1000))}
          y={PAD.top}
          width={Math.max(
            0,
            Math.min(toX(1008), W - PAD.right) -
              Math.max(PAD.left, toX(1000))
          )}
          height={chartH}
          fill="rgba(251,146,60,0.06)"
        />
        <rect
          x={Math.max(PAD.left, toX(1008))}
          y={PAD.top}
          width={Math.max(
            0,
            Math.min(toX(1016), W - PAD.right) -
              Math.max(PAD.left, toX(1008))
          )}
          height={chartH}
          fill="rgba(250,204,21,0.05)"
        />
        <rect
          x={Math.max(PAD.left, toX(1016))}
          y={PAD.top}
          width={Math.max(0, W - PAD.right - Math.max(PAD.left, toX(1016)))}
          height={chartH}
          fill="rgba(74,222,128,0.05)"
        />

        {/* 品質グリッド */}
        {[1, 2, 3, 4, 5].map((q) => (
          <g key={q}>
            <line
              x1={PAD.left}
              y1={toY(q)}
              x2={W - PAD.right}
              y2={toY(q)}
              stroke="#1e2433"
              strokeWidth="1"
            />
            <text
              x={PAD.left - 4}
              y={toY(q) + 4}
              textAnchor="end"
              fill="#8b92a5"
              fontSize="10"
            >
              {q}
            </text>
          </g>
        ))}

        {/* 回帰直線 */}
        {Math.abs(slope) > 0.00001 && (
          <line
            x1={PAD.left}
            y1={clamp(slope * pMin + intercept)}
            x2={W - PAD.right}
            y2={clamp(slope * pMax + intercept)}
            stroke="#7856ff"
            strokeWidth="1.5"
            strokeDasharray="5 3"
            opacity="0.65"
          />
        )}

        {/* 散布ドット */}
        {points.map((p, i) => (
          <circle
            key={i}
            cx={toX(p.pressure)}
            cy={toY(p.quality)}
            r="5"
            fill={QUALITY_COLORS[p.quality] ?? "#8b92a5"}
            fillOpacity="0.85"
            stroke="#0f1117"
            strokeWidth="1.5"
          />
        ))}

        {/* X軸ラベル */}
        {[pMin, Math.round((pMin + pMax) / 2), pMax].map((p) => (
          <text
            key={p}
            x={toX(p)}
            y={H - 14}
            textAnchor="middle"
            fill="#8b92a5"
            fontSize="10"
          >
            {Math.round(p)}
          </text>
        ))}

        {/* 軸タイトル */}
        <text
          x={W / 2}
          y={H - 2}
          textAnchor="middle"
          fill="#8b92a5"
          fontSize="9"
        >
          気圧 (hPa)
        </text>
        <text
          x={11}
          y={PAD.top + chartH / 2}
          textAnchor="middle"
          fill="#8b92a5"
          fontSize="9"
          transform={`rotate(-90, 11, ${PAD.top + chartH / 2})`}
        >
          睡眠の質
        </text>
      </svg>

      {/* 凡例 */}
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
        {([5, 4, 3, 2, 1] as const).map((q) => (
          <div key={q} className="flex items-center gap-1">
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{ background: QUALITY_COLORS[q] }}
            />
            <span className="text-[10px] text-[#8b92a5]">
              {q === 5
                ? "とても良い"
                : q === 4
                  ? "良い"
                  : q === 3
                    ? "普通"
                    : q === 2
                      ? "悪い"
                      : "とても悪い"}
            </span>
          </div>
        ))}
        <div className="flex items-center gap-1">
          <div
            className="w-4 h-0.5"
            style={{ background: "#7856ff", borderTop: "1px dashed #7856ff" }}
          />
          <span className="text-[10px] text-[#8b92a5]">傾向線</span>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ケアヒント
// ─────────────────────────────────────────────────────────────────────────────

function CareHintList({ hints }: { hints: string[] }) {
  if (hints.length === 0) return null;
  return (
    <ul className="space-y-2">
      {hints.map((hint, i) => (
        <li
          key={i}
          className="flex gap-2 text-xs leading-relaxed text-[#b0b8cc]"
        >
          <span className="mt-0.5 shrink-0 text-[#1d9bf0]">💡</span>
          <span>{hint}</span>
        </li>
      ))}
    </ul>
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
        const tempDelta = todayForecast
          ? todayForecast.tempMax - todayForecast.tempMin
          : 8;

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

  // ── ローディング ──
  if (loading) {
    return (
      <div className="animate-pulse space-y-4 rounded-2xl border border-white/5 bg-[#1a1f2e] p-5">
        <div className="h-4 w-28 rounded bg-[#2a3045]" />
        <div className="flex gap-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-40 flex-1 rounded-2xl bg-[#2a3045]" />
          ))}
        </div>
        <div className="h-28 rounded-2xl bg-[#2a3045]" />
        <div className="grid grid-cols-3 gap-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-28 rounded-xl bg-[#2a3045]" />
          ))}
        </div>
        <div className="h-36 rounded-xl bg-[#2a3045]" />
        <div className="h-40 rounded-xl bg-[#2a3045]" />
      </div>
    );
  }

  // ── エラー ──
  if (error || !data || !wsiScore) {
    return (
      <div className="rounded-2xl border border-white/5 bg-[#1a1f2e] p-5 text-sm text-[#8b92a5]">
        {error ?? "気象データを読み込めませんでした"}
      </div>
    );
  }

  const apparent =
    data.current.apparentTemperatureC ?? data.current.temperatureC;

  return (
    <section
      aria-labelledby="weather-widget-heading"
      className="rounded-2xl border border-white/5 bg-[#1a1f2e] overflow-hidden"
    >
      {/* ── ヘッダー ── */}
      <div className="flex items-center justify-between px-5 pt-5 pb-1">
        <h2
          id="weather-widget-heading"
          className="text-sm font-bold text-[#e6e8ee]"
        >
          🌤 天気 &amp; 睡眠予報
        </h2>
        <span className="text-xs text-[#8b92a5]">📍 {locationName}</span>
      </div>

      {/* ── ① 週間天気予報 ── */}
      <div className="px-5 pt-4 pb-5">
        <p className="mb-3 text-xs font-semibold text-[#8b92a5] tracking-wide uppercase">
          週間天気予報
        </p>
        <DailyForecastSection forecast={data.forecast} />
      </div>

      {/* 区切り */}
      <div className="mx-5 border-t border-white/5" />

      {/* ── ② 今夜の睡眠スコア ── */}
      <div className="px-5 pt-5 pb-4">
        <SleepScoreHero score100={score100} wsiScore={wsiScore} />
      </div>

      {/* ── ③ 気象指標 3カード ── */}
      <div className="px-5 pb-5 grid grid-cols-3 gap-3">
        <PressureCard
          hPa={data.current.pressureHpa}
          delta={data.current.pressureDeltaHpa}
        />
        <ApparentTempCard
          apparent={apparent}
          actual={data.current.temperatureC}
        />
        <AQICard aqi={data.aqi} />
      </div>

      {/* 区切り */}
      <div className="mx-5 border-t border-white/5" />

      {/* ── ④ 気圧推移グラフ ── */}
      {data.hourlyPressure.values.length > 1 && (
        <div className="px-5 pt-5 pb-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-[#8b92a5] tracking-wide uppercase">
              気圧推移（72時間）
            </p>
            <div className="flex gap-2.5">
              {(
                ["safe", "caution", "warning", "danger"] as PressureZone[]
              ).map((z) => (
                <div key={z} className="flex items-center gap-1">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ background: PRESSURE_ZONE_CONFIG[z].color }}
                  />
                  <span className="text-[9px] text-[#8b92a5]">
                    {PRESSURE_ZONE_CONFIG[z].label}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <PressureChart
            times={data.hourlyPressure.times}
            values={data.hourlyPressure.values}
          />
        </div>
      )}

      {/* 区切り */}
      <div className="mx-5 border-t border-white/5" />

      {/* ── ⑤ 睡眠×気圧 相関グラフ ── */}
      <div className="px-5 pt-5 pb-4">
        <p className="mb-3 text-xs font-semibold text-[#8b92a5] tracking-wide uppercase">
          睡眠 × 気圧 相関
        </p>
        <CorrelationChart />
      </div>

      {/* ── ケアヒント ── */}
      {careHints.length > 0 && (
        <>
          <div className="mx-5 border-t border-white/5" />
          <div className="px-5 pt-5 pb-6">
            <p className="mb-3 text-xs font-semibold text-[#e6e8ee]">
              💡 今夜のケアヒント
            </p>
            <CareHintList hints={careHints} />
          </div>
        </>
      )}
    </section>
  );
}
