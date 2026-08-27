import { unstable_cache } from "next/cache";
import { publicPortfolioRepository } from "@/lib/dal/repositories/public-portfolio.repository";
import type { PublicPortfolioProjection } from "@/types/portfolio";
import { SEED_PORTFOLIO_PROJECTION } from "@/lib/dal/repositories/seed-data";

/**
 * Public cached data aggregator for the portfolio homepage.
 * Uses Next.js data cache with tag 'portfolio-cms'.
 * Revalidated deterministically upon admin CMS mutations.
 */
export const getPortfolioData = unstable_cache(
  async (): Promise<PublicPortfolioProjection> => {
    try {
      const result = await publicPortfolioRepository.getPublishedPortfolioData();
      return result.data || SEED_PORTFOLIO_PROJECTION;
    } catch {
      return SEED_PORTFOLIO_PROJECTION;
    }
  },
  ["portfolio-data-cache"],
  {
    tags: [
      "portfolio-cms",
      "portfolio-hero",
      "portfolio-cards",
      "portfolio-projects",
      "portfolio-testimonials",
      "portfolio-clients",
      "portfolio-experience",
      "portfolio-approach",
      "portfolio-cta",
      "portfolio-footer",
      "portfolio-social",
      "portfolio-nav",
    ],
    revalidate: 3600, // Background revalidation fallback (1 hour)
  }
);
