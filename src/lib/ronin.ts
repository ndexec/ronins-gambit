// RONIN narrative content (provinces, ranks, XP levels)
export interface Province {
  id: number;
  name: string;
  kanji: string;
  description: string;
  cover: string;
  unlockWins: number;
  layout: "turtle" | "dragon" | "pyramid" | "cross";
  difficulty: "easy" | "medium" | "hard" | "master";
}

export const PROVINCES: Province[] = [
  { id: 1, name: "Эдо", kanji: "江戸", description: "Сонные улицы столицы. Здесь начинается путь.", cover: "Edo.png", unlockWins: 0, layout: "turtle", difficulty: "easy" },
  { id: 2, name: "Киото", kanji: "京都", description: "Древние храмы и тени мастеров.", cover: "Kyoto.png", unlockWins: 3, layout: "pyramid", difficulty: "medium" },
  { id: 3, name: "Осака", kanji: "大阪", description: "Гавань интриг. Враг хитрее.", cover: "Osaka.png", unlockWins: 8, layout: "cross", difficulty: "medium" },
  { id: 4, name: "Хоккайдо", kanji: "北海道", description: "Снега, волки, одиночество.", cover: "Hokkaido.png", unlockWins: 15, layout: "dragon", difficulty: "hard" },
  { id: 5, name: "Гора Фудзи", kanji: "富士", description: "Вершина испытаний. Дуэль с собой.", cover: "Mount Fuji.png", unlockWins: 25, layout: "turtle", difficulty: "master" },
];

// XP-based level system: Ученик → Самурай → Мастер → Легенда
export interface Level {
  index: number;
  title: string;
  xpFrom: number;
  kanji: string;
}

export const LEVELS: Level[] = [
  { index: 0, title: "Ученик",  xpFrom: 0,     kanji: "学" },
  { index: 1, title: "Воин",    xpFrom: 500,   kanji: "兵" },
  { index: 2, title: "Самурай", xpFrom: 2000,  kanji: "侍" },
  { index: 3, title: "Мастер",  xpFrom: 6000,  kanji: "師" },
  { index: 4, title: "Легенда", xpFrom: 15000, kanji: "伝" },
];

export function levelFor(xp: number): Level {
  let cur = LEVELS[0];
  for (const l of LEVELS) if (xp >= l.xpFrom) cur = l;
  return cur;
}

export function nextLevel(xp: number): Level | null {
  return LEVELS.find((l) => l.xpFrom > xp) ?? null;
}

export function levelProgress(xp: number): { pct: number; into: number; span: number } {
  const cur = levelFor(xp);
  const nxt = nextLevel(xp);
  if (!nxt) return { pct: 100, into: xp - cur.xpFrom, span: 1 };
  const span = nxt.xpFrom - cur.xpFrom;
  const into = xp - cur.xpFrom;
  return { pct: Math.min(100, Math.round((into / span) * 100)), into, span };
}

// Backward-compat: rank label used in many places (now derived from XP if available)
export const RANKS = LEVELS.map((l) => ({ wins: l.xpFrom / 100, title: l.title }));
export function rankFor(xpOrWins: number): string {
  return levelFor(xpOrWins).title;
}

// XP gained per game
export function xpGain(opts: { won: boolean; score: number; province: number; }): number {
  const base = opts.won ? 100 : 20;
  const fromScore = Math.floor(opts.score / 5);
  const provinceMult = 1 + (opts.province - 1) * 0.25;
  return Math.floor((base + fromScore) * provinceMult);
}

// Daily streak update: returns next daily_streak given last played date
export function nextDailyStreak(lastDate: string | null | undefined, todayISO: string, prev: number): number {
  if (!lastDate) return 1;
  if (lastDate === todayISO) return prev || 1; // already counted today
  const last = new Date(lastDate + "T00:00:00Z").getTime();
  const today = new Date(todayISO + "T00:00:00Z").getTime();
  const diffDays = Math.round((today - last) / 86400000);
  if (diffDays === 1) return prev + 1;
  return 1; // missed a day -> reset
}

/** Province id → subfolder under `public/avatars/enemies/` (e.g. Эдо → `Edo`). */
export const ENEMY_PORTRAIT_FOLDER_BY_PROVINCE: Partial<Record<number, string>> = {
  1: "Edo",
};

const PORTRAIT_EXTS = [".webp", ".png", ".jpg", ".jpeg"] as const;

/** Ordered URLs to try for the duel portrait (first match wins). */
export function enemyPortraitCandidates(enemy: EnemyType, provinceId: number): string[] {
  const folder = ENEMY_PORTRAIT_FOLDER_BY_PROVINCE[provinceId];
  const ordered: string[] = [];
  if (enemy.avatarUrl) ordered.push(enemy.avatarUrl);
  if (folder) {
    for (const ext of PORTRAIT_EXTS) {
      ordered.push(`${import.meta.env.BASE_URL}avatars/enemies/${folder}/${enemy.id}${ext}`);
    }
  }
  for (const ext of PORTRAIT_EXTS) {
    ordered.push(`${import.meta.env.BASE_URL}avatars/enemies/${enemy.id}${ext}`);
  }
  return [...new Set(ordered)];
}

/** Duel opponent: stable `id` is the filename stem (see `enemyPortraitCandidates`). */
export interface EnemyType {
  id: string;
  name: string;
  /** Optional absolute path under `public/`. Tried before province folder / flat paths. */
  avatarUrl?: string;
}

/**
 * All opponents (order = rotation index for `pickEnemy`).
 * Per-province art: `public/avatars/enemies/<ProvinceFolder>/<id>.webp` (see ENEMY_PORTRAIT_FOLDER_BY_PROVINCE).
 */
export const ENEMY_TYPES: EnemyType[] = [
  { id: "hattori-kuro", name: "Хаттори Куро" },
  { id: "jin-no-ueda", name: "Дзин-но-Уэда" },
  { id: "sen-miramoto", name: "Сэн Мирамото" },
  { id: "kotaro-tengu", name: "Котаро Тэнгу" },
  { id: "yasuo-san", name: "Ясуо-сан" },
  { id: "ghost-even-field", name: "Призрак Ровного Поля" },
  { id: "yoshiro-northern", name: "Йоширо Северный" },
  { id: "ayame-blade", name: "Аяме Лезвие" },
];

/** @deprecated use ENEMY_TYPES */
export const ENEMY_NAMES: string[] = ENEMY_TYPES.map((e) => e.name);

export function pickEnemy(seed = Date.now()): EnemyType {
  return ENEMY_TYPES[Math.abs(seed) % ENEMY_TYPES.length]!;
}
