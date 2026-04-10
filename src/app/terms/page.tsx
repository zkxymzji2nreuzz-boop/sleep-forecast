import type { Metadata } from "next";
import { FileText, Calendar } from "lucide-react";
import { Breadcrumb } from "@/components/Breadcrumb";

export const metadata: Metadata = {
  title: "利用規約",
  description:
    "SleepForecast（眠れる明日予報）の利用規約。サービスの利用条件、免責事項、医療免責をご確認ください。",
};

export default function TermsPage() {
  return (
    <div className="container mx-auto max-w-[680px] px-5 pb-20">
      {/* グラデーション・ミニヒーロー */}
      <div className="relative mb-10 rounded-b-[2rem] bg-gradient-to-b from-indigo-500/[0.06] via-purple-500/[0.03] to-transparent pb-8 pt-10 sm:pt-14 px-5">
        <div className="mb-3 flex justify-center">
          <FileText className="h-8 w-8 text-indigo-300/60" aria-hidden="true" />
        </div>
        <h1 className="text-center text-2xl font-bold tracking-tight text-[#e6e8ee] sm:text-3xl">
          利用規約
        </h1>
        <div className="mt-6 h-px bg-gradient-to-r from-transparent via-indigo-400/30 to-transparent" />
      </div>

      <Breadcrumb items={[{ name: "ホーム", href: "/" }, { name: "利用規約" }]} />

      {/* 更新日表示 */}
      <div className="mb-10 flex items-center gap-1.5 text-sm text-[#8b92a5]">
        <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
        最終更新日: 2026年4月10日
      </div>

      <div className="space-y-14 text-sm leading-[1.85] text-[#e6e8ee]/85">
        {/* 第1条 適用 */}
        <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 sm:p-6">
          <h2 className="mb-4 border-l-[3px] border-indigo-400/70 pl-4 text-lg font-bold text-[#e6e8ee] leading-snug">
            第1条（適用）
          </h2>
          <p>
            本利用規約（以下「本規約」といいます。）は、SleepForecast 運営者（以下「運営者」といいます。）が
            提供する Web アプリケーション「SleepForecast」（以下「本サービス」といいます。）の
            利用に関する条件を定めるものです。ユーザーの皆さま（以下「ユーザー」といいます。）には、
            本規約に同意のうえ、本サービスをご利用いただきます。
          </p>
        </section>

        {/* 第2条 医療免責 — amber グラデーション背景 */}
        <section className="rounded-2xl border border-amber-500/25 bg-gradient-to-br from-amber-900/15 via-amber-800/10 to-transparent p-5 sm:p-6">
          <h2 className="mb-4 border-l-[3px] border-amber-400/70 pl-4 text-lg font-bold text-[#e6e8ee] leading-snug">
            第2条（医療免責）
          </h2>
          <ol className="list-inside list-decimal space-y-3">
            <li>
              本サービスは、気象データと睡眠品質の相関を参考情報として提供するものであり、
              <strong className="font-bold text-amber-200">
                医療行為、医学的な診断、治療、またはそれらの代替を目的としたものではありません。
              </strong>
            </li>
            <li>
              本サービスが提供する予測・分析結果は、統計的な傾向に基づく参考情報であり、
              その正確性、完全性、有用性について保証するものではありません。
            </li>
            <li>
              睡眠障害、気象病、その他の健康上の問題については、必ず医師その他の
              医療専門家にご相談ください。
            </li>
            <li>
              本サービスの情報に基づいてユーザーが行った判断・行動により生じた結果について、
              運営者は一切の責任を負いません。
            </li>
          </ol>
        </section>

        {/* 第3条 免責事項 */}
        <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 sm:p-6">
          <h2 className="mb-4 border-l-[3px] border-indigo-400/70 pl-4 text-lg font-bold text-[#e6e8ee] leading-snug">
            第3条（免責事項）
          </h2>
          <ol className="list-inside list-decimal space-y-3">
            <li>
              運営者は、本サービスの内容の正確性、完全性、安全性、適時性等について、
              いかなる保証も行いません。
            </li>
            <li>
              本サービスは、ブラウザの localStorage にデータを保存します。
              ブラウザのデータ消去、デバイスの故障等によるデータの消失について、
              運営者は一切の責任を負いません。
            </li>
            <li>
              本サービスが利用する気象データは Open-Meteo API から取得しており、
              その正確性については当該 API 提供元の条件に準じます。
            </li>
            <li>
              運営者は、本サービスの提供の中断、停止、終了、利用不能、変更について、
              ユーザーに対して事前に通知する義務を負わないものとします。
            </li>
          </ol>
        </section>

        {/* 第4条 知的財産 */}
        <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 sm:p-6">
          <h2 className="mb-4 border-l-[3px] border-indigo-400/70 pl-4 text-lg font-bold text-[#e6e8ee] leading-snug">
            第4条（知的財産権）
          </h2>
          <p>
            本サービスに関する著作権、商標権その他の知的財産権は、運営者または正当な権利を有する
            第三者に帰属します。本規約に基づく本サービスの利用許諾は、本サービスに関する
            知的財産権の使用許諾を意味するものではありません。
          </p>
        </section>

        {/* 第5条 変更 */}
        <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 sm:p-6">
          <h2 className="mb-4 border-l-[3px] border-indigo-400/70 pl-4 text-lg font-bold text-[#e6e8ee] leading-snug">
            第5条（規約の変更）
          </h2>
          <p>
            運営者は、ユーザーへの事前の通知なくして、本規約を変更できるものとします。
            変更後の利用規約は、本ページに掲載した時点から効力を生じるものとし、
            ユーザーが本サービスの利用を継続した場合、変更後の規約に同意したものとみなします。
          </p>
        </section>

        {/* 第6条 準拠法 */}
        <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 sm:p-6">
          <h2 className="mb-4 border-l-[3px] border-indigo-400/70 pl-4 text-lg font-bold text-[#e6e8ee] leading-snug">
            第6条（準拠法・管轄）
          </h2>
          <p>
            本規約の解釈にあたっては、日本法を準拠法とします。
            本サービスに関して紛争が生じた場合には、東京地方裁判所を第一審の専属的合意管轄裁判所とします。
          </p>
        </section>
      </div>
    </div>
  );
}
