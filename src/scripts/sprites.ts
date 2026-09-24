/**
 * Pixel art for the intro. Every grid row must have the same length.
 * Palette keys map to colors in `palette`; `.` is transparent.
 */
export type Grid = readonly string[];
export type Layer = readonly [grid: Grid, x: number, y: number];

export const palette = {
  "#": "#111111", // ink
  w: "#ffffff", // paper
  p: "#f6a5b5", // blush and petals
  m: "#a3a3a3", // scenery outline
  g: "#f0f0f0", // scenery fill
  l: "#ffd84d", // light: flames, moon, lit lamp
  b: "#4285f4", // Google blue
  r: "#ea4335", // Google red
  y: "#fbbc05", // Google yellow
  n: "#34a853", // Google green
  e: "#dccbb8", // tree trunk fill
  h: "#a8927b", // tree trunk outline
} as const;
export type Color = keyof typeof palette;

/** Character canvas. The 16px-wide body starts at OX. */
export const W = 24;
export const H = 30;
export const OX = 4;

/** Vertical offset of the head for each pose (head 13 + body 8 + legs 5 = 26px standing). */
export const poseY = { stand: 4, bench: 2, ground: 7 } as const;

export const parts = {
  head: [
    "......####......",
    "....########....",
    "...##########...",
    "..############..",
    "..##wwwwwwww##..",
    "..#####ww#####..",
    "..##ww####ww##..",
    "..##ww#ww#ww##..",
    "..#####ww#####..",
    "..#wwwwwwwwww#..",
    "...#www##www#...",
    "...#wwwwwwww#...",
    "....########....",
  ],
  body: [
    "......#ww#......",
    "....#wwwwww#....",
    "...#wwwwwwww#...",
    "..#w#wwwwww#w#..",
    "..#w#wwwwww#w#..",
    "..#w#wwwwww#w#..",
    "..###wwwwww###..",
    "....########....",
  ],
  legsStand: [
    "....###..###....",
    "....###..###....",
    "....###..###....",
    "....##....##....",
    "...###....###...",
  ],
  legsWalkA: [
    "....###..###....",
    "...###....###...",
    "..###......###..",
    "..##........##..",
    ".###........###.",
  ],
  legsWalkB: [
    "....########....",
    ".....######.....",
    ".....##..##.....",
    ".....##..##.....",
    "....###..###....",
  ],
  legsKick: [
    "....###..#####..",
    "....###....####.",
    "....###.........",
    "....##..........",
    "...###..........",
  ],
  legsGround: [
    "..############..",
    ".####......####.",
  ],
  book: [
    "########",
    "#pppppp#",
    "#p####p#",
    "#pppppp#",
    "#pppppp#",
    "########",
  ],
  bookFlip: [
    "wwwwwwww",
    "########",
    "#pppppp#",
    "#p####p#",
    "#pppppp#",
    "########",
  ],
  // Hardcover held up with both hands: spine on the left, page edges at the bottom.
  // `x` is the cover color, set with `tint`.
  heldBook: [
    ".######",
    "#x#xxx#",
    "#x#xxx#",
    "#x#xxx#",
    "#x#xxx#",
    "#x#xxx#",
    "#x#xxx#",
    "#wwwww#",
    "#######",
  ],
  // The same book mid page turn.
  heldBookTurn: [
    ".######",
    "#x#wxx#",
    "#x#wwx#",
    "#x#wwx#",
    "#x#wwx#",
    "#x#wxx#",
    "#x#xxx#",
    "#wwwww#",
    "#######",
  ],
  newspaper: [
    "############",
    "#gggggggggg#",
    "#g########g#",
    "#gggggggggg#",
    "#g###g###gg#",
    "#g###g###gg#",
    "#gggggggggg#",
    "############",
  ],
  controller: [
    ".########.",
    "#w#wwww#w#",
    "###wwwww##",
    ".##....##.",
  ],
  controllerPress: [
    ".########.",
    "#w#wwwwww#",
    "###wwww###",
    ".##....##.",
  ],
  ball: [
    ".##.",
    "#ww#",
    "#ww#",
    ".##.",
  ],
  mug: [
    "####.",
    "#ww##",
    "#ww.#",
    "#ww##",
    "####.",
  ],
  steamA: [
    ".#.",
    "#..",
    ".#.",
  ],
  steamB: [
    ".#.",
    "..#",
    ".#.",
  ],
  alert: [
    "##",
    "##",
    "##",
    "..",
    "##",
  ],
  question: [
    ".##.",
    "#..#",
    "..#.",
    ".#..",
    "....",
    ".#..",
  ],
  sprayCan: [
    ".##",
    "###",
    "#p#",
    "#w#",
    "#p#",
    "###",
  ],
  sprayA: [
    "..m.",
    ".m.m",
    "m.m.",
    ".m.m",
    "..m.",
  ],
  sprayB: [
    ".m.m",
    "m.m.",
    ".m.m",
    "m.m.",
    ".m..",
  ],
  heart: [
    ".p.p.",
    "ppppp",
    ".ppp.",
    "..p..",
  ],
  bench: [
    "mmmmmmmmmmmmmmmmmmmmmmmm",
    "mggggggggggggggggggggggm",
    "mmmmmmmmmmmmmmmmmmmmmmmm",
    ".m....................m.",
    ".m....................m.",
    ".m....................m.",
    "mmmmmmmmmmmmmmmmmmmmmmmm",
    "mggggggggggggggggggggggm",
    "mmmmmmmmmmmmmmmmmmmmmmmm",
    ".mm..................mm.",
    ".mm..................mm.",
    ".mm..................mm.",
    ".mm..................mm.",
  ],
} satisfies Record<string, Grid>;

