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
import { Settings, MapPin, Trash2, Check, ChevronDown } from "lucide-react";
import { PREFECTURES } from "@/lib/prefectures";
import {
  getDefaultPrefectureCode,
  setDefaultPrefectureCode,
  clearAllRecords,
  getRecords,
} from "@/lib/storage";

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

export function SettingsForm() {
  const [mounted, setMounted] = React.useState(false);
  const [prefCode, setPrefCode] = React.useState<string>("13");
  const [saved, setSaved] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deleteSuccess, setDeleteSuccess] = React.useState(false);
  const [recordCount, setRecordCount] = React.useState(0);

  // マウント後に localStorage を読み込む
  React.useEffect(() => {
    const code = getDefaultPrefectureCode() ?? "13";
    setPrefCode(code);
    setRecordCount(getRecords().length);
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

        <button
          onClick={() => setDeleteOpen(true)}
          disabled={recordCount === 0}
          className="inline-flex items-center gap-2 rounded-full border border-red-500/40 px-5 py-2.5 text-sm font-medium text-red-400 transition-colors hover:border-red-500/70 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
          全記録を削除する
        </button>

        <p className="mt-3 text-xs text-[#9ba3b5]">
          ※ データはブラウザの localStorage に保存されています。削除すると元に戻せません。
        </p>
      </section>

      {/* ── セクション3: バージョン情報 ── */}
      <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 sm:p-6">
        <h2 className="mb-4 border-l-[3px] border-indigo-400/70 pl-4 text-base font-bold text-[#e6e8ee] leading-snug">
          アプリ情報
        </h2>
        <dl className="space-y-2 text-sm text-[#9ba3b5]">
          <div className="flex gap-4">
            <dt className="w-28 shrink-0 text-[#9ba3b5]">アプリ名</dt>
            <dd className="text-[#e6e8ee]">SleepForecast（眠れる明日予報）</dd>
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
