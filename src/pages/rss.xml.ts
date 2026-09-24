import type { APIRoute } from "astro";
import { getPosts } from "../data/posts";

const escape = (text: string) =>
  text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");

export const GET: APIRoute = async ({ site }) => {
  const posts = await getPosts();
  const items = posts
    .map((post) => {
      const url = new URL(`/blog/${post.id}/`, site);
      return `<item><title>${escape(post.data.title)}</title><link>${url}</link><guid>${url}</guid><description>${escape(post.data.description)}</description><pubDate>${post.data.date.toUTCString()}</pubDate></item>`;
    })
    .join("");
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Alvaro Sanchez</title><link>${new URL("/blog/", site)}</link><description>Notes on the things I build and what I learn along the way.</description><language>en</language>${items}</channel></rss>`,
    { headers: { "Content-Type": "application/rss+xml" } },
  );
};