/** Static park pieces, drawn behind the characters. */
export const scenery = {
  tree: [
    ".............mmmmmmmm.............",
    ".........mmmmggggggggmmmm.........",
    ".......mmggggggggggggggggmm.......",
    ".......mggggggggggggggggggm.......",
    "......mgggggggggmgmggggggggm......",
    "......mggggggggggmgggggggggm......",
    "......mggggmgmgggggggggggggm......",
    "......mgggggmggggggggggggggm......",
    "......mggggggggggggggggggggm......",
    "....mmggggggggggggggmgmgggggmm....",
    "...mgggggggggggggggggmggggggggm...",
    "..mggggggggggggggggggggggggggggm..",
    ".mgggggggmgmggggggggggggggggggggm.",
    ".mggggggggmgggggggggggggggggggggm.",
    ".mggggggggggggggggggggggggggggggm.",
    ".mggggggggggggggggggggggggggggggm.",
    ".mggggggggggggggggggggggggggggggm.",
    ".mggggmgmggggggggggggggggmgmggggm.",
    ".mgggggmggggggmgmgggggggggmgggggm.",
    ".mgggggggggggggmggggggggggggggggm.",
    "..mggggggggggggggggggggggggggggm..",
    "...mgggggggggggggggggmgmggggggm...",
    "....mmmmmmmmggggggggggmmmmmmmm....",
    "............hhheeeehhh............",
    "..............heeeeh..............",
    "..............heeeeh..............",
    "..............heeeeh..............",
    "..............heheeh..............",
    "..............heeeeh..............",
    "..............heeeeh..............",
    "..............heeeeh..............",
    "..............heeeeh..............",
    "..............heeeeh..............",
    "..............heeheh..............",
    "..............heeeeh..............",
    "..............heeeeh..............",
    "..............heeeeh..............",
    "..............heeeeh..............",
    ".............hheeeehh.............",
    "...........hhhhhhhhhhhh...........",
  ],
  lamp: [
    "..mmm..",
    ".mwwwm.",
    "mwwwwwm",
    "mwwwwwm",
    ".mmmmm.",
    "...m...",
    "...m...",
    "...m...",
    "...m...",
    "...m...",
    "...m...",
    "...m...",
    "...m...",
    "...m...",
    "...m...",
    "...m...",
    "...m...",
    "...m...",
    "...m...",
    "...m...",
    "...m...",
    "...m...",
    "...m...",
    "...m...",
    "...m...",
    "...m...",
    "...m...",
    "..mmm..",
    ".mmmmm.",
  ],
  // Drawn over the top of `lamp` when it is on.
  lampLight: [
    "..mmm..",
    ".mlllm.",
    "mlllllm",
    "mlllllm",
  ],
  bush: [
    "....mmmm..mmm...",
    "..mmggggmmgggm..",
    ".mggggggggggggm.",
    "mggggggmgggggggm",
    "mgggggggggggggmm",
    "mggggggggggggggm",
    ".mmmmmmmmmmmmmm.",
  ],
  flowers: [
    ".p.......p.",
    "pwp.....pwp",
    ".p...p...p.",
    ".m..pwp..m.",
    ".m...p...m.",
    ".m...m...m.",
  ],
  grass: [
    "m.m.m",
    ".mmm.",
  ],
} satisfies Record<string, Grid>;

