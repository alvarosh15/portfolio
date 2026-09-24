---
title: "A pixel park next to my intro"
description: "How the little people on my homepage work: sprites as strings, one animation loop, and scenes you trigger by clicking words."
date: 2026-09-23
---

My portfolio used to be a column of text and some project cards. It said the right things, but it felt like a CV. So I put a small park next to the intro: a few pixel people who read on a bench, drink coffee, play football and look at your cursor. Then I made some words in the paragraph clickable, and each one changes something in the park.

Everything is plain TypeScript and SVG: no canvas, no game engine, no images. Here is how it works.

## Sprites are strings

Every piece of pixel art is an array of strings. Each character is one pixel, a key in a small palette, and `.` means transparent:

```ts
export const palette = {
  "#": "#111111", // ink
  w: "#ffffff", // paper
  p: "#f6a5b5", // blush and petals
  m: "#a3a3a3", // scenery outline
  g: "#f0f0f0", // scenery fill
} as const;

heart: [
  ".p.p.",
  "ppppp",
  ".ppp.",
  "..p..",
],
```

It is the least clever format possible, and that is the point. I draw in the editor, diffs are readable, and when something looks off I can see which pixel it is. A character is built from parts (head, body, legs) plus props like a mug, a book or a ball, each placed at an offset.

## From strings to SVG

To draw a frame, the layers are painted into a small buffer, later ones on top. Then the buffer becomes one SVG path per color, merging horizontal runs of the same color so a row of ten black pixels is one rectangle instead of ten:

```ts
export function toPaths(buffer: string[][]) {
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
```

Each sprite is an `<svg>` whose `viewBox` is its size in art pixels, with `shape-rendering="crispEdges"`. Its CSS width is `calc(var(--px) * width)`, and `--px` is 3px on phones and 4px on desktop, so the whole park scales by changing one variable.

## One loop for everyone

A single `requestAnimationFrame` loop runs the park. Each character is a `draw(state)` function that returns its layers for the current time: legs swap every 150ms while walking, the book flips a page every few seconds, the ball goes up and down. The loop only repaints a sprite when its paths actually change, which with pixel art is most frames not at all.

A few small things make it feel alive without costing much:

- People blink at random intervals and wander between activities.
- One of them watches you: their pupils are single pixels that move one step towards the pointer.
- An `IntersectionObserver` stops the loop when the intro scrolls out of view.
- With `prefers-reduced-motion`, the clock freezes at zero and everyone stands still.

## Scenes

The words in the intro are buttons. Clicking one starts a scene: a Google G falls and bounces, a flaming pi crashes like a meteor, an exterminator sprays some malware, night falls and a rocket takes off, a robot beams in, and someone in the park gets taken apart and labeled, then put back together wrong.

A scene is just a function. It gets a stage (where things can go, a way to spawn sprites, how the crowd should react) and returns another function that runs every frame:

```ts
/** Called every frame with ms since the scene started. Returns true while the story is still playing. */
type Play = (t: number, dt: number) => boolean;
type Scene = (stage: Stage) => Play;
```

Most scenes are small state machines on top of that: wait, fall, bounce, settle. Sprites live on a layer that covers the whole intro, not just the park, so the pi can fly across the paragraph and the G can land under the links. The text itself never moves; when something lands hard, only the park shakes.

Scenes can run at the same time. The G stays where it fell while the robot wanders past it, and clicking a word again restarts its scene. Some scenes leave their pieces in the park and others clean up after themselves.

## Have you tried turning it off and on again?

Computer Science is the reset button. The park glitches (every element jumps a few pixels sideways and flickers), goes blank, and a prompt types a random command: `git reset --hard`, `sudo reboot` or `rm -rf /`. Then the park redraws from top to bottom in steps, like an old screen, and every other scene is gone.

The command is written in a tiny font that is, of course, more strings. Only the letters the scenes need exist:

```ts
const glyphs: Record<string, Grid> = {
  g: ["...", ".##", "#.#", ".##", "..#", "##."],
  i: [".#.", "...", ".#.", ".#.", ".#.", "..."],
  t: [".#.", "###", ".#.", ".#.", "..#", "..."],
  // ...
};
```

Keystrokes are spaced 45 to 110ms apart, with longer pauses on spaces, because perfectly even typing looks like a machine pretending to be a person. The same font labels the pieces in the reverse engineering scene and fills the robot's speech bubbles.

## Small things I learned

- **Pixel art forgives a lot.** A 3×6 font is readable, a crescent moon is nine rows of strings, and nobody minds.
- **Keep the text still.** Things can fly over the paragraph, but it never moves or shakes. The park can be silly because the words stay readable.

If you haven't yet, go back to the [homepage](/) and click the underlined words.
