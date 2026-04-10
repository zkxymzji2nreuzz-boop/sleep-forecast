"use client";

/**
 * 記録フォーム (F002 本体)。
 *
 * 要件 (抜粋):
 * - 5 段階評価ボタン (😴😐🙂😀🌟) を最上部に大型配置
 * - 都道府県 select (デフォルト復元 + Geolocation スナップ)
 * - 任意: 就寝時刻 / 起床時刻 / 自由メモ 280 字
 * - 送信: /api/weather 呼び出し → 失敗時は手動入力フォールバック
 * - 同日 2 回目の記録は上書き (「更新する」文言に切り替え)
 * - shadcn toast で成功通知
 * - モバイル 375px で崩れない、タップ 44px 以上、a11y 対応
 */

import * as React from "react";
import Link from "next/link";
import {
  BarChart3,
  MapPin,
  Loader2,
  RefreshCcw,
  Moon,
  Sunrise,
  TrendingUp,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  PREFECTURES,
  findNearestPrefecture,
  getPrefectureByCode,
} from "@/lib/prefectures";
import {
  formatDateJst,
  getDefaultPrefectureCode,
  getRecords,
  getTodayRecord,
  saveRecord,
  setDefaultPrefectureCode,
} from "@/lib/storage";
import type { SleepQuality, SleepRecord, WeatherData } from "@/lib/types";
import { fetchWeather, getMoonData } from "@/lib/weather";

/** 5 段階評価ラベルマスタ (spec.md の対応表に準拠) */
const QUALITY_OPTIONS: Array<{
  value: SleepQuality;
  emoji: string;
  label: string;
  aria: string;
}> = [
  { value: 1, emoji: "😴", label: "とても悪い", aria: "睡眠品質 1 とても悪い" },
  { value: 2, emoji: "😐", label: "悪い", aria: "睡眠品質 2 悪い" },
  { value: 3, emoji: "🙂", label: "普通", aria: "睡眠品質 3 普通" },
  { value: 4, emoji: "😀", label: "良い", aria: "睡眠品質 4 良い" },
  { value: 5, emoji: "🌟", label: "とても良い", aria: "睡眠品質 5 とても良い" },
];

/** HH:mm 形式のゆるい正規表現 (空文字列は許容) */
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

/** フォーム状態 */
type FormState = {
  quality: SleepQuality | null;
  prefectureCode: string;
  bedtime: string;
  wakeTime: string;
  note: string;
};

/** バリデーションエラー */
type FormErrors = Partial<Record<keyof FormState, string>>;

/** 手動入力フォールバック用の気象値 */
type ManualWeather = {
  temperatureC: string;
  humidity: string;
  pressureHpa: string;
};

const DEFAULT_MANUAL: ManualWeather = {
  temperatureC: "",
  humidity: "",
  pressureHpa: "",
};

/** フォームの初期状態を組み立てる */
function buildInitialState(existing: SleepRecord | null): FormState {
  const defaultCode = getDefaultPrefectureCode() ?? "13";
  if (existing) {
    return {
      quality: existing.quality,
      prefectureCode: existing.prefectureCode,
      bedtime: existing.bedtime ?? "",
      wakeTime: existing.wakeTime ?? "",
      note: existing.note ?? "",
    };
  }
  return {
    quality: null,
    prefectureCode: defaultCode,
    bedtime: "",
    wakeTime: "",
    note: "",
  };
}

