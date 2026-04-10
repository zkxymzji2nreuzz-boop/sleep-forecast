/**
 * GoogleAnalytics コンポーネントのテスト
 *
 * - NEXT_PUBLIC_GA_ID 未設定時は何も描画しない
 * - NEXT_PUBLIC_GA_ID 設定時は Script タグを描画する
 */
import { render, screen } from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";

// next/script はテスト環境で data 属性付きの div として描画する（同期 script lint を回避）
vi.mock("next/script", () => ({
  default: ({ src, id, children }: { src?: string; id?: string; children?: string }) => {
    if (src) return <div data-testid="ga-script-src" data-src={src} />;
    if (id) return <div id={id} data-testid="ga-script-inline">{children}</div>;
    return null;
  },
}));

// usePathname は固定値を返す
vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

import { GoogleAnalytics } from "@/components/GoogleAnalytics";

describe("GoogleAnalytics", () => {
  afterEach(() => {
    // 環境変数のリセット
    delete (process.env as Record<string, string | undefined>).NEXT_PUBLIC_GA_ID;
  });

  it("NEXT_PUBLIC_GA_ID が未設定のとき null を返す（何も描画しない）", () => {
    delete (process.env as Record<string, string | undefined>).NEXT_PUBLIC_GA_ID;
    const { container } = render(<GoogleAnalytics />);
    expect(container.firstChild).toBeNull();
  });

  it("NEXT_PUBLIC_GA_ID が設定されているとき src Script タグを描画する", () => {
    (process.env as Record<string, string>).NEXT_PUBLIC_GA_ID = "G-TEST12345";
    render(<GoogleAnalytics />);
    const srcScript = screen.getByTestId("ga-script-src");
    expect(srcScript).toBeInTheDocument();
    expect(srcScript.getAttribute("data-src")).toContain("G-TEST12345");
  });

  it("NEXT_PUBLIC_GA_ID が設定されているとき inline init Script を描画する", () => {
    (process.env as Record<string, string>).NEXT_PUBLIC_GA_ID = "G-TEST12345";
    render(<GoogleAnalytics />);
    const inlineScript = screen.getByTestId("ga-script-inline");
    expect(inlineScript).toBeInTheDocument();
    expect(inlineScript.textContent).toContain("G-TEST12345");
  });
});
