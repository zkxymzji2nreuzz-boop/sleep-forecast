/**
 * 47 都道府県マスタ (県庁所在地の緯度経度)。
 * コードは JIS X 0401、緯度経度は公開データ (Wikipedia, 気象庁資料相当)
 * をもとに小数 4 桁で格納する。Open-Meteo API のクエリに利用する。
 */

import type { PrefectureMaster } from "./types";

export const PREFECTURES: PrefectureMaster[] = [
  { code: "01", name: "北海道", nameEn: "Hokkaido", latitude: 43.0642, longitude: 141.3469 },
  { code: "02", name: "青森県", nameEn: "Aomori", latitude: 40.8244, longitude: 140.74 },
  { code: "03", name: "岩手県", nameEn: "Iwate", latitude: 39.7036, longitude: 141.1527 },
  { code: "04", name: "宮城県", nameEn: "Miyagi", latitude: 38.2688, longitude: 140.8721 },
  { code: "05", name: "秋田県", nameEn: "Akita", latitude: 39.7186, longitude: 140.1024 },
  { code: "06", name: "山形県", nameEn: "Yamagata", latitude: 38.2404, longitude: 140.3633 },
  { code: "07", name: "福島県", nameEn: "Fukushima", latitude: 37.7503, longitude: 140.4676 },
  { code: "08", name: "茨城県", nameEn: "Ibaraki", latitude: 36.3418, longitude: 140.4468 },
  { code: "09", name: "栃木県", nameEn: "Tochigi", latitude: 36.5658, longitude: 139.8836 },
  { code: "10", name: "群馬県", nameEn: "Gunma", latitude: 36.3912, longitude: 139.0604 },
  { code: "11", name: "埼玉県", nameEn: "Saitama", latitude: 35.8569, longitude: 139.6489 },
  { code: "12", name: "千葉県", nameEn: "Chiba", latitude: 35.6047, longitude: 140.1233 },
  { code: "13", name: "東京都", nameEn: "Tokyo", latitude: 35.6895, longitude: 139.6917 },
  { code: "14", name: "神奈川県", nameEn: "Kanagawa", latitude: 35.4478, longitude: 139.6425 },
  { code: "15", name: "新潟県", nameEn: "Niigata", latitude: 37.9026, longitude: 139.0232 },
  { code: "16", name: "富山県", nameEn: "Toyama", latitude: 36.6953, longitude: 137.2113 },
  { code: "17", name: "石川県", nameEn: "Ishikawa", latitude: 36.5947, longitude: 136.6256 },
  { code: "18", name: "福井県", nameEn: "Fukui", latitude: 36.0652, longitude: 136.2216 },
  { code: "19", name: "山梨県", nameEn: "Yamanashi", latitude: 35.6642, longitude: 138.5684 },
  { code: "20", name: "長野県", nameEn: "Nagano", latitude: 36.6513, longitude: 138.181 },
  { code: "21", name: "岐阜県", nameEn: "Gifu", latitude: 35.3912, longitude: 136.7223 },
  { code: "22", name: "静岡県", nameEn: "Shizuoka", latitude: 34.9769, longitude: 138.3831 },
  { code: "23", name: "愛知県", nameEn: "Aichi", latitude: 35.1802, longitude: 136.9066 },
  { code: "24", name: "三重県", nameEn: "Mie", latitude: 34.7303, longitude: 136.5086 },
  { code: "25", name: "滋賀県", nameEn: "Shiga", latitude: 35.0045, longitude: 135.8686 },
  { code: "26", name: "京都府", nameEn: "Kyoto", latitude: 35.0211, longitude: 135.7556 },
  { code: "27", name: "大阪府", nameEn: "Osaka", latitude: 34.6863, longitude: 135.52 },
  { code: "28", name: "兵庫県", nameEn: "Hyogo", latitude: 34.6913, longitude: 135.1831 },
  { code: "29", name: "奈良県", nameEn: "Nara", latitude: 34.6851, longitude: 135.8329 },
  { code: "30", name: "和歌山県", nameEn: "Wakayama", latitude: 34.2261, longitude: 135.1675 },
  { code: "31", name: "鳥取県", nameEn: "Tottori", latitude: 35.5036, longitude: 134.2381 },
  { code: "32", name: "島根県", nameEn: "Shimane", latitude: 35.4723, longitude: 133.0505 },
  { code: "33", name: "岡山県", nameEn: "Okayama", latitude: 34.6618, longitude: 133.9344 },
  { code: "34", name: "広島県", nameEn: "Hiroshima", latitude: 34.3966, longitude: 132.4596 },
  { code: "35", name: "山口県", nameEn: "Yamaguchi", latitude: 34.186, longitude: 131.4706 },
  { code: "36", name: "徳島県", nameEn: "Tokushima", latitude: 34.0657, longitude: 134.5594 },
  { code: "37", name: "香川県", nameEn: "Kagawa", latitude: 34.3401, longitude: 134.0434 },
  { code: "38", name: "愛媛県", nameEn: "Ehime", latitude: 33.8416, longitude: 132.7657 },
  { code: "39", name: "高知県", nameEn: "Kochi", latitude: 33.5597, longitude: 133.5311 },
  { code: "40", name: "福岡県", nameEn: "Fukuoka", latitude: 33.6064, longitude: 130.4181 },
  { code: "41", name: "佐賀県", nameEn: "Saga", latitude: 33.2494, longitude: 130.2989 },
  { code: "42", name: "長崎県", nameEn: "Nagasaki", latitude: 32.7503, longitude: 129.8779 },
  { code: "43", name: "熊本県", nameEn: "Kumamoto", latitude: 32.7898, longitude: 130.7417 },
  { code: "44", name: "大分県", nameEn: "Oita", latitude: 33.2382, longitude: 131.6126 },
  { code: "45", name: "宮崎県", nameEn: "Miyazaki", latitude: 31.9111, longitude: 131.4239 },
  { code: "46", name: "鹿児島県", nameEn: "Kagoshima", latitude: 31.5602, longitude: 130.5581 },
  { code: "47", name: "沖縄県", nameEn: "Okinawa", latitude: 26.2124, longitude: 127.6809 },
];

/**
 * 都道府県コード → マスタを取得。未定義コードは undefined。
 */
export function getPrefectureByCode(
  code: string
): PrefectureMaster | undefined {
  return PREFECTURES.find((p) => p.code === code);
}

/**
 * ハバーサイン距離 (km) を計算。
 * Geolocation で取得した座標から最寄り都道府県を推定する用途。
 */
function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // 地球半径 (km)
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

/**
 * 与えられた緯度経度から最も近い都道府県を返す。
 * プライバシー配慮のため、保存するのは県コードのみにする。
 */
export function findNearestPrefecture(
  latitude: number,
  longitude: number
): PrefectureMaster {
  let nearest = PREFECTURES[0];
  let minDist = Number.POSITIVE_INFINITY;
  for (const pref of PREFECTURES) {
    const d = haversineKm(latitude, longitude, pref.latitude, pref.longitude);
    if (d < minDist) {
      minDist = d;
      nearest = pref;
    }
  }
  return nearest;
}
