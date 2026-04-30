/**
 * Supabase ブラウザクライアント (REQ-P2-01)
 *
 * 環境変数が未設定の場合は null を返す（オフライン / ローカル開発用）。
 * 全ての Supabase 呼び出しは `if (!supabase) return` でガードすること。
 *
 * 必要な環境変数:
 *   NEXT_PUBLIC_SUPABASE_URL      - Supabase プロジェクト URL
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY - anon / public API キー
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/**
 * シングルトン Supabase クライアント。
 * 環境変数未設定時は null（localStorage のみモード）。
 */
export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true, // magic link コールバック用
        },
      })
    : null;

/** Supabase が利用可能かどうか */
export function isSupabaseAvailable(): boolean {
  return supabase !== null;
}
