"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, PenLine, BarChart2, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * モバイル用ボトムナビゲーション。
 * デスクトップ (md 以上) では非表示にし、Header のデスクトップナビを利用する。
 */
const NAV_ITEMS = [
  { href: "/", label: "ホーム", icon: Home },
  { href: "/record", label: "記録", icon: PenLine },
  { href: "/dashboard", label: "ダッシュボード", icon: BarChart2 },
  { href: "/settings", label: "設定", icon: Settings },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      role="navigation"
      aria-label="ボトムナビゲーション"
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 md:hidden",
        "border-t border-white/10 bg-[#0f1117]",
        "pb-[env(safe-area-inset-bottom)]"
      )}
    >
      <ul className="flex items-stretch justify-around">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex min-h-[44px] min-w-[44px] flex-col items-center justify-center gap-1 px-2 py-2 text-xs font-medium transition-colors",
                  isActive ? "text-[#1d9bf0]" : "text-[#9ba3b5] hover:text-[#e6e8ee]"
                )}
              >
                <Icon
                  className="h-5 w-5"
                  aria-hidden="true"
                  strokeWidth={isActive ? 2.5 : 2}
                />
                <span className="leading-none">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
