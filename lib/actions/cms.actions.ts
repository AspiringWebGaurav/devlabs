"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { assertSuperadminSession } from "@/lib/admin/session";
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
  mediaRepository,
  publicPortfolioRepository,
} from "@/lib/dal/repositories";
import { emitCmsChangeSignal } from "@/lib/dal/repositories/live-sync.service";
import {
  HeroUpdateSchema,
  BentoCardUpdateSchema,
  ProjectSchema,
  TestimonialSchema,
  ClientSchema,
  ExperienceSchema,
  PhaseSchema,
  NavigationUpdateSchema,
  SocialLinkSchema,
  CtaUpdateSchema,
  FooterUpdateSchema,
  SeoUpdateSchema,
  AssistantUpdateSchema,
  ReorderSchema,
} from "@/lib/admin/schemas/cms.schema";
import { storageDataSource } from "@/lib/dal/datasource/storage";

// Standard action result type
export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// ============================================================================
// 1. HERO ACTIONS
// ============================================================================
export async function updateHeroAction(formData: unknown): Promise<ActionResult> {
  try {
    await assertSuperadminSession();
    const validated = HeroUpdateSchema.parse(formData);
    const result = await heroRepository.updateHero(validated);
    if (!result.success || !result.data) throw new Error(result.error || "Failed to update Hero");

    revalidateTag("portfolio-cms");
    revalidateTag("portfolio-hero");
    revalidatePath("/");
    await emitCmsChangeSignal("hero", result.data.version);
    return { success: true, data: result.data };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Error updating Hero" };
  }
}

// ============================================================================
// 2. BENTO CARDS ACTIONS
// ============================================================================
export async function updateCardAction(docId: string, formData: unknown): Promise<ActionResult> {
  try {
    await assertSuperadminSession();
    const validated = BentoCardUpdateSchema.parse(formData);
    const result = await cardsRepository.updateCard(docId, validated);
    if (!result.success || !result.data) throw new Error(result.error || "Failed to update Bento Card");

    revalidateTag("portfolio-cms");
    revalidateTag("portfolio-cards");
    revalidatePath("/");
    await emitCmsChangeSignal("cards", result.data.version);
    return { success: true, data: result.data };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Error updating Bento Card" };
  }
}

export async function resetCardAction(slotIndex: number): Promise<ActionResult> {
  try {
    await assertSuperadminSession();
    const result = await cardsRepository.resetCardToDefault(slotIndex);
    if (!result.success || !result.data) throw new Error(result.error || "Failed to reset Card");

    revalidateTag("portfolio-cms");
    revalidateTag("portfolio-cards");
    revalidatePath("/");
    await emitCmsChangeSignal("cards", result.data.version);
    return { success: true, data: result.data };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Error resetting Card" };
  }
}

// ============================================================================
// 3. PROJECTS ACTIONS
// ============================================================================
export async function createProjectAction(formData: unknown): Promise<ActionResult> {
  try {
    await assertSuperadminSession();
    const validated = ProjectSchema.parse(formData);
    const result = await projectsRepository.createProject(validated);
    if (!result.success || !result.data) throw new Error(result.error || "Failed to create Project");

    revalidateTag("portfolio-cms");
    revalidateTag("portfolio-projects");
    revalidatePath("/");
    await emitCmsChangeSignal("projects", result.data.version);
    return { success: true, data: result.data };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Error creating Project" };
  }
}

export async function updateProjectAction(id: string, formData: unknown): Promise<ActionResult> {
  try {
    await assertSuperadminSession();
    const validated = ProjectSchema.partial().parse(formData);
    const result = await projectsRepository.updateProject(id, validated);
    if (!result.success || !result.data) throw new Error(result.error || "Failed to update Project");

    revalidateTag("portfolio-cms");
    revalidateTag("portfolio-projects");
    revalidatePath("/");
    await emitCmsChangeSignal("projects", result.data.version);
    return { success: true, data: result.data };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Error updating Project" };
  }
}

