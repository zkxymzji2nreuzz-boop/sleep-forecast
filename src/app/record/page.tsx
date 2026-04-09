import type { Metadata } from "next";

import { ComingSoon } from "@/components/ComingSoon";

export const metadata: Metadata = {
  title: "記録",
  description:
    "毎朝 30 秒で昨晩の眠りを記録します。気象データは自動取得されます。",
};

export default function RecordPage() {
  return (
    <ComingSoon
      title="記録"
      step="STEP 2"
      description="毎朝 30 秒、昨晩の眠りを 5 段階で記録できるフォームを STEP 2 で実装します。"
    />
  );
}
