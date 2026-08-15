import { BlogPost } from "@/types/blog";
import { AdminMetric, AdminTimeSeriesPoint, AdminActivityItem } from "@/types/admin";
import { getAllPosts } from "@/lib/blog";

/**
 * Returns overview metrics for content and productivity stats.
 */
export async function getAdminMetrics(): Promise<AdminMetric[]> {
  const posts = await getAllPosts();
  const totalViews = posts.reduce((acc, p) => acc + (p.views || 1200), 0);
  const publishedCount = posts.length;

  return [
    {
      id: "m_posts",
      label: "TOTAL ARTICLES",
      value: publishedCount,
      change: "+2 this month",
      trend: "up",
      category: "content",
      detail: "100% active in production",
    },
    {
      id: "m_views",
      label: "TOTAL IMPRESSIONS",
      value: `${(totalViews / 1000).toFixed(1)}k`,
      change: "+18.4% vs last mo",
      trend: "up",
      category: "traffic",
      detail: "Organic search & direct traffic",
    },
    {
      id: "m_focus",
      label: "DEEP FOCUS HOURS",
      value: "186.4h",
      change: "+7.2%",
      trend: "up",
      category: "productivity",
      detail: "Coding, architectural design & writing",
    },
    {
      id: "m_health",
      label: "SYSTEM HEALTH",
      value: "99.98%",
      change: "Stable",
      trend: "neutral",
      category: "system",
      detail: "Vercel Edge & SSG Pipeline",
    },
  ];
}

/**
 * Returns time-series chart data for analytics curve.
 */
export function getAdminAnalyticsSeries(): AdminTimeSeriesPoint[] {
  return [
    { date: "Mon", views: 240, deepFocusHours: 7.2, sessions: 18 },
    { date: "Tue", views: 380, deepFocusHours: 8.5, sessions: 24 },
    { date: "Wed", views: 420, deepFocusHours: 9.1, sessions: 29 },
    { date: "Thu", views: 510, deepFocusHours: 8.8, sessions: 35 },
    { date: "Fri", views: 680, deepFocusHours: 9.4, sessions: 42 },
    { date: "Sat", views: 490, deepFocusHours: 6.0, sessions: 20 },
    { date: "Sun", views: 580, deepFocusHours: 6.8, sessions: 26 },
  ];
}

/**
 * Returns recent activity stream for the dashboard.
 */
export function getAdminRecentActivity(): AdminActivityItem[] {
  return [
    {
      id: "act_01",
      type: "post_published",
      title: "Building Enterprise Next.js Applications with Three.js",
      timestamp: "2 hours ago",
      actor: "Gaurav",
      meta: "Published to /blog",
    },
    {
      id: "act_02",
      type: "project_updated",
      title: "Gaurav Portfolio v4.0.0 released",
      timestamp: "Yesterday at 6:40 PM",
      actor: "System",
      meta: "Production deployment verified",
    },
    {
      id: "act_03",
      type: "login",
      title: "Admin authenticated via Google OAuth",
      timestamp: "Today at 9:15 AM",
      actor: "admin@gauravpatil.online",
      meta: "IP: 192.168.0.154",
    },
  ];
}

/**
 * Returns all posts for the admin table.
 */
export async function getAdminPosts(): Promise<BlogPost[]> {
  return getAllPosts();
}