/** Pieces for the scenes triggered from the intro text. */
export const effects = {
  googleG: [
    ".....rrrr.....",
    "...rrrrrrrr...",
    "..rrrrrrrrrr..",
    ".rrrr....rrr..",
    ".yyy..........",
    "yyy...........",
    "yyy....bbbbbbb",
    "yyy....bbbbbbb",
    "yyy.......bbbb",
    ".yyy......bbb.",
    ".nnnn....bbbb.",
    "..nnnnnnnnbb..",
    "...nnnnnnnn...",
    ".....nnnn.....",
  ],
  pi: [
    ".#########",
    "##########",
    "#..##..##.",
    "...##..##.",
    "...##..##.",
    "...##..##.",
    "..##...##.",
    ".##....###",
  ],
  flameA: [
    "p.......",
    ".pp.....",
    "..ppl...",
    "p..pll..",
    "..pplll.",
    "...pllll",
    "....plll",
  ],
  flameB: [
    ".p......",
    "p.p.....",
    "..ppp...",
    "..pplp..",
    ".p.plll.",
    "...pllll",
    "....plll",
  ],
  crater: [
    ".mm..........mm.",
    "mggm........mggm",
  ],
  bugA: [
    ".#...#.",
    "..#.#..",
    ".#####.",
    "##p#p##",
    ".#####.",
    "#.#.#.#",
  ],
  bugB: [
    "#.....#",
    "..#.#..",
    ".#####.",
    "##p#p##",
    ".#####.",
    ".#.#.#.",
  ],
  puffs: [
    [".mm.", "mggm", "mggm", ".mm."],
    [".m.", "mgm", ".m."],
    ["m"],
  ],
  starA: [
    ".#.",
    "###",
    ".#.",
  ],
  starB: [
    "...",
    ".#.",
    "...",
  ],
  moon: [
    "..mmmmm",
    ".mllllm",
    "mllllm.",
    "mlllm..",
    "mlllm..",
    "mlllm..",
    "mllllm.",
    ".mllllm",
    "..mmmmm",
  ],
  rocket: [
    ".....#.....",
    "....#p#....",
    "...#ppp#...",
    "..#ppppp#..",
    "..#wwwww#..",
    "..#w###w#..",
    "..#w#l#w#..",
    "..#w###w#..",
    "..#wwwww#..",
    "..#wwwww#..",
    "..#wwwww#..",
    "..#wwwww#..",
    ".##wwwww##.",
    "#p#wwwww#p#",
    "#p#wwwww#p#",
    "#p#######p#",
    "###.###.###",
  ],
  rocketFlameA: [
    "llpll",
    ".lpl.",
    ".lpl.",
    "..l..",
  ],
  rocketFlameB: [
    "lplpl",
    "lplpl",
    ".lpl.",
    ".p.p.",
  ],
  // Exterminator cap with a forward brim.
  cap: [
    "....######......",
    "...#bbbbbb#.....",
    "..#bbbbbbbb#....",
    "..#bbbbbbbb####.",
    "..##############",
  ],
  // Antenna tip left empty: the light blinks in its place.
  robot: [
    ".............",
    "......#......",
    "..#########..",
    "..#wwwwwww#..",
    "..#w##w##w#..",
    "..#w##w##w#..",
    "..#wwwwwww#..",
    "..#w#####w#..",
    "..#wwwwwww#..",
    "..#########..",
    ".....###.....",
    ".###########.",
    "#.#wwwwwww#.#",
    "#.#wwbwlww#.#",
    "#.#wwwwwww#.#",
    "#.#wwwwwww#.#",
    "..#########..",
  ],
  robotLegsA: [
    "...##...##...",
    "...##...##...",
    "..###...###..",
  ],
  robotLegsB: [
    "....##.##....",
    "....##.##....",
    "...###.###...",
  ],
  sun: [
    "....l....",
    ".l.....l.",
    "...lll...",
    "..lllll..",
    "l.lllll.l",
    "..lllll..",
    "...lll...",
    ".l.....l.",
    "....l....",
  ],
  cloud: [
    ".....mmmm.....",
    "...mmggggm....",
    "..mggggggmmm..",
    ".mggggggggggm.",
    "mggggggggggggm",
    ".mmmmmmmmmmmm.",
  ],
  raindrop: [
    "b",
    "b",
  ],
  snowflake: [
    ".m.",
    "mmm",
    ".m.",
  ],
  chevron: [
    "##..",
    ".##.",
    "..##",
    ".##.",
    "##..",
  ],
  cursor: [
    "###",
    "###",
    "###",
    "###",
    "###",
  ],
} satisfies Record<string, Grid | readonly Grid[]>;

/**
 * A tiny lowercase font for pixel text: 6 rows, with the x-height on rows 1-4.
 * Only has the characters the scenes need.
 */
