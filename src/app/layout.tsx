import type { Metadata, Viewport } from "next";
import "./globals.css";

import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { GoogleAnalytics } from "@/components/GoogleAnalytics";
import { Toaster } from "@/components/ui/toaster";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://sleep-forecast.vercel.app";
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "SleepForecast | 眠れる明日予報",
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
    "眠れる明日予報",
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
    title: "SleepForecast | 眠れる明日予報",
    description:
      "気温・湿度・気圧・月齢から明日の眠気を予測する、ウェアラブル不要の睡眠予測アプリ",
    images: [{ url: "/og-default.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "SleepForecast | 眠れる明日予報",
    description:
      "気温・湿度・気圧・月齢から明日の眠気を予測する、ウェアラブル不要の睡眠予測アプリ",
    images: ["/og-default.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#0f1117",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className="dark">
      <body className="bg-[#0f1117] text-[#e6e8ee] antialiased">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-[#1d9bf0] focus:px-4 focus:py-2 focus:text-white focus:outline-none"
        >
          メインコンテンツへスキップ
        </a>
        <div className="flex min-h-screen flex-col">
          <Header />
          <main id="main-content" className="min-h-[calc(100vh-128px)] flex-1">{children}</main>
          <Footer />
        </div>
        <GoogleAnalytics />
        <Toaster />
      </body>
    </html>
  );
}
