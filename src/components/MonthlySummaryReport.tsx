"use client";

/**
 * MonthlySummaryReport
 *
 * 月単位で睡眠記録を集計し、サマリーを表示するコンポーネント。
 * - 記録がある月のタブを自動生成（最新5ヶ月まで）
 * - 総記録数・平均品質・最良日・最悪日・気圧影響・品質分布を表示
 * - 月ごとのパーソナルインサイト文を生成
 */

import { useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Share2 } from "lucide-react";
import type { SleepRecord } from "@/lib/types";

// ─────────────────────────────────────────────────────────────────────────────
// ユーティリティ
// ─────────────────────────────────────────────────────────────────────────────

function formatYearMonth(ym: string): string {
  const [y, m] = ym.split("-");
  return `${y}年${parseInt(m)}月`;
}

// 記録フォームは 1/3/5 の3択のみ
const QUALITY_LABEL: Record<number, string> = {
  1: "眠れなかった",
  3: "なんとか眠れた",
  5: "よく眠れた",
};

const QUALITY_COLOR: Record<number, string> = {
  1: "#f87171",
  3: "#facc15",
  5: "#34d399",
};

// ─────────────────────────────────────────────────────────────────────────────
// 月次集計ロジック
// ─────────────────────────────────────────────────────────────────────────────

type MonthlySummary = {
  yearMonth: string;
  totalRecords: number;
  avgQuality: number;
  bestDay: { date: string; quality: number } | null;
  worstDay: { date: string; quality: number } | null;
  qualityDist: Record<1 | 2 | 3 | 4 | 5, number>;
  pressureDropCount: number;
  pressureDropAvg: number | null;
  longestStreak: number;
};

function calcMonthlyStreak(dates: string[]): number {
  if (dates.length === 0) return 0;
  const sorted = [...dates].sort();
  let max = 1;
  let cur = 1;
  for (let i = 1; i < sorted.length; i++) {
    const diff = new Date(sorted[i]).getTime() - new Date(sorted[i - 1]).getTime();
    if (diff === 86400000) { cur++; max = Math.max(max, cur); }
    else cur = 1;
  }
  return max;
}

function calcSummary(records: SleepRecord[], yearMonth: string): MonthlySummary {
  const monthRecords = records.filter((r) => r.date.startsWith(yearMonth));
  const total = monthRecords.length;

  if (total === 0) {
    return {
      yearMonth,
      totalRecords: 0,
      avgQuality: 0,
      bestDay: null,
      worstDay: null,
      qualityDist: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      pressureDropCount: 0,
      pressureDropAvg: null,
      longestStreak: 0,
    };
  }

  const avgQuality = monthRecords.reduce((s, r) => s + r.quality, 0) / total;
  const sorted = [...monthRecords].sort((a, b) => a.date.localeCompare(b.date));

  const bestDay = [...sorted].sort((a, b) => b.quality - a.quality)[0];
  const worstDay = [...sorted].sort((a, b) => a.quality - b.quality)[0];

  const qualityDist: Record<1 | 2 | 3 | 4 | 5, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const r of monthRecords) {
    qualityDist[r.quality as 1 | 2 | 3 | 4 | 5]++;
  }

  const pressureDropRecs = monthRecords.filter(
    (r) => r.weather?.pressureDeltaHpa != null && r.weather.pressureDeltaHpa <= -3
  );
  const pressureDropCount = pressureDropRecs.length;
  const pressureDropAvg =
    pressureDropCount > 0
      ? pressureDropRecs.reduce((s, r) => s + r.quality, 0) / pressureDropCount
      : null;

  const longestStreak = calcMonthlyStreak(sorted.map((r) => r.date));

  return {
    yearMonth,
    totalRecords: total,
    avgQuality,
    bestDay: { date: bestDay.date, quality: bestDay.quality },
    worstDay: { date: worstDay.date, quality: worstDay.quality },
    qualityDist,
    pressureDropCount,
    pressureDropAvg,
    longestStreak,
  };
}

