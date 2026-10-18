import { compose, effects, gridSize, paint, svgFor, toPaths, type Grid } from "../sprites";

export type Zone = "left" | "right";
export type AreaName = Zone | "middle";
export type SceneName = "google" | "virustotal" | "math" | "cs" | "space" | "ai" | "reverse";

/** How the park people react to a scene. */
export interface Crowd {
  /** Show a "!" and hop. */
  alert: boolean;
  /** Stop wandering. */
  freeze: boolean;
}

/** A rectangle in art pixels, relative to the stage (the intro grid). */
export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Where a scene happens. Its bottom edge is the ground. */
export interface Area extends Box {
  name: AreaName;
}

export interface Stage {
  /** Reduced motion: scenes jump to their final state. */
  still: boolean;
  crowd: Crowd;
  zones: Record<Zone, HTMLElement>;
  /** CSS pixels per art pixel. */
  unit: () => number;
  /**
   * The people zones, or the strip under the links in the text column ("middle").
   * On mobile, where the zones sit side by side under the text, "middle" spans both.
   */
  area: (name: AreaName) => Area;
  /** Props and people in the park, as boxes on the stage. */
  taken: () => Box[];
  /** An element's box on the stage. */
  box: (el: Element) => Box;
  /** Park people standing up and shown at this breakpoint. */
  standing: () => HTMLElement[];
  /** Everything else in the park: props, people and other scenes' sprites. */
  cast: () => HTMLElement[];
  spawn: (art: Grid, layer?: string) => Sprite;
  shake: (name: AreaName) => void;
  lamp: (on: boolean) => void;
  /** Runs when the scene is stopped or restarted. */
  onStop: (cleanup: () => void) => void;
  /** Removes every other scene. */
  wipe: () => void;
}

/** Called every frame with ms since the scene started. Returns true while the story is still playing. */
export type Play = (t: number, dt: number) => boolean;
export type Scene = (stage: Stage) => Play;

export const GRAVITY = 420; // art px per second squared
export const FADE_MS = 300;
export const NIGHT_MS = 8000; // how long the space scene keeps it dark

export const rand = (min: number, max: number) => min + Math.random() * (max - min);
export const pick = <T>(items: readonly T[]) => items[Math.floor(Math.random() * items.length)];
export const every = (t: number, ms: number, frames: number) => Math.floor(t / ms) % frames;
export const ground = (area: Box) => area.y + area.height;
export const ZONES: readonly Zone[] = ["left", "right"];
export const AREAS: readonly AreaName[] = ["left", "right", "middle"];

/** A temporary pixel element on the stage. Position is the top-left corner in art pixels. */
export class Sprite {
  x = 0;
  y = 0;
  vx = 0;
  vy = 0;
  mirror = false;
  /** Squash on impact: 0 is none. */
  squash = 0;
  /** Removed from the page. */
  gone = false;
  private fading = false;
  readonly el = document.createElement("div");
  private drawn: { art: Grid; mirror: boolean } | null = null;

  constructor(
    parent: HTMLElement,
    public art: Grid,
    layer: string,
  ) {
    this.el.className = `pointer-events-none absolute top-0 left-0 origin-bottom ${layer}`;
    parent.appendChild(this.el);
  }

  get width() {
    return this.art[0].length;
  }

  get height() {
    return this.art.length;
  }

  render(unit: number) {
    const { art, mirror, drawn } = this;
    if (drawn?.art !== art || drawn.mirror !== mirror) {
      const { width, height } = gridSize(art);
      if (!drawn || gridSize(drawn.art).width !== width || drawn.art.length !== height) {
        this.el.innerHTML = svgFor(width, height);
      }
      paint(this.el, toPaths(compose([[art, 0, 0]], width, height, mirror)));
      this.drawn = { art, mirror };
    }
    const scale = this.squash ? ` scale(${1 + this.squash}, ${1 - this.squash})` : "";
    this.el.style.transform = `translate(${Math.round(this.x * unit)}px, ${Math.round(this.y * unit)}px)${scale}`;
  }

  appear() {
    this.el.animate({ opacity: [0, 1] }, { duration: FADE_MS, fill: "backwards" });
  }

  fade(ms = FADE_MS) {
    if (this.fading || this.gone) return;
    this.fading = true;
    this.el.style.transition = `opacity ${ms}ms`;
    this.el.style.opacity = "0";
    setTimeout(() => this.remove(), ms);
  }

  remove() {
    this.gone = true;
    this.el.remove();
  }
}

/** Short-lived puffs of smoke and dust that shrink as they age. */
export class Dust {
  private puffs: {
    s: Sprite;
    cx: number;
    cy: number;
    vx: number;
    vy: number;
    gravity: number;
    floor: number;
    age: number;
    life: number;
  }[] = [];

  constructor(private stage: Stage) {}

  emit(cx: number, cy: number, { vx = 0, vy = 0, gravity = 0, life = 500, floor = Infinity } = {}) {
    if (this.stage.still) return;
    const s = this.stage.spawn(effects.puffs[0], "z-0");
    this.puffs.push({ s, cx, cy, vx, vy, gravity, floor, age: 0, life });
  }

  update(dt: number) {
    this.puffs = this.puffs.filter((p) => {
      p.age += dt * 1000;
      if (p.age >= p.life || p.s.gone || p.cy > p.floor) {
        p.s.remove();
        return false;
      }
      p.vy += p.gravity * dt;
      p.cx += p.vx * dt;
      p.cy += p.vy * dt;
      p.s.art = effects.puffs[Math.floor((p.age / p.life) * effects.puffs.length)];
      p.s.x = p.cx - p.s.width / 2;
      p.s.y = p.cy - p.s.height / 2;
      return true;
    });
  }

  get active() {
    return this.puffs.length > 0;
  }
}

/** Turns the crowd's alert off after a while. */
export function alarm(stage: Stage) {
  let until = 0;
  return {
    ring(t: number, ms = 1500) {
      stage.crowd.alert = true;
      until = t + ms;
    },
    update(t: number) {
      if (until && t > until) {
        stage.crowd.alert = false;
        until = 0;
      }
      return until > 0;
    },
  };
}

