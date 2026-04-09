import type { Metadata } from "next";

import { RecordForm } from "@/components/RecordForm";

export const metadata: Metadata = {
  title: "記録",
  description:
    "毎朝 30 秒で昨晩の眠りを記録します。気象データは自動取得されます。",
};

export default function RecordPage(): JSX.Element {
  return <RecordForm />;
}
