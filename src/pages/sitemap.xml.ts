import type { APIRoute } from "astro";
import { getPosts } from "../data/posts";

// Every public page, with posts dated by when they were published.
export const GET: APIRoute = async ({ site }) => {
  const posts = await getPosts();
  const pages: [string, Date?][] = [
    ["/"],
    ["/blog/", posts[0]?.data.date],
    ...posts.map((post): [string, Date] => [`/blog/${post.id}/`, post.data.date]),
  ];
  const urls = pages
    .map(([path, date]) => {
      const lastmod = date ? `<lastmod>${date.toISOString().slice(0, 10)}</lastmod>` : "";
      return `<url><loc>${new URL(path, site)}</loc>${lastmod}</url>`;
    })
    .join("");
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`,
    { headers: { "Content-Type": "application/xml" } },
  );
};
