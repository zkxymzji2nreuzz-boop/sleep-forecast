/**
 * SleepForecast 通知ユーティリティ。
 *
 * バックエンド不要の Notification API ベース実装。
 * - 権限要求 / 状態取得
 * - リマインダー時刻の保存・取得
 * - 起動時チェック（当日未記録 + 時刻超過 + 当日未送信 → 通知）
 * - テスト通知送信
 */

/** 通知有効フラグ ("1" or "0") */
export const NOTIFICATION_ENABLED_KEY = "sf_notification_enabled";
/** リマインダー時刻 ("HH:mm" 形式) */
export const NOTIFICATION_TIME_KEY = "sf_notification_time";
/** 最後に通知を送信した日付 (YYYY-MM-DD) */
export const NOTIFICATION_LAST_SHOWN_DATE_KEY = "sf_notification_last_shown";

function hasStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

/** ブラウザが Notification API をサポートしているか */
export function isNotificationSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

/** 現在の通知権限を返す。非対応ブラウザは "unsupported" */
export function getNotificationPermission(): NotificationPermission | "unsupported" {
  if (!isNotificationSupported()) return "unsupported";
  return Notification.permission;
}

/** 通知権限をリクエストする */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isNotificationSupported()) return "denied";
  return await Notification.requestPermission();
}

/** 通知有効フラグを取得 */
export function getNotificationEnabled(): boolean {
  if (!hasStorage()) return false;
  return window.localStorage.getItem(NOTIFICATION_ENABLED_KEY) === "1";
}

/** 通知有効フラグを設定 */
export function setNotificationEnabled(enabled: boolean): void {
  if (!hasStorage()) return;
  window.localStorage.setItem(NOTIFICATION_ENABLED_KEY, enabled ? "1" : "0");
}

/** リマインダー時刻を取得 (デフォルト: "08:00") */
export function getNotificationTime(): string {
  if (!hasStorage()) return "08:00";
  return window.localStorage.getItem(NOTIFICATION_TIME_KEY) ?? "08:00";
}

/** リマインダー時刻を設定 */
export function setNotificationTime(time: string): void {
  if (!hasStorage()) return;
  window.localStorage.setItem(NOTIFICATION_TIME_KEY, time);
}

/**
 * リマインダー通知を条件付きで表示する。
 *
 * 表示条件（すべて満たす場合のみ）:
 * 1. Notification API サポート + 権限 "granted"
 * 2. 通知が有効（ユーザーが ON にしている）
 * 3. 今日の記録がまだない
 * 4. リマインダー時刻を過ぎている
 * 5. 今日はまだ通知を送っていない
 *
 * @param hasRecordToday - 今日の記録が存在するか
 */
export function checkAndShowReminder(hasRecordToday: boolean): void {
  if (!isNotificationSupported()) return;
  if (Notification.permission !== "granted") return;
  if (!getNotificationEnabled()) return;
  if (hasRecordToday) return;

  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Tokyo" });

  // 今日すでに送信済みならスキップ
  const lastShown = hasStorage()
    ? window.localStorage.getItem(NOTIFICATION_LAST_SHOWN_DATE_KEY)
    : null;
  if (lastShown === today) return;

  // リマインダー時刻を過ぎているか確認
  const reminderTime = getNotificationTime(); // "HH:mm"
  const [h, m] = reminderTime.split(":").map(Number);
  const nowJst = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Tokyo" })
  );
  const reminderMinutes = h * 60 + m;
  const nowMinutes = nowJst.getHours() * 60 + nowJst.getMinutes();
  if (nowMinutes < reminderMinutes) return;

  // 通知を表示
  try {
    const notification = new Notification("SleepForecast", {
      body: "今日の睡眠を記録しましょう。15秒で完了します。",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: "sleep-reminder",
    });
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
    // 送信日を記録
    if (hasStorage()) {
      window.localStorage.setItem(NOTIFICATION_LAST_SHOWN_DATE_KEY, today);
    }
  } catch {
    // 通知失敗は silent に
  }
}

/**
 * テスト通知をすぐに表示する。
 * 権限が "granted" でない場合は何もしない。
 */
export function showTestNotification(): void {
  if (!isNotificationSupported() || Notification.permission !== "granted") return;
  try {
    const notification = new Notification("SleepForecast テスト通知", {
      body: "通知の設定が完了しました！毎朝記録の時間にお知らせします。",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: "sleep-reminder-test",
    });
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  } catch {
    // silent
  }
}
