# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` / `npm start` — Start dev server (localhost:4321)
- `npm run build` — Build to `./dist/`
- `npm run preview` — Preview production build
- `npm run lint` — Lint with oxlint
- No test suite configured

## Architecture

Astro 7 static single-page portfolio with Tailwind CSS 4 (via `@tailwindcss/vite`). Minimalist white design.

`src/pages/index.astro` composes three sections:

- `Intro.astro` — the home header, built on `Park.astro`: name, a paragraph about life and experience with scene words, text links and the three latest posts.
- `ProjectsGrid.astro` — project screenshots (no cards), newest first by `date`. The newest spans the full width; the rest go two per row below it. Screenshots are cropped from the top center and link to the project (plain image when there is no link); title, month, description and links sit below with no hover effects. The grid is wider (max 1600px) than the text column.
- `Footer.astro` — on every page. The sorting animation is hidden (`showSorting` flag) but kept. When shown: on each reload, generates random numbers, picks a weighted random sorting algorithm (bubble, insertion, selection, quicksort, plus the joke "intelligent design sort" that does nothing, O(1)), records its compare/swap operations and replays them as animated bars; clicking the bars shuffles and sorts again. Starts when the footer scrolls into view; respects `prefers-reduced-motion`. Below: `LastCommit.astro` (the latest git commit, read at build time) on the left and `MalagaClock.astro` (time in Málaga, a mood line and live weather from Open-Meteo drawn as a pixel sky) on the right.

**Pixel people:** `src/scripts/sprites.ts` holds pixel sprite parts and park scenery as strings (palette keys map to colors, `.` is transparent) and composes them into SVG paths. `src/scripts/pixel-people.ts` defines the characters (zone, position, hover phrase, props, `wander`, `watcher`) and runs one rAF loop: walking, blinking, per-character animation, and the watcher's eyes following the pointer. Each character is a button whose speech bubble shows on hover/focus. Animation pauses off-screen and freezes with reduced motion.

**Scenes:** words in the intro paragraph are `<button data-scene="...">` triggers. Clicking one starts a scene (`src/scripts/scenes.ts`): Google drops a G, VirusTotal sends bugs and an exterminator in a blue cap, Mathematics crashes a pi meteor, Indra Espacio brings a temporary night with a rocket, Artificial Intelligence beams in a robot that wanders and talks in speech bubbles, reverse engineering takes a standing person apart (labeled head/body/legs) and rebuilds them upside down before fixing it, and Computer Science glitches the park, blanks it (clearing every other scene), types a random command (`git reset --hard`, `sudo reboot`, `rm -rf /`) and redraws it. `write()` in `sprites.ts` renders the tiny terminal font (only the letters the commands use). Scene sprites live on the intro grid (`data-people-stage`), so they can cross the text; each scene picks an area: a people zone or the "middle" strip right of the links (`data-people-text`, `data-people-links`). Scenes run side by side; clicking one again restarts it. Scenes not in `passing` leave their pieces in the park. Each scene has its own sprites and `crowd` state (`alert` shows "!" and a hop, `freeze` stops wandering), merged for `pixel-people.ts`. With reduced motion, scenes show their final state.

**Park:** `src/components/Park.astro` is the header on every page: its slot is the middle column, flanked by two "people zones". On `lg` the zones sit left and right of the text; on mobile they are strips below it. The header has the same minimum height on every page. `mode` sets what the park is up to: `home`, `reading` on blog pages (colored books, the newspaper, the watcher peeking over a book) or `lost` on the 404 (everyone looking around with a question mark).

**404:** `src/pages/404.astro` puts a terminal in the park header (`cd` into the missing path, `ls` with links home and to the blog) with the park in `lost` mode, and no footer.

**Navigation:** `Layout.astro` uses Astro's `ClientRouter`, so pages swap without a full reload. The park zones, the scene sprite layer (`data-people-layer`) and the footer use `transition:persist`: people, scenes and the footer animation carry over between pages. Scripts run once, so `Park.astro` calls `mountPixelPeople` on every `astro:page-load`; after the first time it re-attaches the same park (and the scene director) to the new page's header, scene words and reading mode instead of creating a new one. New page scripts must follow the same pattern.

**Blog:** Markdown posts in `src/content/blog/` (collection in `src/content.config.ts`: `title`, `description`, `date`, `draft`). `src/data/posts.ts` returns published posts newest first. `src/pages/blog/index.astro` and `src/pages/blog/[id].astro` put their title in the `Park` header; a post's body sits below in a column aligned with the header's middle column, styled under `.post` in `global.css` (Shiki `github-light`). No RSS yet: it needs `site` in `astro.config.mjs`.

**Deploy and SEO:** Vercel at https://www.alvarosh.dev (`site` in `astro.config.mjs`, so canonical and social URLs are absolute). Vercel Web Analytics via `<Analytics />` in the layout. `src/pages/sitemap.xml.ts`, `robots.txt.ts` and `rss.xml.ts` are built from the post list. The social image is `src/assets/og.png`, a 1200x630 screenshot of the home header; retake it when the header changes. Internal links prefetch as soon as they're on screen (`prefetch` in `astro.config.mjs`).

**Layout:** `src/layouts/Layout.astro` — metadata, Onest font, global CSS, favicons. The favicon is a small version of the park's tree, drawn in `src/scripts/favicon.ts` and served as `/favicon.svg`. `public/favicon-32.png` and `public/apple-touch-icon.png` are renders of it; regenerate them if it changes.

**Data:** `src/data/projects.ts` — projects array. Screenshots live in `src/assets/projects/` and are imported so `astro:assets` optimizes them to WebP.

## Styling

Design tokens in `src/styles/global.css` (`@theme`): `paper` (#ffffff), `ink` (#111111), `muted` (#737373), `line` (#e7e7e7), `font-sans` (Onest Variable). No dark mode.