function generateInsight(summary: MonthlySummary): string {
  if (summary.totalRecords === 0) return "";

  const parts: string[] = [];

  if (summary.avgQuality >= 4.0) {
    parts.push("平均品質が高く、とても良い眠りの月でした。");
  } else if (summary.avgQuality >= 3.0) {
    parts.push("まずまずの眠りが続いた月でした。");
  } else {
    parts.push("睡眠の質が低めの月でした。原因を振り返ってみましょう。");
  }

  if (summary.pressureDropCount > 0 && summary.pressureDropAvg !== null) {
    const diff = summary.pressureDropAvg - summary.avgQuality;
    if (diff <= -0.5) {
      parts.push(
        `気圧急落日（${summary.pressureDropCount}日）は平均より${Math.abs(diff).toFixed(1)}点低く、影響を受けていた可能性があります。`
      );
    } else if (summary.pressureDropCount >= 3) {
      parts.push(`気圧が急落した日が${summary.pressureDropCount}日ありましたが、比較的影響を受けにくかったようです。`);
    }
  }

  if (summary.longestStreak >= 7) {
    parts.push(`${summary.longestStreak}日連続記録達成！素晴らしい継続力です。`);
  } else if (summary.longestStreak >= 3) {
    parts.push(`最長${summary.longestStreak}日連続で記録できました。`);
  }

  return parts.join(" ");
}

function formatDate(dateStr: string): string {
  const [, m, d] = dateStr.split("-");
  return `${parseInt(m)}/${parseInt(d)}`;
}

/** 月次サマリーの X シェアテキストを生成 */
function buildShareText(summary: MonthlySummary): string {
  const ym = formatYearMonth(summary.yearMonth);
  const qualityEmoji =
    summary.avgQuality >= 4.5 ? "😴✨" :
    summary.avgQuality >= 3.5 ? "😊" :
    summary.avgQuality >= 2.5 ? "😐" : "😪";
  const lines = [
    `【${ym} 睡眠レポート】${qualityEmoji}`,
    `📊 記録日数: ${summary.totalRecords}日 | 平均品質: ${summary.avgQuality.toFixed(1)}/5.0`,
  ];
  if (summary.longestStreak >= 3) {
    lines.push(`🔥 最長連続: ${summary.longestStreak}日`);
  }
  if (summary.pressureDropCount > 0) {
    lines.push(`🌀 気圧急落日: ${summary.pressureDropCount}日`);
  }
  lines.push("#気象病 #低気圧 #睡眠記録");
  lines.push("https://sleep-forecast.vercel.app");
  return lines.join("\n");
}

