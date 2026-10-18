import { effects, paint, svgFor, type Grid, type Layer } from "./sprites";
import { createFrameCache } from "./frame-cache";

const W = 36;
const H = 20;
const WEATHER_INTERVAL = 15 * 60_000;
const timeOptions = { timeZone: "Europe/Madrid" };
const hourFormat = new Intl.DateTimeFormat("en-GB", { ...timeOptions, hour: "2-digit", hourCycle: "h23" });
const timeFormat = new Intl.DateTimeFormat("en-GB", { ...timeOptions, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const weekdayFormat = new Intl.DateTimeFormat("en-GB", { ...timeOptions, weekday: "short" });
const star: Grid = ["#"];
const empty: Grid = ["."];

type Sky = "clear" | "cloudy" | "fog" | "rain" | "snow" | "storm";
const describe = (code: number): [Sky, string] => {
  if (code === 0) return ["clear", "clear"];
  if (code <= 2) return ["cloudy", "partly cloudy"];
  if (code === 3) return ["cloudy", "cloudy"];
  if (code <= 48) return ["fog", "foggy"];
  if (code <= 67 || (code >= 80 && code <= 82)) return ["rain", "raining"];
  if (code <= 77 || code === 85 || code === 86) return ["snow", "snowing"];
  return ["storm", "stormy"];
};

function mountClock(root: HTMLElement) {
  const sky = root.querySelector<HTMLElement>("[data-sky]")!;
  const clock = root.querySelector<HTMLElement>("[data-clock]")!;
  const mood = root.querySelector<HTMLElement>("[data-mood]")!;
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const abort = new AbortController();
  const frame = createFrameCache(W, H);
  let lastFrame: ReturnType<typeof frame> | undefined;
  let weather: Sky = "clear";
  let summary = "";
  let day = true;
  let visible = false;
  let raf = 0;
  let lastAttempt = -Infinity;
  let fetching = false;
  sky.innerHTML = svgFor(W, H);
  const drops = Array.from({ length: 9 }, (_, i) => ({ x: 4 + i * 3.5, offset: Math.random() * H }));
  const stars = [[14, 3], [22, 6], [30, 2], [26, 12]];

  const draw = (time: number) => {
    const t = motion.matches ? 0 : time;
    const layers: Layer[] = [];
    const cloudy = weather !== "clear";
    if (day) layers.push([effects.sun, 2, 2]);
    else {
      layers.push([effects.moon, 3, 2]);
      if (!cloudy) {
        for (const [x, y] of stars) layers.push([(t / 400 + x) % 6 < 1 ? empty : star, x, y]);
      }
    }
    if (cloudy) {
      const drift = motion.matches ? 0 : (t / 250) % (W + 14);
      layers.push([effects.cloud, Math.round(drift) - 14, 3]);
      layers.push([effects.cloud, 18, weather === "fog" ? 10 : 1]);
    }
    if (weather === "rain" || weather === "storm" || weather === "snow") {
      const art = weather === "snow" ? effects.snowflake : effects.raindrop;
      const speed = weather === "snow" ? 180 : 60;
      for (const drop of drops) {
        const y = motion.matches ? drop.offset : (t / speed + drop.offset) % (H - 7);
        layers.push([art, Math.round(drop.x), 7 + Math.round(y)]);
      }
    }
    const paths = frame(layers);
    if (paths !== lastFrame) {
      paint(sky, paths);
      lastFrame = paths;
    }
  };

  const animate = () => visible && !document.hidden && !motion.matches && (weather !== "clear" || !day);
  const loop = (t: number) => {
    raf = 0;
    if (!animate()) return;
    draw(t);
    raf = requestAnimationFrame(loop);
  };
  const refreshAnimation = () => {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    draw(performance.now());
    if (animate()) raf = requestAnimationFrame(loop);
  };

  const updateText = () => {
    const now = new Date();
    const hour = Number(hourFormat.format(now));
    day = hour >= 7 && hour < 20;
    const weekend = ["Sat", "Sun"].includes(weekdayFormat.format(now));
    clock.textContent = `${timeFormat.format(now)} in Málaga${summary}`;
    mood.textContent = hour < 7 ? "Probably asleep."
      : hour < 9 ? "Probably on the first coffee."
      : hour < 18 ? (weekend ? "Probably outside, or building something." : "Probably at work.")
      : "Probably building small things.";
  };

  const fetchWeather = async () => {
    if (document.hidden || fetching || Date.now() - lastAttempt < WEATHER_INTERVAL) return;
    lastAttempt = Date.now();
    fetching = true;
    try {
      const response = await fetch(
        "https://api.open-meteo.com/v1/forecast?latitude=36.7213&longitude=-4.4214&current=temperature_2m,weather_code&timezone=Europe%2FMadrid",
        { signal: AbortSignal.any([abort.signal, AbortSignal.timeout(10_000)]) },
      );
      if (!response.ok) return;
      const data = await response.json();
      const code: unknown = data?.current?.weather_code;
      const temperature: unknown = data?.current?.temperature_2m;
      if (typeof code !== "number" || !Number.isInteger(code) || code < 0 || code > 99
        || typeof temperature !== "number" || !Number.isFinite(temperature) || abort.signal.aborted) return;
      const [kind, text] = describe(code);
      weather = kind;
      summary = ` · ${Math.round(temperature)}°C, ${text}`;
      updateText();
      refreshAnimation();
    } catch {
      // Keep the clock (and last valid weather) usable offline or when the API fails.
    } finally {
      fetching = false;
    }
  };

  const refresh = () => {
    if (!document.hidden) {
      updateText();
      void fetchWeather();
    }
    refreshAnimation();
  };
  const observer = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    refreshAnimation();
  });
  observer.observe(sky);
  motion.addEventListener("change", refreshAnimation);
  document.addEventListener("visibilitychange", refresh);
  const timer = window.setInterval(refresh, 30_000);
  refresh();

  return () => {
    abort.abort();
    clearInterval(timer);
    cancelAnimationFrame(raf);
    observer.disconnect();
    motion.removeEventListener("change", refreshAnimation);
    document.removeEventListener("visibilitychange", refresh);
  };
}

class MalagaClock extends HTMLElement {
  private cleanup?: () => void;

  connectedCallback() {
    this.cleanup ??= mountClock(this);
  }

  disconnectedCallback() {
    // Astro temporarily moves persisted nodes during a swap. Only dispose removed clocks.
    queueMicrotask(() => {
      if (!this.isConnected) {
        this.cleanup?.();
        this.cleanup = undefined;
      }
    });
  }
}

if (!customElements.get("malaga-clock")) customElements.define("malaga-clock", MalagaClock);
