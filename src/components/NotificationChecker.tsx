"use client";

/**
 * NotificationChecker — アプリ起動時にリマインダー通知を確認するコンポーネント。
 *
 * layout.tsx に仕込む invisible な Client Component。
 * マウント時に localStorage から今日の記録有無を確認し、
 * 条件を満たせば通知を表示する。
 */

import * as React from "react";
import { checkAndShowReminder } from "@/lib/notifications";
import { getTodayRecord } from "@/lib/storage";

export function NotificationChecker() {
  React.useEffect(() => {
    try {
      const todayRecord = getTodayRecord();
      checkAndShowReminder(todayRecord !== null);
    } catch {
      // 通知チェック失敗は silent に
    }
  }, []);

  // 何もレンダリングしない
  return null;
}
