import { effects } from "../sprites";
import { AREAS, GRAVITY, alarm, ground, pick, rand, type Scene } from "./shared";

// Google: a big G falls from the sky and bounces. In the middle it falls past the text.
export const google: Scene = (stage) => {
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

