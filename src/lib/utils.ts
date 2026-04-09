import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Tailwind クラスをマージするユーティリティ。
 * shadcn/ui の全コンポーネントから参照される。
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
