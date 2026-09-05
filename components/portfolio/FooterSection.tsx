"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { FaLocationArrow } from "react-icons/fa6";
import { FaGithub, FaTwitter, FaLinkedin } from "react-icons/fa";

import MagicButton from "@/components/ui/MagicButton";
import { ContactModal } from "@/components/contact/ContactModal";
import type { CtaDocument, FooterDocument, SocialLinkDocument } from "@/types/portfolio";
import { SEED_CTA, SEED_FOOTER, SEED_SOCIAL_LINKS } from "@/lib/dal/repositories/seed-data";

interface FooterSectionProps {
  cta?: CtaDocument;
  footer?: FooterDocument;
  socialLinks?: SocialLinkDocument[];
}

export const FooterSection = ({
  cta = SEED_CTA,
  footer = SEED_FOOTER,
  socialLinks = SEED_SOCIAL_LINKS,
}: FooterSectionProps) => {
  const [isContactOpen, setIsContactOpen] = useState(false);
  const pathname = usePathname();
  const isDirectInitRef = useRef(false);

  // Helper to open the contact form and push /contact to browser address bar
  const handleOpenContact = useCallback(() => {
    setIsContactOpen(true);
    if (typeof window !== "undefined" && window.location.pathname !== "/contact") {
      window.history.pushState({ contactModal: true }, "", "/contact");
    }
  }, []);

  // Helper to close the contact form and cleanly revert the address bar
  const handleCloseContact = useCallback(() => {
    setIsContactOpen(false);
    if (typeof window !== "undefined" && window.location.pathname === "/contact") {
      window.history.replaceState(null, "", "/");
    }
  }, []);

  // Synchronize modal state on initial mount, browser back/forward (popstate), and custom events
  useEffect(() => {
    if (typeof window === "undefined") return;

    const checkShouldOpen = () => {
      const currentPath = window.location.pathname;
      const search = window.location.search;
      const params = new URLSearchParams(search);

      return (
        currentPath === "/contact" ||
        params.get("contact") === "true" ||
        params.get("contact") === "open"
      );
    };

    if (checkShouldOpen() && !isDirectInitRef.current) {
      isDirectInitRef.current = true;
      setIsContactOpen(true);

      // Smoothly anchor background page layout to the contact section
      requestAnimationFrame(() => {
        const el = document.getElementById("contact");
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      });
    }

    // Handle browser Back and Forward navigation smoothly
    const handlePopState = () => {
      const shouldOpen = checkShouldOpen();
      setIsContactOpen(shouldOpen);
    };

    // Support external custom open trigger
    const handleOpenCustom = () => {
      handleOpenContact();
    };

    window.addEventListener("popstate", handlePopState);
    window.addEventListener("open-contact-modal", handleOpenCustom);

    return () => {
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("open-contact-modal", handleOpenCustom);
    };
  }, [handleOpenContact]);

  // Synchronize when Next.js client-side route navigation targets /contact
  useEffect(() => {
    if (pathname === "/contact") {
      setIsContactOpen(true);
    }
  }, [pathname]);

  const sortedSocial = [...socialLinks].sort((a, b) => (a.order || 0) - (b.order || 0));

  const renderSocialIcon = (item: SocialLinkDocument) => {
    if (item.iconType === "custom_path" && item.customPathD) {
      return (
        <svg
          viewBox="0 0 24 24"
          fill="currentColor"
          className="w-5 h-5 text-white group-hover:text-purple transition-colors"
        >
          <path d={item.customPathD} />
        </svg>
      );
    }

    const preset = item.presetName || item.platform.toLowerCase();
    if (preset.includes("github")) {
      return <FaGithub className="w-5 h-5 text-white group-hover:text-purple transition-colors" />;
    }
    if (preset.includes("twitter") || preset.includes("x")) {
      return <FaTwitter className="w-5 h-5 text-white group-hover:text-purple transition-colors" />;
    }
    if (preset.includes("linkedin")) {
      return <FaLinkedin className="w-5 h-5 text-white group-hover:text-purple transition-colors" />;
    }

    // Default fallback icon
    return <Image src="/git.svg" alt={item.platform} width={20} height={20} />;
  };

  return (
    <footer className="w-full pt-20 pb-10">
      {/* Dynamic CTA Banner */}
      {cta.isEnabled !== false && (
        <div className="flex flex-col items-center">
          <h1 className="heading lg:max-w-[45vw]">
            {cta.headingPrefix || "Ready to take "}
            <span className="text-purple">{cta.headingHighlight || "your"}</span>
            {cta.headingSuffix || " digital presence to the next level?"}
          </h1>
          <p className="text-white-200 md:mt-10 my-5 text-center">
            {cta.description ||
              "Reach out to me today and let's discuss how I can help you achieve your goals."}
          </p>
          <MagicButton
            title={cta.buttonText || "Let's get in touch"}
            icon={<FaLocationArrow />}
            position="right"
            handleClick={handleOpenContact}
          />
        </div>
      )}

      {/* Footer Bottom: Copyright, Legal Links, Social Icons */}
      <div className="flex flex-col md:flex-row justify-between items-center w-full mt-20 pt-8 border-t border-white/[0.08] gap-4">
        {/* Left: Copyright & Legal Links */}
        <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5 text-xs sm:text-sm text-neutral-400 font-normal">
          <span>
            © {new Date().getFullYear()} {footer.copyrightName || "Gaurav Patil"}
          </span>
          <span className="text-neutral-600">·</span>
          <Link
            href={footer.termsUrl || "/terms"}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-purple transition-colors duration-200"
          >
            Terms
          </Link>
          <span className="text-neutral-600">·</span>
          <Link
            href={footer.privacyUrl || "/privacy"}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-purple transition-colors duration-200"
          >
            Privacy
          </Link>
          <span className="text-neutral-600">·</span>
          <Link
            href="/chat"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-purple transition-colors duration-200"
          >
            Chat Guide
          </Link>
          <span className="text-neutral-600">·</span>
          <Link
            href="/security"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-purple transition-colors duration-200"
          >
            Security
          </Link>
          <span className="text-neutral-600">·</span>
          <Link
            href="/accessibility"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-purple transition-colors duration-200"
          >
            Accessibility
          </Link>
        </div>

        {/* Right: Social Media Links */}
        <div className="flex items-center justify-center md:justify-end gap-3.5">
          {sortedSocial.map((info) => (
            <a
              key={info.id}
              href={info.url}
              target="_blank"
              rel="noopener noreferrer"
              className="w-11 h-11 min-w-[44px] min-h-[44px] cursor-pointer flex justify-center items-center backdrop-filter backdrop-blur-lg saturate-180 bg-opacity-75 bg-black-200 rounded-lg border border-black-300 hover:border-purple/50 active:scale-95 transition-all duration-200 group touch-manipulation"
              aria-label={`Link to ${info.platform}`}
            >
              {renderSocialIcon(info)}
            </a>
          ))}
        </div>
      </div>

      {/* Dynamic Interactive Contact Modal */}
      <ContactModal
        isOpen={isContactOpen}
        onClose={handleCloseContact}
      />
    </footer>
  );
};
