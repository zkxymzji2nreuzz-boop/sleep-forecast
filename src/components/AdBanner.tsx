"use client";

import { useEffect, useRef } from "react";

type Props = {
  /** AdSense 広告スロット ID */
  slot: string;
  /** 広告フォーマット */
  format?: "auto" | "rectangle" | "horizontal";
  /** 追加の CSS クラス */
  className?: string;
};

/**
 * Google AdSense 広告バナー。
 * - ADSENSE_CLIENT 設定時: AdSense 広告を描画
 * - 開発環境 + 未設定時: プレースホルダーを表示
 * - 本番 + 未設定時: 高さゼロの非表示 div
 */
export function AdBanner({ slot, format = "auto", className = "" }: Props) {
  const adsenseClient = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
  const adRef = useRef<HTMLModElement>(null);
  const pushed = useRef(false);

  useEffect(() => {
    if (!adsenseClient || pushed.current) return;

    try {
      const w = window as Window & { adsbygoogle?: unknown[] };
      (w.adsbygoogle = w.adsbygoogle || []).push({});
      pushed.current = true;
    } catch {
      // AdSense が読み込まれていない場合は無視
    }
  }, [adsenseClient]);

  // AdSense 設定済み: 広告を描画
  if (adsenseClient) {
    return (
      <div className={`rounded-2xl overflow-hidden ${className}`}>
        <ins
          ref={adRef}
          className="adsbygoogle block"
          style={{ display: "block" }}
          data-ad-client={adsenseClient}
          data-ad-slot={slot}
          data-ad-format={format}
          data-full-width-responsive="true"
        />
      </div>
    );
  }

  // 開発環境: プレースホルダー表示
  if (process.env.NODE_ENV === "development") {
    return (
      <div
        aria-hidden="true"
        className="rounded-xl border border-dashed border-white/[0.06] bg-white/[0.02] py-6 flex items-center justify-center text-xs text-[#8b92a5]/50"
      >
        広告スペース
      </div>
    );
  }

  // 本番 + 未設定: レイアウトに影響を与えない空要素
  return <div aria-hidden="true" className="h-0 overflow-hidden" />;
}
