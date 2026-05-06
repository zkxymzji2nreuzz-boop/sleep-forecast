/**
 * Next.js Middleware — CSP nonce の動的付与
 *
 * リクエストごとに一意の nonce を生成し、
 *   1. Content-Security-Policy レスポンスヘッダーに 'nonce-{nonce}' として挿入
 *   2. x-nonce リクエストヘッダーとして下流（layout.tsx）に渡す
 *
 * これにより script-src の 'unsafe-inline' を排除し、
 * nonce を持つスクリプトのみ実行を許可する。
 *
 * 除外対象（CSP 不要な静的アセット）:
 *   - _next/static / _next/image
 *   - Service Worker (sw.js, workbox-*.js)
 *   - 画像・フォントファイル
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest): NextResponse {
  // API ルート: CSP nonce 不要（JSON レスポンスには CSP が意味を持たない）
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // リクエストごとに一意の nonce を生成（Edge Runtime 互換）
  const nonce = btoa(crypto.randomUUID());

  const csp = [
    "default-src 'self'",
    // 'unsafe-inline' を排除し nonce + strict-dynamic に移行
    // 'strict-dynamic': nonce 付きスクリプトが動的に読み込むスクリプトも許可
    // ホワイトリストは古いブラウザ向けフォールバック
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://www.googletagmanager.com https://va.vercel-scripts.com`,
    // style-src: Tailwind CSS + shadcn/ui の動的スタイルに unsafe-inline が必要
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self'",
    "connect-src 'self' https://www.google-analytics.com https://analytics.google.com https://www.googletagmanager.com https://vitals.vercel-insights.com https://va.vercel-scripts.com https://*.supabase.co wss://*.supabase.co",
    "frame-src 'none'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self' https://formspree.io",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
  ].join("; ");

  // x-nonce ヘッダーで layout.tsx に nonce を伝える
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  response.headers.set("Content-Security-Policy", csp);

  return response;
}

export const config = {
  matcher: [
    /*
     * 以下を除外してミドルウェアを適用:
     * - _next/static    静的ファイル
     * - _next/image     画像最適化
     * - favicon.ico
     * - sw.js / workbox-*.js  PWA Service Worker
     * - 画像・フォント拡張子
     */
    "/((?!_next/static|_next/image|favicon\\.ico|sw\\.js|workbox-[^.]+\\.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)",
  ],
};
