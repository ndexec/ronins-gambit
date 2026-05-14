ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS xp integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS daily_streak integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS best_daily_streak integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_played_date date;