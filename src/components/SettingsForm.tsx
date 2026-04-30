"use client";

/**
 * SettingsForm — 設定画面の Client Component
 *
 * - 都道府県設定（DEFAULT_PREFECTURE_KEY に保存）
 * - 記録リセット（AlertDialog で確認後 clearAllRecords）
 * - SSR/CSR の CLS を防ぐため `mounted` + skeleton パターンを採用
 *   (`if (!mounted) return null` ではなく skeleton を返す)
 */

import * as React from "react";
import { Settings, MapPin, Trash2, Check, ChevronDown, LocateFixed, Loader2, Download, Bell, BellOff, BellRing, Cookie } from "lucide-react";
import {
  COOKIE_CONSENT_KEY,
  setCookieConsent,
  type CookieConsentValue,
} from "@/components/CookieConsent";
import { PREFECTURES, findNearestPrefecture } from "@/lib/prefectures";
import {
  getDefaultPrefectureCode,
  setDefaultPrefectureCode,
  clearAllRecords,
  getRecords,
} from "@/lib/storage";
import {
  getNotificationEnabled,
  getNotificationPermission,
  getNotificationTime,
  isNotificationSupported,
  requestNotificationPermission,
  setNotificationEnabled,
  setNotificationTime,
  showTestNotification,
} from "@/lib/notifications";
import type { SleepRecord } from "@/lib/types";

// ─────────────────────────────────────────────────────────────────────────────
// Skeleton（SSR・マウント前の CLS 防止）
// ─────────────────────────────────────────────────────────────────────────────

