/**
 * Breadcrumb コンポーネントのテスト
 *
 * - 視覚的なパンくずアイテムが描画される
 * - JSON-LD script タグが生成される
 * - 最後のアイテムに aria-current="page" が付与される
 */
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";

// next/link はシンプルな <a> として描画
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import { Breadcrumb } from "@/components/Breadcrumb";

const items = [
  { name: "ホーム", href: "/" },
  { name: "記事一覧", href: "/articles" },
  { name: "気圧と頭痛" },
];

describe("Breadcrumb", () => {
  it("全パンくずアイテムのテキストが描画される", () => {
    render(<Breadcrumb items={items} />);
    expect(screen.getByText("ホーム")).toBeInTheDocument();
    expect(screen.getByText("記事一覧")).toBeInTheDocument();
    expect(screen.getByText("気圧と頭痛")).toBeInTheDocument();
  });

  it("href を持つアイテムはリンクとして描画される", () => {
    render(<Breadcrumb items={items} />);
    const homeLink = screen.getByRole("link", { name: "ホーム" });
    expect(homeLink).toBeInTheDocument();
    expect(homeLink.getAttribute("href")).toBe("/");
  });

  it("最後のアイテムに aria-current='page' が付与される", () => {
    render(<Breadcrumb items={items} />);
    const current = screen.getByText("気圧と頭痛");
    expect(current.getAttribute("aria-current")).toBe("page");
  });

  it("JSON-LD script タグが出力される", () => {
    const { container } = render(<Breadcrumb items={items} />);
    const script = container.querySelector('script[type="application/ld+json"]');
    expect(script).not.toBeNull();
    const data = JSON.parse(script!.textContent || "{}");
    expect(data["@type"]).toBe("BreadcrumbList");
    expect(data.itemListElement).toHaveLength(3);
    expect(data.itemListElement[0].name).toBe("ホーム");
    expect(data.itemListElement[0].position).toBe(1);
    expect(data.itemListElement[2].name).toBe("気圧と頭痛");
  });

  it("JSON-LD の href ありアイテムに item プロパティが付与される", () => {
    const { container } = render(<Breadcrumb items={items} />);
    const script = container.querySelector('script[type="application/ld+json"]');
    const data = JSON.parse(script!.textContent || "{}");
    expect(data.itemListElement[0].item).toMatch(/\/$/);
    // href なし（最後）はitem プロパティを持たない
    expect(data.itemListElement[2].item).toBeUndefined();
  });

  it("単一アイテムでも描画できる（エッジケース）", () => {
    render(<Breadcrumb items={[{ name: "ホーム", href: "/" }]} />);
    expect(screen.getByText("ホーム")).toBeInTheDocument();
  });
});
