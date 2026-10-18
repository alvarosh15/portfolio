import { compose, toPaths, type Grid, type Layer } from "./sprites";

// Grids are immutable. Cache their small source strings, not a serialized SVG on every frame.
const gridKeys = new WeakMap<Grid, string>();
function gridKey(grid: Grid) {
  let key = gridKeys.get(grid);
  if (key === undefined) {
    key = grid.join("\n");
    gridKeys.set(grid, key);
  }
  return key;
}

/** Reuse composed frames while bounding memory for sprites with moving parts. */
export function createFrameCache(width: number, height: number, limit = 128) {
  const frames = new Map<string, ReturnType<typeof toPaths>>();
  return (layers: readonly Layer[], mirror = false) => {
    const key = `${mirror}|${layers.map(([grid, x, y]) => `${x},${y}:${gridKey(grid)}`).join("|")}`;
    const cached = frames.get(key);
    if (cached) return cached;
    const paths = toPaths(compose(layers, width, height, mirror));
    if (frames.size >= limit) frames.delete(frames.keys().next().value!);
    frames.set(key, paths);
    return paths;
  };
}
