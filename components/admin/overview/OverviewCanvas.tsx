"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  FaHeading,
  FaTableCellsLarge,
  FaFolderOpen,
  FaQuoteRight,
  FaBuilding,
  FaBriefcase,
  FaDiagramProject,
  FaBars,
  FaShareNodes,
  FaBullhorn,
  FaCopyright,
  FaMagnifyingGlass,
  FaArrowRight,
  FaSeedling,
  FaRotateRight,
  FaCheck,
  FaImages,
  FaEnvelope,
  FaPaperPlane,
} from "react-icons/fa6";

import { seedAllCollectionsAction } from "@/lib/actions/cms.actions";
import { broadcastClientCmsChange } from "@/lib/public-data/client-broadcast";
import { ButtonHelpBadge } from "@/components/admin/ui/ButtonHelpTooltip";
import { BUTTON_HELP } from "@/lib/admin/constants/button-help";

export const OverviewCanvas: React.FC = () => {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [isSeeding, setIsSeeding] = useState(false);
  const [seedMessage, setSeedMessage] = useState<string | null>(null);


  const domains = [
    {
      id: "01",
      title: "Hero & Bio",
      desc: "Headline copy, dynamic subtitle, scroll indicator, and hero CTA button.",
      href: "/admin/hero",
      icon: FaHeading,
      badge: "Singleton",
    },
    {
      id: "02",
      title: "Bento Grid Cards",
      desc: "6-slot modular grid: globe, tech stack pills, collaboration, and email CTA.",
      href: "/admin/cards",
      icon: FaTableCellsLarge,
      badge: "6 Slots",
    },
    {
      id: "03",
      title: "Project Showcase",
      desc: "3D pin cards, live links, github repos, tech icons, and order sequence.",
      href: "/admin/projects",
      icon: FaFolderOpen,
      badge: "Collection",
    },
    {
      id: "04",
      title: "Testimonials",
      desc: "Client recommendations, avatars, company roles, and public display toggles.",
      href: "/admin/testimonials",
      icon: FaQuoteRight,
      badge: "Collection",
    },
    {
      id: "05",
      title: "Client Logos",
      desc: "Partner brand icons, custom width configurations, and corporate links.",
      href: "/admin/clients",
      icon: FaBuilding,
      badge: "Collection",
    },
    {
      id: "06",
      title: "Experience Timeline",
      desc: "Work history cards, role highlights, and corporate engagement records.",
      href: "/admin/experience",
      icon: FaBriefcase,
      badge: "Collection",
    },
    {
      id: "07",
      title: "Work Approach",
      desc: "Phase methodologies, animated canvas speeds, and color palette tags.",
      href: "/admin/approach",
      icon: FaDiagramProject,
      badge: "Collection",
    },
    {
      id: "08",
      title: "Navigation Floating Bar",
      desc: "Header navigation links, reordering sequence, and visibility toggles.",
      href: "/admin/navigation",
      icon: FaBars,
      badge: "Singleton",
    },
    {
      id: "09",
      title: "Social & Footer Links",
      desc: "External profile links, brand presets, and custom SVG path strings.",
      href: "/admin/social",
      icon: FaShareNodes,
      badge: "Collection",
    },
    {
      id: "10",
      title: "Call to Action",
      desc: "Closing CTA banner, highlighted heading words, and contact button copy.",
      href: "/admin/cta",
      icon: FaBullhorn,
      badge: "Singleton",
    },
    {
      id: "11",
      title: "Footer & Legal",
      desc: "Copyright ownership name, Terms of Service, and Privacy Policy links.",
      href: "/admin/footer",
      icon: FaCopyright,
      badge: "Singleton",
    },
    {
      id: "12",
      title: "SEO & Metadata",
      desc: "Page titles, descriptions, canonical URL, Open Graph, and Twitter cards.",
      href: "/admin/seo",
      icon: FaMagnifyingGlass,
      badge: "Singleton",
    },
  ];

  const handleSeed = async () => {
    if (!confirm("Populate any uninitialized collections with baseline portfolio data? (Non-destructive)")) return;
    setIsSeeding(true);
    setSeedMessage(null);

    const res = await seedAllCollectionsAction();
    setIsSeeding(false);

    if (res.success) {
      broadcastClientCmsChange("all");
      startTransition(() => {
        router.refresh();
      });
      setSeedMessage("All 12 CMS domain collections initialized with baseline seed data.");
    } else {
      setSeedMessage("Failed to seed database: " + res.error);
    }
  };

  return (
    <div className="space-y-8 w-full">
      {/* Top Banner: CMS Status & Seed Control */}
      <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-sm p-6 sm:p-7 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
        <div>
          <span className="text-xs font-admin-mono uppercase tracking-[0.2em] text-[#7C3AED] font-bold block">
            PORTFOLIO CMS CONTROL CENTER
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold font-admin-sans text-black mt-1">
            12 Granular Public CMS Content Domains
          </h2>
          <p className="text-sm text-[#475569] mt-1.5 max-w-3xl font-admin-sans leading-relaxed">
            Every section on the public portfolio is driven dynamically from the database.
            Mutations automatically revalidate Next.js cache tags and homepage paths instantly.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={handleSeed}
            disabled={isSeeding}
            className="flex items-center gap-2.5 px-4 py-2.5 bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#E2E8F0] hover:border-[#CBD5E1] text-[#0F172A] text-xs sm:text-sm font-admin-mono font-semibold rounded-sm transition-all cursor-pointer disabled:opacity-60"
          >
            {isSeeding ? (
              <FaRotateRight className="w-4 h-4 animate-spin text-[#7C3AED]" />
            ) : (
              <FaSeedling className="w-4 h-4 text-[#16A34A]" />
            )}
            <span>Seed Baseline Database</span>
            <ButtonHelpBadge text={BUTTON_HELP.SEED_DATABASE} />
          </button>

          <Link
            href="/"
            target="_blank"
            className="flex items-center gap-2.5 px-5 py-2.5 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs sm:text-sm font-admin-mono font-semibold rounded-sm shadow-sm transition-all cursor-pointer"
          >
            <span>View Live Site</span>
            <FaArrowRight className="w-3.5 h-3.5" />
            <ButtonHelpBadge text={BUTTON_HELP.VIEW_LIVE_SITE} />
          </Link>
        </div>
      </div>

      {seedMessage && (
        <div className="p-4 rounded-sm border border-[#86EFAC] bg-[#F0FDF4] text-[#166534] text-sm font-admin-mono flex items-center gap-2.5">
          <FaCheck className="w-4 h-4" />
          <span>{seedMessage}</span>
        </div>
      )}

      {/* 12 Domain Grid: Fluid Responsive 4-Column on Desktop */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 w-full">
        {domains.map((d) => {
          const Icon = d.icon;
          return (
            <Link
              key={d.id}
              href={d.href}
              className="bg-[#FFFFFF] border border-[#E5E7EB] hover:border-[#7C3AED] rounded-sm p-6 shadow-2xs hover:shadow-xs transition-all duration-150 flex flex-col justify-between group min-h-[190px]"
            >
              <div>
                <div className="flex items-center justify-between mb-3.5">
                  <span className="text-xs font-admin-mono font-bold text-[#64748B] group-hover:text-[#7C3AED] transition-colors">
                    DOMAIN {d.id}
                  </span>
                  <span className="px-2.5 py-1 text-[11px] font-admin-mono font-semibold bg-[#F1F5F9] text-[#334155] rounded-xs uppercase">
                    {d.badge}
                  </span>
                </div>

                <div className="flex items-center gap-3 mb-2.5">
                  <Icon className="w-4.5 h-4.5 text-[#7C3AED] shrink-0" />
                  <h3 className="text-base font-bold font-admin-sans text-black group-hover:text-[#7C3AED] transition-colors">
                    {d.title}
                  </h3>
                </div>

                <p className="text-sm text-[#475569] leading-relaxed">
                  {d.desc}
                </p>
              </div>

              <div className="mt-5 pt-3.5 border-t border-[#F8FAFC] flex items-center justify-between text-xs font-admin-mono text-[#7C3AED] font-bold">
                <span>Manage Domain</span>
                <FaArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          );
        })}
      </div>

      {/* Supporting Infrastructure Row: 3 Equal Full-Width Columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-2 w-full">
        <Link
          href="/admin/media"
          className="bg-[#FFFFFF] border border-[#E5E7EB] hover:border-[#CBD5E1] rounded-sm p-6 shadow-2xs flex items-center justify-between group"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-center text-[#7C3AED] shrink-0">
              <FaImages className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-base font-bold font-admin-sans text-black">Media Asset Ledger</h4>
              <p className="text-sm text-[#475569] mt-0.5">Firebase Storage assets, 1:1 ownership, and orphan sweeper.</p>
            </div>
          </div>
          <FaArrowRight className="w-3.5 h-3.5 text-[#94A3B8] group-hover:text-black group-hover:translate-x-1 transition-all shrink-0 ml-3" />
        </Link>

        <Link
          href="/admin/inquiries"
          className="bg-[#FFFFFF] border border-[#E5E7EB] hover:border-[#CBD5E1] rounded-sm p-6 shadow-2xs flex items-center justify-between group"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-center text-[#7C3AED] shrink-0">
              <FaEnvelope className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-base font-bold font-admin-sans text-black">Inquiries & Leads</h4>
              <p className="text-sm text-[#475569] mt-0.5">Contact form messages and Brevo text-first lead dispatch.</p>
            </div>
          </div>
          <FaArrowRight className="w-3.5 h-3.5 text-[#94A3B8] group-hover:text-black group-hover:translate-x-1 transition-all shrink-0 ml-3" />
        </Link>

        <Link
          href="/admin/mail"
          className="bg-[#FFFFFF] border border-[#E5E7EB] hover:border-[#CBD5E1] rounded-sm p-6 shadow-2xs flex items-center justify-between group"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-center text-[#7C3AED] shrink-0">
              <FaPaperPlane className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-base font-bold font-admin-sans text-black">Mail Center</h4>
              <p className="text-sm text-[#475569] mt-0.5">Outbound email client and verified sender domain dispatcher.</p>
            </div>
          </div>
          <FaArrowRight className="w-3.5 h-3.5 text-[#94A3B8] group-hover:text-black group-hover:translate-x-1 transition-all shrink-0 ml-3" />
        </Link>
      </div>
    </div>
  );
};

