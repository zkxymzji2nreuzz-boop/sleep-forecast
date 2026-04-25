import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "利用規約 | SleepForecast",
  description: "SleepForecastの利用規約。サービスの利用条件、免責事項、医療免責をご確認ください。",
};

export default function TermsPage() {
  return (
    <div className="container mx-auto max-w-[720px] px-5 pb-20 pt-10">
      <h1 className="text-2xl font-bold mb-2">利用規約</h1>
      <p className="text-sm text-gray-500 mb-8">最終更新日：2026年4月26日</p>

      <section className="mb-8">
        <h2 className="text-lg font-bold border-b border-gray-200 pb-2 mb-4">第1条（適用）</h2>
        <p className="text-sm text-gray-700">
          本利用規約（以下「本規約」といいます。）は、SleepForecast 運営者（以下「運営者」といいます。）が提供するWebアプリケーション「SleepForecast」およびiOS向けモバイルアプリ「SleepForecast」（以下総称して「本サービス」といいます。）の利用に関する条件を定めるものです。ユーザーの皆さま（以下「ユーザー」といいます。）には、本規約に同意のうえ、本サービスをご利用いただきます。
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-bold border-b border-gray-200 pb-2 mb-4">第2条（医療免責）</h2>
        <ul className="text-sm text-gray-700 space-y-3">
          <li>1. 本サービスは、気象データと睡眠品質の相関を参考情報として提供するものであり、<strong>医療行為、医学的な診断、治療、またはそれらの代替を目的としたものではありません。</strong></li>
          <li>2. 本サービスが提供する予測・分析結果は、統計的な傾向に基づく参考情報であり、その正確性、完全性、有用性について保証するものではありません。</li>
          <li>3. 睡眠障害、気象病、その他の健康上の問題については、必ず医師その他の医療専門家にご相談ください。</li>
          <li>4. 本サービスの情報に基づいてユーザーが行った判断・行動により生じた結果について、運営者は一切の責任を負いません。</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-bold border-b border-gray-200 pb-2 mb-4">第3条（免責事項）</h2>
        <ul className="text-sm text-gray-700 space-y-3">
          <li>1. 運営者は、本サービスの内容の正確性、完全性、安全性、適時性等について、いかなる保証も行いません。</li>
          <li>2. <strong>Webアプリ</strong>：本サービスは、ブラウザの localStorage にデータを保存します。ブラウザのデータ消去、デバイスの故障等によるデータの消失について、運営者は一切の責任を負いません。</li>
          <li>3. <strong>iOSアプリ</strong>：体調ログ・睡眠ログ等のデータはデバイス内の AsyncStorage に保存されます。アプリの削除、デバイスの故障等によるデータの消失について、運営者は一切の責任を負いません。</li>
          <li>4. 本サービスが利用する気象データは Open-Meteo API から取得しており、その正確性については当該 API 提供元の条件に準じます。</li>
          <li>5. 運営者は、本サービスの提供の中断、停止、終了、利用不能、変更について、ユーザーに対して事前に通知する義務を負わないものとします。</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-bold border-b border-gray-200 pb-2 mb-4">第4条（サブスクリプション・決済）</h2>
        <ul className="text-sm text-gray-700 space-y-3">
          <li>1. iOSアプリでは、有料プラン「SleepForecast Pro」をご利用いただけます。料金は月額プラン（¥300/月）または年額プラン（¥3,000/年）です。</li>
          <li>2. 決済はApple Inc.のApp Storeを通じて処理されます。クレジットカード情報等の決済情報は運営者には提供されず、Appleが管理します。</li>
          <li>3. サブスクリプションは自動更新されます。更新の停止はiOSの「設定 → Apple ID → サブスクリプション」から、各期間終了の24時間前までにキャンセルしてください。</li>
          <li>4. 無料トライアル期間中にキャンセルした場合、料金は発生しません。</li>
          <li>5. 返金はApple Inc.のポリシーに従います。返金のご要望はAppleサポートへお問い合わせください。</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-bold border-b border-gray-200 pb-2 mb-4">第5条（知的財産権）</h2>
        <p className="text-sm text-gray-700">
          本サービスに関する著作権、商標権その他の知的財産権は、運営者または正当な権利を有する第三者に帰属します。本規約に基づく本サービスの利用許諾は、本サービスに関する知的財産権の使用許諾を意味するものではありません。
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-bold border-b border-gray-200 pb-2 mb-4">第6条（規約変更）</h2>
        <p className="text-sm text-gray-700">
          運営者は、ユーザーへの事前の通知なくして、本規約を変更できるものとします。変更後の利用規約は、本ページに掲載した時点から効力を生じるものとし、ユーザーが本サービスの利用を継続した場合、変更後の規約に同意したものとみなします。
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-bold border-b border-gray-200 pb-2 mb-4">第7条（準拠法・管轄）</h2>
        <p className="text-sm text-gray-700">
          本規約の解釈にあたっては、日本法を準拠法とします。本サービスに関して紛争が生じた場合には、東京地方裁判所を第一審の専属的合意管轄裁判所とします。
        </p>
      </section>
    </div>
  );
}
