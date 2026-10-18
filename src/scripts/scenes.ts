import { FADE_MS, Sprite, type Box, type Area, type AreaName, type Crowd, type Play, type Scene, type SceneName, type Stage, type Zone } from "./scenes/shared";
export type { Zone } from "./scenes/shared";
import { google } from "./scenes/google";
import { math } from "./scenes/math";
import { virustotal } from "./scenes/virustotal";
import { cs } from "./scenes/cs";
import { space } from "./scenes/space";
import { ai } from "./scenes/ai";
import { reverse } from "./scenes/reverse";

const scenes: Record<SceneName, Scene> = { google, math, virustotal, cs, space, ai, reverse };
/** Scenes that clear themselves once they finish. The rest stay in the park. */
const passing = new Set<SceneName>(["virustotal", "cs", "space", "reverse"]);

interface Setup {
  zones: Record<Zone, HTMLElement>;
  still: boolean;
  invalidate: () => void;
  cast: HTMLElement[];
  /** People who stand up (not sitting on the bench or the ground). */
  standing: HTMLElement[];
  unit: () => number;
  lamp: (on: boolean) => void;
}

interface Run {
  name: SceneName;
  play: Play;
  start: number;
  sprites: Sprite[];
  crowd: Crowd;
  cleanups: (() => void)[];
}

/**
 * Plays scenes triggered by clicking `[data-scene]` elements inside `root`.
 * Sprites live on `[data-people-layer]`, which covers the whole header grid so they can cross
 * the text, and which is replaced between pages.
 * Scenes run side by side; clicking one again restarts it.
 */
export function createDirector(root: HTMLElement, setup: Setup) {
  let stageEl!: HTMLElement;
  let text!: HTMLElement;
  // Lines under the text (links, latest posts): the middle area starts right of the longest one.
  let lines: Element[] = [];
  const desktop = window.matchMedia("(min-width: 1024px)");
  const runs = new Map<SceneName, Run>();
  let listeners = new AbortController();
  const crowd: Crowd = { alert: false, freeze: false };

  const boxOf = (el: Element): Box => {
    const unit = setup.unit();
    const origin = stageEl.getBoundingClientRect();
    const rect = el.getBoundingClientRect();
    return {
      x: (rect.left - origin.left) / unit,
      y: (rect.top - origin.top) / unit,
      width: rect.width / unit,
      height: rect.height / unit,
    };
  };

  const area = (name: AreaName): Area => {
    const left = boxOf(setup.zones.left);
    const right = boxOf(setup.zones.right);
    if (name === "left") return { name, ...left };
    if (name === "right") return { name, ...right };
    if (!desktop.matches) {
      return { name, x: left.x, y: left.y, width: right.x + right.width - left.x, height: left.height };
    }
    // Right of the lines under the text, down to the bottom of the text column.
    const column = boxOf(text);
    const clear = Math.max(
      column.x,
      ...lines.map((el) => {
        const line = boxOf(el);
        return line.x + line.width + 6;
      }),
    );
    const x = Math.min(clear, column.x + column.width - 20);
    return { name, x, y: column.y, width: column.x + column.width - x, height: column.height };
  };

  const stop = (run: Run, fade = FADE_MS) => {
    for (const sprite of run.sprites) {
      if (fade) sprite.fade(fade);
      else sprite.remove();
    }
    for (const cleanup of run.cleanups) cleanup();
    runs.delete(run.name);
  };

  const stageFor = (run: Run): Stage => ({
    still: setup.still,
    zones: setup.zones,
    unit: setup.unit,
    lamp: setup.lamp,
    crowd: run.crowd,
    area,
    taken: () => setup.cast.filter((el) => el.offsetWidth).map(boxOf),
    box: boxOf,
    standing: () => setup.standing.filter((el) => el.offsetWidth),
    cast: () => [
      ...setup.cast,
      ...[...runs.values()].filter((other) => other !== run).flatMap((other) => other.sprites.map((s) => s.el)),
    ],
    spawn: (art, layer = "z-1") => {
      const sprite = new Sprite(stageEl, art, layer);
      run.sprites.push(sprite);
      return sprite;
    },
    shake: (name) => {
      // The text never moves: only the zones shake.
      if (setup.still || name === "middle") return;
      setup.zones[name].animate(
        { translate: ["0 0", "-3px 2px", "3px -1px", "-2px 1px", "0 0"] },
        { duration: 250, easing: "steps(4)" },
      );
    },
    onStop: (cleanup) => run.cleanups.push(cleanup),
    wipe: () => {
      for (const other of runs.values()) if (other !== run) stop(other, 0);
    },
  });

  const start = (name: SceneName) => {
    const previous = runs.get(name);
    if (previous) stop(previous, 150);
    const run: Run = { name, play: () => false, start: -1, sprites: [], crowd: { alert: false, freeze: false }, cleanups: [] };
    runs.set(name, run);
    run.play = scenes[name](stageFor(run));
    setup.invalidate();
  };

  /** Points the director at a page's header and its scene words. */
  const attach = (next: HTMLElement) => {
    listeners.abort();
    listeners = new AbortController();
    stageEl = next.querySelector<HTMLElement>("[data-people-layer]")!;
    text = next.querySelector<HTMLElement>("[data-people-text]")!;
    lines = [...next.querySelectorAll("[data-people-links] > *")];
    for (const el of next.querySelectorAll<HTMLElement>("[data-scene]")) {
      el.addEventListener("click", () => {
        const name = el.dataset.scene as SceneName;
        if (Object.hasOwn(scenes, name)) start(name);
      }, { signal: listeners.signal });
    }
  };
  attach(root);

  const clear = () => {
    for (const run of runs.values()) stop(run, 0);
    crowd.alert = false;
    crowd.freeze = false;
  };
  // Reduced-motion scenes only need another update at their cleanup deadline.
  const stillDeadlines: Partial<Record<SceneName, number>> = { math: 1501, cs: 1500, space: 8000, reverse: 3000 };

  return {
    crowd,
    setStill(still: boolean) { clear(); setup.still = still; },
    destroy() { clear(); listeners.abort(); },
    attach,
    /** Ends every scene at once and puts the park back as it was. */
    clear,
    update(now: number, dt: number) {
      const unit = setup.unit();
      // Map iteration skips runs that another scene wipes mid-loop.
      for (const run of runs.values()) {
        if (run.start < 0) run.start = now;
        const playing = run.play(now - run.start, dt);
        if (!playing && passing.has(run.name)) {
          stop(run);
          continue;
        }
        run.sprites = run.sprites.filter((sprite) => !sprite.gone);
        for (const sprite of run.sprites) sprite.render(unit);
      }
      crowd.alert = [...runs.values()].some((run) => run.crowd.alert);
      crowd.freeze = [...runs.values()].some((run) => run.crowd.freeze);
      let wakeIn: number | null = null;
      if (setup.still) {
        for (const run of runs.values()) {
          const deadline = stillDeadlines[run.name];
          if (deadline === undefined) continue;
          const remaining = deadline - (now - run.start);
          if (remaining > 0) wakeIn = Math.min(wakeIn ?? Infinity, remaining);
        }
      }
      return wakeIn;
    },
  };
}