export async function deleteProjectAction(id: string): Promise<ActionResult> {
  try {
    await assertSuperadminSession();
    const result = await projectsRepository.deleteProject(id);
    if (!result.success) throw new Error(result.error || "Failed to delete Project");

    revalidateTag("portfolio-cms");
    revalidateTag("portfolio-projects");
    revalidatePath("/");
    await emitCmsChangeSignal("projects");
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Error deleting Project" };
  }
}

export async function reorderProjectsAction(orderedIds: string[]): Promise<ActionResult> {
  try {
    await assertSuperadminSession();
    const validated = ReorderSchema.parse({ orderedIds });
    const result = await projectsRepository.reorderProjects(validated.orderedIds);
    if (!result.success) throw new Error(result.error || "Failed to reorder Projects");

    revalidateTag("portfolio-cms");
    revalidateTag("portfolio-projects");
    revalidatePath("/");
    await emitCmsChangeSignal("projects");
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Error reordering Projects" };
  }
}

// ============================================================================
// 4. TESTIMONIALS ACTIONS
// ============================================================================
export async function createTestimonialAction(formData: unknown): Promise<ActionResult> {
  try {
    await assertSuperadminSession();
    const validated = TestimonialSchema.parse(formData);
    const result = await testimonialsRepository.createTestimonial(validated);
    if (!result.success || !result.data) throw new Error(result.error || "Failed to create Testimonial");

    revalidateTag("portfolio-cms");
    revalidateTag("portfolio-testimonials");
    revalidatePath("/");
    await emitCmsChangeSignal("testimonials", result.data.version);
    return { success: true, data: result.data };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Error creating Testimonial" };
  }
}

export async function updateTestimonialAction(id: string, formData: unknown): Promise<ActionResult> {
  try {
    await assertSuperadminSession();
    const validated = TestimonialSchema.partial().parse(formData);
    const result = await testimonialsRepository.updateTestimonial(id, validated);
    if (!result.success || !result.data) throw new Error(result.error || "Failed to update Testimonial");

    revalidateTag("portfolio-cms");
    revalidateTag("portfolio-testimonials");
    revalidatePath("/");
    await emitCmsChangeSignal("testimonials", result.data.version);
    return { success: true, data: result.data };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Error updating Testimonial" };
  }
}

export async function deleteTestimonialAction(id: string): Promise<ActionResult> {
  try {
    await assertSuperadminSession();
    const result = await testimonialsRepository.deleteTestimonial(id);
    if (!result.success) throw new Error(result.error || "Failed to delete Testimonial");

    revalidateTag("portfolio-cms");
    revalidateTag("portfolio-testimonials");
    revalidatePath("/");
    await emitCmsChangeSignal("testimonials");
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Error deleting Testimonial" };
  }
}

export async function reorderTestimonialsAction(orderedIds: string[]): Promise<ActionResult> {
  try {
    await assertSuperadminSession();
    const validated = ReorderSchema.parse({ orderedIds });
    const result = await testimonialsRepository.reorderTestimonials(validated.orderedIds);
    if (!result.success) throw new Error(result.error || "Failed to reorder Testimonials");

    revalidateTag("portfolio-cms");
    revalidateTag("portfolio-testimonials");
    revalidatePath("/");
    await emitCmsChangeSignal("testimonials");
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Error reordering Testimonials" };
  }
}

// ============================================================================
// 5. CLIENT LOGOS ACTIONS
// ============================================================================
export async function createClientAction(formData: unknown): Promise<ActionResult> {
  try {
    await assertSuperadminSession();
    const validated = ClientSchema.parse(formData);
    const result = await clientsRepository.createClient(validated);
    if (!result.success || !result.data) throw new Error(result.error || "Failed to create Client");

    revalidateTag("portfolio-cms");
    revalidateTag("portfolio-clients");
    revalidatePath("/");
    await emitCmsChangeSignal("clients", result.data.version);
    return { success: true, data: result.data };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Error creating Client" };
  }
}

