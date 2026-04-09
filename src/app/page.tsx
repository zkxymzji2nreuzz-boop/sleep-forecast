import Link from "next/link";
import { Activity, Moon, Timer, Watch } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/**
 * ランディングページ。
 * F001 では予測機能は未実装のため、コピーと CTA のみのスケルトン。
 */
const FEATURES = [
  {
    icon: Watch,
    title: "ウェアラブル不要",
    description:
      "高価なデバイスは要りません。ブラウザ 1 つであなたの睡眠を記録・予測します。",
  },
  {
    icon: Timer,
    title: "毎朝 30 秒で入力",
    description:
      "昨晩の眠りを 5 段階でタップするだけ。気象データは自動で取得します。",
  },
  {
    icon: Moon,
    title: "明日の眠気を予報",
    description:
      "気圧・気温・月齢とあなたの過去データから、明日の睡眠品質を予測します。",
  },
] as const;

export default function HomePage() {
  return (
    <div className="container mx-auto max-w-screen-md px-4 py-10 sm:py-14">
      <section className="mb-12 text-center sm:mb-16">
        <p className="mb-3 text-xs uppercase tracking-widest text-[#1d9bf0]">
          SleepForecast
        </p>
        <h1 className="mb-4 text-3xl font-bold leading-tight tracking-tight text-[#e6e8ee] sm:text-4xl md:text-5xl">
          明日の眠気を予報する
        </h1>
        <p className="mx-auto mb-8 max-w-md text-sm leading-relaxed text-[#8b92a5] sm:text-base">
          気圧・気温・月齢からあなたの睡眠を読み解く
        </p>

        <div className="mx-auto flex max-w-sm flex-col items-stretch justify-center gap-3 sm:max-w-none sm:flex-row">
          <Button asChild size="lg" className="h-12 text-base">
            <Link href="/record">
              <Activity className="mr-1" aria-hidden="true" />
              今日を記録する
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="lg"
            className="h-12 border-[#1d9bf0]/40 text-base text-[#e6e8ee] hover:bg-[#1d9bf0]/10 hover:text-[#e6e8ee]"
          >
            <Link href="/dashboard">ダッシュボードを見る</Link>
          </Button>
        </div>
      </section>

      <section
        aria-labelledby="features-heading"
        className="mb-12 sm:mb-16"
      >
        <h2
          id="features-heading"
          className="mb-6 text-center text-xl font-semibold text-[#e6e8ee] sm:text-2xl"
        >
          SleepForecast の特徴
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {FEATURES.map((feature) => {
            const Icon = feature.icon;
            return (
              <Card
                key={feature.title}
                className="border-white/5 bg-[#1a1f2e]"
              >
                <CardHeader className="space-y-2 pb-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[#1d9bf0]/15 text-[#1d9bf0]">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <CardTitle className="text-base text-[#e6e8ee]">
                    {feature.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm leading-relaxed text-[#8b92a5]">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <p className="text-center text-xs text-[#8b92a5]/80">
        ※ 本サービスは医療行為・診断ではありません
      </p>
    </div>
  );
}
