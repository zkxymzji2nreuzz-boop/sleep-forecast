"use client";

/**
 * WeeklyRiskForecast — 7日間の気象コンディション予報カード
 *
 * データソース: FullWeatherData.forecast (DailyForecast[])
 * APIコール追加ゼロ (/api/weather?type=full は HomeClient で取得済み)
 *
 * フェーズ別表示:
 * - Phase0 (記録0-2件): プライマリカード (variant="full")
 * - Phase1 (記録3-6件): プライマリ + CTAカウントダウン (variant="full")
 * - Phase2 (記録7件〜): WeatherWidget下に縮小表示 (variant="compact")
 *
 * 法的注意:
 * - 「気象病リスク 高/中/安定」等の疾病分類ラベルは薬機法リスクのため使用禁止
 * - 採用ラベル: 「気をつけたい日 / ゆらぎ日 / ととのう日」
 * - 免責文は常時表示。アドバイスは行動指針形式に限定（診断・治療表現は禁止）
 */

import Link from "next/link";
import { Activity } from "lucide-react";
import type { DailyForecast } from "@/lib/types";

// ─── リスクレベル定義 ───────────────────────────────────────────────────────────

type RiskLevel = "high" | "medium" | "stable";

/**
 * pressureDelta (前日比気圧差, hPa) からコンディションレベルを算出。
 * - < -5 hPa: 高（気をつけたい日）
 * - < -3 hPa: 中（ゆらぎ日）
 * - それ以外: 安定（ととのう日）
 */
function calcRisk(pressureDelta: number): RiskLevel {
  if (pressureDelta < -5) return "high";
  if (pressureDelta < -3) return "medium";
  return "stable";
}

/** Twilight Calm パレット — ダークテーマに溶け込む半透明カラー */
const RISK_CONFIG: Record<
  RiskLevel,
  {
    label: string;
    barClass: string;
    bgClass: string;
    textClass: string;
    borderClass: string;
    alertBgClass: string;
    alertTextClass: string;
    alertBorderClass: string;
  }
> = {
  high: {
    label: "気をつけたい日",
    barClass: "bg-rose-400/50",
    bgClass: "bg-rose-400/[0.12]",
    textClass: "text-rose-200",
    borderClass: "border-rose-400/30",
    alertBgClass: "bg-rose-400/[0.07]",
    alertTextClass: "text-rose-200",
    alertBorderClass: "border-rose-400/20",
  },
  medium: {
    label: "ゆらぎ日",
    barClass: "bg-amber-300/60",
    bgClass: "bg-amber-300/[0.10]",
    textClass: "text-amber-100",
    borderClass: "border-amber-300/30",
    alertBgClass: "bg-amber-300/[0.07]",
    alertTextClass: "text-amber-100",
    alertBorderClass: "border-amber-300/20",
  },
  stable: {
    label: "ととのう日",
    barClass: "bg-teal-300/50",
    bgClass: "bg-teal-300/[0.10]",
    textClass: "text-emerald-200",
    borderClass: "border-teal-300/[0.25]",
    alertBgClass: "bg-teal-300/[0.07]",
    alertTextClass: "text-emerald-200",
    alertBorderClass: "border-teal-300/20",
  },
};

const DAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];

/** "YYYY-MM-DD" 文字列から曜日ラベルを取得 (UTC基準、JST当日と一致) */
function getDayOfWeek(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return DAY_LABELS[date.getUTCDay()];
}

// ─── コンポーネント ────────────────────────────────────────────────────────────

interface WeeklyRiskForecastProps {
  forecast: DailyForecast[];
  recordCount: number;
  /** compact = Phase2 (記録7件〜) での縮小補足表示 */
  variant?: "full" | "compact";
  className?: string;
}