export async function updateClientAction(id: string, formData: unknown): Promise<ActionResult> {
  try {
    await assertSuperadminSession();
    const validated = ClientSchema.partial().parse(formData);
    const result = await clientsRepository.updateClient(id, validated);
    if (!result.success || !result.data) throw new Error(result.error || "Failed to update Client");

    revalidateTag("portfolio-cms");
    revalidateTag("portfolio-clients");
    revalidatePath("/");
    await emitCmsChangeSignal("clients", result.data.version);
    return { success: true, data: result.data };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Error updating Client" };
  }
}

export async function deleteClientAction(id: string): Promise<ActionResult> {
  try {
    await assertSuperadminSession();
    const result = await clientsRepository.deleteClient(id);
    if (!result.success) throw new Error(result.error || "Failed to delete Client");

    revalidateTag("portfolio-cms");
    revalidateTag("portfolio-clients");
    revalidatePath("/");
    await emitCmsChangeSignal("clients");
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Error deleting Client" };
  }
}

export async function reorderClientsAction(orderedIds: string[]): Promise<ActionResult> {
  try {
    await assertSuperadminSession();
    const validated = ReorderSchema.parse({ orderedIds });
    const result = await clientsRepository.reorderClients(validated.orderedIds);
    if (!result.success) throw new Error(result.error || "Failed to reorder Clients");

    revalidateTag("portfolio-cms");
    revalidateTag("portfolio-clients");
    revalidatePath("/");
    await emitCmsChangeSignal("clients");
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Error reordering Clients" };
  }
}

// ============================================================================
// 6. WORK EXPERIENCE ACTIONS
// ============================================================================
export async function createExperienceAction(formData: unknown): Promise<ActionResult> {
  try {
    await assertSuperadminSession();
    const validated = ExperienceSchema.parse(formData);
    const result = await experienceRepository.createExperience(validated);
    if (!result.success || !result.data) throw new Error(result.error || "Failed to create Experience");

    revalidateTag("portfolio-cms");
    revalidateTag("portfolio-experience");
    revalidatePath("/");
    await emitCmsChangeSignal("experience", result.data.version);
    return { success: true, data: result.data };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Error creating Experience" };
  }
}

export async function updateExperienceAction(id: string, formData: unknown): Promise<ActionResult> {
  try {
    await assertSuperadminSession();
    const validated = ExperienceSchema.partial().parse(formData);
    const result = await experienceRepository.updateExperience(id, validated);
    if (!result.success || !result.data) throw new Error(result.error || "Failed to update Experience");

    revalidateTag("portfolio-cms");
    revalidateTag("portfolio-experience");
    revalidatePath("/");
    await emitCmsChangeSignal("experience", result.data.version);
    return { success: true, data: result.data };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Error updating Experience" };
  }
}

export async function deleteExperienceAction(id: string): Promise<ActionResult> {
  try {
    await assertSuperadminSession();
    const result = await experienceRepository.deleteExperience(id);
    if (!result.success) throw new Error(result.error || "Failed to delete Experience");

    revalidateTag("portfolio-cms");
    revalidateTag("portfolio-experience");
    revalidatePath("/");
    await emitCmsChangeSignal("experience");
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Error deleting Experience" };
  }
}

export async function reorderExperienceAction(orderedIds: string[]): Promise<ActionResult> {
  try {
    await assertSuperadminSession();
    const validated = ReorderSchema.parse({ orderedIds });
    const result = await experienceRepository.reorderExperience(validated.orderedIds);
    if (!result.success) throw new Error(result.error || "Failed to reorder Experience");

    revalidateTag("portfolio-cms");
    revalidateTag("portfolio-experience");
    revalidatePath("/");
    await emitCmsChangeSignal("experience");
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Error reordering Experience" };
  }
}

