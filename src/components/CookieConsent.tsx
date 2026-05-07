"use client";

/**
 * Cookie 同意バナー（Client Component）。
 *
 * - GDPR / 改正電気通信事業法（プロバイダー告知義務）対応
 * - localStorage キー `sf_cookie_consent` に "accepted" / "rejected" を保存
 * - 未決定のユーザーにのみ画面下部に表示
 * - 同意状態は /settings の「Cookie 設定」セクションからいつでも変更可能
 */

import * as React from "react";
import Link from "next/link";
import { Cookie, X } from "lucide-react";

export const COOKIE_CONSENT_KEY = "sf_cookie_consent";
export type CookieConsentValue = "accepted" | "rejected";

/** localStorage から同意状態を読み取る（SSR 安全）。 */
export function getCookieConsent(): CookieConsentValue | null {
  if (typeof window === "undefined") return null;
  const v = localStorage.getItem(COOKIE_CONSENT_KEY);
  if (v === "accepted" || v === "rejected") return v;
  return null;
}

/** 同意状態を保存し、カスタムイベントで他コンポーネントに通知する。 */
export function setCookieConsent(value: CookieConsentValue): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(COOKIE_CONSENT_KEY, value);
  window.dispatchEvent(new CustomEvent("sf_cookie_consent_change", { detail: value }));
}

export function CookieConsent() {
  const [show, setShow] = React.useState(false);

  React.useEffect(() => {
    // マウント後に未決定かどうかを確認
    if (getCookieConsent() === null) {
      setShow(true);
    }
  }, []);

  if (!show) return null;

  function handleAccept() {
    setCookieConsent("accepted");
    setShow(false);
  }

  function handleReject() {
    setCookieConsent("rejected");
    setShow(false);
  }

  return (
    <div
      role="dialog"
      aria-label="Cookie の使用について"
      aria-modal="false"
      className="fixed bottom-[4.5rem] left-0 right-0 z-50 mx-auto max-w-screen-md px-3 pb-2 md:bottom-4"
    >
      <div className="rounded-2xl border border-primary/15 bg-card/95 px-5 py-4 shadow-xl shadow-black/40 backdrop-blur-md sm:flex sm:items-start sm:gap-5">
        {/* アイコン */}
        <div className="mb-3 flex shrink-0 items-center gap-2 sm:mb-0">
          <Cookie className="h-5 w-5 text-primary/70" aria-hidden="true" />
        </div>

        {/* 本文 */}
        <div className="flex-1 text-sm leading-relaxed text-foreground/80">
          <p>
            このサイトは利便性の向上・アクセス分析のため{" "}
            <strong className="font-semibold text-foreground">Cookie（Google Analytics）</strong>
            を使用しています。「同意する」を押すと Cookie の利用に同意したことになります。
            詳しくは{" "}
            <Link
              href="/privacy"
              className="underline underline-offset-2 hover:text-primary/80 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/80 focus-visible:ring-offset-1 focus-visible:ring-offset-card"
            >
              プライバシーポリシー
            </Link>
            をご覧ください。
          </p>
        </div>

        {/* ボタン群 */}
        <div className="mt-3 flex shrink-0 flex-wrap items-center gap-2 sm:mt-0">
          <button
            type="button"
            onClick={handleAccept}
            className="rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/80 focus-visible:ring-offset-2 focus-visible:ring-offset-card"
          >
            同意する
          </button>
          <button
            type="button"
            onClick={handleReject}
            className="rounded-full border border-border/60 px-4 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-border hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border focus-visible:ring-offset-2 focus-visible:ring-offset-card"
          >
            拒否する
          </button>
          {/* 閉じる（Escape / バツ = 何もしない＝未決定のまま非表示） */}
          <button
            type="button"
            onClick={() => setShow(false)}
            aria-label="バナーを閉じる（後で設定から変更できます）"
            className="rounded-full p-1 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
