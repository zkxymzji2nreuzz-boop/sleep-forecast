import type { Metadata } from "next";

import { Breadcrumb } from "@/components/Breadcrumb";
import { RecordForm } from "@/components/RecordForm";

export const metadata: Metadata = {
  title: "記録",
  description:
    "毎朝 30 秒で昨晩の眠りを記録します。気象データは自動取得されます。",
};

export default function RecordPage(): JSX.Element {
  return (
    <>
      <div className="container mx-auto max-w-screen-md px-4 pt-6 sm:pt-8">
        <Breadcrumb items={[{ name: "ホーム", href: "/" }, { name: "記録" }]} />
      </div>
      <RecordForm />
    </>
  );
}
