import type { Metadata } from "next";

import { ComingSoon } from "@/components/ComingSoon";

export const metadata: Metadata = {
  title: "利用規約",
  description: "SleepForecast の利用規約。",
};

export default function TermsPage() {
  return <ComingSoon title="利用規約" step="STEP 6" />;
}
