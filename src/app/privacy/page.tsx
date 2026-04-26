import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "プライバシーポリシー | SleepForecast",
  description: "SleepForecastのプライバシーポリシー。iOSアプリ・Webアプリにおける位置情報、データ保存、プッシュ通知の取り扱いについて説明します。",
};

export default function PrivacyPage() {
  return (
    <div className="container mx-auto max-w-[720px] px-5 pb-20 pt-10">
      <h1 className="text-2xl font-bold mb-2">SleepForecast プライバシーポリシー</h1>
      <p className="text-sm text-gray-400 mb-8">最終更新日：2026年4月26日</p>

      <p className="mb-6 text-sm text-gray-400">
        SleepForecast（以下「本サービス」）は、WebアプリケーションおよびiOS向けモバイルアプリ（以下総称して「本アプリ」）として提供されています。本プライバシーポリシーは、本アプリの利用にあたって収集する情報とその取り扱いについて説明します。
      </p>

      <section className="mb-8">
        <h2 className="text-lg font-bold border-b border-white/10 pb-2 mb-4">1. 収集する情報</h2>
        <p className="text-sm text-gray-400 mb-4">本アプリが収集・利用する情報は以下の通りです。</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-white/5">
                <th className="border border-white/10 px-3 py-2 text-left text-gray-300">情報の種類</th>
                <th className="border border-white/10 px-3 py-2 text-left text-gray-300">目的</th>
                <th className="border border-white/10 px-3 py-2 text-left text-gray-300">対象</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-white/10 px-3 py-2 text-gray-300">位置情報（GPS）</td>
                <td className="border border-white/10 px-3 py-2 text-gray-400">現在地の気圧・天気データを取得するために使用します。外部サーバーに個人を特定する形では送信しません。</td>
                <td className="border border-white/10 px-3 py-2 text-gray-400">iOSアプリ</td>
              </tr>
              <tr className="bg-white/[0.02]">
                <td className="border border-white/10 px-3 py-2 text-gray-300">体調ログ・睡眠記録</td>
                <td className="border border-white/10 px-3 py-2 text-gray-400">ユーザーが入力した体調・睡眠データ。デバイス内（AsyncStorage）にのみ保存し、外部サーバーには送信しません。</td>
                <td className="border border-white/10 px-3 py-2 text-gray-400">iOSアプリ</td>
              </tr>
              <tr>
                <td className="border border-white/10 px-3 py-2 text-gray-300">プッシュ通知</td>
                <td className="border border-white/10 px-3 py-2 text-gray-400">低気圧接近アラート・体調ログリマインダーの送信に使用します。通知許可はOSの設定からいつでも変更できます。</td>
                <td className="border border-white/10 px-3 py-2 text-gray-400">iOSアプリ</td>
              </tr>
              <tr className="bg-white/[0.02]">
                <td className="border border-white/10 px-3 py-2 text-gray-300">閲覧・操作データ</td>
                <td className="border border-white/10 px-3 py-2 text-gray-400">Google Analytics 4によるアクセス解析。個人を特定する情報は含みません。</td>
                <td className="border border-white/10 px-3 py-2 text-gray-400">Webアプリ</td>
              </tr>
              <tr>
                <td className="border border-white/10 px-3 py-2 text-gray-300">睡眠記録（Web版）</td>
                <td className="border border-white/10 px-3 py-2 text-gray-400">ブラウザのlocalStorageに保存されます。外部サーバーには送信されません。</td>
                <td className="border border-white/10 px-3 py-2 text-gray-400">Webアプリ</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-bold border-b border-white/10 pb-2 mb-4">2. 個人情報の収集について</h2>
        <p className="text-sm text-gray-400 mb-3">本アプリは、氏名・メールアドレス・電話番号などの個人を特定できる情報（個人情報）を収集しません。</p>
        <p className="text-sm text-gray-400">サブスクリプション（SleepForecast Pro）の決済は、Apple Inc.のApp Storeを通じて処理されます。決済情報はAppleが管理し、当方では保持しません。</p>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-bold border-b border-white/10 pb-2 mb-4">3. 位置情報の取り扱い（iOSアプリ）</h2>
        <p className="text-sm text-gray-400 mb-3">iOSアプリでは、現在地の気圧・気温・天気データを取得するためにデバイスの位置情報を使用します。</p>
        <ul className="text-sm text-gray-400 list-disc pl-5 space-y-2">
          <li>取得した位置情報はOpen-Meteo等の気象APIへのリクエストに使用されます</li>
          <li>位置情報は外部サーバーに個人を特定する形で記録・保存されません</li>
          <li>位置情報の使用許可は、iOSの設定からいつでも変更できます</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-bold border-b border-white/10 pb-2 mb-4">4. データの保存と管理</h2>
        <p className="text-sm text-gray-400 mb-3">
          <strong className="text-gray-300">iOSアプリ</strong>：体調ログ・睡眠ログ・アプリ設定はすべてお使いのデバイス内（AsyncStorage）に保存されます。アプリを削除すると、これらのデータも削除されます。
        </p>
        <p className="text-sm text-gray-400 mb-3">
          <strong className="text-gray-300">Webアプリ</strong>：睡眠記録はブラウザのlocalStorageに保存されます。ブラウザのデータ消去操作を行うと、記録が失われる場合があります。
        </p>
        <p className="text-sm text-gray-400">いずれのデータも、外部のサーバーやクラウドサービスには保存されません。</p>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-bold border-b border-white/10 pb-2 mb-4">5. 第三者サービスの利用</h2>
        <p className="text-sm text-gray-400 mb-3">本アプリは以下の第三者サービスを利用しています。</p>
        <ul className="text-sm text-gray-400 list-disc pl-5 space-y-2">
          <li><strong className="text-gray-300">Open-Meteo</strong>（気象データAPI）</li>
          <li><strong className="text-gray-300">Google Analytics 4</strong>（Webアプリのアクセス解析）</li>
          <li><strong className="text-gray-300">Apple App Store / RevenueCat</strong>（決済処理）</li>
          <li><strong className="text-gray-300">Expo / EAS</strong>（アプリ配信基盤）</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-bold border-b border-white/10 pb-2 mb-4">6. 子どものプライバシー</h2>
        <p className="text-sm text-gray-400">本アプリは13歳未満の方を対象としていません。13歳未満の方から意図せず個人情報を収集した場合は、速やかに削除します。</p>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-bold border-b border-white/10 pb-2 mb-4">7. プライバシーポリシーの変更</h2>
        <p className="text-sm text-gray-400">本ポリシーは必要に応じて更新することがあります。重要な変更がある場合は、本ページの最終更新日を変更することでお知らせします。</p>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-bold border-b border-white/10 pb-2 mb-4">8. お問い合わせ</h2>
        <p className="text-sm text-gray-400 mb-3">本ポリシーに関するご質問は以下よりお問い合わせください。</p>
        <div className="bg-white/5 border border-white/10 rounded-xl p-5">
          <p className="text-sm font-bold text-gray-200 mb-1">SleepForecast サポート</p>
          <p className="text-sm text-gray-400">メール：support@sleep-forecast.jp</p>
          <p className="text-sm text-gray-400">サポートページ：https://sleep-forecast.vercel.app/contact</p>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-bold border-b border-white/10 pb-2 mb-4">9. 免責事項</h2>
        <p className="text-sm text-gray-400">本アプリは医療診断の代替ではありません。気圧と睡眠の相関には個人差があります。体調に関するご相談は医師にご相談ください。</p>
      </section>
    </div>
  );
}