// ============================================================================
// 7. PROCESS PHASES ACTIONS
// ============================================================================
export async function createPhaseAction(formData: unknown): Promise<ActionResult> {
  try {
    await assertSuperadminSession();
    const validated = PhaseSchema.parse(formData);
    const result = await approachRepository.createPhase(validated);
    if (!result.success || !result.data) throw new Error(result.error || "Failed to create Phase");

    revalidateTag("portfolio-cms");
    revalidateTag("portfolio-approach");
    revalidatePath("/");
    await emitCmsChangeSignal("approach", result.data.version);
    return { success: true, data: result.data };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Error creating Phase" };
  }
}

export async function updatePhaseAction(id: string, formData: unknown): Promise<ActionResult> {
  try {
    await assertSuperadminSession();
    const validated = PhaseSchema.partial().parse(formData);
    const result = await approachRepository.updatePhase(id, validated);
    if (!result.success || !result.data) throw new Error(result.error || "Failed to update Phase");

    revalidateTag("portfolio-cms");
    revalidateTag("portfolio-approach");
    revalidatePath("/");
    await emitCmsChangeSignal("approach", result.data.version);
    return { success: true, data: result.data };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Error updating Phase" };
  }
}

export async function deletePhaseAction(id: string): Promise<ActionResult> {
  try {
    await assertSuperadminSession();
    const result = await approachRepository.deletePhase(id);
    if (!result.success) throw new Error(result.error || "Failed to delete Phase");

    revalidateTag("portfolio-cms");
    revalidateTag("portfolio-approach");
    revalidatePath("/");
    await emitCmsChangeSignal("approach");
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Error deleting Phase" };
  }
}

export async function reorderPhasesAction(orderedIds: string[]): Promise<ActionResult> {
  try {
    await assertSuperadminSession();
    const validated = ReorderSchema.parse({ orderedIds });
    const result = await approachRepository.reorderPhases(validated.orderedIds);
    if (!result.success) throw new Error(result.error || "Failed to reorder Phases");

    revalidateTag("portfolio-cms");
    revalidateTag("portfolio-approach");
    revalidatePath("/");
    await emitCmsChangeSignal("approach");
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Error reordering Phases" };
  }
}

// ============================================================================
// 8. NAVIGATION ACTIONS
// ============================================================================
export async function updateNavigationAction(formData: unknown): Promise<ActionResult> {
  try {
    await assertSuperadminSession();
    const validated = NavigationUpdateSchema.parse(formData);
    const result = await navigationRepository.updateNavigation(validated.items);
    if (!result.success || !result.data) throw new Error(result.error || "Failed to update Navigation");

    revalidateTag("portfolio-cms");
    revalidateTag("portfolio-nav");
    revalidatePath("/");
    await emitCmsChangeSignal("navigation", result.data.version);
    return { success: true, data: result.data };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Error updating Navigation" };
  }
}

// ============================================================================
// 9. SOCIAL LINKS ACTIONS
// ============================================================================
export async function createSocialLinkAction(formData: unknown): Promise<ActionResult> {
  try {
    await assertSuperadminSession();
    const validated = SocialLinkSchema.parse(formData);
    const result = await socialRepository.createSocialLink({
      ...validated,
      order: 99,
    });
    if (!result.success || !result.data) throw new Error(result.error || "Failed to create Social Link");

    revalidateTag("portfolio-cms");
    revalidateTag("portfolio-social");
    revalidatePath("/");
    await emitCmsChangeSignal("social", result.data.version);
    return { success: true, data: result.data };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Error creating Social Link" };
  }
}

export async function updateSocialLinkAction(id: string, formData: unknown): Promise<ActionResult> {
  try {
    await assertSuperadminSession();
    const validated = SocialLinkSchema.partial().parse(formData);
    const result = await socialRepository.updateSocialLink(id, validated);
    if (!result.success || !result.data) throw new Error(result.error || "Failed to update Social Link");

    revalidateTag("portfolio-cms");
    revalidateTag("portfolio-social");
    revalidatePath("/");
    await emitCmsChangeSignal("social", result.data.version);
    return { success: true, data: result.data };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Error updating Social Link" };
  }
}

