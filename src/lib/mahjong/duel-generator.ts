import type { LayoutName } from "./layouts";
import type { Difficulty } from "./engine";
import { hashSeed, mulberry32 } from "./prng";

/** How aggressive random duel generation is toward harder shapes and ranks. */
export type GeneratorTier = "relaxed" | "mixed" | "brutal";

const LAYOUTS: LayoutName[] = ["turtle", "dragon", "pyramid", "cross"];
const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard", "master"];

export const LAYOUT_LABEL_RU: Record<LayoutName, string> = {
  turtle: "Черепаха",
  dragon: "Дракон",
  pyramid: "Пирамида",
  cross: "Крест",
};

export const DIFFICULTY_LABEL_RU: Record<Difficulty, string> = {
  easy: "Лёгкая",
  medium: "Средняя",
  hard: "Сложная",
  master: "Мастер",
};

function pickWeighted<T>(items: T[], weights: number[], rand: () => number): T {
  const sum = weights.reduce((a, b) => a + b, 0);
  let r = rand() * sum;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

/**
 * Deterministic duel parameters from a seed string (shareable / daily-style).
 */
export function rollDuelConfig(tier: GeneratorTier, seedBase: string): {
  seed: string;
  layout: LayoutName;
  difficulty: Difficulty;
  summaryRu: string;
} {
  const seed = seedBase.startsWith("duel-") ? seedBase : `duel-${seedBase}`;
  const rand = mulberry32(hashSeed(seed));

  let layoutWeights: number[];
  let diffWeights: number[];

  switch (tier) {
    case "relaxed":
      // Favor flatter stacks and gentler ranks
      layoutWeights = [0.12, 0.28, 0.35, 0.25]; // turtle, dragon, pyramid, cross
      diffWeights = [0.55, 0.35, 0.08, 0.02];
      break;
    case "brutal":
      layoutWeights = [0.38, 0.12, 0.2, 0.3];
      diffWeights = [0.05, 0.2, 0.45, 0.3];
      break;
    case "mixed":
    default:
      layoutWeights = [0.25, 0.25, 0.25, 0.25];
      diffWeights = [0.25, 0.3, 0.3, 0.15];
      break;
  }

  const layout = pickWeighted(LAYOUTS, layoutWeights, rand);
  const difficulty = pickWeighted(DIFFICULTIES, diffWeights, rand);
  const summaryRu = `${LAYOUT_LABEL_RU[layout]} · ${DIFFICULTY_LABEL_RU[difficulty]}`;

  return { seed, layout, difficulty, summaryRu };
}

export function newDuelSeed(): string {
  const g = typeof globalThis !== "undefined" && globalThis.crypto?.randomUUID
    ? globalThis.crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  return `duel-${g}`;
}
