import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ダッシュボード",
  description:
    "睡眠品質の推移・気圧との相関分析・明日の眠気予測をグラフで確認。SleepForecast のダッシュボード。",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
