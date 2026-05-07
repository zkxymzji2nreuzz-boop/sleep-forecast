import { useState, useEffect } from "react";

/**
 * `<html>` 要素の class に "dark" が付いているかを監視し、
 * ダークモードの on/off を boolean で返す React hook。
 *
 * Chart.js の canvas コンテキストは CSS 変数を解決できないため、
 * この hook でテーマを検知して色をハードコードで切り替える。
 */
export function useDarkMode(): boolean {
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof document === "undefined") return false;
    return document.documentElement.classList.contains("dark");
  });

  useEffect(() => {
    const update = () =>
      setIsDark(document.documentElement.classList.contains("dark"));

    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);

  return isDark;
}
