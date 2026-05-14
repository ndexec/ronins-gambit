export interface Slot { r: number; c: number; z: number; }
export type LayoutName = "turtle" | "dragon" | "pyramid" | "cross";

function turtle(): Slot[] {
  const positions: Slot[] = [];
  const layer0: [number, number][] = [];
  for (let r = 0; r <= 10; r += 2) {
    for (let c = 0; c <= 14; c += 2) layer0.push([r, c]);
  }
  // wings
  layer0.push([4, -2], [6, -2], [4, 16], [6, 16]);
  layer0.push([5, 7]);
  layer0.forEach(([r, c]) => positions.push({ r, c, z: 0 }));

  const layer1: [number, number][] = [];
  for (let r = 1; r <= 9; r += 2)
    for (let c = 1; c <= 13; c += 2) layer1.push([r, c]);
  layer1.forEach(([r, c]) => positions.push({ r, c, z: 1 }));

  const layer2: [number, number][] = [];
  for (let r = 2; r <= 8; r += 2)
    for (let c = 2; c <= 12; c += 2) layer2.push([r, c]);
  layer2.forEach(([r, c]) => positions.push({ r, c, z: 2 }));

  const layer3: [number, number][] = [];
  for (let r = 3; r <= 7; r += 2)
    for (let c = 3; c <= 11; c += 2) layer3.push([r, c]);
  layer3.forEach(([r, c]) => positions.push({ r, c, z: 3 }));

  const layer4: [number, number][] = [];
  for (let r = 4; r <= 6; r += 2)
    for (let c = 4; c <= 10; c += 2) layer4.push([r, c]);
  layer4.forEach(([r, c]) => positions.push({ r, c, z: 4 }));

  positions.push({ r: 5, c: 6, z: 5 });
  positions.push({ r: 5, c: 8, z: 5 });
  return positions.slice(0, 144);
}

function pyramid(): Slot[] {
  const positions: Slot[] = [];
  for (let r = 0; r < 12; r += 2) for (let c = 0; c < 12; c += 2) positions.push({ r, c, z: 0 });
  for (let r = 1; r < 10; r += 2) for (let c = 1; c < 10; c += 2) positions.push({ r, c, z: 1 });
  for (let r = 2; r < 8; r += 2) for (let c = 2; c < 8; c += 2) positions.push({ r, c, z: 2 });
  for (let r = 3; r < 6; r += 2) for (let c = 3; c < 6; c += 2) positions.push({ r, c, z: 3 });
  positions.push({ r: 4, c: 4, z: 4 });
  // pad to even count
  while (positions.length % 2 !== 0) positions.pop();
  return positions;
}

function cross(): Slot[] {
  const positions: Slot[] = [];
  // horizontal arm
  for (let c = 0; c < 18; c += 2) for (let r = 4; r < 8; r += 2) positions.push({ r, c, z: 0 });
  // vertical arm
  for (let r = 0; r < 14; r += 2)
    for (let c = 6; c < 12; c += 2) {
      if (!(r >= 4 && r < 8)) positions.push({ r, c, z: 0 });
    }
  // layer 1 over center
  for (let r = 5; r < 8; r += 2) for (let c = 7; c < 12; c += 2) positions.push({ r, c, z: 1 });
  // layer 2
  for (let r = 4; r < 8; r += 2) for (let c = 6; c < 12; c += 2) positions.push({ r, c, z: 2 });
  while (positions.length % 2 !== 0) positions.pop();
  return positions;
}

function dragon(): Slot[] {
  const positions: Slot[] = [];
  // Body sweep
  for (let r = 2; r <= 10; r += 1) {
    if (r % 2 !== 0) continue;
    const offset = r < 6 ? 0 : 2;
    for (let c = 2 + offset; c <= 12 + offset; c += 2) positions.push({ r, c, z: 0 });
  }
  // Head
  for (let r = 0; r <= 2; r += 2) for (let c = 0; c <= 2; c += 2) positions.push({ r, c, z: 0 });
  // Tail
  for (let r = 10; r <= 12; r += 2) for (let c = 14; c <= 16; c += 2) positions.push({ r, c, z: 0 });
  // Layer 1
  for (let r = 4; r <= 8; r += 2) for (let c = 5; c <= 11; c += 2) positions.push({ r, c, z: 1 });
  // Layer 2
  for (let r = 5; r <= 7; r += 2) for (let c = 6; c <= 10; c += 2) positions.push({ r, c, z: 2 });
  while (positions.length % 2 !== 0) positions.pop();
  return positions;
}

export const LAYOUTS: Record<LayoutName, () => Slot[]> = {
  turtle,
  dragon,
  pyramid,
  cross,
};

export function getLayoutBounds(slots: Slot[]) {
  let minR = Infinity, maxR = -Infinity, minC = Infinity, maxC = -Infinity, maxZ = 0;
  for (const s of slots) {
    if (s.r < minR) minR = s.r;
    if (s.r > maxR) maxR = s.r;
    if (s.c < minC) minC = s.c;
    if (s.c > maxC) maxC = s.c;
    if (s.z > maxZ) maxZ = s.z;
  }
  return { minR, maxR, minC, maxC, maxZ };
}
