import type { Metadata } from "next";
import { Shield } from "lucide-react";
import { Breadcrumb } from "@/components/Breadcrumb";

export const metadata: Metadata = {
    title: "プライバシーポリシー",
    description:
          "SleepForecast のプライバシーポリシー。iOSアプリ・Webアプリにおける位置情報、データ保存、プッシュ通知の取り扱いについて説明します。",
};

export default function PrivacyPage() {
    return (
          <div className="container mx-auto max-w-[680px] px-5 pb-20">
            {/* グラデーション・ミニヒーロー */}
                <div className="relative mb-10 rounded-b-[2rem] bg-gradient-to-b from-indigo-500/[0.06] via-purple-500/[0.03] to-transparent pb-8 pt-10 sm:pt-14 px-5">
                        <div className="mb-3 flex justify-center">
                                  <Shield className="h-8 w-8 text-indigo-300/60" aria-hidden="true" />
                        </div>div>
                        <h1 className="text-center text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
                                  プライバシーポリシー
                        </h1>h1>
                        <p className="mt-2 text-center text-sm text-gray-500">
                                  最終更新日：2026年4月26日
                        </p>p>
                </div>div>
          
                <Breadcrumb
                          items={[{ label: "ホーム", href: "/" }, { label: "プライバシーポリシー" }]}
                        />
          
                <div className="prose prose-sm sm:prose max-w-none mt-8 text-gray-700">
                        <p>
                                  SleepForecast（以下「本サービス」）は、WebアプリケーションおよびiOS向けモバイルアプリ（以下総称して「本アプリ」）として提供されています。本プライバシーポリシーは、本アプリの利用にあたって収集する情報とその取り扱いについて説明します。
                        </p>p>
                
                        <h2>1. 収集する情報</h2>h2>
                        <p>本アプリが収集・利用する情報は以下の通りです。</p>p>
                
                        <div className="overflow-x-auto">
                                  <table className="w-full text-sm border-collapse">
                                              <thead>
                                                            <tr className="bg-gray-50">
                                                                            <th className="border border-gray-200 px-3 py-2 text-left font-semibold">情報の種類</th>th>
                                                                            <th className="border border-gray-200 px-3 py-2 text-left font-semibold">目的</th>th>
                                                                            <th className="border border-gray-200 px-3 py-2 text-left font-semibold">対象</th>th>
                                                            </tr>tr>
                                              </thead>thead>
                                              <tbody>
                                                            <tr>
                                                                            <td className="border border-gray-200 px-3 py-2">位置情報（GPS）</td>td>
                                                                            <td className="border border-gray-200 px-3 py-2">現在地の気圧・天気データを取得するために使用します。外部サーバーに個人を特定する形では送信しません。</td>td>
                                                                            <td className="border border-gray-200 px-3 py-2"><span className="inline-block bg-blue-50 text-blue-700 text-xs font-semibold px-2 py-0.5 rounded">iOSアプリ</span>span></td>td>
                                                            </tr>tr>
                                                            <tr>
                                                                            <td className="border border-gray-200 px-3 py-2">体調ログ・睡眠記録</td>td>
                                                                            <td className="border border-gray-200 px-3 py-2">ユーザーが入力した体調・睡眠データ。デバイス内（AsyncStorage）にのみ保存し、外部サーバーには送信しません。</td>td>
                                                                            <td className="border border-gray-200 px-3 py-2"><span className="inline-block bg-blue-50 text-blue-700 text-xs font-semibold px-2 py-0.5 rounded">iOSアプリ</span>span></td>td>
                                                            </tr>tr>
                                                            <tr>
                                                                            <td className="border border-gray-200 px-3 py-2">プッシュ通知</td>td>
                                                                            <td className="border border-gray-200 px-3 py-2">低気圧接近アラート・体調ログリマインダーの送信に使用します。通知許可はOSの設定からいつでも変更できます。</td>td>
                                                                            <td className="border border-gray-200 px-3 py-2"><span className="inline-block bg-blue-50 text-blue-700 text-xs font-semibold px-2 py-0.5 rounded">iOSアプリ</span>span></td>td>
                                                            </tr>tr>
                                                            <tr>
                                                                            <td className="border border-gray-200 px-3 py-2">閲覧・操作データ</td>td>
                                                                            <td className="border border-gray-200 px-3 py-2">Google Analytics 4によるアクセス解析（ページビュー・利用傾向の把握）。個人を特定する情報は含みません。</td>td>
                                                                            <td className="border border-gray-200 px-3 py-2"><span className="inline-block bg-green-50 text-green-700 text-xs font-semibold px-2 py-0.5 rounded">Webアプリ</span>span></td>td>
                                                            </tr>tr>
                                                            <tr>
                                                                            <td className="border border-gray-200 px-3 py-2">睡眠記録（Web版）</td>td>
                                                                            <td className="border border-gray-200 px-3 py-2">ブラウザのlocalStorageに保存されます。外部サーバーには送信されません。</td>td>
                                                                            <td className="border border-gray-200 px-3 py-2"><span className="inline-block bg-green-50 text-green-700 text-xs font-semibold px-2 py-0.5 rounded">Webアプリ</span>span></td>td>
                                                            </tr>tr>
                                              </tbody>tbody>
                                  </table>table>
                        </div>div>
                
                        <h2>2. 個人情報の収集について</h2>h2>
                        <p>
                                  本アプリは、氏名・メールアドレス・電話番号などの個人を特定できる情報（個人情報）を収集しません。
                        </p>p>
                        <p>
                                  サブスクリプション（SleepForecast Pro）の決済は、Apple Inc.のApp Storeを通じて処理されます。決済情報はAppleが管理し、当方では保持しません。
                        </p>p>
                
                        <h2>3. 位置情報の取り扱い（iOSアプリ）</h2>h2>
                        <p>iOSアプリでは、現在地の気圧・気温・天気データを取得するためにデバイスの位置情報を使用します。</p>p>
                        <ul>
                                  <li>取得した位置情報はOpen-Meteo等の気象APIへのリクエストに使用されます</li>li>
                                  <li>位置情報は外部サーバーに個人を特定する形で記録・保存されません</li>li>
                                  <li>位置情報の使用許可は、iOSの「設定 → プライバシーとセキュリティ → 位置情報サービス」からいつでも変更できます</li>li>
                        </ul>ul>
                
                        <h2>4. データの保存と管理</h2>h2>
                        <p>
                                  <strong>iOSアプリ</strong>strong>：体調ログ・睡眠ログ・アプリ設定はすべてお使いのデバイス内（AsyncStorage）に保存されます。アプリを削除すると、これらのデータも削除されます。
                        </p>p>
                        <p>
                                  <strong>Webアプリ</strong>strong>：睡眠記録はブラウザのlocalStorageに保存されます。ブラウザのデータ消去操作を行うと、記録が失われる場合があります。
                        </p>p>
                        <p>いずれのデータも、外部のサーバーやクラウドサービスには保存されません。</p>p>
                
                        <h2>5. 第三者サービスの利用</h2>h2>
                        <p>本アプリは以下の第三者サービスを利用しています。</p>p>
                        <ul>
                                  <li><strong>Open-Meteo</strong>strong>（気象データAPI）</li>li>
                                  <li><strong>Google Analytics 4</strong>strong>（Webアプリのアクセス解析）</li>li>
                                  <li><strong>Apple App Store / RevenueCat</strong>strong>（決済処理）</li>li>
                                  <li><strong>Expo / EAS</strong>strong>（アプリ配信基盤）</li>li>
                        </ul>ul>
                
                        <h2>6. 子どものプライバシー</h2>h2>
                        <p>本アプリは13歳未満の方を対象としていません。13歳未満の方から意図せず個人情報を収集した場合は、速やかに削除します。</p>p>
                
                        <h2>7. プライバシーポリシーの変更</h2>h2>
                        <p>
                                  本ポリシーは必要に応じて更新することがあります。重要な変更がある場合は、本ページの「最終更新日」を変更することでお知らせします。定期的にご確認ください。
                        </p>p>
                
                        <h2>8. お問い合わせ</h2>h2>
                        <p>
                                  本ポリシーに関するご質問・ご意見は以下よりお問い合わせください。
                        </p>p>
                        <p>
                                  メール：<a href="mailto:support@sleep-forecast.jp">support@sleep-forecast.jp</a>a>
                        </p>p>
                
                        <h2>9. 免責事項</h2>h2>
                        <p>
                                  本アプリは医療診断の代替ではありません。気圧と睡眠の相関には個人差があります。体調に関するご相談は医師にご相談ください。
                        </p>p>
                </div>div>
          </div>div>
        );
}</div>
