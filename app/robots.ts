import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/privacy", "/terms", "/security", "/accessibility", "/chat"],
        disallow: ["/admin/", "/api/", "/wa/"],
      },
    ],
    sitemap: "https://gauravpatil.site/sitemap.xml",
  };
}
