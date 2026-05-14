-- Saved duel settings + optional seed on history for replay / sharing
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_layout text,
  ADD COLUMN IF NOT EXISTS last_difficulty text,
  ADD COLUMN IF NOT EXISTS last_theme text,
  ADD COLUMN IF NOT EXISTS last_province integer;

ALTER TABLE public.game_history
  ADD COLUMN IF NOT EXISTS seed text;

ALTER TABLE public.game_history
  ADD COLUMN IF NOT EXISTS theme text;
