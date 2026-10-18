import { effects, flatten, gridSize } from "../sprites";
import { AREAS, ZONES, GRAVITY, Dust, alarm, every, ground, pick, rand, type Scene } from "./shared";

// Mathematics: a flaming pi crashes like a meteor, half the time across the whole intro.
export const math: Scene = (stage) => {
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

