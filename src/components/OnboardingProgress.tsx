"use client";

/**
 * OnboardingProgress — オンボーディング 3段階アンロック進捗カード。
 *
 * 3件 / 7件 / 30件 の 3 マイルストーンを可視化し、
 * 記録継続の動機づけを行う。
 *
 * - 記録 1〜29 件の間だけ表示（0 件は OnboardingBanner、30件+ は非表示）
 * - 達成済みステージは ✓ + indigo 強調
 * - 次のステージは通常表示、未到達は淡色
 */

import { Check, BarChart2, LineChart, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface Stage {
  count: number;
  label: string;
  detail: string;
  Icon: typeof Check;
}

const STAGES: Stage[] = [
  {
    count: 3,
    label: "グラフ解放",
    detail: "睡眠推移グラフが見られます",
    Icon: LineChart,
  },
  {
    count: 7,
    label: "気圧相関",
    detail: "気圧×睡眠の関係を分析",
    Icon: BarChart2,
  },
  {
    count: 30,
    label: "高精度予測",
    detail: "1ヶ月でさらに精密に",
    Icon: Sparkles,
  },
];

interface OnboardingProgressProps {
  recordCount: number;
}

export function OnboardingProgress({ recordCount }: OnboardingProgressProps) {
  // 0件は OnboardingBanner が担当、30件以上は表示不要
  if (recordCount <= 0 || recordCount >= 30) return null;

  // 次に達成すべきステージ
  const nextStage = STAGES.find((s) => recordCount < s.count) ?? STAGES[STAGES.length - 1];
  const progressPercent = Math.min(100, (recordCount / nextStage.count) * 100);

  return (
    <div className="mb-6 rounded-2xl border border-indigo-400/20 bg-indigo-500/[0.05] p-5">
      {/* ヘッダー: 次の解放まで */}
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-semibold text-[#e6e8ee]">
          次の解放まであと{" "}
          <span className="text-indigo-300">{nextStage.count - recordCount} 件</span>
        </span>
        <span className="text-xs text-[#9ba3b5]">
          {recordCount} / {nextStage.count} 件
        </span>
      </div>

      {/* プログレスバー */}
      <div className="mb-5 h-2 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className="h-2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-700"
          style={{ width: `${progressPercent}%` }}
          role="progressbar"
          aria-valuenow={recordCount}
          aria-valuemin={0}
          aria-valuemax={nextStage.count}
          aria-label={`${nextStage.label}まであと${nextStage.count - recordCount}件`}
        />
      </div>

      {/* 3段階マイルストーンカード */}
      <div className="grid grid-cols-3 gap-2">
        {STAGES.map((stage) => {
          const done = recordCount >= stage.count;
          const isNext = stage === nextStage;
          const Icon = stage.Icon;

          return (
            <div
              key={stage.count}
              className={cn(
                "rounded-xl border p-3 transition-colors",
                done
                  ? "border-indigo-400/30 bg-indigo-500/10"
                  : isNext
                  ? "border-indigo-400/20 bg-white/[0.03]"
                  : "border-white/5 bg-transparent opacity-40"
              )}
            >
              {/* バッジ + アイコン */}
              <div className="mb-2 flex items-center justify-between">
                <div
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold",
                    done
                      ? "bg-indigo-500 text-white"
                      : isNext
                      ? "bg-white/10 text-indigo-300"
                      : "bg-white/5 text-[#9ba3b5]"
                  )}
                >
                  {done ? (
                    <Check className="h-3.5 w-3.5" aria-hidden="true" />
                  ) : (
                    stage.count
                  )}
                </div>
                <Icon
                  className={cn(
                    "h-4 w-4",
                    done ? "text-indigo-400" : "text-[#9ba3b5]/50"
                  )}
                  aria-hidden="true"
                />
              </div>

              {/* ラベル */}
              <p
                className={cn(
                  "text-xs font-semibold leading-tight",
                  done
                    ? "text-indigo-300"
                    : isNext
                    ? "text-[#e6e8ee]"
                    : "text-[#9ba3b5]"
                )}
              >
                {stage.label}
              </p>

              {/* 説明 */}
              <p className="mt-0.5 text-[10px] leading-tight text-[#9ba3b5]">
                {stage.detail}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
