/**
 * `/api/weather` — Open-Meteo 気象 API のサーバ側プロキシ。
 *
 * - ブラウザ直叩きを避けて CORS を回避
 * - Vercel Edge でキャッシュ (s-maxage=600)
 * - lat/lon バリデーションを一元化
 * - 将来 Open-Meteo 以外の API へ差し替えるときの窓口
 */

import {
  OPEN_METEO_BASE_URL,
  mapOpenMeteoResponse,
  mapOpenMeteoDailyToWeather,
  mapOpenMeteoFullResponse,
  type OpenMeteoResponse,
} from "@/lib/weather";

export const runtime = "edge";

/** 入力値バリデーション: 数値範囲外は 400 */
function parseLatLon(searchParams: URLSearchParams):
  | { ok: true; lat: number; lon: number }
  | { ok: false; reason: string } {
  const latStr = searchParams.get("lat");
  const lonStr = searchParams.get("lon");
  if (latStr === null || lonStr === null) {
    return { ok: false, reason: "lat と lon は必須です" };
  }
  const lat = Number(latStr);
  const lon = Number(lonStr);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return { ok: false, reason: "lat / lon は数値である必要があります" };
  }
  if (lat < -90 || lat > 90) {
    return { ok: false, reason: "lat は -90..90 の範囲である必要があります" };
  }
  if (lon < -180 || lon > 180) {
    return {
      ok: false,
      reason: "lon は -180..180 の範囲である必要があります",
    };
  }
  return { ok: true, lat, lon };
}


/** type パラメータの解析 */
function parseType(searchParams: URLSearchParams): "default" | "forecast" | "full" {
  const val = searchParams.get("type");
  if (val === "full") return "full";
  // 後方互換: forecast=true も受け付ける
  if (searchParams.get("forecast") === "true") return "forecast";
  return "default";
}

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const parsed = parseLatLon(searchParams);
  if (!parsed.ok) {
    return Response.json({ error: parsed.reason }, { status: 400 });
  }

  const mode = parseType(searchParams);

  // Open-Meteo へ渡すクエリ
  const upstream = new URL(OPEN_METEO_BASE_URL);
  upstream.searchParams.set("latitude", parsed.lat.toString());
  upstream.searchParams.set("longitude", parsed.lon.toString());

  if (mode === "full") {
    // 現在値 + hourly 72h + daily 5日分
    upstream.searchParams.set(
      "current",
      "temperature_2m,relative_humidity_2m,surface_pressure,pressure_msl"
    );
    upstream.searchParams.set("hourly", "pressure_msl");
    upstream.searchParams.set(
      "daily",
      "temperature_2m_max,temperature_2m_min,relative_humidity_2m_max,precipitation_probability_max,pressure_msl_min,pressure_msl_max"
    );
    upstream.searchParams.set("past_days", "1");
    upstream.searchParams.set("forecast_days", "5");
    upstream.searchParams.set("timezone", "Asia/Tokyo");
  } else if (mode === "forecast") {
    // 明日の予報を取得 (後方互換)
    upstream.searchParams.set(
      "daily",
      "temperature_2m_max,temperature_2m_min,relative_humidity_2m_max,precipitation_probability,pressure_msl_min,pressure_msl_max"
    );
    upstream.searchParams.set("forecast_days", "2");
    upstream.searchParams.set("timezone", "Asia/Tokyo");
  } else {
    // 現在の気象を取得 (既存ロジック)
    upstream.searchParams.set(
      "current",
      "temperature_2m,relative_humidity_2m,surface_pressure,pressure_msl"
    );
    upstream.searchParams.set("hourly", "pressure_msl");
    upstream.searchParams.set("past_days", "1");
    upstream.searchParams.set("forecast_days", "1");
    upstream.searchParams.set("timezone", "Asia/Tokyo");
    upstream.searchParams.set("windspeed_unit", "ms");
  }

  let upstreamRes: Response;
  try {
    upstreamRes = await fetch(upstream.toString(), {
      // Next.js の fetch キャッシュ: 10 分。SWR は 30 分
      next: { revalidate: 600 },
    });
  } catch (err) {
    return Response.json(
      {
        error: "気象データの取得に失敗しました",
        detail: (err as Error).message,
      },
      { status: 502 }
    );
  }

  if (!upstreamRes.ok) {
    return Response.json(
      { error: `Open-Meteo upstream error (status=${upstreamRes.status})` },
      { status: 502 }
    );
  }

  let json: OpenMeteoResponse;
  try {
    json = (await upstreamRes.json()) as OpenMeteoResponse;
  } catch (err) {
    return Response.json(
      {
        error: "Open-Meteo のレスポンスを解釈できませんでした",
        detail: (err as Error).message,
      },
      { status: 502 }
    );
  }

  if (mode === "full") {
    // 現在値 + hourly + daily をまとめてマッピング
    const fullData = mapOpenMeteoFullResponse(json, new Date());
    return Response.json(fullData, {
      status: 200,
      headers: {
        "Cache-Control": "public, s-maxage=600, stale-while-revalidate=1800",
      },
    });
  } else if (mode === "forecast") {
    // daily[1] をマッピング (後方互換)
    const daily = json.daily;
    if (!daily || !daily.time || daily.time.length < 2) {
      return Response.json(
        { error: "明日の予報データが利用できません" },
        { status: 502 }
      );
    }
    const forecastData = mapOpenMeteoDailyToWeather(daily, 1, new Date());
    return Response.json(forecastData, {
      status: 200,
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200",
      },
    });
  } else {
    // 既存の現在値マッピング
    const weather = mapOpenMeteoResponse(json, new Date());
    return Response.json(weather, {
      status: 200,
      headers: {
        "Cache-Control": "public, s-maxage=600, stale-while-revalidate=1800",
      },
    });
  }
}
