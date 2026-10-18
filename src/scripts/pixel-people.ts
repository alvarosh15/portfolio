import { createFrameCache } from "./frame-cache";
import { createDirector, type Zone } from "./scenes";
import {
  H,
  OX,
  W,
  compose,
  gridSize,
  paint,
  parts,
  poseY,
  scenery,
  svgFor,
  tint,
  toPaths,
  type Color,
  type Grid,
  type Layer,
} from "./sprites";

type Look = { dx: number; dy: number };
type Pose = keyof typeof poseY;

interface FrameState {
  /** Animation clock in ms. Frozen at 0 with reduced motion. */
  t: number;
  walking: boolean;
  blink: boolean;
  look: Look;
  /** Pointer is close to this character. */
  near: boolean;
}

interface Placement {
  zone: Zone;
  /** Horizontal position inside the zone, 0..1. */
  x: number;
  /** Where the element's feet touch, as a fraction of the zone height (desktop). */
  ground: number;
  /** Also shown on small screens, where everything stands at the bottom. */
  mobile?: boolean;
}

interface Character extends Placement {
  phrase: string;
  /** Walks between these x fractions between activities. */
  wander?: readonly [number, number];
  /** Eyes follow the pointer. */
  watcher?: boolean;
  /** Sitting pose. Scenes that take people apart skip anyone sitting. */
  pose?: "bench" | "ground";
  /** What they read on blog pages: a book of this color, peeking over it, or the newspaper. */
  reads: { book: Color; peek?: boolean } | "newspaper";
  draw: (state: FrameState) => Layer[];
}

interface Prop extends Placement {
  grid: Grid;
}

const WALK_SPEED = 26; // px per second
const every = (t: number, ms: number, frames: number) => Math.floor(t / ms) % frames;
const rand = (min: number, max: number) => min + Math.random() * (max - min);

function body(state: FrameState, look: Look, pose: Pose = "stand", legs?: Grid): Layer[] {
  const y = poseY[pose];
  const walkLegs = every(state.t, 150, 2) ? parts.legsWalkA : parts.legsWalkB;
  const standLegs = state.walking ? walkLegs : parts.legsStand;
  // One-pixel eyes inside 2x2 lenses. Neutral eyes look slightly inward.
  const eyeRow = y + (look.dy > 0 ? 7 : 6);
  const leftEye = OX + (look.dx < 0 ? 4 : 5);
  const rightEye = OX + (look.dx > 0 ? 11 : 10);
  const eyes: Layer[] = state.blink
    ? []
    : [
        [["#"], leftEye, eyeRow],
        [["#"], rightEye, eyeRow],
      ];
  return [
    [parts.head, OX, y],
    [parts.body, OX, y + 13],
    [pose === "ground" ? parts.legsGround : (legs ?? standLegs), OX, y + 21],
    ...eyes,
  ];
}

// Placeholder hobbies: swap phrases and props for the real ones.
const characters: Character[] = [
  {
    zone: "left",
    x: 0.8,
    ground: 0.3,
    mobile: true,
    watcher: true,
    phrase: "I'm keeping an eye on you",
    reads: { book: "b", peek: true },
    draw: (s) => [
      ...body(s, s.look),
      ...(s.near ? ([[parts.heart, OX + 14, 0]] as Layer[]) : []),
    ],
  },
  {
    zone: "left",
    x: 0.1,
    ground: 0.64,
    wander: [0, 0.6],
    phrase: "Coffee first",
    reads: "newspaper",
    draw: (s) => [
      ...body(s, { dx: s.walking ? 1 : 0, dy: 0 }),
      [parts.mug, OX + 13, poseY.stand + 16],
      [every(s.t, 400, 2) ? parts.steamA : parts.steamB, OX + 14, poseY.stand + 12],
    ],
  },
  {
    zone: "left",
    x: 0.45,
    ground: 1,
    phrase: "I love reading",
    pose: "bench",
    reads: { book: "p" },
    draw: (s) => [
      [parts.bench, 0, 17],
      ...body(s, { dx: 0, dy: 1 }, "bench"),
      [s.t % 2600 < 300 ? parts.bookFlip : parts.book, OX + 4, poseY.bench + 15],
    ],
  },
  {
    zone: "right",
    x: 0.75,
    ground: 0.45,
    phrase: "Always up for a game",
    pose: "ground",
    reads: { book: "n" },
    draw: (s) => [
      ...body(s, { dx: 0, dy: 1 }, "ground"),
      [every(s.t, 220, 3) === 0 ? parts.controllerPress : parts.controller, OX + 3, poseY.ground + 15],
    ],
  },
  {
    zone: "right",
    x: 0.3,
    ground: 1,
    mobile: true,
    wander: [0, 0.75],
    phrase: "Football on weekends",
    reads: { book: "r" },
    draw: (s) => {
      if (s.walking) {
        return [...body(s, { dx: 1, dy: 1 }), [parts.ball, 20 - every(s.t, 150, 2), 26]];
      }
      const phase = every(s.t, 230, 4);
      const look = { dx: 1, dy: phase === 2 ? -1 : 0 };
      return [
        ...body(s, look, "stand", phase === 0 ? parts.legsKick : parts.legsStand),
        [parts.ball, 20, [22, 12, 0, 12][phase]],
      ];
    },
  },
];

