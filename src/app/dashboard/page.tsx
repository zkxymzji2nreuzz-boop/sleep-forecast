import type { Metadata } from "next";

import { ComingSoon } from "@/components/ComingSoon";

export const metadata: Metadata = {
  title: "ダッシュボード",
  description: "過去 30 日の睡眠品質と気象データの相関を可視化します。",
};

export default function DashboardPage() {
  return (
    <ComingSoon
      title="ダッシュボード"
      step="STEP 3"
      description="過去 30 日の睡眠品質と気圧・気温の相関を可視化するダッシュボードを STEP 3 で実装します。"
    />
  );
}
