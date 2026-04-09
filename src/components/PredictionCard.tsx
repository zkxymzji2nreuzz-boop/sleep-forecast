"use client";

import { AlertCircle, Info, CheckCircle } from "lucide-react";
import type { PredictionResult } from "@/lib/types";

interface PredictionCardProps {
  prediction: PredictionResult;
  variant?: "compact" | "full";
  className?: string;
}

export function PredictionCard({
  prediction,
  variant = "compact",
  className = "",
}: PredictionCardProps) {
  const scoreColor = getScoreColor(prediction.predictedQuality);
  const confidenceColor = getConfidenceColor(prediction.confidence);

  return (
    <div
      className={`
        bg-gradient-to-br from-[#1d9bf0] to-[#7c4dff] rounded-xl p-6
        ${variant === "full" ? "min-h-[320px]" : "min-h-[200px]"}
        ${className}
      `}
    >
      {/* ヘッダー: タイトル + 信頼度バッジ */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-white font-semibold text-lg">明日の眠気レベル</h2>
        <div
          className={`
            text-xs font-bold px-2.5 py-1 rounded-full
            ${confidenceColor.bg} ${confidenceColor.text}
          `}
        >
          {prediction.confidence === "high"
            ? "高"
            : prediction.confidence === "medium"
              ? "中"
              : "低"}
        </div>
      </div>

      {/* スコア表示 */}
      <div className="flex flex-col items-center justify-center py-4">
        <div
          className={`
            text-6xl font-bold tabular-nums
            ${scoreColor}
          `}
        >
          {prediction.predictedQuality.toFixed(1)}
        </div>
        <div className="text-white text-sm mt-2 max-w-xs text-center">
          {prediction.factorDescription}
        </div>
      </div>

      {/* アドバイス (full バージョンのみ) */}
      {variant === "full" && prediction.advice.length > 0 && (
        <div className="mt-4 border-t border-white/20 pt-4">
          <h3 className="text-white text-sm font-semibold mb-3">アドバイス</h3>
          {prediction.advice.slice(0, 2).map((item, idx) => (
            <div key={idx} className="flex gap-2 mb-2 text-white text-sm">
              {item.severity === "warning" && (
                <AlertCircle className="h-4 w-4 text-[#ef4444] flex-shrink-0 mt-0.5" />
              )}
              {item.severity === "info" && (
                <Info className="h-4 w-4 text-[#1d9bf0] flex-shrink-0 mt-0.5" />
              )}
              {item.severity === "positive" && (
                <CheckCircle className="h-4 w-4 text-[#4ade80] flex-shrink-0 mt-0.5" />
              )}
              <span>{item.text}</span>
            </div>
          ))}
        </div>
      )}

      {/* サンプルデータ表示 */}
      {prediction.isSample && (
        <div className="mt-4 border-t border-white/20 pt-4 text-white text-xs">
          📊 <strong>参考値:</strong> データが不足しているため、現在の気象傾向
          から推定した値です。
        </div>
      )}

      {/* 詳細説明 (full バージョンのみ) */}
      {variant === "full" && (
        <div className="mt-4 border-t border-white/20 pt-4 text-white/90 text-xs space-y-1">
          <div>
            <strong>このスコアについて</strong>
          </div>
          <div>
            - 記録データ: {prediction.dataPointCount} 日分から計算
          </div>
          <div>
            - 信頼度:{" "}
            {prediction.confidence === "high"
              ? "高 (15日以上)"
              : prediction.confidence === "medium"
                ? "中 (7〜14日)"
                : "低 (7日未満)"}
          </div>
          {!prediction.isSample && (
            <div>- 線形回帰モデルで予測</div>
          )}
          {prediction.isSample && (
            <div>
              - データが不足しているため参考値です
            </div>
          )}
        </div>
      )}

      {/* 医療免責 */}
      <div className="mt-4 border-t border-white/20 pt-3 text-white/70 text-xs leading-tight">
        本予測は統計的な参考値であり、医療診断・治療を目的としたものではありません。体調に不安がある場合は医療機関にご相談ください。
      </div>
    </div>
  );
}

function getScoreColor(score: number): string {
  if (score <= 2.0) return "text-[#ef4444]";
  if (score <= 3.0) return "text-[#f97316]";
  if (score <= 4.0) return "text-[#facc15]";
  return "text-[#4ade80]";
}

function getConfidenceColor(
  confidence: "low" | "medium" | "high"
): { bg: string; text: string } {
  switch (confidence) {
    case "high":
      return { bg: "bg-[#4ade80]", text: "text-[#0f1117]" };
    case "medium":
      return { bg: "bg-[#facc15]", text: "text-[#0f1117]" };
    case "low":
    default:
      return { bg: "bg-[#8b92a5]", text: "text-[#0f1117]" };
  }
}
