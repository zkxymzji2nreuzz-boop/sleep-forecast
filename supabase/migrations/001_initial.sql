-- SleepForecast: Initial DB Schema (REQ-P2-01)
-- Requires: Supabase Auth (auth.users is provided by Supabase)

-- ─── sleep_logs ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.sleep_logs (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  local_id         text        NOT NULL,         -- rec_YYYY-MM-DD_xxxx (localStorage ID)
  date             date        NOT NULL,         -- YYYY-MM-DD (Asia/Tokyo 基準)
  quality          smallint    NOT NULL CHECK (quality BETWEEN 1 AND 5),
  bedtime          text,                          -- HH:mm (optional)
  wake_time        text,                          -- HH:mm (optional)
  note             text,                          -- 280字以内 (optional)
  prefecture_code  text        NOT NULL,         -- JIS X 0401 "01".."47"
  weather          jsonb       NOT NULL,         -- WeatherData snapshot
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),

  -- 1ユーザー × 1日付 = 1レコード
  UNIQUE (user_id, date)
);

-- よく使うクエリ向けのインデックス
CREATE INDEX IF NOT EXISTS sleep_logs_user_id_date_idx
  ON public.sleep_logs (user_id, date DESC);

-- RLS: 自分のレコードのみ操作可能
ALTER TABLE public.sleep_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_sleep_logs" ON public.sleep_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "insert_own_sleep_logs" ON public.sleep_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "update_own_sleep_logs" ON public.sleep_logs
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "delete_own_sleep_logs" ON public.sleep_logs
  FOR DELETE USING (auth.uid() = user_id);

-- ─── user_settings ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_settings (
  user_id                  uuid  PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  default_prefecture_code  text  NOT NULL DEFAULT '13',
  updated_at               timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_settings" ON public.user_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "insert_own_settings" ON public.user_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "update_own_settings" ON public.user_settings
  FOR UPDATE USING (auth.uid() = user_id);

-- ─── 自動 updated_at ──────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sleep_logs_updated_at
  BEFORE UPDATE ON public.sleep_logs
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER user_settings_updated_at
  BEFORE UPDATE ON public.user_settings
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ─── Anonymous Auth 設定メモ (SQL コメント) ────────────────────────────────────
-- Supabase ダッシュボード > Authentication > Providers > Anonymous Sign-ins を有効化すること。
-- Anonymous users は auth.users.is_anonymous = true で識別される。
-- Email Magic Link でアカウント昇格すると is_anonymous = false になる。
