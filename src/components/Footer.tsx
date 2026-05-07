import Link from "next/link";

/**
 * 全ページ共通のフッター。
 * 医療免責文を必ず含める (10 Core Principles #10)。
 */
const FOOTER_LINKS = [
  { label: "Articles", href: "/articles" },
  { label: "About", href: "/about" },
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
  { label: "Contact", href: "/contact" },
] as const;

export function Footer() {
  return (
    <footer className="mt-12 hidden border-t border-border bg-background md:block">
      <div className="container mx-auto max-w-screen-md px-4 py-8 text-sm text-muted-foreground">
        <nav
          className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2"
          aria-label="フッターナビゲーション"
        >
          {FOOTER_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <p className="mb-3 text-xs leading-relaxed">
          本サービスは医療行為・診断を目的としたものではありません
          体調に不安がある場合は医療機関にご相談ください
        </p>

        <p className="text-xs text-muted-foreground/70">
          © 2026 SleepForecast
        </p>
      </div>
    </footer>
  );
}
