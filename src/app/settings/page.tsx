import type { Metadata } from "next";
import { Settings } from "lucide-react";
import { Breadcrumb } from "@/components/Breadcrumb";
import { SettingsForm } from "@/components/SettingsForm";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://sleep-forecast.vercel.app";

export const metadata: Metadata = {
  title: "設定",
  description: "都道府県・データ管理などの設定を行います。",
  robots: { index: false, follow: false },
  alternates: { canonical: `${SITE_URL}/settings` },
};

export default function SettingsPage() {
  return (
    <div className="container mx-auto max-w-[680px] px-5 pb-20">
      {/* グラデーション・ミニヒーロー */}
      <div className="relative mb-10 rounded-b-[2rem] bg-gradient-to-b from-indigo-500/[0.06] via-purple-500/[0.03] to-transparent pb-8 pt-10 sm:pt-14 px-5">
        <div className="mb-3 flex justify-center">
          <Settings className="h-8 w-8 text-indigo-300/60" aria-hidden="true" />
        </div>
        <h1 className="text-center text-2xl font-bold tracking-tight text-[#e6e8ee] sm:text-3xl">
          設定
        </h1>
        <div className="mt-6 h-px bg-gradient-to-r from-transparent via-indigo-400/30 to-transparent" />
      </div>

      <Breadcrumb items={[{ name: "ホーム", href: "/" }, { name: "設定" }]} />

      <SettingsForm />
    </div>
  );
}
