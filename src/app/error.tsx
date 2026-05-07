"use client";

/**
 * Next.js App Router グローバルエラーバウンダリ。
 * ページ・コンポーネントで補足されなかったエラーをキャッチして
 * ユーザーフレンドリーなエラー画面を表示する。
 */

import { useEffect } from "react";
import { RefreshCw, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // エラーをログに残す（本番では Sentry 等に送信）
    console.error("[GlobalError]", error);
  }, [error]);

  const isNetworkError =
    error.message.includes("ネットワーク") ||
    error.message.includes("タイムアウト") ||
    error.message.includes("fetch");

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center">
      <div className="mb-4 rounded-full bg-muted p-4">
        <WifiOff className="h-8 w-8 text-muted-foreground" />
      </div>

      <h1 className="text-xl font-semibold text-foreground mb-2">
        {isNetworkError ? "気象データを取得できませんでした" : "エラーが発生しました"}
      </h1>

      <p className="text-sm text-muted-foreground mb-6 max-w-xs">
        {isNetworkError
          ? "ネットワーク接続を確認してから、もう一度お試しください。"
          : "予期しないエラーが発生しました。ページを再読み込みしてください。"}
      </p>

      <Button onClick={reset} variant="outline" className="gap-2">
        <RefreshCw className="h-4 w-4" />
        再試行する
      </Button>

      <p className="mt-4 text-xs text-muted-foreground/60">
        ※ このアプリは医療行為・診断を行うものではありません
      </p>
    </div>
  );
}
