import type { Metadata } from "next";
import { WifiOff } from "lucide-react";

export const metadata: Metadata = {
  title: "オフライン | SleepForecast",
  robots: { index: false, follow: false },
};

export default function OfflinePage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-5 text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary/[0.07]">
        <WifiOff className="h-8 w-8 text-primary/70" aria-hidden="true" />
      </div>
      <h1 className="mb-3 text-2xl font-bold text-foreground">
        オフラインです
      </h1>
      <p className="mb-8 max-w-sm text-sm leading-relaxed text-muted-foreground">
        インターネット接続が見つかりません。
        接続を確認してから再度お試しください。
      </p>
      <a
        href="/"
        className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-primary to-primary/60 px-6 py-2.5 text-sm font-medium text-white shadow-lg shadow-primary/20 transition-colors hover:opacity-90"
      >
        トップページへ戻る
      </a>
    </div>
  );
}