export async function deleteSocialLinkAction(id: string): Promise<ActionResult> {
  try {
    await assertSuperadminSession();
    const result = await socialRepository.deleteSocialLink(id);
    if (!result.success) throw new Error(result.error || "Failed to delete Social Link");

    revalidateTag("portfolio-cms");
    revalidateTag("portfolio-social");
    revalidatePath("/");
    await emitCmsChangeSignal("social");
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Error deleting Social Link" };
  }
}

export async function reorderSocialLinksAction(orderedIds: string[]): Promise<ActionResult> {
  try {
    await assertSuperadminSession();
    const validated = ReorderSchema.parse({ orderedIds });
    const result = await socialRepository.reorderSocialLinks(validated.orderedIds);
    if (!result.success) throw new Error(result.error || "Failed to reorder Social Links");

    revalidateTag("portfolio-cms");
    revalidateTag("portfolio-social");
    revalidatePath("/");
    await emitCmsChangeSignal("social");
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Error reordering Social Links" };
  }
}

// ============================================================================
// 10. CTA ACTIONS
// ============================================================================
export async function updateCtaAction(formData: unknown): Promise<ActionResult> {
  try {
    await assertSuperadminSession();
    const validated = CtaUpdateSchema.parse(formData);
    const result = await ctaRepository.updateCta(validated);
    if (!result.success || !result.data) throw new Error(result.error || "Failed to update CTA");

    revalidateTag("portfolio-cms");
    revalidateTag("portfolio-cta");
    revalidatePath("/");
    await emitCmsChangeSignal("cta", result.data.version);
    return { success: true, data: result.data };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Error updating CTA" };
  }
}

// ============================================================================
// 11. FOOTER ACTIONS
// ============================================================================
export async function updateFooterAction(formData: unknown): Promise<ActionResult> {
  try {
    await assertSuperadminSession();
    const validated = FooterUpdateSchema.parse(formData);
    const result = await footerRepository.updateFooter(validated);
    if (!result.success || !result.data) throw new Error(result.error || "Failed to update Footer");

    revalidateTag("portfolio-cms");
    revalidateTag("portfolio-footer");
    revalidatePath("/");
    await emitCmsChangeSignal("footer", result.data.version);
    return { success: true, data: result.data };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Error updating Footer" };
  }
}

// ============================================================================
// 12. SEO ACTIONS
// ============================================================================
export async function updateSeoAction(formData: unknown): Promise<ActionResult> {
  try {
    await assertSuperadminSession();
    const validated = SeoUpdateSchema.parse(formData);
    const result = await seoRepository.updateSeo(validated);
    if (!result.success || !result.data) throw new Error(result.error || "Failed to update SEO");

    revalidateTag("portfolio-cms");
    revalidatePath("/");
    await emitCmsChangeSignal("seo", result.data.version);
    return { success: true, data: result.data };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Error updating SEO" };
  }
}

// ============================================================================
// MEDIA & ORPHAN SWEEPER ACTIONS
// ============================================================================
export async function uploadMediaAction(formData: FormData): Promise<ActionResult> {
  try {
    const session = await assertSuperadminSession();
    const file = formData.get("file") as File;
    const folder = (formData.get("folder") as string) || "uploads";

    if (!file) throw new Error("No file provided for upload");

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const fileName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const storagePath = `${folder}/${Date.now()}_${fileName}`;

    const uploadRes = await storageDataSource.uploadBuffer(storagePath, buffer, {
      contentType: file.type || "application/octet-stream",
    });

    const ledgerRes = await mediaRepository.registerUpload({
      fileName: file.name,
      storagePath: uploadRes.storagePath,
      publicUrl: uploadRes.publicUrl,
      mimeType: uploadRes.mimeType,
      sizeBytes: uploadRes.sizeBytes,
      uploadedByAdmin: session.email,
    });

    return { success: true, data: ledgerRes.data };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Error uploading media" };
  }
}

