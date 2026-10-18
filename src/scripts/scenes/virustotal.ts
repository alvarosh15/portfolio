import { H, OX, W, effects, flatten, gridSize, parts, poseY, type Grid, type Layer } from "../sprites";
import { AREAS, Dust, alarm, every, ground, pick, rand, type Sprite, type Scene } from "./shared";

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

export const virustotal: Scene = (stage) => {
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

