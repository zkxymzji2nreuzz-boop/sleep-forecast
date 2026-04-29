import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

export const runtime = "edge";

const SITE_NAME = "SleepForecast";
const TAGLINE = "気象病・低気圧から、眠りを予報する";

/**
 * 動的 OGP 画像生成エンドポイント。
 *
 * GET /og?title=記事タイトル&category=カテゴリ
 *
 * - title が未指定の場合はホームページ用デフォルト画像を返す
 * - サイズ: 1200 × 630 (og:image 標準)
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const title = searchParams.get("title") ?? "";
  const category = searchParams.get("category") ?? "";

  const isArticle = title.length > 0;

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "1200px",
          height: "630px",
          background: "linear-gradient(135deg, #0f1117 0%, #141824 50%, #0f1117 100%)",
          padding: "64px",
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        {/* 背景の装飾グラデーション */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background:
              "radial-gradient(ellipse at 20% 50%, rgba(99,102,241,0.15) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(168,85,247,0.1) 0%, transparent 50%)",
          }}
        />

        {/* カテゴリバッジ */}
        {category && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginBottom: "24px",
            }}
          >
            <div
              style={{
                background: "rgba(99,102,241,0.15)",
                border: "1px solid rgba(99,102,241,0.3)",
                borderRadius: "999px",
                padding: "6px 16px",
                fontSize: "18px",
                color: "#a5b4fc",
                fontWeight: 500,
              }}
            >
              {category}
            </div>
          </div>
        )}

        {/* タイトル or デフォルトコピー */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            justifyContent: "center",
          }}
        >
          {isArticle ? (
            <div
              style={{
                fontSize: title.length > 30 ? "48px" : "58px",
                fontWeight: 700,
                color: "#e6e8ee",
                lineHeight: 1.3,
                letterSpacing: "-0.02em",
                maxWidth: "960px",
              }}
            >
              {title}
            </div>
          ) : (
            <>
              <div
                style={{
                  fontSize: "26px",
                  color: "#6366f1",
                  fontWeight: 500,
                  marginBottom: "16px",
                  letterSpacing: "0.05em",
                }}
              >
                🌙 {TAGLINE}
              </div>
              <div
                style={{
                  fontSize: "64px",
                  fontWeight: 700,
                  color: "#e6e8ee",
                  lineHeight: 1.2,
                  letterSpacing: "-0.02em",
                }}
              >
                気象病・低気圧から、今夜の眠りを予報する
              </div>
              <div
                style={{
                  marginTop: "24px",
                  fontSize: "24px",
                  color: "#9ba3b5",
                  lineHeight: 1.6,
                }}
              >
                気象病・低気圧が気になる方のための睡眠記録アプリ
              </div>
            </>
          )}
        </div>

        {/* フッター: サイト名 + URL */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: "1px solid rgba(255,255,255,0.08)",
            paddingTop: "24px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                background: "linear-gradient(135deg, #6366f1, #a855f7)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "20px",
              }}
            >
              🌙
            </div>
            <div
              style={{
                fontSize: "22px",
                fontWeight: 700,
                color: "#e6e8ee",
              }}
            >
              {SITE_NAME}
            </div>
          </div>
          <div
            style={{
              fontSize: "18px",
              color: "#6b7280",
            }}
          >
            sleep-forecast.vercel.app
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
