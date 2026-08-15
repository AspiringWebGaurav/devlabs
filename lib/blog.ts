import { BlogPost, BlogCategory, Author } from "@/types/blog";
import { getActiveDbPosts } from "@/lib/admin/database";
import { categories as staticCategories } from "@/data/blog/categories";
import { authors as staticAuthors } from "@/data/blog/authors";

/**
 * Data Access Layer (DAL) for Blog subsystem.
 * Mediates dynamic database queries and allows nuclear purge to wipe data to 0 live.
 */

export async function getAllPosts(): Promise<BlogPost[]> {
  return getActiveDbPosts();
}

export async function getPostBySlug(slug: string): Promise<BlogPost | null> {
  const allPosts = await getAllPosts();
  return allPosts.find((post) => post.slug === slug) || null;
}

export async function getFeaturedPost(): Promise<BlogPost | null> {
  const allPosts = await getAllPosts();
  const featured = allPosts.find((post) => post.featured);
  return featured || allPosts[0] || null;
}

export async function getCategories(): Promise<BlogCategory[]> {
  return staticCategories;
}

export async function getAuthors(): Promise<Record<string, Author>> {
  return staticAuthors;
}

export async function getAllTags(): Promise<string[]> {
  const allPosts = await getAllPosts();
  const tagsSet = new Set<string>();
  allPosts.forEach((post) => {
    post.tags.forEach((tag) => tagsSet.add(tag));
  });
  return Array.from(tagsSet);
}

export async function getRelatedPosts(
  currentPostId: string,
  categorySlug: string,
  limit = 2
): Promise<BlogPost[]> {
  const allPosts = await getAllPosts();
  return allPosts
    .filter(
      (post) => post.id !== currentPostId && (post.category.slug === categorySlug || true)
    )
    .slice(0, limit);
}

export async function getAdjacentPosts(
  currentSlug: string
): Promise<{ prev: BlogPost | null; next: BlogPost | null }> {
  const allPosts = await getAllPosts();
  const currentIndex = allPosts.findIndex((p) => p.slug === currentSlug);

  if (currentIndex === -1) {
    return { prev: null, next: null };
  }

  const prev = currentIndex > 0 ? allPosts[currentIndex - 1] : null;
  const next = currentIndex < allPosts.length - 1 ? allPosts[currentIndex + 1] : null;

  return { prev, next };
}
