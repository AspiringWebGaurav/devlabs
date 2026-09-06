import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://gauravpatil.site";
  const lastModified = new Date();

  const publicRoutes = [
    "",
    "/privacy",
    "/terms",
    "/security",
    "/accessibility",
    "/chat",
  ];

  return publicRoutes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified,
    changeFrequency: route === "" ? "weekly" : "monthly",
    priority: route === "" ? 1.0 : 0.8,
  }));
}
