import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Crown, Flame, Sword, Trophy, Calendar } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { levelFor, levelProgress, nextLevel } from "@/lib/ronin";
import type { LayoutName } from "@/lib/mahjong/layouts";
import type { Difficulty } from "@/lib/mahjong/engine";
import type { TileTheme } from "@/lib/mahjong/tiles";
import { LAYOUT_LABEL_RU, DIFFICULTY_LABEL_RU } from "@/lib/mahjong/duel-generator";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [{ title: "Профиль · RONIN" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user, loading } = useAuth();

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle();
      return data;
    },
  });

  const { data: history = [] } = useQuery({
    queryKey: ["my-history", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("game_history").select("*").eq("user_id", user!.id).order("created_at", { ascending: false }).limit(20);
      return data ?? [];
    },
  });

  const [city, setCity] = useState("");
  const [name, setName] = useState("");
  useEffect(() => {
    if (profile) {
      setCity(profile.city ?? "");
      setName(profile.display_name ?? "");
    }
  }, [profile]);

  if (loading) return <div className="p-12 text-center text-muted-foreground">Загрузка...</div>;
  if (!user) return (
    <div className="max-w-md mx-auto p-12 text-center">
      <p className="text-muted-foreground mb-4">Чтобы увидеть профиль, нужно войти.</p>
      <Link to="/auth" className="px-5 py-2 rounded-md bg-primary text-primary-foreground inline-block">Войти</Link>
    </div>
  );

  async function save() {
    const { error } = await supabase.from("profiles").update({ city, display_name: name, updated_at: new Date().toISOString() }).eq("id", user!.id);
    if (error) toast.error(error.message); else toast.success("Профиль обновлён");
  }

  const wins = profile?.total_wins ?? 0;
  const games = profile?.total_games ?? 0;
  const winrate = games ? Math.round((wins / games) * 100) : 0;
  const xp = profile?.xp ?? 0;
  const level = levelFor(xp);
  const nxt = nextLevel(xp);
  const lp = levelProgress(xp);
  const dailyStreak = profile?.daily_streak ?? 0;
  const bestDaily = profile?.best_daily_streak ?? 0;

  return (
    <div className="max-w-4xl mx-auto px-5 py-8 space-y-6">
      <div className="rounded-lg border border-border bg-surface/60 p-6 flex items-center gap-5 flex-wrap">
        <div className="h-20 w-20 grid place-items-center rounded-full bg-gradient-to-br from-primary to-accent text-3xl font-zen text-background">
          {level.kanji}
        </div>
        <div className="flex-1 min-w-[200px]">
          <h1 className="font-serif text-2xl">{name || user.email}</h1>
          <div className="text-xs text-muted-foreground">{user.email}</div>
          <div className="mt-2 inline-flex items-center gap-2 text-xs px-3 py-1 rounded-full border border-primary/40 text-primary">
            <Crown className="h-3 w-3" /> {level.title}
            {profile?.is_pro && <span className="ml-2 text-accent">· PRO</span>}
          </div>
          <div className="mt-3 max-w-md">
            <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-muted-foreground">
              <span>{xp} XP</span>
              <span>{nxt ? `${nxt.title} через ${nxt.xpFrom - xp} XP` : "Высший ранг"}</span>
            </div>
            <div className="h-1.5 mt-1 rounded-full bg-surface-2 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-primary to-accent transition-all" style={{ width: `${lp.pct}%` }} />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Stat icon={<Sword className="h-4 w-4" />} label="Партии" value={games} />
        <Stat icon={<Trophy className="h-4 w-4" />} label="Победы" value={wins} />
        <Stat icon={<Flame className="h-4 w-4" />} label="Дней подряд" value={dailyStreak} />
        <Stat icon={<Flame className="h-4 w-4" />} label="Лучшая серия" value={bestDaily} />
        <Stat icon={<Calendar className="h-4 w-4" />} label="Винрейт" value={`${winrate}%`} />
      </div>

      <div className="rounded-lg border border-border bg-surface/60 p-5">
        <h2 className="font-serif text-lg mb-3">Имя странника</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] uppercase tracking-widest text-muted-foreground">Имя</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full bg-surface-2 border border-border rounded-md px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-widest text-muted-foreground">Город (для рейтинга)</label>
            <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="напр. Алматы" className="mt-1 w-full bg-surface-2 border border-border rounded-md px-3 py-2 text-sm" />
          </div>
        </div>
        <button onClick={save} className="mt-4 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm">Сохранить</button>
      </div>

      <div className="rounded-lg border border-border bg-surface/60 p-5">
        <h2 className="font-serif text-lg mb-3">Свиток партий</h2>
        {history.length === 0 ? (
          <div className="text-sm text-muted-foreground">Ещё нет партий. <Link to="/play" className="text-primary">Начать дуэль</Link></div>
        ) : (
          <ul className="divide-y divide-border">
            {history.map((h) => (
              <li key={h.id} className="py-2.5 flex items-center justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <div className="font-serif truncate">
                    {LAYOUT_LABEL_RU[h.layout as LayoutName] ?? h.layout} · {DIFFICULTY_LABEL_RU[h.difficulty as Difficulty] ?? h.difficulty}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {new Date(h.created_at).toLocaleString()} · провинция {h.province}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <div className={h.won ? "text-primary" : "text-muted-foreground"}>
                    {h.won ? "Победа" : "Поражение"} · {h.score}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {Math.floor(h.time_seconds / 60)}:{String(h.time_seconds % 60).padStart(2, "0")} · {h.moves} ходов
                  </div>
                  {h.seed ? (
                    <Link
                      to="/play"
                      search={{
                        layout: h.layout as LayoutName,
                        difficulty: h.difficulty as Difficulty,
                        province: h.province,
                        seed: h.seed,
                        theme: (h.theme as TileTheme) || "classic",
                      }}
                      className="text-[11px] text-primary hover:underline"
                    >
                      Повторить поле
                    </Link>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-border bg-surface/60 p-4">
      <div className="text-[10px] tracking-widest uppercase text-muted-foreground flex items-center gap-1.5">{icon} {label}</div>
      <div className="font-serif text-2xl text-primary mt-1">{value}</div>
    </div>
  );
}
