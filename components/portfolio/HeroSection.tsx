"use client";

import { FaLocationArrow, FaChevronDown } from "react-icons/fa6";
import { motion, useScroll, useTransform } from "motion/react";

import MagicButton from "@/components/ui/MagicButton";
import { Spotlight } from "@/components/ui/Spotlight";
import { TextGenerateEffect } from "@/components/ui/TextGenerateEffect";
import type { HeroDocument } from "@/types/portfolio";
import { SEED_HERO } from "@/lib/dal/repositories/seed-data";

interface HeroSectionProps {
  data?: HeroDocument;
}

export const HeroSection = ({ data = SEED_HERO }: HeroSectionProps) => {
  const { scrollY } = useScroll();
  const indicatorOpacity = useTransform(scrollY, [0, 100], [1, 0]);
  const indicatorY = useTransform(scrollY, [0, 100], [0, 20]);
  const indicatorScale = useTransform(scrollY, [0, 100], [1, 0.9]);

  const handleScrollToAbout = () => {
    window.dispatchEvent(
      new CustomEvent("nav-scroll-start", {
        detail: { link: "/about" },
      })
    );
    document
      .getElementById("about")
      ?.scrollIntoView({ behavior: "smooth" });
    window.history.replaceState(null, "", "/about");
  };

  return (
    <div className="pb-12 pt-28 md:pb-16 md:pt-36 relative">
      {/* Spotlights */}
      <div className="pointer-events-none select-none">
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

      {/* Grid Pattern Background */}
      <div
        className="h-screen w-full dark:bg-black-100 bg-white dark:bg-grid-white/[0.03] bg-grid-black-100/[0.2]
       absolute top-0 left-0 flex items-center justify-center pointer-events-none"
      >
        <div
          className="absolute pointer-events-none inset-0 flex items-center justify-center dark:bg-black-100
         bg-white [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]"
        />
      </div>

      <div className="flex justify-center relative my-20 z-10">
        <div className="max-w-[89vw] md:max-w-2xl lg:max-w-[60vw] flex flex-col items-center justify-center">
          <p className="uppercase tracking-widest text-xs text-center text-blue-100 max-w-80">
            {data.eyebrow || SEED_HERO.eyebrow}
          </p>

          <TextGenerateEffect
            words={data.headingWords || SEED_HERO.headingWords}
            className="text-center text-[40px] md:text-5xl lg:text-6xl"
          />

          <p className="text-center md:tracking-wider mb-4 text-sm md:text-lg lg:text-2xl text-white-200">
            {data.description || SEED_HERO.description}
          </p>

          <a
            href={data.ctaLink || SEED_HERO.ctaLink}
            onClick={(e) => {
              if ((data.ctaLink || "").startsWith("#") || (data.ctaLink || "").startsWith("/")) {
                e.preventDefault();
                handleScrollToAbout();
              }
            }}
          >
            <MagicButton
              title={data.ctaTitle || SEED_HERO.ctaTitle}
              icon={<FaLocationArrow />}
              position="right"
            />
          </a>

          {/* Dynamic Scroll-Down Indicator */}
          <motion.div
            style={{
              opacity: indicatorOpacity,
              y: indicatorY,
              scale: indicatorScale,
            }}
            className="mt-8 md:mt-10 flex flex-col items-center gap-2 cursor-pointer select-none group"
            onClick={handleScrollToAbout}
          >
            <span className="text-[10px] md:text-xs font-mono uppercase tracking-[0.25em] text-[#BEC1DD]/60 group-hover:text-purple transition-colors duration-300">
              {data.scrollText || SEED_HERO.scrollText}
            </span>
            <div className="w-5 h-8 md:w-6 md:h-9 rounded-full border border-white/20 group-hover:border-purple/50 flex justify-center items-start p-1 transition-colors duration-300">
              <motion.div
                animate={{
                  y: [0, 8, 0],
                  opacity: [0.8, 0.2, 0.8],
                }}
                transition={{
                  duration: 1.6,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="w-1 md:w-1.5 h-1 md:h-1.5 rounded-full bg-purple"
              />
            </div>
            <motion.div
              animate={{
                y: [0, 3, 0],
              }}
              transition={{
                duration: 1.2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              <FaChevronDown className="w-3 h-3 text-[#BEC1DD]/40 group-hover:text-purple transition-colors duration-300" />
            </motion.div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};
