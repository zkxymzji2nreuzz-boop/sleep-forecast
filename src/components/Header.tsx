"use client";

import Link from "next/link";
import { Moon } from "lucide-react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ThemeToggle";

/**
 * ヘッダーのナビゲーション定義。
 * - デスクトップ (md 以上): 横並びナビ + ThemeToggle を表示
 * - モバイル (md 未満): BottomNav がナビを担うため、ロゴ + ThemeToggle のみ表示
 */
const NAV_ITEMS = [
  { label: "ホーム", href: "/" },
  { label: "記録", href: "/record" },
  { label: "ダッシュボード", href: "/dashboard" },
  { label: "記事", href: "/articles" },
  { label: "設定", href: "/settings" },
] as const;

export function Header() {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75">
      <div className="container mx-auto flex h-16 max-w-screen-md items-center justify-between px-4">
        {/* ロゴ: モバイル・デスクトップ共通 */}
        <Link
          href="/"
          className="flex items-center gap-2 text-foreground transition-opacity hover:opacity-80"
          aria-label="SleepForecast ホーム"
        >
          <Moon className="h-6 w-6 text-primary" aria-hidden="true" />
          <span className="text-base font-semibold tracking-tight sm:text-lg">
            SleepForecast
          </span>
        </Link>

        <div className="flex items-center gap-1">
          {/* デスクトップのみ: 横並びナビ（モバイルは BottomNav が担当） */}
          <nav
            className="hidden items-center gap-1 md:flex"
            aria-label="グローバルナビゲーション"
          >
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive(item.href) ? "page" : undefined}
                className={cn(
                  "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive(item.href)
                    ? "text-primary"
                    : "text-foreground/70 hover:bg-muted hover:text-foreground"
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* テーマトグル: モバイル・デスクトップ共通 */}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
