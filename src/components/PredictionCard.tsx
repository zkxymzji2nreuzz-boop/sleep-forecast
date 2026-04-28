"use client";

import { AlertCircle, Info, CheckCircle } from "lucide-react";
import type { PredictionResult } from "@/lib/types";

interface PredictionCardProps {
  prediction: PredictionResult | null;
  variant?: "compact" | "full";
  className?: string;
  streakDays?: number;
}

/** スコアに対応する感情ステータスと絵文字 */
function getEmotionStatus(score: number): { label: string; emoji: string } {
  if (score <= 1.5) return { label: "かなり眠い", emoji: "😴" };
  if (score <= 2.5) return { label: "やや眠い", emoji: "😪" };
  if (score <= 3.5) return { label: "ふつう", emoji: "😐" };
  if (score <= 4.5) return { label: "やや良好", emoji: "😊" };
  return { label: "快眠", emoji: "😁" };
}

/** スコアに対応するテキスト色 */
function getScoreColor(score: number): string {
  if (score <= 2.0) return "text-rose-300";
  if (score <= 3.0) return "text-orange-300";
  if (score <= 4.0) return "text-yellow-200";
  return "text-emerald-300";
}

/** 信頼度に対応するラベルと進捗率 */
function getConfidenceInfo(
  confidence: "low" | "medium" | "high"
): { label: string; percent: number; color: string } {
  switch (confidence) {
    case "high":
      return { label: "信頼度：高", percent: 90, color: "bg-emerald-400" };
    case "medium":
      return { label: "信頼度：中", percent: 55, color: "bg-yellow-300" };
    case "low":
    default:
      return { label: "信頼度：低", percent: 20, color: "bg-rose-400" };
  }
}

export function PredictionCard({
  prediction,
  variant = "compact",
  className = "",
  streakDays,
}: PredictionCardProps) {
  // 空状態（予測データが無い場合）
  if (!prediction) {
    return (
      <div
        className={`
          relative bg-[#1a1f2e] border border-white/10
          rounded-xl p-6 overflow-hidden text-center
          ${variant === "full" ? "min-h-[320px]" : "min-h-[200px]"}
          ${className}
        `}
      >
        <p className="text-3xl mb-2" aria-hidden="true">🌙</p>
        <p className="text-sm font-semibold text-[#e6e8ee] mb-1">
          予測データがありません
        </p>
        <p className="text-xs text-[#9ba3b5]">
          記録を追加すると、明日の眠気予報が表示されます
        </p>
      </div>
    );
  }

  const scoreColor = getScoreColor(prediction.predictedQuality);
  const emotion = getEmotionStatus(prediction.predictedQuality);
  const confidenceInfo = getConfidenceInfo(prediction.confidence);

  return (
    <div
      className={`
        relative bg-gradient-to-br from-indigo-500 via-purple-500 to-rose-400
        rounded-xl p-6 overflow-hidden
        ${variant === "full" ? "min-h-[320px]" : "min-h-[200px]"}
        ${className}
      `}
    >
      {/* 連続記録バッジ（右上円形） */}
      {streakDays != null && streakDays > 0 && (
        <div className="absolute top-4 right-4 bg-white/20 rounded-full w-12 h-12 flex flex-col items-center justify-center backdrop-blur-sm">
          <span className="text-white font-bold text-sm leading-none">{streakDays}</span>
          <span className="text-white/80 text-[9px] leading-none">日連続</span>
        </div>
      )}

      {/* ヘッダー */}
      <div className="mb-3">
        <h2 className="text-white font-semibold text-lg leading-tight">
          明日の眠気レベル
        </h2>
      </div>

      {/* スコア + 感情ステータス */}
      <div className="flex flex-col items-center justify-center py-3">
        <div className={`text-6xl font-bold tabular-nums ${scoreColor}`}>
          {prediction.predictedQuality.toFixed(1)}
        </div>
        <div className="mt-1 text-white text-base font-medium">
          {emotion.emoji} {emotion.label}
        </div>
        <div className="mt-2 text-white/80 text-xs text-center max-w-xs">
          {prediction.factorDescription}
        </div>
      </div>

      {/* 信頼度プログレスバー */}
      <div className="mt-3">
        <div className="flex justify-between text-white/70 text-xs mb-1">
          <span>{confidenceInfo.label}</span>
          <span>{prediction.dataPointCount}日分のデータ</span>
        </div>
        <div className="bg-white/20 rounded-full h-2 w-full overflow-hidden">
          <div
            className={`${confidenceInfo.color} h-2 rounded-full transition-all duration-500`}
            style={{ width: `${confidenceInfo.percent}%` }}
          />
        </div>
      </div>

      {/* サンプルフラグ */}
      {prediction.isSample && (
        <div className="mt-4 border-l-4 border-orange-400 bg-orange-500/10 rounded-md p-3">
          <p className="text-white text-xs font-medium">
            🎓 初回のためサンプル表示
          </p>
          <p className="text-white/70 text-xs mt-0.5">
            7日以上記録するとあなた専用の予測に切り替わります
          </p>
        </div>
      )}

      {/* 要因表示 (full バージョン) */}
      {variant === "full" && prediction.factors.length > 0 && (
        <div className="mt-4">
          <h3 className="text-white text-xs font-semibold mb-2 uppercase tracking-wide">
            主な要因
          </h3>
          <div className="bg-white/10 border-l-4 border-emerald-400 rounded-md p-3">
            <p className="text-white text-sm">{prediction.factorDescription}</p>
          </div>
        </div>
      )}

      {/* アドバイス (full バージョン) */}
      {variant === "full" && prediction.advice.length > 0 && (
        <div className="mt-4 border-t border-white/20 pt-4">
          <h3 className="text-white text-sm font-semibold mb-3">
            💡 おすすめのアクション
          </h3>
          <div className="space-y-2">
            {prediction.advice.slice(0, 3).map((item, idx) => (
              <div
                key={idx}
                className="bg-white/5 rounded-md p-2 flex gap-2 items-start"
              >
                {item.severity === "warning" && (
                  <AlertCircle className="h-4 w-4 text-rose-300 flex-shrink-0 mt-0.5" />
                )}
                {item.severity === "info" && (
                  <Info className="h-4 w-4 text-sky-300 flex-shrink-0 mt-0.5" />
                )}
                {item.severity === "positive" && (
                  <CheckCircle className="h-4 w-4 text-emerald-300 flex-shrink-0 mt-0.5" />
                )}
                <span className="text-white text-xs leading-relaxed">
                  {item.text}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 医療免責 */}
      <p className="text-xs text-indigo-100 mt-4 leading-relaxed opacity-75">
        本予測は統計的な参考値です。医療診断・治療を目的としたものではありません。
        体調に不安がある場合は医療機関にご相談ください。
      </p>
    </div>
  );
}
