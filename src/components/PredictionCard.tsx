"use client";

import { useState } from "react";
import { AlertCircle, ChevronDown, CheckCircle, Info, Moon } from "lucide-react";
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

/**
 * スコア別カードグラデーション
 * デザインシステム統合: 彩度を落とし Twilight Lavender (violet/indigo) をブレンド。
 * 各スコアの感情色を保ちつつ、ブランドカラーとの統一感を出す。
 * - 快眠(≥4.5): ティール → インディゴ
 * - 良好(≥3.5): エメラルド → バイオレット
 * - ふつう(≥2.5): バイオレット → インディゴ（ブランドカラー）
 * - やや悪い(≥1.5): アンバー → バイオレット
 * - 悪い(<1.5): ローズ → バイオレット
 */
function getScoreGradient(score: number): string {
  if (score >= 4.5) return "from-teal-700 via-emerald-600 to-indigo-700";
  if (score >= 3.5) return "from-emerald-700 via-teal-600 to-violet-700";
  if (score >= 2.5) return "from-violet-700 via-purple-600 to-indigo-600";
  if (score >= 1.5) return "from-amber-700 via-orange-600 to-violet-700";
  return "from-rose-700 via-rose-600 to-violet-700";
}

/** スコアに対応するテキスト色（カード上の白背景）*/
function getScoreColor(score: number): string {
  if (score >= 4.5) return "text-emerald-100";
  if (score >= 3.5) return "text-teal-100";
  if (score >= 2.5) return "text-white";
  if (score >= 1.5) return "text-amber-100";
  return "text-rose-100";
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
      return { label: "信頼度：低", percent: 20, color: "bg-slate-400" };
  }
}

export function PredictionCard({
  prediction,
  variant = "compact",
  className = "",
  streakDays,
}: PredictionCardProps) {
  const [breakdownOpen, setBreakdownOpen] = useState(false);

  // 空状態（予測データが無い場合）
  if (!prediction) {
    return (
      <div
        className={`
          relative bg-card border border-border
          rounded-xl p-6 overflow-hidden text-center
          ${variant === "full" ? "min-h-[320px]" : "min-h-[200px]"}
          ${className}
        `}
      >
        <Moon className="h-8 w-8 mb-2 text-primary/40 mx-auto" aria-hidden="true" />
        <p className="text-sm font-semibold text-foreground mb-1">
          予測データがありません
        </p>
        <p className="text-xs text-muted-foreground">
          記録を追加すると、明日の眠気予報が表示されます
        </p>
      </div>
    );
  }

  const gradient = getScoreGradient(prediction.predictedQuality);
  const scoreColor = getScoreColor(prediction.predictedQuality);
  const emotion = getEmotionStatus(prediction.predictedQuality);
  const confidenceInfo = getConfidenceInfo(prediction.confidence);

  return (
    <div
      className={`
        relative bg-gradient-to-br ${gradient}
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
          明日の睡眠予報
        </h2>
      </div>

      {/* スコア + 感情ステータス */}
      <div className="flex flex-col items-center justify-center py-3">
        <div className={`text-6xl font-bold tabular-nums ${scoreColor}`}>
          {prediction.predictedQuality.toFixed(1)}
          <span className="text-2xl font-normal text-white/50 ml-1">/5.0</span>
        </div>
        <div className="mt-1 text-white text-base font-medium">
          {emotion.emoji} {emotion.label}
        </div>
        <p className="mt-1 text-white/60 text-[10px]">
          5 に近いほど良眠予測
        </p>
        {variant !== "full" && (
          <div className="mt-2 text-white/80 text-xs text-center max-w-xs">
            {prediction.factorDescription}
          </div>
        )}
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
                  <AlertCircle className="h-4 w-4 text-rose-200 flex-shrink-0 mt-0.5" />
                )}
                {item.severity === "info" && (
                  <Info className="h-4 w-4 text-sky-200 flex-shrink-0 mt-0.5" />
                )}
                {item.severity === "positive" && (
                  <CheckCircle className="h-4 w-4 text-emerald-200 flex-shrink-0 mt-0.5" />
                )}
                <span className="text-white text-xs leading-relaxed">
                  {item.text}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* スコア内訳 アコーディオン */}
      {prediction.breakdown && prediction.breakdown.items.length > 0 && (
        <div className="mt-4 border-t border-white/20 pt-3">
          <button
            onClick={() => setBreakdownOpen((prev) => !prev)}
            className="flex items-center gap-1 text-xs text-white/60 hover:text-white/90 transition-colors w-full text-left"
            aria-expanded={breakdownOpen}
            aria-controls="prediction-breakdown"
          >
            <ChevronDown
              className={`h-3.5 w-3.5 transition-transform duration-200 ${breakdownOpen ? "rotate-180" : ""}`}
            />
            スコア内訳を見る
          </button>
          {breakdownOpen && (
            <div id="prediction-breakdown" className="mt-2 space-y-1.5">
              {prediction.breakdown.items.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between bg-white/5 rounded px-2.5 py-1.5"
                >
                  <span className="text-xs text-white/80">{item.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-white/50">{item.value}</span>
                    <span
                      className={`text-xs font-mono tabular-nums ${
                        item.severity === "bad"
                          ? "text-rose-200"
                          : item.severity === "good"
                          ? "text-emerald-200"
                          : "text-white/40"
                      }`}
                    >
                      {item.contrib > 0 ? "+" : ""}
                      {item.contrib.toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
              <p className="text-[10px] text-white/30 mt-1 leading-relaxed">
                ※ 各要素が予測スコアに与える参考値です
              </p>
            </div>
          )}
        </div>
      )}

      {/* 医療免責 — コントラスト確保のため半透明黒ラッパを使用 */}
      <p className="text-xs text-white leading-relaxed mt-4 bg-black/30 backdrop-blur-sm rounded-md px-3 py-2">
        本予測は統計的な参考値です、医療診断・治療を目的としたものではありません。体調に不安がある場合は医療機関にご相談ください。
      </p>
    </div>
  );
}
