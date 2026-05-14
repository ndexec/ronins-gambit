import { LAYOUTS, type LayoutName, type Slot } from "./layouts";
import { getTileDeck, type TileDef, type TileTheme } from "./tiles";
import { hashSeed, mulberry32, shuffleSeeded } from "./prng";

export type Difficulty = "easy" | "medium" | "hard" | "master";

export interface Tile extends Slot, TileDef {
  id: number;
  removed: boolean;
}

export interface GameConfig {
  layout: LayoutName;
  difficulty: Difficulty;
  theme: TileTheme;
  seed?: string;
}

const DIFF_TILE_LIMIT: Record<Difficulty, number> = {
  easy: 72,    // 1-2 layers
  medium: 108,
  hard: 136,
  master: 144,
};

export function isFree(tile: Tile, tiles: Tile[]): boolean {
  if (tile.removed) return false;
  for (const t of tiles) {
    if (t.removed || t.id === tile.id) continue;
    if (t.z === tile.z + 1 && Math.abs(t.r - tile.r) < 2 && Math.abs(t.c - tile.c) < 2) return false;
  }
  let leftBlocked = false;
  let rightBlocked = false;
  for (const t of tiles) {
    if (t.removed || t.id === tile.id || t.z !== tile.z) continue;
    if (t.r === tile.r && t.c === tile.c - 2) leftBlocked = true;
    if (t.r === tile.r && t.c === tile.c + 2) rightBlocked = true;
  }
  return !(leftBlocked && rightBlocked);
}

export function findFreeTiles(tiles: Tile[]): Tile[] {
  return tiles.filter((t) => isFree(t, tiles));
}

export function findAvailablePairs(tiles: Tile[]): Array<[Tile, Tile]> {
  const free = findFreeTiles(tiles);
  const groups = new Map<string, Tile[]>();
  for (const t of free) {
    const arr = groups.get(t.matchKey) ?? [];
    arr.push(t);
    groups.set(t.matchKey, arr);
  }
  const pairs: Array<[Tile, Tile]> = [];
  for (const arr of groups.values()) {
    if (arr.length >= 2) pairs.push([arr[0], arr[1]]);
  }
  return pairs;
}

export function tilesMatch(a: TileDef, b: TileDef): boolean {
  return a.matchKey === b.matchKey;
}

/**
 * Generate a solvable board by placing pairs onto positions in solvable order.
 * We simulate playing in reverse: pick the next free slot pair (using current
 * stacking) and assign matching tile pairs to them.
 */
export function generateBoard(config: GameConfig): Tile[] {
  const slotsAll = LAYOUTS[config.layout]();
  const limit = DIFF_TILE_LIMIT[config.difficulty];
  // Sort by z descending (top first) and trim from top
  const slots = slotsAll.slice().sort((a, b) => b.z - a.z).slice(0, limit);
  // Ensure even count
  if (slots.length % 2 !== 0) slots.pop();

  const seed = config.seed ?? `${Date.now()}-${Math.random()}`;
  const rand = mulberry32(hashSeed(seed));

  // Build a flat tile sequence: pairs of TileDef, count = slots.length
  const fullDeck = getTileDeck(config.theme);
  const byKey = new Map<string, TileDef[]>();
  for (const td of fullDeck) {
    const arr = byKey.get(td.matchKey) ?? [];
    arr.push(td);
    byKey.set(td.matchKey, arr);
  }
  // Build a sequence where each consecutive pair shares matchKey
  const sequence: TileDef[] = [];
  const keys = shuffleSeeded(Array.from(byKey.keys()), rand);
  let ki = 0;
  while (sequence.length < slots.length) {
    const arr = byKey.get(keys[ki % keys.length])!;
    if (arr.length >= 2) sequence.push(arr[0], arr[1]);
    else sequence.push(arr[0], arr[0]);
    ki++;
  }
  sequence.length = slots.length;

  const tiles: Tile[] = slots.map((s, i) => ({
    ...s,
    id: i,
    removed: true,
    suit: "",
    idx: 0,
    char: "",
    sub: "",
    matchKey: "",
  }));

  // Place ONE tile at a time onto a placeable slot. A slot is placeable
  // when, treated as present alongside everything already placed, it would
  // be free. This produces a board solvable in the exact reverse order.
  const placed = new Set<number>();

  function isPlaceable(slot: Tile): boolean {
    const temp = tiles.map((t) => (t.id === slot.id ? { ...t, removed: false } : t));
    const target = temp.find((t) => t.id === slot.id)!;
    return isFree(target, temp);
  }

  let safety = 0;
  while (placed.size < tiles.length && safety < 20000) {
    safety++;
    const cands = tiles.filter((t) => !placed.has(t.id) && isPlaceable(t));
    if (!cands.length) break;
    const pick = cands[Math.floor(rand() * cands.length)];
    const td = sequence[placed.size];
    Object.assign(pick, td, { removed: false });
    placed.add(pick.id);
  }

  // Drop any slot we couldn't fill (rare); the rest is solvable
  return tiles.filter((t) => placed.has(t.id)).map((t) => ({ ...t, removed: false }));
}

/**
 * Re-distribute the remaining tiles' labels so the board is solvable again.
 * Keeps slot positions; only swaps `char/suit/matchKey/sub/idx`.
 * Returns a new tiles array (or null if impossible).
 */
