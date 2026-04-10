/**
 * AdBanner コンポーネントのテスト
 *
 * - NEXT_PUBLIC_ADSENSE_CLIENT 未設定時は aria-hidden な空要素を描画する
 * - NEXT_PUBLIC_ADSENSE_CLIENT 設定時は ins.adsbygoogle を描画する
 */
import { render } from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";
import { AdBanner } from "@/components/AdBanner";

describe("AdBanner", () => {
  afterEach(() => {
    delete (process.env as Record<string, string | undefined>).NEXT_PUBLIC_ADSENSE_CLIENT;
  });

  it("NEXT_PUBLIC_ADSENSE_CLIENT 未設定時: aria-hidden の空 div を描画する", () => {
    delete (process.env as Record<string, string | undefined>).NEXT_PUBLIC_ADSENSE_CLIENT;
    const { container } = render(<AdBanner slot="1234567890" />);
    const div = container.querySelector("[aria-hidden='true']");
    expect(div).not.toBeNull();
    // ins.adsbygoogle は存在しない
    expect(container.querySelector("ins.adsbygoogle")).toBeNull();
  });

  it("NEXT_PUBLIC_ADSENSE_CLIENT 未設定時: h-0 class でレイアウト非影響", () => {
    delete (process.env as Record<string, string | undefined>).NEXT_PUBLIC_ADSENSE_CLIENT;
    const { container } = render(<AdBanner slot="1234567890" />);
    const div = container.querySelector("[aria-hidden='true']") as HTMLElement;
    expect(div.className).toContain("h-0");
  });

  it("NEXT_PUBLIC_ADSENSE_CLIENT 設定時: ins.adsbygoogle を描画する", () => {
    (process.env as Record<string, string>).NEXT_PUBLIC_ADSENSE_CLIENT = "ca-pub-1234567890";
    const { container } = render(<AdBanner slot="9876543210" />);
    const ins = container.querySelector("ins.adsbygoogle");
    expect(ins).not.toBeNull();
    expect(ins?.getAttribute("data-ad-client")).toBe("ca-pub-1234567890");
    expect(ins?.getAttribute("data-ad-slot")).toBe("9876543210");
  });

  it("NEXT_PUBLIC_ADSENSE_CLIENT 設定時: format prop が data-ad-format に反映される", () => {
    (process.env as Record<string, string>).NEXT_PUBLIC_ADSENSE_CLIENT = "ca-pub-1234567890";
    const { container } = render(<AdBanner slot="111" format="rectangle" />);
    const ins = container.querySelector("ins.adsbygoogle");
    expect(ins?.getAttribute("data-ad-format")).toBe("rectangle");
  });
});
