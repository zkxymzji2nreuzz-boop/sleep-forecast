"use client";

/**
 * AccountSection (REQ-P2-01)
 *
 * 設定画面に追加するクラウド同期・アカウント管理セクション。
 *
 * - Supabase 未設定: セクション自体を非表示（localStorage のみモード）
 * - 匿名ユーザー: メールアドレス登録でアカウント昇格（Magic Link 送信）
 * - 登録済みユーザー: 同期状態表示 + クラウドからデータ取り込みボタン
 */

import * as React from "react";
import { Cloud, CloudOff, Mail, Check, Loader2, User, RefreshCw } from "lucide-react";
import { isSupabaseAvailable } from "@/lib/supabase";
import { getAuthState, sendMagicLink } from "@/lib/auth";
import { syncFromSupabase } from "@/lib/db";

type AuthState = {
  userId: string | null;
  isAnonymous: boolean;
  email: string | null;
};

export function AccountSection() {
  const [authState, setAuthState] = React.useState<AuthState | null>(null);
  const [email, setEmail] = React.useState("");
  const [emailSent, setEmailSent] = React.useState(false);
  const [emailError, setEmailError] = React.useState<string | null>(null);
  const [emailLoading, setEmailLoading] = React.useState(false);
  const [syncing, setSyncing] = React.useState(false);
  const [syncMessage, setSyncMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!isSupabaseAvailable()) return;
    getAuthState().then(setAuthState);
  }, []);

  // Supabase 未設定 or 取得中は非表示
  if (!isSupabaseAvailable() || authState === null) return null;

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  async function handleSendMagicLink() {
    if (!EMAIL_RE.test(email)) {
      setEmailError("正しいメールアドレスを入力してください");
      return;
    }
    setEmailLoading(true);
    setEmailError(null);
    const result = await sendMagicLink(email);
    setEmailLoading(false);
    if (result.success) {
      setEmailSent(true);
    } else {
      setEmailError(result.error ?? "送信に失敗しました");
    }
  }

  async function handleSyncFromCloud() {
    setSyncing(true);
    setSyncMessage(null);
    const result = await syncFromSupabase();
    setSyncing(false);
    if (result) {
      setSyncMessage(`${result.synced} 件のデータをクラウドから同期しました`);
      // localStorage が更新されたのでページをリロードして UI を反映
      setTimeout(() => window.location.reload(), 1500);
    } else {
      setSyncMessage("同期に失敗しました ネットワークを確認してください。");
    }
  }

  return (
    <section
      aria-labelledby="settings-account-heading"
      className="rounded-2xl border border-border bg-card/50 p-5 sm:p-6"
    >
      <h2
        id="settings-account-heading"
        className="mb-4 flex items-center gap-2 border-l-[3px] border-primary/70 pl-4 text-base font-bold text-foreground leading-snug"
      >
        <Cloud className="h-4 w-4 text-primary/70" aria-hidden="true" />
        クラウド同期
      </h2>

      {authState.isAnonymous ? (
        /* ── 匿名ユーザー: メール登録を促す ─────────────────────── */
        <div className="space-y-4">
          <div className="rounded-xl border border-amber-400/20 bg-amber-500/[0.05] p-4">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
              <CloudOff className="h-3.5 w-3.5" aria-hidden="true" />
              データはこの端末にのみ保存されています
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              メールアドレスを登録すると、複数端末でデータを同期・引き継ぎできます
            </p>
          </div>

          {!emailSent ? (
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                メールアドレスで登録（パスワード不要）
              </p>
              <div className="flex gap-2">
                <input
                  id="account-email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setEmailError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void handleSendMagicLink();
                  }}
                  placeholder="your@email.com"
                  autoComplete="email"
                  inputMode="email"
                  className="flex-1 rounded-lg border border-border bg-card/60 px-3 py-2 text-sm text-foreground placeholder-muted-foreground/50 focus:border-primary/60 focus:outline-none focus:ring-1 focus:ring-primary/20"
                />
                <button
                  onClick={() => void handleSendMagicLink()}
                  disabled={emailLoading || !email}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:opacity-90 disabled:opacity-50"
                >
                  {emailLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Mail className="h-4 w-4" aria-hidden="true" />
                  )}
                  送信
                </button>
              </div>
              {emailError && (
                <p className="text-xs text-red-400" role="alert">
                  {emailError}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                確認メールのリンクをクリックするだけで登録完了
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/[0.05] p-4">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                <Check className="h-4 w-4" aria-hidden="true" />
                確認メールを送信しました
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {email} のメールに届いたリンクをクリックして登録を完了してください
              </p>
            </div>
          )}
        </div>
      ) : (
        /* ── 登録済みユーザー: 同期状態 + 取り込みボタン ──────── */
        <div className="space-y-4">
          <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/[0.05] p-4">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <User className="h-3.5 w-3.5" aria-hidden="true" />
              クラウドバックアップ有効
            </p>
            {authState.email && (
              <p className="mt-1 text-xs text-muted-foreground">
                {authState.email}
              </p>
            )}
          </div>

          <p className="text-sm text-muted-foreground">
            別の端末で記録したデータをこの端末に取り込む場合は、クラウドから同期してください
          </p>

          <button
            onClick={() => void handleSyncFromCloud()}
            disabled={syncing}
            className="inline-flex items-center gap-2 rounded-full border border-primary/25 px-5 py-2.5 text-sm font-medium text-primary/80 transition-colors hover:border-primary/40 hover:text-primary/70 disabled:opacity-50"
          >
            {syncing ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
            )}
            {syncing ? "同期中..." : "クラウドから同期"}
          </button>

          {syncMessage && (
            <p className="text-xs text-muted-foreground">{syncMessage}</p>
          )}
        </div>
      )}
    </section>
  );
}
