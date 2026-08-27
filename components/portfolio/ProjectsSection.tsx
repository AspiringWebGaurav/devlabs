"use client";

import { FaLocationArrow } from "react-icons/fa6";
import { PinContainer } from "@/components/ui/3d-pin";
import type { ProjectDocument } from "@/types/portfolio";
import { SEED_PROJECTS } from "@/lib/dal/repositories/seed-data";

interface ProjectsSectionProps {
  projects?: ProjectDocument[];
}

export const ProjectsSection = ({ projects = SEED_PROJECTS }: ProjectsSectionProps) => {
  const sortedProjects = [...projects].sort((a, b) => (a.order || 0) - (b.order || 0));

  return (
    <div className="py-20">
      <h1 className="heading">
        A small selection of{" "}
        <span className="text-purple">recent projects</span>
      </h1>
      <div className="flex flex-wrap items-center justify-center p-4 gap-x-24 gap-y-8 mt-10">
        {sortedProjects.map(({ id, title, description, coverImage, iconLists, liveUrl }) => (
          <div
            className="sm:h-[41rem] h-[32rem] lg:min-h-[32.5rem] flex items-center justify-center sm:w-[570px] w-[80vw]"
            key={id}
          >
            <PinContainer title={liveUrl} href={liveUrl}>
              <div className="relative flex items-center justify-center sm:w-[570px] w-[80vw] overflow-hidden sm:h-[40vh] h-[30vh] mb-10">
                <div
                  className="relative w-full h-full overflow-hidden lg:rounded-3xl"
                  style={{ backgroundColor: "#13162D" }}
                >
                  <img src="/bg.png" alt="bgimg" loading="lazy" decoding="async" />
                </div>
                <img
                  src={coverImage}
                  alt="cover"
                  loading="lazy"
                  decoding="async"
                  className="z-10 absolute bottom-0 object-contain max-h-full"
                />
              </div>

              <h1 className="font-bold lg:text-2xl md:text-xl text-base line-clamp-1">
                {title}
              </h1>

              <p className="text-white-200 text-sm md:text-base font-normal line-clamp-2 my-2 leading-relaxed">
                {description}
              </p>

              <div className="flex items-center justify-between mt-6 mb-2">
                <div className="flex items-center">
                  {(iconLists || []).map((icon, index) => (
                    <div
                      key={index}
                      className="border border-white/[.15] rounded-full bg-[#04071D] lg:w-9 lg:h-9 w-8 h-8 flex justify-center items-center shadow-sm"
                      style={{
                        transform: `translateX(-${5 * index + 2}px)`,
                      }}
                    >
                      <img src={icon} alt="icon5" loading="lazy" decoding="async" className="p-2" />
                    </div>
                  ))}
                </div>

                <div className="flex justify-center items-center">
                  <a
                    href={liveUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-xs sm:text-sm text-purple hover:text-white transition-colors duration-200 font-medium group/link"
                  >
                    Check Live Site
                    <FaLocationArrow className="w-3 h-3 text-purple group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5 transition-transform duration-200" />
                  </a>
                </div>
              </div>
            </PinContainer>
          </div>
        ))}
      </div>
    </div>
  );
};
