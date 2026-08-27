"use client";

import React from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "motion/react";
import type { PhaseDocument } from "@/types/portfolio";
import { SEED_PHASES } from "@/lib/dal/repositories/seed-data";

const CanvasRevealEffect = dynamic(
  () => import("@/components/ui/CanvasRevealEffect").then((mod) => mod.CanvasRevealEffect),
  { ssr: false }
);

interface ApproachSectionProps {
  phases?: PhaseDocument[];
}

const THEME_CONFIGS: Record<
  string,
  { containerClassName: string; colors?: number[][]; dotSize?: number }
> = {
  emerald: {
    containerClassName: "bg-emerald-900 rounded-3xl overflow-hidden",
  },
  pink: {
    containerClassName: "bg-pink-900 rounded-3xl overflow-hidden",
    colors: [
      [255, 166, 158],
      [221, 255, 247],
    ],
    dotSize: 2,
  },
  sky: {
    containerClassName: "bg-sky-600 rounded-3xl overflow-hidden",
    colors: [[125, 211, 252]],
  },
  violet: {
    containerClassName: "bg-violet-900 rounded-3xl overflow-hidden",
    colors: [[196, 181, 253]],
  },
  amber: {
    containerClassName: "bg-amber-900 rounded-3xl overflow-hidden",
    colors: [[252, 211, 77]],
  },
};

export const ApproachSection = ({ phases = SEED_PHASES }: ApproachSectionProps) => {
  const sortedPhases = [...phases].sort((a, b) => (a.order || 0) - (b.order || 0));

  return (
    <section className="w-full py-20">
      <h1 className="heading">
        My <span className="text-purple">approach</span>
      </h1>
      <div className="my-20 flex flex-col lg:flex-row items-center justify-center w-full gap-4">
        {sortedPhases.map((phase) => {
          const theme = THEME_CONFIGS[phase.themeColor] || THEME_CONFIGS.emerald;
          const speed = Math.max(0.1, Math.min(10.0, phase.animationSpeed || 3.0));

          return (
            <Card
              key={phase.id}
              title={phase.title}
              icon={<AceternityIcon order={phase.phaseBadge || `Phase ${phase.order}`} />}
              des={phase.description}
              renderCanvas={() => (
                <CanvasRevealEffect
                  animationSpeed={speed}
                  containerClassName={theme.containerClassName}
                  colors={theme.colors}
                  dotSize={theme.dotSize}
                />
              )}
            />
          );
        })}
      </div>
    </section>
  );
};

const Card = ({
  title,
  icon,
  children,
  renderCanvas,
  des,
}: {
  title: string;
  icon: React.ReactNode;
  children?: React.ReactNode;
  renderCanvas?: () => React.ReactNode;
  des: string;
}) => {
  const [hovered, setHovered] = React.useState(false);
  const [mobileActive, setMobileActive] = React.useState(false);

  const isRevealed = hovered || mobileActive;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => setMobileActive((prev) => !prev)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setMobileActive((prev) => !prev);
        }
      }}
      aria-expanded={isRevealed}
      className="border border-black/[0.2] group/canvas-card flex items-center justify-center dark:border-white/[0.2] max-w-sm w-full mx-auto p-4 relative lg:h-[35rem] min-h-[18rem] rounded-3xl cursor-pointer select-none touch-manipulation transition-all duration-300 active:scale-[0.99]"
      style={{
        background: "rgb(4,7,29)",
        backgroundColor:
          "linear-gradient(90deg, rgba(4,7,29,1) 0%, rgba(12,14,35,1) 100%)",
      }}
    >
      <Icon className="absolute h-10 w-10 -top-3 -left-3 dark:text-white text-black opacity-30 pointer-events-none" />
      <Icon className="absolute h-10 w-10 -bottom-3 -left-3 dark:text-white text-black opacity-30 pointer-events-none" />
      <Icon className="absolute h-10 w-10 -top-3 -right-3 dark:text-white text-black opacity-30 pointer-events-none" />
      <Icon className="absolute h-10 w-10 -bottom-3 -right-3 dark:text-white text-black opacity-30 pointer-events-none" />

      <AnimatePresence>
        {isRevealed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="h-full w-full absolute inset-0 pointer-events-none overflow-hidden rounded-3xl"
          >
            {renderCanvas ? renderCanvas() : children}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative z-20 px-6 sm:px-10 pointer-events-none">
        <div
          className={`text-center absolute top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2 min-w-40 mx-auto flex items-center justify-center transition-all duration-300 ${
            isRevealed ? "opacity-0 -translate-y-4 scale-95" : "opacity-100 translate-y-0 scale-100"
          }`}
        >
          {icon}
        </div>
        <h2
          className={`dark:text-white text-center text-2xl sm:text-3xl relative z-10 font-bold transition-all duration-300 ${
            isRevealed ? "opacity-100 -translate-y-2 text-white" : "opacity-0 translate-y-2"
          }`}
        >
          {title}
        </h2>
        <p
          className={`text-xs sm:text-sm relative z-10 mt-4 text-center transition-all duration-300 leading-relaxed ${
            isRevealed ? "opacity-100 -translate-y-2 text-[#E4ECFF]" : "opacity-0 translate-y-2"
          }`}
          style={{ color: "#E4ECFF" }}
        >
          {des}
        </p>
      </div>
    </div>
  );
};

const AceternityIcon = ({ order }: { order: string }) => {
  return (
    <div>
      <div className="relative inline-flex overflow-hidden rounded-full p-[1.5px] border border-white/20 shadow-md">
        <span className="absolute inset-[-1000%] animate-[spin_3s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#E2CBFF_0%,#7C3AED_50%,#E2CBFF_100%)] opacity-80" />
        <span className="inline-flex h-full w-full cursor-pointer items-center justify-center rounded-full bg-slate-950 px-5 py-2.5 text-purple backdrop-blur-3xl font-bold text-xl sm:text-2xl">
          {order}
        </span>
      </div>
    </div>
  );
};

export const Icon = ({
  className,
  ...rest
}: React.SVGProps<SVGSVGElement>) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth="1.5"
      stroke="currentColor"
      className={className}
      {...rest}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m6-6H6" />
    </svg>
  );
};
