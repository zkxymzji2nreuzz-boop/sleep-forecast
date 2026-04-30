"use client";

/**
 * AuthProvider (REQ-P2-01)
 *
 * アプリ起動時に匿名 Supabase セッションを確立する。
 * layout.tsx の <body> 直下に配置するだけでよい。
 * UI は何も出力しない（透過的なコンテキストプロバイダー）。
 *
 * Supabase 未設定（環境変数なし）の場合は即座に isReady = true になり、
 * localStorage のみモードで動作する。
 */

import * as React from "react";
import { ensureAnonymousSession } from "@/lib/auth";
import { isSupabaseAvailable } from "@/lib/supabase";

type AuthContextValue = {
  /** 認証済みユーザーID（匿名含む）。Supabase 未設定時は null。 */
  userId: string | null;
  /** 認証チェック完了フラグ（完了前は undefined 扱い） */
  isReady: boolean;
};

const AuthContext = React.createContext<AuthContextValue>({
  userId: null,
  isReady: false,
});

export function useAuth(): AuthContextValue {
  return React.useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<AuthContextValue>({
    userId: null,
    isReady: false,
  });

  React.useEffect(() => {
    if (!isSupabaseAvailable()) {
      // Supabase 未設定: localStorage のみモードで即時 ready
      setState({ userId: null, isReady: true });
      return;
    }

    // 非同期で匿名セッション確立（UI をブロックしない）
    ensureAnonymousSession()
      .then(({ userId }) => setState({ userId, isReady: true }))
      .catch(() => setState({ userId: null, isReady: true }));
  }, []);

  return (
    <AuthContext.Provider value={state}>{children}</AuthContext.Provider>
  );
}
