/**
 * /og — 動的 OGP 画像生成エンドポイント
 *
 * GET /og?title=記事タイトル&category=カテゴリ
 * - next/og (ImageResponse) を使用（Next.js 14 組み込み）
 * - Noto Sans JP を Google Fonts からフェッチして日本語を正しくレンダリング
 * - フォント取得失敗時はシステムフォントにフォールバック（クラッシュしない）
 * - タイトル/カテゴリを最大長でサニタイズ
 */

import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

export const runtime = "edge";

const SITE_NAME = "SleepForecast";
const MAX_TITLE_LEN = 120;
const MAX_CATEGORY_LEN = 40;

function sanitize(str: string, max: number): string {
  return str.slice(0, max).replace(/[<>&"']/g, "");
}

/** Google Fonts から Noto Sans JP Bold のサブセットをフェッチ（3秒タイムアウト） */
async function fetchJapaneseFont(text: string): Promise<ArrayBuffer | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3000);
  try {
    const cssRes = await fetch(
      `https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@700&text=${encodeURIComponent(text)}`,
      {
        signal: controller.signal,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
      }
    );
    if (!cssRes.ok) return null;
    const css = await cssRes.text();
    const match = css.match(/src:\s*url\(([^)]+)\)\s*format/);
    if (!match?.[1]) return null;
    const fontRes = await fetch(match[1], { signal: controller.signal });
    if (!fontRes.ok) return null;
    return await fontRes.arrayBuffer();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const title = sanitize(searchParams.get("title") ?? "", MAX_TITLE_LEN);
  const category = sanitize(searchParams.get("category") ?? "", MAX_CATEGORY_LEN);

  const isArticle = title.length > 0;
  const displayTitle = isArticle ? title : "気象病・低気圧から、今夜の眠りを予報する";

  // フォントに含める文字セット
  const fontChars = displayTitle + category + SITE_NAME + "気圧気温月齢からあなたの眠りを解き明かすsleep-forecast.vercel.app";
  const fontData = await fetchJapaneseFont(fontChars);

  const titleFontSize = displayTitle.length > 40 ? 44 : displayTitle.length > 25 ? 52 : 60;

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "1200px",
          height: "630px",
          background: "#0f1117",
          padding: "60px 72px",
          fontFamily: fontData ? "NotoSansJP" : "sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* 背景グラデーション装飾 */}
        <div
          style={{
            position: "absolute",
            top: "-180px",
            right: "-180px",
            width: "550px",
            height: "550px",
            background: "radial-gradient(circle, rgba(99,102,241,0.22) 0%, transparent 65%)",
            borderRadius: "50%",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-140px",
            left: "-140px",
            width: "420px",
            height: "420px",
            background: "radial-gradient(circle, rgba(139,92,246,0.14) 0%, transparent 65%)",
            borderRadius: "50%",
          }}
        />

        {/* ロゴ行 */}
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          {/* 月アイコン（SVG — 絵文字を避けてクロスプラットフォーム互換） */}
          <svg width="38" height="38" viewBox="0 0 38 38">
            <defs>
              <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#6366f1" />
                <stop offset="100%" stopColor="#8b5cf6" />
              </linearGradient>
            </defs>
            <circle cx="19" cy="19" r="19" fill="url(#g)" />
            <path d="M22 9a10 10 0 1 0 0 20 8 8 0 0 1 0-20z" fill="white" opacity="0.9" />
          </svg>
          <span style={{ color: "#e6e8ee", fontSize: "26px", fontWeight: 700, letterSpacing: "-0.3px" }}>
            {SITE_NAME}
          </span>
        </div>

        {/* カテゴリ + タイトル */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px", flex: 1, justifyContent: "center" }}>
          {category && (
            <div style={{ display: "flex", alignItems: "center" }}>
              <span
                style={{
                  background: "rgba(99,102,241,0.18)",
                  border: "1.5px solid rgba(99,102,241,0.45)",
                  borderRadius: "100px",
                  padding: "6px 22px",
                  color: "#a5b4fc",
                  fontSize: "18px",
                  fontWeight: 500,
                }}
              >
                {category}
              </span>
            </div>
          )}
          <div
            style={{
              color: "#e6e8ee",
              fontSize: `${titleFontSize}px`,
              fontWeight: 700,
              lineHeight: 1.35,
              maxWidth: "980px",
            }}
          >
            {displayTitle}
          </div>
          {!isArticle && (
            <div style={{ color: "#a8b0c2", fontSize: "22px", lineHeight: 1.5 }}>
              気象病・低気圧が気になる方のための睡眠記録アプリ
            </div>
          )}
        </div>

        {/* フッター */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: "1px solid rgba(255,255,255,0.07)",
            paddingTop: "22px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "4px",
                height: "20px",
                background: "linear-gradient(to bottom, #6366f1, #8b5cf6)",
                borderRadius: "2px",
              }}
            />
            <span style={{ color: "#a8b0c2", fontSize: "17px" }}>
              気圧・気温・月齢から、あなたの眠りを解き明かす
            </span>
          </div>
          <span style={{ color: "#4b5563", fontSize: "17px" }}>sleep-forecast.vercel.app</span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: fontData
        ? [{ name: "NotoSansJP", data: fontData, weight: 700, style: "normal" }]
        : [],
    }
  );
}