const glyphs: Record<string, Grid> = {
  a: ["...", ".##", "#.#", "#.#", ".##", "..."],
  b: ["#..", "##.", "#.#", "#.#", "##.", "..."],
  c: ["...", ".##", "#..", "#..", ".##", "..."],
  d: ["..#", ".##", "#.#", "#.#", ".##", "..."],
  e: ["...", ".#.", "###", "#..", ".##", "..."],
  f: [".##", "#..", "##.", "#..", "#..", "..."],
  g: ["...", ".##", "#.#", ".##", "..#", "##."],
  h: ["#..", "#..", "##.", "#.#", "#.#", "..."],
  i: [".#.", "...", ".#.", ".#.", ".#.", "..."],
  l: ["#.", "#.", "#.", "#.", ".#", ".."],
  m: [".....", "####.", "#.#.#", "#.#.#", "#.#.#", "....."],
  n: ["...", "##.", "#.#", "#.#", "#.#", "..."],
  o: ["...", ".#.", "#.#", "#.#", ".#.", "..."],
  p: ["...", "##.", "#.#", "##.", "#..", "#.."],
  r: ["...", "#.#", "##.", "#..", "#..", "..."],
  s: ["...", ".##", "#..", "..#", "##.", "..."],
  t: [".#.", "###", ".#.", ".#.", "..#", "..."],
  u: ["...", "#.#", "#.#", "#.#", ".##", "..."],
  v: ["...", "#.#", "#.#", "#.#", ".#.", "..."],
  w: [".....", "#...#", "#...#", "#.#.#", ".#.#.", "....."],
  y: ["...", "#.#", "#.#", ".##", "..#", "##."],
  z: ["...", "###", "..#", ".#.", "###", "..."],
  "-": ["...", "...", "###", "...", "...", "..."],
  "/": ["..#", "..#", ".#.", ".#.", "#..", "#.."],
  " ": ["..", "..", "..", "..", "..", ".."],
};

/** Renders text in the tiny font, one column between letters. */
export function write(text: string): Grid {
  const rows = ["", "", "", "", "", ""];
  [...text].forEach((char, i) => {
    const glyph = glyphs[char] ?? glyphs[" "];
    rows.forEach((_, r) => (rows[r] += (i ? "." : "") + glyph[r]));
  });
  return rows;
}

export function gridSize(grid: Grid) {
  return { width: grid[0].length, height: grid.length };
}

/** Paints layers in order (later on top) into a width x height buffer. */
export function compose(
  layers: readonly Layer[],
  width = W,
  height = H,
  mirror = false,
): string[][] {
  const buffer = Array.from({ length: height }, () => Array<string>(width).fill("."));
  for (const [grid, x, y] of layers) {
    grid.forEach((row, r) => {
      for (let c = 0; c < row.length; c++) {
        const X = x + c;
        const Y = y + r;
        if (row[c] !== "." && X >= 0 && X < width && Y >= 0 && Y < height) {
          buffer[Y][X] = row[c];
        }
      }
    });
  }
  if (mirror) buffer.forEach((row) => row.reverse());
  return buffer;
}

/** One SVG path per color, merging horizontal runs of the same color. */
export function toPaths(buffer: string[][]): Partial<Record<Color, string>> {
  const paths: Partial<Record<Color, string>> = {};
  buffer.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const ch = row[x];
      let end = x + 1;
      while (end < row.length && row[end] === ch) end++;
      if (ch in palette) {
        const color = ch as Color;
        paths[color] = (paths[color] ?? "") + `M${x} ${y}h${end - x}v1h-${end - x}z`;
      }
      x = end;
    }
  });
  return paths;
}

/** Recolors a template grid: every `x` becomes `color`. */
export function tint(grid: Grid, color: Color): Grid {
  return grid.map((row) => row.replaceAll("x", color));
}

/** Composes layers into a single grid, for sprites built from several parts. */
export function flatten(layers: readonly Layer[], width: number, height: number): Grid {
  return compose(layers, width, height).map((row) => row.join(""));
}

/** An empty SVG with one path per palette color, sized in pixel units via `--px`. */
export function svgFor(width: number, height: number) {
  return `
    <svg viewBox="0 0 ${width} ${height}" style="width: calc(var(--px) * ${width})" class="block h-auto" shape-rendering="crispEdges" aria-hidden="true">
      ${Object.entries(palette)
        .map(([key, fill]) => `<path data-color="${key}" fill="${fill}"></path>`)
        .join("")}
    </svg>`;
}

export function paint(el: Element, paths: Partial<Record<Color, string>>) {
  el.querySelectorAll<SVGPathElement>("path[data-color]").forEach((path) => {
    path.setAttribute("d", paths[path.dataset.color as Color] ?? "");
  });
}
