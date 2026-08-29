import { BaseRepository } from "./base.repository";
import { adminLogger } from "@/lib/admin/logger";
import type { PublicPortfolioProjection } from "@/types/portfolio";
import type { RepositoryResult } from "./types";
import {
  heroRepository,
  cardsRepository,
  projectsRepository,
  testimonialsRepository,
  clientsRepository,
  experienceRepository,
  approachRepository,
  navigationRepository,
  socialRepository,
  ctaRepository,
  footerRepository,
  seoRepository,
  assistantRepository,
} from "./cms";
import { SEED_PORTFOLIO_PROJECTION } from "./seed-data";

// Process-local memory snapshot for transient read fallback
let lastKnownGoodProjection: PublicPortfolioProjection | null = null;

export class PublicPortfolioRepository extends BaseRepository {
  constructor() {
    super("PublicPortfolioRepository");
  }

  /**
   * Fetches published portfolio data across all CMS domains concurrently.
   * Enforces aggregate last-known-good fallback on transient errors.
   */
  public async getPublishedPortfolioData(): Promise<RepositoryResult<PublicPortfolioProjection>> {
    const isEmergencyOverride = process.env.PORTFOLIO_USE_FALLBACK_SEED === "true";
    if (isEmergencyOverride) {
      adminLogger.warn("PublicPortfolio:emergencyFallback", "PORTFOLIO_USE_FALLBACK_SEED is enabled");
      return {
        success: true,
        data: SEED_PORTFOLIO_PROJECTION,
        timestamp: new Date().toISOString(),
      };
    }

    return this.executeQuery("getPublishedPortfolioData", async () => {
      try {
        const [
          navRes,
          heroRes,
          cardsRes,
          projectsRes,
          testimonialsRes,
          clientsRes,
          experienceRes,
          phasesRes,
          ctaRes,
          footerRes,
          socialRes,
          seoRes,
          assistantRes,
        ] = await Promise.all([
          navigationRepository.getNavigation(),
          heroRepository.getHero(),
          cardsRepository.getCards(),
          projectsRepository.getProjects(),
          testimonialsRepository.getTestimonials(),
          clientsRepository.getClients(),
          experienceRepository.getExperience(),
          approachRepository.getPhases(),
          ctaRepository.getCta(),
          footerRepository.getFooter(),
          socialRepository.getSocialLinks(),
          seoRepository.getSeo(),
          assistantRepository.getAssistant(),
        ]);

        // Filter published items where applicable
        const publishedNav = (navRes.data?.items || SEED_PORTFOLIO_PROJECTION.navigation).filter(
          (item) => item.isVisible !== false
        );
        const publishedHero = heroRes.data || SEED_PORTFOLIO_PROJECTION.hero;
        const publishedCards = (cardsRes.data || SEED_PORTFOLIO_PROJECTION.cards).filter(
          (c) => c.isPublished !== false
        );
        const publishedProjects = (projectsRes.data || SEED_PORTFOLIO_PROJECTION.projects).filter(
          (p) => p.isPublished !== false
        );
        const publishedTestimonials = (
          testimonialsRes.data || SEED_PORTFOLIO_PROJECTION.testimonials
        ).filter((t) => t.isPublished !== false);
        const publishedClients = (clientsRes.data || SEED_PORTFOLIO_PROJECTION.clients).filter(
          (c) => c.isPublished !== false
        );
        const publishedExperience = (
          experienceRes.data || SEED_PORTFOLIO_PROJECTION.experience
        ).filter((e) => e.isPublished !== false);
        const publishedPhases = (phasesRes.data || SEED_PORTFOLIO_PROJECTION.phases).filter(
          (p) => p.isPublished !== false
        );
        const publishedCta = ctaRes.data || SEED_PORTFOLIO_PROJECTION.cta;
        const publishedFooter = footerRes.data || SEED_PORTFOLIO_PROJECTION.footer;
        const publishedSocial = (socialRes.data || SEED_PORTFOLIO_PROJECTION.socialLinks).filter(
          (s) => s.isPublished !== false
        );
        const publishedSeo = seoRes.data || SEED_PORTFOLIO_PROJECTION.seo;
        const publishedAssistant = assistantRes.data || SEED_PORTFOLIO_PROJECTION.assistant;

        const projection: PublicPortfolioProjection = {
          navigation: publishedNav,
          hero: publishedHero,
          cards: publishedCards,
          projects: publishedProjects,
          testimonials: publishedTestimonials,
          clients: publishedClients,
          experience: publishedExperience,
          phases: publishedPhases,
          cta: publishedCta,
          footer: publishedFooter,
          socialLinks: publishedSocial,
          seo: publishedSeo,
          assistant: publishedAssistant,
        };

        // Cache in process memory as last-known-good
        lastKnownGoodProjection = projection;

        return projection;
      } catch (err) {
        adminLogger.error("PublicPortfolio:getPublishedPortfolioData", err, "Uncached aggregation failed");

        if (lastKnownGoodProjection) {
          adminLogger.warn("PublicPortfolio:fallback", "Serving process-local last-known-good projection");
          return lastKnownGoodProjection;
        }

        // Cold start fallback
        return SEED_PORTFOLIO_PROJECTION;
      }
    });
  }

  /**
   * Initializes all collections with seed documents if they are empty (non-destructive).
   */
  public async seedAllIfEmpty(): Promise<void> {
    await Promise.all([
      navigationRepository.seedIfEmpty(),
      heroRepository.seedIfEmpty(),
      cardsRepository.seedIfEmpty(),
      projectsRepository.seedIfEmpty(),
      testimonialsRepository.seedIfEmpty(),
      clientsRepository.seedIfEmpty(),
      experienceRepository.seedIfEmpty(),
      approachRepository.seedIfEmpty(),
      ctaRepository.seedIfEmpty(),
      footerRepository.seedIfEmpty(),
      socialRepository.seedIfEmpty(),
      seoRepository.seedIfEmpty(),
      assistantRepository.seedIfEmpty(),
    ]);
  }
}

export const publicPortfolioRepository = new PublicPortfolioRepository();
