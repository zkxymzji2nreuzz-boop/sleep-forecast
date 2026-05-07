"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";

/**
 * ThemeToggle
 *
 * ヘッダー右端に配置するライト/ダーク切り替えボタン。
 * - ダークモード時: Sun アイコン（クリックでライトへ）
 * - ライトモード時: Moon アイコン（クリックでダークへ）
 * - タップターゲット: 40×40px（min 44px は padding で確保）
 */
export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      aria-label={theme === "dark" ? "ライトモードに切り替え" : "ダークモードに切り替え"}
      className="
        flex h-10 w-10 items-center justify-center rounded-lg
        text-muted-foreground hover:text-foreground
        hover:bg-muted
        transition-colors duration-200
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
      "
    >
      {theme === "dark" ? (
        <Sun className="h-5 w-5" aria-hidden="true" />
      ) : (
        <Moon className="h-5 w-5" aria-hidden="true" />
      )}
    </button>
  );
}
