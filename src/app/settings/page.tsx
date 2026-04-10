import type { Metadata } from "next";

import { Breadcrumb } from "@/components/Breadcrumb";
import { ComingSoon } from "@/components/ComingSoon";

export const metadata: Metadata = {
  title: "設定",
  description: "都道府県・通知・データエクスポートなどの設定を行います。",
};

export default function SettingsPage() {
  return (
    <>
      <div className="container mx-auto max-w-screen-md px-4 pt-6 sm:pt-8">
        <Breadcrumb items={[{ name: "ホーム", href: "/" }, { name: "設定" }]} />
      </div>
      <ComingSoon
        title="設定"
        step="STEP 2"
        description="都道府県の選択やデータのエクスポート機能を STEP 2 で追加します。"
      />
    </>
  );
}
