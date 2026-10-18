/** Shared by the blog, home, RSS and sitemap through getPosts(). */
export function publishedPosts<T extends { data: { draft: boolean; date: Date } }>(posts: T[]): T[] {
  return posts.filter((post) => !post.data.draft)
    .sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
}
