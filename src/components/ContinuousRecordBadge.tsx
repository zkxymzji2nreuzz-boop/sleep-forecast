"use client";

import type { ContinuousRecordBadge as BadgeType } from "@/lib/types";

interface ContinuousRecordBadgeProps {
  badge: BadgeType;
  className?: string;
}

export function ContinuousRecordBadge({
  badge,
  className = "",
}: ContinuousRecordBadgeProps) {
  if (!badge.level) return null;

  const bgColor: Record<"bronze" | "silver" | "gold" | "platinum", string> = {
    bronze: "bg-[#cd7f32]",
    silver: "bg-[#c0c0c0]",
    gold: "bg-[#ffd700]",
    platinum: "bg-[#e5e7eb]",
  };

  const textColor: Record<"bronze" | "silver" | "gold" | "platinum", string> = {
    bronze: "text-[#1a1f2e]",
    silver: "text-[#1a1f2e]",
    gold: "text-[#1a1f2e]",
    platinum: "text-[#1a1f2e]",
  };

  return (
    <div
      className={`
        inline-flex items-center justify-center px-4 py-3 rounded-lg
        ${bgColor[badge.level]} ${textColor[badge.level]}
        font-semibold text-base
        ${className}
      `}
    >
      {badge.displayText}
    </div>
  );
}
