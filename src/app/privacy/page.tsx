import type { Metadata } from "next";
import { Shield, Calendar } from "lucide-react";
import { Breadcrumb } from "@/components/Breadcrumb";

export const metadata: Metadata = {
  title: "プライバシーポリシー",
  description:
    "SleepForecast のプライバシーポリシー。個人情報の取り扱い、Cookie の使用、データ保存について説明します。",
};

export default function PrivacyPage() {
  return (
    <div className="container mx-auto max-w-[680px] px-5 pb-20">
      {/* グラデーション・ミニヒーロー */}
      <div className="relative mb-10 rounded-b-[2rem] bg-gradient-to-b from-indigo-500/[0.06] via-purple-500/[0.03] to-transparent pb-8 pt-10 sm:pt-14 px-5">
        <div className="mb-3 flex justify-center">
          <Shield className="h-8 w-8 text-indigo-300/60" aria-hidden="true" />
        </div>
        <h1 className="text-center text-2xl font-bold tracking-tight text-[#e6e8ee] sm:text-3xl">
          プライバシーポリシー
        </h1>
        <div className="mt-6 h-px bg-gradient-to-r from-transparent via-indigo-400/30 to-transparent" />
      </div>

      <Breadcrumb
        items={[{ name: "ホーム", href: "/" }, { name: "プライバシーポリシー" }]}
      />

      {/* 更新日表示 */}
      <div className="mb-10 flex items-center gap-1.5 text-sm text-[#8b92a5]">
        <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
        最終更新日: 2026年4月10日
      </div>

      <div className="space-y-14 text-sm leading-[1.85] text-[#e6e8ee]/85">
        {/* 基本方針 */}
        <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 sm:p-6">
          <h2 className="mb-4 border-l-[3px] border-indigo-400/70 pl-4 text-lg font-bold text-[#e6e8ee] leading-snug">
            1. 基本方針
          </h2>
          <p>
            SleepForecast（以下「本サービス」）は、ユーザーの皆さまのプライバシーを尊重し、
            個人情報の保護に努めます。本プライバシーポリシーは、本サービスにおける
            情報の取り扱いについて説明するものです。
          </p>
        </section>

        {/* 収集する情報 */}
        <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 sm:p-6">
          <h2 className="mb-4 border-l-[3px] border-indigo-400/70 pl-4 text-lg font-bold text-[#e6e8ee] leading-snug">
            2. 収集する情報
          </h2>
          <p className="mb-3">
            本サービスは、氏名・メールアドレス・住所等の個人を特定できる情報を収集しません。
          </p>
          <p>ユーザーが入力する以下の情報は、すべてブラウザの localStorage に保存され、
            外部サーバーには送信されません。</p>
          <ul className="mt-3 list-inside list-disc space-y-1.5 text-[#e6e8ee]/85">
            <li>睡眠品質の記録（5 段階評価）</li>
            <li>選択した都道府県（緯度経度の精度は都道府県レベルのみ）</li>
            <li>気象データ（Open-Meteo API から自動取得）</li>
          </ul>
        </section>

        {/* データ保存 */}
        <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 sm:p-6">
          <h2 className="mb-4 border-l-[3px] border-indigo-400/70 pl-4 text-lg font-bold text-[#e6e8ee] leading-snug">
            3. データの保存について（localStorage）
          </h2>
          <p>
            本サービスの睡眠記録・設定データは、お使いのブラウザの localStorage に保存されます。
            データはユーザーのデバイス内にのみ存在し、当方のサーバーに送信・保存されることはありません。
          </p>
          <p className="mt-3">
            ブラウザのデータを消去した場合、記録されたデータは失われます。
            データのバックアップが必要な場合は、設定画面のエクスポート機能をご利用ください。
          </p>
        </section>

        {/* アクセス解析 */}
        <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 sm:p-6">
          <h2 className="mb-4 border-l-[3px] border-indigo-400/70 pl-4 text-lg font-bold text-[#e6e8ee] leading-snug">
            4. アクセス解析（Google Analytics 4）
          </h2>
          <p>
            本サービスでは、利用状況の把握とサービス改善を目的として、Google LLC が提供する
            Google Analytics 4 を使用しています。Google Analytics は Cookie を使用して
            ユーザーのアクセス情報を収集しますが、個人を特定する情報は含まれません。
          </p>
          <p className="mt-3">
            収集されたデータは Google のプライバシーポリシーに基づいて管理されます。
            詳細は{" "}
            <a
              href="https://policies.google.com/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-300 underline decoration-indigo-400/40 underline-offset-4 hover:decoration-indigo-300"
            >
              Google プライバシーポリシー
            </a>
            をご覧ください。
          </p>
        </section>

        {/* 広告 */}
        <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 sm:p-6">
          <h2 className="mb-4 border-l-[3px] border-indigo-400/70 pl-4 text-lg font-bold text-[#e6e8ee] leading-snug">
            5. 広告配信（Google AdSense）
          </h2>
          <p>
            本サービスでは、Google LLC が提供する Google AdSense を利用して広告を配信する場合があります。
            Google AdSense は、ユーザーの興味に基づいた広告を表示するために Cookie を使用することがあります。
          </p>
          <p className="mt-3">
            ユーザーは、Google の広告設定ページ（
            <a
              href="https://adssettings.google.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-300 underline decoration-indigo-400/40 underline-offset-4 hover:decoration-indigo-300"
            >
              ads settings
            </a>
            ）からパーソナライズ広告を無効にすることができます。
          </p>
        </section>

        {/* 位置情報 */}
        <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 sm:p-6">
          <h2 className="mb-4 border-l-[3px] border-indigo-400/70 pl-4 text-lg font-bold text-[#e6e8ee] leading-snug">
            6. 位置情報の取り扱い
          </h2>
          <p>
            本サービスでは、気象データを取得するために都道府県単位の位置情報を使用します。
            GPS による正確な緯度・経度は取得・保存しません。
            選択された都道府県コードのみがブラウザの localStorage に保存されます。
          </p>
        </section>

        {/* 第三者への提供 */}
        <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 sm:p-6">
          <h2 className="mb-4 border-l-[3px] border-indigo-400/70 pl-4 text-lg font-bold text-[#e6e8ee] leading-snug">
            7. 第三者への情報提供
          </h2>
          <p>
            本サービスは、法令に基づく場合を除き、ユーザーの情報を第三者に提供することはありません。
          </p>
        </section>

        {/* 改定 */}
        <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 sm:p-6">
          <h2 className="mb-4 border-l-[3px] border-indigo-400/70 pl-4 text-lg font-bold text-[#e6e8ee] leading-snug">
            8. プライバシーポリシーの変更
          </h2>
          <p>
            本プライバシーポリシーは、必要に応じて内容を見直し、変更することがあります。
            変更後のプライバシーポリシーは、本ページに掲載した時点から効力を生じるものとします。
          </p>
        </section>

        {/* お問い合わせ */}
        <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 sm:p-6">
          <h2 className="mb-4 border-l-[3px] border-indigo-400/70 pl-4 text-lg font-bold text-[#e6e8ee] leading-snug">
            9. お問い合わせ
          </h2>
          <p>
            本ポリシーに関するお問い合わせは、
            <a
              href="/contact"
              className="text-indigo-300 underline decoration-indigo-400/40 underline-offset-4 hover:decoration-indigo-300"
            >
              お問い合わせページ
            </a>
            よりご連絡ください。
          </p>
        </section>
      </div>
    </div>
  );
}
