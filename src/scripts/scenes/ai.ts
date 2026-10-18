import { effects, flatten, gridSize, write, type Grid } from "../sprites";
import { AREAS, alarm, every, ground, pick, rand, type Sprite, type Scene } from "./shared";

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

export const ai: Scene = (stage) => {
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

