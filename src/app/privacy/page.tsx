import type { Metadata } from "next";
import { Shield } from "lucide-react";
import { Breadcrumb } from "@/components/Breadcrumb";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://sleep-forecast.vercel.app";

export const metadata: Metadata = {
  title: "プライバシーポリシー",
  description:
    "SleepForecastのプライバシーポリシー。データの収集・保存・広告配信・データエクスポートに関する取り扱いを説明します。",
  alternates: { canonical: `${SITE_URL}/privacy` },
};

export default function PrivacyPage() {
  return (
    <div className="container mx-auto max-w-[720px] px-5 pb-20">
      {/* ミニヒーロー */}
      <div className="relative mb-10 rounded-b-[2rem] bg-gradient-to-b from-indigo-500/[0.06] via-purple-500/[0.03] to-transparent pb-8 pt-10 sm:pt-14 px-5">
        <div className="mb-3 flex justify-center">
          <Shield className="h-8 w-8 text-indigo-300/60" aria-hidden="true" />
        </div>
        <h1 className="text-center text-2xl font-bold tracking-tight text-[#e6e8ee] sm:text-3xl">
          プライバシーポリシー
        </h1>
        <p className="mt-2 text-center text-xs text-[#a8b0c2]">最終更新日：2026年5月1日</p>
        <div className="mt-6 h-px bg-gradient-to-r from-transparent via-indigo-400/30 to-transparent" />
      </div>

      <Breadcrumb
        items={[{ name: "ホーム", href: "/" }, { name: "プライバシーポリシー" }]}
      />

      <div className="space-y-8 text-sm leading-[1.85] text-[#e6e8ee]/85">
        <p className="text-[#a8b0c2]">
          SleepForecast（以下「本サービス」）は、Webアプリケーションとして提供されています。
          本プライバシーポリシーは、本サービスの利用にあたって収集する情報とその取り扱いについて説明します。
        </p>

        {/* 1. 収集する情報 */}
        <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 sm:p-6">
          <h2 className="mb-4 border-l-[3px] border-indigo-400/70 pl-4 text-lg font-bold text-[#e6e8ee] leading-snug">
            1. 収集する情報
          </h2>
          <p className="mb-4 text-[#a8b0c2]">本サービスが収集・利用する情報は以下の通りです。</p>
          <div className="overflow-x-auto rounded-xl border border-white/[0.06]">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-white/[0.04]">
                  <th className="border-b border-white/[0.06] px-4 py-3 text-left text-[#e6e8ee] font-semibold">情報の種類</th>
                  <th className="border-b border-white/[0.06] px-4 py-3 text-left text-[#e6e8ee] font-semibold">目的・取り扱い</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border-b border-white/[0.04] px-4 py-3 text-[#e6e8ee] font-medium whitespace-nowrap">睡眠記録・設定データ</td>
                  <td className="border-b border-white/[0.04] px-4 py-3 text-[#a8b0c2]">ブラウザの localStorage に保存。クラウド同期機能（任意）をご利用の場合は Supabase にも保存されます。</td>
                </tr>
                <tr className="bg-white/[0.02]">
                  <td className="border-b border-white/[0.04] px-4 py-3 text-[#e6e8ee] font-medium whitespace-nowrap">都道府県情報</td>
                  <td className="border-b border-white/[0.04] px-4 py-3 text-[#a8b0c2]">気象データ取得に使用（都道府県レベルのみ）。個人を特定しない形で Open-Meteo API へ送信されます。</td>
                </tr>
                <tr>
                  <td className="border-b border-white/[0.04] px-4 py-3 text-[#e6e8ee] font-medium whitespace-nowrap">アクセス解析データ</td>
                  <td className="border-b border-white/[0.04] px-4 py-3 text-[#a8b0c2]">Google Analytics 4 によるページビュー・操作データの収集。個人を特定しません。Cookie バナーから拒否できます。</td>
                </tr>
                <tr className="bg-white/[0.02]">
                  <td className="px-4 py-3 text-[#e6e8ee] font-medium whitespace-nowrap">広告配信データ</td>
                  <td className="px-4 py-3 text-[#a8b0c2]">Google AdSense による広告配信のため、Cookie を使用する場合があります。Cookie バナーから管理できます。</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* 2. 個人情報の非収集 */}
        <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 sm:p-6">
          <h2 className="mb-4 border-l-[3px] border-indigo-400/70 pl-4 text-lg font-bold text-[#e6e8ee] leading-snug">
            2. 個人情報の収集について
          </h2>
          <p className="mb-3 text-[#a8b0c2]">
            本サービスは、氏名・電話番号などの個人を特定できる情報を収集しません。ご利用に際してのアカウント登録は不要です。
          </p>
          <p className="text-[#a8b0c2]">
            クラウド同期機能（任意）をご利用の場合、メールアドレスを登録することでデータを複数端末間で共有できます。
            登録したメールアドレスはデータ引き継ぎ目的にのみ使用し、マーケティング目的には使用しません。
          </p>
        </section>

        {/* 3. データの保存 */}
        <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 sm:p-6">
          <h2 className="mb-4 border-l-[3px] border-indigo-400/70 pl-4 text-lg font-bold text-[#e6e8ee] leading-snug">
            3. データの保存と管理
          </h2>
          <p className="mb-3 text-[#a8b0c2]">
            睡眠記録・設定データは、まずお使いのブラウザの localStorage に保存されます。
            ブラウザのキャッシュ・データ消去操作を行うと、保存された記録が失われる場合があります。
          </p>
          <p className="mb-3 text-[#a8b0c2]">
            <strong className="text-[#e6e8ee]">クラウド同期（任意）：</strong>
            設定画面からメールアドレスを登録すると、データが Supabase（米国 AWS）上のクラウドデータベースにも保存されます。
            クラウドに保存されたデータはメールアドレスと紐付けられ、複数端末での利用やデータ引き継ぎが可能になります。
          </p>
          <p className="text-[#a8b0c2]">
            大切なデータは定期的にエクスポート機能（後述）でローカルバックアップすることも推奨します。
          </p>
        </section>

        {/* 4. データエクスポート機能 */}
        <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 sm:p-6">
          <h2 className="mb-4 border-l-[3px] border-indigo-400/70 pl-4 text-lg font-bold text-[#e6e8ee] leading-snug">
            4. データエクスポート機能
          </h2>
          <p className="mb-3 text-[#a8b0c2]">
            本サービスは、設定画面（/settings）から睡眠記録データをファイルとしてダウンロードする機能を提供しています。
          </p>
          <ul className="space-y-2 text-[#a8b0c2]">
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-indigo-400" aria-hidden="true">•</span>
              <span><strong className="text-[#e6e8ee]">CSV形式</strong>：表計算ソフトで開けるフォーマット</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-indigo-400" aria-hidden="true">•</span>
              <span><strong className="text-[#e6e8ee]">JSON形式</strong>：全記録データを含む機械可読フォーマット</span>
            </li>
          </ul>
          <p className="mt-3 text-[#a8b0c2]">
            エクスポートはすべてブラウザ上で完結し、データは外部に送信されません。
          </p>
        </section>

        {/* 5. 広告配信 */}
        <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 sm:p-6">
          <h2 className="mb-4 border-l-[3px] border-indigo-400/70 pl-4 text-lg font-bold text-[#e6e8ee] leading-snug">
            5. 広告配信（Google AdSense）
          </h2>
          <p className="mb-3 text-[#a8b0c2]">
            本サービスでは、Google LLC が提供する広告配信サービス「Google AdSense」を利用しています。
            Google AdSense はユーザーの興味・関心に基づいた広告（インタレストベース広告）を表示するために Cookie を使用します。
          </p>
          <ul className="space-y-2 text-[#a8b0c2]">
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-indigo-400" aria-hidden="true">•</span>
              <span>広告の Cookie 利用は、本サービスの Cookie 同意バナーから管理できます</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-indigo-400" aria-hidden="true">•</span>
              <span>Google の広告利用に関するポリシーは <a href="https://policies.google.com/technologies/ads" target="_blank" rel="noopener noreferrer" className="text-indigo-300 underline decoration-indigo-400/40 underline-offset-4">こちら</a> をご参照ください</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-indigo-400" aria-hidden="true">•</span>
              <span>インタレストベース広告のオプトアウトは <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer" className="text-indigo-300 underline decoration-indigo-400/40 underline-offset-4">Google 広告設定</a> から行えます</span>
            </li>
          </ul>
          <p className="mt-3 text-[#a8b0c2]">
            なお、Anthropic の製品ポリシーと同様に、本サービスは広告主がコンテンツを操作・誘導することを一切許可していません。
          </p>
        </section>

        {/* 6. 第三者サービス */}
        <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 sm:p-6">
          <h2 className="mb-4 border-l-[3px] border-indigo-400/70 pl-4 text-lg font-bold text-[#e6e8ee] leading-snug">
            6. 第三者サービスの利用
          </h2>
          <ul className="space-y-3 text-[#a8b0c2]">
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-indigo-400" aria-hidden="true">•</span>
              <span><strong className="text-[#e6e8ee]">Open-Meteo</strong>（気象データAPI）— 都道府県レベルの気象データ取得に使用</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-indigo-400" aria-hidden="true">•</span>
              <span><strong className="text-[#e6e8ee]">Google Analytics 4</strong>（アクセス解析）— ページビュー・操作分析に使用</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-indigo-400" aria-hidden="true">•</span>
              <span><strong className="text-[#e6e8ee]">Google AdSense</strong>（広告配信）— 広告表示に使用</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-indigo-400" aria-hidden="true">•</span>
              <span><strong className="text-[#e6e8ee]">Vercel Analytics</strong>（Web Vitals計測）— パフォーマンス改善に使用</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-indigo-400" aria-hidden="true">•</span>
              <span><strong className="text-[#e6e8ee]">Supabase</strong>（クラウドDB・認証）— クラウド同期機能をご利用の場合のみ。米国 AWS 上でデータを保管</span>
            </li>
          </ul>
        </section>

        {/* 7. Cookie の取り扱い */}
        <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 sm:p-6">
          <h2 className="mb-4 border-l-[3px] border-indigo-400/70 pl-4 text-lg font-bold text-[#e6e8ee] leading-snug">
            7. Cookie の取り扱い
          </h2>
          <p className="mb-3 text-[#a8b0c2]">
            本サービスは、Google Analytics および Google AdSense の利用にあたり Cookie を使用します。
            初回アクセス時に表示される Cookie 同意バナーから、利用目的ごとに許可・拒否を選択できます。
          </p>
          <p className="text-[#a8b0c2]">
            なお、睡眠記録・設定データの保存に Cookie は使用しておらず、これらは localStorage に保存されます。
          </p>
        </section>

        {/* 8. 子どものプライバシー */}
        <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 sm:p-6">
          <h2 className="mb-4 border-l-[3px] border-indigo-400/70 pl-4 text-lg font-bold text-[#e6e8ee] leading-snug">
            8. 子どものプライバシー
          </h2>
          <p className="text-[#a8b0c2]">
            本サービスは13歳未満の方を対象としていません。
            13歳未満の方から意図せず個人情報を収集した場合は、速やかに削除します。
          </p>
        </section>

        {/* 9. ポリシーの変更 */}
        <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 sm:p-6">
          <h2 className="mb-4 border-l-[3px] border-indigo-400/70 pl-4 text-lg font-bold text-[#e6e8ee] leading-snug">
            9. プライバシーポリシーの変更
          </h2>
          <p className="text-[#a8b0c2]">
            本ポリシーは必要に応じて更新することがあります。
            重要な変更がある場合は、本ページの最終更新日を変更することでお知らせします。
          </p>
        </section>

        {/* 10. お問い合わせ */}
        <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 sm:p-6">
          <h2 className="mb-4 border-l-[3px] border-indigo-400/70 pl-4 text-lg font-bold text-[#e6e8ee] leading-snug">
            10. お問い合わせ
          </h2>
          <p className="mb-3 text-[#a8b0c2]">本ポリシーに関するご質問は以下よりお問い合わせください。</p>
          <div className="rounded-xl border border-indigo-300/20 bg-indigo-500/[0.05] p-4">
            <p className="font-semibold text-[#e6e8ee] mb-1">SleepForecast 運営者</p>
            <a
              href="/contact"
              className="text-indigo-300 underline decoration-indigo-400/40 underline-offset-4 transition-colors hover:decoration-indigo-300"
            >
              お問い合わせページ
            </a>
          </div>
        </section>

        {/* 免責事項 */}
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
          <p className="text-xs leading-relaxed text-[#a8b0c2]">
            本サービスは医療診断の代替ではありません。気圧と睡眠の相関には個人差があります。
            体調に関するご相談は医師にご相談ください。
          </p>
        </div>
      </div>
    </div>
  );
}
