# alvarosh.dev

My personal site: a short bio, a few projects, a blog, and a small pixel art park that lives next to the text.

**[www.alvarosh.dev](https://www.alvarosh.dev)**

## The park

The people next to the intro are drawn in pixel art, with every sprite written as an array of strings (one character per pixel, a small palette, `.` for transparent) and turned into SVG paths at runtime. A single animation loop makes them walk, blink and do their thing, and one of them keeps an eye on your cursor.

Some words in the intro are clickable, and each one starts a scene in the park: a Google G falls from the sky, a flaming pi crashes like a meteor, an exterminator deals with some malware, a robot beams in, night falls for a rocket launch, someone gets taken apart and put back together, and Computer Science reboots everything with a random terminal command.

The park stays put while you move around the site: on blog posts everyone reads, and on the 404 page they are all looking for the page you wanted.

There is a [post about how it works](https://www.alvarosh.dev/blog/building-a-pixel-park/).

## Stack

- [Astro](https://astro.build) with client-side navigation, so the park and the footer persist between pages
- [Tailwind CSS](https://tailwindcss.com) 4
- Plain TypeScript and SVG for the pixel art: no canvas, no game engine, no images
- [Onest](https://fontsource.org/fonts/onest) through Fontsource
- Deployed on Vercel, with Vercel Web Analytics

## Structure

```
src/
├── components/   Park (the header on every page), intro, projects, footer
├── content/blog/ Blog posts in Markdown
├── data/         Projects and post helpers
├── pages/        Home, blog, 404, plus RSS, sitemap, robots and favicon
└── scripts/
    ├── sprites.ts       Every piece of pixel art, and the helpers that draw it
    ├── pixel-people.ts  The park's people and its animation loop
    └── scenes.ts        What happens when you click the words in the intro
```

## Running it

```sh
npm install
npm run dev      # localhost:4321
npm run build
npm run preview
npm run lint
```
