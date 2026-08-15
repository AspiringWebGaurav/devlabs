export interface Author {
  id: string;
  name: string;
  role: string;
  avatar: string;
  bio?: string;
  socials?: {
    twitter?: string;
    github?: string;
    linkedin?: string;
  };
}

export interface BlogCategory {
  id: string;
  slug: string;
  name: string;
  description?: string;
  color: string; // e.g. "purple" | "cyan" | "emerald" | "amber" | "rose"
}

export interface BlogComment {
  id: string;
  postId: string;
  author: {
    name: string;
    avatar: string;
    role?: string;
  };
  createdAt: string; // formatted or ISO
  content: string;
  likesCount: number;
  isLiked?: boolean;
  parentId?: string | null;
  replies?: BlogComment[];
}

export interface ArticleSection {
  id: string;
  heading: string;
  paragraphs: string[];
  codeSnippet?: {
    language: string;
    code: string;
    filename?: string;
  };
  quote?: {
    text: string;
    caption?: string;
  };
  gallery?: string[];
}

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  excerpt: string;
  coverImage: string;
  galleryImages?: string[];
  category: BlogCategory;
  tags: string[];
  author: Author;
  publishedAt: string; // e.g. "Aug 15, 2025"
  readingTime: string; // e.g. "5 min read"
  featured?: boolean;
  views?: number;
  content: {
    intro: string;
    sections: ArticleSection[];
    conclusion?: string;
  };
  comments?: BlogComment[];
}

export interface BlogFilterState {
  searchQuery: string;
  selectedCategory: string;
  selectedTag: string | null;
  currentPage: number;
}
