/**
 * `/api/weather` — Open-Meteo 気象 API のサーバ側プロキシ。
 *
 * - ブラウザ直叩きを避けて CORS を回避
 * - Vercel Edge でキャッシュ (s-maxage=600)
 * - lat/lon バリデーションを一元化
 * - full モード: JMA (気象庁MSMモデル, 4日・高精度) + グローバル (5〜7日・延長) のハイブリッド
 */

import {
  OPEN_METEO_BASE_URL,
  OPEN_METEO_JMA_URL,
  OPEN_METEO_AQI_URL,
  mapOpenMeteoResponse,
  mapOpenMeteoDailyToWeather,
  mapOpenMeteoFullResponse,
  mapAQIResponse,
  type OpenMeteoResponse,
} from "@/lib/weather";
import type { AQIData } from "@/lib/types";

export const runtime = "edge";

// ─────────────────────────────────────────────────────────────────────────────
// IP レート制限（インスタンス内メモリ / Edge 環境では best-effort）
// Vercel Edge は複数 V8 isolate を起動するため、全体の上限は保証されないが
// 単一 isolate 内での乱用を抑止できる。
// 本格的なレート制限が必要になったら Vercel KV + @upstash/ratelimit を導入すること。
// ─────────────────────────────────────────────────────────────────────────────
const RATE_LIMIT = 60;    // リクエスト数上限 / ウィンドウ
const WINDOW_MS = 60_000; // ウィンドウサイズ: 60 秒
const MAX_MAP_SIZE = 2000; // メモリ肥大防止: エントリ上限

const rateLimitMap = new Map<string, { count: number; windowStart: number }>();

/** IP ごとのリクエスト数を確認。上限を超えたら false を返す */
function checkRateLimit(ip: string): boolean {
  const now = Date.now();

  // Map が膨らみすぎたら古いエントリを掃除する
  if (rateLimitMap.size > MAX_MAP_SIZE) {
    for (const [key, entry] of rateLimitMap) {
      if (now - entry.windowStart > WINDOW_MS) rateLimitMap.delete(key);
      if (rateLimitMap.size <= MAX_MAP_SIZE / 2) break;
    }
  }

  const entry = rateLimitMap.get(ip);

  // 新規 or ウィンドウ期限切れ → カウンタをリセット
  if (!entry || now - entry.windowStart > WINDOW_MS) {
    rateLimitMap.set(ip, { count: 1, windowStart: now });
    return true;
  }

  if (entry.count >= RATE_LIMIT) return false;

  entry.count++;
  return true;
}

// 許可する Origin（自ドメインのみ）
const ALLOWED_ORIGINS = new Set([
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://sleep-forecast.vercel.app",
  "https://sleep-forecast.vercel.app",
  "http://localhost:3000",
  "http://localhost:3001",
]);

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

/** daily フィールドを配列インデックスで抽出するヘルパ */
function pick<T>(arr: T[] | undefined, indices: number[]): T[] {
  return indices.map((i) => arr?.[i] as T);
}

/**
 * full モード専用ハンドラ。
 * - JMA エンドポイントで current + hourly + daily (4日, 高精度) を取得
 * - グローバルエンドポイントで daily (7日) を取得し JMA 未収録の日を補完
 * - 並列フェッチしてマージしたデータを mapOpenMeteoFullResponse に渡す
 */
