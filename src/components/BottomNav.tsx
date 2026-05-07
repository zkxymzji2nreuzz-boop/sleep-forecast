"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, PenLine, BarChart2, Settings, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: typeof Home;
};

const LEFT_NAV: NavItem[] = [
  { href: "/", label: "ホーム", icon: Home },
  { href: "/articles", label: "記事", icon: BookOpen },
];

const RIGHT_NAV: NavItem[] = [
  { href: "/dashboard", label: "グラフ", icon: BarChart2 },
  { href: "/settings", label: "設定", icon: Settings },
];

/**
 * モバイル用ボトムナビゲーション。
 * 4タブ + 中央FAB（記録ボタン）構成。
 */
export function BottomNav() {
  const pathname = usePathname();

  const checkActive = (href: string) =>
    href === "/"
      ? pathname === "/"
      : pathname === href || pathname.startsWith(`${href}/`);

  const isRecordActive = checkActive("/record");

  const renderTab = (item: NavItem) => {
    const isActive = checkActive(item.href);
    const Icon = item.icon;
    return (
      <li key={item.href} className="flex-1">
        <Link
          href={item.href}
          aria-current={isActive ? "page" : undefined}
          className={cn(
            "flex min-h-[44px] flex-col items-center justify-center gap-1 px-2 py-2 text-xs font-medium transition-colors",
            isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
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
  };

  return (
    <nav
      role="navigation"
      aria-label="ボトムナビゲーション"
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 md:hidden",
        "bg-background",
        "pt-5 pb-[env(safe-area-inset-bottom)]"
      )}
    >
      {/* border-t 代替: 視覚的セパレーター */}
      <div
        className="pointer-events-none absolute inset-x-0 top-5 h-px bg-border"
        aria-hidden="true"
      />

      <ul className="flex items-end justify-around">
        {/* 左側 2タブ */}
        {LEFT_NAV.map(renderTab)}

        {/* 中央 FAB：記録ボタン */}
        <li className="flex-1 flex flex-col items-center pb-1">
          <Link
            href="/record"
            aria-current={isRecordActive ? "page" : undefined}
            aria-label="今日の睡眠を記録する"
            className="flex flex-col items-center gap-1 -mt-5"
          >
            <span
              className={cn(
                "flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all duration-150 active:scale-95",
                isRecordActive
                  ? "bg-primary shadow-primary/30"
                  : "bg-primary shadow-primary/20 hover:opacity-90"
              )}
            >
              <PenLine
                className="h-6 w-6 text-primary-foreground"
                aria-hidden="true"
                strokeWidth={2.5}
              />
            </span>
            <span
              className={cn(
                "text-xs font-medium leading-none",
                isRecordActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              記録
            </span>
          </Link>
        </li>

        {/* 右側 2タブ */}
        {RIGHT_NAV.map(renderTab)}
      </ul>
    </nav>
  );
}
