/**
 * SleepForecast デモデータ (F003)。
 *
 * ダッシュボードで `getRecords()` の件数が 0〜9 件のとき、
 * このデータを「サンプルデータ表示中」バナー付きで描画する。
 * 10 件以上になった時点でリアルデータに完全切り替え（混在させない）。
 *
 * 生成方針 (harness/spec.md 準拠):
 * - 30 件固定 (直近 30 日)
 * - quality / pressureDeltaHpa は固定配列
 * - 気圧下降日 (pressureDeltaHpa <= -3) が 8 件含まれる
 * - prefectureCode: "13" (東京) 固定
 * - source: "open-meteo" 固定
 *
 * 注意: ビルド時に一度だけ計算され、以降は不変な定数として使う。
 * 日付は「現在の日付」ではなく「SleepForecast のデモ基準日 2026-04-10」
 * を起点とする。SSR/CSR 間で日付がズレてハイドレーション不整合を起こさない
 * ためにも、ランタイムの `new Date()` には依存しない。
 */

import type { SleepQuality, SleepRecord } from "./types";

/** デモデータの基準日 (YYYY-MM-DD, Asia/Tokyo)。これが「今日」として扱われる。 */
const DEMO_BASE_DATE = "2026-04-10";

/**
 * quality 配列 (30 件、先頭が最新)。
 * 気圧急低下日 (index 1, 5, 9, 14, 19, 23, 27 など) を意図的に低めに設定。
 */
const QUALITY_SEQUENCE: readonly SleepQuality[] = [
  3, 2, 4, 3, 5, 2, 3, 4, 3, 2, 4, 5, 3, 3, 2, 4, 3, 5, 3, 2, 4, 3, 3, 2, 4, 5,
  3, 3, 4, 3,
];

/**
 * 前日比気圧差 (hPa、先頭が最新)。
 * `<= -3` を満たす日: index 1 (-4.2), 5 (-3.8), 9 (-5.1), 14 (-3.2),
 *                     19 (-4.7), 23 (-3.5), 26 (-3.0), 28 (-4.1) の計 8 件。
 */
const PRESSURE_DELTA_SEQUENCE: readonly number[] = [
  0.0, -4.2, 1.1, -1.0, 0.5, -3.8, 0.2, 1.5, 0.0, -5.1, 2.2, 0.8, -1.4, 0.3,
  -3.2, 1.0, -0.5, 2.1, 0.4, -4.7, 1.8, 0.0, -1.2, -3.5, 0.6, 1.3, -3.0, 0.7,
  -4.1, 0.2,
];

/** 海面更正気圧 (hPa)。1005〜1015 の帯で揺らす。 */
const PRESSURE_SEQUENCE: readonly number[] = [
  1014.0, 1009.8, 1010.9, 1009.9, 1010.4, 1006.2, 1010.6, 1012.1, 1012.1,
  1007.0, 1013.2, 1014.0, 1012.6, 1012.9, 1008.7, 1013.9, 1013.4, 1014.5,
  1014.9, 1010.2, 1013.0, 1013.0, 1011.8, 1008.3, 1008.9, 1014.2, 1011.2,
  1011.9, 1007.8, 1008.0,
];

/** 気温 (°C)。春らしく 10〜22 の帯。 */
const TEMPERATURE_SEQUENCE: readonly number[] = [
  15.1, 12.4, 14.8, 13.9, 17.2, 11.8, 14.0, 16.5, 15.0, 10.9, 16.0, 18.2, 14.6,
  13.3, 11.5, 17.8, 15.4, 19.1, 16.2, 12.1, 17.5, 15.9, 14.3, 11.0, 16.8, 20.4,
  14.2, 13.7, 12.9, 14.1,
];

/** 相対湿度 (%)。50〜75 の帯。 */
const HUMIDITY_SEQUENCE: readonly number[] = [
  62, 73, 58, 68, 54, 75, 63, 55, 60, 74, 57, 52, 65, 67, 72, 56, 61, 53, 59,
  71, 58, 64, 66, 73, 57, 51, 63, 65, 70, 64,
];

/** YYYY-MM-DD 文字列を N 日前に遡った文字列に変換する (タイムゾーン非依存)。 */
function offsetDate(baseIso: string, daysBefore: number): string {
  // new Date("YYYY-MM-DD") は UTC 0:00 として解釈されるが、
  // 日単位の減算なのでタイムゾーンの影響は受けない。
  const base = new Date(`${baseIso}T00:00:00Z`);
  base.setUTCDate(base.getUTCDate() - daysBefore);
  const year = base.getUTCFullYear();
  const month = String(base.getUTCMonth() + 1).padStart(2, "0");
  const day = String(base.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * 月齢フェーズを 0.0 から 0.03 ずつ進めたあと、0..1 にラップする。
 * 満月 (0.45〜0.55) が複数回訪れるようにシーケンスを組む。
 */
function buildMoonPhase(index: number): number {
  const raw = index * 0.03;
  const wrapped = raw - Math.floor(raw);
  // 小数点 4 桁に丸める (描画時の numeric 安定性のため)
  return Math.round(wrapped * 10000) / 10000;
}

/** 月の照度 (0..1)。phase を半周期正弦波で近似する。 */
function buildMoonIllumination(phase: number): number {
  const fraction = Math.sin(phase * Math.PI);
  // 負にならないよう ReLU、そして 0..1 にクランプ
  const clamped = Math.max(0, Math.min(1, fraction));
  return Math.round(clamped * 10000) / 10000;
}

/**
 * デモ用の 30 件固定レコード。
 * 先頭 (index 0) が最新日 (DEMO_BASE_DATE)、末尾が 29 日前。
 */
export const DEMO_RECORDS: SleepRecord[] = QUALITY_SEQUENCE.map(
  (quality, index) => {
    const date = offsetDate(DEMO_BASE_DATE, index);
    const phase = buildMoonPhase(index);
    const illumination = buildMoonIllumination(phase);
    const fetchedAt = `${date}T08:00:00+09:00`;
    const id = `demo_${date}`;

    return {
      id,
      date,
      quality,
      prefectureCode: "13",
      weather: {
        temperatureC: TEMPERATURE_SEQUENCE[index],
        humidity: HUMIDITY_SEQUENCE[index],
        pressureHpa: PRESSURE_SEQUENCE[index],
        pressureDeltaHpa: PRESSURE_DELTA_SEQUENCE[index],
        moonPhase: phase,
        moonIllumination: illumination,
        fetchedAt,
        source: "open-meteo" as const,
      },
      createdAt: fetchedAt,
      updatedAt: fetchedAt,
    };
  }
);

/**
 * デモデータであるかどうかを判定する (records が何件であっても
 * 先頭の id が `demo_` 接頭辞なら true)。
 */
export function isDemoRecord(record: SleepRecord): boolean {
  return record.id.startsWith("demo_");
}
