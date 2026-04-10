"use client";

import * as React from "react";
import Link from "next/link";
import { Menu, Moon } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * ヘッダーのナビゲーション定義。
 * F001 ではこの 4 リンクのみを表示する。
 */
const NAV_ITEMS = [
  { label: "ホーム", href: "/" },
  { label: "記録", href: "/record" },
  { label: "ダッシュボード", href: "/dashboard" },
  { label: "記事", href: "/articles" },
  { label: "設定", href: "/settings" },
] as const;

export function Header() {
  const [open, setOpen] = React.useState(false);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-[#0f1117]/90 backdrop-blur supports-[backdrop-filter]:bg-[#0f1117]/75">
      <div className="container mx-auto flex h-16 max-w-screen-md items-center justify-between px-4">
        <Link
          href="/"
          className="flex items-center gap-2 text-[#e6e8ee] transition-opacity hover:opacity-80"
          aria-label="SleepForecast ホーム"
        >
          <Moon className="h-6 w-6 text-[#1d9bf0]" aria-hidden="true" />
          <span className="text-base font-semibold tracking-tight sm:text-lg">
            SleepForecast
          </span>
        </Link>

        {/* デスクトップ: 横並びナビ */}
        <nav
          className="hidden items-center gap-1 md:flex"
          aria-label="グローバルナビゲーション"
        >
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-md px-3 py-2 text-sm font-medium text-[#e6e8ee]/80 transition-colors",
                "hover:bg-white/5 hover:text-[#e6e8ee]"
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* モバイル: ハンバーガーメニュー */}
        <div className="md:hidden">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label="メニューを開く"
                className="text-[#e6e8ee] hover:bg-white/5"
              >
                <Menu className="h-6 w-6" aria-hidden="true" />
              </Button>
            </DialogTrigger>
            <DialogContent className="top-[10%] translate-y-0 sm:top-[50%] sm:translate-y-[-50%]">
              <DialogTitle className="text-[#e6e8ee]">メニュー</DialogTitle>
              <nav
                className="mt-4 flex flex-col gap-1"
                aria-label="モバイルナビゲーション"
              >
                {NAV_ITEMS.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="flex min-h-[44px] items-center rounded-md px-3 py-2 text-base font-medium text-[#e6e8ee] transition-colors hover:bg-white/5"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </header>
  );
}
