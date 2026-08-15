"use client";

import { FaLocationArrow, FaChevronDown } from "react-icons/fa6";
import { motion, useScroll, useTransform } from "motion/react";

import MagicButton from "../components/ui/MagicButton";
import { Spotlight } from "./ui/Spotlight";
import { TextGenerateEffect } from "./ui/TextGenerateEffect";

const Hero = () => {
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
      {/**
       *  UI: Spotlights
       *  Link: https://ui.aceternity.com/components/spotlight
       */}
      <div>
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

      {/**
       *  UI: grid
       *  change bg color to bg-black-100 and reduce grid color from
       *  0.2 to 0.03
       */}
      <div
        className="h-screen w-full dark:bg-black-100 bg-white dark:bg-grid-white/[0.03] bg-grid-black-100/[0.2]
       absolute top-0 left-0 flex items-center justify-center"
      >
        {/* Radial gradient for the container to give a faded look */}
        <div
          className="absolute pointer-events-none inset-0 flex items-center justify-center dark:bg-black-100
         bg-white [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]"
        />
      </div>

      <div className="flex justify-center relative my-20 z-10">
        <div className="max-w-[89vw] md:max-w-2xl lg:max-w-[60vw] flex flex-col items-center justify-center">
          <p className="uppercase tracking-widest text-xs text-center text-blue-100 max-w-80">
            Dynamic Web Magic with Next.js
          </p>

          {/**
           *  Link: https://ui.aceternity.com/components/text-generate-effect
           *
           *  change md:text-6xl, add more responsive code
           */}
          <TextGenerateEffect
            words="Transforming Concepts into Seamless User Experiences"
            className="text-center text-[40px] md:text-5xl lg:text-6xl"
          />

          <p className="text-center md:tracking-wider mb-4 text-sm md:text-lg lg:text-2xl text-white-200">
            Hi! I&apos;m Gaurav, a Front-End Developer based in India.
          </p>

          <a
            href="/about"
            onClick={(e) => {
              e.preventDefault();
              handleScrollToAbout();
            }}
          >
            <MagicButton
              title="Show my work"
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
            className="mt-8 sm:mt-12 flex flex-col items-center justify-center cursor-pointer group select-none"
            onClick={handleScrollToAbout}
          >
            <motion.div
              animate={{ y: [0, -4, 0] }}
              transition={{
                duration: 2.5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="flex items-center gap-2.5 sm:gap-3 px-4 sm:px-5 py-2 sm:py-2.5 rounded-full border border-white/[0.12] bg-[#04071D]/80 backdrop-blur-xl hover:border-purple/50 hover:bg-[#0c0e23]/90 transition-all duration-300 shadow-[0_8px_24px_rgba(0,0,0,0.35),0_0_15px_rgba(203,172,249,0.12)] hover:shadow-[0_8px_32px_rgba(0,0,0,0.45),0_0_25px_rgba(203,172,249,0.25)]"
            >
              {/* Animated Sleek Mouse Icon */}
              <div className="w-4 h-6 rounded-full border-[1.5px] border-white-200/50 flex items-start justify-center pt-1 group-hover:border-purple transition-colors">
                <motion.div
                  animate={{
                    y: [0, 5, 0],
                    opacity: [1, 0.35, 1],
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className="w-1 h-1.5 rounded-full bg-purple shadow-[0_0_6px_#CBACF9]"
                />
              </div>

              {/* Refined Letter-Spaced Typography */}
              <span className="text-[10px] sm:text-[11px] uppercase tracking-[0.2em] text-white-200/90 group-hover:text-white transition-colors font-medium">
                Scroll to explore
              </span>

              {/* Pulsing Chevron Indicator */}
              <motion.div
                animate={{ y: [0, 2, 0] }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                <FaChevronDown className="w-2.5 h-2.5 text-purple/80 group-hover:text-purple transition-colors" />
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Hero;