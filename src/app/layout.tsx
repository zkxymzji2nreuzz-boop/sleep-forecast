import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import "./globals.css";

import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { BottomNav } from "@/components/BottomNav";
import { NotificationChecker } from "@/components/NotificationChecker";
import { PwaInstallPrompt } from "@/components/PwaInstallPrompt";
import { GoogleAnalytics } from "@/components/GoogleAnalytics";
import { CookieConsent } from "@/components/CookieConsent";
import { AuthProvider } from "@/components/AuthProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Toaster } from "@/components/ui/toaster";
import { Analytics } from "@vercel/analytics/react";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://sleep-forecast.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "SleepForecast — 気象病・低気圧から、明日の眠りを予報する",
    template: "%s | SleepForecast",
  },
  description:
    "気温・湿度・気圧・月齢から明日の眠気を予測する、ウェアラブル不要の睡眠予測アプリ",
  applicationName: "SleepForecast",
  authors: [{ name: "SleepForecast" }],
  keywords: [
    "睡眠",
    "気象病",
    "気圧",
    "月齢",
    "予測",
    "ヘルスケア",
    "SleepForecast",
    "天気痛",
  ],
  robots: { index: true, follow: true },
  manifest: "/manifest.json",
  verification: {
    google: "EzjzqTWp3ICDwfnB8oYnEBX6seFRUwkVMWTzwGaNURU",
  },
  appleWebApp: {
    capable: true,
    title: "SleepForecast",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    type: "website",
    siteName: "SleepForecast",
    locale: "ja_JP",
    url: SITE_URL,
    title: "SleepForecast — 気象病・低気圧から、明日の眠りを予報する",
    description:
      "気温・湿度・気圧・月齢から明日の眠気を予測する、ウェアラブル不要の睡眠予測アプリ",
    images: [{ url: "/og-default.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "SleepForecast — 気象病・低気圧から、明日の眠りを予報する",
    description:
      "気温・湿度・気圧・月齢から明日の眠気を予測する、ウェアラブル不要の睡眠予測アプリ",
    images: ["/og-default.png"],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FBF9FC" },
    { media: "(prefers-color-scheme: dark)", color: "#15121F" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

/**
 * FOUC対策スクリプト（Flash of Unstyled Content 防止）
 *
 * React hydration より前に実行され、localStorage の値または
 * prefers-color-scheme に基づいて <html> の class を設定する。
 * これにより、ページ読み込み時に「一瞬ライトが光る」現象を防ぐ。
 */
const themeScript = `
(function() {
  try {
    var stored = localStorage.getItem('theme');
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (stored === 'dark' || (!stored && prefersDark)) {
      document.documentElement.classList.add('dark');
    } else if (stored === 'light') {
      document.documentElement.classList.remove('dark');
    } else {
      // stored が null でかつ prefersDark が false → ライト
      document.documentElement.classList.remove('dark');
    }
  } catch(e) {
    // localStorage が使えない場合はダークにフォールバック
    document.documentElement.classList.add('dark');
  }
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // middleware.ts が x-nonce ヘッダーに nonce を設定する
  const nonce = headers().get("x-nonce") ?? "";

  return (
    <html lang="ja" suppressHydrationWarning>
      <head>
        {/* FOUC対策: hydration 前にテーマクラスを適用 */}
        <script
          nonce={nonce || undefined}
          dangerouslySetInnerHTML={{ __html: themeScript }}
        />
      </head>
      <body className="bg-background text-foreground antialiased">
        <ThemeProvider>
          <AuthProvider>
            <a
              href="#main-content"
              className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:outline-none"
            >
              メインコンテンツへスキップ
            </a>
            <div className="flex min-h-screen flex-col pb-20 md:pb-0">
              <Header />
              <main id="main-content" className="min-h-[calc(100vh-128px)] flex-1">{children}</main>
              <Footer />
            </div>
            <BottomNav />
            <PwaInstallPrompt />
            <NotificationChecker />
            <CookieConsent />
            <GoogleAnalytics nonce={nonce} />
            <Toaster />
            <Analytics />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
