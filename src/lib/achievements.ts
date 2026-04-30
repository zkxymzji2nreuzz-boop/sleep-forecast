/**
 * SleepForecast バッジ/実績システム。
 *
 * バッジ定義と「ユーザーの記録データからバッジ達成状況を算出」するロジック。
 * UI は AchievementsSection.tsx が担当。
 */

import type { SleepRecord } from "./types";

// ─────────────────────────────────────────────────────────────────────────────
// 型定義
// ─────────────────────────────────────────────────────────────────────────────

export type BadgeCategory = "record" | "streak" | "weather" | "quality";

export type BadgeDefinition = {
  id: string;
  category: BadgeCategory;
  /** アイコン絵文字 */
  emoji: string;
  /** バッジ名 */
  name: string;
  /** 達成条件の説明文 */
  description: string;
  /** カテゴリカラー（Tailwind CSS 変数文字列） */
  color: string;
};

export type BadgeStatus = {
  badge: BadgeDefinition;
  /** 達成済みかどうか */
  earned: boolean;
  /** 進捗率 0..1（achieved なら 1） */
  progress: number;
  /** 進捗の補足テキスト（例: "3 / 7 日"） */
  progressLabel: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// バッジ定義
// ─────────────────────────────────────────────────────────────────────────────

export const ALL_BADGES: BadgeDefinition[] = [
  // ── 記録件数 ──────────────────────────────────────────────────────────────
  {
    id: "first_record",
    category: "record",
    emoji: "🌱",
    name: "はじめの一歩",
    description: "初めて睡眠を記録した",
    color: "#4ade80",
  },
  {
    id: "record_7",
    category: "record",
    emoji: "📓",
    name: "習慣の芽生え",
    description: "7件記録達成",
    color: "#4ade80",
  },
  {
    id: "record_30",
    category: "record",
    emoji: "📗",
    name: "1ヶ月の記録",
    description: "30件記録達成",
    color: "#4ade80",
  },
  {
    id: "record_100",
    category: "record",
    emoji: "📘",
    name: "100日記録",
    description: "100件記録達成",
    color: "#4ade80",
  },

  // ── 連続記録 ──────────────────────────────────────────────────────────────
  {
    id: "streak_3",
    category: "streak",
    emoji: "🔥",
    name: "3日連続",
    description: "3日連続で記録した",
    color: "#fb923c",
  },
  {
    id: "streak_7",
    category: "streak",
    emoji: "🔥🔥",
    name: "1週間連続",
    description: "7日連続で記録した",
    color: "#fb923c",
  },
  {
    id: "streak_14",
    category: "streak",
    emoji: "⚡",
    name: "2週間の炎",
    description: "14日連続で記録した",
    color: "#fb923c",
  },
  {
    id: "streak_30",
    category: "streak",
    emoji: "👑",
    name: "鉄人",
    description: "30日連続で記録した",
    color: "#fb923c",
  },

  // ── 気象・気圧 ──────────────────────────────────────────────────────────
  {
    id: "pressure_survivor_3",
    category: "weather",
    emoji: "🌀",
    name: "低気圧サバイバー",
    description: "気圧急落日（-3hPa以下）に3回記録",
    color: "#818cf8",
  },
  {
    id: "pressure_survivor_10",
    category: "weather",
    emoji: "🌩",
    name: "嵐の記録者",
    description: "気圧急落日（-3hPa以下）に10回記録",
    color: "#818cf8",
  },
  {
    id: "night_owl",
    category: "weather",
    emoji: "🌕",
    name: "満月の観察者",
    description: "月齢0.45〜0.55の満月前後に3回記録",
    color: "#818cf8",
  },

  // ── 睡眠品質 ──────────────────────────────────────────────────────────────
  {
    id: "good_sleep_3",
    category: "quality",
    emoji: "😴",
    name: "快眠3連続",
    description: "品質4以上を3日連続で記録",
    color: "#38bdf8",
  },
  {
    id: "resilient",
    category: "quality",
    emoji: "💪",
    name: "回復力",
    description: "品質1の翌日に品質4以上を記録",
    color: "#38bdf8",
  },
  {
    id: "perfect_week",
    category: "quality",
    emoji: "✨",
    name: "完璧な1週間",
    description: "7日間連続で品質3以上を記録",
    color: "#38bdf8",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// 達成判定ロジック
// ─────────────────────────────────────────────────────────────────────────────

/** 日付文字列 YYYY-MM-DD でソートされた記録を受け取り、最長連続ストリークを返す */
function calcMaxStreak(sortedDates: string[]): number {
  if (sortedDates.length === 0) return 0;
  let max = 1;
  let current = 1;
  for (let i = 1; i < sortedDates.length; i++) {
    const prev = new Date(sortedDates[i - 1]).getTime();
    const curr = new Date(sortedDates[i]).getTime();
    if (curr - prev === 86400000) {
      current++;
      max = Math.max(max, current);
    } else {
      current = 1;
    }
  }
  return max;
}

/** 品質 4 以上の連続最長日数を返す */
function calcMaxGoodSleepStreak(records: SleepRecord[]): number {
  // date 昇順
  const sorted = [...records].sort((a, b) => a.date.localeCompare(b.date));
  let max = 0;
  let current = 0;
  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i].quality >= 4) {
      if (i === 0) {
        current = 1;
      } else {
        const prev = new Date(sorted[i - 1].date).getTime();
        const curr = new Date(sorted[i].date).getTime();
        current = curr - prev === 86400000 ? current + 1 : 1;
      }
      max = Math.max(max, current);
    } else {
      current = 0;
    }
  }
  return max;
}

