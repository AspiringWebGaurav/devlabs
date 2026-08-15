import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FloatingNav } from "@/components/ui/FloatingNav";
import { Spotlight } from "@/components/ui/Spotlight";
import { navItems } from "@/data";
import Footer from "@/components/Footer";
import ScrollToTop from "@/components/ui/ScrollToTop";
import {
  getAllPosts,
  getPostBySlug,
  getAdjacentPosts,
  getRelatedPosts,
} from "@/lib/blog";
import { ArticleHeader } from "@/components/blog/ArticleHeader";
import { ArticleContent } from "@/components/blog/ArticleContent";
import { ArticleTableOfContents } from "@/components/blog/ArticleTableOfContents";
import { ArticleShare } from "@/components/blog/ArticleShare";
import { ArticleNavigation } from "@/components/blog/ArticleNavigation";
import { RelatedPosts } from "@/components/blog/RelatedPosts";
import { CommentSection } from "@/components/blog/comments/CommentSection";

interface ArticlePageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateStaticParams() {
  const posts = await getAllPosts();
  return posts.map((post) => ({
    slug: post.slug,
  }));
}

export async function generateMetadata({
  params,
}: ArticlePageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) {
    return {
      title: "Article Not Found | Gaurav Patil",
    };
  }

  return {
    title: `${post.title} | Gaurav Patil`,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: "article",
      publishedTime: post.publishedAt,
      authors: [post.author.name],
      tags: post.tags,
      images: [
        {
          url: post.coverImage,
          alt: post.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.excerpt,
      images: [post.coverImage],
    },
  };
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  const [{ prev, next }, relatedPosts] = await Promise.all([
    getAdjacentPosts(slug),
    getRelatedPosts(post.id, post.category.slug, 2),
  ]);

  return (
    <main className="relative bg-black-100 flex justify-center items-center flex-col mx-auto sm:px-10 px-5 overflow-clip min-h-screen text-white">
      {/* Background Spotlights */}
      <div>
        <Spotlight
          className="-top-40 -left-10 md:-left-32 md:-top-20 h-screen"
          fill="white"
        />
        <Spotlight
          className="h-[80vh] w-[50vw] top-10 left-full"
          fill="purple"
        />
        <Spotlight className="left-80 top-28 h-[80vh] w-[50vw]" fill="blue" />
      </div>

      {/* Full-width Grid Background with Radial Mask */}
      <div
        className="h-screen w-full dark:bg-black-100 bg-white dark:bg-grid-white/[0.03] bg-grid-black-100/[0.2]
       absolute top-0 left-0 flex items-center justify-center pointer-events-none"
      >
        <div
          className="absolute pointer-events-none inset-0 flex items-center justify-center dark:bg-black-100
         bg-white [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]"
        />
      </div>

      <div className="max-w-7xl w-full relative z-10 flex flex-col justify-between min-h-screen">
        {/* Floating Navigation Pill */}
        <FloatingNav navItems={navItems} />

        <div className="pt-28 pb-20 flex-grow">
          {/* Article Header */}
          <ArticleHeader post={post} />

          {/* 2-Column Article Body: Main Content + Sticky Sidebar */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 my-10">
            {/* Main Reading Column */}
            <div className="lg:col-span-8 space-y-12">
              <ArticleContent post={post} />

              {/* Share Bar & Author Bio Box */}
              <div
                style={{
                  background: "rgb(4,7,29)",
                  backgroundColor:
                    "linear-gradient(90deg, rgba(4,7,29,1) 0%, rgba(12,14,35,1) 100%)",
                }}
                className="p-6 sm:p-8 rounded-3xl border border-white/[0.1] shadow-input flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6"
              >
                <div className="flex items-center gap-4">
                  <img
                    src={post.author.avatar}
                    alt={post.author.name}
                    className="w-14 h-14 rounded-full border border-white/20 object-cover bg-black-100"
                  />
                  <div>
                    <h4 className="text-base font-bold text-white">
                      Written by {post.author.name}
                    </h4>
                    <p className="text-xs text-white-200 max-w-sm mt-0.5 leading-relaxed">
                      {post.author.bio || post.author.role}
                    </p>
                  </div>
                </div>

                <ArticleShare title={post.title} slug={post.slug} />
              </div>

              {/* Adjacent Previous & Next Navigation */}
              <ArticleNavigation prev={prev} next={next} />

              {/* Comments Thread Section */}
              <CommentSection
                postId={post.id}
                initialComments={post.comments || []}
              />
            </div>

            {/* Sticky Sidebar on Desktop */}
            <aside className="hidden lg:block lg:col-span-4 space-y-6">
              {/* Table of Contents */}
              <ArticleTableOfContents sections={post.content.sections} />

              {/* Sidebar Share Card */}
              <div
                style={{
                  background: "rgb(4,7,29)",
                  backgroundColor:
                    "linear-gradient(90deg, rgba(4,7,29,1) 0%, rgba(12,14,35,1) 100%)",
                }}
                className="rounded-2xl border border-white/[0.1] p-5 shadow-input"
              >
                <ArticleShare title={post.title} slug={post.slug} />
              </div>
            </aside>
          </div>

          {/* Related Articles Carousel/Grid */}
          <RelatedPosts posts={relatedPosts} />
        </div>

        {/* Footer */}
        <Footer />
      </div>

      <ScrollToTop />
    </main>
  );
}
