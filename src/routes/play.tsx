import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Lightbulb, Undo2, Shuffle, RotateCcw, Pause, Play, Sparkles, Share2, Swords, Dices } from "lucide-react";
import MahjongBoard, { getMatchHint } from "@/components/MahjongBoard";
import { computeScore, findAvailablePairs, generateBoard, getCoachAdvice, solvableShuffle, tilesMatch, type Difficulty, type Tile } from "@/lib/mahjong/engine";
import type { LayoutName } from "@/lib/mahjong/layouts";
import type { TileTheme } from "@/lib/mahjong/tiles";
import {
  rollDuelConfig,
  newDuelSeed,
  type GeneratorTier,
  LAYOUT_LABEL_RU,
  DIFFICULTY_LABEL_RU,
} from "@/lib/mahjong/duel-generator";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { savePlayPreferences } from "@/lib/profile-sync";
import { pickEnemy, PROVINCES, rankFor, xpGain, nextDailyStreak, type EnemyType, enemyPortraitCandidates } from "@/lib/ronin";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Lock, Heart, Skull, Zap, Flame } from "lucide-react";
import { shareResult, readHintQuota, bumpHintQuota, FREE_HINTS_PER_DAY, isProLocal } from "@/lib/share-card";

export const Route = createFileRoute("/play")({
  head: () => ({
    meta: [
      { title: "Дуэль · RONIN Mahjong" },
      { name: "description", content: "Сыграй дуэль ронина. Выбирай раскладку, провинцию и сложность. Прогресс сохраняется." },
    ],
  }),
  validateSearch: (s: Record<string, unknown>) => ({
    layout: (s.layout as LayoutName) || "turtle",
    difficulty: (s.difficulty as Difficulty) || "easy",
    province: Number(s.province) || 1,
    seed: s.seed ? String(s.seed) : undefined,
    challenger: s.challenger ? String(s.challenger) : undefined,
    theme: (["classic", "nature", "moon", "fire"].includes(String(s.theme)) ? s.theme : "classic") as TileTheme,
  }),
  component: PlayPage,
});

const LAYOUTS: { value: LayoutName; label: string; kanji: string }[] = [
  { value: "turtle", label: "Черепаха", kanji: "亀" },
  { value: "dragon", label: "Дракон", kanji: "龍" },
  { value: "pyramid", label: "Пирамида", kanji: "塔" },
  { value: "cross", label: "Крест", kanji: "十" },
];
const DIFFS: { value: Difficulty; label: string }[] = [
  { value: "easy", label: "Лёгкая" },
  { value: "medium", label: "Средняя" },
  { value: "hard", label: "Сложная" },
  { value: "master", label: "Мастер" },
];
const THEMES: { value: TileTheme; label: string; emoji: string }[] = [
  { value: "classic", label: "Классика", emoji: "中" },
  { value: "nature", label: "Природа", emoji: "🌿" },
  { value: "moon", label: "Луна", emoji: "🌙" },
  { value: "fire", label: "Огонь", emoji: "🔥" },
];

