"use client";

/**
 * 記録フォーム (F002 本体)。
 *
 * 要件 (抜粋):
 *   - 3 択評価ボタン (よく眠れた / まあまあ / 眠れなかった) を最上部に大型配置
 *   - 地域入力欄なし（気象データは位置情報から自動取得、デフォルト東京都）
 *   - 任意: 就寝時刻 / 起床時刻 / 自由メモ 280 字
 *   - 送信: /api/weather 呼び出し → 失敗時は手動入力フォールバック
 *   - 同日 2 回目の記録は上書き (「更新する」文言に切り替え)
 *   - 「今日はスキップ」リンクを設置
 *   - shadcn toast で成功通知
 *   - モバイル 375px で崩れない、タップ 44px 以上、a11y 対応
 */

import * as React from "react";
import Link from "next/link";
import {
  BarChart3,
  CheckCircle2,
  Home,
  Loader2,
  RefreshCcw,
  Moon,
  Shield,
  Sparkles,
  Sunrise,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  getPrefectureByCode,
} from "@/lib/prefectures";
import {
  applyStreakFreeze,
  formatDateJst,
  getDefaultPrefectureCode,
  getRecords,
  getStreakDays,
  getStreakFreezeCount,
  getTodayRecord,
  saveRecord,
  tryEarnStreakFreeze,
} from "@/lib/db";
import type { SleepQuality, SleepRecord, WeatherData } from "@/lib/types";
import { fetchWeather, getMoonData } from "@/lib/weather";
import { computeWSIScore100 } from "@/lib/wsi";
import { getDemoCount, generateDemoRecords } from "@/lib/demo";
import { DemoModeBanner } from "@/components/DemoModeBanner";

