/**
 * SleepForecast 認証管理 (REQ-P2-01)
 *
 * - Anonymous Auth: アカウント不要、起動時に自動で匿名セッション確立
 * - Email Magic Link: 匿名→永続アカウント昇格（データ引き継ぎ用）
 * - 初回ログイン時: localStorage → Supabase マイグレーションを実行
 */

import { supabase } from "./supabase";
import { migrateLocalStorageToSupabase } from "./db";

/** localStorage キー: マイグレーション完了フラグ */
const MIGRATION_DONE_KEY = "sf_supabase_migrated_v1";

function isMigrationDone(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(MIGRATION_DONE_KEY) === "1";
}

function markMigrationDone(): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(MIGRATION_DONE_KEY, "1");
}

/**
 * 匿名セッションを確立する（アプリ起動時に自動実行）。
 *
 * - 既存セッションあり → そのまま使用（マイグレーション未実施なら実行）
 * - セッションなし → Anonymous Sign-In → マイグレーション実行
 *
 * Supabase 未設定時（環境変数なし）は no-op で即時 return。
 */
export async function ensureAnonymousSession(): Promise<{
  userId: string | null;
  isNewSession: boolean;
}> {
  if (!supabase) return { userId: null, isNewSession: false };

  try {
    // 既存セッション確認
    const { data: sessionData } = await supabase.auth.getSession();

    if (sessionData.session?.user) {
      const userId = sessionData.session.user.id;
      if (!isMigrationDone()) {
        void migrateLocalStorageToSupabase().then(markMigrationDone);
      }
      return { userId, isNewSession: false };
    }

    // セッションなし → 匿名ログイン
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error || !data.user) {
      return { userId: null, isNewSession: false };
    }

    const userId = data.user.id;
    if (!isMigrationDone()) {
      void migrateLocalStorageToSupabase().then(markMigrationDone);
    }

    return { userId, isNewSession: true };
  } catch {
    return { userId: null, isNewSession: false };
  }
}

/**
 * メールアドレスにマジックリンクを送信する。
 * 匿名ユーザーを永続アカウントに昇格させる際に使用。
 * （updateUser でメール変更 → Supabase がリンクを送信する）
 */
export async function sendMagicLink(email: string): Promise<{
  success: boolean;
  error?: string;
}> {
  if (!supabase) return { success: false, error: "Supabase 未設定" };
  try {
    const { error } = await supabase.auth.updateUser({ email });
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "不明なエラー",
    };
  }
}

/**
 * 現在の認証状態を取得する。
 */
export async function getAuthState(): Promise<{
  userId: string | null;
  isAnonymous: boolean;
  email: string | null;
}> {
  if (!supabase) return { userId: null, isAnonymous: true, email: null };
  try {
    const { data } = await supabase.auth.getSession();
    if (!data.session) return { userId: null, isAnonymous: true, email: null };
    const user = data.session.user;
    return {
      userId: user.id,
      isAnonymous: (user.is_anonymous as boolean | undefined) ?? !user.email,
      email: user.email ?? null,
    };
  } catch {
    return { userId: null, isAnonymous: true, email: null };
  }
}