export function RecordForm(): JSX.Element {
  const { toast } = useToast();

  // SSR ハイドレーション対策: 初回は server 側と同じ「空」で描画し、
  // useEffect 内で localStorage の値に置き換える
  const [existingRecord, setExistingRecord] = React.useState<SleepRecord | null>(
    null
  );
  const [form, setForm] = React.useState<FormState>(() =>
    buildInitialState(null)
  );
  const [errors, setErrors] = React.useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isGeolocating, setIsGeolocating] = React.useState(false);
  const [showManualFallback, setShowManualFallback] = React.useState(false);
  const [manual, setManual] = React.useState<ManualWeather>(DEFAULT_MANUAL);
  const [savedView, setSavedView] = React.useState<SleepRecord | null>(null);
  // マウント後に localStorage から読み出した全記録 (メトリクスバー用)
  const [allRecords, setAllRecords] = React.useState<SleepRecord[]>([]);

  // 初回マウント時に localStorage から既存記録を読み込む
  React.useEffect(() => {
    const today = getTodayRecord();
    setExistingRecord(today);
    setForm(buildInitialState(today));
    setAllRecords(getRecords());
  }, []);

  // ヘッダメトリクス: 今月の記録件数と連続記録日数
  const metrics = React.useMemo(() => {
    if (allRecords.length === 0) {
      return { monthCount: 0, streak: 0 };
    }
    // 今月の件数 (JST の yyyy-MM)
    const todayStr = formatDateJst(new Date());
    const yearMonth = todayStr.slice(0, 7);
    const monthCount = allRecords.filter((r) => r.date.startsWith(yearMonth))
      .length;

    // 連続日数: 今日 (または昨日) から遡って date が連続している件数
    const dateSet = new Set(allRecords.map((r) => r.date));
    const msPerDay = 24 * 60 * 60 * 1000;
    const base = new Date(`${todayStr}T00:00:00+09:00`).getTime();
    let streak = 0;
    // 今日が無くても昨日から連続していればカウント開始
    const startOffset = dateSet.has(todayStr) ? 0 : 1;
    if (startOffset === 1) {
      const yesterday = formatDateJst(new Date(base - msPerDay));
      if (!dateSet.has(yesterday)) {
        return { monthCount, streak: 0 };
      }
    }
    // 連続カウント
    for (let i = startOffset; ; i += 1) {
      const d = formatDateJst(new Date(base - i * msPerDay));
      if (dateSet.has(d)) {
        streak += 1;
      } else {
        break;
      }
    }
    return { monthCount, streak };
  }, [allRecords]);

  const isUpdate = existingRecord !== null;

  /** 都道府県選択の同期保存 */
  const handlePrefectureChange = (code: string): void => {
    setForm((prev) => ({ ...prev, prefectureCode: code }));
    setDefaultPrefectureCode(code);
  };

  /** 5 段階評価選択 */
  const handleQualityPick = (value: SleepQuality): void => {
    setForm((prev) => ({ ...prev, quality: value }));
    setErrors((prev) => ({ ...prev, quality: undefined }));
  };

  /** Geolocation ボタン: 緯度経度から最寄り都道府県を推定 */
  const handleGeolocate = (): void => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      toast({
        title: "位置情報を利用できません",
        description: "お使いの環境では Geolocation API が有効ではありません。",
        variant: "destructive",
      });
      return;
    }
    setIsGeolocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const nearest = findNearestPrefecture(
          pos.coords.latitude,
          pos.coords.longitude
        );
        handlePrefectureChange(nearest.code);
        toast({
          title: "位置情報から設定しました",
          description: `${nearest.name} を選択しました`,
        });
        setIsGeolocating(false);
      },
      (err) => {
        toast({
          title: "位置情報の取得に失敗しました",
          description: err.message,
          variant: "destructive",
        });
        setIsGeolocating(false);
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 60_000 }
    );
  };

  /** フォームのバリデーション。問題があれば errors を更新して false を返す */
  const validate = (): boolean => {
    const next: FormErrors = {};
    if (form.quality === null) {
      next.quality = "睡眠品質を選択してください";
    }
    if (!/^\d{2}$/.test(form.prefectureCode)) {
      next.prefectureCode = "都道府県を選択してください";
    }
    if (form.bedtime && !TIME_RE.test(form.bedtime)) {
      next.bedtime = "HH:mm 形式で入力してください";
    }
    if (form.wakeTime && !TIME_RE.test(form.wakeTime)) {
      next.wakeTime = "HH:mm 形式で入力してください";
    }
    if (form.note.length > 280) {
      next.note = "メモは 280 字以内で入力してください";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  /** 手動入力値 → WeatherData へ変換 */
  const buildManualWeather = (): WeatherData => {
    const now = new Date();
    const moon = getMoonData(now);
    const temperatureC = Number(manual.temperatureC);
    const humidity = Number(manual.humidity);
    const pressureHpa = Number(manual.pressureHpa);
    return {
      temperatureC: Number.isFinite(temperatureC) ? temperatureC : 0,
      humidity: Number.isFinite(humidity) ? humidity : 0,
      pressureHpa: Number.isFinite(pressureHpa) ? pressureHpa : 1013,
      pressureDeltaHpa: 0,
      moonPhase: moon.phase,
      moonIllumination: moon.illumination,
      fetchedAt: now.toISOString(),
      source: "manual",
    };
  };

  /** 送信ハンドラ */
  const handleSubmit = async (
    e: React.FormEvent<HTMLFormElement>
  ): Promise<void> => {
    e.preventDefault();
    if (!validate() || form.quality === null) return;

    setIsSubmitting(true);
    try {
      const pref = getPrefectureByCode(form.prefectureCode);
      if (!pref) {
        throw new Error("都道府県データが見つかりません");
      }

      let weather: WeatherData;
      if (showManualFallback) {
        // 手動入力モード: API を叩かずそのまま保存
        weather = buildManualWeather();
      } else {
        try {
          weather = await fetchWeather(pref.latitude, pref.longitude);
        } catch {
          // API 失敗: 手動入力フォールバックを表示して中断
          toast({
            title: "気象データの取得に失敗しました",
            description:
              "ネットワークや Open-Meteo API の状態をご確認ください。手動入力でも保存できます。",
            variant: "destructive",
          });
          setShowManualFallback(true);
          setIsSubmitting(false);
          return;
        }
      }

      const today = formatDateJst(new Date());
      const saved = saveRecord({
        date: today,
        quality: form.quality,
        bedtime: form.bedtime || undefined,
        wakeTime: form.wakeTime || undefined,
        note: form.note || undefined,
        prefectureCode: form.prefectureCode,
        weather,
      });

      toast({
        title: isUpdate ? "今日の記録を更新しました" : "今日の記録を保存しました",
        description: `${pref.name} / 品質 ${form.quality}`,
      });
      setSavedView(saved);
      setExistingRecord(saved);
    } catch (err) {
      toast({
        title: "保存に失敗しました",
        description: (err as Error).message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  /** 記録済みビューから再編集モードへ戻る */
  const handleEditAgain = (): void => {
    setSavedView(null);
    setShowManualFallback(false);
    setManual(DEFAULT_MANUAL);
  };

  // 手動入力フォールバック時、必須 3 項目が埋まったかをチェック
  const manualValid =
    !showManualFallback ||
    (manual.temperatureC !== "" &&
      manual.humidity !== "" &&
      manual.pressureHpa !== "");

  const submitDisabled =
    isSubmitting || form.quality === null || !manualValid;

  // 記録完了後のビュー
  if (savedView) {
    const pref = getPrefectureByCode(savedView.prefectureCode);
    const w = savedView.weather;
    return (
      <div className="container mx-auto max-w-screen-md px-4 py-10 sm:py-14">
        <Card className="border-0 bg-transparent shadow-none">
          <CardHeader className="items-center text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[#1d9bf0]/10 shadow-[0_0_40px_-10px_rgba(29,155,240,0.5)] ring-1 ring-[#1d9bf0]/30">
              <Moon className="h-7 w-7 text-[#1d9bf0]" aria-hidden="true" />
            </div>
            <CardTitle className="text-xl text-[#e6e8ee]">
              今日の記録を保存しました
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-[#e6e8ee]">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 border-t border-white/5 pt-4">
              <div className="border-0 bg-transparent py-2">
                <dt className="text-[11px] uppercase tracking-wider text-[#8b92a5]">
                  睡眠品質
                </dt>
                <dd className="mt-1 text-2xl font-semibold tabular-nums text-[#e6e8ee]">
                  {savedView.quality} / 5
                </dd>
              </div>
              <div className="border-0 bg-transparent py-2">
                <dt className="text-[11px] uppercase tracking-wider text-[#8b92a5]">
                  都道府県
                </dt>
                <dd className="mt-1 text-2xl font-semibold tabular-nums text-[#e6e8ee]">
                  {pref?.name ?? savedView.prefectureCode}
                </dd>
              </div>
              <div className="border-0 bg-transparent py-2">
                <dt className="text-[11px] uppercase tracking-wider text-[#8b92a5]">
                  気温
                </dt>
                <dd className="mt-1 text-2xl font-semibold tabular-nums text-[#e6e8ee]">
                  {w.temperatureC.toFixed(1)}°C
                </dd>
              </div>
              <div className="border-0 bg-transparent py-2">
                <dt className="text-[11px] uppercase tracking-wider text-[#8b92a5]">
                  気圧 (24h 差)
                </dt>
                <dd className="mt-1 text-2xl font-semibold tabular-nums text-[#e6e8ee]">
                  {w.pressureHpa.toFixed(1)}{" "}
                  <span className="text-sm tabular-nums text-[#8b92a5]">
                    ({w.pressureDeltaHpa >= 0 ? "+" : ""}
                    {w.pressureDeltaHpa.toFixed(1)})
                  </span>
                </dd>
              </div>
            </dl>
            <div className="flex flex-col gap-2">
              <Button
                asChild
                className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:from-indigo-600 hover:to-purple-600"
              >
                <Link href="/dashboard">
                  <BarChart3 className="mr-2 h-4 w-4" aria-hidden="true" />
                  ダッシュボードを見る
                </Link>
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full text-[#8b92a5] hover:bg-transparent hover:text-[#1d9bf0]"
                onClick={handleEditAgain}
              >
                <RefreshCcw className="mr-2 h-4 w-4" aria-hidden="true" />
                今日の記録を修正する
              </Button>
            </div>
            <p className="pt-2 text-center text-xs text-[#8b92a5]">
              本サービスは医療行為・診断を目的としたものではありません。
              記録は健康管理の参考としてご利用ください。
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-screen-md px-4 py-8 pb-24 sm:py-12 sm:pb-0">
      <div className="mb-6 text-center">
        <div className="mb-4 flex items-center justify-center gap-4 text-xs tabular-nums text-[#8b92a5]">
          <span className="inline-flex items-center gap-1.5">
            <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />
            今月 {metrics.monthCount}/30
          </span>
          <span aria-hidden="true">·</span>
          <span>連続 {metrics.streak} 日</span>
        </div>
        <h1 className="text-2xl font-bold text-[#e6e8ee] sm:text-3xl">
          今日の睡眠を記録する
        </h1>
        <p className="mt-2 text-sm text-[#8b92a5]">
          毎朝 30 秒で OK。気象データは自動で取得します。
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        <Card className="border-0 bg-transparent shadow-none">
          <CardContent className="space-y-8 p-0 sm:p-2">
            {/* 1) 5 段階評価 */}
            <fieldset>
              <legend className="mb-3 block text-sm font-medium text-[#e6e8ee]">
                昨晩の睡眠はいかがでしたか？
                <span className="text-[#f87171]" aria-hidden="true">
                  {" "}
                  *
                </span>
              </legend>
              <div
                role="radiogroup"
                aria-label="睡眠品質 5 段階評価"
                className="grid grid-cols-5 gap-1.5 sm:gap-2"
              >
                {QUALITY_OPTIONS.map((opt) => {
                  const selected = form.quality === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      aria-label={opt.aria}
                      onClick={() => handleQualityPick(opt.value)}
                      className={[
                        "flex min-h-[76px] min-w-[44px] flex-col items-center justify-center gap-1 rounded-lg bg-white/[0.03] p-1 text-[#8b92a5] transition-colors hover:bg-white/[0.06] hover:text-[#e6e8ee] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1d9bf0]",
                        selected
                          ? "bg-[#1d9bf0]/10 text-[#e6e8ee] ring-1 ring-inset ring-[#1d9bf0]/60 shadow-[0_0_24px_-8px_rgba(29,155,240,0.55)]"
                          : "",
                      ].join(" ")}
                    >
                      <span className="text-2xl" aria-hidden="true">
                        {opt.emoji}
                      </span>
                      <span className="text-[10px] leading-tight sm:text-xs">
                        {opt.label}
                      </span>
                      {selected ? (
                        <span
                          className="mt-1 block h-0.5 w-6 rounded-full bg-[#1d9bf0]"
                          aria-hidden="true"
                        />
                      ) : null}
                    </button>
                  );
                })}
              </div>
              {errors.quality ? (
                <p
                  className="mt-2 text-xs text-[#f87171]"
                  role="alert"
                >
                  {errors.quality}
                </p>
              ) : null}
            </fieldset>

            {/* 2) 都道府県 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label
                  htmlFor="prefecture"
                  className="text-sm font-medium text-[#e6e8ee]"
                >
                  お住まいの地域
                  <span className="text-[#f87171]" aria-hidden="true">
                    {" "}
                    *
                  </span>
                </Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1 px-2 text-xs text-[#8b92a5] underline-offset-4 hover:bg-transparent hover:text-[#1d9bf0] hover:underline"
                  onClick={handleGeolocate}
                  disabled={isGeolocating}
                  aria-label="現在地から都道府県を自動取得"
                >
                  {isGeolocating ? (
                    <Loader2
                      className="h-3.5 w-3.5 animate-spin"
                      aria-hidden="true"
                    />
                  ) : (
                    <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                  位置を自動取得
                </Button>
              </div>
              <Select
                value={form.prefectureCode}
                onValueChange={handlePrefectureChange}
              >
                <SelectTrigger
                  id="prefecture"
                  className="h-11 border-0 bg-white/[0.04] text-[#e6e8ee] focus:ring-1 focus:ring-[#1d9bf0] focus:ring-offset-0"
                  aria-label="都道府県を選択"
                >
                  <SelectValue placeholder="都道府県を選択" />
                </SelectTrigger>
                <SelectContent className="max-h-[320px] border-white/5 bg-[#141826] text-[#e6e8ee]">
                  {PREFECTURES.map((p) => (
                    <SelectItem key={p.code} value={p.code}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.prefectureCode ? (
                <p className="text-xs text-[#f87171]" role="alert">
                  {errors.prefectureCode}
                </p>
              ) : null}
            </div>

            {/* 3) 任意: 就寝/起床時刻 */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label
                  htmlFor="bedtime"
                  className="flex items-center text-sm font-medium text-[#e6e8ee]"
                >
                  <Moon
                    className="mr-1 h-3.5 w-3.5 text-[#8b92a5]"
                    aria-hidden="true"
                  />
                  就寝時刻 (任意)
                </Label>
                <Input
                  id="bedtime"
                  type="time"
                  inputMode="numeric"
                  autoComplete="off"
                  value={form.bedtime}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, bedtime: e.target.value }))
                  }
                  className="h-11 rounded-none border-0 border-b border-white/10 bg-transparent px-0 text-[#e6e8ee] tabular-nums focus-visible:border-[#1d9bf0] focus-visible:ring-0"
                />
                {errors.bedtime ? (
                  <p className="text-xs text-[#f87171]" role="alert">
                    {errors.bedtime}
                  </p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="wakeTime"
                  className="flex items-center text-sm font-medium text-[#e6e8ee]"
                >
                  <Sunrise
                    className="mr-1 h-3.5 w-3.5 text-[#8b92a5]"
                    aria-hidden="true"
                  />
                  起床時刻 (任意)
                </Label>
                <Input
                  id="wakeTime"
                  type="time"
                  inputMode="numeric"
                  autoComplete="off"
                  value={form.wakeTime}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, wakeTime: e.target.value }))
                  }
                  className="h-11 rounded-none border-0 border-b border-white/10 bg-transparent px-0 text-[#e6e8ee] tabular-nums focus-visible:border-[#1d9bf0] focus-visible:ring-0"
                />
                {errors.wakeTime ? (
                  <p className="text-xs text-[#f87171]" role="alert">
                    {errors.wakeTime}
                  </p>
                ) : null}
              </div>
            </div>

            {/* 4) 任意: 自由メモ */}
            <div className="space-y-2">
              <Label
                htmlFor="note"
                className="text-sm font-medium text-[#e6e8ee]"
              >
                自由メモ (任意 ·{" "}
                <span className="tabular-nums">{form.note.length}/280</span>)
              </Label>
              <textarea
                id="note"
                maxLength={280}
                rows={3}
                value={form.note}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, note: e.target.value }))
                }
                className="w-full rounded-md border-0 bg-white/[0.03] px-3 py-2 text-sm text-[#e6e8ee] placeholder:text-[#8b92a5]/70 focus:outline-none focus:ring-1 focus:ring-[#1d9bf0]"
                placeholder="例: 夜中に一度目が覚めた / 寝る前にスマホを見すぎた"
              />
              {errors.note ? (
                <p className="text-xs text-[#f87171]" role="alert">
                  {errors.note}
                </p>
              ) : null}
            </div>

            {/* 手動入力フォールバック */}
            {showManualFallback ? (
              <div
                className="space-y-3 rounded-md border border-dashed border-[#f59e0b]/40 bg-[#f59e0b]/5 p-4"
                role="group"
                aria-label="気象データの手動入力"
              >
                <p className="text-xs text-[#f59e0b]">
                  気象 API に接続できませんでした。以下に手動で入力して保存できます。
                </p>
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <Label
                      htmlFor="manual-temp"
                      className="text-xs text-[#8b92a5]"
                    >
                      気温 (°C)
                    </Label>
                    <Input
                      id="manual-temp"
                      type="number"
                      step="0.1"
                      inputMode="decimal"
                      value={manual.temperatureC}
                      onChange={(e) =>
                        setManual((prev) => ({
                          ...prev,
                          temperatureC: e.target.value,
                        }))
                      }
                      className="h-11 rounded-none border-0 border-b border-white/10 bg-transparent px-0 text-[#e6e8ee] tabular-nums focus-visible:border-[#1d9bf0] focus-visible:ring-0"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label
                      htmlFor="manual-hum"
                      className="text-xs text-[#8b92a5]"
                    >
                      湿度 (%)
                    </Label>
                    <Input
                      id="manual-hum"
                      type="number"
                      step="1"
                      inputMode="numeric"
                      value={manual.humidity}
                      onChange={(e) =>
                        setManual((prev) => ({
                          ...prev,
                          humidity: e.target.value,
                        }))
                      }
                      className="h-11 rounded-none border-0 border-b border-white/10 bg-transparent px-0 text-[#e6e8ee] tabular-nums focus-visible:border-[#1d9bf0] focus-visible:ring-0"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label
                      htmlFor="manual-pre"
                      className="text-xs text-[#8b92a5]"
                    >
                      気圧 (hPa)
                    </Label>
                    <Input
                      id="manual-pre"
                      type="number"
                      step="0.1"
                      inputMode="decimal"
                      value={manual.pressureHpa}
                      onChange={(e) =>
                        setManual((prev) => ({
                          ...prev,
                          pressureHpa: e.target.value,
                        }))
                      }
                      className="h-11 rounded-none border-0 border-b border-white/10 bg-transparent px-0 text-[#e6e8ee] tabular-nums focus-visible:border-[#1d9bf0] focus-visible:ring-0"
                    />
                  </div>
                </div>
              </div>
            ) : null}

            {/* 送信 (モバイル下部固定、デスクトップは通常配置) */}
            <div className="sticky bottom-0 -mx-4 mt-2 border-t border-white/5 bg-[#0f1117]/90 p-4 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
              <Button
                type="submit"
                className="h-12 w-full bg-[#1d9bf0] text-base font-semibold text-white hover:bg-[#1d9bf0]/90 disabled:opacity-50"
                disabled={submitDisabled}
              >
                {isSubmitting ? (
                  <>
                    <Loader2
                      className="mr-2 h-4 w-4 animate-spin"
                      aria-hidden="true"
                    />
                    保存中...
                  </>
                ) : isUpdate ? (
                  "今日の記録を更新する"
                ) : (
                  "記録する"
                )}
              </Button>
            </div>

            <p className="text-center text-xs text-[#8b92a5]">
              本サービスは医療行為・診断を目的としたものではありません。
              記録は健康管理の参考としてご利用ください。
            </p>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
