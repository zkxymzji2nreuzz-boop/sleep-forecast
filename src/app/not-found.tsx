import Link from "next/link";
import type { Metadata } from "next";
import { Moon } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "ページが見つかりません",
  description: "お探しのページは存在しないか、移動した可能性があります。",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4 text-center">
      <Moon className="h-12 w-12 text-primary/15" aria-hidden="true" />
      <div className="space-y-2">
        <p className="text-5xl font-bold text-primary">404</p>
        <h1 className="text-xl font-semibold text-foreground">
          ページが見つかりません
        </h1>
        <p className="text-sm text-muted-foreground">
          お探しのページは存在しないか、移動した可能性があります
        </p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button asChild>
          <Link href="/">ホームへ戻る</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/record">記録する</Link>
        </Button>
      </div>
    </div>
  );
}
