"use client";

/**
 * DemoModeBanner — デモモード中にページ上部に表示するバナー。
 * ?demo=N を検出した場合にのみレンダリングされる。
 * ×ボタンで非表示にできる（セッション内のみ、localStorage への保存なし）。
 */

import { useState } from "react";
import { FlaskConical, X } from "lucide-react";

type Props = {
  recordCount: number;
};

export function DemoModeBanner({ recordCount }: Props) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="mb-5 flex items-center gap-3 rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm"
    >
      <FlaskConical
        className="h-4 w-4 shrink-0 text-amber-400"
        aria-hidden="true"
      />
      <p className="flex-1 leading-snug text-amber-200">
        <span className="font-semibold">デモモード</span>
        <span className="ml-2 text-amber-300/80">
          {recordCount} 日分のサンプルデータで表示中。本番データには影響しません。
        </span>
        <span className="ml-2 text-amber-400/60 text-xs">
          /?demo=7 や /?demo=30 でも試せます
        </span>
      </p>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="ml-2 shrink-0 rounded text-amber-400/60 transition-colors hover:text-amber-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-400"
        aria-label="デモモードバナーを閉じる"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
