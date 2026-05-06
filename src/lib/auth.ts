/**
 * SleepForecast 認証管理 (REQ-P2-01)
 *
 * - Anonymous Auth: アカウント不要、起動時に自動で匿名セッション確立
 * - Email Magic Link: 匿名→永続アカウント昇格（データ引き継ぎ用）
 * - 初回ログイン時: localStorage → Supabase マイグレーションを実行
 */

import { supabase } from "./supabase";
import { migrateLocalStorageToSupabase, syncFromSupabase } from "./db";
import { idbSaveSession, idbGetSession } from "./idb";

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
    // ── Step 1: localStorage のセッション確認 ─────────────────────────────
    const { data: sessionData } = await supabase.auth.getSession();

    if (sessionData.session?.user) {
      const userId = sessionData.session.user.id;
      // IDB にセッションをバックアップ（refresh_token が消えても復元できるように）
      void idbSaveSession(userId, sessionData.session.refresh_token);
      if (!isMigrationDone()) {
        void migrateLocalStorageToSupabase().then(markMigrationDone);
      }
      return { userId, isNewSession: false };
    }

    // ── Step 2: localStorage セッションなし → IDB から refresh_token で復元試行 ──
    const idbSession = await idbGetSession();
    if (idbSession?.refreshToken) {
      const { data: refreshData } = await supabase.auth.refreshSession({
        refresh_token: idbSession.refreshToken,
      });
      if (refreshData.session?.user) {
        const userId = refreshData.session.user.id;
        // 復元成功 → IDB バックアップ更新 + Supabase からデータ同期
        void idbSaveSession(userId, refreshData.session.refresh_token);
        void syncFromSupabase().then(() => markMigrationDone());
        return { userId, isNewSession: false };
      }
      // refresh_token が無効（期限切れ等）→ Step 3 へフォールスルー
    }

    // ── Step 3: セッション復元不可 → 新規匿名ログイン ─────────────────────
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error || !data.user) {
      return { userId: null, isNewSession: false };
    }

    const userId = data.user.id;
    void idbSaveSession(userId, data.session?.refresh_token ?? "");
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
