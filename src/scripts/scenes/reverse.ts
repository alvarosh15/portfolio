import { H, OX, flatten, parts, poseY, write } from "../sprites";
import { GRAVITY, alarm, pick, rand, type Sprite, type Scene } from "./shared";

// Reverse engineering: someone in the park comes apart, gets labeled and is put back together,
// wrong the first time.
export const reverse: Scene = (stage) => {
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

