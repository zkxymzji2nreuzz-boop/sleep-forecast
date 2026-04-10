import type { Metadata } from "next";
import { ExternalLink, Info } from "lucide-react";
import { Breadcrumb } from "@/components/Breadcrumb";

export const metadata: Metadata = {
  title: "お問い合わせ",
  description:
    "SleepForecast へのお問い合わせ方法をご案内します。ご質問・ご要望は 3 営業日以内に回答いたします。",
};

export default function ContactPage() {
  return (
    <div className="container mx-auto max-w-[680px] px-5 pb-20">
      {/* グラデーション・ミニヒーロー */}
      <div className="relative mb-10 rounded-b-[2rem] bg-gradient-to-b from-indigo-500/[0.06] via-purple-500/[0.03] to-transparent pb-8 pt-10 sm:pt-14 px-5">
        <div className="mb-3 flex justify-center">
          <ExternalLink className="h-8 w-8 text-indigo-300/60" aria-hidden="true" />
        </div>
        <h1 className="text-center text-2xl font-bold tracking-tight text-[#e6e8ee] sm:text-3xl">
          お問い合わせ
        </h1>
        <div className="mt-6 h-px bg-gradient-to-r from-transparent via-indigo-400/30 to-transparent" />
      </div>

      <Breadcrumb items={[{ name: "ホーム", href: "/" }, { name: "お問い合わせ" }]} />

      <div className="space-y-14 text-sm leading-[1.85] text-[#e6e8ee]/85">
        <p>
          SleepForecast をご利用いただきありがとうございます。
          ご質問、ご要望、不具合のご報告などがございましたら、以下の方法でお気軽にお問い合わせください。
        </p>

        {/* Google フォーム CTA カード */}
        <section className="rounded-3xl border border-indigo-300/20 bg-gradient-to-br from-indigo-500/10 via-purple-500/[0.06] to-transparent p-6 sm:p-8">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/15 text-indigo-300">
              <ExternalLink className="h-5 w-5" aria-hidden="true" />
            </div>
            <h2 className="text-base font-bold text-[#e6e8ee]">フォームからお問い合わせ</h2>
          </div>
          <p className="mb-4">
            以下のフォームからお問い合わせ内容をお送りください。
          </p>
          <a
            href="https://forms.gle/5FzeXL1QGFLCD9jZ8"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-indigo-500/20 transition-colors hover:from-indigo-400 hover:to-purple-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f1117]"
          >
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
            お問い合わせフォームを開く
          </a>
        </section>

        {/* 回答について */}
        <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 sm:p-6">
          <h2 className="mb-4 border-l-[3px] border-indigo-400/70 pl-4 text-lg font-bold text-[#e6e8ee] leading-snug">
            回答について
          </h2>
          <ul className="list-inside list-disc space-y-2 text-[#e6e8ee]/85">
            <li>
              お問い合わせへの回答は、原則として
              <strong className="font-semibold text-[#e6e8ee]">3 営業日以内</strong>
              に行います。
            </li>
            <li>
              内容によっては回答にお時間をいただく場合がございます。あらかじめご了承ください。
            </li>
            <li>
              お問い合わせの内容によっては、回答を控えさせていただく場合がございます。
            </li>
          </ul>
        </section>

        {/* お願い */}
        <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 sm:p-6">
          <h2 className="mb-4 border-l-[3px] border-indigo-400/70 pl-4 text-lg font-bold text-[#e6e8ee] leading-snug">
            お問い合わせ時のお願い
          </h2>
          <p>スムーズな対応のため、以下の情報を添えてお問い合わせください。</p>
          <ul className="mt-3 list-inside list-disc space-y-1.5 text-[#e6e8ee]/85">
            <li>ご利用のブラウザとバージョン</li>
            <li>ご利用のデバイス（PC / スマートフォン / タブレット）</li>
            <li>発生している問題の具体的な内容</li>
            <li>スクリーンショット（可能な場合）</li>
          </ul>
        </section>

        {/* 医療免責 */}
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
          <p className="flex items-start gap-2 text-xs leading-relaxed text-[#8b92a5]">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#8b92a5]" aria-hidden="true" />
            <span>
              本サービスは医療行為・診断を目的としたものではありません。
              健康に関するご相談は医療機関にお問い合わせください。
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
