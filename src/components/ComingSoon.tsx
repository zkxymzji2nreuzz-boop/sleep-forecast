import { Construction } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type ComingSoonProps = {
  /** ページタイトル (例: "記録", "ダッシュボード") */
  title: string;
  /** 実装予定の STEP 番号（例: "STEP 2"） */
  step: string;
  /** 補足文 */
  description?: string;
};

/**
 * F001 時点で中身が未実装のページ向け共通スケルトン。
 * F002 以降で差し替える前提の最小雛形。
 */
export function ComingSoon({ title, step, description }: ComingSoonProps) {
  return (
    <div className="container mx-auto max-w-screen-md px-4 py-10 sm:py-14">
      <Card className="border-white/5 bg-[#1a1f2e]">
        <CardHeader className="items-center text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-500/15 text-indigo-400">
            <Construction className="h-6 w-6" aria-hidden="true" />
          </div>
          <CardTitle className="text-xl text-[#e6e8ee]">
            {title} — 準備中
          </CardTitle>
          <CardDescription className="text-[#a8b0c2]">
            {step} で実装予定
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center text-sm leading-relaxed text-[#a8b0c2]">
          {description ??
            "この画面は現在準備中です。もう少しお待ちください。"}
          <p className="mt-4 text-xs text-[#a8b0c2]/70">
            ※ 本サービスは医療行為・診断ではありません
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