async function handleFullMode(lat: number, lon: number): Promise<Response> {
  const DAILY_VARS =
    "temperature_2m_max,temperature_2m_min,relative_humidity_2m_max," +
    "precipitation_probability_max,pressure_msl_min,pressure_msl_max,weathercode";

  // ── JMA リクエスト (current + hourly + 4日 daily) ──
  const jmaUrl = new URL(OPEN_METEO_JMA_URL);
  jmaUrl.searchParams.set("latitude", lat.toString());
  jmaUrl.searchParams.set("longitude", lon.toString());
  jmaUrl.searchParams.set(
    "current",
    "temperature_2m,relative_humidity_2m,surface_pressure,pressure_msl,apparent_temperature"
  );
  jmaUrl.searchParams.set(
    "hourly",
    "pressure_msl,temperature_2m,weathercode,precipitation_probability,precipitation,relative_humidity_2m"
  );
  jmaUrl.searchParams.set("daily", DAILY_VARS);
  jmaUrl.searchParams.set("past_days", "1");
  jmaUrl.searchParams.set("forecast_days", "4");
  jmaUrl.searchParams.set("timezone", "Asia/Tokyo");

  // ── グローバルリクエスト (daily のみ, 7日・延長用) ──
  const globalUrl = new URL(OPEN_METEO_BASE_URL);
  globalUrl.searchParams.set("latitude", lat.toString());
  globalUrl.searchParams.set("longitude", lon.toString());
  globalUrl.searchParams.set("daily", DAILY_VARS);
  globalUrl.searchParams.set("forecast_days", "7");
  globalUrl.searchParams.set("timezone", "Asia/Tokyo");

  // ── AQI リクエスト ──
  const aqiUrl = new URL(OPEN_METEO_AQI_URL);
  aqiUrl.searchParams.set("latitude", lat.toString());
  aqiUrl.searchParams.set("longitude", lon.toString());
  aqiUrl.searchParams.set("current", "us_aqi,pm2_5");

  let jmaData: OpenMeteoResponse;
  let globalData: OpenMeteoResponse;
  let aqiData: AQIData | undefined;

  try {
    const [jmaRes, globalRes, aqiRes] = await Promise.all([
      fetch(jmaUrl.toString(), { next: { revalidate: 600 } }),
      fetch(globalUrl.toString(), { next: { revalidate: 1800 } }),
      fetch(aqiUrl.toString(), { next: { revalidate: 1800 } }),
    ]);

    if (!jmaRes.ok) {
      return Response.json(
        { error: `JMA upstream error (status=${jmaRes.status})` },
        { status: 502 }
      );
    }

    jmaData = (await jmaRes.json()) as OpenMeteoResponse;
    // グローバルが失敗しても JMA だけで続行
    globalData = globalRes.ok
      ? ((await globalRes.json()) as OpenMeteoResponse)
      : {};

    // AQI が失敗しても続行
    if (aqiRes.ok) {
      try {
        const aqiJson = await aqiRes.json() as { current?: { us_aqi?: number; pm2_5?: number } };
        aqiData = mapAQIResponse(aqiJson);
      } catch { /* ignore */ }
    }
  } catch (err) {
    // 内部エラー詳細はサーバーログのみに出力し、クライアントには返さない
    console.error("[api/weather full]", err);
    return Response.json(
      { error: "気象データの取得に失敗しました" },
      { status: 502 }
    );
  }

  // ── JMA daily の日付セットと最終日を取得 ──
  const jmaTimes = jmaData.daily?.time ?? [];
  const jmaDateSet = new Set(jmaTimes);
  const jmaLastDate = [...jmaTimes].sort().at(-1) ?? "";

  // ── グローバル daily から JMA 未収録かつ JMA 最終日より後の日を抽出 ──
  const globalTimes = globalData.daily?.time ?? [];
  const globalTimeToIdx = new Map(globalTimes.map((t, i) => [t, i]));
  const extension = globalTimes
    .map((t, i) => ({ t, i }))
    .filter(({ t }) => !jmaDateSet.has(t) && t > jmaLastDate);
  const extIdx = extension.map((x) => x.i);

  // JMA は precipitation_probability を提供しないため、JMA 日付分もグローバルから取る
  const globalPrecipProbForJmaDates = jmaTimes.map((t) => {
    const gi = globalTimeToIdx.get(t);
    return gi !== undefined
      ? (globalData.daily?.precipitation_probability_max?.[gi] ?? null)
      : null;
  });

  // ── daily データをマージ ──
  const mergedDaily = {
    time: [...jmaTimes, ...extension.map((x) => x.t)],
    temperature_2m_max: [
      ...(jmaData.daily?.temperature_2m_max ?? []),
      ...pick(globalData.daily?.temperature_2m_max, extIdx),
    ],
    temperature_2m_min: [
      ...(jmaData.daily?.temperature_2m_min ?? []),
      ...pick(globalData.daily?.temperature_2m_min, extIdx),
    ],
    relative_humidity_2m_max: [
      ...(jmaData.daily?.relative_humidity_2m_max ?? []),
      ...pick(globalData.daily?.relative_humidity_2m_max, extIdx),
    ],
    // JMA は precipitation_probability を持たないのでグローバル値を全日付で使用
    precipitation_probability_max: [
      ...globalPrecipProbForJmaDates,
      ...pick(globalData.daily?.precipitation_probability_max, extIdx),
    ],
    pressure_msl_min: [
      ...(jmaData.daily?.pressure_msl_min ?? []),
      ...pick(globalData.daily?.pressure_msl_min, extIdx),
    ],
    pressure_msl_max: [
      ...(jmaData.daily?.pressure_msl_max ?? []),
      ...pick(globalData.daily?.pressure_msl_max, extIdx),
    ],
    weathercode: [
      ...(jmaData.daily?.weathercode ?? []),
      ...pick(globalData.daily?.weathercode, extIdx),
    ],
  };

  const mergedData = {
    ...jmaData,
    daily: mergedDaily,
  };

  const fullData = mapOpenMeteoFullResponse(
    mergedData as Parameters<typeof mapOpenMeteoFullResponse>[0],
    new Date()
  );

  return Response.json({ ...fullData, aqi: aqiData }, {
    status: 200,
    headers: {
      "Cache-Control": "public, s-maxage=600, stale-while-revalidate=1800",
    },
  });
}

