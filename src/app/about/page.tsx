import type { Metadata } from "next";

import { ComingSoon } from "@/components/ComingSoon";

export const metadata: Metadata = {
  title: "About",
  description: "SleepForecast の運営者情報。",
};

export default function AboutPage() {
  return <ComingSoon title="About" step="STEP 6" />;
}
