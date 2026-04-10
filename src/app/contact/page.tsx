import type { Metadata } from "next";
import { Mail } from "lucide-react";
import { Breadcrumb } from "@/components/Breadcrumb";

export const metadata: Metadata = {
  title: "お問い合わせ",
  description:
    "SleepForecast へのお問い合わせ方法をご案内します。ご質問・ご要望は 3 営業日以内に回答いたします。",
};

export default function ContactPage() {
  return (
    <div className="container mx-auto max-w-[680px] px-5 pb-20 pt-10 sm:pt-14">
      <Breadcrumb items={[{ name: "ホーム", href: "/" }, { name: "お問い合わせ" }]} />

      <h1 className="mb-8 text-2xl font-bold tracking-tight text-[#e6e8ee] sm:text-3xl">
        お問い合わせ
      </h1>

      <div className="space-y-8 text-sm leading-relaxed text-[#e6e8ee]/90">
        <p>
          SleepForecast をご利用いただきありがとうございます。
          ご質問、ご要望、不具合のご報告などがございましたら、以下の方法でお気軽にお問い合わせください。
        </p>

        {/* メール */}
        <section className="rounded-xl border border-white/[0.08] bg-[#1a1f2e] p-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/15 text-indigo-300">
              <Mail className="h-5 w-5" aria-hidden="true" />
            </div>
            <h2 className="text-base font-bold text-[#e6e8ee]">メールでのお問い合わせ</h2>
          </div>
          <p className="mb-4">
            以下のメールアドレスまでお問い合わせ内容をお送りください。
          </p>
          <a
            href="mailto:contact@sleep-forecast.example.com"
            className="inline-flex items-center gap-2 rounded-lg border border-indigo-300/20 bg-indigo-500/10 px-4 py-2.5 text-sm font-medium text-indigo-200 transition-colors hover:border-indigo-300/40 hover:bg-indigo-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f1117]"
          >
            <Mail className="h-4 w-4" aria-hidden="true" />
            contact@sleep-forecast.example.com
          </a>
        </section>

        {/* 回答について */}
        <section>
          <h2 className="mb-4 border-l-[3px] border-indigo-400/70 pl-4 text-lg font-bold text-[#e6e8ee]">
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
        <section>
          <h2 className="mb-4 border-l-[3px] border-indigo-400/70 pl-4 text-lg font-bold text-[#e6e8ee]">
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
        <p className="mt-6 text-xs leading-relaxed text-[#8b92a5]">
          ※ 本サービスは医療行為・診断を目的としたものではありません。
          健康に関するご相談は医療機関にお問い合わせください。
        </p>
      </div>
    </div>
  );
}
