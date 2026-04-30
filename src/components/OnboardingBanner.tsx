"use client";

/**
 * OnboardingBanner — 記録ゼロの新規ユーザー向けオンボーディングバナー。
 *
 * - 記録が 0 件かつ onboarding_dismissed が localStorage にない場合に表示
 * - 閉じるボタンで非表示（localStorage に dismissed を記録）
 * - SSR / CSR ハイドレーション対策: mounted フラグで制御
 */

import * as React from "react";
import Link from "next/link";
import { ArrowRight, Moon, X } from "lucide-react";
import { getRecords, ONBOARDING_DISMISSED_KEY } from "@/lib/storage";

export function OnboardingBanner() {
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    const dismissed = localStorage.getItem(ONBOARDING_DISMISSED_KEY);
    if (dismissed) return;
    const records = getRecords();
    if (records.length === 0) {
      setVisible(true);
    }
  }, []);

  function handleDismiss() {
    localStorage.setItem(ONBOARDING_DISMISSED_KEY, "1");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="banner"
      className="mb-8 rounded-2xl border border-indigo-400/30 bg-gradient-to-br from-indigo-500/10 via-purple-500/[0.06] to-transparent p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <p className="mb-1 flex items-center gap-2 text-sm font-bold text-[#e6e8ee]">
            <Moon className="h-4 w-4 text-indigo-300" aria-hidden="true" />
            はじめましょう
          </p>
          <p className="mb-3 text-xs leading-relaxed text-[#9ba3b5]">
            まずは今日の眠りを記録してみましょう。15秒で完了します。
          </p>
          <Link
            href="/record"
            className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 px-4 py-2 text-xs font-medium text-white shadow-lg shadow-indigo-500/20 transition-colors hover:from-indigo-400 hover:to-purple-400"
          >
            記録を始める
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
        <button
          onClick={handleDismiss}
          aria-label="バナーを閉じる"
          className="flex flex-shrink-0 items-center justify-center min-h-[44px] min-w-[44px] rounded-full p-3 text-[#9ba3b5] transition-colors hover:text-[#e6e8ee]"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
