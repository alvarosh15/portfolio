import { effects, flatten, gridSize, write, type Grid, type Layer } from "../sprites";
import { ZONES, every, ground, pick, rand, type Sprite, type Scene } from "./shared";

// Computer Science: the park glitches and goes blank, a command is typed, then it redraws.
// Clears every other scene.
const COMMANDS = ["git reset --hard", "sudo reboot", "rm -rf /"];
let lastCommand = "";

export const cs: Scene = (stage) => {
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

