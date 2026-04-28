import type { Metadata } from "next";

import { Breadcrumb } from "@/components/Breadcrumb";
import { RecordForm } from "@/components/RecordForm";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://sleep-forecast.vercel.app";

export const metadata: Metadata = {
  title: "記録",
  description:
    "毎朝 30 秒で昨晩の眠りを記録します。気象データは自動取得されます。",
  robots: { index: false, follow: false },
  alternates: { canonical: `${SITE_URL}/record` },
};

export default function RecordPage() {
  return (
    <main className="min-h-screen bg-[#0d1117] text-white">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <Breadcrumb
          items={[
            { name: "ホーム", href: "/" },
            { name: "記録する" },
          ]}
        />
        <RecordForm />
      </div>
    </main>
  );
}