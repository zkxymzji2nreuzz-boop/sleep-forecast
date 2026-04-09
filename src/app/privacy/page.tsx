import type { Metadata } from "next";

import { ComingSoon } from "@/components/ComingSoon";

export const metadata: Metadata = {
  title: "プライバシーポリシー",
  description: "SleepForecast のプライバシーポリシー。",
};

export default function PrivacyPage() {
  return <ComingSoon title="プライバシーポリシー" step="STEP 6" />;
}
