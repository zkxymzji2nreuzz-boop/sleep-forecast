import type { Metadata, Viewport } from "next";
import "./globals.css";

import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
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
        <div className="flex min-h-screen flex-col">
          <Header />
          <main className="min-h-[calc(100vh-128px)] flex-1">{children}</main>
          <Footer />
        </div>
        <Toaster />
      </body>
    </html>
  );
}