/** On blog pages everyone reads: same spots and poses, something to read instead of their hobby. */
function withBook(def: Character): Character {
  const pose = def.pose ?? "stand";
  const y = poseY[pose];
  const seat: Layer[] = pose === "bench" ? [[parts.bench, 0, 17]] : [];

  if (def.reads === "newspaper") {
    return {
      ...def,
      phrase: "Coffee and the news",
      draw: (s) => [
        ...body(s, { dx: 0, dy: 1 }, pose),
        [parts.newspaper, OX + 2, y + 13],
        [parts.mug, OX + 14, y + 16],
        [every(s.t, 400, 2) ? parts.steamA : parts.steamB, OX + 15, y + 12],
      ],
    };
  }

  // The watcher peeks over the book, so their eyes still follow the pointer.
  const { book, peek = false } = def.reads;
  return {
    ...def,
    watcher: peek,
    phrase: peek ? def.phrase : pose === "bench" ? "I love reading" : "Shh, reading",
    draw: (s) => [
      ...seat,
      ...body(s, peek ? s.look : { dx: 0, dy: 1 }, pose),
      [tint(s.t % 2600 < 300 ? parts.heldBookTurn : parts.heldBook, book), OX + 5, y + (peek ? 9 : 12)],
    ],
  };
}

const props: Prop[] = [
  { zone: "left", grid: scenery.flowers, x: 0.35, ground: 0.3 },
  { zone: "left", grid: scenery.grass, x: 0.05, ground: 0.3 },
  { zone: "left", grid: scenery.lamp, x: 0.92, ground: 0.64 },
  { zone: "left", grid: scenery.grass, x: 0.7, ground: 0.64 },
  { zone: "left", grid: scenery.grass, x: 0.02, ground: 1 },
  { zone: "left", grid: scenery.flowers, x: 1, ground: 1, mobile: true },
  { zone: "right", grid: scenery.tree, x: 0.1, ground: 0.45 },
  { zone: "right", grid: scenery.grass, x: 1, ground: 0.45 },
  { zone: "right", grid: scenery.bush, x: 1, ground: 1 },
  { zone: "right", grid: scenery.grass, x: 0, ground: 1, mobile: true },
];

interface Actor {
  /** The character as defined; `def` is what they are doing on this page. */
  base: Character;
  def: Character;
  el: HTMLButtonElement;
  zone: HTMLElement;
  phase: number;
  x: number | null;
  targetX: number;
  walking: boolean;
  facing: 1 | -1;
  idleUntil: number;
  nextBlink: number;
  blinkUntil: number;
  hopAt: number;
  frame: ReturnType<typeof createFrameCache>;
  lastPaths?: ReturnType<ReturnType<typeof createFrameCache>>;
}

const HOP_MS = 220;

/** What the park is up to: its usual hobbies, reading on blog pages, or lost on the 404. */
export type ParkMode = "home" | "reading" | "lost";

