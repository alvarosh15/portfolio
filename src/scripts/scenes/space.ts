import { effects, flatten, gridSize } from "../sprites";
import { AREAS, ZONES, FADE_MS, NIGHT_MS, Dust, alarm, every, ground, pick, rand, type Scene } from "./shared";

// Indra Espacio: night falls for a while, the lamp turns on and a rocket takes off.
export const space: Scene = (stage) => {
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

