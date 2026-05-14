export type TileTheme = "classic" | "nature" | "moon" | "fire";

export const TILE_THEMES: Record<TileTheme, Record<string, string[]>> = {
  classic: {
    man: ["一", "二", "三", "四", "五", "六", "七", "八", "九"],
    bamboo: ["①", "②", "③", "④", "⑤", "⑥", "⑦", "⑧", "⑨"],
    circle: ["●", "◎", "⊙", "◉", "○", "⊕", "⊗", "⊘", "⊖"],
    wind: ["東", "南", "西", "北"],
    dragon: ["中", "發", "白"],
    flower: ["梅", "蘭", "菊", "竹", "春", "夏", "秋", "冬"],
  },
  nature: {
    man: ["🌱", "🌿", "🍀", "🌾", "🍂", "🍁", "🌸", "🌺", "🌻"],
    bamboo: ["🎋", "🎍", "🎑", "🌊", "🌈", "⛰", "🌙", "☀", "⭐"],
    circle: ["🍄", "🌰", "🥜", "🫐", "🍇", "🍓", "🍒", "🍑", "🍊"],
    wind: ["🌬", "🌪", "💨", "🌀"],
    dragon: ["🐲", "🐉", "✨"],
    flower: ["🌸", "🌺", "🌻", "🌹", "🌷", "💐", "🌼", "🍀"],
  },
  moon: {
    man: ["🌑", "🌒", "🌓", "🌔", "🌕", "🌖", "🌗", "🌘", "🌙"],
    bamboo: ["⭐", "🌟", "💫", "✨", "🌠", "🌌", "🌃", "🌆", "🌇"],
    circle: ["♈", "♉", "♊", "♋", "♌", "♍", "♎", "♏", "♐"],
    wind: ["🌬", "🌪", "💨", "🌀"],
    dragon: ["☽", "☾", "🔮"],
    flower: ["❄", "💎", "🔷", "🌊", "🌙", "⭐", "🌟", "✨"],
  },
  fire: {
    man: ["🔥", "💥", "⚡", "☄", "🌋", "💢", "❤", "🧨", "🎆"],
    bamboo: ["🏆", "🎯", "🎪", "🎨", "🎭", "🎬", "🎤", "🎸", "🥁"],
    circle: ["♠", "♥", "♦", "♣", "🃏", "🎲", "🎰", "🎳", "🎮"],
    wind: ["⚔", "🛡", "🗡", "⚡"],
    dragon: ["🔥", "💀", "🌊"],
    flower: ["💎", "👑", "⭐", "🏅", "🎖", "🥇", "🥈", "🥉"],
  },
};

const SUB_LABEL: Record<string, string> = {
  man: "Ман",
  bamboo: "Бамбук",
  circle: "Круги",
  wind: "Ветер",
  dragon: "Дракон",
  flower: "Цветок",
};

export interface TileDef {
  suit: string;
  idx: number;
  char: string;
  sub: string;
  matchKey: string;
}

export function getTileDeck(theme: TileTheme): TileDef[] {
  const t = TILE_THEMES[theme];
  const tiles: TileDef[] = [];
  (["man", "bamboo", "circle"] as const).forEach((suit) => {
    t[suit].forEach((ch, i) => {
      for (let c = 0; c < 4; c++) {
        tiles.push({ suit, idx: i, char: ch, sub: SUB_LABEL[suit], matchKey: `${suit}-${i}` });
      }
    });
  });
  t.wind.forEach((ch, i) => {
    for (let c = 0; c < 4; c++) tiles.push({ suit: "wind", idx: i, char: ch, sub: SUB_LABEL.wind, matchKey: `wind-${i}` });
  });
  t.dragon.forEach((ch, i) => {
    for (let c = 0; c < 4; c++) tiles.push({ suit: "dragon", idx: i, char: ch, sub: SUB_LABEL.dragon, matchKey: `dragon-${i}` });
  });
  // Flowers — any flower matches any flower, 8 unique tiles in pairs of 4 for matching simplicity
  t.flower.forEach((ch, i) => {
    tiles.push({ suit: "flower", idx: i, char: ch, sub: SUB_LABEL.flower, matchKey: "flower" });
  });
  return tiles;
}