/**
 * 全バッジの達成状況を計算して返す。
 * 引数は getRecords() 等で取得した配列。
 */
export function calcBadgeStatuses(records: SleepRecord[]): BadgeStatus[] {
  const total = records.length;
  const sortedByDate = [...records].sort((a, b) => a.date.localeCompare(b.date));
  const dates = sortedByDate.map((r) => r.date);
  const maxStreak = calcMaxStreak(dates);

  const pressureDropRecords = records.filter(
    (r) => r.weather?.pressureDeltaHpa <= -3
  );
  const fullMoonRecords = records.filter(
    (r) => r.weather?.moonPhase >= 0.45 && r.weather?.moonPhase <= 0.55
  );

  const maxGoodSleepStreak = calcMaxGoodSleepStreak(sortedByDate);

  // 品質3以上7日連続
  const sorted = sortedByDate;
  let maxQuality3Streak = 0;
  let q3current = 0;
  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i].quality >= 3) {
      if (i === 0) {
        q3current = 1;
      } else {
        const prev = new Date(sorted[i - 1].date).getTime();
        const curr = new Date(sorted[i].date).getTime();
        q3current = curr - prev === 86400000 ? q3current + 1 : 1;
      }
      maxQuality3Streak = Math.max(maxQuality3Streak, q3current);
    } else {
      q3current = 0;
    }
  }

  // 回復力: 品質1の翌日に品質4以上
  let resilientEarned = false;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1].date).getTime();
    const curr = new Date(sorted[i].date).getTime();
    if (
      curr - prev === 86400000 &&
      sorted[i - 1].quality === 1 &&
      sorted[i].quality >= 4
    ) {
      resilientEarned = true;
      break;
    }
  }

  function make(
    badge: BadgeDefinition,
    earned: boolean,
    progress: number,
    progressLabel: string
  ): BadgeStatus {
    return { badge, earned, progress: Math.min(1, progress), progressLabel };
  }

  return ALL_BADGES.map((badge) => {
    switch (badge.id) {
      // 記録件数
      case "first_record":
        return make(badge, total >= 1, total >= 1 ? 1 : 0, `${total} / 1 件`);
      case "record_7":
        return make(badge, total >= 7, total / 7, `${Math.min(total, 7)} / 7 件`);
      case "record_30":
        return make(badge, total >= 30, total / 30, `${Math.min(total, 30)} / 30 件`);
      case "record_100":
        return make(badge, total >= 100, total / 100, `${Math.min(total, 100)} / 100 件`);

      // 連続記録
      case "streak_3":
        return make(badge, maxStreak >= 3, maxStreak / 3, `最長 ${maxStreak} / 3 日`);
      case "streak_7":
        return make(badge, maxStreak >= 7, maxStreak / 7, `最長 ${maxStreak} / 7 日`);
      case "streak_14":
        return make(badge, maxStreak >= 14, maxStreak / 14, `最長 ${maxStreak} / 14 日`);
      case "streak_30":
        return make(badge, maxStreak >= 30, maxStreak / 30, `最長 ${maxStreak} / 30 日`);

      // 気象
      case "pressure_survivor_3":
        return make(
          badge,
          pressureDropRecords.length >= 3,
          pressureDropRecords.length / 3,
          `${Math.min(pressureDropRecords.length, 3)} / 3 回`
        );
      case "pressure_survivor_10":
        return make(
          badge,
          pressureDropRecords.length >= 10,
          pressureDropRecords.length / 10,
          `${Math.min(pressureDropRecords.length, 10)} / 10 回`
        );
      case "night_owl":
        return make(
          badge,
          fullMoonRecords.length >= 3,
          fullMoonRecords.length / 3,
          `${Math.min(fullMoonRecords.length, 3)} / 3 回`
        );

      // 睡眠品質
      case "good_sleep_3":
        return make(badge, maxGoodSleepStreak >= 3, maxGoodSleepStreak / 3, `最長連続 ${maxGoodSleepStreak} / 3 日`);
      case "resilient":
        return make(badge, resilientEarned, resilientEarned ? 1 : 0, resilientEarned ? "達成！" : "未達成");
      case "perfect_week":
        return make(badge, maxQuality3Streak >= 7, maxQuality3Streak / 7, `最長連続 ${maxQuality3Streak} / 7 日`);

      default:
        return make(badge, false, 0, "");
    }
  });
}

/** earned なバッジだけ返す */
export function getEarnedBadges(records: SleepRecord[]): BadgeStatus[] {
  return calcBadgeStatuses(records).filter((s) => s.earned);
}
