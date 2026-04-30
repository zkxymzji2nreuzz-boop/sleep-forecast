"use client";

/**
 * WeeklyInsightCard
 *
 * ホームページに表示する「この7日間の振り返り」カード。
 *
 * 表示条件: 直近7日以内の記録が3件以上ある場合のみ表示
 *
 * 表示内容:
 * - 7日間平均品質スコア（前週比矢印）
 * - 最良日・最悪日
 * - 気圧急落日があった場合の影響サマリー
 * - 一言インサイト文
 */

import { useEffect, useState } from "react";
import { TrendingDown, TrendingUp, Minus } from "lucide-react";
import { getRecords, formatDateJst } from "@/lib/storage";
import type { SleepRecord } from "@/lib/types";

const QUALITY_COLOR: Record<number, string> = {
  1: "#f87171", 2: "#fb923c", 3: "#facc15", 4: "#4ade80", 5: "#34d399",
};

function getPastNDays(n: number): string[] {
  const days: string[] = [];
  for (let i = 0; i < n; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(formatDateJst(d));
  }
  return days;
}

type WeeklyStats = {
  records: SleepRecord[];
  avg: number;
  prevAvg: number | null;
  best: SleepRecord;
  worst: SleepRecord;
  pressureDropDays: number;
  pressureDropAvg: number | null;
};

function calcWeeklyStats(allRecords: SleepRecord[]): WeeklyStats | null {
  const days7 = new Set(getPastNDays(7));
  const days14 = new Set(getPastNDays(14));

  const thisWeek = allRecords.filter((r) => days7.has(r.date));
  const lastWeek = allRecords.filter((r) => !days7.has(r.date) && days14.has(r.date));

  if (thisWeek.length < 3) return null;

  const avg = thisWeek.reduce((s, r) => s + r.quality, 0) / thisWeek.length;
  const prevAvg = lastWeek.length >= 2
    ? lastWeek.reduce((s, r) => s + r.quality, 0) / lastWeek.length
    : null;

  const sorted = [...thisWeek].sort((a, b) => b.quality - a.quality);
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];

  const dropRecs = thisWeek.filter((r) => r.weather?.pressureDeltaHpa <= -3);
  const pressureDropAvg = dropRecs.length > 0
    ? dropRecs.reduce((s, r) => s + r.quality, 0) / dropRecs.length
    : null;

  return { records: thisWeek, avg, prevAvg, best, worst, pressureDropDays: dropRecs.length, pressureDropAvg };
}

function buildInsight(stats: WeeklyStats): string {
  const diff = stats.prevAvg !== null ? stats.avg - stats.prevAvg : null;

  if (diff !== null && diff >= 0.5) return "先週より睡眠の質が改善しました。この調子を維持しましょう！";
  if (diff !== null && diff <= -0.5) return "先週より少し質が下がっています。睡眠環境や生活リズムを確認してみましょう。";
  if (stats.pressureDropDays >= 2 && stats.pressureDropAvg !== null && stats.pressureDropAvg < stats.avg) {
    return `今週は気圧急落日が${stats.pressureDropDays}日あり、影響が出ていた可能性があります。`;
  }
  if (stats.avg >= 4.0) return "今週は良質な眠りが続いています。すばらしいです！";
  if (stats.avg <= 2.5) return "今週は睡眠の質が低めです。早めの就寝や環境整備を試してみてください。";
  return "今週の睡眠は安定していました。記録を続けてパターンを把握しましょう。";
}

function formatMD(dateStr: string): string {
  const [, m, d] = dateStr.split("-");
  return `${parseInt(m)}/${parseInt(d)}`;
}

export function WeeklyInsightCard() {
  const [stats, setStats] = useState<WeeklyStats | null | "loading">("loading");

  useEffect(() => {
    const records = getRecords();
    setStats(calcWeeklyStats(records));
  }, []);

  if (stats === "loading" || stats === null) return null;

  const diff = stats.prevAvg !== null ? stats.avg - stats.prevAvg : null;
  const avgColor = QUALITY_COLOR[Math.round(stats.avg) as 1|2|3|4|5] ?? "#e6e8ee";

  return (
    <div className="mb-8 rounded-2xl border border-white/5 bg-[#1a1f2e] p-5">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-[#9ba3b5] uppercase tracking-wide">
          この7日間の振り返り
        </p>
        <span className="text-[10px] text-[#9ba3b5]">{stats.records.length}日分の記録</span>
      </div>

      {/* メインスコア + 前週比 */}
      <div className="flex items-end gap-3 mb-4">
        <div>
          <p className="text-[10px] text-[#9ba3b5] mb-0.5">平均品質</p>
          <span className="text-4xl font-bold tabular-nums" style={{ color: avgColor }}>
            {stats.avg.toFixed(1)}
          </span>
          <span className="text-sm text-[#9ba3b5] ml-1">/ 5.0</span>
        </div>
        {diff !== null && (
          <div className="flex items-center gap-1 mb-1.5">
            {diff > 0.1 ? (
              <TrendingUp className="h-4 w-4 text-emerald-400" />
            ) : diff < -0.1 ? (
              <TrendingDown className="h-4 w-4 text-rose-400" />
            ) : (
              <Minus className="h-4 w-4 text-[#9ba3b5]" />
            )}
            <span
              className="text-sm font-semibold tabular-nums"
              style={{ color: diff > 0.1 ? "#4ade80" : diff < -0.1 ? "#f87171" : "#9ba3b5" }}
            >
              {diff > 0 ? "+" : ""}{diff.toFixed(1)}
            </span>
            <span className="text-[10px] text-[#9ba3b5]">前週比</span>
          </div>
        )}
      </div>

      {/* 最良日・最悪日 */}
      <div className="flex gap-2 mb-4">
        <div className="flex-1 rounded-lg bg-white/5 px-3 py-2">
          <p className="text-[10px] text-[#9ba3b5] mb-0.5">今週の最良日</p>
          <p className="text-sm font-bold text-emerald-300">{formatMD(stats.best.date)}</p>
          <p className="text-[10px] text-[#9ba3b5]">品質 {stats.best.quality}</p>
        </div>
        <div className="flex-1 rounded-lg bg-white/5 px-3 py-2">
          <p className="text-[10px] text-[#9ba3b5] mb-0.5">今週の最悪日</p>
          <p className="text-sm font-bold text-rose-300">{formatMD(stats.worst.date)}</p>
          <p className="text-[10px] text-[#9ba3b5]">品質 {stats.worst.quality}</p>
        </div>
        {stats.pressureDropDays > 0 && (
          <div className="flex-1 rounded-lg bg-white/5 px-3 py-2">
            <p className="text-[10px] text-[#9ba3b5] mb-0.5">気圧急落日</p>
            <p className="text-sm font-bold text-indigo-300">{stats.pressureDropDays}日</p>
            {stats.pressureDropAvg !== null && (
              <p className="text-[10px] text-[#9ba3b5]">平均 {stats.pressureDropAvg.toFixed(1)}</p>
            )}
          </div>
        )}
      </div>

      {/* インサイト文 */}
      <p className="text-xs text-[#9ba3b5] leading-relaxed border-t border-white/5 pt-3">
        {buildInsight(stats)}
      </p>
    </div>
  );
}
