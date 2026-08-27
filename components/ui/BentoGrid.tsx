"use client";
import { useState, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import { IoCopyOutline } from "react-icons/io5";

const Lottie = dynamic(() => import("lottie-react"), { ssr: false });

import { cn } from "@/lib/utils";

import { BackgroundGradientAnimation } from "./GradientBg";
import GridGlobe from "./GridGlobe";
import animationData from "@/data/confetti.json";
import MagicButton from "./MagicButton";
import type { BentoCardType, BentoGridSpanVariant, BentoVisualLayout } from "@/types/portfolio";

export const BentoGrid = ({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) => {
  return (
    <div
      className={cn(
        "grid grid-cols-1 md:grid-cols-6 lg:grid-cols-5 md:grid-row-7 gap-4 lg:gap-8 mx-auto",
        className
      )}
    >
      {children}
    </div>
  );
};

export interface BentoGridItemProps {
  className?: string;
  id: number | string;
  slotIndex?: number;
  cardType?: BentoCardType;
  gridSpanVariant?: BentoGridSpanVariant;
  visualLayout?: BentoVisualLayout;
  title?: string | React.ReactNode;
  description?: string | React.ReactNode;
  img?: string;
  imgClassName?: string;
  titleClassName?: string;
  spareImg?: string;
  techStackLeft?: string[];
  techStackRight?: string[];
  ctaEmail?: string;
}

export const BentoGridItem = ({
  className,
  id,
  slotIndex,
  cardType,
  title,
  description,
  img,
  imgClassName,
  titleClassName,
  spareImg,
  techStackLeft = ["ReactJS", "Express", "Typescript"],
  techStackRight = ["VueJS", "NuxtJS", "GraphQL"],
  ctaEmail = "hello@gauravservices.eu.cc",
}: BentoGridItemProps) => {
  const numericId = typeof id === "number" ? id : slotIndex || parseInt(String(id).replace(/\D/g, ""), 10) || 1;
  const isType = (type: BentoCardType, fallbackId: number) => cardType === type || numericId === fallbackId;

  const [copied, setCopied] = useState(false);
  const copyTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleCopy = async () => {
    const text = ctaEmail || "hello@gauravservices.eu.cc";
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        textArea.style.opacity = "0";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }
      setCopied(true);
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
      copyTimeoutRef.current = setTimeout(() => {
        setCopied(false);
      }, 3000);
    } catch (err) {
      console.error("Failed to copy email:", err);
    }
  };

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div
      className={cn(
        "row-span-1 relative overflow-hidden rounded-3xl border border-white/[0.1] group/bento hover:shadow-xl transition duration-200 shadow-input dark:shadow-none justify-between flex flex-col space-y-4",
        className
      )}
      style={{
        background: "rgb(4,7,29)",
        backgroundColor:
          "linear-gradient(90deg, rgba(4,7,29,1) 0%, rgba(12,14,35,1) 100%)",
      }}
    >
      <div className={`${isType("contact_cta", 6) && "flex justify-center"} h-full`}>
        <div className="w-full h-full absolute">
          {img && (
            <img
              src={img}
              alt={img}
              loading="lazy"
              decoding="async"
              className={cn(imgClassName, "object-cover object-center ")}
            />
          )}
        </div>
        <div
          className={`absolute right-0 -bottom-5 ${
            isType("current_project", 5) && "w-full opacity-80"
          } `}
        >
          {spareImg && (
            <img
              src={spareImg}
              alt={spareImg}
              loading="lazy"
              decoding="async"
              className="object-cover object-center w-full h-full"
            />
          )}
        </div>
        {isType("contact_cta", 6) && (
          <BackgroundGradientAnimation />
        )}

        <div
          className={cn(
            titleClassName,
            "group-hover/bento:translate-x-2 transition duration-200 relative md:h-full min-h-40 flex flex-col px-5 p-5 lg:p-10"
          )}
        >
          <div className="font-sans font-normal text-xs md:text-sm text-[#C1C2D3] z-10 tracking-wide mb-1">
            {description}
          </div>
          <div className="font-sans text-lg lg:text-3xl max-w-96 font-bold z-10 leading-tight">
            {title}
          </div>

          {/* 3D Globe */}
          {isType("globe_timezone", 2) && <GridGlobe />}

          {/* Tech stack list */}
          {isType("tech_stack", 3) && (
            <div className="flex gap-1 lg:gap-5 w-fit absolute -right-3 lg:-right-2">
              <div className="flex flex-col gap-3 md:gap-3 lg:gap-8">
                {((techStackLeft && techStackLeft.length > 0) ? techStackLeft : ["ReactJS", "Express", "Typescript"]).map((item, i) => (
                  <span
                    key={i}
                    className="lg:py-3 lg:px-3 py-2 px-3 text-xs lg:text-sm rounded-xl text-center bg-[#10132E] border border-white/[0.08] text-white font-medium shadow-sm"
                  >
                    {item}
                  </span>
                ))}
                <span className="lg:py-3 lg:px-3 py-3 px-3 rounded-xl text-center bg-[#10132E] border border-white/[0.04]"></span>
              </div>
              <div className="flex flex-col gap-3 md:gap-3 lg:gap-8">
                <span className="lg:py-3 lg:px-3 py-3 px-3 rounded-xl text-center bg-[#10132E] border border-white/[0.04]"></span>
                {((techStackRight && techStackRight.length > 0) ? techStackRight : ["VueJS", "NuxtJS", "GraphQL"]).map((item, i) => (
                  <span
                    key={i}
                    className="lg:py-3 lg:px-2 py-2 px-3 text-xs lg:text-sm rounded-xl text-center bg-[#10132E] border border-white/[0.08] text-white font-medium shadow-sm"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Contact CTA */}
          {isType("contact_cta", 6) && (
            <div className="mt-5 relative">
              <div className="absolute -bottom-5 right-0 block">
                <Lottie
                  animationData={animationData}
                  loop={copied}
                  autoplay={copied}
                  style={{ height: 200, width: 400 }}
                />
              </div>

              <MagicButton
                title={copied ? "Email is Copied!" : "Copy my email address"}
                icon={<IoCopyOutline />}
                position="left"
                handleClick={handleCopy}
                otherClasses="!bg-[#161A31]"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
