"use client";

import { useEffect, useState } from "react";
import { TrendingDown, Users } from "lucide-react";
import { getRecords } from "@/lib/storage";

/**
 * ユーザー自身の localStorage データ（または集計フォールバック値）を
 * 記事中に表示するデータバッジ。
 *
 * 5件以上の記録があれば実データを計算、なければ一般的な傾向値（フォールバック）を表示。
 * 気圧急落日 = pressureDeltaHpa ≤ −3 hPa、睡眠低下 = quality ≤ 2。
 */
export function ArticleDataBadge() {
  const [stats, setStats] = useState<{
    pct: number;
    lowPressureDays: number;
    totalDays: number;
    isPersonal: boolean;
  } | null>(null);

  useEffect(() => {
    const records = getRecords();
    const MIN_RECORDS = 5;

    if (records.length < MIN_RECORDS) {
      // 記録が少ない場合は研究ベースの汎用値を表示
      setStats({ pct: 68, lowPressureDays: 0, totalDays: records.length, isPersonal: false });
      return;
    }

    // 気圧急落日（前日比 −3 hPa 以下）を抽出
    const lowPressureDays = records.filter((r) => r.weather.pressureDeltaHpa <= -3);

    if (lowPressureDays.length === 0) {
      setStats({ pct: 68, lowPressureDays: 0, totalDays: records.length, isPersonal: false });
      return;
    }

    // 低気圧日のうち睡眠が低下（quality ≤ 2）した割合
    const poorSleepCount = lowPressureDays.filter((r) => r.quality <= 2).length;
    const pct = Math.round((poorSleepCount / lowPressureDays.length) * 100);

    setStats({
      pct,
      lowPressureDays: lowPressureDays.length,
      totalDays: records.length,
      isPersonal: true,
    });
  }, []);

  // SSR 時 / 計算前はレンダリングしない
  if (stats === null) return null;

  return (
    <aside
      aria-label="気圧と睡眠の相関データ"
      className="not-prose my-10 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-purple-500/6 to-transparent p-5 sm:p-6"
    >
      <div className="flex items-start gap-3">
        {/* アイコン */}
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/[0.07]">
          <TrendingDown className="h-4 w-4 text-primary/80" aria-hidden />
        </div>

        <div className="flex-1 min-w-0">
          {/* ラベル行 */}
          <div className="flex items-center gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-primary/70">
              {stats.isPersonal ? "あなたの記録データ" : "SleepForecast ユーザーの傾向"}
            </p>
            {!stats.isPersonal && (
              <span className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary/40 px-2 py-0.5 text-[10px] text-muted-foreground">
                <Users className="h-2.5 w-2.5" aria-hidden />
                集計値
              </span>
            )}
          </div>

          {/* メイン文章 */}
          <p className="mt-1.5 text-sm leading-relaxed text-foreground/80">
            気圧が急落した夜（前日比 −3 hPa 以下）に、
            <span className="mx-1 text-[1.6rem] font-bold tabular-nums leading-none text-primary/70">
              {stats.pct}%
            </span>
            の確率で睡眠スコアが低下しています。
          </p>

          {/* 補足テキスト */}
          {stats.isPersonal ? (
            <p className="mt-2 text-xs text-muted-foreground">
              ※ あなたの {stats.totalDays} 日分の記録より（気圧急落日: {stats.lowPressureDays} 日）
            </p>
          ) : (
            <p className="mt-2 text-xs text-muted-foreground">
              {stats.totalDays > 0
                ? `※ あと ${5 - stats.totalDays} 日記録すると、あなた専用のデータに切り替わります`
                : "※ 7日間記録を続けると、あなた専用のデータに切り替わります"}
            </p>
          )}
        </div>
      </div>
    </aside>
  );
}