export async function GET(request: Request): Promise<Response> {
  // ── IP レート制限チェック ──
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";

  if (!checkRateLimit(ip)) {
    return Response.json(
      { error: "リクエスト数が上限に達しました。しばらく経ってからお試しください。" },
      { status: 429, headers: { "Retry-After": "60" } }
    );
  }

  // ── Origin チェック: 自ドメイン以外からの直接呼び出しを拒否 ──
  // ブラウザからのリクエストは必ず Origin ヘッダーを持つ。
  // サーバー間通信（origin なし）はそのまま通過させる。
  const origin = request.headers.get("origin");
  if (origin !== null && !ALLOWED_ORIGINS.has(origin)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const parsed = parseLatLon(searchParams);
  if (!parsed.ok) {
    return Response.json({ error: parsed.reason }, { status: 400 });
  }

  const mode = parseType(searchParams);

  // full モードはハイブリッド専用ハンドラへ
  if (mode === "full") {
    return handleFullMode(parsed.lat, parsed.lon);
  }

  // ── それ以外は通常エンドポイント ──
  const upstream = new URL(OPEN_METEO_BASE_URL);
  upstream.searchParams.set("latitude", parsed.lat.toString());
  upstream.searchParams.set("longitude", parsed.lon.toString());

  if (mode === "forecast") {
    // 明日の予報を取得 (後方互換)
    upstream.searchParams.set(
      "daily",
      "temperature_2m_max,temperature_2m_min,relative_humidity_2m_max,precipitation_probability_max,pressure_msl_min,pressure_msl_max"
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
      next: { revalidate: 600 },
    });
  } catch (err) {
    // 内部エラー詳細はサーバーログのみに出力し、クライアントには返さない
    console.error("[api/weather]", err);
    return Response.json(
      { error: "気象データの取得に失敗しました" },
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
    // 内部エラー詳細はサーバーログのみに出力し、クライアントには返さない
    console.error("[api/weather] JSON parse error", err);
    return Response.json(
      { error: "Open-Meteo のレスポンスを解釈できませんでした" },
      { status: 502 }
    );
  }

  if (mode === "forecast") {
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
