import {
  H,
  OX,
  W,
  compose,
  effects,
  flatten,
  gridSize,
  paint,
  parts,
  poseY,
  svgFor,
  toPaths,
  write,
  type Grid,
  type Layer,
} from "./sprites";

export type Zone = "left" | "right";
type AreaName = Zone | "middle";
export type SceneName = "google" | "virustotal" | "math" | "cs" | "space" | "ai" | "reverse";

/** How the park people react to a scene. */
export interface Crowd {
  /** Show a "!" and hop. */
  alert: boolean;
  /** Stop wandering. */
  freeze: boolean;
}

/** A rectangle in art pixels, relative to the stage (the intro grid). */
interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Where a scene happens. Its bottom edge is the ground. */
interface Area extends Box {
  name: AreaName;
}

interface Stage {
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
type Play = (t: number, dt: number) => boolean;
type Scene = (stage: Stage) => Play;

const GRAVITY = 420; // art px per second squared
const FADE_MS = 300;
const NIGHT_MS = 8000; // how long the space scene keeps it dark

const rand = (min: number, max: number) => min + Math.random() * (max - min);
const pick = <T>(items: readonly T[]) => items[Math.floor(Math.random() * items.length)];
const every = (t: number, ms: number, frames: number) => Math.floor(t / ms) % frames;
const ground = (area: Box) => area.y + area.height;
const ZONES: readonly Zone[] = ["left", "right"];
const AREAS: readonly AreaName[] = ["left", "right", "middle"];

/** A temporary pixel element on the stage. Position is the top-left corner in art pixels. */
class Sprite {
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
class Dust {
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
function alarm(stage: Stage) {
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

// Google: a big G falls from the sky and bounces. In the middle it falls past the text.
const google: Scene = (stage) => {
  const area = stage.area(pick(AREAS));
  const g = stage.spawn(effects.googleG, "z-1");
  const floor = ground(area) - g.height;
  const alert = alarm(stage);
  let landed = stage.still;
  let squashUntil = 0;
  g.x = area.x + rand(0, Math.max(0, area.width - g.width));
  g.y = landed ? floor : Math.min(area.y, 0) - g.height - 40;

  return (t, dt) => {
    if (!landed) {
      g.vy += GRAVITY * dt;
      g.y += g.vy * dt;
      if (g.y >= floor) {
        g.y = floor;
        if (g.vy > 30) {
          if (!alert.update(t)) {
            stage.shake(area.name);
            alert.ring(t);
          }
          g.vy *= -0.45;
          squashUntil = t + 90;
        } else {
          g.vy = 0;
          landed = true;
        }
      }
    }
    g.squash = t < squashUntil ? 0.2 : 0;
    return alert.update(t) || !landed;
  };
};

// Mathematics: a flaming pi crashes like a meteor, half the time across the whole intro.
const math: Scene = (stage) => {
  const cross = Math.random() < 0.5;
  const target = stage.area(cross ? pick(ZONES) : pick(AREAS));
  // Flies in towards the target's outer side; when crossing it starts beyond the other zone.
  const dir = target.name === "right" ? 1 : target.name === "left" ? -1 : pick([-1, 1]);
  const meteorFrames = [effects.flameA, effects.flameB].map((flame) =>
    flatten(
      [
        [flame, 0, 0],
        [effects.pi, 6, 5],
      ],
      16,
      13,
    ),
  );
  const dust = new Dust(stage);
  const alert = alarm(stage);
  const piWidth = gridSize(effects.pi).width;
  const landX = target.x + rand(0.25, 0.75) * Math.max(0, target.width - piWidth);
  const landY = ground(target) - effects.pi.length;
  const piX = dir > 0 ? 6 : 0; // where the pi sits inside the meteor sprite, mirrored when flying left
  const endX = landX - piX;
  const endY = landY - 5;
  const rock = stage.spawn(meteorFrames[0], "z-20");
  rock.mirror = dir < 0;
  if (cross) {
    const origin = stage.area(dir > 0 ? "left" : "right");
    rock.x = dir > 0 ? origin.x - rock.width : origin.x + origin.width;
    rock.y = -40;
  } else {
    rock.x = endX - dir * 60;
    rock.y = endY - 90;
  }
  const flight = cross ? 1.3 : 0.75;
  rock.vx = (endX - rock.x) / flight;
  rock.vy = (endY - rock.y) / flight;
  let impact = -1;
  let lastPuff = 0;

  const land = (t: number) => {
    impact = t;
    rock.art = effects.pi;
    rock.mirror = false;
    rock.x = landX;
    rock.y = landY;
    const crater = stage.spawn(effects.crater, "z-0");
    crater.x = landX - 3;
    crater.y = ground(target) - crater.height;
    stage.shake(target.name);
    alert.ring(t);
    for (let i = 0; i < 8; i++) {
      dust.emit(landX + rand(0, piWidth), ground(target) - 2, {
        vx: rand(-40, 40),
        vy: rand(-90, -40),
        gravity: GRAVITY / 2,
        life: 700,
        floor: ground(target),
      });
    }
  };

  if (stage.still) land(0);

  return (t, dt) => {
    dust.update(dt);
    if (impact < 0) {
      rock.art = meteorFrames[every(t, 90, 2)];
      rock.x += rock.vx * dt;
      rock.y += rock.vy * dt;
      if (t - lastPuff > 35) {
        lastPuff = t;
        dust.emit(rock.x + (dir > 0 ? 2 : rock.width - 2), rock.y + 2, { vy: -6 });
      }
      if (rock.y >= endY) land(t);
    }
    return alert.update(t) || impact < 0 || dust.active;
  };
};

// VirusTotal: malware bugs show up and an exterminator in a blue cap sprays them away.
const exterminator = (() => {
  const y = poseY.stand;
  const frame = (legs: Grid, spray?: Grid) =>
    flatten(
      [
        [parts.head, OX, y],
        [parts.body, OX, y + 13],
        [legs, OX, y + 21],
        [["#"], OX + 5, y + 6],
        [["#"], OX + 11, y + 6],
        [effects.cap, OX, y - 1],
        [parts.sprayCan, OX + 13, y + 14],
        ...(spray ? ([[spray, OX + 16, y + 11]] as Layer[]) : []),
      ],
      W,
      H,
    );
  return {
    stand: frame(parts.legsStand),
    walk: [frame(parts.legsWalkA), frame(parts.legsWalkB)],
    spray: [frame(parts.legsStand, parts.sprayA), frame(parts.legsStand, parts.sprayB)],
  };
})();

const virustotal: Scene = (stage) => {
  const area = stage.area(pick(AREAS));
  const floor = ground(area);
  const dust = new Dust(stage);
  const alert = alarm(stage);
  const speed = 34;
  const reach = 10; // from the exterminator's center to the spray
  // Enters from the outer side of a zone, or either side in the middle.
  const side = area.name === "left" ? 1 : area.name === "right" ? -1 : pick([-1, 1]);

  if (stage.still) {
    const ex = stage.spawn(exterminator.spray[0], "z-10");
    ex.x = area.x + (area.width - W) / 2;
    ex.y = floor - H;
    ex.mirror = side < 0;
    return () => false;
  }

  const bugWidth = gridSize(effects.bugA).width;
  const [lo, hi] = [area.x, area.x + area.width - bugWidth];
  const bugs = Array.from({ length: area.width > 80 ? 4 : 3 }, () => {
    const s = stage.spawn(effects.bugA, "z-10");
    s.x = rand(lo, hi);
    s.y = floor - s.height;
    s.vx = pick([-1, 1]) * rand(8, 16);
    s.appear();
    return { s, phase: rand(0, 1000), scared: false };
  });
  let ex: Sprite | null = null;
  let state: "wait" | "hunt" | "spray" | "leave" | "done" = "wait";
  let target: (typeof bugs)[number] | null = null;
  let sprayStart = 0;
  let facing = side;
  stage.crowd.freeze = true;
  alert.ring(0);

  const center = (s: Sprite) => s.x + s.width / 2;

  return (t, dt) => {
    dust.update(dt);
    const alerting = alert.update(t);

    for (const bug of bugs) {
      if (bug.scared) {
        bug.s.x += Math.sin(t / 20) * 0.3; // shiver
        continue;
      }
      bug.s.art = every(t + bug.phase, 160, 2) ? effects.bugA : effects.bugB;
      if (Math.random() < dt * 0.4) bug.s.vx *= -1;
      bug.s.x += bug.s.vx * dt;
      if (bug.s.x < lo || bug.s.x > hi) {
        bug.s.x = Math.min(Math.max(bug.s.x, lo), hi);
        bug.s.vx *= -1;
      }
    }

    if (state === "wait" && t > 1200) {
      ex = stage.spawn(exterminator.stand, "z-10");
      ex.x = side > 0 ? area.x : area.x + area.width - W;
      ex.y = floor - H;
      ex.appear();
      state = "hunt";
    }
    if (!ex) return true;

    if (state === "hunt") {
      target = bugs.reduce<(typeof bugs)[number] | null>(
        (best, bug) =>
          !best || Math.abs(center(bug.s) - center(ex!)) < Math.abs(center(best.s) - center(ex!)) ? bug : best,
        null,
      );
      if (!target) {
        stage.crowd.freeze = false;
        state = "leave";
        facing = -side;
        ex.fade(900);
      } else {
        facing = center(target.s) >= center(ex) ? 1 : -1;
        const aim = center(target.s) - W / 2 - reach * facing;
        const gap = aim - ex.x;
        if (Math.abs(gap) < 20) target.scared = true;
        if (Math.abs(gap) < 1) {
          state = "spray";
          sprayStart = t;
        } else {
          ex.x += Math.sign(gap) * Math.min(Math.abs(gap), speed * dt);
          ex.art = exterminator.walk[every(t, 150, 2)];
        }
      }
    } else if (state === "spray" && target) {
      ex.art = exterminator.spray[every(t, 120, 2)];
      if (t - sprayStart > 600) {
        for (let i = 0; i < 5; i++) {
          dust.emit(center(target.s), target.s.y + 3, { vx: rand(-20, 20), vy: rand(-30, -10), life: 450 });
        }
        target.s.remove();
        bugs.splice(bugs.indexOf(target), 1);
        target = null;
        state = "hunt";
      }
    } else if (state === "leave") {
      ex.x += facing * speed * dt;
      ex.art = exterminator.walk[every(t, 150, 2)];
      if (ex.gone) state = "done";
    }
    ex.mirror = facing < 0;

    return state !== "done" || dust.active || alerting;
  };
};

// Computer Science: the park glitches and goes blank, a command is typed, then it redraws.
// Clears every other scene.
const COMMANDS = ["git reset --hard", "sudo reboot", "rm -rf /"];
let lastCommand = "";

const cs: Scene = (stage) => {
  const command = pick(COMMANDS.filter((c) => c !== lastCommand));
  lastCommand = command;
  const textX = gridSize(effects.chevron).width + 2;
  const width = textX + gridSize(write(command)).width + 1 + gridSize(effects.cursor).width;
  // Cached so the sprite only repaints when the line changes.
  const lines = new Map<string, Grid>();
  const line = (typed: string, cursor: boolean) => {
    const key = `${typed}|${cursor}`;
    if (!lines.has(key)) {
      const text = write(typed);
      const layers: Layer[] = [
        [effects.chevron, 0, 1],
        [text, textX, 1], // letters sit on the chevron's bottom row
      ];
      if (cursor) layers.push([effects.cursor, textX + (typed ? gridSize(text).width + 1 : 0), 1]);
      lines.set(key, flatten(layers, width, 7));
    }
    return lines.get(key)!;
  };

  const glitchEnd = stage.still ? 0 : 700;
  // Keystroke times: a moment on the blank screen, then a slightly uneven typing rhythm.
  const keys: number[] = [];
  let clock = glitchEnd + (stage.still ? 0 : 500);
  for (const char of command) {
    clock += stage.still ? 0 : char === " " ? rand(120, 180) : rand(45, 110);
    keys.push(clock);
  }
  const offEnd = clock + (stage.still ? 1500 : 600); // Enter
  const revealEnd = offEnd + 900;

  const zones = ZONES.map((name) => stage.zones[name]);
  let nextGlitch = 0;
  let prompt: Sprite | null = null;
  stage.crowd.freeze = true;
  stage.onStop(() => {
    for (const el of stage.cast()) {
      el.style.translate = "";
      el.style.opacity = "";
    }
    for (const el of zones) el.style.clipPath = "";
  });

  return (t) => {
    if (t < glitchEnd) {
      if (t >= nextGlitch) {
        nextGlitch = t + 70;
        const unit = stage.unit();
        for (const el of stage.cast()) {
          el.style.translate = `${Math.round(rand(-3, 3)) * unit}px 0`;
          el.style.opacity = Math.random() < 0.2 ? "0" : "";
        }
      }
      return true;
    }

    if (t < offEnd) {
      if (!prompt) {
        stage.wipe();
        for (const el of stage.cast()) {
          el.style.translate = "";
          el.style.opacity = "0";
        }
        // In the left zone if the line fits, otherwise under the text.
        const zone = stage.area("left");
        const area = zone.width >= width + 4 ? zone : stage.area("middle");
        prompt = stage.spawn(line("", true), "z-10");
        prompt.x = Math.round(area.x + (area.width - width) / 2);
        prompt.y = Math.round(
          area.name === "middle" ? ground(area) - prompt.height - 2 : area.y + (area.height - prompt.height) / 2,
        );
      }
      const typed = command.slice(0, keys.filter((key) => t >= key).length);
      const typing = t >= keys[0] - 150 && t < keys[keys.length - 1] + 150;
      prompt.art = line(typed, typing || stage.still || every(t, 260, 2) === 0);
      return true;
    }

    if (prompt) {
      prompt.remove();
      prompt = null;
      for (const el of stage.cast()) el.style.opacity = "";
    }

    if (t < revealEnd && !stage.still) {
      // Redraw top to bottom in steps, like an old screen booting.
      const hidden = 100 - Math.floor(((t - offEnd) / (revealEnd - offEnd)) * 10) * 10;
      for (const el of zones) el.style.clipPath = `inset(0 0 ${hidden}% 0)`;
      return true;
    }

    for (const el of zones) el.style.clipPath = "";
    stage.crowd.freeze = false;
    return false;
  };
};

// Indra Espacio: night falls for a while, the lamp turns on and a rocket takes off.
const space: Scene = (stage) => {
  const dust = new Dust(stage);
  const alert = alarm(stage);
  const taken = stage.taken();
  const stars = ZONES.flatMap((zone) => {
    const area = stage.area(zone);
    const count = Math.min(12, Math.max(3, Math.round((area.width * area.height) / 400)));
    return Array.from({ length: count }, (_, i) => {
      const s = stage.spawn(effects.starA, "z-0");
      // Keep stars off the park; give up after a few tries on crowded zones.
      for (let attempt = 0; attempt < 12; attempt++) {
        s.x = area.x + rand(0, area.width - s.width);
        s.y = area.y + rand(0, Math.max(0, area.height * 0.6 - s.height));
        const free = taken.every(
          (r) => s.x + s.width < r.x - 1 || s.x > r.x + r.width + 1 || s.y + s.height < r.y - 1 || s.y > r.y + r.height + 1,
        );
        if (free) break;
      }
      if (!stage.still) s.el.animate({ opacity: [0, 1] }, { duration: FADE_MS, delay: i * 90, fill: "backwards" });
      return { s, phase: rand(0, 5000) };
    });
  });

  const sky = stage.area("right");
  const moon = stage.spawn(effects.moon, "z-0");
  moon.x = sky.x + sky.width - moon.width - 2;
  moon.y = sky.y + 2;
  moon.appear();
  stage.lamp(true);
  stage.onStop(() => stage.lamp(false));

  const pad = stage.area(pick(AREAS));
  const floor = ground(pad);
  const rocketWidth = gridSize(effects.rocket).width;
  const launchFrames = [effects.rocketFlameA, effects.rocketFlameB].map((flame) =>
    flatten(
      [
        [effects.rocket, 0, 0],
        [flame, 3, effects.rocket.length],
      ],
      rocketWidth,
      effects.rocket.length + 4,
    ),
  );
  const rocket = stage.spawn(effects.rocket, "z-20");
  const baseX = pad.x + rand(0.2, 0.8) * (pad.width - rocketWidth);
  rocket.x = baseX;
  rocket.y = floor - effects.rocket.length;
  rocket.appear();
  const launch = 1300;
  let launched = false;
  let lastPuff = 0;

  return (t, dt) => {
    dust.update(dt);
    const alerting = alert.update(t);
    for (const star of stars) {
      star.s.art = !stage.still && (t + star.phase) % 2400 < 250 ? effects.starB : effects.starA;
    }
    if (stage.still || rocket.gone) return t < NIGHT_MS || alerting || dust.active;

    if (t < launch) {
      if (t > launch / 2) rocket.x = baseX + (every(t, 50, 2) ? 0.5 : -0.5);
      if (t - lastPuff > 100) {
        lastPuff = t;
        dust.emit(rocket.x + pick([1, rocketWidth - 1]), floor - 2, { vx: rand(-18, 18), vy: -8, floor });
      }
      return true;
    }

    if (!launched) {
      launched = true;
      alert.ring(t);
    }
    rocket.x = baseX;
    rocket.vy -= 150 * dt;
    rocket.y += rocket.vy * dt;
    rocket.art = launchFrames[every(t, 80, 2)];
    if (t - lastPuff > 35) {
      lastPuff = t;
      dust.emit(rocket.x + rocketWidth / 2, rocket.y + rocket.height, { vx: rand(-6, 6), life: 800, floor });
    }
    if (rocket.y < -200) rocket.remove();
    return true;
  };
};

// Artificial Intelligence: a robot beams into the park and stays, saying things now and then.
const ROBOT_LINES = ["hello world", "beep boop", "i am human"];

const robot = (() => {
  const width = gridSize(effects.robot).width;
  const height = effects.robot.length + effects.robotLegsA.length;
  const frame = (legs: Grid, light: string) =>
    flatten(
      [
        [effects.robot, 0, 0],
        [legs, 0, effects.robot.length],
        [[light], 6, 0],
      ],
      width,
      height,
    );
  return {
    walk: [frame(effects.robotLegsA, "r"), frame(effects.robotLegsB, "r")],
    idle: [frame(effects.robotLegsA, "r"), frame(effects.robotLegsA, "#")], // the antenna light blinks
  };
})();

/** A speech bubble with pixel text and a tail on the bottom left. */
function bubble(text: string): Grid {
  const words = write(text);
  const width = gridSize(words).width + 4;
  const tail = ".".repeat(width - 4);
  return flatten(
    [
      [
        [
          "#".repeat(width),
          ...Array.from({ length: 8 }, () => "#" + "w".repeat(width - 2) + "#"),
          "#".repeat(width),
          "..##" + tail,
          "..#." + tail,
        ],
        0,
        0,
      ],
      [words, 2, 2],
    ],
    width,
    12,
  );
}

const ai: Scene = (stage) => {
  const area = stage.area(pick(AREAS));
  const floor = ground(area);
  const alert = alarm(stage);
  const bot = stage.spawn(robot.idle[0], "z-10");
  const [lo, hi] = [area.x, area.x + Math.max(0, area.width - bot.width)];
  bot.x = rand(lo, hi);
  bot.y = floor - bot.height;
  let target = bot.x;
  let idleUntil = 2600;
  let line = 0;
  let talk: Sprite | null = null;
  let quietAt = 0;

  const say = (t: number) => {
    talk = stage.spawn(bubble(ROBOT_LINES[line++ % ROBOT_LINES.length]), "z-20");
    talk.x = Math.max(area.x, bot.x - 2);
    talk.y = bot.y - talk.height - 1;
    quietAt = t + 2400;
    idleUntil = Math.max(idleUntil, quietAt + 600);
  };

  if (stage.still) {
    say(0);
    return () => false;
  }

  // Beams in bottom to top.
  bot.el.animate({ clipPath: ["inset(100% 0 0 0)", "inset(0 0 0 0)"] }, { duration: 900, easing: "steps(10)" });
  alert.ring(0);

  return (t, dt) => {
    const alerting = alert.update(t);
    if (!talk && line === 0 && t > 1100) say(t);
    if (talk && t > quietAt) {
      talk.remove();
      talk = null;
    }

    if (t > idleUntil && Math.abs(target - bot.x) < 0.5) target = rand(lo, hi);
    const gap = target - bot.x;
    if (t > idleUntil && Math.abs(gap) >= 0.5) {
      bot.x += Math.sign(gap) * Math.min(Math.abs(gap), 14 * dt);
      bot.mirror = gap < 0;
      bot.art = robot.walk[every(t, 220, 2)];
      if (Math.abs(target - bot.x) < 0.5) {
        idleUntil = t + rand(2000, 4500);
        if (Math.random() < 0.5) say(t);
      }
    } else {
      bot.art = robot.idle[every(t, 600, 2)];
    }
    return alerting || !!talk;
  };
};

// Reverse engineering: someone in the park comes apart, gets labeled and is put back together,
// wrong the first time.
const reverse: Scene = (stage) => {
  const person = pick(stage.standing());
  if (!person) return () => false;
  const box = stage.box(person);
  const floor = box.y + H;
  const y = poseY.stand;
  const alert = alarm(stage);
  person.style.opacity = "0";
  stage.onStop(() => (person.style.opacity = ""));
  stage.crowd.freeze = true;

  const pieces = [
    {
      name: "head",
      art: flatten(
        [
          [parts.head, 0, 0],
          [["#"], 5, 6],
          [["#"], 10, 6],
        ],
        16,
        13,
      ),
      dy: y,
    },
    { name: "body", art: parts.body, dy: y + 13 },
    { name: "legs", art: parts.legsStand, dy: y + 21 },
  ].map((piece, i) => {
    const s = stage.spawn(piece.art, "z-10");
    s.x = box.x + OX;
    s.y = box.y + piece.dy;
    return { ...piece, s, home: { x: s.x, y: s.y }, from: { x: 0, y: 0 }, spin: i - 1 };
  });
  // Built upside down: legs on top, head at the bottom.
  const wrong = { legs: floor - 26, body: floor - 21, head: floor - 13 } as Record<string, number>;
  const labels: Sprite[] = [];

  const explodeAt = 500;
  const labelAt = 2000;
  const wrongAt = 3400;
  const fixAt = 4900;
  const doneAt = 5700;
  const glide = 500;
  let phase = 0;

  const startGlide = () => {
    for (const p of pieces) p.from = { x: p.s.x, y: p.s.y };
  };
  const moveTo = (t: number, start: number, to: (p: (typeof pieces)[number]) => { x: number; y: number }) => {
    const k = Math.min(1, (t - start) / glide);
    const ease = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
    for (const p of pieces) {
      const end = to(p);
      p.s.x = p.from.x + (end.x - p.from.x) * ease;
      p.s.y = p.from.y + (end.y - p.from.y) * ease;
    }
  };

  if (stage.still) {
    // Show the exploded view, laid out on the ground.
    pieces.forEach((p, i) => {
      p.s.x = box.x + OX + (i - 1) * 20;
      p.s.y = floor - p.s.height;
    });
    return (t) => t < 3000;
  }

  return (t, dt) => {
    alert.update(t);

    if (t < explodeAt) {
      for (const p of pieces) p.s.x = p.home.x + Math.sin(t / 25) * 0.4; // trembles first
      return true;
    }

    if (t < wrongAt) {
      if (phase === 0) {
        phase = 1;
        alert.ring(t);
        for (const p of pieces) {
          p.s.x = p.home.x;
          p.s.vx = p.spin * rand(32, 42) + rand(-4, 4);
          p.s.vy = -rand(70, 110);
        }
      }
      for (const p of pieces) {
        p.s.vy += GRAVITY * dt;
        p.s.x += p.s.vx * dt;
        p.s.y += p.s.vy * dt;
        const rest = floor - p.s.height;
        if (p.s.y > rest) {
          p.s.y = rest;
          p.s.vy = Math.abs(p.s.vy) > 40 ? -p.s.vy * 0.3 : 0;
          p.s.vx *= 0.6;
        }
      }
      if (t > labelAt && !labels.length) {
        for (const p of pieces) {
          const label = stage.spawn(write(p.name), "z-10");
          label.x = p.s.x + (p.s.width - label.width) / 2;
          label.y = p.s.y - label.height - 2;
          label.appear();
          labels.push(label);
        }
      }
      return true;
    }

    if (t < fixAt) {
      if (phase === 1) {
        phase = 2;
        for (const label of labels) label.fade(200);
        startGlide();
      }
      moveTo(t, wrongAt, (p) => ({ x: box.x + OX, y: wrong[p.name] }));
      if (t > wrongAt + glide + 300 && phase === 2) {
        phase = 3;
        alert.ring(t, 1000); // everyone notices
      }
      return true;
    }

    if (t < doneAt) {
      if (phase === 3) {
        phase = 4;
        startGlide();
      }
      moveTo(t, fixAt, (p) => p.home);
      return true;
    }

    if (phase === 4) {
      phase = 5;
      person.style.opacity = "";
      for (const p of pieces) p.s.remove();
      stage.crowd.freeze = false;
    }
    return false;
  };
};

const scenes: Record<SceneName, Scene> = { google, math, virustotal, cs, space, ai, reverse };
/** Scenes that clear themselves once they finish. The rest stay in the park. */
const passing = new Set<SceneName>(["virustotal", "cs", "space", "reverse"]);

interface Setup {
  zones: Record<Zone, HTMLElement>;
  still: boolean;
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
 * the text, and which persists between pages.
 * Scenes run side by side; clicking one again restarts it.
 */
export function createDirector(root: HTMLElement, setup: Setup) {
  let stageEl!: HTMLElement;
  let text!: HTMLElement;
  // Lines under the text (links, latest posts): the middle area starts right of the longest one.
  let lines: Element[] = [];
  const desktop = window.matchMedia("(min-width: 1024px)");
  const runs = new Map<SceneName, Run>();
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
  };

  /** Points the director at a page's header and its scene words. */
  const attach = (next: HTMLElement) => {
    stageEl = next.querySelector<HTMLElement>("[data-people-layer]")!;
    text = next.querySelector<HTMLElement>("[data-people-text]")!;
    lines = [...next.querySelectorAll("[data-people-links] > *")];
    for (const el of next.querySelectorAll<HTMLElement>("[data-scene]")) {
      el.addEventListener("click", () => start(el.dataset.scene as SceneName));
    }
  };
  attach(root);

  return {
    crowd,
    attach,
    /** Ends every scene at once and puts the park back as it was. */
    clear() {
      for (const run of runs.values()) stop(run, 0);
    },
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
    },
  };
}
