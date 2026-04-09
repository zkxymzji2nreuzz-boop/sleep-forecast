import type { Metadata } from "next";

import { ComingSoon } from "@/components/ComingSoon";

export const metadata: Metadata = {
  title: "設定",
  description: "都道府県・通知・データエクスポートなどの設定を行います。",
};

export default function SettingsPage() {
  return (
    <ComingSoon
      title="設定"
      step="STEP 2"
      description="都道府県の選択やデータのエクスポート機能を STEP 2 で追加します。"
    />
  );
}
