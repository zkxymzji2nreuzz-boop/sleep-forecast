import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "睡眠ダッシュボード",
  description:
    "過去 30 日の睡眠記録をもとに、気圧・気温・月齢との相関を分析。明日の眠気予測と睡眠改善のヒントをグラフで確認できます。",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