function shareMonthly(summary: MonthlySummary) {
  const text = buildShareText(summary);
  const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
  // <a> クリック方式でポップアップブロッカーを回避
  const a = document.createElement("a");
  a.href = url;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// ─────────────────────────────────────────────────────────────────────────────
// UI
// ─────────────────────────────────────────────────────────────────────────────

interface MonthlySummaryReportProps {
  records: SleepRecord[];
}

export function MonthlySummaryReport({ records }: MonthlySummaryReportProps) {
  // 記録がある月を抽出（最新5ヶ月）
  const availableMonths = useMemo(() => {
    const monthSet = new Set(records.map((r) => r.date.slice(0, 7)));
    return Array.from(monthSet).sort().reverse().slice(0, 5);
  }, [records]);

  const [selectedIdx, setSelectedIdx] = useState(0);

  if (availableMonths.length === 0) {
    return null;
  }

  const currentYM = availableMonths[selectedIdx];
  const summary = calcSummary(records, currentYM);
  const insight = generateInsight(summary);

  const maxDistCount = Math.max(...Object.values(summary.qualityDist), 1);

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-primary" aria-hidden="true" />
          <h2 className="text-sm font-bold text-foreground">月次サマリー</h2>
        </div>
        {/* 月ナビ + シェアボタン */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setSelectedIdx((i) => Math.min(i + 1, availableMonths.length - 1))}
            disabled={selectedIdx >= availableMonths.length - 1}
            className="p-1 rounded text-muted-foreground hover:text-foreground disabled:opacity-30"
            aria-label="前の月"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-semibold text-foreground min-w-[88px] text-center">
            {formatYearMonth(currentYM)}
          </span>
          <button
            onClick={() => setSelectedIdx((i) => Math.max(i - 1, 0))}
            disabled={selectedIdx <= 0}
            className="p-1 rounded text-muted-foreground hover:text-foreground disabled:opacity-30"
            aria-label="次の月"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          {summary.totalRecords > 0 && (
            <button
              onClick={() => shareMonthly(summary)}
              className="ml-1 p-1.5 rounded-full text-muted-foreground hover:text-primary/80 hover:bg-primary/[0.07] transition-colors"
              aria-label="X（Twitter）でシェア"
              title="Xでシェア"
            >
              <Share2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {summary.totalRecords === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">この月の記録はありません</p>
      ) : (
        <>
          {/* KPI グリッド */}
          <div className="grid grid-cols-2 gap-2 mb-4 sm:grid-cols-4">
            {/* 記録件数 */}
            <div className="rounded-lg bg-muted p-3 text-center">
              <p className="text-[10px] text-muted-foreground mb-1">記録日数</p>
              <p className="text-2xl font-bold text-foreground">{summary.totalRecords}</p>
              <p className="text-[10px] text-muted-foreground">日</p>
            </div>
            {/* 平均品質 */}
            <div className="rounded-lg bg-muted p-3 text-center">
              <p className="text-[10px] text-muted-foreground mb-1">平均品質</p>
              <p
                className="text-2xl font-bold"
                style={{ color: QUALITY_COLOR[Math.round(summary.avgQuality) as 1 | 2 | 3 | 4 | 5] ?? "hsl(256 43% 93%)" }}
              >
                {summary.avgQuality.toFixed(1)}
              </p>
              <p className="text-[10px] text-muted-foreground">/ 5.0</p>
            </div>
            {/* 最良日 */}
            <div className="rounded-lg bg-muted p-3 text-center">
              <p className="text-[10px] text-muted-foreground mb-1">最良日</p>
              {summary.bestDay ? (
                <>
                  <p className="text-sm font-bold text-emerald-300">{formatDate(summary.bestDay.date)}</p>
                  <p className="text-[10px] text-muted-foreground">{QUALITY_LABEL[summary.bestDay.quality as 1 | 3 | 5] ?? `品質${summary.bestDay.quality}`}</p>
                </>
              ) : <p className="text-xs text-muted-foreground">—</p>}
            </div>
            {/* 最悪日 */}
            <div className="rounded-lg bg-muted p-3 text-center">
              <p className="text-[10px] text-muted-foreground mb-1">最悪日</p>
              {summary.worstDay ? (
                <>
                  <p className="text-sm font-bold text-rose-300">{formatDate(summary.worstDay.date)}</p>
                  <p className="text-[10px] text-muted-foreground">{QUALITY_LABEL[summary.worstDay.quality as 1 | 3 | 5] ?? `品質${summary.worstDay.quality}`}</p>
                </>
              ) : <p className="text-xs text-muted-foreground">—</p>}
            </div>
          </div>

          {/* 品質分布バー */}
          <div className="mb-4">
            <p className="text-[10px] text-muted-foreground font-semibold mb-2 uppercase tracking-wide">品質分布</p>
            <div className="space-y-1.5">
              {([5, 3, 1] as const).map((q) => {
                const count = summary.qualityDist[q];
                const pct = (count / maxDistCount) * 100;
                return (
                  <div key={q} className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground w-20 shrink-0 whitespace-nowrap">{QUALITY_LABEL[q]}</span>
                    <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                      <div
                        className="h-2 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, backgroundColor: QUALITY_COLOR[q] }}
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground w-6 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 気圧影響・連続記録 */}
          <div className="flex gap-2 mb-4">
            <div className="flex-1 rounded-lg bg-muted px-3 py-2">
              <p className="text-[10px] text-muted-foreground">気圧急落日</p>
              <p className="text-lg font-bold text-primary/80">{summary.pressureDropCount} <span className="text-xs font-normal text-muted-foreground">日</span></p>
              {summary.pressureDropAvg !== null && (
                <p className="text-[10px] text-muted-foreground">その日の平均 {summary.pressureDropAvg.toFixed(1)}</p>
              )}
            </div>
            <div className="flex-1 rounded-lg bg-muted px-3 py-2">
              <p className="text-[10px] text-muted-foreground">最長連続記録</p>
              <p className="text-lg font-bold text-orange-300">{summary.longestStreak} <span className="text-xs font-normal text-muted-foreground">日</span></p>
            </div>
          </div>

          {/* インサイト文 */}
          {insight && (
            <p className="text-xs text-muted-foreground leading-relaxed border-t border-border pt-3">
              {insight}
            </p>
          )}
        </>
      )}
    </div>
  );
}
