"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";

type BreadcrumbItem = {
  /** 表示テキスト */
  name: string;
  /** リンク先。省略時は現在ページ（リンク無し） */
  href?: string;
};

type Props = {
  items: BreadcrumbItem[];
};

/**
 * パンくずリスト（Client Component）。
 * - JSON-LD BreadcrumbList を出力 (SEO)
 * - 視覚的なパンくずナビゲーションも描画 (UX)
 */
export function Breadcrumb({ items }: Props) {
  const SITE_URL =
    process.env.NEXT_PUBLIC_SITE_URL || "https://sleep-forecast.vercel.app";

  /** JSON-LD 構造化データ */
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      ...(item.href ? { item: `${SITE_URL}${item.href}` } : {}),
    })),
  };

  return (
    <>
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />

      {/* 視覚的パンくず */}
      <nav
        aria-label="パンくずリスト"
        className="mb-6 flex flex-wrap items-center gap-1.5 text-xs text-[#a8b0c2]"
      >
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <span key={`${item.name}-${index}`} className="inline-flex items-center gap-1">
              {index > 0 && (
                <ChevronRight className="h-3 w-3 text-indigo-400/30" aria-hidden="true" />
              )}
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className="transition-colors hover:text-[#e6e8ee] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 focus-visible:ring-offset-1 focus-visible:ring-offset-[#0f1117]"
                >
                  {item.name}
                </Link>
              ) : (
                <span aria-current={isLast ? "page" : undefined} className="text-[#e6e8ee]/70">
                  {item.name}
                </span>
              )}
            </span>
          );
        })}
      </nav>
    </>
  );
}
