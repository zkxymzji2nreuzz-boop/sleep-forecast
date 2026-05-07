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
import { Moon, Sunrise, Sun, Sparkles, ChevronDown, type LucideIcon } from "lucide-react";
import { PersonalPressureInsight } from "@/components/PersonalPressureInsight";
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
import { fetchFullWeather, getMoonData } from "@/lib/weather";
import {
  computeWSI,
  getCareHints,
  computeWSIScore100,
  getPressureZone,
  PRESSURE_ZONE_CONFIG,
} from "@/lib/wsi";
import {
  DEFAULT_PREFECTURE_KEY,
  ONBOARDING_DISMISSED_KEY,
  getRecords,
  formatDateJst,
} from "@/lib/storage";
import { getDemoCount, generateDemoRecords } from "@/lib/demo";
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

/** JST（Asia/Tokyo）基準で today と dateStr を比較する */
function isToday(dateStr: string): boolean {
  return dateStr === formatDateJst(new Date());
}

function precipColor(prob: number): string {
  // WCAG AA 対応: CSS変数で light/dark 両モード対応
  if (prob >= 40) return "hsl(var(--primary))";
  return "hsl(var(--muted-foreground))";
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
  // WCAG AA 対応: CSS変数で light/dark 両モード対応
  if (isNaN(delta)) return { arrow: "—", color: "hsl(var(--muted-foreground))" };
  if (delta <= -3) return { arrow: "↙", color: "hsl(var(--destructive))" };
  if (delta <= -1) return { arrow: "↘", color: "hsl(var(--destructive))" };
  if (delta >= 3)  return { arrow: "↑", color: "hsl(var(--primary))" };
  if (delta >= 1)  return { arrow: "↗", color: "hsl(var(--primary))" };
  return                  { arrow: "→", color: "hsl(var(--muted-foreground))" };
}

// ─────────────────────────────────────────────────────────────────────────────
// WSIスコア 5段階ランク（新定義）
// ─────────────────────────────────────────────────────────────────────────────

function getWSIBadge(score100: number): { badge: string; color: string; textClass: string } {
  // color: カード背景・ボーダー用の装飾色
  // textClass: WCAG AA 準拠のテキスト用 Tailwind クラス
  if (score100 >= 80) return { badge: "とても良い夜", color: "#10b981", textClass: "text-emerald-700 dark:text-emerald-400" };
  if (score100 >= 65) return { badge: "良い夜",       color: "#4a90d9", textClass: "text-sky-700 dark:text-sky-400" };
  if (score100 >= 45) return { badge: "普通の夜",     color: "#8b98a5", textClass: "text-slate-600 dark:text-slate-400" };
  if (score100 >= 25) return { badge: "注意の夜",     color: "#f59e0b", textClass: "text-amber-700 dark:text-amber-400" };
  return                     { badge: "難しい夜",     color: "#f87070", textClass: "text-rose-700 dark:text-rose-400" };
}

// 月相絵文字
function getMoonEmoji(phase: number): string {
  if (phase < 0.0625 || phase >= 0.9375) return "🌑";
  if (phase < 0.1875) return "🌒";
  if (phase < 0.3125) return "🌓";
  if (phase < 0.4375) return "🌔";
  if (phase < 0.5625) return "🌕";
  if (phase < 0.6875) return "🌖";
  if (phase < 0.8125) return "🌗";
  return "🌘";
}

