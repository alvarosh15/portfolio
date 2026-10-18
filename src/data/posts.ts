import { getCollection } from "astro:content";
import { publishedPosts } from "./published-posts";

/** Published posts, newest first. */
export async function getPosts() {
  return publishedPosts(await getCollection("blog"));
}

const day = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

export const formatDate = (date: Date) => day.format(date);
