import { compose, palette, toPaths, type Color, type Grid } from "./sprites";

// A small version of the park's tree, with its brown trunk.
const tree: Grid = [
  ".....mmmmmm.....",
  "...mmggggggmm...",
  "..mggggggggggm..",
  ".mggggggggmgggm.",
  ".mggmgggggggggm.",
  ".mggggggggggggm.",
  ".mgggggggmggggm.",
  "..mggggggggggm..",
  "...mmmggggmmm...",
  "......heeh......",
  "......heeh......",
  "......heeh......",
  "......heeh......",
  ".....hheehh.....",
  "....hhhhhhhh....",
];

/** The tree on a white rounded square, pixel for pixel at 16x16. */
export function faviconSvg() {
  const paths = toPaths(compose([[tree, 0, 0]], 16, tree.length));
  const shapes = Object.entries(paths)
    .map(([color, d]) => `<path fill="${palette[color as Color]}" d="${d}"/>`)
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges"><rect width="16" height="16" rx="3" fill="#fff"/>${shapes}</svg>`;
}