export function solvableShuffle(tiles: Tile[], seed?: string): Tile[] | null {
  const rand = mulberry32(hashSeed(seed ?? `${Date.now()}-${Math.random()}`));
  const liveSlots = tiles.filter((t) => !t.removed);
  if (liveSlots.length < 2) return null;

  // Pool of TileDefs from currently-live tiles (preserves match-key counts)
  const pool: TileDef[] = liveSlots.map((t) => ({
    suit: t.suit, idx: t.idx, char: t.char, sub: t.sub, matchKey: t.matchKey,
  }));

  // Group pool by matchKey for pair-pulling
  const byKey = new Map<string, TileDef[]>();
  for (const td of pool) {
    const arr = byKey.get(td.matchKey) ?? [];
    arr.push(td); byKey.set(td.matchKey, arr);
  }

  // Build a virtual board (all live slots empty, others permanently removed)
  const virt = tiles.map((t) => ({ ...t, removed: true }));
  const liveIds = new Set(liveSlots.map((t) => t.id));

  function placeable(slot: Tile, current: Tile[]): boolean {
    const temp = current.map((t) => (t.id === slot.id ? { ...t, removed: false } : t));
    const target = temp.find((t) => t.id === slot.id)!;
    // Only consider live slots as part of the solving universe
    const filtered = temp.filter((t) => liveIds.has(t.id) || t.id === slot.id);
    return isFree(target, filtered);
  }

  const placed = new Set<number>();
  // Take pairs in random key order
  const keys = shuffleSeeded(Array.from(byKey.keys()), rand);
  let ki = 0;
  let safety = 0;
  while (placed.size < liveSlots.length && safety < 20000) {
    safety++;
    const cands = virt.filter((t) => liveIds.has(t.id) && !placed.has(t.id) && placeable(t, virt));
    if (cands.length < 2) {
      // try next key set; if completely stuck, abort
      if (cands.length === 0) return null;
      // single candidate but pair needed → bail
      return null;
    }
    // pull a pair
    let arr: TileDef[] | undefined;
    let attempts = 0;
    while (attempts < keys.length) {
      const k = keys[(ki + attempts) % keys.length];
      const a = byKey.get(k);
      if (a && a.length >= 2) { arr = a; ki = (ki + attempts + 1) % keys.length; break; }
      attempts++;
    }
    if (!arr) return null;
    const a = cands[Math.floor(rand() * cands.length)];
    Object.assign(a, arr.shift(), { removed: false });
    placed.add(a.id);
    const cands2 = virt.filter((t) => liveIds.has(t.id) && !placed.has(t.id) && placeable(t, virt));
    if (!cands2.length) return null;
    const b = cands2[Math.floor(rand() * cands2.length)];
    Object.assign(b, arr.shift(), { removed: false });
    placed.add(b.id);
  }

  if (placed.size < liveSlots.length) return null;

  // Merge back: removed slots stay removed, live slots get new labels
  return tiles.map((t) => {
    if (t.removed) return t;
    const v = virt.find((x) => x.id === t.id)!;
    return { ...t, suit: v.suit, idx: v.idx, char: v.char, sub: v.sub, matchKey: v.matchKey };
  });
}

export function computeScore(opts: {
  removed: number;
  total: number;
  timeSeconds: number;
  hintsUsed: number;
  combo: number;
  won: boolean;
}): number {
  const base = opts.removed * 100;
  const speedBonus = opts.won ? Math.max(0, 1500 - opts.timeSeconds * 2) : 0;
  const hintPenalty = opts.hintsUsed * 75;
  const comboBonus = opts.combo * 25;
  return Math.max(0, Math.floor(base + speedBonus + comboBonus - hintPenalty));
}

/** Heuristic AI advice (no external API) */
export function getCoachAdvice(tiles: Tile[]): string {
  const remaining = tiles.filter((t) => !t.removed);
  if (remaining.length === 0) return "Поле очищено. Победа ронина.";
  const free = findFreeTiles(remaining);
  const pairs = findAvailablePairs(remaining);

  if (pairs.length === 0) return "Ходов нет. Дух поля затих — начни заново или используй перемешивание.";
  if (pairs.length === 1) return "Только одна доступная пара. Будь точен — каждый ход решает.";

  // Find a free tile that, if removed, frees more tiles
  let bestId: number | null = null;
  let bestGain = -1;
  for (const f of free) {
    const sim = remaining.map((t) => (t.id === f.id ? { ...t, removed: true } : t));
    const newFree = findFreeTiles(sim).length;
    const gain = newFree - free.length;
    if (gain > bestGain) {
      bestGain = gain;
      bestId = f.id;
    }
  }
  if (bestGain >= 2 && bestId !== null) {
    const t = remaining.find((x) => x.id === bestId)!;
    return `Сними «${t.char}» — откроет ${bestGain} новых плиток.`;
  }
  // Suggest playing high-z first
  const topZ = Math.max(...free.map((t) => t.z));
  if (topZ >= 2) return "Снимай верхние слои первыми — нижние сами откроются.";
  return `Доступно ${pairs.length} пар${pairs.length === 1 ? "а" : pairs.length < 5 ? "ы" : ""}. Ищи разблокировки.`;
}