export function WeeklyRiskForecast({
  forecast,
  recordCount,
  variant = "full",
  className = "",
}: WeeklyRiskForecastProps) {
  if (!forecast || forecast.length === 0) return null;

  const days = forecast.slice(0, 7);
  const highRiskDays = days.filter((f) => calcRisk(f.pressureDelta) === "high");
  const nextHighRisk = highRiskDays[0] ?? null;
  const daysToUnlock = Math.max(0, 7 - recordCount);

  // ── compact バリアント (Phase2: WeatherWidget 下に縮小) ────────────────────

  if (variant === "compact") {
    return (
      <div
        className={`rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3 ${className}`}
      >
        <p className="mb-2 text-[11px] font-medium text-[#a8b0c2]">
          今週の気象コンディション
        </p>
        <div className="grid grid-cols-7 gap-1">
          {days.map((day) => {
            const risk = calcRisk(day.pressureDelta);
            const cfg = RISK_CONFIG[risk];
            return (
              <div key={day.date} className="flex flex-col items-center gap-1">
                <span className="text-[9px] text-[#a8b0c2]/70">
                  {getDayOfWeek(day.date)}
                </span>
                <div
                  className={`h-1 w-full rounded-full ${cfg.barClass}`}
                  role="img"
                  aria-label={`${getDayOfWeek(day.date)}: ${cfg.label}`}
                />
              </div>
            );
          })}
        </div>
        {/* 凡例 */}
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-0.5">
          {(["high", "medium", "stable"] as const).map((level) => {
            const cfg = RISK_CONFIG[level];
            return (
              <div key={level} className="flex items-center gap-1">
                <div className={`h-1.5 w-3 rounded-full ${cfg.barClass}`} />
                <span className="text-[9px] text-[#a8b0c2]/70">{cfg.label}</span>
              </div>
            );
          })}
        </div>
        <p className="mt-1.5 text-[9px] text-[#a8b0c2]/40">
          Weather data by{" "}
          <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-[#a8b0c2]/70 transition-colors">
            Open-Meteo.com
          </a>{" "}
          (CC BY 4.0)
        </p>
      </div>
    );
  }

  // ── full バリアント (Phase0 / Phase1) ─────────────────────────────────────

  return (
    <div
      className={`rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-sm ${className}`}
    >
      {/* ヘッダー */}
      <div className="mb-1 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-[#e6e8ee]">
          今週の気象コンディション予報
        </h2>
        <span className="shrink-0 text-[9px] text-[#a8b0c2]/50">Open-Meteo</span>
      </div>
      <p className="mb-4 text-[11px] leading-relaxed text-[#a8b0c2]">
        天気予報じゃなく、「あなたの体調予報」です。
      </p>

      {/* 7日間バーグリッド */}
      <div
        className="mb-4 grid grid-cols-7 gap-1.5"
        role="list"
        aria-label="7日間のコンディション予報"
      >
        {days.map((day) => {
          const risk = calcRisk(day.pressureDelta);
          const cfg = RISK_CONFIG[risk];
          return (
            <div
              key={day.date}
              className="flex flex-col items-center gap-1.5"
              role="listitem"
            >
              <span className="text-[10px] text-[#a8b0c2]">
                {getDayOfWeek(day.date)}
              </span>
              {/* カラーバー */}
              <div
                className={`h-1.5 w-full rounded-full ${cfg.barClass}`}
                title={`${getDayOfWeek(day.date)}: ${cfg.label}`}
                aria-hidden="true"
              />
              {/* 気圧差 */}
              <span
                className={`text-[9px] tabular-nums leading-none ${cfg.textClass}`}
              >
                {day.pressureDelta > 0 ? "+" : ""}
                {day.pressureDelta.toFixed(1)}
              </span>
            </div>
          );
        })}
      </div>

      {/* 凡例 */}
      <div className="mb-4 flex flex-wrap gap-1.5">
        {(["high", "medium", "stable"] as RiskLevel[]).map((level) => {
          const cfg = RISK_CONFIG[level];
          return (
            <div
              key={level}
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-medium ${cfg.bgClass} ${cfg.textClass} ${cfg.borderClass}`}
            >
              <div
                className={`h-1.5 w-3.5 rounded-full ${cfg.barClass}`}
                aria-hidden="true"
              />
              {cfg.label}
            </div>
          );
        })}
      </div>

      {/* 高リスク日アラート（対象日がある場合のみ） */}
      {nextHighRisk && (
        <div
          className={`mb-4 rounded-xl border px-3.5 py-2.5 ${RISK_CONFIG.high.alertBgClass} ${RISK_CONFIG.high.alertBorderClass}`}
          role="alert"
        >
          <p className={`text-xs leading-relaxed ${RISK_CONFIG.high.alertTextClass}`}>
            {getDayOfWeek(nextHighRisk.date)}曜日は気圧が下がりそう。早めに眠る準備をしておくと安心です。
          </p>
        </div>
      )}

      {/* 免責文（常時表示） */}
      <div className="mb-4 border-l-2 border-indigo-400/25 pl-3">
        <p className="text-[10px] leading-relaxed text-[#a8b0c2]">
          気象データから算出した参考予報です。医療行為ではなく、体調管理の目安としてご活用ください。
        </p>
        <p className="mt-1 text-[10px] leading-relaxed text-[#a8b0c2]/60">
          それでも、気圧の変化を知っておくことは、明日のあなたへの小さな備えになります。
        </p>
      </div>

      {/* CTA バー（記録7件未満の場合のみ表示） */}
      {recordCount < 7 && (
        <div className="rounded-xl border border-indigo-400/15 bg-indigo-500/[0.07] px-4 py-3">
          <p className="mb-2 text-xs font-medium text-[#e6e8ee]">
            今は「みんなの予報」。育てると「あなたの予報」に。
          </p>

          {/* プログレスバー */}
          <div className="mb-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-1.5 rounded-full bg-gradient-to-r from-indigo-400 to-purple-400 transition-all duration-700"
              style={{ width: `${Math.min(100, (recordCount / 7) * 100)}%` }}
              role="progressbar"
              aria-valuenow={recordCount}
              aria-valuemin={0}
              aria-valuemax={7}
              aria-label={`個人感受性モードまであと${daysToUnlock}日`}
            />
          </div>

          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] text-[#a8b0c2]">
              {recordCount === 0
                ? "7日記録で、個人感受性モードがオン"
                : `あと${daysToUnlock}日記録で、個人感受性モードがオン`}
            </p>
            <Link
              href="/record"
              className="inline-flex shrink-0 items-center gap-1 rounded-full bg-indigo-500 px-3 py-1.5 text-[10px] font-medium text-white transition-colors hover:bg-indigo-400"
            >
              <Activity className="h-3 w-3" aria-hidden="true" />
              今日を記録
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
