"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import { usePathname } from "next/navigation";
import { COOKIE_CONSENT_KEY, type CookieConsentValue } from "@/components/CookieConsent";

/**
 * Google Analytics 4 トラッキング（Client Component）。
 *
 * - NEXT_PUBLIC_GA_ID が未設定の場合は何も描画しない
 * - Cookie 同意（sf_cookie_consent = "accepted"）がない場合はスクリプトを読み込まない
 * - 同意状態が変わると sf_cookie_consent_change イベントで再評価する
 */
type Props = {
  /** middleware.ts が生成した CSP nonce。Script タグに付与して unsafe-inline を回避する */
  nonce?: string;
};

export function GoogleAnalytics({ nonce }: Props) {
  const gaId = process.env.NEXT_PUBLIC_GA_ID;
  const pathname = usePathname();
  const [consented, setConsented] = useState(false);

  useEffect(() => {
    // 初回マウント時に同意状態を確認
    const stored = localStorage.getItem(COOKIE_CONSENT_KEY) as CookieConsentValue | null;
    setConsented(stored === "accepted");

    // 同意状態が変わったときに追従する
    function onConsentChange(e: Event) {
      const value = (e as CustomEvent<CookieConsentValue>).detail;
      setConsented(value === "accepted");
    }
    window.addEventListener("sf_cookie_consent_change", onConsentChange);
    return () => window.removeEventListener("sf_cookie_consent_change", onConsentChange);
  }, []);

  useEffect(() => {
    if (!gaId || !consented || typeof window === "undefined") return;
    const w = window as Window & { gtag?: (...args: unknown[]) => void };
    w.gtag?.("config", gaId, { page_path: pathname });
  }, [pathname, gaId, consented]);

  if (!gaId || !consented) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
        strategy="afterInteractive"
        nonce={nonce}
      />
      <Script id="ga-init" strategy="afterInteractive" nonce={nonce}>
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${gaId}', { page_path: window.location.pathname });
        `}
      </Script>
    </>
  );
}
