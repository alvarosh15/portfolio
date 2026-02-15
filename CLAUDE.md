# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` / `npm start` — Start dev server (localhost:4321)
- `npm run build` — Build to `./dist/`
- `npm run preview` — Preview production build
- `npm run lint` — Lint with oxlint
- No test suite configured

## Architecture

Astro 5 static portfolio site with Tailwind CSS. Single-page app at `src/pages/index.astro` using hash-based navigation (#projects, #blog, #experiencie).

**Layout:** `src/layouts/Layout.astro` — global wrapper handling fonts (Playfair Display for headings, Onest for body), metadata, and base styles.

**Components:** `src/components/` — page sections (Intro, AboutMe, Projects) compose reusable UI pieces (Section, ProjectCard, SocialPill, Badge). SVG icons live in `components/icons/`.

**Projects data** is defined inline as an array in `Projects.astro`, not in a separate data file or content collection.

**Static assets** (project screenshots, favicon) are in `public/`.

## Styling

Tailwind with custom color palette defined in `tailwind.config.mjs`:
- `light-brown-bg` (#fffdfa), `dark-brown-bg` (#f4f0e7), `dark-brown-text` (#a69b85)
- Dark mode via `class` strategy
- Responsive breakpoint: `lg:w-[740px]` for content sections
