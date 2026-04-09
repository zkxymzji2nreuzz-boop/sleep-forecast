import type { Metadata } from "next";

import { ComingSoon } from "@/components/ComingSoon";

export const metadata: Metadata = {
  title: "お問い合わせ",
  description: "SleepForecast へのお問い合わせ。",
};

export default function ContactPage() {
  return <ComingSoon title="お問い合わせ" step="STEP 6" />;
}