/** On the 404 everyone looks around, puzzled, with a question mark over their head. */
function lost(def: Character): Character {
  const pose = def.pose ?? "stand";
  const y = poseY[pose];
  return {
    ...def,
    phrase: def.watcher ? "Lost? Me too" : "Where did that page go?",
    draw: (s) => [
      ...(pose === "bench" ? ([[parts.bench, 0, 17]] as Layer[]) : []),
      ...body(s, def.watcher ? s.look : { dx: every(s.t + 400, 900, 2) ? 1 : -1, dy: 0 }, pose),
      [parts.question, OX + 16, Math.max(0, y - 4)],
    ],
  };
}

const castFor = (mode: ParkMode) => (def: Character) =>
  mode === "reading" ? withBook(def) : mode === "lost" ? lost(def) : def;

// One park for the whole visit: with client-side navigation its zones and scene layer persist
// between pages, and each page load re-attaches it to the new header.
let park: { attach: (root: HTMLElement, mode: ParkMode) => void; alive: () => boolean; destroy: () => void } | null = null;

export function mountPixelPeople(root: HTMLElement, mode: ParkMode = "home") {
  if (park?.alive()) park.attach(root, mode);
  else {
    park?.destroy();
    park = createPark(root, mode);
  }
}

function createPark(initialRoot: HTMLElement, initialMode: ParkMode) {
  let root = initialRoot;
  let mode = initialMode;
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let reducedMotion = motion.matches;
  const desktop = window.matchMedia("(min-width: 1024px)");
  const zones = {
    left: root.querySelector<HTMLElement>('[data-people-zone="left"]'),
    right: root.querySelector<HTMLElement>('[data-people-zone="right"]'),
  };
  if (!zones.left || !zones.right) return null;
  const pointer = { x: 0, y: 0, active: false };
  const trackPointer = (event: PointerEvent) => {
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    pointer.active = true;
    if (reducedMotion) invalidate();
  };
  window.addEventListener("pointermove", trackPointer, { passive: true });
  window.addEventListener("pointerdown", trackPointer, { passive: true });

  const visibility = (placement: Placement) => (placement.mobile ? "block" : "hidden lg:block");

  const geometry = new Map<HTMLElement, { width: number; height: number; zoneWidth: number; zoneHeight: number }>();
  const transforms = new WeakMap<HTMLElement, string>();
  const measure = (el: HTMLElement, zone: HTMLElement) => {
    geometry.set(el, { width: el.offsetWidth, height: el.offsetHeight, zoneWidth: zone.clientWidth, zoneHeight: zone.clientHeight });
  };
  const place = (el: HTMLElement, _zone: HTMLElement, placement: Placement, x: number | null, lift = 0) => {
    const { width, height, zoneWidth, zoneHeight } = geometry.get(el)!;
    const maxX = Math.max(0, zoneWidth - width);
    const ground = desktop.matches ? placement.ground : 1;
    const top = Math.min(Math.max(0, ground * zoneHeight - height), zoneHeight - height);
    const left = x ?? placement.x * maxX;
    const transform = `translate(${Math.round(left)}px, ${Math.round(top - lift)}px)`;
    if (transforms.get(el) !== transform) {
      el.style.transform = transform;
      transforms.set(el, transform);
    }
    return maxX;
  };

  const propEls = props.map((prop) => {
    const zone = zones[prop.zone]!;
    const el = document.createElement("div");
    const { width, height } = gridSize(prop.grid);
    el.className = `absolute top-0 left-0 ${visibility(prop)}`;
    el.innerHTML = svgFor(width, height);
    paint(el, toPaths(compose([[prop.grid, 0, 0]], width, height)));
    zone.appendChild(el);
    return { prop, el, zone };
  });
  const placeProps = () => propEls.forEach(({ prop, el, zone }) => place(el, zone, prop, null));

  const actors: Actor[] = characters.map((base) => {
    const def = castFor(mode)(base);
    const zone = zones[def.zone]!;
    const el = document.createElement("button");
    el.type = "button";
    el.setAttribute("aria-label", def.phrase);
    el.className = `group absolute top-0 left-0 z-10 ${visibility(def)}`;
    el.innerHTML = `${svgFor(W, H)}
      <span class="pointer-events-none absolute bottom-full mb-1 border-2 border-ink bg-paper px-2 py-1 text-xs font-medium whitespace-nowrap text-ink opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus:opacity-100 ${def.zone === "left" ? "left-0" : "right-0"}">${def.phrase}</span>`;
    zone.appendChild(el);
    const now = performance.now();
    return {
      base,
      def,
      el,
      zone,
      phase: Math.random() * 10_000,
      x: null,
      targetX: 0,
      walking: false,
      facing: 1,
      idleUntil: now + rand(1500, 5000),
      nextBlink: now + rand(1000, 5000),
      blinkUntil: 0,
      hopAt: -Infinity,
      frame: createFrameCache(W, H),
    };
  });

  const lookAt = (rect: DOMRect) => {
    const unit = rect.width / W;
    const eyesX = rect.left + unit * (OX + 8);
    const eyesY = rect.top + unit * (poseY.stand + 6);
    const dx = pointer.x - eyesX;
    const dy = pointer.y - eyesY;
    const deadZone = 16;
    return {
      look: pointer.active
        ? { dx: Math.abs(dx) < deadZone ? 0 : Math.sign(dx), dy: Math.abs(dy) < deadZone ? 0 : Math.sign(dy) }
        : { dx: 0, dy: 0 },
      near: pointer.active && Math.hypot(dx, dy) < 90,
    };
  };

  const update = (actor: Actor, now: number, dt: number, rect?: DOMRect) => {
    const size = geometry.get(actor.el)!;
    if (!size.width) return; // hidden on this breakpoint
    const { def } = actor;
    const maxX = Math.max(0, size.zoneWidth - size.width);
    actor.x = Math.min(actor.x ?? def.x * maxX, maxX);

    if (director.crowd.freeze || reducedMotion) actor.walking = false;
    if (def.wander && !reducedMotion && !director.crowd.freeze) {
      if (actor.walking) {
        actor.x += WALK_SPEED * dt * actor.facing;
        const arrived = actor.facing > 0 ? actor.x >= actor.targetX : actor.x <= actor.targetX;
        if (arrived) {
          actor.x = actor.targetX;
          actor.walking = false;
          actor.idleUntil = now + rand(3000, 7000);
        }
      } else if (now > actor.idleUntil) {
        const [from, to] = def.wander;
        actor.targetX = rand(from, to) * maxX;
        if (Math.abs(actor.targetX - actor.x) > 16) {
          actor.walking = true;
          actor.facing = actor.targetX > actor.x ? 1 : -1;
        } else {
          actor.idleUntil = now + 1000;
        }
      }
    }

    if (!reducedMotion && now > actor.nextBlink) {
      actor.blinkUntil = now + 150;
      actor.nextBlink = now + rand(2500, 6000);
    }

    const { look, near } = rect ? lookAt(rect) : { look: { dx: 0, dy: 0 }, near: false };
    const layers = def.draw({
      t: reducedMotion ? 0 : now + actor.phase,
      walking: actor.walking,
      blink: !reducedMotion && now < actor.blinkUntil,
      look,
      near,
    });
    if (director.crowd.alert) layers.push([parts.alert, OX + 16, 0]);
    const paths = actor.frame(layers, actor.facing < 0);
    if (paths !== actor.lastPaths) {
      paint(actor.el, paths);
      actor.lastPaths = paths;
    }
    const hop = (now - actor.hopAt) / HOP_MS;
    const lift = !reducedMotion && hop > 0 && hop < 1 ? Math.sin(Math.PI * hop) * 3 * unit : 0;
    place(actor.el, actor.zone, def, actor.x, lift);
  };

  let visible = false;
  let raf = 0;
  let timer = 0;
  let last = 0;
  let alerted = false;
  let disposed = false;
  const stop = () => {
    cancelAnimationFrame(raf);
    clearTimeout(timer);
    raf = 0;
    timer = 0;
    last = 0;
  };
  const invalidate = () => {
    if (!disposed && visible && !document.hidden && !raf) raf = requestAnimationFrame(loop);
  };
  const loop = (now: number) => {
    raf = 0;
    if (disposed || !visible || document.hidden) return;
    const dt = last ? Math.min(0.1, (now - last) / 1000) : 0;
    last = now;
    // Read watcher positions before the director or any actor writes to the DOM.
    const rects = actors.map((actor) => actor.def.watcher && geometry.get(actor.el)?.width
      ? actor.el.getBoundingClientRect() : undefined);
    const wakeIn = director.update(now, dt);
    if (director.crowd.alert && !alerted && !reducedMotion) {
      for (const actor of actors) actor.hopAt = now + rand(0, 250);
    }
    alerted = director.crowd.alert;
    actors.forEach((actor, i) => update(actor, now, dt, rects[i]));
    clearTimeout(timer);
    timer = 0;
    if (!reducedMotion) invalidate();
    else if (wakeIn !== null) timer = window.setTimeout(invalidate, wakeIn);
  };

  const readUnit = () => parseFloat(getComputedStyle(root).getPropertyValue("--px")) || 3;
  let unit = readUnit();
  const layout = () => {
    unit = readUnit();
    // Batch layout reads, including hidden elements when the breakpoint changes.
    for (const { el, zone } of [...propEls, ...actors]) measure(el, zone);
    placeProps();
    invalidate();
  };

  const director = createDirector(root, {
    zones: { left: zones.left, right: zones.right },
    still: reducedMotion,
    invalidate,
    cast: [...propEls.map(({ el }) => el), ...actors.map(({ el }) => el)],
    standing: actors.filter(({ def }) => !def.pose).map(({ el }) => el),
    unit: () => unit,
    lamp: (on) => {
      const { width, height } = gridSize(scenery.lamp);
      const layers: Layer[] = on ? [[scenery.lamp, 0, 0], [scenery.lampLight, 0, 0]] : [[scenery.lamp, 0, 0]];
      for (const { prop, el } of propEls) {
        if (prop.grid === scenery.lamp) paint(el, toPaths(compose(layers, width, height)));
      }
    },
  });

  layout();
  const resizes = new ResizeObserver(layout);
  resizes.observe(root);
  desktop.addEventListener("change", layout);

  const observer = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) invalidate();
    else stop();
  });
  observer.observe(root);
  const visibilityChanged = () => {
    if (document.hidden) stop();
    else invalidate();
  };
  const motionChanged = () => {
    reducedMotion = motion.matches;
    stop();
    director.setStill(reducedMotion);
    invalidate();
  };
  const scrolled = () => { if (reducedMotion) invalidate(); };
  document.addEventListener("visibilitychange", visibilityChanged);
  window.addEventListener("scroll", scrolled, { passive: true });
  motion.addEventListener("change", motionChanged);

  return {
    alive: () => zones.left!.isConnected,
    destroy() {
      disposed = true;
      stop();
      director.destroy();
      observer.disconnect();
      resizes.disconnect();
      desktop.removeEventListener("change", layout);
      motion.removeEventListener("change", motionChanged);
      document.removeEventListener("visibilitychange", visibilityChanged);
      window.removeEventListener("scroll", scrolled);
      window.removeEventListener("pointermove", trackPointer);
      window.removeEventListener("pointerdown", trackPointer);
    },
    /** Moves the park onto a new page's header, switching everyone's activity if needed. */
    attach(next: HTMLElement, nextMode: ParkMode) {
      stop();
      visible = false;
      root = next;
      if (nextMode !== mode) {
        mode = nextMode;
        for (const actor of actors) {
          actor.def = castFor(mode)(actor.base);
          actor.el.setAttribute("aria-label", actor.def.phrase);
          actor.el.querySelector("span")!.textContent = actor.def.phrase;
          actor.lastPaths = undefined;
        }
      }
      // Scenes don't carry over: a new page starts with just the people.
      director.clear();
      director.attach(root);
      resizes.disconnect();
      resizes.observe(root);
      observer.disconnect();
      observer.observe(root);
      layout();
    },
  };
}
