
-- Profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  display_name text,
  city text,
  rank text not null default 'Ronin',
  total_games int not null default 0,
  total_wins int not null default 0,
  current_streak int not null default 0,
  best_streak int not null default 0,
  province int not null default 1,
  is_pro boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create policy "Profiles are viewable by everyone"
  on public.profiles for select using (true);
create policy "Users insert own profile"
  on public.profiles for insert with check (auth.uid() = id);
create policy "Users update own profile"
  on public.profiles for update using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email,'@',1)),
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email,'@',1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Game history
create table public.game_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  layout text not null,
  difficulty text not null,
  score int not null default 0,
  time_seconds int not null default 0,
  moves int not null default 0,
  hints_used int not null default 0,
  won boolean not null default false,
  province int not null default 1,
  created_at timestamptz not null default now()
);
alter table public.game_history enable row level security;

create policy "Game history viewable by all (leaderboard)"
  on public.game_history for select using (true);
create policy "Users insert own history"
  on public.game_history for insert with check (auth.uid() = user_id);

create index game_history_user_id_idx on public.game_history(user_id, created_at desc);
create index game_history_score_idx on public.game_history(score desc);

-- Daily scores
create table public.daily_scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  daily_date date not null,
  seed text not null,
  score int not null default 0,
  time_seconds int not null default 0,
  won boolean not null default false,
  created_at timestamptz not null default now(),
  unique(user_id, daily_date)
);
alter table public.daily_scores enable row level security;

create policy "Daily scores viewable by all"
  on public.daily_scores for select using (true);
create policy "Users insert own daily score"
  on public.daily_scores for insert with check (auth.uid() = user_id);
create policy "Users update own daily score"
  on public.daily_scores for update using (auth.uid() = user_id);

create index daily_scores_date_idx on public.daily_scores(daily_date, score desc);

-- User unlocks (skins/themes/provinces)
create table public.user_unlocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  item_type text not null, -- 'skin' | 'theme' | 'province' | 'pass'
  item_id text not null,
  unlocked_at timestamptz not null default now(),
  unique(user_id, item_type, item_id)
);
alter table public.user_unlocks enable row level security;

create policy "Users view own unlocks"
  on public.user_unlocks for select using (auth.uid() = user_id);
create policy "Users insert own unlocks"
  on public.user_unlocks for insert with check (auth.uid() = user_id);
