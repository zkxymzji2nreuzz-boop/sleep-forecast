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
 * NEXT_PUBLIC_ADSENSE_CLIENT が未設定の場合は高さゼロの非表示 div を描画し、
 * レイアウトに影響を与えない。
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

  // AdSense 未設定時: レイアウトに影響を与えない空要素
  if (!adsenseClient) {
    return <div aria-hidden="true" className="h-0 overflow-hidden" />;
  }

  return (
    <div className={className}>
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
