"use client";

/**
 * AchievementsSection
 *
 * ユーザーの達成バッジを表示するセクション。
 * ダッシュボードに組み込む。
 *
 * - 未達成バッジはグレーアウト + 進捗バー表示
 * - 達成済みバッジはカラー表示 + shimmer アニメ
 * - カテゴリ別タブ切替（全て / 記録 / 連続 / 気象 / 品質）
 */

import { useState } from "react";
import { Trophy, Share2 } from "lucide-react";
import { calcBadgeStatuses, type BadgeCategory, type BadgeStatus } from "@/lib/achievements";
import type { SleepRecord } from "@/lib/types";

const CATEGORY_LABELS: { key: "all" | BadgeCategory; label: string }[] = [
  { key: "all",     label: "すべて" },
  { key: "record",  label: "記録" },
  { key: "streak",  label: "連続" },
  { key: "weather", label: "気象" },
  { key: "quality", label: "品質" },
];

interface BadgeCardProps {
  status: BadgeStatus;
}

function BadgeCard({ status }: BadgeCardProps) {
  const { badge, earned, progress, progressLabel } = status;

  return (
    <div
      className="relative rounded-xl p-3 flex flex-col items-center text-center gap-1.5 transition-transform duration-200 hover:scale-105"
      style={{
        background: earned
          ? "linear-gradient(135deg, rgba(99,102,241,0.18) 0%, rgba(165,153,214,0.12) 100%)"
          : "rgba(255,255,255,0.03)",
        border: earned
          ? "1px solid rgba(99,102,241,0.45)"
          : "1px solid rgba(255,255,255,0.06)",
        boxShadow: earned ? "0 2px 12px -4px rgba(99,102,241,0.35)" : "none",
        opacity: earned ? 1 : 0.5,
        filter: earned ? "none" : "grayscale(0.6)",
      }}
    >
      {/* 達成済みバッジにはキラキラ感 */}
      {earned && (
        <div
          className="absolute inset-0 rounded-xl pointer-events-none"
          style={{
            background:
              "linear-gradient(135deg, rgba(255,255,255,0.04) 0%, transparent 60%)",
          }}
        />
      )}

      {/* 絵文字 */}
      <span
        className="text-2xl leading-none"
        style={{ filter: earned ? "none" : "grayscale(100%)" }}
        role="img"
        aria-label={badge.name}
      >
        {badge.emoji}
      </span>

      {/* バッジ名 */}
      <p
        className="text-[11px] font-semibold leading-tight"
        style={{ color: earned ? badge.color : "hsl(var(--muted-foreground))" }}
      >
        {badge.name}
      </p>

      {/* 達成済みラベル or 進捗バー */}
      {earned ? (
        <span
          className="text-[9px] font-medium px-1.5 py-0.5 rounded-full"
          style={{ background: "rgba(99,102,241,0.2)", color: "hsl(var(--primary))" }}
        >
          達成！
        </span>
      ) : (
        <div className="w-full">
          <div className="w-full bg-muted rounded-full h-1 overflow-hidden">
            <div
              className="h-1 rounded-full transition-all duration-500"
              style={{
                width: `${Math.round(progress * 100)}%`,
                background: badge.color,
                opacity: 0.6,
              }}
            />
          </div>
          <p className="text-[9px] text-muted-foreground mt-0.5">{progressLabel}</p>
        </div>
      )}
    </div>
  );
}

function shareAchievements(earnedCount: number, statuses: ReturnType<typeof calcBadgeStatuses>) {
  const earnedBadges = statuses.filter((s) => s.earned).slice(0, 3);
  const badgeEmojis = earnedBadges.map((s) => s.badge.emoji).join(" ");
  const text = [
    `SleepForecastで${earnedCount}個のバッジを獲得しました！ 🏆`,
    badgeEmojis ? `最近の実績: ${badgeEmojis}` : "",
    "気象と睡眠の相関を記録して、自分だけの予報を作ろう",
    "#気象病 #低気圧 #睡眠記録",
    "https://sleep-forecast.vercel.app",
  ].filter(Boolean).join("\n");

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

interface AchievementsSectionProps {
  records: SleepRecord[];
}

export function AchievementsSection({ records }: AchievementsSectionProps) {
  const [activeCategory, setActiveCategory] = useState<"all" | BadgeCategory>("all");

  const statuses = calcBadgeStatuses(records);
  const earnedCount = statuses.filter((s) => s.earned).length;

  const filtered =
    activeCategory === "all"
      ? statuses
      : statuses.filter((s) => s.badge.category === activeCategory);

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Trophy className="h-4 w-4 text-primary" aria-hidden="true" />
          <h2 className="text-sm font-bold text-foreground">実績バッジ</h2>
        </div>
        <span className="text-xs text-muted-foreground">
          <span className="text-primary/80 font-semibold">{earnedCount}</span>
          {" / "}
          {statuses.length} 達成
        </span>
      </div>

      {/* カテゴリタブ */}
      <div className="flex gap-1.5 mb-4 flex-wrap">
        {CATEGORY_LABELS.map(({ key, label }) => {
          const isActive = activeCategory === key;
          return (
            <button
              key={key}
              onClick={() => setActiveCategory(key)}
              className={`text-[11px] px-2.5 py-1 rounded-full font-medium transition-colors ${
                isActive ? "" : "bg-muted text-muted-foreground"
              }`}
              style={
                isActive
                  ? { background: "rgba(99,102,241,0.25)", color: "hsl(var(--primary))" }
                  : undefined
              }
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* バッジグリッド */}
      {records.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">
          記録を始めるとバッジが解放されます
        </p>
      ) : (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {filtered.map((status) => (
            <BadgeCard key={status.badge.id} status={status} />
          ))}
        </div>
      )}

      {/* 達成バッジあり: サマリー + シェアボタン */}
      {earnedCount > 0 && records.length > 0 && (
        <div className="mt-3 flex items-center justify-between">
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            {earnedCount}個のバッジを獲得中　記録を続けてさらに解放しましょう！
          </p>
          <button
            onClick={() => shareAchievements(earnedCount, statuses)}
            className="ml-2 flex-shrink-0 flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary/80 hover:bg-primary/[0.07] px-2 py-1 rounded-full transition-colors"
            aria-label="X（Twitter）でシェア"
          >
            <Share2 className="h-3 w-3" />
            <span>シェア</span>
          </button>
        </div>
      )}
    </div>
  );
}