export async function sweepOrphansAction(retentionHours = 24): Promise<ActionResult> {
  try {
    await assertSuperadminSession();
    const result = await mediaRepository.sweepOrphans(retentionHours);
    return { success: true, data: result.data };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Error sweeping orphans" };
  }
}

export async function seedAllCollectionsAction(): Promise<ActionResult> {
  try {
    await assertSuperadminSession();
    await publicPortfolioRepository.seedAllIfEmpty();
    revalidateTag("portfolio-cms");
    revalidatePath("/");
    await emitCmsChangeSignal("all");
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Error seeding collections" };
  }
}

// ============================================================================
// GLOBAL NUCLEAR REFRESH ACTION
// ============================================================================
export interface GlobalRefreshResult {
  timestamp: number;
  revalidatedTags: string[];
  revalidatedPaths: string[];
  signalStatus: "full" | "degraded" | "failed";
  rtdbDispatched: boolean;
  firestoreDispatched: boolean;
}

// ============================================================================
// 13. ASSISTANT ACTIONS
// ============================================================================
export async function updateAssistantAction(formData: unknown): Promise<ActionResult> {
  try {
    await assertSuperadminSession();
    const validated = AssistantUpdateSchema.parse(formData);
    const result = await assistantRepository.updateAssistant(validated);
    if (!result.success || !result.data) throw new Error(result.error || "Failed to update Assistant settings");

    revalidateTag("portfolio-cms");
    revalidateTag("portfolio-assistant");
    revalidatePath("/");
    revalidatePath("/admin/assistant");
    await emitCmsChangeSignal("assistant", result.data.version);
    return { success: true, data: result.data };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to update Assistant settings" };
  }
}

/**
 * Executes an authenticated global cache revalidation and realtime fleet synchronization.
 * Invalidates Next.js Data Cache tags, App Router route/layout caches, and dispatches
 * the realtime change signal across Firebase RTDB and Firestore.
 */
export async function globalNuclearRefreshAction(): Promise<ActionResult<GlobalRefreshResult>> {
  try {
    await assertSuperadminSession();

    // 1. Invalidate Next.js Data Cache for public aggregator
    revalidateTag("portfolio-cms");

    // 2. Invalidate Next.js Full Route Caches & Admin layout cache
    revalidatePath("/", "page");
    revalidatePath("/terms", "page");
    revalidatePath("/privacy", "page");
    revalidatePath("/admin", "layout");

    // 3. Emit Realtime Fleet Signal (RTDB + Firestore fallback)
    const signalResult = await emitCmsChangeSignal("all");

    let signalStatus: "full" | "degraded" | "failed" = "failed";
    if (signalResult.rtdb && signalResult.firestore) {
      signalStatus = "full";
    } else if (signalResult.rtdb || signalResult.firestore) {
      signalStatus = "degraded";
    }

    // If both realtime signaling paths failed, report failure accurately
    if (signalStatus === "failed") {
      return {
        success: false,
        error: "Server caches invalidated, but all realtime signaling channels failed to dispatch.",
        data: {
          timestamp: signalResult.timestamp,
          revalidatedTags: ["portfolio-cms"],
          revalidatedPaths: ["/", "/terms", "/privacy", "/admin"],
          signalStatus,
          rtdbDispatched: false,
          firestoreDispatched: false,
        },
      };
    }

    return {
      success: true,
      data: {
        timestamp: signalResult.timestamp,
        revalidatedTags: ["portfolio-cms"],
        revalidatedPaths: ["/", "/terms", "/privacy", "/admin"],
        signalStatus,
        rtdbDispatched: signalResult.rtdb,
        firestoreDispatched: signalResult.firestore,
      },
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Global refresh failed",
    };
  }
}


