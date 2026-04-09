import { describe, it, expect } from "vitest";

import {
  PREFECTURES,
  getPrefectureByCode,
  findNearestPrefecture,
} from "../prefectures";

describe("prefectures", () => {
  it("happy: PREFECTURES に 47 件ある (北海道〜沖縄県)", () => {
    expect(PREFECTURES).toHaveLength(47);
    // code 01..47 が全て揃っていること
    const codes = new Set(PREFECTURES.map((p) => p.code));
    for (let i = 1; i <= 47; i += 1) {
      expect(codes.has(i.toString().padStart(2, "0"))).toBe(true);
    }
  });

  it("happy: getPrefectureByCode('13') が東京都を返し、緯度経度が妥当", () => {
    const tokyo = getPrefectureByCode("13");
    expect(tokyo).toBeDefined();
    expect(tokyo?.name).toBe("東京都");
    // 東京の緯度経度は 35.x / 139.x 付近であること
    expect(tokyo?.latitude).toBeGreaterThan(35);
    expect(tokyo?.latitude).toBeLessThan(36);
    expect(tokyo?.longitude).toBeGreaterThan(139);
    expect(tokyo?.longitude).toBeLessThan(140);
  });

  it("failure: 未知コードで undefined を返す", () => {
    expect(getPrefectureByCode("99")).toBeUndefined();
    expect(getPrefectureByCode("")).toBeUndefined();
    expect(getPrefectureByCode("abc")).toBeUndefined();
  });

  it("edge: findNearestPrefecture(東京駅付近) は東京都を返す", () => {
    // 東京駅 (35.6812, 139.7671)
    const nearest = findNearestPrefecture(35.6812, 139.7671);
    expect(nearest.code).toBe("13");
  });
});
