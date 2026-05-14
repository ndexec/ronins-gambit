import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Lightbulb, Calendar, Trophy, Share2 } from "lucide-react";
import MahjongBoard, { getMatchHint } from "@/components/MahjongBoard";
import { computeScore, findAvailablePairs, generateBoard, getCoachAdvice, tilesMatch, type Tile } from "@/lib/mahjong/engine";
import { todaySeed } from "@/lib/mahjong/prng";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { shareResult, readHintQuota, bumpHintQuota, FREE_HINTS_PER_DAY, isProLocal } from "@/lib/share-card";

export const Route = createFileRoute("/daily")({
  head: () => ({
    meta: [
      { title: "Дуэль дня · RONIN Mahjong" },
      { name: "description", content: "Одна раскладка для всех ронинов планеты. Глобальный ежедневный рейтинг." },
    ],
  }),
  component: DailyPage,
});

function DailyPage() {
  const seed = useMemo(() => todaySeed(), []);
  const { user } = useAuth();
  const nav = useNavigate();

  const [tiles, setTiles] = useState<Tile[]>(() => generateBoard({ layout: "turtle", difficulty: "medium", theme: "classic", seed }));
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [hintIds, setHintIds] = useState<number[]>([]);
  const [matchedIds, setMatchedIds] = useState<number[]>([]);
  const [history, setHistory] = useState<Array<[Tile, Tile]>>([]);
  const [score, setScore] = useState(0);
  const [moves, setMoves] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [time, setTime] = useState(0);
  const [active, setActive] = useState(true);
  const [coach, setCoach] = useState("Сегодняшняя дуэль ждёт всех ронинов мира.");
  const timerRef = useRef<number | null>(null);
  const savedRef = useRef(false);

  useEffect(() => {
    if (!active) return;
    timerRef.current = window.setInterval(() => setTime((t) => t + 1), 1000);
    return () => { if (timerRef.current) window.clearInterval(timerRef.current); };
  }, [active]);

  const visibleCount = tiles.filter((t) => !t.removed).length;
  const totalCount = tiles.length;
  const removedCount = totalCount - visibleCount;
  const pairsLeft = findAvailablePairs(tiles).length;

  const { data: existing } = useQuery({
    queryKey: ["daily-mine", user?.id, seed],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("daily_scores").select("*").eq("user_id", user!.id).eq("daily_date", seed).maybeSingle();
      return data;
    },
  });

  const { data: top = [] } = useQuery({
    queryKey: ["daily-top", seed],
    queryFn: async () => {
      const { data } = await supabase
        .from("daily_scores")
        .select("user_id, score, time_seconds, won")
        .eq("daily_date", seed)
        .order("score", { ascending: false })
        .limit(20);
      if (!data) return [];
      const ids = [...new Set(data.map((d) => d.user_id))];
      const { data: profs } = await supabase.from("profiles").select("id, display_name, city, rank").in("id", ids);
      const map = new Map(profs?.map((p) => [p.id, p]));
      return data.map((d) => ({ ...d, profile: map.get(d.user_id) }));
    },
  });

  useEffect(() => {
    if (!active || !totalCount) return;
    if (visibleCount === 0) {
      setActive(false);
      const final = computeScore({ removed: removedCount, total: totalCount, timeSeconds: time, hintsUsed, combo: 0, won: true });
      setScore(final);
      saveDaily(true, final);
    } else if (pairsLeft === 0) {
      setActive(false);
      const final = computeScore({ removed: removedCount, total: totalCount, timeSeconds: time, hintsUsed, combo: 0, won: false });
      setScore(final);
      saveDaily(false, final);
    }
  }, [visibleCount, pairsLeft, active, totalCount, removedCount, time, hintsUsed]);

  async function saveDaily(won: boolean, finalScore: number) {
    if (savedRef.current || !user) return;
    savedRef.current = true;
    await supabase.from("daily_scores").upsert(
      { user_id: user.id, daily_date: seed, seed, score: finalScore, time_seconds: time, won },
      { onConflict: "user_id,daily_date" }
    );
    toast(won ? "Дуэль дня завершена!" : "Сегодня — урок", { description: `${finalScore} очков` });
  }

  function onTileClick(tile: Tile) {
    if (!active) return;
    setHintIds([]);
    if (selectedId === null) return setSelectedId(tile.id);
    if (selectedId === tile.id) return setSelectedId(null);
    const a = tiles.find((t) => t.id === selectedId)!;
    const b = tile;
    if (tilesMatch(a, b)) {
      setMatchedIds((m) => [...m, a.id, b.id]);
      setMoves((x) => x + 1);
      setHistory((h) => [...h, [a, b]]);
      setSelectedId(null);
      setTimeout(() => {
        setTiles((cur) => cur.map((t) => (t.id === a.id || t.id === b.id ? { ...t, removed: true } : t)));
        setMatchedIds((m) => m.filter((id) => id !== a.id && id !== b.id));
        setScore((s) => s + 100);
        setCoach(getCoachAdvice(tiles.map((t) => (t.id === a.id || t.id === b.id ? { ...t, removed: true } : t))));
      }, 350);
    } else {
      setSelectedId(b.id);
    }
  }

  function showHint() {
    const isPro = isProLocal();
    if (!isPro) {
      const q = readHintQuota();
      if (q.used >= FREE_HINTS_PER_DAY) {
        toast("Подсказки на сегодня закончились", {
          description: `Free: ${FREE_HINTS_PER_DAY}/день. Открой ∞ в RONIN PRO.`,
          action: { label: "Pro", onClick: () => nav({ to: "/shop" }) },
        });
        return;
      }
    }
    const pair = getMatchHint(tiles);
    if (!pair) return;
    setHintIds([pair[0].id, pair[1].id]);
    setHintsUsed((h) => h + 1);
    if (!isPro) bumpHintQuota();
    setTimeout(() => setHintIds([]), 2500);
  }

  async function onShare(won: boolean, finalScore: number, t: number) {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const url = `${origin}/daily`;
    const r = await shareResult({
      title: `Дуэль дня · ${seed}`,
      subtitle: "Один сид — все ронины мира",
      score: finalScore,
      timeSeconds: t,
      won,
      player: user?.email?.split("@")[0],
      challengeUrl: url,
    });
    toast(r === "shared" ? "Карточка отправлена" : "Карточка скачана");
  }

  if (existing && !active) {
    return (
      <div className="max-w-3xl mx-auto px-5 py-12 text-center">
        <Calendar className="h-10 w-10 mx-auto text-primary mb-3" />
        <h1 className="font-serif text-3xl">Сегодня ты уже сражался</h1>
        <p className="text-muted-foreground mt-2">Дуэль дня доступна один раз в сутки. Возвращайся завтра.</p>
        <div className="mt-6 inline-flex items-center gap-6 px-6 py-4 rounded-lg border border-border bg-surface">
          <div><div className="text-xs text-muted-foreground">Очки</div><div className="text-2xl font-serif text-primary">{existing.score}</div></div>
          <div><div className="text-xs text-muted-foreground">Время</div><div className="text-2xl font-serif text-primary">{formatTime(existing.time_seconds)}</div></div>
        </div>
        <div className="mt-6 flex items-center justify-center gap-3">
          <button onClick={() => nav({ to: "/leaderboard" })} className="px-5 py-2 rounded-md bg-primary text-primary-foreground text-sm">Открыть рейтинг</button>
          <button onClick={() => onShare(existing.won, existing.score, existing.time_seconds)}
            className="px-5 py-2 rounded-md border border-accent/60 text-accent text-sm flex items-center gap-1.5 hover:bg-accent/10">
            <Share2 className="h-4 w-4" /> Поделиться карточкой
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-5 grid lg:grid-cols-[minmax(0,1fr)_280px] gap-4">
      <section className="rounded-lg border border-border bg-surface/30 p-2 sm:p-4 flex flex-col min-h-[60vh]">
        <div className="flex flex-wrap items-center gap-2 mb-3 px-2">
          <div className="px-3 py-1.5 rounded-full bg-accent/10 border border-accent/30 text-accent text-xs flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5" /> Дуэль дня · {seed}
          </div>
          <Stat label="Время" value={formatTime(time)} />
          <Stat label="Очки" value={score.toString()} />
          <Stat label="Пар" value={pairsLeft.toString()} />
          <div className="flex-1" />
          <button onClick={showHint} disabled={!active}
            className="h-8 px-3 rounded-md border border-border hover:border-accent text-xs flex items-center gap-1.5 disabled:opacity-40">
            <Lightbulb className="h-3.5 w-3.5" /> Подсказка (-25)
          </button>
        </div>
        <MahjongBoard tiles={tiles} hintIds={hintIds} selectedId={selectedId} matchedIds={matchedIds} onTileClick={onTileClick} />
        {!user && <p className="text-center text-xs text-muted-foreground mt-3">
          <Link to="/auth" className="text-primary hover:underline">Войди</Link>, чтобы попасть в сегодняшний рейтинг.
        </p>}
      </section>
      <aside className="space-y-4">
        <div className="rounded-lg border border-border bg-surface/60 p-4">
          <div className="text-[10px] tracking-[0.25em] uppercase text-primary/70 font-serif mb-3 flex items-center gap-1.5">
            <Trophy className="h-3 w-3" /> Топ дня
          </div>
          {top.length === 0 ? (
            <div className="text-xs text-muted-foreground">Будь первым ронином сегодня.</div>
          ) : (
            <ol className="space-y-2">
              {top.slice(0, 10).map((row, i) => (
                <li key={row.user_id} className="flex items-center gap-2 text-xs">
                  <span className="w-5 text-primary font-serif">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="truncate">{row.profile?.display_name ?? "Аноним"}</div>
                    <div className="text-[10px] text-muted-foreground">{row.profile?.city ?? "—"} · {row.profile?.rank}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-primary">{row.score}</div>
                    <div className="text-[10px] text-muted-foreground">{formatTime(row.time_seconds)}</div>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
        <div className="rounded-lg border border-accent/30 bg-surface/60 p-4">
          <div className="text-[10px] tracking-[0.25em] uppercase text-accent font-serif mb-2">AI-Коуч</div>
          <p className="text-xs text-muted-foreground leading-relaxed">{coach}</p>
        </div>
      </aside>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface border border-border">
      <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</span>
      <span className="text-sm font-serif text-primary">{value}</span>
    </div>
  );
}
function formatTime(s: number) {
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}
