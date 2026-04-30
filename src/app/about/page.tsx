import type { Metadata } from "next";
import { Moon, Info } from "lucide-react";
import { Breadcrumb } from "@/components/Breadcrumb";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://sleep-forecast.vercel.app";

export const metadata: Metadata = {
  title: "運営者情報",
  description:
    "SleepForecastの運営者情報・開発ストーリー・お問い合わせ先をご案内します。",
  alternates: { canonical: `${SITE_URL}/about` },
};

export default function AboutPage() {
  return (
    <div className="container mx-auto max-w-[680px] px-5 pb-20">
      {/* グラデーション・ミニヒーロー */}
      <div className="relative mb-10 rounded-b-[2rem] bg-gradient-to-b from-indigo-500/[0.06] via-purple-500/[0.03] to-transparent pb-8 pt-10 sm:pt-14 px-5">
        <div className="mb-3 flex justify-center">
          <Moon className="h-8 w-8 text-indigo-300/60" aria-hidden="true" />
        </div>
        <h1 className="text-center text-2xl font-bold tracking-tight text-[#e6e8ee] sm:text-3xl">
          運営者情報
        </h1>
        <div className="mt-6 h-px bg-gradient-to-r from-transparent via-indigo-400/30 to-transparent" />
      </div>

      <Breadcrumb items={[{ name: "ホーム", href: "/" }, { name: "運営者情報" }]} />

      <div className="space-y-14 text-sm leading-[1.85] text-[#e6e8ee]/85">
        {/* SleepForecast について */}
        <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 sm:p-6">
          <h2 className="mb-4 border-l-[3px] border-indigo-400/70 pl-4 text-lg font-bold text-[#e6e8ee] leading-snug">
            SleepForecast について
          </h2>
          <p>
            SleepForecastは、気温・湿度・気圧・月齢などの気象データと
            日々の睡眠記録を組み合わせて「明日の眠気レベル」を予測する、ウェアラブル不要の
            ヘルスケア Web アプリです。
          </p>
          <p className="mt-3">
            高価なデバイスを買わなくても、ブラウザひとつで毎朝 15 秒の入力を続けるだけで、
            気象があなたの眠りにどう影響しているかを見える化します。
          </p>
        </section>

        {/* 開発ストーリー */}
        <section className="rounded-3xl border border-white/[0.08] bg-gradient-to-br from-indigo-500/[0.06] via-purple-500/[0.03] to-transparent p-6 sm:p-8">
          <h2 className="mb-4 flex items-center gap-2 border-l-[3px] border-indigo-400/70 pl-4 text-lg font-bold text-[#e6e8ee] leading-snug">
            <Moon className="h-5 w-5 text-indigo-300/70" aria-hidden="true" />
            開発ストーリー
          </h2>
          <p>
            開発者の家族に、低気圧や台風が近づくと頭痛や不眠に悩まされる「気象病」を抱えている
            人がいます。「明日は眠れるだろうか」という不安を少しでも和らげたい
            ── そんな思いから SleepForecast は生まれました。
          </p>
          <p className="mt-3">
            既存の気象病対策アプリは通知が中心ですが、SleepForecast は個人の過去データと
            気象データの相関分析を行い、自分だけの「眠りの天気予報」を提供します。
            誰もが自分の体調パターンを理解し、前もって備えられる世界を目指しています。
          </p>
        </section>

        {/* 運営者情報 */}
        <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 sm:p-6">
          <h2 className="mb-4 border-l-[3px] border-indigo-400/70 pl-4 text-lg font-bold text-[#e6e8ee] leading-snug">
            運営者情報
          </h2>
          <dl className="space-y-3">
            <div className="flex gap-4">
              <dt className="w-24 shrink-0 font-medium text-[#a8b0c2]">運営者名</dt>
              <dd>SleepForecast 運営者</dd>
            </div>
            <div className="flex gap-4">
              <dt className="w-24 shrink-0 font-medium text-[#a8b0c2]">サービス名</dt>
              <dd>SleepForecast</dd>
            </div>
            <div className="flex gap-4">
              <dt className="w-24 shrink-0 font-medium text-[#a8b0c2]">お問い合わせ</dt>
              <dd>
                <a
                  href="/contact"
                  className="text-indigo-300 underline decoration-indigo-400/40 underline-offset-4 transition-colors hover:decoration-indigo-300"
                >
                  お問い合わせページ
                </a>
                をご参照ください
              </dd>
            </div>
          </dl>
        </section>

        {/* 目的 */}
        <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 sm:p-6">
          <h2 className="mb-4 border-l-[3px] border-indigo-400/70 pl-4 text-lg font-bold text-[#e6e8ee] leading-snug">
            サービスの目的
          </h2>
          <ul className="list-inside list-disc space-y-2 text-[#e6e8ee]/85">
            <li>気象データと睡眠品質の相関を可視化し、自己理解を促進する</li>
            <li>明日の睡眠品質を予測し、生活リズムの調整に役立てる</li>
            <li>気象病・低気圧頭痛に悩む方に、科学的根拠に基づく情報を提供する</li>
          </ul>
        </section>

        {/* 医療免責 */}
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
          <p className="flex items-start gap-2 text-xs leading-relaxed text-[#a8b0c2]">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#a8b0c2]" aria-hidden="true" />
            <span>
              本サービスは医療行為・診断を目的としたものではありません。
              体調に不安がある場合は医療機関にご相談ください。
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}