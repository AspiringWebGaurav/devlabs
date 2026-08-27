import React from "react";
import { Button } from "@/components/ui/MovingBorders";
import type { ExperienceDocument } from "@/types/portfolio";
import { SEED_EXPERIENCE } from "@/lib/dal/repositories/seed-data";

interface ExperienceSectionProps {
  experience?: ExperienceDocument[];
}

export const ExperienceSection = ({ experience = SEED_EXPERIENCE }: ExperienceSectionProps) => {
  const sortedExperience = [...experience].sort((a, b) => (a.order || 0) - (b.order || 0));

  return (
    <div className="py-20 w-full">
      <h1 className="heading">
        My <span className="text-purple">work experience</span>
      </h1>

      <div className="w-full mt-8 sm:mt-12 grid lg:grid-cols-4 sm:grid-cols-2 grid-cols-1 gap-6 sm:gap-10">
        {sortedExperience.map((card, idx) => (
          <Button
            key={card.id}
            duration={10000 + (idx % 4) * 2500}
            borderRadius="1.75rem"
            style={{
              background: "rgb(4,7,29)",
              backgroundColor:
                "linear-gradient(90deg, rgba(4,7,29,1) 0%, rgba(12,14,35,1) 100%)",
              borderRadius: `calc(1.75rem* 0.96)`,
            }}
            className="flex-1 text-black dark:text-white border-neutral-200 dark:border-slate-800"
          >
            <div className="flex lg:flex-row flex-col lg:items-center p-4 py-6 sm:p-5 lg:p-10 gap-3 sm:gap-2">
              <img
                src={card.thumbnailUrl}
                alt={card.title}
                loading="lazy"
                decoding="async"
                className="lg:w-32 md:w-20 w-16 object-contain"
              />
              <div className="lg:ms-5">
                <h1 className="text-start text-xl md:text-2xl font-bold">
                  {card.title}
                </h1>
                {card.company && (
                  <p className="text-start text-purple text-xs font-mono mt-1">
                    {card.company} {card.period ? `• ${card.period}` : ""}
                  </p>
                )}
                <p className="text-start text-white-100 mt-3 font-semibold text-sm">
                  {card.description}
                </p>
              </div>
            </div>
          </Button>
        ))}
      </div>
    </div>
  );
};