function PlayPage() {
  const search = Route.useSearch();
  const nav = useNavigate({ from: "/play" });
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: meProfile } = useQuery({
    queryKey: ["me-profile-play", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select(
          "total_wins, xp, daily_streak, last_played_date, last_layout, last_difficulty, last_theme, last_province",
        )
        .eq("id", user!.id)
        .maybeSingle();
      return data;
    },
  });
  const myWins = meProfile?.total_wins ?? 0;

  const [layout, setLayout] = useState<LayoutName>(search.layout);
  const [difficulty, setDifficulty] = useState<Difficulty>(search.difficulty);
  const [province, setProvince] = useState<number>(search.province);
  const [theme, setTheme] = useState<TileTheme>(search.theme);
  const [generatorTier, setGeneratorTier] = useState<GeneratorTier>("mixed");

  const [tiles, setTiles] = useState<Tile[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [matchedIds, setMatchedIds] = useState<number[]>([]);
  const [hintIds, setHintIds] = useState<number[]>([]);
  const [history, setHistory] = useState<Array<[Tile, Tile]>>([]);
  const [score, setScore] = useState(0);
  const [moves, setMoves] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [combo, setCombo] = useState(0);
  const [time, setTime] = useState(0);
  const [paused, setPaused] = useState(false);
  const [active, setActive] = useState(false);
  const [coach, setCoach] = useState("Начни партию — твой меч ждёт.");
  const [enemy] = useState<EnemyType>(() => pickEnemy());
  const portraitUrls = useMemo(() => enemyPortraitCandidates(enemy, province), [enemy, province]);
  const [portraitAttempt, setPortraitAttempt] = useState(0);
  const timerRef = useRef<number | null>(null);
  const savedRef = useRef(false);

  const provinceData = useMemo(() => PROVINCES.find((p) => p.id === province) ?? PROVINCES[0], [province]);
  const provinceCoverUrl = `/covers/${encodeURIComponent(provinceData.cover)}`;
  const isPro = isProLocal();
  const [seedUsed, setSeedUsed] = useState<string | undefined>(search.seed);
  const [lastFinal, setLastFinal] = useState<{ won: boolean; score: number; time: number } | null>(null);

  // ===== Duel HP system =====
  const PLAYER_MAX_HP = 100;
  const enemyMaxHp = useMemo(() => 60 + province * 25 + ({ easy: 0, medium: 20, hard: 40, master: 70 }[difficulty]), [province, difficulty]);
  const enemyTickMs = useMemo(() => Math.max(6000, 14000 - province * 1000 - ({ easy: 0, medium: 1000, hard: 2000, master: 3000 }[difficulty])), [province, difficulty]);
  const enemyDmg = useMemo(() => 4 + province + ({ easy: 0, medium: 2, hard: 4, master: 6 }[difficulty]), [province, difficulty]);

  const [playerHp, setPlayerHp] = useState(PLAYER_MAX_HP);
  const [enemyHp, setEnemyHp] = useState(enemyMaxHp);
  const [healsLeft, setHealsLeft] = useState(1);
  const [reshufflesLeft, setReshufflesLeft] = useState(2);
  const [enemyAttacking, setEnemyAttacking] = useState(false);
  const [hitFlash, setHitFlash] = useState<"player" | "enemy" | null>(null);
  const enemyTimerRef = useRef<number | null>(null);
  const lastMatchTsRef = useRef<number>(Date.now());

  useEffect(() => {
    setLayout(search.layout);
    setDifficulty(search.difficulty);
    setProvince(search.province);
    setTheme(search.theme);
  }, [search.layout, search.difficulty, search.province, search.theme]);

  useEffect(() => {
    if (!user) return;
    const t = window.setTimeout(() => {
      void savePlayPreferences(user.id, {
        last_layout: layout,
        last_difficulty: difficulty,
        last_theme: theme,
        last_province: province,
      }).then(() => {
        void queryClient.invalidateQueries({ queryKey: ["me-profile-play", user.id] });
      });
    }, 900);
    return () => window.clearTimeout(t);
  }, [layout, difficulty, theme, province, user, queryClient]);

  useEffect(() => {
    setPortraitAttempt(0);
  }, [province, enemy.id, enemy.avatarUrl]);

  function startNew(opts?: { seed?: string; layout?: LayoutName; difficulty?: Difficulty; theme?: TileTheme }) {
    const L = opts?.layout ?? layout;
    const D = opts?.difficulty ?? difficulty;
    const Th = opts?.theme ?? theme;
    const useSeed = opts?.seed !== undefined ? opts.seed : search.seed;
    const board = generateBoard({ layout: L, difficulty: D, theme: Th, seed: useSeed });
    setTiles(board);
    setSelectedId(null);
    setMatchedIds([]);
    setHintIds([]);
    setHistory([]);
    setScore(0);
    setMoves(0);
    setHintsUsed(0);
    setCombo(0);
    setTime(0);
    setActive(true);
    setPaused(false);
    savedRef.current = false;
    setSeedUsed(useSeed);
    setLastFinal(null);
    setPortraitAttempt(0);
    setPlayerHp(PLAYER_MAX_HP);
    setEnemyHp(enemyMaxHp);
    setHealsLeft(isPro ? 99 : 1);
    setReshufflesLeft(isPro ? 99 : 2);
    lastMatchTsRef.current = Date.now();
    setCoach(getCoachAdvice(board));
    if (opts?.layout !== undefined) setLayout(opts.layout);
    if (opts?.difficulty !== undefined) setDifficulty(opts.difficulty);
    if (opts?.theme !== undefined) setTheme(opts.theme);
  }

  // Auto-start a challenge if seed comes from URL
  useEffect(() => {
    if (search.seed && !tiles.length) startNew({ seed: search.seed });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search.seed]);

  // Timer
  useEffect(() => {
    if (!active || paused) return;
    timerRef.current = window.setInterval(() => setTime((t) => t + 1), 1000);
    return () => { if (timerRef.current) window.clearInterval(timerRef.current); };
  }, [active, paused]);

  // Enemy attack rhythm
  useEffect(() => {
    if (!active || paused) return;
    enemyTimerRef.current = window.setInterval(() => {
      // If you matched recently (<3s), enemy hesitates
      const sinceMatch = Date.now() - lastMatchTsRef.current;
      if (sinceMatch < 3000) return;
      setEnemyAttacking(true);
      setTimeout(() => setEnemyAttacking(false), 600);
      setHitFlash("player");
      setTimeout(() => setHitFlash(null), 400);
      setPlayerHp((hp) => Math.max(0, hp - enemyDmg));
    }, enemyTickMs);
    return () => { if (enemyTimerRef.current) window.clearInterval(enemyTimerRef.current); };
  }, [active, paused, enemyTickMs, enemyDmg]);

  const visibleCount = useMemo(() => tiles.filter((t) => !t.removed).length, [tiles]);
  const totalCount = tiles.length;
  const removedCount = totalCount - visibleCount;
  const progress = totalCount ? Math.round((removedCount / totalCount) * 100) : 0;
  const pairsLeft = useMemo(() => findAvailablePairs(tiles).length, [tiles]);
  const playerPct = Math.round((playerHp / PLAYER_MAX_HP) * 100);
  const enemyPct = Math.round((enemyHp / enemyMaxHp) * 100);

  // Win/lose
  useEffect(() => {
    if (!active || !totalCount) return;
    const won = enemyHp <= 0 || visibleCount === 0;
    const lost = playerHp <= 0;
    if (!won && !lost) {
      // Stuck? auto-offer reshuffle, or lose if no pairs and no reshuffles
      if (pairsLeft === 0 && visibleCount > 0) {
        if (reshufflesLeft > 0) {
          toast("Ходов нет — поле перемешивается", { description: `Осталось перемешиваний: ${reshufflesLeft - 1}` });
          doShuffle(true);
        } else {
          finishMatch(false);
        }
      }
      return;
    }
    finishMatch(won);
  }, [visibleCount, pairsLeft, active, totalCount, playerHp, enemyHp]);

  function finishMatch(won: boolean) {
    setActive(false);
    const finalScore = computeScore({ removed: removedCount, total: totalCount, timeSeconds: time, hintsUsed, combo, won });
    setScore(finalScore);
    setLastFinal({ won, score: finalScore, time });
    saveResult(won, finalScore);
    if (won) toast.success("Победа! Враг повержен.", { description: `${finalScore} очков · ${formatTime(time)}` });
    else toast("Поражение. Ронин падёт — но поднимется.", { description: `Убрано ${removedCount} из ${totalCount}` });
  }


  async function saveResult(won: boolean, finalScore: number) {
    if (savedRef.current) return;
    savedRef.current = true;
    if (!user) return;
    const { error } = await supabase.from("game_history").insert({
      user_id: user.id,
      layout,
      difficulty,
      score: finalScore,
      time_seconds: time,
      moves,
      hints_used: hintsUsed,
      won,
      province,
      seed: seedUsed ?? null,
      theme,
    });
    if (error) console.error(error);

    const { data: profile } = await supabase.from("profiles")
      .select("total_wins, total_games, current_streak, best_streak, xp, daily_streak, best_daily_streak, last_played_date")
      .eq("id", user.id).maybeSingle();

    const todayISO = new Date().toISOString().slice(0, 10);
    const newDaily = nextDailyStreak(profile?.last_played_date ?? null, todayISO, profile?.daily_streak ?? 0);
    const newBestDaily = Math.max(profile?.best_daily_streak ?? 0, newDaily);
    const gainedXp = xpGain({ won, score: finalScore, province });
    const newXp = (profile?.xp ?? 0) + gainedXp;

    if (won) {
      const wins = (profile?.total_wins ?? 0) + 1;
      const games = (profile?.total_games ?? 0) + 1;
      const streak = (profile?.current_streak ?? 0) + 1;
      const best = Math.max(profile?.best_streak ?? 0, streak);
      await supabase.from("profiles").update({
        total_wins: wins,
        total_games: games,
        current_streak: streak,
        best_streak: best,
        xp: newXp,
        daily_streak: newDaily,
        best_daily_streak: newBestDaily,
        last_played_date: todayISO,
        rank: rankFor(newXp),
        updated_at: new Date().toISOString(),
      }).eq("id", user.id);
      toast(`+${gainedXp} XP · серия дней: ${newDaily}🔥`, { description: `Уровень: ${rankFor(newXp)}` });
    } else {
      await supabase.from("profiles").update({
        total_games: (profile?.total_games ?? 0) + 1,
        current_streak: 0,
        xp: newXp,
        daily_streak: newDaily,
        best_daily_streak: newBestDaily,
        last_played_date: todayISO,
        rank: rankFor(newXp),
        updated_at: new Date().toISOString(),
      }).eq("id", user.id);
    }
    void queryClient.invalidateQueries({ queryKey: ["my-history", user.id] });
    void queryClient.invalidateQueries({ queryKey: ["profile", user.id] });
    void queryClient.invalidateQueries({ queryKey: ["me-profile-play", user.id] });
  }

  function onTileClick(tile: Tile) {
    if (!active || paused) return;
    setHintIds([]);
    if (selectedId === null) {
      setSelectedId(tile.id);
      return;
    }
    if (selectedId === tile.id) {
      setSelectedId(null);
      return;
    }
    const a = tiles.find((t) => t.id === selectedId)!;
    const b = tile;
    if (tilesMatch(a, b)) {
      setMatchedIds((m) => [...m, a.id, b.id]);
      setMoves((x) => x + 1);
      const newCombo = combo + 1;
      setCombo(newCombo);
      setHistory((h) => [...h, [a, b]]);
      setSelectedId(null);
      // Damage to enemy
      const dmg = Math.min(22, 8 + newCombo * 2);
      lastMatchTsRef.current = Date.now();
      setHitFlash("enemy");
      setTimeout(() => setHitFlash(null), 400);
      setEnemyHp((hp) => Math.max(0, hp - dmg));
      // Animate then remove
      setTimeout(() => {
        setTiles((cur) => cur.map((t) => (t.id === a.id || t.id === b.id ? { ...t, removed: true } : t)));
        setMatchedIds((m) => m.filter((id) => id !== a.id && id !== b.id));
        setScore((s) => s + 100 + combo * 10);
        setCoach(getCoachAdvice(tiles.map((t) => (t.id === a.id || t.id === b.id ? { ...t, removed: true } : t))));
      }, 350);
    } else {
      setCombo(0);
      setSelectedId(b.id);
      // Wrong move = small self-damage (penalty)
      setPlayerHp((hp) => Math.max(0, hp - 3));
      toast("Не пара", { description: "−3 HP. Точность важнее скорости." });
    }
  }

  function showHint() {
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
    if (!pair) return toast("Подсказка недоступна — пар нет.");
    setHintIds([pair[0].id, pair[1].id]);
    setHintsUsed((h) => h + 1);
    setScore((s) => Math.max(0, s - 25));
    if (!isPro) {
      const used = bumpHintQuota();
      const left = Math.max(0, FREE_HINTS_PER_DAY - used);
      if (left <= 1) toast(`Осталось подсказок сегодня: ${left}`);
    }
    setTimeout(() => setHintIds([]), 2500);
  }

  function heal() {
    if (!isPro && healsLeft <= 0) {
      toast("Зелья закончились", {
        description: "RONIN PRO — безлимит лечения и перемешиваний.",
        action: { label: "Pro", onClick: () => nav({ to: "/shop" }) },
      });
      return;
    }
    setPlayerHp((hp) => Math.min(PLAYER_MAX_HP, hp + 35));
    if (!isPro) setHealsLeft((n) => n - 1);
    toast("+35 HP", { description: "Дыхание ронина восстановлено." });
  }

  async function onShare() {
    if (!lastFinal) return;
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const url = `${origin}/play?layout=${layout}&difficulty=${difficulty}&province=${province}&theme=${theme}&seed=${encodeURIComponent(seedUsed ?? "")}&challenger=${encodeURIComponent(user?.id?.slice(0, 8) ?? "ronin")}`;
    const r = await shareResult({
      title: `${provinceData.name} · ${enemy.name}`,
      subtitle: `Раскладка: ${layout} · ${difficulty}`,
      score: lastFinal.score,
      timeSeconds: lastFinal.time,
      won: lastFinal.won,
      player: user?.email?.split("@")[0],
      challengeUrl: seedUsed ? url : undefined,
    });
    toast(r === "shared" ? "Карточка отправлена" : "Карточка скачана");
  }

  function undo() {
    if (!history.length) return;
    const last = history[history.length - 1];
    setTiles((cur) => cur.map((t) => (t.id === last[0].id || t.id === last[1].id ? { ...t, removed: false } : t)));
    setHistory((h) => h.slice(0, -1));
    setScore((s) => Math.max(0, s - 50));
    setCombo(0);
    toast("Ход возвращён");
  }

  function doShuffle(forced = false) {
    if (!forced) {
      if (!isPro && reshufflesLeft <= 0) {
        toast("Перемешивания закончились", {
          description: "Открой безлимит в RONIN PRO.",
          action: { label: "Pro", onClick: () => nav({ to: "/shop" }) },
        });
        return;
      }
      if (!isPro) setReshufflesLeft((n) => n - 1);
    }
    const next = solvableShuffle(tiles);
    if (!next) {
      toast("Поле невозможно перетасовать решаемо — начни заново.");
      return;
    }
    setTiles(next);
    setSelectedId(null);
    setHintIds([]);
    setScore((s) => Math.max(0, s - 50));
    if (!forced) toast("Поле перемешано (решаемо)");
  }

  function applyConfig(
    next: Partial<{ layout: LayoutName; difficulty: Difficulty; province: number; theme: TileTheme }>,
    options?: { keepChallenge?: boolean },
  ) {
    const L = next.layout ?? layout;
    const D = next.difficulty ?? difficulty;
    const P = next.province !== undefined ? next.province : province;
    const Th = next.theme ?? theme;
    if (next.layout !== undefined) setLayout(L);
    if (next.difficulty !== undefined) setDifficulty(D);
    if (next.province !== undefined) setProvince(P);
    if (next.theme !== undefined) setTheme(Th);
    nav({
      from: "/play",
      search: {
        layout: L,
        difficulty: D,
        province: P,
        theme: Th,
        seed: options?.keepChallenge ? search.seed : undefined,
        challenger: options?.keepChallenge ? search.challenger : undefined,
      },
    });
  }

  function restoreSavedPrefs() {
    if (!user || !meProfile?.last_layout) return;
    applyConfig({
      layout: meProfile.last_layout as LayoutName,
      difficulty: (meProfile.last_difficulty as Difficulty) || "easy",
      province: meProfile.last_province ?? province,
      theme: (meProfile.last_theme as TileTheme) || "classic",
    });
    toast.success("Загружено из облака", { description: "Раскладка, сложность и тема восстановлены." });
  }

  function generateRandomDuel() {
    const rolled = rollDuelConfig(generatorTier, newDuelSeed());
    nav({
      from: "/play",
      search: {
        ...search,
        layout: rolled.layout,
        difficulty: rolled.difficulty,
        seed: rolled.seed,
        theme,
        province,
        challenger: undefined,
      },
    });
    startNew({ seed: rolled.seed, layout: rolled.layout, difficulty: rolled.difficulty, theme });
    toast.success("Судьба бросила жребий", { description: rolled.summaryRu });
  }

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-5 grid lg:grid-cols-[220px_minmax(0,1fr)_240px] gap-4">
      {/* LEFT */}
      <aside className="space-y-4">
        <div className="rounded-lg border border-border bg-surface/60 p-3">
          <div className="text-[10px] tracking-[0.25em] uppercase text-primary/70 font-serif mb-2 flex items-center justify-between">
            <span>Провинция</span>
            <span className="text-muted-foreground normal-case tracking-normal">{myWins} побед</span>
          </div>
          <div className="space-y-1.5">
            {PROVINCES.map((p) => {
              const locked = myWins < p.unlockWins;
              const isActive = province === p.id;
              const coverUrl = `/covers/${encodeURIComponent(p.cover)}`;
              return (
                <button
                  key={p.id}
                  onClick={() => {
                    if (locked) {
                      toast(`${p.name} закрыта`, { description: `Нужно ${p.unlockWins} побед. У тебя ${myWins}.` });
                      return;
                    }
                    applyConfig({ province: p.id });
                  }}
                  className={`group relative w-full overflow-hidden text-left px-2 py-2 rounded-md border text-xs flex items-center gap-2 transition ${
                    isActive ? "border-primary text-primary bg-primary/10" :
                    locked ? "border-border/50 text-muted-foreground/60 cursor-not-allowed" :
                    "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`absolute inset-0 bg-cover bg-center transition duration-300 ${
                      isActive ? "opacity-45" : locked ? "opacity-15 grayscale" : "opacity-25 group-hover:opacity-35"
                    }`}
                    style={{ backgroundImage: `url("${coverUrl}")` }}
                  />
                  <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/75 to-background/45" />
                  <span className="relative z-10 font-zen text-base drop-shadow">{p.kanji}</span>
                  <span className="relative z-10 flex-1 truncate drop-shadow">{p.name}</span>
                  {locked && <Lock className="relative z-10 h-3 w-3" />}
                  {locked && <span className="relative z-10 text-[10px]">{p.unlockWins}</span>}
                </button>
              );
            })}
          </div>
          <div className="text-[11px] text-muted-foreground mt-2 italic">{provinceData.description}</div>
        </div>
        <div className="rounded-lg border border-border bg-surface/60 p-3">
          <div className="text-[10px] tracking-[0.25em] uppercase text-primary/70 font-serif mb-2 flex items-center justify-between">
            <span>Раскладка</span>
            <button
              type="button"
              onClick={generateRandomDuel}
              className="h-6 px-2 rounded-md border border-accent/40 bg-accent/10 text-[10px] tracking-normal normal-case text-accent hover:bg-accent/20 transition inline-flex items-center gap-1"
              title="Сгенерировать дуэль"
            >
              <Dices className="h-3 w-3" /> Рандом
            </button>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {LAYOUTS.map((l) => (
              <button key={l.value} onClick={() => applyConfig({ layout: l.value })}
                className={`p-2 rounded-md border text-xs flex items-center gap-1 ${layout === l.value ? "border-primary text-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}>
                <span className="font-zen text-sm">{l.kanji}</span>{l.label}
              </button>
            ))}
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            {(
              [
                { id: "relaxed" as const, label: "Спокойный" },
                { id: "mixed" as const, label: "Смешанный" },
                { id: "brutal" as const, label: "Суровый" },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setGeneratorTier(t.id)}
                className={`px-2 py-1 rounded-md border text-[10px] ${
                  generatorTier === t.id ? "border-accent text-accent bg-accent/10" : "border-border text-muted-foreground hover:border-accent/40"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          {user && meProfile?.last_layout && (
            <button
              type="button"
              onClick={restoreSavedPrefs}
              className="mt-2 w-full py-1.5 rounded-md border border-border text-[11px] text-muted-foreground hover:text-foreground hover:border-primary/40 transition"
            >
              Загрузить сохранённую конфигурацию
            </button>
          )}
        </div>
        <div className="rounded-lg border border-border bg-surface/60 p-3">
          <div className="text-[10px] tracking-[0.25em] uppercase text-primary/70 font-serif mb-2">Сложность</div>
          <div className="flex flex-wrap gap-1.5">
            {DIFFS.map((d) => (
              <button key={d.value} onClick={() => applyConfig({ difficulty: d.value })}
                className={`px-2.5 py-1 rounded-md border text-[11px] ${difficulty === d.value ? "border-primary text-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}>
                {d.label}
              </button>
            ))}
          </div>
        </div>
        <div className="rounded-lg border border-border bg-surface/60 p-3">
          <div className="text-[10px] tracking-[0.25em] uppercase text-primary/70 font-serif mb-2">Тема плиток</div>
          <div className="flex flex-wrap gap-1.5">
            {THEMES.map((t) => (
              <button key={t.value} onClick={() => applyConfig({ theme: t.value })}
                className={`h-9 w-9 grid place-items-center rounded-md border text-base ${theme === t.value ? "border-primary text-primary" : "border-border hover:border-primary/40"}`}
                title={t.label}>
                {t.emoji}
              </button>
            ))}
          </div>
        </div>
      </aside>

      {/* CENTER */}
      <section
        className="relative overflow-hidden rounded-lg border border-border bg-surface/30 bg-cover bg-center p-2 sm:p-4 flex flex-col min-h-[60vh]"
        style={{
          backgroundImage: `linear-gradient(180deg, oklch(0.16 0.013 60 / 0.86), oklch(0.16 0.013 60 / 0.92)), url("${provinceCoverUrl}")`,
        }}
      >
        {/* Duel HUD */}
        <div className={`mx-1 sm:mx-2 mb-3 rounded-lg border backdrop-blur-md shadow-lg shadow-black/20 ${
          hitFlash === "player" ? "border-destructive bg-destructive/10 animate-pulse" : "border-border bg-background/55"
        }`}>
          <div className="flex flex-col gap-2 p-2 sm:gap-3 sm:p-3">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="flex items-center gap-2 min-w-0 sm:min-w-36">
                <div className="h-8 w-8 shrink-0 grid place-items-center rounded-md border border-destructive/35 bg-destructive/10 text-destructive sm:h-9 sm:w-9">
                  <Heart className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Ронин · ты</div>
                  <div className="hidden text-xs font-serif text-foreground sm:block">Стойкость</div>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="mb-1 flex items-center justify-between text-[10px] uppercase tracking-widest">
                  <span className="text-muted-foreground">HP</span>
                  <span className="font-serif text-destructive">{playerHp}/{PLAYER_MAX_HP}</span>
                </div>
                <div className="h-2 rounded-full border border-destructive/20 bg-background/70 overflow-hidden sm:h-3">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-destructive to-primary transition-all"
                    style={{ width: `${playerPct}%` }}
                  />
                </div>
              </div>
              <button
                onClick={heal}
                disabled={!active || paused || playerHp >= PLAYER_MAX_HP}
                className="h-8 shrink-0 px-2 rounded-md border border-destructive/40 bg-destructive/5 text-destructive hover:bg-destructive/10 text-xs flex items-center justify-center gap-1.5 disabled:opacity-40 sm:h-9 sm:px-3"
                title="Лечение"
              >
                <Heart className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Лечение</span>{!isPro && `(${healsLeft})`}
              </button>
            </div>

            <div className="border-t border-border/60 pt-2 sm:pt-3">
              <div className="flex gap-1.5 overflow-x-auto pb-2">
                <button onClick={() => setPaused((p) => !p)} disabled={!active}
                  className="h-8 shrink-0 px-3 rounded-md border border-border bg-background/35 hover:border-primary text-xs flex items-center gap-1.5 disabled:opacity-40 sm:h-9">
                  {paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
                  <span className="hidden sm:inline">{paused ? "Продолжить" : "Пауза"}</span>
                </button>
                <button onClick={showHint} disabled={!active || paused}
                  className="h-8 shrink-0 px-3 rounded-md border border-border bg-background/35 hover:border-accent text-xs flex items-center gap-1.5 disabled:opacity-40 sm:h-9">
                  <Lightbulb className="h-3.5 w-3.5" />
                  <span className="sm:hidden">{!isPro && Math.max(0, FREE_HINTS_PER_DAY - readHintQuota().used)}</span>
                  <span className="hidden sm:inline">Подсказка{!isPro && ` (${Math.max(0, FREE_HINTS_PER_DAY - readHintQuota().used)})`}</span>
                </button>
                <button onClick={undo} disabled={!history.length}
                  className="h-8 shrink-0 px-3 rounded-md border border-border bg-background/35 hover:border-primary text-xs flex items-center gap-1.5 disabled:opacity-40 sm:h-9">
                  <Undo2 className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Отменить</span>
                </button>
                <button onClick={() => doShuffle(false)} disabled={!active || paused}
                  className="h-8 shrink-0 px-3 rounded-md border border-border bg-background/35 hover:border-primary text-xs flex items-center gap-1.5 disabled:opacity-40 sm:h-9">
                  <Shuffle className="h-3.5 w-3.5" />
                  <span className="sm:hidden">{!isPro && reshufflesLeft}</span>
                  <span className="hidden sm:inline">Перемешать{!isPro && ` (${reshufflesLeft})`}</span>
                </button>
                {lastFinal && (
                  <button onClick={onShare}
                    className="h-8 shrink-0 px-3 rounded-md border border-accent/60 bg-accent/5 text-accent text-xs flex items-center gap-1.5 hover:bg-accent/10 sm:h-9">
                    <Share2 className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Поделиться</span>
                  </button>
                )}
                <button onClick={() => startNew()}
                  className="h-8 shrink-0 px-3 rounded-md bg-primary text-primary-foreground text-xs flex items-center gap-1.5 sm:h-9">
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{active ? "Заново" : "Начать"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {search.challenger && search.seed && (
          <div className="mb-3 mx-2 px-3 py-2 rounded-md border border-accent/40 bg-accent/5 text-xs flex items-center gap-2">
            <Swords className="h-3.5 w-3.5 text-accent" />
            <span><span className="text-accent font-serif">{search.challenger}</span> бросил тебе вызов. Та же раскладка, тот же сид.</span>
          </div>
        )}

        {!tiles.length ? (
          <div className="flex-1 grid place-items-center text-center px-4">
            <div>
              <div className="font-zen text-7xl text-primary mb-3">対決</div>
              <h2 className="font-serif text-2xl">Готов к дуэли?</h2>
              <p className="text-sm text-muted-foreground mt-2 max-w-md">
                Сразись с <span className="text-primary">{enemy.name}</span> в провинции <span className="text-primary">{provinceData.name}</span>.
                Каждая пара = удар. Не давай ему атаковать первым.
              </p>
              <button onClick={() => startNew()} className="mt-6 px-7 py-3 rounded-md bg-primary text-primary-foreground font-serif tracking-wider text-sm">
                Обнажить меч
              </button>
              {!user && <div className="text-[11px] text-muted-foreground mt-4">
                <Link to="/auth" className="text-primary hover:underline">Войди</Link>, чтобы сохранять прогресс и попасть в рейтинг.
              </div>}
            </div>
          </div>
        ) : (
          <MahjongBoard tiles={tiles} hintIds={hintIds} selectedId={selectedId} matchedIds={matchedIds} onTileClick={onTileClick} />
        )}
      </section>

      {/* RIGHT — Enemy duel card */}
      <aside className="space-y-4">
        <div className={`rounded-lg border ${hitFlash === "enemy" ? "border-primary bg-primary/10" : "border-border bg-surface/60"} p-4 transition`}>
          <div className="text-[10px] tracking-[0.25em] uppercase text-primary/70 font-serif mb-3 flex items-center justify-between">
            <span>Противник</span>
            <span className="text-muted-foreground normal-case tracking-normal">Ур. {province}</span>
          </div>
          <div className="flex items-center gap-3 mb-3">
            <div
              className={`relative h-16 w-16 shrink-0 rounded-md overflow-hidden border border-border grid place-items-center font-zen text-3xl ${enemyAttacking ? "bg-destructive/20 text-destructive scale-110" : "bg-surface-2 text-primary"} transition-transform`}
            >
              {portraitAttempt < portraitUrls.length ? (
                <img
                  key={`${portraitUrls[portraitAttempt]}-${portraitAttempt}`}
                  src={portraitUrls[portraitAttempt]}
                  alt=""
                  className="h-full w-full object-cover"
                  onError={() => setPortraitAttempt((a) => a + 1)}
                />
              ) : (
                <span className="px-0.5 text-center leading-none">{provinceData.kanji}</span>
              )}
              {enemyAttacking && <Zap className="absolute -top-1 -right-1 h-4 w-4 text-destructive animate-pulse pointer-events-none" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-serif text-base truncate">{enemy.name}</div>
              <div className="text-[11px] text-muted-foreground truncate">{provinceData.name}</div>
            </div>
          </div>
          <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
            <span>HP</span>
            <span className="text-primary font-serif">{enemyHp}/{enemyMaxHp}</span>
          </div>
          <div className="h-2 rounded-full bg-surface-2 overflow-hidden">
            <div className="h-full bg-primary transition-all" style={{ width: `${enemyPct}%` }} />
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <Flame className="h-3 w-3 text-destructive" />
            Атака: {enemyDmg} HP каждые {Math.round(enemyTickMs / 1000)}с
          </div>
          {enemyHp <= 0 && (
            <div className="mt-3 flex items-center gap-1.5 text-xs text-primary">
              <Skull className="h-3.5 w-3.5" /> Враг повержен
            </div>
          )}
        </div>

        <div className="rounded-lg border border-accent/30 bg-surface/60 p-3">
          <div className="text-[10px] tracking-[0.25em] uppercase text-accent font-serif mb-2 flex items-center gap-1.5">
            <Sparkles className="h-3 w-3" /> AI-Коуч
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">{coach}</p>
        </div>

        <div className="rounded-lg border border-border bg-surface/60 p-3">
          <div className="text-[10px] tracking-[0.25em] uppercase text-primary/70 font-serif mb-3">Партия</div>
          <div className="grid grid-cols-2 gap-1.5 mb-3">
            <Metric label="Время" value={formatTime(time)} highlight={time > 600} />
            <Metric label="Очки" value={score.toString()} />
            <Metric label="Комбо" value={`x${combo}`} />
            <Metric label="Пар" value={pairsLeft.toString()} />
          </div>
          <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
            <span>Поле</span>
            <span className="text-accent font-serif">{progress}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden">
            <div className="h-full bg-accent transition-all" style={{ width: `${progress}%` }} />
          </div>
          <div className="text-[11px] text-muted-foreground mt-2">{removedCount} / {totalCount} плиток</div>
        </div>

        {!isPro && (
          <button onClick={() => nav({ to: "/shop" })}
            className="w-full rounded-lg border border-accent/40 bg-accent/5 hover:bg-accent/10 p-3 text-left transition">
            <div className="text-[10px] tracking-[0.25em] uppercase text-accent font-serif mb-1">RONIN PRO</div>
            <div className="text-xs text-foreground">Безлимит лечения, перемешиваний и подсказок.</div>
          </button>
        )}
      </aside>
    </div>
  );
}

function Metric({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="rounded-md border border-border/80 bg-background/35 px-2.5 py-2">
      <div className="text-[9px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className={`mt-1 font-serif text-sm ${highlight ? "text-destructive animate-pulse" : "text-primary"}`}>{value}</div>
    </div>
  );
}

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, "0")}`;
}