/** 3 択評価マスタ */
const QUALITY_OPTIONS: Array<{
  value: SleepQuality;
  emoji: string;
  label: string;
  aria: string;
}> = [
  { value: 5, emoji: "😊", label: "よく眠れた", aria: "睡眠品質 よく眠れた" },
  { value: 3, emoji: "😐", label: "なんとか眠れた", aria: "睡眠品質 なんとか眠れた" },
  { value: 1, emoji: "😔", label: "眠れなかった", aria: "睡眠品質 眠れなかった" },
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

  /** デモモード: null = 通常, number = デモ件数 */
  const [demoCount, setDemoCount] = React.useState<number | null>(null);

  const [existingRecord, setExistingRecord] = React.useState<SleepRecord | null>(
    null
  );
  const [form, setForm] = React.useState<FormState>(() =>
    buildInitialState(null)
  );
  const [errors, setErrors] = React.useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [showManualFallback, setShowManualFallback] = React.useState(false);
  const [manual, setManual] = React.useState<ManualWeather>(DEFAULT_MANUAL);
  const [savedView, setSavedView] = React.useState<SleepRecord | null>(null);
  const [allRecords, setAllRecords] = React.useState<SleepRecord[]>([]);
  /** 保存後の合計記録件数（初回・節目メッセージ表示用） */
  const [recordCountAfterSave, setRecordCountAfterSave] = React.useState(0);
  /** 保存時にストリークフリーズを自動消費したか */
  const [freezeUsed, setFreezeUsed] = React.useState(false);
  /** 保存時にストリークフリーズを獲得したか */
  const [freezeEarned, setFreezeEarned] = React.useState(false);
  /** 保存後の残りフリーズ枚数 */
  const [freezeCountAfterSave, setFreezeCountAfterSave] = React.useState(0);
  /** 今日の気象サマリー（フォーム上部表示用） */
  const [todayWeather, setTodayWeather] = React.useState<WeatherData | null | "loading">("loading");

  React.useEffect(() => {
    // デモモード判定（URL パラメータ or sessionStorage）
    const demoCnt = getDemoCount();
    setDemoCount(demoCnt);

    if (demoCnt !== null) {
      // デモ: 今日分のレコードをデモデータから取得してフォームに反映
      const demoRecords = generateDemoRecords(demoCnt);
      setAllRecords(demoRecords);
      const todayDemo = demoRecords[0] ?? null; // [0] = 今日
      setExistingRecord(todayDemo);
      setForm(buildInitialState(todayDemo));
      // デモ時は今日の気象を即座にセット
      if (todayDemo) setTodayWeather(todayDemo.weather);
    } else {
      const today = getTodayRecord();
      setExistingRecord(today);
      setForm(buildInitialState(today));
      setAllRecords(getRecords());
    }
  }, []);

  // 今日の気象をページ読み込み時に取得（表示専用）— デモ時はスキップ
  React.useEffect(() => {
    if (getDemoCount() !== null) return; // デモ時は useEffect[1] でセット済み
    const code = getDefaultPrefectureCode() ?? "13";
    const pref = getPrefectureByCode(code);
    if (!pref) { setTodayWeather(null); return; }
    fetchWeather(pref.latitude, pref.longitude)
      .then((w) => setTodayWeather(w))
      .catch(() => setTodayWeather(null));
  }, []);

  const metrics = React.useMemo(() => {
    if (allRecords.length === 0) {
      return { monthCount: 0, streak: 0 };
    }
    const todayStr = formatDateJst(new Date());
    const yearMonth = todayStr.slice(0, 7);
    const monthCount = allRecords.filter((r) => r.date.startsWith(yearMonth)).length;
    const dateSet = new Set(allRecords.map((r) => r.date));
    const msPerDay = 24 * 60 * 60 * 1000;
    const base = new Date(`${todayStr}T00:00:00+09:00`).getTime();
    let streak = 0;
    const startOffset = dateSet.has(todayStr) ? 0 : 1;
    if (startOffset === 1) {
      const yesterday = formatDateJst(new Date(base - msPerDay));
      if (!dateSet.has(yesterday)) {
        return { monthCount, streak: 0 };
      }
    }
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

  // ⑥ 昨夜の予報との照合用: 前日の記録からWSIスコアを概算
  const yesterdayRecord = React.useMemo(() => {
    if (allRecords.length === 0) return null;
    const todayStr = formatDateJst(new Date());
    const msPerDay = 24 * 60 * 60 * 1000;
    const yesterdayStr = formatDateJst(new Date(new Date(`${todayStr}T00:00:00+09:00`).getTime() - msPerDay));
    return allRecords.find((r) => r.date === yesterdayStr) ?? null;
  }, [allRecords]);

  const yesterdayScore = React.useMemo(() => {
    if (!yesterdayRecord) return null;
    const w = yesterdayRecord.weather;
    return computeWSIScore100(
      w.pressureDeltaHpa / 4, // 24h → 6h 近似
      0,                       // tempDelta 不明のため 0
      w.humidity,
      w.apparentTemperatureC
    );
  }, [yesterdayRecord]);

  const yesterdayBadge = yesterdayScore === null ? null
    : yesterdayScore >= 80 ? { label: "とても良い夜", color: "#10b981" }
    : yesterdayScore >= 65 ? { label: "良い夜", color: "#4a90d9" }
    : yesterdayScore >= 45 ? { label: "普通の夜", color: "#a8b0c2" }
    : yesterdayScore >= 25 ? { label: "注意の夜", color: "#f59e0b" }
    : { label: "難しい夜", color: "#f87070" };

  const handleQualityPick = (value: SleepQuality): void => {
    setForm((prev) => ({ ...prev, quality: value }));
    setErrors((prev) => ({ ...prev, quality: undefined }));
  };

  const validate = (): boolean => {
    const next: FormErrors = {};
    if (form.quality === null) next.quality = "睡眠の状態を選択してください";
    if (form.bedtime && !TIME_RE.test(form.bedtime)) next.bedtime = "HH:mm 形式で入力してください";
    if (form.wakeTime && !TIME_RE.test(form.wakeTime)) next.wakeTime = "HH:mm 形式で入力してください";
    if (form.note.length > 280) next.note = "メモは 280 字以内で入力してください";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (!validate() || form.quality === null) return;

    // デモモード: 実際の保存はせず、デモデータの今日分を savedView として表示する
    if (demoCount !== null) {
      const demoRecords = generateDemoRecords(demoCount);
      const todayDemo = demoRecords[0];
      if (todayDemo) setSavedView({ ...todayDemo, quality: form.quality as SleepQuality });
      toast({
        title: "デモモード: 保存はスキップされました",
        description: "本番データには影響しません。",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const pref = getPrefectureByCode(form.prefectureCode);
      if (!pref) throw new Error("都道府県データが見つかりません");
      let weather: WeatherData;
      if (showManualFallback) {
        weather = buildManualWeather();
      } else {
        try {
          weather = await fetchWeather(pref.latitude, pref.longitude);
        } catch {
          toast({
            title: "気象データの取得に失敗しました",
            description: "ネットワークや Open-Meteo API の状態をご確認ください。手動入力でも保存できます。",
            variant: "destructive",
          });
          setShowManualFallback(true);
          setIsSubmitting(false);
          return;
        }
      }
      const today = formatDateJst(new Date());
      const todayBase = new Date(`${today}T00:00:00+09:00`).getTime();
      const yesterdayStr = formatDateJst(new Date(todayBase - 24 * 60 * 60 * 1000));
      const countAfterSave = isUpdate
        ? allRecords.length
        : allRecords.length + 1;
      const saved = saveRecord({
        date: today,
        quality: form.quality,
        bedtime: form.bedtime || undefined,
        wakeTime: form.wakeTime || undefined,
        note: form.note || undefined,
        prefectureCode: form.prefectureCode,
        weather,
      });

      // Streak Freeze 自動消費: 昨日が記録なし かつ フリーズトークンあり
      let usedFreeze = false;
      let earnedFreeze = false;
      if (!isUpdate && yesterdayRecord === null && getStreakFreezeCount() > 0) {
        usedFreeze = applyStreakFreeze(yesterdayStr);
      }
      // フリーズ消費後の連続日数を計算し、7 の倍数なら新たにフリーズを付与
      if (!isUpdate) {
        const newStreak = getStreakDays();
        earnedFreeze = tryEarnStreakFreeze(newStreak);
      }
      const remainingFreezes = getStreakFreezeCount();

      // 保存完了フィードバックは savedView カード（インライン表示）で提供するため Toast は不要
      setFreezeUsed(usedFreeze);
      setFreezeEarned(earnedFreeze);
      setFreezeCountAfterSave(remainingFreezes);
      setRecordCountAfterSave(countAfterSave);
      setSavedView(saved);
      setExistingRecord(saved);
    } catch (err) {
      toast({ title: "保存に失敗しました", description: (err as Error).message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditAgain = (): void => {
    setSavedView(null);
    setShowManualFallback(false);
    setManual(DEFAULT_MANUAL);
    setFreezeUsed(false);
    setFreezeEarned(false);
  };

  const manualValid =
    !showManualFallback ||
    (manual.temperatureC !== "" && manual.humidity !== "" && manual.pressureHpa !== "");
  const submitDisabled = isSubmitting || form.quality === null || !manualValid;

  if (savedView) {
    const w = savedView.weather;
    const qualityLabel = QUALITY_OPTIONS.find((o) => o.value === savedView.quality)?.label ?? String(savedView.quality);
    const isFirstRecord = recordCountAfterSave === 1;
    const isMilestone3 = recordCountAfterSave === 3;
    const isMilestone7 = recordCountAfterSave === 7;
    const remaining = Math.max(0, 7 - recordCountAfterSave);
    const showFreezeEarned = freezeEarned;
    const showFreezeUsed = freezeUsed;

    // 気象ナラティブ: 気圧変化 × 睡眠品質から個人化されたメッセージを生成
    let weatherNarrative: string | null = null;
    if (recordCountAfterSave >= 2) {
      const delta = w.pressureDeltaHpa;
      const q = savedView.quality;
      if (delta <= -5) {
        weatherNarrative = q <= 2
          ? "気圧が急落した夜でした。低気圧の影響が出やすいパターンかもしれません。記録を続けて傾向を確認しましょう。"
          : "気圧が急落する中でも眠れた夜でした。引き続き記録して、あなたの耐性パターンを掴みましょう。";
      } else if (delta <= -3) {
        weatherNarrative = q <= 2
          ? "低気圧の夜は眠りに影響が出やすい傾向があります。データが増えると相関がはっきり見えてきます。"
          : "気圧がやや低めでも眠れましたね。気象と睡眠の関係を引き続き記録で確認しましょう。";
      } else if (delta >= 3) {
        weatherNarrative = "気圧が上昇した安定した夜でした。高気圧の日は比較的眠りやすい傾向があります。";
      }
    }

    return (
      <div className="container mx-auto max-w-screen-md px-4 py-10 sm:py-14 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <Card className="border-0 bg-transparent shadow-none">
          <CardHeader className="items-center text-center pb-2">
            {/* アイコン: 初回はSparkles、通常はCheckCircle2 */}
            <div className={[
              "mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full ring-1",
              isFirstRecord
                ? "bg-emerald-500/10 shadow-[0_0_40px_-10px_rgba(16,185,129,0.6)] ring-emerald-400/40"
                : isMilestone7
                ? "bg-purple-500/10 shadow-[0_0_40px_-10px_rgba(168,85,247,0.5)] ring-purple-400/30"
                : "bg-indigo-500/10 shadow-[0_0_40px_-10px_rgba(99,102,241,0.5)] ring-indigo-400/30"
            ].join(" ")}>
              {isFirstRecord
                ? <Sparkles className="h-7 w-7 text-emerald-400" aria-hidden="true" />
                : isMilestone7
                ? <Sparkles className="h-7 w-7 text-purple-400" aria-hidden="true" />
                : <CheckCircle2 className="h-7 w-7 text-indigo-400" aria-hidden="true" />
              }
            </div>
            <CardTitle className="text-xl text-[#e6e8ee]">
              {isFirstRecord
                ? "はじめての記録"
                : isMilestone3
                ? `${recordCountAfterSave}日目の記録`
                : isMilestone7
                ? "7日達成！"
                : "記録しました"}
            </CardTitle>
            <p className="mt-1 text-sm text-[#a8b0c2]">
              {new Date().toLocaleDateString("ja-JP", { month: "long", day: "numeric", weekday: "short" })}
            </p>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-[#e6e8ee]">

            {/* 初回特別セレブレーション */}
            {isFirstRecord && (
              <div className="rounded-xl border border-emerald-400/25 bg-emerald-500/[0.07] p-4 text-center">
                <p className="text-sm font-semibold text-emerald-300">
                  最初の一歩、おめでとうございます！
                </p>
                <p className="mt-1.5 text-xs leading-relaxed text-[#a8b0c2]">
                  あと6日続けると気象との相関分析がスタートします。<br />
                  毎朝15秒でOK。気圧が変わった日ほど記録の価値があります。
                </p>
              </div>
            )}

            {/* 3日目マイルストーン */}
            {isMilestone3 && (
              <div className="rounded-xl border border-indigo-400/25 bg-indigo-500/[0.07] p-4 text-center">
                <p className="text-sm font-semibold text-indigo-300">3日連続！いいペースです</p>
                <p className="mt-1 text-xs text-[#a8b0c2]">あと4日で気圧との相関グラフが解放されます</p>
              </div>
            )}

            {/* 7日達成マイルストーン */}
            {isMilestone7 && (
              <div className="rounded-xl border border-purple-400/25 bg-purple-500/[0.07] p-4 text-center">
                <p className="text-sm font-semibold text-purple-300">
                  7日分のデータが揃いました！
                </p>
                <p className="mt-1 text-xs leading-relaxed text-[#a8b0c2]">
                  ダッシュボードで気圧・月齢との相関グラフが見られるようになりました。
                </p>
                {showFreezeEarned && (
                  <p className="mt-2 flex items-center justify-center gap-1 text-xs font-semibold text-amber-300">
                    <Shield className="h-3.5 w-3.5" aria-hidden="true" />
                    ストリークシールドを獲得しました！（残り {freezeCountAfterSave} 枚）
                  </p>
                )}
              </div>
            )}

            {/* ストリークシールド獲得（7日マイルストーン以外） */}
            {showFreezeEarned && !isMilestone7 && (
              <div className="rounded-xl border border-amber-400/25 bg-amber-500/[0.07] p-4 text-center">
                <p className="flex items-center justify-center gap-1.5 text-sm font-semibold text-amber-300">
                  <Shield className="h-4 w-4" aria-hidden="true" />
                  ストリークシールドを獲得！
                </p>
                <p className="mt-1 text-xs text-[#a8b0c2]">
                  1日休んでもストリークを守れます（残り {freezeCountAfterSave} 枚）
                </p>
              </div>
            )}

            {/* ストリークシールド使用通知 */}
            {showFreezeUsed && (
              <div className="flex items-start gap-2.5 rounded-xl border border-amber-400/20 bg-amber-500/[0.05] px-4 py-3">
                <Shield className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" aria-hidden="true" />
                <div>
                  <p className="text-xs font-semibold text-amber-300">シールドを使用しました</p>
                  <p className="mt-0.5 text-xs text-[#a8b0c2]">
                    昨日の空白をシールドで補填しました（残り {freezeCountAfterSave} 枚）
                  </p>
                </div>
              </div>
            )}

            {/* 気象コンテキスト */}
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
              <div>
                <dt className="text-[11px] uppercase tracking-wider text-[#a8b0c2]">昨晩の眠り</dt>
                <dd className="mt-1 text-xl font-semibold text-[#e6e8ee]">{qualityLabel}</dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-wider text-[#a8b0c2]">気圧 (24h 差)</dt>
                <dd className="mt-1 text-xl font-semibold tabular-nums text-[#e6e8ee]">
                  {w.pressureHpa.toFixed(1)}{" "}
                  <span className={`text-sm tabular-nums ${w.pressureDeltaHpa <= -3 ? "text-rose-400" : w.pressureDeltaHpa >= 3 ? "text-emerald-400" : "text-[#a8b0c2]"}`}>
                    {w.pressureDeltaHpa >= 0 ? "+" : ""}{w.pressureDeltaHpa.toFixed(1)}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-wider text-[#a8b0c2]">気温</dt>
                <dd className="mt-1 text-xl font-semibold tabular-nums text-[#e6e8ee]">{w.temperatureC.toFixed(1)}°C</dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-wider text-[#a8b0c2]">湿度</dt>
                <dd className="mt-1 text-xl font-semibold tabular-nums text-[#e6e8ee]">{w.humidity}%</dd>
              </div>
            </dl>

            {/* 気象ナラティブ（2件目以降のみ表示） */}
            {weatherNarrative && (
              <div className="flex items-start gap-2.5 rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-3">
                <Moon className="mt-0.5 h-4 w-4 shrink-0 text-indigo-300" aria-hidden="true" />
                <p className="text-xs leading-relaxed text-[#b0b8cc]">{weatherNarrative}</p>
              </div>
            )}

            {/* 分析までの進捗（7件未満） */}
            {recordCountAfterSave > 0 && recordCountAfterSave < 7 && (
              <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-3">
                <div className="mb-2 flex items-center justify-between text-xs">
                  <span className="text-[#a8b0c2]">相関分析まで</span>
                  <span className="font-semibold text-indigo-300">{recordCountAfterSave} / 7日</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-1.5 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-700"
                    style={{ width: `${(recordCountAfterSave / 7) * 100}%` }}
                    role="progressbar"
                    aria-valuenow={recordCountAfterSave}
                    aria-valuemin={0}
                    aria-valuemax={7}
                    aria-label="相関分析解禁まで"
                  />
                </div>
                <p className="mt-1.5 text-[11px] text-[#a8b0c2]">あと {remaining} 日で気象との相関グラフが解放されます</p>
              </div>
            )}

            {/* 7件以上: ダッシュボードnudge */}
            {recordCountAfterSave >= 7 && w.pressureDeltaHpa <= -3 && (
              <div className="flex items-start gap-2.5 rounded-xl border border-indigo-400/20 bg-indigo-500/[0.05] px-4 py-3">
                <BarChart3 className="mt-0.5 h-4 w-4 shrink-0 text-indigo-300" aria-hidden="true" />
                <p className="text-xs leading-relaxed text-[#b0b8cc]">
                  気圧が下がった日のパターンをダッシュボードで確認してみましょう。あなたの傾向が見えてきます。
                </p>
              </div>
            )}

            <div className="flex flex-col gap-2 pt-1">
              {/* 7件以上ではダッシュボードをプライマリCTAに昇格 */}
              {recordCountAfterSave >= 7 ? (
                <>
                  <Button asChild className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:from-indigo-400 hover:to-purple-400">
                    <Link href="/dashboard">
                      <BarChart3 className="mr-2 h-4 w-4" aria-hidden="true" />
                      ダッシュボードで傾向を確認
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="w-full border-white/10 text-[#a8b0c2] hover:border-indigo-400/40 hover:text-indigo-300">
                    <Link href="/">
                      <Home className="mr-2 h-4 w-4" aria-hidden="true" />
                      ホームへ戻る
                    </Link>
                  </Button>
                </>
              ) : (
                <>
                  <Button asChild className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:from-indigo-400 hover:to-purple-400">
                    <Link href="/">
                      <Home className="mr-2 h-4 w-4" aria-hidden="true" />
                      ホームへ戻る
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="w-full border-white/10 text-[#a8b0c2] hover:border-indigo-400/40 hover:text-indigo-300">
                    <Link href="/dashboard">
                      <BarChart3 className="mr-2 h-4 w-4" aria-hidden="true" />
                      ダッシュボードを見る
                    </Link>
                  </Button>
                </>
              )}
              <Button type="button" variant="ghost" className="w-full text-[#a8b0c2]/60 hover:bg-white/[0.03] hover:text-[#a8b0c2]" onClick={handleEditAgain}>
                <RefreshCcw className="mr-2 h-4 w-4" aria-hidden="true" />
                今日の記録を修正する
              </Button>
            </div>
            <p className="pt-1 text-center text-xs text-[#a8b0c2]/70">
              本サービスは医療行為・診断を目的としたものではありません。
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-screen-md px-4 py-8 pb-24 sm:py-12 sm:pb-0">
      {demoCount !== null && <DemoModeBanner recordCount={demoCount} />}
      <div className="mb-6 text-center">
        <div className="mb-4 flex items-center justify-center gap-4 text-xs tabular-nums text-[#a8b0c2]">
          <span className="inline-flex items-center gap-1.5">
            <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />
            今月 {metrics.monthCount}/30
          </span>
          <span aria-hidden="true">·</span>
          <span>連続 {metrics.streak} 日</span>
        </div>
        <h1 className="text-2xl font-bold text-[#e6e8ee] sm:text-3xl">今日の睡眠を記録する</h1>
        <p className="mt-2 text-sm text-[#a8b0c2]">毎朝15秒でOK。気象データは自動で取得します。</p>
      </div>

      {/* ⑥ 昨夜の予報との照合 */}
      {yesterdayBadge && yesterdayScore !== null && (
        <div className="mb-4 rounded-xl border border-white/8 bg-white/4 px-4 py-3">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-[#a8b0c2]">昨夜の予報</p>
          <p className="text-sm text-[#e6e8ee]">
            <span className="font-semibold" style={{ color: yesterdayBadge.color }}>{yesterdayBadge.label}</span>
            <span className="ml-1.5 tabular-nums text-[#a8b0c2]">（{yesterdayScore}点）</span>
          </p>
          <p className="mt-1 text-xs text-[#a8b0c2]">実際はどうでしたか？↓</p>
        </div>
      )}

      {/* 今日の気象サマリー */}
      {todayWeather === "loading" ? (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-3">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-[#a8b0c2]" aria-hidden="true" />
          <span className="text-xs text-[#a8b0c2]">気象データを取得中…</span>
        </div>
      ) : todayWeather ? (
        <div className="mb-4 rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-3">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[#a8b0c2]">今日の気象</p>
          <div className="flex flex-wrap gap-x-5 gap-y-1.5 tabular-nums text-sm">
            <span className="flex items-baseline gap-1.5">
              <span className="text-[10px] text-[#a8b0c2]">気圧</span>
              <span className="text-[#e6e8ee]">{todayWeather.pressureHpa.toFixed(1)} hPa</span>
              <span className={
                todayWeather.pressureDeltaHpa <= -3
                  ? "text-xs text-rose-400"
                  : todayWeather.pressureDeltaHpa >= 3
                  ? "text-xs text-emerald-400"
                  : "text-xs text-[#a8b0c2]"
              }>
                {todayWeather.pressureDeltaHpa >= 0 ? "+" : ""}{todayWeather.pressureDeltaHpa.toFixed(1)}
              </span>
            </span>
            <span className="flex items-baseline gap-1.5">
              <span className="text-[10px] text-[#a8b0c2]">気温</span>
              <span className="text-[#e6e8ee]">{todayWeather.temperatureC.toFixed(1)}°C</span>
            </span>
            <span className="flex items-baseline gap-1.5">
              <span className="text-[10px] text-[#a8b0c2]">湿度</span>
              <span className="text-[#e6e8ee]">{todayWeather.humidity}%</span>
            </span>
          </div>
          {todayWeather.pressureDeltaHpa <= -3 && (
            <p className="mt-2 text-[11px] leading-snug text-rose-300/80">
              気圧が下がっています。睡眠への影響が出やすい日です。
            </p>
          )}
        </div>
      ) : null}

      <form onSubmit={handleSubmit} noValidate>
        <Card className="border-0 bg-transparent shadow-none">
          <CardContent className="space-y-8 p-0 sm:p-2">
            {/* 1) 3 択評価 */}
            <fieldset>
              <legend className="mb-3 block text-sm font-medium text-[#e6e8ee]">
                昨晩の睡眠はいかがでしたか？<span className="text-[#f87171]" aria-hidden="true"> *</span>
              </legend>
              <div role="radiogroup" aria-label="睡眠の状態 3 択" className="grid grid-cols-3 gap-3">
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
                        "flex min-h-[88px] min-w-[44px] flex-col items-center justify-center gap-2 rounded-xl bg-white/[0.03] p-3 text-[#a8b0c2] transition-colors hover:bg-white/[0.06] hover:text-[#e6e8ee] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
                        selected ? "bg-indigo-500/10 text-[#e6e8ee] ring-1 ring-inset ring-indigo-500/60 shadow-[0_0_24px_-8px_rgba(99,102,241,0.55)]" : "",
                      ].join(" ")}
                    >
                      <span className="text-3xl" aria-hidden="true">{opt.emoji}</span>
                      <span className="text-xs font-medium leading-tight sm:text-sm">{opt.label}</span>
                      {selected ? <span className="block h-0.5 w-6 rounded-full bg-indigo-400" aria-hidden="true" /> : null}
                    </button>
                  );
                })}
              </div>
              {errors.quality ? <p className="mt-2 text-xs text-[#f87171]" role="alert">{errors.quality}</p> : null}
            </fieldset>

            {/* 2) 就寝/起床時刻 */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="bedtime" className="flex items-center text-sm font-medium text-[#e6e8ee]">
                  <Moon className="mr-1 h-3.5 w-3.5 text-[#a8b0c2]" aria-hidden="true" />
                  就寝時刻 (任意)
                </Label>
                <Input id="bedtime" type="time" inputMode="numeric" autoComplete="off" value={form.bedtime}
                  onChange={(e) => setForm((prev) => ({ ...prev, bedtime: e.target.value }))}
                  className="h-11 rounded-none border-0 border-b border-white/10 bg-transparent px-0 text-[#e6e8ee] tabular-nums focus-visible:border-indigo-500 focus-visible:ring-0"
                />
                {errors.bedtime ? <p className="text-xs text-[#f87171]" role="alert">{errors.bedtime}</p> : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="wakeTime" className="flex items-center text-sm font-medium text-[#e6e8ee]">
                  <Sunrise className="mr-1 h-3.5 w-3.5 text-[#a8b0c2]" aria-hidden="true" />
                  起床時刻 (任意)
                </Label>
                <Input id="wakeTime" type="time" inputMode="numeric" autoComplete="off" value={form.wakeTime}
                  onChange={(e) => setForm((prev) => ({ ...prev, wakeTime: e.target.value }))}
                  className="h-11 rounded-none border-0 border-b border-white/10 bg-transparent px-0 text-[#e6e8ee] tabular-nums focus-visible:border-indigo-500 focus-visible:ring-0"
                />
                {errors.wakeTime ? <p className="text-xs text-[#f87171]" role="alert">{errors.wakeTime}</p> : null}
              </div>
            </div>

            {/* 3) 自由メモ */}
            <div className="space-y-2">
              <Label htmlFor="note" className="text-sm font-medium text-[#e6e8ee]">
                自由メモ (任意 · <span className="tabular-nums">{form.note.length}/280</span>)
              </Label>
              <textarea
                id="note" maxLength={280} rows={3} value={form.note}
                onChange={(e) => setForm((prev) => ({ ...prev, note: e.target.value }))}
                className="w-full rounded-md border-0 bg-white/[0.03] px-3 py-2 text-sm text-[#e6e8ee] placeholder:text-[#a8b0c2]/70 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                placeholder="例: 夜中に一度目が覚めた / 寝る前にスマホを見すぎた"
              />
              {errors.note ? <p className="text-xs text-[#f87171]" role="alert">{errors.note}</p> : null}
            </div>

            {/* 手動入力フォールバック */}
            {showManualFallback ? (
              <div className="space-y-3 rounded-md border border-dashed border-[#f59e0b]/40 bg-[#f59e0b]/5 p-4" role="group" aria-label="気象データの手動入力">
                <p className="text-xs text-[#f59e0b]">気象 API に接続できませんでした。以下に手動で入力して保存できます。</p>
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <Label htmlFor="manual-temp" className="text-xs text-[#a8b0c2]">気温 (°C)</Label>
                    <Input id="manual-temp" type="number" step="0.1" inputMode="decimal" value={manual.temperatureC}
                      onChange={(e) => setManual((prev) => ({ ...prev, temperatureC: e.target.value }))}
                      className="h-11 rounded-none border-0 border-b border-white/10 bg-transparent px-0 text-[#e6e8ee] tabular-nums focus-visible:border-indigo-500 focus-visible:ring-0"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="manual-hum" className="text-xs text-[#a8b0c2]">湿度 (%)</Label>
                    <Input id="manual-hum" type="number" step="1" inputMode="numeric" value={manual.humidity}
                      onChange={(e) => setManual((prev) => ({ ...prev, humidity: e.target.value }))}
                      className="h-11 rounded-none border-0 border-b border-white/10 bg-transparent px-0 text-[#e6e8ee] tabular-nums focus-visible:border-indigo-500 focus-visible:ring-0"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="manual-pre" className="text-xs text-[#a8b0c2]">気圧 (hPa)</Label>
                    <Input id="manual-pre" type="number" step="0.1" inputMode="decimal" value={manual.pressureHpa}
                      onChange={(e) => setManual((prev) => ({ ...prev, pressureHpa: e.target.value }))}
                      className="h-11 rounded-none border-0 border-b border-white/10 bg-transparent px-0 text-[#e6e8ee] tabular-nums focus-visible:border-indigo-500 focus-visible:ring-0"
                    />
                  </div>
                </div>
              </div>
            ) : null}

            {/* 送信ボタン + スキップリンク */}
            <div className="sticky bottom-0 -mx-4 mt-2 border-t border-white/5 bg-[#0f1117]/90 p-4 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
              <Button type="submit" className="h-12 w-full bg-indigo-500 text-base font-semibold text-white hover:bg-indigo-600 disabled:opacity-50" disabled={submitDisabled}>
                {isSubmitting ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />保存中...</>
                ) : isUpdate ? "今日の記録を更新する" : "記録する"}
              </Button>
              <p className="mt-2 text-center text-[11px] text-[#a8b0c2]">
                {allRecords.length === 0
                  ? "毎朝の記録が予報の精度を上げます"
                  : allRecords.length < 4
                    ? `あと${7 - allRecords.length}件で気圧との相関グラフが表示されます`
                    : allRecords.length < 7
                      ? `もうすぐ！あと${7 - allRecords.length}件でグラフ解禁です`
                      : "記録が増えるほど予測が精緻になります"}
              </p>
              <div className="mt-6 text-center">
                <Link href="/" className="text-sm text-[#a8b0c2] underline-offset-4 hover:text-[#a8b0c2]/70 hover:underline">
                  今日はスキップ
                </Link>
              </div>
            </div>

            <p className="text-center text-xs text-[#a8b0c2]">
              本サービスは医療行為・診断を目的としたものではありません。記録は健康管理の参考としてご利用ください。
            </p>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
