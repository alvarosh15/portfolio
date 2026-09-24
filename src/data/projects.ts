import type { ImageMetadata } from "astro";
import latte from "../assets/projects/latte.png";
import litscan from "../assets/projects/litscan.png";
import willitbang from "../assets/projects/willitbang.png";

export interface Project {
  title: string;
  description: string;
  /** When the project started, as YYYY-MM. Projects are shown newest first. */
  date: string;
  link?: string;
  github?: string;
  image: ImageMetadata;
}

export const projects: Project[] = [
  {
    title: "Will It Bang?",
    description:
      "Write a post and let Jev decide if it's a banger or a flop, scored on hook, shareability and more.",
    date: "2026-09",
    link: "https://will-it-bang.vercel.app/",
    image: willitbang,
  },
  {
    title: "latte",
    description:
      "Thread scheduler for X that runs 24/7 on a Raspberry Pi: React, Hono and SQLite, publishing whatever is due.",
    date: "2026-07",
    image: latte,
  },
  {
    title: "Lit Scan",
    description:
      "Rerender visualizer for Lit web components, inspired by React Scan. Flashes every rerender and keeps a live counter and FPS meter.",
    date: "2026-05",
    link: "https://www.lit-scan.com/",
    github: "https://github.com/alvarosh15/lit-scan",
    image: litscan,
  },
].sort((a, b) => b.date.localeCompare(a.date));
