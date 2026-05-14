import { useEffect, useMemo, useRef, useState } from "react";
import { findAvailablePairs, findFreeTiles, isFree, tilesMatch, type Tile } from "@/lib/mahjong/engine";
import { getLayoutBounds } from "@/lib/mahjong/layouts";
import { cn } from "@/lib/utils";

interface Props {
  tiles: Tile[];
  hintIds: number[];
  selectedId: number | null;
  matchedIds: number[];
  onTileClick: (tile: Tile) => void;
}

const TILE_W = 52;
const TILE_H = 68;
const Z_OFFSET_X = 4;
const Z_OFFSET_Y = -5;

export default function MahjongBoard({ tiles, hintIds, selectedId, matchedIds, onTileClick }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const visible = useMemo(() => tiles.filter((t) => !t.removed), [tiles]);
  const bounds = useMemo(() => getLayoutBounds(tiles), [tiles]);

  // Compute board pixel size
  const colSpan = (bounds.maxC - bounds.minC) / 2 + 1;
  const rowSpan = (bounds.maxR - bounds.minR) / 2 + 1;
  const widthPx = colSpan * TILE_W + bounds.maxZ * Math.abs(Z_OFFSET_X);
  const heightPx = rowSpan * TILE_H + bounds.maxZ * Math.abs(Z_OFFSET_Y);

  useEffect(() => {
    const handler = () => {
      const w = wrapRef.current?.clientWidth ?? widthPx;
      const h = wrapRef.current?.clientHeight ?? heightPx;
      const s = Math.min(1, w / widthPx, h / heightPx);
      setScale(s > 0 ? s : 1);
    };
    handler();
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, [widthPx, heightPx]);

  return (
    <div ref={wrapRef} className="w-full flex-1 grid place-items-center overflow-hidden p-2">
      <div
        style={{
          width: widthPx,
          height: heightPx,
          transform: `scale(${scale})`,
          transformOrigin: "center center",
          position: "relative",
        }}
      >
        {visible
          .slice()
          .sort((a, b) => a.z - b.z || a.r - b.r || a.c - b.c)
          .map((t) => {
            const free = isFree(t, tiles);
            const x = ((t.c - bounds.minC) / 2) * TILE_W + t.z * Z_OFFSET_X;
            const y = ((t.r - bounds.minR) / 2) * TILE_H + t.z * Z_OFFSET_Y;
            const matched = matchedIds.includes(t.id);
            return (
              <div
                key={t.id}
                onClick={() => free && onTileClick(t)}
                className={cn(
                  "mj-tile",
                  free ? "free" : "blocked",
                  selectedId === t.id && "selected",
                  hintIds.includes(t.id) && "hint",
                  matched && "matched"
                )}
                data-suit={t.suit}
                style={{ width: TILE_W, height: TILE_H, left: x, top: y, zIndex: t.z * 100 + t.r }}
              >
                <div className="mj-tile-inner">
                  <span className="mj-tile-char">{t.char}</span>
                  <span className="mj-tile-sub">{t.sub}</span>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}

export function noPairsLeft(tiles: Tile[]) {
  return findAvailablePairs(tiles).length === 0;
}

export function getMatchHint(tiles: Tile[]): [Tile, Tile] | null {
  const free = findFreeTiles(tiles);
  for (let i = 0; i < free.length; i++)
    for (let j = i + 1; j < free.length; j++) {
      if (tilesMatch(free[i], free[j])) return [free[i], free[j]];
    }
  return null;
}