// スコア貢献ポイントの概算（UIヒント用）
function estimatePtContrib(
  pressureDelta: number,
  tempDelta: number,
  humidity: number
): { pressure: number; temp: number; humid: number } {
  const pressure =
    pressureDelta <= -5 ? -25 :
    pressureDelta <= -3 ? Math.round(pressureDelta * 5) :
    pressureDelta <= 0  ? Math.round(pressureDelta * 3) :
    Math.min(5, Math.round(pressureDelta));
  const temp =
    tempDelta >= 15 ? -15 :
    tempDelta >= 12 ? -8  :
    tempDelta >= 10 ? -4  : 0;
  const humid =
    humidity >= 85 ? -10 :
    humidity >= 75 ? -5  : 0;
  return { pressure, temp, humid };
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
      <p className="mb-1 text-right text-[9px] text-muted-foreground">← → スクロール</p>
      <div className="flex">
        <div style={{ flexShrink: 0, width: "56px" }}>
          {TODAY_LABEL_ROWS.map(({ label, h }) => (
            <div key={label} style={{ height: `${h}px`, display: "flex", alignItems: "center", fontSize: "10px", color: "hsl(var(--muted-foreground))", fontWeight: label === "時刻" ? 600 : 400 }}>
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
                <div key={time} style={{ flexShrink: 0, width: "54px", display: "flex", flexDirection: "column", borderLeft: isCurrent ? "1px solid hsl(var(--primary) / 0.30)" : "1px solid rgba(255,255,255,0.04)", background: isCurrent ? "hsl(var(--primary) / 0.08)" : "transparent" }}>
                  <div style={{ height: `${HEADER_H}px`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: 600, color: isCurrent ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))" }}>{hourLabel}</div>
                  <div style={{ height: `${ROW_H}px`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "17px" }}>{w.emoji}</div>
                  <div style={{ height: `${ROW_H}px`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 700, color: "hsl(var(--foreground))" }}>{Math.round(hourlyWeather.temps[i])}°</div>
                  <div style={{ height: `${ROW_H}px`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", color: precipColor(hourlyWeather.precipProbs[i]) }}>{hourlyWeather.precipProbs[i]}%</div>
                  <div style={{ height: `${ROW_H}px`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", color: "hsl(var(--muted-foreground))" }}>{hourlyWeather.precipMm[i].toFixed(1)}mm</div>
                  <div style={{ height: `${ROW_H}px`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", color: "hsl(var(--muted-foreground))" }}>{hourlyWeather.humidity[i]}%</div>
                  <div style={{ height: `${HEADER_H}px`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontSize: "10px", color: "hsl(var(--muted-foreground))", gap: "1px" }}>
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
const WEEKLY_LABEL_ROWS = ["日付", "天気", "最高", "最低", "降水確率", "気圧帯", "気圧注意", "月相"];

function DailyForecastSection({ forecast }: { forecast: DailyForecast[] }) {
  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
  return (
    <div>
      <div style={{ display: "flex" }}>
        <div style={{ flexShrink: 0, width: "72px" }}>
          {WEEKLY_LABEL_ROWS.map((label) => (
            <div key={label} style={{ height: `${WEEKLY_ROW_H}px`, display: "flex", alignItems: "center", fontSize: "11px", color: "hsl(var(--muted-foreground))", fontWeight: label === "日付" ? 600 : 400, whiteSpace: "nowrap" }}>
              {label}
            </div>
          ))}
        </div>
        <div style={{ flex: 1, minWidth: 0, display: "grid", gridTemplateColumns: `repeat(${forecast.length}, 1fr)` }}>
          {forecast.map((day) => {
            const isCurrentDay = isToday(day.date);
            const isDangerDay = day.pressureDelta <= -5;
            const weather = weatherCodeToDisplay(day.weatherCode);
            const pressureAvg = Math.round((day.pressureMin + day.pressureMax) / 2);
            const zone = getPressureZone(pressureAvg);
            const zoneConfig = PRESSURE_ZONE_CONFIG[zone];
            const d = new Date(`${day.date}T00:00:00+09:00`);
            const dayLabel = isCurrentDay ? "今日" : `${d.getMonth() + 1}/${d.getDate()}`;
            const weekLabel = weekdays[d.getDay()];
            const moon = getMoonData(new Date(`${day.date}T12:00:00+09:00`));
            const moonEmoji = getMoonEmoji(moon.phase);
            // 危険日（-5hPa以上低下）は赤みがかった背景、通常は今日ハイライト
            const columnBg = isDangerDay
              ? "rgba(239,68,68,0.06)"
              : isCurrentDay
              ? "rgba(29,155,240,0.07)"
              : "transparent";
            const columnBorder = isDangerDay
              ? "1px solid rgba(239,68,68,0.20)"
              : isCurrentDay
              ? "1px solid rgba(29,155,240,0.25)"
              : "1px solid rgba(255,255,255,0.04)";
            return (
              <div key={day.date} style={{ display: "flex", flexDirection: "column", borderLeft: columnBorder, background: columnBg }}>
                <div style={{ height: `${WEEKLY_ROW_H}px`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: "10px", fontWeight: 700, color: isDangerDay ? "hsl(var(--destructive))" : isCurrentDay ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))" }}>{dayLabel}</span>
                  <span style={{ fontSize: "9px", color: "hsl(var(--muted-foreground))" }}>{weekLabel}</span>
                </div>
                <div style={{ height: `${WEEKLY_ROW_H}px`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px" }}>{weather.emoji}</div>
                <div style={{ height: `${WEEKLY_ROW_H}px`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 700, color: "hsl(var(--destructive))" }}>{Math.round(day.tempMax)}°</div>
                <div style={{ height: `${WEEKLY_ROW_H}px`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", color: "hsl(var(--primary))" }}>{Math.round(day.tempMin)}°</div>
                <div style={{ height: `${WEEKLY_ROW_H}px`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", color: precipColor(day.precipProbability) }}>{day.precipProbability}%</div>
                <div style={{ height: `${WEEKLY_ROW_H}px`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: "9px", fontWeight: 700, padding: "2px 5px", borderRadius: "9999px", background: zoneConfig.bg, color: (zone === "warning" || zone === "danger") ? "hsl(var(--destructive))" : zone === "caution" ? "hsl(var(--muted-foreground))" : "hsl(var(--primary))", whiteSpace: "nowrap" }}>{zoneConfig.label}</span>
                </div>
                {/* 気圧注意バッジ行 */}
                <div style={{ height: `${WEEKLY_ROW_H}px`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {isDangerDay ? (
                    <span style={{ fontSize: "9px", fontWeight: 700, padding: "2px 4px", borderRadius: "9999px", background: "rgba(239,68,68,0.15)", color: "hsl(var(--destructive))", border: "1px solid rgba(239,68,68,0.30)", whiteSpace: "nowrap" }}>
                      ⚠ 要注意
                    </span>
                  ) : (
                    <span style={{ fontSize: "10px", color: "hsl(var(--muted-foreground))" }}>—</span>
                  )}
                </div>
                <div style={{ height: `${WEEKLY_ROW_H}px`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px" }}>{moonEmoji}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ③ 今夜の睡眠スコア（改善版: バッジ主役）
// ─────────────────────────────────────────────────────────────────────────────

interface SleepScoreHeroProps {
  score100: number;
  wsiScore: WSIScore;
  hints: string[];
  hourlyPressureTimes: string[];
  hourlyPressureValues: number[];
  currentPressureDelta: number;
  humidity: number;
  tempDelta: number;
  apparentTempC: number | undefined;
}

function SleepScoreHero({
  score100, wsiScore, hints,
  hourlyPressureTimes, hourlyPressureValues,
  currentPressureDelta, humidity, tempDelta, apparentTempC,
}: SleepScoreHeroProps) {
  const { badge, color, textClass: badgeTextClass } = getWSIBadge(score100);
  const [expanded, setExpanded] = React.useState(false);
  const contrib = estimatePtContrib(wsiScore.pressureDelta6h, wsiScore.tempDelta, wsiScore.humidity);

  function handleToggle() {
    setExpanded((prev) => !prev);
  }

  return (
    <div
      className="rounded-2xl p-5"
      style={{ background: `${color}12`, border: `1px solid ${color}35` }}
    >
      <p className="text-xs font-semibold text-muted-foreground mb-3">今夜の睡眠スコア</p>

      {/* バッジ（主役）*/}
      <div className="flex items-center gap-3 mb-2">
        <span className={`text-2xl font-black leading-none ${badgeTextClass}`}>
          {badge}
        </span>
        <span className="text-sm font-semibold tabular-nums text-muted-foreground">
          {score100}
          <span className="text-xs font-normal"> / 100</span>
        </span>
      </div>

      {/* タップで内訳 */}
      <button
        type="button"
        onClick={handleToggle}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleToggle(); } }}
        aria-expanded={expanded}
        aria-controls="sleep-score-detail"
        className="w-full text-left text-xs text-muted-foreground flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/80 rounded"
      >
        {!expanded && (
          <span
            className="inline-block w-2 h-2 rounded-full flex-shrink-0"
            style={{ background: score100 >= 80 ? "#10b981" : score100 >= 45 ? "#a8b0c2" : score100 >= 25 ? "#f59e0b" : "#f87070" }}
          />
        )}
        内訳を見る
        <ChevronDown
          className={`h-3.5 w-3.5 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>

      {/* 展開: 内訳 */}
      {expanded && (
        <div id="sleep-score-detail" className="mt-3 pt-3 border-t border-border">
          <p className="text-xs leading-relaxed text-muted-foreground">{wsiScore.reason}</p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <div className="rounded-lg bg-black/20 p-2 text-center">
              <p className="text-[9px] text-muted-foreground">気圧変化</p>
              <p className="text-sm font-bold text-foreground tabular-nums">
                {wsiScore.pressureDelta6h >= 0 ? "+" : ""}{wsiScore.pressureDelta6h.toFixed(1)}
                <span className="text-[9px] font-normal text-muted-foreground">hPa</span>
              </p>
              <p className="text-[9px] tabular-nums" style={{ color: contrib.pressure >= 0 ? "hsl(var(--primary))" : "hsl(var(--destructive))" }}>
                {contrib.pressure >= 0 ? "+" : ""}{contrib.pressure}pt
              </p>
            </div>
            <div className="rounded-lg bg-black/20 p-2 text-center">
              <p className="text-[9px] text-muted-foreground">寒暖差</p>
              <p className="text-sm font-bold text-foreground tabular-nums">
                {wsiScore.tempDelta.toFixed(0)}
                <span className="text-[9px] font-normal text-muted-foreground">°C</span>
              </p>
              <p className="text-[9px] tabular-nums" style={{ color: contrib.temp >= 0 ? "hsl(var(--primary))" : "hsl(var(--destructive))" }}>
                {contrib.temp >= 0 ? "+" : ""}{contrib.temp}pt
              </p>
            </div>
            <div className="rounded-lg bg-black/20 p-2 text-center">
              <p className="text-[9px] text-muted-foreground">湿度</p>
              <p className="text-sm font-bold text-foreground tabular-nums">
                {wsiScore.humidity}
                <span className="text-[9px] font-normal text-muted-foreground">%</span>
              </p>
              <p className="text-[9px] tabular-nums" style={{ color: contrib.humid >= 0 ? "hsl(var(--primary))" : "hsl(var(--destructive))" }}>
                {contrib.humid >= 0 ? "+" : ""}{contrib.humid}pt
              </p>
            </div>
          </div>
          {/* ケアヒント */}
          {hints.length > 0 && (
            <div className="mt-3 pt-3 border-t border-border flex gap-2 text-xs leading-relaxed text-muted-foreground">
              <span className="mt-0.5 shrink-0 text-primary">💡</span>
              <span>{hints[0]}</span>
            </div>
          )}
          <p className="mt-2 text-[9px] text-muted-foreground text-right">※ スコアは目安です</p>
        </div>
      )}

      {/* ── 明日の目覚め予報（常時表示）── */}
      {hourlyPressureValues.length > 0 && (
        <WakeupSubSection
          hourlyPressureTimes={hourlyPressureTimes}
          hourlyPressureValues={hourlyPressureValues}
          currentPressureDelta={currentPressureDelta}
          humidity={humidity}
          tempDelta={tempDelta}
          apparentTempC={apparentTempC}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ③.5 気圧急変アラートバナー（通知許可フロー）
// ─────────────────────────────────────────────────────────────────────────────



/**
 * 今夜（18:00 JST〜翌7:00 JST）の気圧変化幅が 3hPa 以上かどうか判定する。
 * hourlyPressureTimes は ISO 8601（+09:00 付き推奨）を想定。
 */
function checkTonightPressureDrop(times: string[], pressures: number[]): boolean {
  const todayStr = formatDateJst(new Date());
  const todayBase = new Date(`${todayStr}T00:00:00+09:00`);
  const tomorrowBase = new Date(todayBase.getTime() + 24 * 60 * 60 * 1000);
  const tomorrowStr = `${tomorrowBase.getFullYear()}-${String(tomorrowBase.getMonth() + 1).padStart(2, "0")}-${String(tomorrowBase.getDate()).padStart(2, "0")}`;

  const startMs = new Date(`${todayStr}T18:00:00+09:00`).getTime();
  const endMs   = new Date(`${tomorrowStr}T07:00:00+09:00`).getTime();

  const tonightPressures = times
    .map((t, i) => ({
      ms: Date.parse(t.includes("+") || t.includes("Z") ? t : t + "+09:00"),
      p: pressures[i],
    }))
    .filter(({ ms }) => ms >= startMs && ms <= endMs)
    .map(({ p }) => p);

  if (tonightPressures.length < 2) return false;
  return Math.max(...tonightPressures) - Math.min(...tonightPressures) >= 3;
}

/** 当日の急変通知済み日付を記録するキー */
const ALERT_STORAGE_KEY = "sf_pressure_alert_date";
/** オプトインプロンプトを一度でも表示したかどうかを記録するキー */
const OPTIN_ASKED_KEY = "sf_notification_asked";

type BannerMode =
  | "none"          // 表示しない
  | "drop"          // 急変あり・通知許可を求める
  | "drop-denied"   // 急変あり・拒否済み → アプリ内フォールバック
  | "optin";        // 急変なし・初回のみオプトインプロンプト

interface PressureAlertBannerProps {
  hourlyPressureTimes: string[];
  hourlyPressureValues: number[];
}

function PressureAlertBanner({ hourlyPressureTimes, hourlyPressureValues }: PressureAlertBannerProps) {
  const [mode, setMode] = React.useState<BannerMode>("none");

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window)) return; // iOS Safari 等は非対応

    const today = formatDateJst(new Date());
    const hasDrop = checkTonightPressureDrop(hourlyPressureTimes, hourlyPressureValues);
    const alreadyNotifiedToday = localStorage.getItem(ALERT_STORAGE_KEY) === today;
    const perm = Notification.permission;

    // ── 許可済み ──────────────────────────────────────────────────────────────
    if (perm === "granted") {
      if (hasDrop && !alreadyNotifiedToday) {
        new Notification("SleepForecast", {
          body: "気圧急変の夜です。眠れなかったら明朝記録してみてください",
          icon: "/icon-192.png",
        });
        localStorage.setItem(ALERT_STORAGE_KEY, today);
      }
      return; // バナー不要
    }

    // ── 拒否済み ──────────────────────────────────────────────────────────────
    if (perm === "denied") {
      if (hasDrop && !alreadyNotifiedToday) {
        localStorage.setItem(ALERT_STORAGE_KEY, today);
        setMode("drop-denied"); // アプリ内フォールバックだけ表示
      }
      return;
    }

    // ── 未決（default）────────────────────────────────────────────────────────
    if (hasDrop && !alreadyNotifiedToday) {
      setMode("drop"); // 急変バナー（赤）
    } else if (!localStorage.getItem(OPTIN_ASKED_KEY)) {
      setMode("optin"); // 初回のみ静かなオプトインプロンプト
    }
  }, [hourlyPressureTimes, hourlyPressureValues]);

  if (mode === "none") return null;

  /** 許可ダイアログを呼び出して通知を送る共通処理 */
  const requestAndNotify = async (sendIfGranted: boolean) => {
    const permission = await Notification.requestPermission();
    localStorage.setItem(OPTIN_ASKED_KEY, "true");
    if (permission === "granted" && sendIfGranted) {
      new Notification("SleepForecast", {
        body: "気圧急変の夜です。眠れなかったら明朝記録してみてください",
        icon: "/icon-192.png",
      });
      localStorage.setItem(ALERT_STORAGE_KEY, formatDateJst(new Date()));
    }
    // 拒否されても mode を "none" にして閉じる（拒否フォールバックは急変時のみ）
    setMode("none");
  };

  const dismiss = () => {
    if (mode === "drop") localStorage.setItem(ALERT_STORAGE_KEY, formatDateJst(new Date()));
    if (mode === "optin") localStorage.setItem(OPTIN_ASKED_KEY, "true");
    setMode("none");
  };

  // ── 急変アプリ内フォールバック（拒否済み）────────────────────────────────
  if (mode === "drop-denied") {
    return (
      <div
        className="mx-5 mb-4 rounded-xl border px-4 py-3"
        style={{ background: "rgba(248,113,113,0.08)", borderColor: "rgba(248,113,113,0.25)" }}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold" style={{ color: "hsl(var(--destructive))" }}>
              🌧 今夜は気圧が急変しそうです
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              気圧急変の夜です。眠れなかったら明朝記録してみてください
            </p>
          </div>
          <button onClick={dismiss} className="flex-shrink-0 rounded-full p-3 text-xs text-muted-foreground hover:text-foreground min-w-[44px] min-h-[44px] flex items-center justify-center" aria-label="閉じる">✕</button>
        </div>
      </div>
    );
  }

  // ── 急変バナー（通知許可を求める）────────────────────────────────────────
  if (mode === "drop") {
    return (
      <div
        className="mx-5 mb-4 rounded-xl border px-4 py-3"
        style={{ background: "rgba(248,113,113,0.08)", borderColor: "rgba(248,113,113,0.25)" }}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold" style={{ color: "hsl(var(--destructive))" }}>
              🌧 今夜は気圧が急変しそうです
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              気圧急変の日だけ、就寝前に1回お知らせします
            </p>
          </div>
          <button onClick={dismiss} className="flex-shrink-0 rounded-full p-3 text-xs text-muted-foreground hover:text-foreground min-w-[44px] min-h-[44px] flex items-center justify-center" aria-label="閉じる">✕</button>
        </div>
        <button
          onClick={() => requestAndNotify(true)}
          className="w-full rounded-lg py-2 text-sm font-semibold text-white"
          style={{ background: "rgba(248,113,113,0.55)" }}
        >
          通知を受け取る
        </button>
        <p className="mt-2 text-center text-[10px] text-muted-foreground">ブラウザを開いているときのみ届きます</p>
      </div>
    );
  }

  // ── 初回オプトインプロンプト（急変なし・穏やか）──────────────────────────
  return (
    <div
      className="mx-5 mb-4 rounded-xl border px-4 py-3"
      style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.07)" }}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          気圧急変の日だけ、就寝前に1回お知らせします
        </p>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => requestAndNotify(false)}
            className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white"
            style={{ background: "rgba(255,255,255,0.12)" }}
          >
            通知を受け取る
          </button>
          <button onClick={dismiss} className="rounded-full p-3 text-xs text-muted-foreground hover:text-foreground min-w-[44px] min-h-[44px] flex items-center justify-center" aria-label="閉じる">✕</button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ⑤ 気圧グラフ（Chart.js版、現在時刻〜13時間後のローリングウィンドウ）
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

  // 現在時刻から13時間後まで（ローリングウィンドウ）を抽出
  const nowMs = Date.now();

  // 現在JST時刻を「時単位に切り捨て」したUTCエポックを計算
  const jstNowMs = nowMs + 9 * 3600 * 1000;
  const currentJstHourStartJst = Math.floor(jstNowMs / 3600000) * 3600000;
  const currentHourStartUtc = currentJstHourStartJst - 9 * 3600 * 1000;

  // 翌日判定用：現在のJST日付
  const jstNowDateObj = new Date(currentJstHourStartJst);
  const jstTodayDate = jstNowDateObj.getUTCDate();

  // 対象時間帯のデータを抽出（1時間前〜+12時間、14ポイント）
  const targetPoints: { label: string; value: number; isNow: boolean; delta: number }[] = [];

  for (let offset = -1; offset <= 12; offset++) {
    const targetUtcMs = currentHourStartUtc + offset * 3600 * 1000;
    const targetJstMs = targetUtcMs + 9 * 3600 * 1000;
    const targetJstDateObj = new Date(targetJstMs);
    const targetJstHour = targetJstDateObj.getUTCHours();
    const isTomorrow = targetJstDateObj.getUTCDate() !== jstTodayDate;

    const label = isTomorrow ? `翌${targetJstHour}時` : `${targetJstHour}時`;
    const isNow = offset === 0; // 現在時刻（offset=0）にマーカーを表示

    // 対応するhourlyデータを探す（±30分以内）
    let bestIdx = -1;
    let bestDiff = Infinity;
    for (let i = 0; i < hourlyPressureTimes.length; i++) {
      const timeStr = hourlyPressureTimes[i];
      const tMs = timeStr.includes("+") || timeStr.includes("Z")
        ? Date.parse(timeStr)
        : Date.parse(timeStr + "+09:00");
      const diff = Math.abs(tMs - targetUtcMs);
      if (diff < bestDiff && diff <= 1800000) {
        bestDiff = diff;
        bestIdx = i;
      }
    }

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
      <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
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
        backgroundColor: "hsl(var(--card))",
        titleColor: "hsl(var(--foreground))",
        bodyColor: "hsl(var(--muted-foreground))",
        borderColor: "rgba(255,255,255,0.1)",
        borderWidth: 1,
      },
    },
    scales: {
      x: {
        ticks: {
          color: "hsl(var(--muted-foreground))",
          font: { size: 10 },
          maxRotation: 0,
          autoSkip: false,
          callback: (_: unknown, index: number) => {
            return targetPoints[index]?.label ?? "";
          },
        },
        grid: { color: "hsl(var(--border))" },
      },
      y: {
        position: "right" as const,
        min: Math.floor(minVal - spread * 0.2),
        max: Math.ceil(maxVal + spread * 0.2),
        ticks: {
          color: "hsl(var(--muted-foreground))",
          font: { size: 11 },
          callback: (val: number | string) => `${val}`,
        },
        grid: { color: "hsl(var(--border))" },
      },
    },
  };

  return (
    <div>
      {/* 凡例 */}
      <div className="mb-2 flex gap-4">
        <div className="flex items-center gap-1.5">
          <div className="h-0.5 w-5 rounded" style={{ background: "#378ADD" }} />
          <span className="text-[10px] text-muted-foreground">安定</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-0.5 w-5 rounded" style={{ background: "#f59e0b" }} />
          <span className="text-[10px] text-muted-foreground">やや変化</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-0.5 w-5 rounded" style={{ background: "#f87070" }} />
          <span className="text-[10px] text-muted-foreground">急落</span>
        </div>
      </div>

      {/* グラフ */}
      <div style={{ height: "160px", position: "relative" }}>
        <Line
          ref={chartRef}
          data={chartData}
          options={chartOptions}
          plugins={[currentBandPlugin]}
          aria-label="1時間前から12時間後の気圧推移グラフ"
          role="img"
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ⑥ 明日の目覚め予報カード
// ─────────────────────────────────────────────────────────────────────────────

// 天体ナラティブ スケール（Lv1→Lv5: 夜→夜明け→日中→輝き）
const WAKEUP_SCALE: { level: number; Icon: LucideIcon; color: string }[] = [
  { level: 1, Icon: Moon,     color: "#f87070" },
  { level: 2, Icon: Moon,     color: "#f59e0b" },
  { level: 3, Icon: Sunrise,  color: "#a8b0c2" },
  { level: 4, Icon: Sun,      color: "#4a90d9" },
  { level: 5, Icon: Sparkles, color: "#10b981" },
];

function getWakeupLevel(score100: number): { name: string; color: string; textClass: string; level: number; advice: string; Icon: LucideIcon } {
  if (score100 >= 80) return { name: "ばっちり", color: "#10b981", textClass: "text-emerald-700 dark:text-emerald-400", level: 5, Icon: Sparkles, advice: "最高の目覚めが期待できます。朝の時間を有効活用して" };
  if (score100 >= 65) return { name: "すっきり", color: "#4a90d9", textClass: "text-sky-700 dark:text-sky-400",      level: 4, Icon: Sun,      advice: "良いコンディションです。大事な予定も安心して入れられます" };
  if (score100 >= 45) return { name: "まあまあ", color: "#a8b0c2", textClass: "text-slate-600 dark:text-slate-400",  level: 3, Icon: Sunrise,  advice: "いつも通りで大丈夫。軽いストレッチで目覚めの質をアップ" };
  if (score100 >= 25) return { name: "ぼんやり", color: "#f59e0b", textClass: "text-amber-700 dark:text-amber-400",  level: 2, Icon: Moon,     advice: "今夜は早めに就寝を。照明を落として身体を整えましょう" };
  return                     { name: "ぐったり", color: "#f87070", textClass: "text-rose-700 dark:text-rose-400",    level: 1, Icon: Moon,     advice: "明日は予定を最小限に。無理をしない日と決めておきましょう" };
}

/**
 * 翌朝6〜8時の気圧データから morningDelta を計算するヘルパー
 */
function computeMorningDelta(
  hourlyPressureTimes: string[],
  hourlyPressureValues: number[],
  currentPressureDelta: number
): number {
  const nowMs = Date.now();
  const jstNow = new Date(nowMs + 9 * 3600 * 1000);
  const tomorrow7JstMs = Date.UTC(
    jstNow.getUTCFullYear(), jstNow.getUTCMonth(), jstNow.getUTCDate() + 1, 7, 0, 0
  ) - 9 * 3600 * 1000;

  const morningPressures: number[] = [];
  for (let i = 0; i < hourlyPressureTimes.length; i++) {
    const timeStr = hourlyPressureTimes[i];
    const tMs = timeStr.includes("+") || timeStr.includes("Z")
      ? Date.parse(timeStr)
      : Date.parse(timeStr + "+09:00");
    if (Math.abs(tMs - tomorrow7JstMs) <= 3600 * 1000) {
      morningPressures.push(hourlyPressureValues[i]);
    }
  }

  if (morningPressures.length > 0 && hourlyPressureValues.length > 0) {
    const morningAvg = morningPressures.reduce((a, b) => a + b, 0) / morningPressures.length;
    const currentPressure = hourlyPressureValues[0] || 1013;
    return Math.round((morningAvg - currentPressure) * 10) / 10;
  }
  return currentPressureDelta;
}

/**
 * SleepScoreHero 内に埋め込む「明日の目覚め予報」サブセクション。
 * ドット5連インジケーター + アクションアドバイス1行を表示する。
 */
interface WakeupSubSectionProps {
  hourlyPressureTimes: string[];
  hourlyPressureValues: number[];
  currentPressureDelta: number;
  humidity: number;
  tempDelta: number;
  apparentTempC: number | undefined;
}

function WakeupSubSection({
  hourlyPressureTimes,
  hourlyPressureValues,
  currentPressureDelta,
  humidity,
  tempDelta,
  apparentTempC,
}: WakeupSubSectionProps) {
  const morningDelta = computeMorningDelta(hourlyPressureTimes, hourlyPressureValues, currentPressureDelta);
  const morningScore = computeWSIScore100(morningDelta, tempDelta, humidity, apparentTempC);
  const { name, color, textClass, level, advice, Icon } = getWakeupLevel(morningScore);

  return (
    <div className="mt-3 pt-3 border-t border-dashed border-border/60">
      <p className="text-[10px] font-semibold text-muted-foreground mb-2 tracking-wide uppercase">
        ☀️ 明日の目覚め予報
      </p>

      {/* 大アイコン + ラベル（左） ／ 5段階天体スケール（右） */}
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2.5">
          <Icon
            size={26}
            color={color}
            strokeWidth={level === 5 ? 2.2 : 1.8}
          />
          <span className={`text-base font-bold leading-none ${textClass}`}>
            {name}
          </span>
        </div>

        {/* 天体ナラティブ インジケーター */}
        <div className="flex items-center gap-1.5" aria-label={`目覚め予報: ${name} (${level}/5)`}>
          {WAKEUP_SCALE.map((lv) => {
            const isActive = lv.level === level;
            return (
              <span
                key={lv.level}
                style={{
                  display: "flex",
                  opacity: isActive ? 1 : 0.18,
                  outline: isActive ? `2px solid ${lv.color}` : "none",
                  outlineOffset: 2,
                  borderRadius: "50%",
                  transition: "opacity 0.2s",
                }}
              >
                <lv.Icon
                  size={isActive ? 18 : 13}
                  color={lv.color}
                  strokeWidth={1.7}
                />
              </span>
            );
          })}
        </div>
      </div>

      {/* アクションアドバイス */}
      <p className="text-[11px] text-muted-foreground leading-relaxed">{advice}</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ⑦ 睡眠×気圧 相関グラフ
// ─────────────────────────────────────────────────────────────────────────────


// 記録フォームは 1・3・5 の3択のみ
const QUALITY_COLORS: Record<number, string> = {
  5: "#4ade80",
  3: "#facc15",
  1: "#f87171",
};

function CorrelationChart() {
  const [points, setPoints] = React.useState<{ pressure: number; quality: number }[]>([]);

  React.useEffect(() => {
    // デモモード時はデモデータを使う
    const demoCnt = getDemoCount();
    const records = demoCnt !== null ? generateDemoRecords(demoCnt) : getRecords();
    const validPoints = records
      .filter((r) => r.weather?.pressureHpa != null && r.quality != null)
      .map((r) => ({ pressure: r.weather.pressureHpa, quality: r.quality as number }));
    if (validPoints.length >= 7) {
      setPoints(validPoints.slice(-60));
    } else {
      setPoints([]);
    }
  }, []);

  if (points.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-black/20 p-5 text-center">
        <p className="text-sm font-semibold text-foreground mb-1">7件記録すると表示されます</p>
        <p className="text-xs text-muted-foreground">気圧と睡眠品質の相関を可視化します</p>
      </div>
    );
  }

  const W = 600;
  const H = 165;
  const PAD = { top: 16, right: 20, bottom: 36, left: 18 };
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
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" aria-label="睡眠品質と気圧の相関グラフ">
        <rect x={PAD.left} y={PAD.top} width={Math.max(0, toX(1000) - PAD.left)} height={chartH} fill="rgba(248,113,113,0.06)" />
        <rect x={Math.max(PAD.left, toX(1000))} y={PAD.top} width={Math.max(0, Math.min(toX(1008), W - PAD.right) - Math.max(PAD.left, toX(1000)))} height={chartH} fill="rgba(251,146,60,0.06)" />
        <rect x={Math.max(PAD.left, toX(1008))} y={PAD.top} width={Math.max(0, Math.min(toX(1016), W - PAD.right) - Math.max(PAD.left, toX(1008)))} height={chartH} fill="rgba(250,204,21,0.05)" />
        <rect x={Math.max(PAD.left, toX(1016))} y={PAD.top} width={Math.max(0, W - PAD.right - Math.max(PAD.left, toX(1016)))} height={chartH} fill="rgba(74,222,128,0.05)" />
        {([1, 3, 5] as const).map((q) => (
          <g key={q}>
            <line x1={PAD.left} y1={toY(q)} x2={W - PAD.right} y2={toY(q)} stroke="hsl(var(--border))" strokeWidth="1" />
            {/* Y軸マーカー: 色付き丸 */}
            <circle cx={PAD.left - 8} cy={toY(q)} r="4" fill={QUALITY_COLORS[q] ?? "#a8b0c2"} fillOpacity="0.85" />
          </g>
        ))}
        {Math.abs(slope) > 0.00001 && (
          <line x1={PAD.left} y1={clamp(slope * pMin + intercept)} x2={W - PAD.right} y2={clamp(slope * pMax + intercept)} stroke="#7856ff" strokeWidth="1.5" strokeDasharray="5 3" opacity="0.65" />
        )}
        {points.map((p, i) => (
          <circle key={i} cx={toX(p.pressure)} cy={toY(p.quality)} r="5" fill={QUALITY_COLORS[p.quality] ?? "#a8b0c2"} fillOpacity="0.85" stroke="hsl(var(--background))" strokeWidth="1.5" />
        ))}
        {[pMin, Math.round((pMin + pMax) / 2), pMax].map((p) => (
          <text key={p} x={toX(p)} y={H - 14} textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="10">{Math.round(p)}</text>
        ))}
        <text x={W / 2} y={H - 2} textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="9">気圧 (hPa)</text>
      </svg>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
        {([5, 3, 1] as const).map((q) => (
          <div key={q} className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: QUALITY_COLORS[q] }} />
            <span className="text-[10px] text-muted-foreground">
              {q === 5 ? "よく眠れた" : q === 3 ? "なんとか眠れた" : "眠れなかった"}
            </span>
          </div>
        ))}
        <div className="flex items-center gap-1">
          <div className="w-4 h-0.5" style={{ background: "#7856ff", borderTop: "1px dashed #7856ff" }} />
          <span className="text-[10px] text-muted-foreground">傾向線</span>
        </div>
      </div>
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
        background: "linear-gradient(90deg, hsl(var(--card)) 25%, hsl(var(--muted)) 50%, hsl(var(--card)) 75%)",
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
      <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
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
  const [showPrefBanner, setShowPrefBanner] = React.useState<boolean>(false);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let isMounted = true;

    async function load() {
      // ロード前にスピナーを再表示（設定変更後の再フェッチ時に UX を整える）
      setError(null);
      setLoading(true);

      try {
        const rawCode =
          typeof window !== "undefined"
            ? window.localStorage.getItem(DEFAULT_PREFECTURE_KEY)
            : null;
        const code = rawCode ?? "13";
        const prefecture = getPrefectureByCode(code);
        const { latitude, longitude, name } = prefecture ?? {
          latitude: 35.6895,
          longitude: 139.6917,
          name: "東京都",
        };
        if (isMounted) {
          setLocationName(name);
          // 都道府県バナー表示判定:
          //   - prefecture が未設定（rawCode === null）
          //   - かつ OnboardingBanner が表示されていない（記録ありまたはdismissed済み）
          //   新規ユーザーには OnboardingBanner が出るため、都道府県バナーは抑制する
          const onboardingDismissed = localStorage.getItem(ONBOARDING_DISMISSED_KEY);
          const hasRecords = getRecords().length > 0;
          setShowPrefBanner(rawCode === null && (hasRecords || onboardingDismissed !== null));
        }

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

    // 設定画面で都道府県を変更したときに再フェッチ
    // （同一タブでは storage イベントが発火しないため CustomEvent を使用）
    function handlePrefectureChanged() {
      if (isMounted) load();
    }
    window.addEventListener("sf:prefecture-changed", handlePrefectureChanged);

    return () => {
      isMounted = false;
      window.removeEventListener("sf:prefecture-changed", handlePrefectureChanged);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── ローディング ──
  if (loading) return <WeatherWidgetSkeleton />;

  // ── エラー ──
  if (error) {
    return (
      <div className="rounded-2xl border border-border bg-card p-5 text-center">
        <p className="text-2xl mb-2" aria-hidden="true">⚠️</p>
        <p className="text-sm font-semibold text-foreground mb-1">
          気象データの取得に失敗しました
        </p>
        <p className="text-xs text-muted-foreground mb-4">
          通信状況をご確認のうえ、再度お試しください
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="inline-flex h-9 items-center justify-center rounded-md border border-primary/40 bg-transparent px-4 text-xs font-medium text-foreground hover:bg-primary/10"
        >
          リトライ
        </button>
      </div>
    );
  }

  // ── 空状態（データなし） ──
  if (!data || !wsiScore) {
    return (
      <div className="rounded-2xl border border-border bg-card p-5 text-center">
        <p className="text-sm font-semibold text-foreground mb-1">
          データを読み込めませんでした
        </p>
        <p className="text-xs text-muted-foreground mb-4">
          気象データが見つかりません
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="inline-flex h-9 items-center justify-center rounded-md border border-primary/40 bg-transparent px-4 text-xs font-medium text-foreground hover:bg-primary/10"
        >
          リトライ
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
      className="rounded-2xl border border-border bg-card overflow-hidden"
    >
      {/* ── ヘッダー ── */}
      <div className="flex items-center justify-between px-5 pt-5 pb-1">
        <h2 id="weather-widget-heading" className="text-sm font-bold text-foreground">
          🌤 天気 &amp; 睡眠予報
        </h2>
        <span className="text-xs text-muted-foreground">📍 {locationName}</span>
      </div>

      {/* 都道府県未設定バナー（新規ユーザーには非表示・OnboardingBanner との重複を避ける） */}
      {showPrefBanner && (
        <div className="mx-5 mt-2 mb-1 flex items-center justify-between rounded-lg bg-primary/10 border border-primary/20 px-3 py-2 text-xs">
          <span className="text-muted-foreground">東京の気象データを表示中</span>
          <a
            href="/settings"
            className="text-primary/80 underline decoration-primary/40 underline-offset-2 hover:decoration-primary whitespace-nowrap ml-2"
          >
            地域を設定する →
          </a>
        </div>
      )}

      {/* ── ① 今夜の睡眠スコア + 明日の目覚め予報（最上部）── */}
      <div className="px-5 pt-4 pb-4">
        <SleepScoreHero
          score100={score100}
          wsiScore={wsiScore}
          hints={careHints}
          hourlyPressureTimes={data.hourlyPressure.times}
          hourlyPressureValues={data.hourlyPressure.values}
          currentPressureDelta={data.current.pressureDeltaHpa}
          humidity={data.current.humidity}
          tempDelta={tempDelta}
          apparentTempC={apparent}
        />
      </div>

      {/* ── ②.5 気圧急変アラートバナー（通知許可フロー） ── */}
      {data.hourlyPressure.values.length > 1 && (
        <PressureAlertBanner
          hourlyPressureTimes={data.hourlyPressure.times}
          hourlyPressureValues={data.hourlyPressure.values}
        />
      )}

      {/* ── ②.6 気圧急落パーソナルアラート（個人データ相関） ── */}
      <PersonalPressureInsight currentDelta={data.current.pressureDeltaHpa} />

      <div className="mx-4 border-t border-border" />

      {/* ── ③ 今日の天気 ── */}
      {data.hourlyWeather?.times?.length > 0 && (
        <>
          <div className="px-4 pt-3 pb-1">
            <p className="text-xs font-semibold text-muted-foreground tracking-wide uppercase">今日の天気</p>
          </div>
          <TodayWeatherSection hourlyWeather={data.hourlyWeather} />
        </>
      )}

      <div className="mx-4 border-t border-border" />

      {/* ── ④ 週間天気予報 ── */}
      <div className="px-4 pt-3 pb-4">
        <p className="mb-2 text-xs font-semibold text-muted-foreground tracking-wide uppercase">週間天気予報</p>
        <DailyForecastSection forecast={data.forecast} />
      </div>

      <div className="mx-5 border-t border-border" />

      {/* ── ⑤ 気圧グラフ（1時間前〜12時間後、Chart.js） ── */}
      {data.hourlyPressure.values.length > 1 && (
        <div className="px-5 pt-5 pb-4">
          <p className="mb-3 text-xs font-semibold text-muted-foreground tracking-wide uppercase">
            気圧推移（1時間前〜これから12時間）
          </p>
          <NightPressureChart
            hourlyPressureTimes={data.hourlyPressure.times}
            hourlyPressureValues={data.hourlyPressure.values}
          />
        </div>
      )}

      <div className="mx-5 border-t border-border" />

      {/* ── ⑥ 睡眠×気圧 相関グラフ ── */}
      <div className="px-5 pt-5 pb-6">
        <p className="mb-3 text-xs font-semibold text-muted-foreground tracking-wide uppercase">睡眠 × 気圧 相関</p>
        <CorrelationChart />
      </div>

      {/* ── 帰属クレジット (Open-Meteo CC BY 4.0 ライセンス義務) ── */}
      <div className="border-t border-border px-5 py-3">
        <p className="text-[9px] text-muted-foreground/40">
          Weather data provided by{" "}
          <a
            href="https://open-meteo.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-muted-foreground/70 transition-colors"
          >
            Open-Meteo.com
          </a>{" "}
          (CC BY 4.0)
        </p>
      </div>
    </section>
  );
}
