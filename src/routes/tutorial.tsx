import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Sword, Sparkles, ChevronRight, CheckCircle2 } from "lucide-react";
import MahjongBoard from "@/components/MahjongBoard";
import { findAvailablePairs, tilesMatch, type Tile } from "@/lib/mahjong/engine";

export const Route = createFileRoute("/tutorial")({
  head: () => ({
    meta: [
      { title: "Путь ронина · Обучение" },
      { name: "description", content: "Интерактивный туториал — первые четыре хода новой жизни странствующего самурая." },
    ],
  }),
  component: TutorialPage,
});

// 8 tiles, 4 pairs, single layer 4 columns × 2 rows. All free from start.
function buildTutorialBoard(): Tile[] {
  const defs = [
    { char: "桜", sub: "sakura", suit: "nature", matchKey: "n-1" },
    { char: "竹", sub: "bamboo", suit: "nature", matchKey: "n-2" },
    { char: "月", sub: "moon",   suit: "moon",   matchKey: "m-1" },
    { char: "刀", sub: "blade",  suit: "fire",   matchKey: "f-1" },
  ];
  const tiles: Tile[] = [];
  let id = 0;
  // Order: pair0 a, pair1 a, pair2 a, pair3 a (top row), then b's (bottom row)
  for (const d of defs) {
    tiles.push({ id: id++, r: 0, c: tiles.length * 2, z: 0, removed: false, idx: 0, ...d });
  }
  for (const d of defs) {
    tiles.push({ id: id++, r: 2, c: (tiles.length - 4) * 2, z: 0, removed: false, idx: 1, ...d });
  }
  return tiles;
}

const STEPS = [
  {
    title: "Ты — ронин",
    body: "Самурай без господина. У тебя осталась только честь и верный клинок. Поле перед тобой — твоя дуэль.",
    cta: "Принять путь",
  },
  {
    title: "Правило одно",
    body: "Найди две одинаковые плитки. Снимай только свободные — те, у которых открыт левый или правый край.",
    cta: "Понятно",
  },
  {
    title: "Покажи честь",
    body: "Очисти это маленькое поле. Четыре пары — четыре удара клинком. Я укажу первый.",
    cta: "Начать дуэль",
  },
];

function TutorialPage() {
  const nav = useNavigate();
  const [step, setStep] = useState(0);
  const [tiles, setTiles] = useState<Tile[]>(() => buildTutorialBoard());
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [matchedIds, setMatchedIds] = useState<number[]>([]);
  const [hintIds, setHintIds] = useState<number[]>([]);
  const [done, setDone] = useState(false);

  const visible = useMemo(() => tiles.filter((t) => !t.removed).length, [tiles]);
  const playing = step >= STEPS.length;

  // Auto-hint while playing
  useEffect(() => {
    if (!playing || done) return;
    const pairs = findAvailablePairs(tiles);
    if (pairs.length === 0) return;
    const t = window.setTimeout(() => {
      setHintIds([pairs[0][0].id, pairs[0][1].id]);
    }, 600);
    return () => window.clearTimeout(t);
  }, [tiles, playing, done]);

  useEffect(() => {
    if (playing && visible === 0 && !done) {
      setDone(true);
      try { localStorage.setItem("ronin_tutorial_done", "1"); } catch {}
    }
  }, [visible, playing, done]);

  function onTileClick(t: Tile) {
    setHintIds([]);
    if (selectedId === null) return setSelectedId(t.id);
    if (selectedId === t.id) return setSelectedId(null);
    const a = tiles.find((x) => x.id === selectedId)!;
    if (tilesMatch(a, t)) {
      setMatchedIds((m) => [...m, a.id, t.id]);
      setSelectedId(null);
      window.setTimeout(() => {
        setTiles((cur) => cur.map((x) => (x.id === a.id || x.id === t.id ? { ...x, removed: true } : x)));
        setMatchedIds((m) => m.filter((id) => id !== a.id && id !== t.id));
      }, 320);
    } else {
      setSelectedId(t.id);
    }
  }

  if (!playing) {
    const s = STEPS[step];
    return (
      <div className="min-h-[80vh] grid place-items-center px-5">
        <div className="max-w-md text-center animate-fade-in">
          <div className="font-zen text-6xl text-primary mb-4">{["浪", "二", "三"][step]}</div>
          <div className="text-[10px] tracking-[0.4em] uppercase text-primary/70 font-serif">Шаг {step + 1} / {STEPS.length}</div>
          <h1 className="font-serif text-3xl mt-3">{s.title}</h1>
          <p className="text-muted-foreground mt-4 leading-relaxed">{s.body}</p>
          <button
            onClick={() => setStep((x) => x + 1)}
            className="mt-8 px-7 py-3 rounded-md bg-primary text-primary-foreground font-serif tracking-wider text-sm inline-flex items-center gap-2"
          >
            {s.cta} <ChevronRight className="h-4 w-4" />
          </button>
          <div className="mt-4">
            <Link to="/" className="text-[11px] text-muted-foreground hover:text-foreground">пропустить</Link>
          </div>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-[80vh] grid place-items-center px-5">
        <div className="max-w-md text-center animate-fade-in">
          <CheckCircle2 className="h-12 w-12 mx-auto text-primary mb-3" />
          <div className="font-zen text-6xl text-primary mb-2">勝</div>
          <h1 className="font-serif text-3xl">Первая победа</h1>
          <p className="text-muted-foreground mt-3">Поле очищено. Клинок ровный, дыхание спокойное. Теперь — настоящая провинция.</p>
          <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
            <button onClick={() => nav({ to: "/play" })} className="px-6 py-3 rounded-md bg-primary text-primary-foreground font-serif tracking-wider text-sm inline-flex items-center gap-2 justify-center">
              <Sword className="h-4 w-4" /> В Эдо
            </button>
            <button onClick={() => nav({ to: "/auth" })} className="px-6 py-3 rounded-md border border-border hover:border-primary text-sm">
              Сохранить прогресс
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-5 py-6">
      <div className="rounded-lg border border-accent/30 bg-surface/60 p-4 mb-4 text-center">
        <div className="text-[10px] tracking-[0.3em] uppercase text-accent font-serif flex items-center justify-center gap-1.5">
          <Sparkles className="h-3 w-3" /> Сэнсэй говорит
        </div>
        <p className="text-sm mt-2 text-muted-foreground">
          Кликни две подсвеченные плитки — это пара. Затем найди следующие три пары сам.
        </p>
        <div className="text-[11px] text-muted-foreground mt-2">Осталось пар: {Math.ceil(visible / 2)}</div>
      </div>
      <div className="rounded-lg border border-border bg-surface/30 p-4 min-h-[40vh] flex">
        <MahjongBoard tiles={tiles} hintIds={hintIds} selectedId={selectedId} matchedIds={matchedIds} onTileClick={onTileClick} />
      </div>
    </div>
  );
}
