"use client";

/**
 * PersonalPressureInsight
 *
 * ユーザーの過去睡眠記録から「気圧急落日の睡眠品質」を分析し、
 * 今日の気圧変化と照らし合わせてパーソナルな洞察を表示する。
 *
 * 表示条件:
 *   - currentDelta <= -3（今日は気圧が下落中）
 *
 * 表示内容:
 *   - 十分なデータあり（記録 >= 5 件 AND 気圧急落日 >= 2 件）
 *     → 急落日の平均睡眠スコア vs 通常日を比較して感度を表示
 *   - データ不足
 *     → 「記録を続けると傾向が分かります」ナッジ
 */

import { useEffect, useState } from "react";
import { TrendingDown, BarChart2 } from "lucide-react";
import { getRecords } from "@/lib/storage";
import type { SleepRecord } from "@/lib/types";

/** 気圧急落とみなすデルタ閾値 (hPa) */
const DROP_THRESHOLD = -3;
/** 個人分析に最低限必要な総記録件数 */
const MIN_TOTAL_RECORDS = 5;
/** 急落日の分析に必要な最低件数 */
const MIN_DROP_RECORDS = 2;

interface InsightData {
  dropCount: number;
  normalCount: number;
  dropAvg: number;
  normalAvg: number;
  /** 急落日 vs 通常日のスコア差（マイナス = 急落時に悪化） */
  diff: number;
  /** 感度: diff <= -0.5 を「sensitive」、それ以外は「resilient」 */
  sensitivity: "sensitive" | "resilient";
}

function analyzeRecords(records: SleepRecord[]): InsightData | null {
  if (records.length < MIN_TOTAL_RECORDS) return null;

  const dropRecords = records.filter(
    (r) => r.weather?.pressureDeltaHpa != null && r.weather.pressureDeltaHpa <= DROP_THRESHOLD
  );
  const normalRecords = records.filter(
    (r) => r.weather?.pressureDeltaHpa == null || r.weather.pressureDeltaHpa > DROP_THRESHOLD
  );

  if (dropRecords.length < MIN_DROP_RECORDS) return null;
  if (normalRecords.length === 0) return null;

  const avg = (arr: SleepRecord[]) =>
    arr.reduce((sum, r) => sum + r.quality, 0) / arr.length;

  const dropAvg = avg(dropRecords);
  const normalAvg = avg(normalRecords);
  const diff = dropAvg - normalAvg;

  return {
    dropCount: dropRecords.length,
    normalCount: normalRecords.length,
    dropAvg,
    normalAvg,
    diff,
    sensitivity: diff <= -0.5 ? "sensitive" : "resilient",
  };
}

interface PersonalPressureInsightProps {
  currentDelta: number;
}

export function PersonalPressureInsight({ currentDelta }: PersonalPressureInsightProps) {
  const [insight, setInsight] = useState<InsightData | null | "loading">("loading");
  const [totalRecords, setTotalRecords] = useState(0);

  useEffect(() => {
    const records = getRecords();
    setTotalRecords(records.length);
    setInsight(analyzeRecords(records));
  }, []);

  // 今日は気圧下落していない場合 → 何も表示しない
  if (currentDelta > DROP_THRESHOLD) return null;
  if (insight === "loading") return null;

  // ─── 十分なデータあり ──────────────────────────────────────────────
  if (insight !== null) {
    const isSensitive = insight.sensitivity === "sensitive";

    return (
      <div
        className="mx-5 mb-4 rounded-xl border px-4 py-3"
        style={
          isSensitive
            ? { background: "rgba(251,146,60,0.08)", borderColor: "rgba(251,146,60,0.25)" }
            : { background: "rgba(99,102,241,0.08)", borderColor: "rgba(99,102,241,0.25)" }
        }
      >
        {/* ヘッダー */}
        <div className="flex items-center gap-2 mb-2">
          {isSensitive ? (
            <TrendingDown className="h-4 w-4 flex-shrink-0" style={{ color: "#fb923c" }} aria-hidden="true" />
          ) : (
            <BarChart2 className="h-4 w-4 flex-shrink-0" style={{ color: "#818cf8" }} aria-hidden="true" />
          )}
          <p className="text-sm font-semibold" style={{ color: isSensitive ? "#fb923c" : "#818cf8" }}>
            {isSensitive
              ? "あなたは気圧の影響を受けやすい傾向があります"
              : "今日は気圧が急落していますが、あなたは比較的影響を受けにくいようです"}
          </p>
        </div>

        {/* スコア比較 */}
        <div className="flex items-center gap-4 mb-2">
          <div className="flex-1 rounded-lg px-3 py-2 text-center" style={{ background: "rgba(0,0,0,0.2)" }}>
            <p className="text-[10px] text-muted-foreground mb-0.5">気圧急落日の平均</p>
            <p
              className="text-xl font-bold tabular-nums"
              style={{ color: isSensitive ? "#fb923c" : "#c4b5fd" }}
            >
              {insight.dropAvg.toFixed(1)}
            </p>
            <p className="text-[10px] text-muted-foreground">{insight.dropCount}日分</p>
          </div>
          <div className="text-muted-foreground text-xs font-bold">vs</div>
          <div className="flex-1 rounded-lg px-3 py-2 text-center" style={{ background: "rgba(0,0,0,0.2)" }}>
            <p className="text-[10px] text-muted-foreground mb-0.5">通常日の平均</p>
            <p className="text-xl font-bold tabular-nums text-foreground">
              {insight.normalAvg.toFixed(1)}
            </p>
            <p className="text-[10px] text-muted-foreground">{insight.normalCount}日分</p>
          </div>
          <div className="flex-1 rounded-lg px-3 py-2 text-center" style={{ background: "rgba(0,0,0,0.2)" }}>
            <p className="text-[10px] text-muted-foreground mb-0.5">差</p>
            <p
              className="text-xl font-bold tabular-nums"
              style={{ color: insight.diff < 0 ? "#f87171" : "#4ade80" }}
            >
              {insight.diff > 0 ? "+" : ""}{insight.diff.toFixed(1)}
            </p>
            <p className="text-[10px] text-muted-foreground">ポイント</p>
          </div>
        </div>

        {/* アドバイス */}
        <p className="text-xs text-muted-foreground leading-relaxed">
          {isSensitive
            ? "今日のような気圧急落の日は、早めに就寝・カフェイン控えめ・入浴でケアを"
            : "気圧変化の影響は人それぞれ。記録を続けることで傾向がより明確になります。"}
        </p>
      </div>
    );
  }

  // ─── データ不足 ────────────────────────────────────────────────────
  return (
    <div
      className="mx-5 mb-4 rounded-xl border px-4 py-3"
      style={{ background: "rgba(99,102,241,0.06)", borderColor: "rgba(99,102,241,0.2)" }}
    >
      <div className="flex items-start gap-2">
        <TrendingDown className="h-4 w-4 flex-shrink-0 mt-0.5 text-primary" aria-hidden="true" />
        <div>
          <p className="text-sm font-semibold text-primary/80">
            今日は気圧が急落しています
          </p>
          <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
            {totalRecords < MIN_TOTAL_RECORDS
              ? `記録を続けると、あなた個人の気圧感度が分かります（あと${MIN_TOTAL_RECORDS - totalRecords}件で分析開始）`
              : "気圧急落日のデータが蓄積されると、あなた個人の傾向を分析できます"}
          </p>
        </div>
      </div>
    </div>
  );
}
