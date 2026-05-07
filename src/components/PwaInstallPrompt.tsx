"use client";

/**
 * PwaInstallPrompt
 *
 * ホーム画面へのインストール（A2HS）を促すバナー。
 *
 * 表示条件:
 *   1. beforeinstallprompt イベントが発火した（＝インストール可能な状態）
 *   2. 記録が3件以上ある（ある程度使ってもらったユーザーのみ）
 *   3. 過去に「閉じる」を押していない（localStorage フラグ）
 *   4. 既に PWA としてインストール済みでない（display-mode: standalone）
 *
 * iOS Safari は beforeinstallprompt を発火しないため、
 * iOS 向けには別途 "ホーム画面に追加" 手順を案内する。
 */

import { useEffect, useState } from "react";
import { Smartphone, X } from "lucide-react";
import { getRecords } from "@/lib/storage";

const DISMISSED_KEY = "sf_pwa_prompt_dismissed";

// beforeinstallprompt のインターフェース（TypeScript 標準型には未定義）
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // @ts-expect-error: Safari
    window.navigator.standalone === true
  );
}

function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHint, setShowIosHint] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // 既にインストール済み or 永久非表示 → 何もしない
    if (isStandalone()) return;
    if (localStorage.getItem(DISMISSED_KEY)) return;

    // 記録が3件未満 → 表示しない
    const records = getRecords();
    if (records.length < 3) return;

    // iOS Safari: beforeinstallprompt は発火しないので個別対応
    if (isIos()) {
      setShowIosHint(true);
      setVisible(true);
      return;
    }

    // Android Chrome / Edge 等
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      localStorage.setItem(DISMISSED_KEY, "1");
    }
    setVisible(false);
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, "1");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      className="mx-4 mb-4 rounded-xl border border-primary/15 bg-primary/[0.07] px-4 py-3"
      role="banner"
      aria-label="ホーム画面への追加を促すバナー"
    >
      <div className="flex items-start gap-3">
        <Smartphone className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" aria-hidden="true" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">
            ホーム画面に追加して、さらに使いやすく
          </p>
          {showIosHint ? (
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
              Safariの共有ボタン（
              <span className="font-mono text-primary/80">⬆</span>
              ）→「ホーム画面に追加」でアプリとして使えます。
            </p>
          ) : (
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
              インストールするとオフラインでも閲覧でき、通知も確実に届きます。
            </p>
          )}
          {!showIosHint && (
            <button
              onClick={handleInstall}
              className="mt-2 inline-flex h-7 items-center rounded-md bg-primary px-3 text-xs font-semibold text-white hover:opacity-90 transition-colors"
            >
              インストール
            </button>
          )}
        </div>
        <button
          onClick={handleDismiss}
          className="p-1 rounded-full text-muted-foreground hover:text-foreground flex-shrink-0"
          aria-label="閉じる"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