function SettingsSkeleton() {
  return (
    <div className="space-y-6 animate-pulse" aria-hidden="true">
      {/* Section1 skeleton */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 sm:p-6 space-y-4">
        <div className="h-5 w-24 rounded bg-white/10" />
        <div className="h-11 rounded-xl bg-white/10" />
        <div className="h-4 w-48 rounded bg-white/5" />
      </div>
      {/* Section2 skeleton */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 sm:p-6 space-y-4">
        <div className="h-5 w-28 rounded bg-white/10" />
        <div className="h-4 w-64 rounded bg-white/5" />
        <div className="h-10 w-36 rounded-full bg-red-500/10" />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AlertDialog（全記録削除確認）
// ─────────────────────────────────────────────────────────────────────────────

interface AlertDialogProps {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  recordCount: number;
}

function DeleteConfirmDialog({ open, onCancel, onConfirm, recordCount }: AlertDialogProps) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-dialog-title"
    >
      <div className="mx-4 w-full max-w-sm rounded-2xl border border-white/10 bg-[#1a1f2e] p-6 shadow-2xl">
        <h2 id="delete-dialog-title" className="mb-3 text-base font-bold text-[#e6e8ee]">
          全記録を削除しますか？
        </h2>
        <p className="mb-6 text-sm leading-relaxed text-[#9ba3b5]">
          保存されている <strong className="text-[#e6e8ee]">{recordCount} 件</strong> の睡眠記録がすべて削除されます。
          この操作は取り消せません。
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 rounded-full border border-white/10 py-2.5 text-sm font-medium text-[#9ba3b5] transition-colors hover:border-white/20 hover:text-[#e6e8ee]"
          >
            キャンセル
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 rounded-full bg-red-500/80 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-500"
          >
            削除する
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// メイン
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// CSV エクスポートユーティリティ
// ─────────────────────────────────────────────────────────────────────────────

/**
 * SleepRecord[] を CSV 文字列に変換する。
 * ヘッダー行 + データ行。値にカンマ・改行を含む可能性があるためダブルクォートで囲む。
 */
function recordsToCsv(records: SleepRecord[]): string {
  const escape = (v: string | number | undefined | null) => {
    if (v == null) return "";
    const s = String(v);
    // ダブルクォートはエスケープ
    return `"${s.replace(/"/g, '""')}"`;
  };

  const header = [
    "日付",
    "睡眠品質(1-5)",
    "就寝時刻",
    "起床時刻",
    "気温(°C)",
    "湿度(%)",
    "気圧(hPa)",
    "気圧変化(hPa)",
    "月齢(0-1)",
    "都道府県コード",
    "メモ",
  ].join(",");

  const rows = records.map((r) =>
    [
      escape(r.date),
      escape(r.quality),
      escape(r.bedtime ?? ""),
      escape(r.wakeTime ?? ""),
      escape(r.weather.temperatureC),
      escape(r.weather.humidity),
      escape(r.weather.pressureHpa),
      escape(r.weather.pressureDeltaHpa),
      escape(r.weather.moonPhase),
      escape(r.prefectureCode),
      escape(r.note ?? ""),
    ].join(",")
  );

  return [header, ...rows].join("\r\n");
}

/** CSV をファイルダウンロードさせる */
function downloadCsv(csv: string, filename: string) {
  // BOM 付き UTF-8 にすると Excel でも文字化けしない
  const bom = "﻿";
  const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function SettingsForm() {
  const [mounted, setMounted] = React.useState(false);
  const [prefCode, setPrefCode] = React.useState<string>("13");
  const [saved, setSaved] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deleteSuccess, setDeleteSuccess] = React.useState(false);
  const [recordCount, setRecordCount] = React.useState(0);
  const [geoLoading, setGeoLoading] = React.useState(false);
  const [geoError, setGeoError] = React.useState<string | null>(null);
  const [geoDetected, setGeoDetected] = React.useState<string | null>(null);
  const [csvExported, setCsvExported] = React.useState(false);

  // 通知設定
  const [notifSupported, setNotifSupported] = React.useState(false);
  const [notifPermission, setNotifPermission] = React.useState<string>("default");
  const [notifEnabled, setNotifEnabled] = React.useState(false);
  const [notifTime, setNotifTime] = React.useState("08:00");
  const [notifTestSent, setNotifTestSent] = React.useState(false);
  const [notifTimeSaved, setNotifTimeSaved] = React.useState(false);

  // マウント後に localStorage を読み込む
  React.useEffect(() => {
    const code = getDefaultPrefectureCode() ?? "13";
    setPrefCode(code);
    setRecordCount(getRecords().length);
    // 通知設定を読み込む
    setNotifSupported(isNotificationSupported());
    setNotifPermission(getNotificationPermission());
    setNotifEnabled(getNotificationEnabled());
    setNotifTime(getNotificationTime());
    setMounted(true);
  }, []);

  // マウント前はスケルトンを表示（CLS 対策）
  if (!mounted) return <SettingsSkeleton />;

  // ── 都道府県保存 ──
  function handleSavePrefecture() {
    setDefaultPrefectureCode(prefCode);
    setSaved(true);
    // WeatherWidget に変更を通知（同一タブでは storage イベントが発火しないため CustomEvent を使用）
    window.dispatchEvent(new CustomEvent("sf:prefecture-changed"));
    setTimeout(() => setSaved(false), 2000);
  }

  // ── 現在地から都道府県を自動検出 ──
  function handleGeoDetect() {
    if (!navigator.geolocation) {
      setGeoError("このブラウザは位置情報に対応していません");
      return;
    }
    setGeoLoading(true);
    setGeoError(null);
    setGeoDetected(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const nearest = findNearestPrefecture(pos.coords.latitude, pos.coords.longitude);
        setPrefCode(nearest.code);
        setDefaultPrefectureCode(nearest.code);
        window.dispatchEvent(new CustomEvent("sf:prefecture-changed"));
        setGeoDetected(nearest.name);
        setSaved(true);
        setGeoLoading(false);
        setTimeout(() => { setSaved(false); setGeoDetected(null); }, 3000);
      },
      (err) => {
        setGeoLoading(false);
        if (err.code === 1) {
          setGeoError("位置情報へのアクセスが拒否されました。手動で都道府県を選択してください。");
        } else {
          setGeoError("現在地の取得に失敗しました。手動で選択してください。");
        }
      },
      { timeout: 10000, maximumAge: 300000 }
    );
  }

  // ── 通知権限リクエスト ──
  async function handleRequestPermission() {
    const perm = await requestNotificationPermission();
    setNotifPermission(perm);
    if (perm === "granted") {
      setNotifEnabled(true);
      setNotificationEnabled(true);
    }
  }

  // ── 通知 ON/OFF トグル ──
  function handleToggleNotif(enabled: boolean) {
    setNotifEnabled(enabled);
    setNotificationEnabled(enabled);
  }

  // ── リマインダー時刻の保存 ──
  function handleSaveNotifTime() {
    setNotificationTime(notifTime);
    setNotifTimeSaved(true);
    setTimeout(() => setNotifTimeSaved(false), 2000);
  }

  // ── テスト通知 ──
  function handleTestNotif() {
    showTestNotification();
    setNotifTestSent(true);
    setTimeout(() => setNotifTestSent(false), 3000);
  }

  // ── CSV エクスポート ──
  function handleExportCsv() {
    const records = getRecords();
    if (records.length === 0) return;
    const csv = recordsToCsv(records);
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    downloadCsv(csv, `sleep_forecast_${dateStr}.csv`);
    setCsvExported(true);
    setTimeout(() => setCsvExported(false), 3000);
  }

  // ── 全記録削除 ──
  function handleDeleteConfirm() {
    clearAllRecords();
    setRecordCount(0);
    setDeleteOpen(false);
    setDeleteSuccess(true);
    setTimeout(() => setDeleteSuccess(false), 3000);
  }

  const selectedPref = PREFECTURES.find((p) => p.code === prefCode);

  return (
    <div className="space-y-6">
      {/* ── セクション1: 地域設定 ── */}
      <section
        aria-labelledby="settings-region-heading"
        className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 sm:p-6"
      >
        <h2
          id="settings-region-heading"
          className="mb-4 flex items-center gap-2 border-l-[3px] border-indigo-400/70 pl-4 text-base font-bold text-[#e6e8ee] leading-snug"
        >
          <MapPin className="h-4 w-4 text-indigo-300/70" aria-hidden="true" />
          地域設定
        </h2>
        <p className="mb-3 text-sm text-[#9ba3b5]">
          天気・気圧データを取得する都道府県を選択してください。
        </p>

        {/* 現在地から自動検出ボタン */}
        <button
          type="button"
          onClick={handleGeoDetect}
          disabled={geoLoading}
          className="mb-3 inline-flex items-center gap-2 rounded-full border border-indigo-400/30 px-4 py-2 text-sm font-medium text-indigo-300 transition-colors hover:border-indigo-400/60 hover:text-indigo-200 disabled:opacity-50"
        >
          {geoLoading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          ) : (
            <LocateFixed className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          {geoLoading ? "検出中..." : "現在地から自動検出"}
        </button>
        {geoDetected && (
          <p className="mb-2 flex items-center gap-1 text-xs text-emerald-400">
            <Check className="h-3.5 w-3.5" aria-hidden="true" />
            {geoDetected} を設定しました
          </p>
        )}
        {geoError && (
          <p className="mb-2 text-xs text-rose-400">{geoError}</p>
        )}

        {/* 都道府県セレクト */}
        <div className="relative mb-4">
          <select
            id="prefecture-select"
            value={prefCode}
            onChange={(e) => {
              setPrefCode(e.target.value);
              setSaved(false);
            }}
            className="w-full appearance-none rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 pr-10 text-sm text-[#e6e8ee] outline-none focus:border-indigo-400/60 focus:ring-2 focus:ring-indigo-400/20"
            aria-label="都道府県を選択"
          >
            {PREFECTURES.map((pref) => (
              <option key={pref.code} value={pref.code} className="bg-[#1a1f2e]">
                {pref.name}
              </option>
            ))}
          </select>
          <ChevronDown
            className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9ba3b5]"
            aria-hidden="true"
          />
        </div>

        {selectedPref && (
          <p className="mb-4 text-xs text-[#9ba3b5]">
            {selectedPref.name}（{selectedPref.latitude.toFixed(2)}°N, {selectedPref.longitude.toFixed(2)}°E）
          </p>
        )}

        <button
          onClick={handleSavePrefecture}
          disabled={saved}
          className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-indigo-500/20 transition-all hover:from-indigo-400 hover:to-purple-400 disabled:opacity-70"
        >
          {saved ? (
            <>
              <Check className="h-4 w-4" aria-hidden="true" />
              保存しました
            </>
          ) : (
            <>
              <Settings className="h-4 w-4" aria-hidden="true" />
              保存する
            </>
          )}
        </button>
      </section>

      {/* ── セクション2: データ管理 ── */}
      <section
        aria-labelledby="settings-data-heading"
        className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 sm:p-6"
      >
        <h2
          id="settings-data-heading"
          className="mb-4 border-l-[3px] border-indigo-400/70 pl-4 text-base font-bold text-[#e6e8ee] leading-snug"
        >
          データ管理
        </h2>
        <p className="mb-4 text-sm text-[#9ba3b5]">
          ブラウザに保存されている睡眠記録を管理できます。
          現在 <strong className="text-[#e6e8ee]">{recordCount} 件</strong> の記録があります。
        </p>

        {deleteSuccess && (
          <p className="mb-4 flex items-center gap-1.5 text-sm text-green-400">
            <Check className="h-4 w-4" aria-hidden="true" />
            全記録を削除しました
          </p>
        )}

        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleExportCsv}
            disabled={recordCount === 0}
            className="inline-flex items-center gap-2 rounded-full border border-indigo-400/40 px-5 py-2.5 text-sm font-medium text-indigo-300 transition-colors hover:border-indigo-400/70 hover:text-indigo-200 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {csvExported ? (
              <>
                <Check className="h-4 w-4" aria-hidden="true" />
                ダウンロード完了
              </>
            ) : (
              <>
                <Download className="h-4 w-4" aria-hidden="true" />
                CSVでダウンロード
              </>
            )}
          </button>

          <button
            onClick={() => setDeleteOpen(true)}
            disabled={recordCount === 0}
            className="inline-flex items-center gap-2 rounded-full border border-red-500/40 px-5 py-2.5 text-sm font-medium text-red-400 transition-colors hover:border-red-500/70 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            全記録を削除する
          </button>
        </div>

        <p className="mt-3 text-xs text-[#9ba3b5]">
          ※ データはブラウザの localStorage に保存されています。削除すると元に戻せません。
        </p>
      </section>

      {/* ── セクション3: 通知設定 ── */}
      {notifSupported && (
        <section
          aria-labelledby="settings-notif-heading"
          className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 sm:p-6"
        >
          <h2
            id="settings-notif-heading"
            className="mb-4 flex items-center gap-2 border-l-[3px] border-indigo-400/70 pl-4 text-base font-bold text-[#e6e8ee] leading-snug"
          >
            <Bell className="h-4 w-4 text-indigo-300/70" aria-hidden="true" />
            通知設定
          </h2>
          <p className="mb-4 text-sm text-[#9ba3b5]">
            毎日の記録を忘れないよう、リマインダー通知を受け取れます。
          </p>

          {/* 権限未取得 */}
          {notifPermission === "default" && (
            <button
              onClick={handleRequestPermission}
              className="mb-4 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-indigo-500/20 transition-all hover:from-indigo-400 hover:to-purple-400"
            >
              <Bell className="h-4 w-4" aria-hidden="true" />
              通知を許可する
            </button>
          )}

          {/* 権限拒否 */}
          {notifPermission === "denied" && (
            <div className="mb-4 rounded-xl border border-rose-400/20 bg-rose-500/[0.05] px-4 py-3">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-rose-400">
                <BellOff className="h-3.5 w-3.5" aria-hidden="true" />
                通知がブラウザでブロックされています
              </p>
              <p className="mt-1 text-xs text-[#9ba3b5]">
                ブラウザのサイト設定から通知を許可してください。
              </p>
            </div>
          )}

          {/* 権限取得済み */}
          {notifPermission === "granted" && (
            <div className="space-y-4">
              {/* ON/OFF トグル */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[#e6e8ee]">リマインダー通知</p>
                  <p className="mt-0.5 text-xs text-[#9ba3b5]">
                    今日の記録がない場合、設定時刻にお知らせします
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={notifEnabled}
                  onClick={() => handleToggleNotif(!notifEnabled)}
                  className={[
                    "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
                    notifEnabled ? "bg-indigo-500" : "bg-white/10",
                  ].join(" ")}
                >
                  <span
                    className={[
                      "inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform",
                      notifEnabled ? "translate-x-6" : "translate-x-1",
                    ].join(" ")}
                  />
                </button>
              </div>

              {/* 時刻ピッカー（通知ONの時のみ表示） */}
              {notifEnabled && (
                <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4 space-y-3">
                  <label
                    htmlFor="notif-time"
                    className="block text-xs font-semibold uppercase tracking-wider text-[#9ba3b5]"
                  >
                    リマインダー時刻
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      id="notif-time"
                      type="time"
                      value={notifTime}
                      onChange={(e) => setNotifTime(e.target.value)}
                      className="h-10 rounded-lg border border-white/10 bg-white/[0.04] px-3 text-sm tabular-nums text-[#e6e8ee] focus:border-indigo-400/60 focus:outline-none focus:ring-1 focus:ring-indigo-400/20"
                    />
                    <button
                      onClick={handleSaveNotifTime}
                      className="inline-flex items-center gap-1.5 rounded-full border border-indigo-400/40 px-4 py-2 text-xs font-medium text-indigo-300 transition-colors hover:border-indigo-400/70 hover:text-indigo-200"
                    >
                      {notifTimeSaved ? (
                        <>
                          <Check className="h-3.5 w-3.5" aria-hidden="true" />
                          保存しました
                        </>
                      ) : (
                        "保存"
                      )}
                    </button>
                  </div>

                  {/* テスト通知 */}
                  <button
                    onClick={handleTestNotif}
                    className="inline-flex items-center gap-1.5 text-xs text-[#9ba3b5] hover:text-indigo-300 transition-colors"
                  >
                    <BellRing className="h-3.5 w-3.5" aria-hidden="true" />
                    {notifTestSent ? "テスト通知を送信しました" : "テスト通知を送信"}
                  </button>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* ── セクション4: バージョン情報 ── */}
      <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 sm:p-6">
        <h2 className="mb-4 border-l-[3px] border-indigo-400/70 pl-4 text-base font-bold text-[#e6e8ee] leading-snug">
          アプリ情報
        </h2>
        <dl className="space-y-2 text-sm text-[#9ba3b5]">
          <div className="flex gap-4">
            <dt className="w-28 shrink-0 text-[#9ba3b5]">アプリ名</dt>
            <dd className="text-[#e6e8ee]">SleepForecast</dd>
          </div>
          <div className="flex gap-4">
            <dt className="w-28 shrink-0 text-[#9ba3b5]">データ保存先</dt>
            <dd>ブラウザの localStorage（端末内）</dd>
          </div>
          <div className="flex gap-4">
            <dt className="w-28 shrink-0 text-[#9ba3b5]">外部送信</dt>
            <dd>なし（気象APIリクエストを除く）</dd>
          </div>
        </dl>
      </section>

      {/* ── セクション: Cookie 設定 ── */}
      <CookieSettingsSection />

      {/* 削除確認ダイアログ */}
      <DeleteConfirmDialog
        open={deleteOpen}
        recordCount={recordCount}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Cookie 設定セクション（独立 Client Component）
// ─────────────────────────────────────────────────────────────────────────────

function CookieSettingsSection() {
  const [consent, setConsent] = React.useState<CookieConsentValue | null>(null);
  const [saved, setSaved] = React.useState(false);

  React.useEffect(() => {
    const stored = localStorage.getItem(COOKIE_CONSENT_KEY) as CookieConsentValue | null;
    if (stored === "accepted" || stored === "rejected") setConsent(stored);
  }, []);

  function handleChange(value: CookieConsentValue) {
    setCookieConsent(value);
    setConsent(value);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <section
      aria-labelledby="settings-cookie-heading"
      className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 sm:p-6"
    >
      <h2
        id="settings-cookie-heading"
        className="mb-4 flex items-center gap-2 border-l-[3px] border-indigo-400/70 pl-4 text-base font-bold text-[#e6e8ee] leading-snug"
      >
        <Cookie className="h-4 w-4 text-indigo-300/70" aria-hidden="true" />
        Cookie 設定
      </h2>
      <p className="mb-4 text-sm text-[#9ba3b5]">
        Google Analytics（アクセス解析）の Cookie 使用に関する同意設定を変更できます。
        拒否しても、すべての機能は通常どおりご利用いただけます。
      </p>

      {/* 現在の状態 */}
      {consent && (
        <p className="mb-3 text-xs text-[#9ba3b5]">
          現在の設定:{" "}
          <span className={consent === "accepted" ? "font-semibold text-emerald-400" : "font-semibold text-[#e6e8ee]/60"}>
            {consent === "accepted" ? "同意済み" : "拒否"}
          </span>
        </p>
      )}
      {consent === null && (
        <p className="mb-3 text-xs text-amber-400/80">
          まだ選択されていません。
        </p>
      )}

      {/* ボタン */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => handleChange("accepted")}
          disabled={consent === "accepted"}
          className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500 px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-indigo-400 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
        >
          同意する
        </button>
        <button
          type="button"
          onClick={() => handleChange("rejected")}
          disabled={consent === "rejected"}
          className="inline-flex items-center gap-1.5 rounded-full border border-white/20 px-4 py-1.5 text-xs font-medium text-[#9ba3b5] transition-colors hover:border-white/40 hover:text-[#e6e8ee] disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
        >
          拒否する
        </button>
      </div>

      {saved && (
        <p className="mt-2 flex items-center gap-1 text-xs text-emerald-400">
          <Check className="h-3.5 w-3.5" aria-hidden="true" />
          保存しました
        </p>
      )}
    </section>
  );
}
