"use client";

/**
 * DemoModeBanner — デモモード中にページ上部に表示するバナー。
 * ?demo=N を検出した場合にのみレンダリングされる。
 * ×ボタンで clearDemoMode() を呼び、sessionStorage を消去してリロードする。
 * これによりダッシュボード・記録など全ページでデモが終了する。
 */

import { PlayCircle, X } from "lucide-react";
import { clearDemoMode } from "@/lib/demo";

type Props = {
  recordCount: number;
};

export function DemoModeBanner({ recordCount }: Props) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="mb-5 flex items-center gap-3 rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm"
    >
      <PlayCircle
        className="h-4 w-4 shrink-0 text-amber-400"
        aria-hidden="true"
      />
      <div className="flex-1 min-w-0">
        <p className="leading-snug text-amber-200">
          <span className="font-semibold">デモモード</span>
          <span className="ml-2 text-amber-300/80">
            {recordCount} 日分のサンプルデータで表示中。本番データには影響しません。
          </span>
        </p>
        <p className="text-xs text-amber-400/60 hidden sm:block">
          ナビゲーションしてもデモは継続します
        </p>
      </div>
      <button
        type="button"
        onClick={() => clearDemoMode()}
        className="ml-2 shrink-0 rounded text-amber-400/60 transition-colors hover:text-amber-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-400"
        aria-label="デモモードを終了する"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
